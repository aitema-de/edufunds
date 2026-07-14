/**
 * Mahnlauf für den Rechnungskauf.
 *
 * Der Rechnungskauf schaltet SOFORT frei, bevor Geld geflossen ist (Kontingent
 * bis 459,90 EUR). Bisher bemerkte niemand, wenn nie bezahlt wurde.
 *
 * Zwei Stufen:
 *   1. Zahlungsziel ueberschritten  → Zahlungserinnerung (freundlich, keine Folgen)
 *   2. + DUNNING_GRACE_DAYS         → Mahnung UND Sperre der noch OFFENEN Credits
 *
 * Zwei Grundsaetze, die den Code praegen:
 *
 * (a) Die Mail geht ZUERST raus, der Zustand aendert sich erst danach. Niemand
 *     darf still gesperrt werden, ohne benachrichtigt worden zu sein. Scheitert
 *     der Versand, bleibt die Bestellung unveraendert und die naechste Runde
 *     versucht es erneut — lieber spaeter mahnen als heimlich sperren.
 *
 * (b) Der Automat nimmt NIE eine erbrachte Leistung zurueck. Gesperrt werden nur
 *     noch nicht eingeloeste Credits. Bereits erstellte Antraege bleiben — sie
 *     sind geliefert (und laengst exportiert); wir wollen das Geld, nicht die
 *     Leistung zurueck. Ein Einzelantrag auf Rechnung IST die Leistung, deshalb
 *     wird er hier nur gemahnt, nie entwertet. Das kann nur ein bewusstes
 *     Storno durch den Admin (cancelOrder).
 */
import { query } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { suspendOrderCredits } from "@/lib/payments/order-status";
import { getBankDetails, PAYMENT_TERM_DAYS } from "@/lib/payments/bank";
import { escapeHtml, type EmailContent } from "@/lib/payments/orders";

/** Kulanzfrist zwischen Zahlungserinnerung und Mahnung/Sperre. */
export const DUNNING_GRACE_DAYS = 7;

export interface DunningOrder {
  orderNumber: string;
  orgName: string;
  contactName: string;
  email: string;
  amountCents: number;
  credits: number;
  packId: string;
  creditCode: string | null;
  dueDate: string;
  tageUeberfaellig: number;
}

export interface DunningRun {
  dryRun: boolean;
  /** Stufe 1 — Zahlungserinnerung verschickt. */
  erinnert: string[];
  /** Stufe 2 — gemahnt (und, wo moeglich, Kontingent gesperrt). */
  gemahnt: string[];
  /** Bestellnummern, deren Kontingent tatsaechlich gesperrt wurde. */
  gesperrt: string[];
  /** Bestellnummern, bei denen der Mailversand scheiterte (Zustand unveraendert). */
  fehlgeschlagen: string[];
}

interface Row {
  order_number: string;
  org_name: string;
  contact_name: string;
  email: string;
  amount_cents: number;
  credits: number;
  pack_id: string;
  credit_code: string | null;
  due_date: Date;
}

function eur(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDunningOrder(r: Row, now: Date): DunningOrder {
  return {
    orderNumber: r.order_number,
    orgName: r.org_name,
    contactName: r.contact_name,
    email: r.email,
    amountCents: r.amount_cents,
    credits: r.credits,
    packId: r.pack_id,
    creditCode: r.credit_code,
    dueDate: ymd(r.due_date),
    tageUeberfaellig: Math.floor((now.getTime() - r.due_date.getTime()) / 86_400_000),
  };
}

const FIELDS = `order_number, org_name, contact_name, email, amount_cents, credits, pack_id, credit_code, due_date`;

/** Faellig, noch offen, noch nicht erinnert. */
export async function findeZuErinnern(now: Date): Promise<DunningOrder[]> {
  const res = await query<Row>(
    `SELECT ${FIELDS} FROM org_orders
      WHERE status = 'payment_pending'
        AND due_date IS NOT NULL
        AND due_date < $1::date
        AND reminder_sent_at IS NULL
      ORDER BY due_date`,
    [ymd(now)]
  );
  return res.rows.map((r) => toDunningOrder(r, now));
}

/**
 * Erinnerung ist raus, Kulanzfrist abgelaufen, noch offen, noch nicht gemahnt.
 *
 * Die Frist laeuft ab der ERINNERUNG, nicht ab dem Zahlungsziel. Sonst koennte
 * ein einziger Lauf eine laengst ueberfaellige Bestellung im selben Durchgang
 * erinnern UND mahnen+sperren — der Kunde bekaeme zwei Mails in derselben Minute
 * und waere gesperrt, bevor er die Erinnerung gelesen hat. Genau das soll die
 * Kulanzfrist verhindern.
 */
export async function findeZuMahnen(now: Date): Promise<DunningOrder[]> {
  const res = await query<Row>(
    `SELECT ${FIELDS} FROM org_orders
      WHERE status = 'payment_pending'
        AND due_date IS NOT NULL
        AND reminder_sent_at IS NOT NULL
        AND reminder_sent_at < $1::timestamp - make_interval(days => $2::int)
        AND dunning_sent_at IS NULL
      ORDER BY due_date`,
    [now.toISOString(), DUNNING_GRACE_DAYS]
  );
  return res.rows.map((r) => toDunningOrder(r, now));
}

// ---------------------------------------------------------------------------
// Mails
// ---------------------------------------------------------------------------

function zahlungsblock(o: DunningOrder): string[] {
  const b = getBankDetails();
  return [
    `Betrag:            ${eur(o.amountCents)}`,
    `Verwendungszweck:  ${o.orderNumber}`,
    `Empfänger:         ${b.accountHolder}`,
    `IBAN:              ${b.iban}`,
    `BIC:               ${b.bic} (${b.bankName})`,
  ];
}

export function buildReminderEmail(o: DunningOrder): EmailContent {
  const subject = `Zahlungserinnerung: Bestellung ${o.orderNumber}`;
  const text = [
    `Guten Tag ${o.contactName},`,
    ``,
    `unsere Rechnung zur Bestellung ${o.orderNumber} (${o.orgName}) war am ${o.dueDate} fällig`,
    `und ist bei uns noch nicht eingegangen. Vermutlich hat sich das im Alltag verlaufen —`,
    `bitte betrachten Sie diese Nachricht als freundliche Erinnerung.`,
    ``,
    ...zahlungsblock(o),
    ``,
    `Falls die Zahlung bereits unterwegs ist, ist diese Mail gegenstandslos.`,
    `Bei Fragen zur Rechnung antworten Sie einfach auf diese E-Mail.`,
    ``,
    `Freundliche Grüße`,
    `EduFunds — aitema GmbH`,
  ].join("\n");

  const html = `
    <p>Guten Tag ${escapeHtml(o.contactName)},</p>
    <p>unsere Rechnung zur Bestellung <strong>${escapeHtml(o.orderNumber)}</strong>
       (${escapeHtml(o.orgName)}) war am <strong>${escapeHtml(o.dueDate)}</strong> fällig und ist
       bei uns noch nicht eingegangen. Vermutlich hat sich das im Alltag verlaufen — bitte
       betrachten Sie diese Nachricht als freundliche Erinnerung.</p>
    <pre style="background:#f5f5f4;padding:12px;border-radius:6px">${escapeHtml(zahlungsblock(o).join("\n"))}</pre>
    <p>Falls die Zahlung bereits unterwegs ist, ist diese Mail gegenstandslos.
       Bei Fragen antworten Sie einfach auf diese E-Mail.</p>
    <p>Freundliche Grüße<br>EduFunds — aitema GmbH</p>`;

  return { subject, html, text };
}

export function buildDunningEmail(o: DunningOrder): EmailContent {
  const sperrt = o.creditCode !== null;
  const subject = `Mahnung: Bestellung ${o.orderNumber}`;

  const folge = sperrt
    ? [
        `Wir haben das noch nicht eingelöste Guthaben Ihres Kontingents (Code ${o.creditCode})`,
        `daher vorerst gesperrt. Bereits erstellte Anträge bleiben selbstverständlich`,
        `abrufbar — sie sind geliefert.`,
        ``,
        `Sobald die Zahlung eingeht, geben wir das Kontingent umgehend wieder frei.`,
      ]
    : [
        `Der bereits freigeschaltete Antrag bleibt abrufbar — er ist geliefert.`,
        `Die Forderung besteht unabhängig davon fort.`,
      ];

  const text = [
    `Guten Tag ${o.contactName},`,
    ``,
    `trotz unserer Erinnerung ist die Zahlung zur Bestellung ${o.orderNumber} (${o.orgName})`,
    `bei uns nicht eingegangen. Das Zahlungsziel war der ${o.dueDate}`,
    `(${o.tageUeberfaellig} Tage überschritten).`,
    ``,
    ...folge,
    ``,
    ...zahlungsblock(o),
    ``,
    `Sollte die Rechnung bei Ihnen nicht angekommen sein oder etwas nicht stimmen,`,
    `melden Sie sich bitte — wir klären das unkompliziert.`,
    ``,
    `Freundliche Grüße`,
    `EduFunds — aitema GmbH`,
  ].join("\n");

  const html = `
    <p>Guten Tag ${escapeHtml(o.contactName)},</p>
    <p>trotz unserer Erinnerung ist die Zahlung zur Bestellung
       <strong>${escapeHtml(o.orderNumber)}</strong> (${escapeHtml(o.orgName)}) bei uns nicht
       eingegangen. Das Zahlungsziel war der <strong>${escapeHtml(o.dueDate)}</strong>
       (${o.tageUeberfaellig} Tage überschritten).</p>
    <p>${escapeHtml(folge.join(" ")).replace(/\n/g, " ")}</p>
    <pre style="background:#f5f5f4;padding:12px;border-radius:6px">${escapeHtml(zahlungsblock(o).join("\n"))}</pre>
    <p>Sollte die Rechnung bei Ihnen nicht angekommen sein oder etwas nicht stimmen, melden Sie
       sich bitte — wir klären das unkompliziert.</p>
    <p>Freundliche Grüße<br>EduFunds — aitema GmbH</p>`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Lauf
// ---------------------------------------------------------------------------

/**
 * Führt beide Mahnstufen aus.
 *
 * dryRun=true ermittelt nur, WER faellig waere — kein Mailversand, keine Sperre,
 * keine Zeitstempel. Fuer den Erstlauf vor dem Go-Live gedacht.
 */
export async function runDunning(
  args: { now?: Date; dryRun?: boolean } = {}
): Promise<DunningRun> {
  const now = args.now ?? new Date();
  const dryRun = args.dryRun ?? false;

  const run: DunningRun = { dryRun, erinnert: [], gemahnt: [], gesperrt: [], fehlgeschlagen: [] };

  // Stufe 1 — Zahlungserinnerung.
  for (const o of await findeZuErinnern(now)) {
    if (dryRun) {
      run.erinnert.push(o.orderNumber);
      continue;
    }
    const mail = buildReminderEmail(o);
    const ok = await sendMail(
      { to: o.email, subject: mail.subject, html: mail.html, text: mail.text },
      "cron/dunning"
    );
    if (!ok) {
      // Kein Zeitstempel => naechster Lauf versucht es erneut.
      run.fehlgeschlagen.push(o.orderNumber);
      continue;
    }
    await query(
      `UPDATE org_orders SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE order_number = $1`,
      [o.orderNumber]
    );
    run.erinnert.push(o.orderNumber);
  }

  // Stufe 2 — Mahnung + Sperre der offenen Credits.
  for (const o of await findeZuMahnen(now)) {
    if (dryRun) {
      run.gemahnt.push(o.orderNumber);
      if (o.creditCode) run.gesperrt.push(o.orderNumber);
      continue;
    }
    // Erst die Mail — niemand wird still gesperrt.
    const mail = buildDunningEmail(o);
    const ok = await sendMail(
      { to: o.email, subject: mail.subject, html: mail.html, text: mail.text },
      "cron/dunning"
    );
    if (!ok) {
      run.fehlgeschlagen.push(o.orderNumber);
      continue;
    }

    const sperre = await suspendOrderCredits(o.orderNumber);
    if (sperre.suspended) run.gesperrt.push(o.orderNumber);

    await query(
      `UPDATE org_orders SET dunning_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE order_number = $1`,
      [o.orderNumber]
    );
    run.gemahnt.push(o.orderNumber);
  }

  return run;
}
