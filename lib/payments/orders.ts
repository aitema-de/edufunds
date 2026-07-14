/**
 * Kontingent-Rechnungskauf (B2) — Bestellung anlegen + Bestätigungs-Mail bauen.
 *
 * Ablauf (D-7..D-10):
 *   1. Paket pruefen (nur Kontingent-Pakete, kein Einzelantrag).
 *   2. Kontingent-Code SOFORT erzeugen (Quelle "invoice", 12 Monate gültig).
 *   3. Bestellung (`org_orders`) mit Bestellnummer + Code persistieren.
 *   4. Aufrufer (Route) versendet die Bestätigungs-Mail (Resend).
 *
 * Die formelle Rechnung erstellt die Buchhaltung extern; die Mail ist eine
 * Bestellbestaetigung mit Bankverbindung, Verwendungszweck und Zahlungsziel.
 */
import { query } from "@/lib/db";
import { createCreditCode } from "@/lib/wizard/credit-codes";
import { getPack, formatEur, vatBreakdown, EINZELPREIS_CENTS, type Pack } from "@/lib/payments/packs";
import {
  getBankDetails,
  generateOrderNumber,
  dueDateISO,
  PAYMENT_TERM_DAYS,
} from "@/lib/payments/bank";

export interface OrderInput {
  packId: string;
  orgName: string;
  contactName: string;
  email: string;
  billingAddress: string;
  vatId?: string;
  poNumber?: string;
  note?: string;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  packId: string;
  credits: number;
  amountCents: number;
  orgName: string;
  contactName: string;
  email: string;
  billingAddress: string;
  vatId?: string;
  poNumber?: string;
  creditCode: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

/** Monate, die ein gekauftes Kontingent ab Kauf gültig ist (D-10). */
export const CREDIT_VALIDITY_MONTHS = 12;

function expiresAtISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + CREDIT_VALIDITY_MONTHS);
  return d.toISOString();
}

/**
 * Wie viele unbezahlte Rechnungsbestellungen eine E-Mail-Adresse gleichzeitig
 * offen haben darf, bevor weitere Sofort-Freischaltungen verweigert werden.
 *
 * Hintergrund: Der Kauf auf Rechnung schaltet die Leistung SOFORT frei, bevor Geld
 * geflossen ist (beim Kontingent bis 459,90 EUR). Ohne Grenze koennte jemand
 * beliebig viele Bestellungen aufgeben und nie zahlen. Das IP-Rate-Limit
 * ('invoice', 3/24h) bremst Massen-Skripte; diese Grenze bremst denselben Besteller
 * mit wechselnder IP. Zusammen decken sie beide Missbrauchswege ab.
 *
 * 2 offene Rechnungen sind fuer einen echten Kunden reichlich (Schulen bestellen
 * selten parallel) und blockieren niemanden, der seine Rechnungen bezahlt.
 */
export const MAX_OPEN_INVOICE_ORDERS = 2;

/**
 * Zaehlt die noch unbezahlten Rechnungsbestellungen einer E-Mail-Adresse.
 * Beide Rechnungswege schreiben in `org_orders` (Kontingent UND Einzelantrag),
 * daher deckt eine Abfrage beide ab.
 */
export async function countOpenInvoiceOrders(email: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM org_orders
      WHERE lower(email) = lower($1)
        AND status = 'payment_pending'`,
    [email],
  );
  return Number(res.rows[0]?.count ?? 0);
}

/**
 * Legt eine Kontingent-Bestellung an: erzeugt den Sammel-Code und persistiert
 * die Bestellung. Wirft bei unbekanntem/nicht-bestellbarem Paket.
 */
export async function createOrder(input: OrderInput): Promise<OrderRecord> {
  const pack = getPack(input.packId);
  if (!pack || !pack.isQuota) {
    throw new Error(`Unbekanntes oder nicht bestellbares Paket: ${input.packId}`);
  }

  const now = new Date();
  const code = await createCreditCode({
    creditsTotal: pack.credits,
    orgName: input.orgName,
    purchaserEmail: input.email,
    source: "invoice",
    expiresAt: expiresAtISO(now),
    note: input.note,
  });

  const orderNumber = generateOrderNumber(now.getTime());
  const dueDate = dueDateISO(now);

  const res = await query<{ id: number; created_at: Date }>(
    `INSERT INTO org_orders
       (order_number, pack_id, credits, amount_cents, org_name, contact_name,
        email, billing_address, vat_id, po_number, note, credit_code, status, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'payment_pending',$13)
     RETURNING id, created_at`,
    [
      orderNumber,
      pack.id,
      pack.credits,
      pack.priceCents,
      input.orgName,
      input.contactName,
      input.email,
      input.billingAddress,
      input.vatId ?? null,
      input.poNumber ?? null,
      input.note ?? null,
      code.code,
      dueDate,
    ]
  );

  return {
    id: res.rows[0].id,
    orderNumber,
    packId: pack.id,
    credits: pack.credits,
    amountCents: pack.priceCents,
    orgName: input.orgName,
    contactName: input.contactName,
    email: input.email,
    billingAddress: input.billingAddress,
    vatId: input.vatId,
    poNumber: input.poNumber,
    creditCode: code.code,
    status: "payment_pending",
    dueDate,
    createdAt: res.rows[0].created_at.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// B3 — Self-Service-Kontingent per Karte
// ---------------------------------------------------------------------------

export interface QuotaCardResult {
  creditCode: string;
  credits: number;
  packId: string;
  packLabel: string;
  amountCents: number;
  orgName?: string;
  email?: string;
  /** true, wenn diese Stripe-Session bereits zu einem Code verarbeitet war (Webhook-Retry). */
  alreadyExisted: boolean;
}

interface CreditCodeRow {
  code: string;
  credits_total: number;
  org_name: string | null;
  purchaser_email: string | null;
}

async function findCodeByStripeSession(
  stripeSessionId: string
): Promise<CreditCodeRow | null> {
  const res = await query<CreditCodeRow>(
    `SELECT code, credits_total, org_name, purchaser_email
       FROM credit_codes WHERE stripe_session_id = $1 LIMIT 1`,
    [stripeSessionId]
  );
  return res.rowCount && res.rowCount > 0 ? res.rows[0] : null;
}

function rowToCardResult(r: CreditCodeRow, pack: Pack): QuotaCardResult {
  return {
    creditCode: r.code,
    credits: r.credits_total,
    packId: pack.id,
    packLabel: pack.label,
    amountCents: pack.priceCents,
    orgName: r.org_name ?? undefined,
    email: r.purchaser_email ?? undefined,
    alreadyExisted: true,
  };
}

/**
 * Loest einen bezahlten Kartenkauf eines Kontingents ein: erzeugt — idempotent
 * pro Stripe-Checkout-Session — einen Sammel-Code (Quelle "stripe", 12 Monate).
 * Wird vom Stripe-Webhook (metadata.mode=org_quota) aufgerufen. `alreadyExisted`
 * signalisiert eine erneute Zustellung desselben Events (dann KEINE zweite Mail).
 */
export async function fulfillQuotaCardPurchase(params: {
  stripeSessionId: string;
  packId: string;
  orgName?: string;
  email?: string;
}): Promise<QuotaCardResult> {
  const pack = getPack(params.packId);
  if (!pack || !pack.isQuota) {
    throw new Error(`Unbekanntes oder nicht bestellbares Paket: ${params.packId}`);
  }

  // Idempotenz: bereits verarbeitet?
  const existing = await findCodeByStripeSession(params.stripeSessionId);
  if (existing) return rowToCardResult(existing, pack);

  try {
    const code = await createCreditCode({
      creditsTotal: pack.credits,
      orgName: params.orgName,
      purchaserEmail: params.email,
      source: "stripe",
      expiresAt: expiresAtISO(),
      stripeSessionId: params.stripeSessionId,
    });
    return {
      creditCode: code.code,
      credits: code.creditsTotal,
      packId: pack.id,
      packLabel: pack.label,
      amountCents: pack.priceCents,
      orgName: params.orgName,
      email: params.email,
      alreadyExisted: false,
    };
  } catch (e: unknown) {
    // Race: parallele Webhook-Zustellung legte den Code zwischen SELECT und INSERT an.
    const err = e as { code?: string; constraint?: string } | null;
    if (err?.code === "23505" && err.constraint === "uniq_credit_codes_stripe_session") {
      const again = await findCodeByStripeSession(params.stripeSessionId);
      if (again) return rowToCardResult(again, pack);
    }
    throw e;
  }
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Baut die Bestellbestaetigung (Betrag, Bankverbindung, Verwendungszweck, Code). */
/** HTML-Escaping für alle benutzerkontrollierten Felder an HTML-E-Mail-Senken. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOrderConfirmationEmail(order: OrderRecord): EmailContent {
  const pack = getPack(order.packId) as Pack;
  const bank = getBankDetails();
  const vat = vatBreakdown(order.amountCents);
  const amount = formatEur(order.amountCents);
  const net = formatEur(vat.netCents);
  const vatAmount = formatEur(vat.vatCents);
  const dueDateDe = new Date(order.dueDate).toLocaleDateString("de-DE");

  const subject = `EduFunds — Ihr Kontingent (${order.credits} Anträge) · Bestellung ${order.orderNumber}`;

  const text = [
    `Vielen Dank für Ihre Bestellung bei EduFunds.`,
    ``,
    `Bestellnummer: ${order.orderNumber}`,
    `Organisation:  ${order.orgName}`,
    `Paket:         ${pack.label} (${order.credits} Anträge)`,
    `Betrag:        ${amount} (inkl. ${vatAmount} MwSt, netto ${net})`,
    ``,
    `Ihr Kontingent-Code:  ${order.creditCode}`,
    `Gültig für ${order.credits} Förderanträge, 12 Monate ab heute.`,
    `Geben Sie den Code an Ihre Lehrkräfte weiter — sie schalten damit ihre`,
    `fertigen Anträge frei, ohne selbst zu zahlen.`,
    ``,
    `Zahlung per Überweisung (Zahlungsziel ${PAYMENT_TERM_DAYS} Tage, bis ${dueDateDe}):`,
    `  Empfänger:       ${bank.accountHolder}`,
    `  IBAN:             ${bank.iban}`,
    `  BIC:              ${bank.bic}`,
    `  Bank:             ${bank.bankName}`,
    `  Betrag:           ${amount}`,
    `  Verwendungszweck: ${order.orderNumber}`,
    ``,
    `Die formelle Rechnung erhalten Sie separat. Bei Rückfragen: office@aitema.de.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e3b2a;max-width:560px;margin:0 auto;line-height:1.5">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1e3b2a;margin:0 0 18px;padding-bottom:12px;border-bottom:2px solid #d9b44a">Edu<span style="font-style:italic;color:#b08c2e">Funds</span></div>
    <h2 style="color:#1e3b2a">Vielen Dank für Ihre Bestellung</h2>
    <p>Ihr Kontingent für <strong>${order.credits} Förderanträge</strong> ist freigeschaltet.</p>

    <div style="background:#f5f3ec;border:1px solid #b08c2e;border-radius:10px;padding:16px;margin:18px 0">
      <p style="margin:0 0 6px;font-size:13px;color:#6b6457">Ihr Kontingent-Code</p>
      <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:monospace;color:#1e3b2a">${escapeHtml(order.creditCode)}</p>
      <p style="margin:10px 0 0;font-size:13px;color:#6b6457">
        Gültig für ${order.credits} Anträge, 12 Monate ab heute. Geben Sie den Code an Ihre
        Lehrkräfte weiter — sie schalten damit ihre fertigen Anträge frei, ohne selbst zu zahlen.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <tr><td style="padding:4px 0;color:#6b6457">Bestellnummer</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Organisation</td><td style="padding:4px 0;text-align:right">${escapeHtml(order.orgName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Paket</td><td style="padding:4px 0;text-align:right">${escapeHtml(pack.label)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Betrag (inkl. 19 % MwSt)</td><td style="padding:4px 0;text-align:right"><strong>${amount}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">davon MwSt</td><td style="padding:4px 0;text-align:right">${vatAmount}</td></tr>
    </table>

    <h3 style="color:#1e3b2a;margin-bottom:6px">Zahlung per Überweisung</h3>
    <p style="font-size:13px;color:#6b6457;margin:0 0 8px">Zahlungsziel ${PAYMENT_TERM_DAYS} Tage (bis ${dueDateDe}).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:4px 0;color:#6b6457">Empfänger</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.accountHolder)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">IBAN</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.iban)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">BIC</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.bic)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Bank</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.bankName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Verwendungszweck</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
    </table>

    <p style="font-size:13px;color:#6b6457;margin-top:18px">
      Die formelle Rechnung erhalten Sie separat. Bei Rückfragen erreichen Sie uns unter
      <a href="mailto:office@aitema.de" style="color:#b08c2e">office@aitema.de</a>.
    </p>
  </div>`;

  return { subject, html, text };
}

/** Interne Benachrichtigung an aitema über eine neue Bestellung (Buchhaltung). */
export function buildOrderAdminEmail(order: OrderRecord): EmailContent {
  const pack = getPack(order.packId) as Pack;
  const amount = formatEur(order.amountCents);
  const subject = `Neue Kontingent-Bestellung ${order.orderNumber} — ${order.orgName} (${amount})`;
  const lines = [
    `Neue Kontingent-Bestellung (Rechnungskauf, B2):`,
    ``,
    `Bestellnummer:   ${order.orderNumber}`,
    `Paket:           ${pack.label} (${order.credits} Anträge)`,
    `Betrag:          ${amount} inkl. MwSt`,
    `Kontingent-Code: ${order.creditCode} (bereits freigegeben)`,
    `Status:          ${order.status} (Zahlungsziel ${order.dueDate})`,
    ``,
    `Organisation:    ${order.orgName}`,
    `Ansprechpartner: ${order.contactName}`,
    `E-Mail:          ${order.email}`,
    `USt-IdNr.:       ${order.vatId ?? "—"}`,
    `Bestellnr. Kunde:${order.poNumber ?? "—"}`,
    `Rechnungsadresse:`,
    order.billingAddress,
    ``,
    `=> Formelle Rechnung erstellen und an ${order.email} senden.`,
  ];
  const text = lines.join("\n");
  const html = `<pre style="font-family:monospace;font-size:13px">${escapeHtml(
    lines.join("\n")
  )}</pre>`;
  return { subject, html, text };
}

/**
 * Bestätigung für den KARTENKAUF eines Kontingents (B3): Zahlung ist bereits
 * erfolgt — keine Bankverbindung, nur Code + Quittungsbetrag.
 */
export function buildQuotaCardConfirmationEmail(result: QuotaCardResult): EmailContent {
  const vat = vatBreakdown(result.amountCents);
  const amount = formatEur(result.amountCents);
  const vatAmount = formatEur(vat.vatCents);

  const subject = `EduFunds — Ihr Kontingent (${result.credits} Anträge) ist freigeschaltet`;

  const text = [
    `Vielen Dank für Ihren Kauf bei EduFunds — Ihre Zahlung ist eingegangen.`,
    ``,
    `Paket:   ${result.packLabel} (${result.credits} Anträge)`,
    `Betrag:  ${amount} (inkl. ${vatAmount} MwSt)`,
    ``,
    `Ihr Kontingent-Code:  ${result.creditCode}`,
    `Gültig für ${result.credits} Förderanträge, 12 Monate ab heute.`,
    `Geben Sie den Code an Ihre Lehrkräfte weiter — sie schalten damit ihre`,
    `fertigen Anträge frei, ohne selbst zu zahlen.`,
    ``,
    `Eine formelle Rechnung erhalten Sie separat. Bei Rückfragen: office@aitema.de.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e3b2a;max-width:560px;margin:0 auto;line-height:1.5">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1e3b2a;margin:0 0 18px;padding-bottom:12px;border-bottom:2px solid #d9b44a">Edu<span style="font-style:italic;color:#b08c2e">Funds</span></div>
    <h2 style="color:#1e3b2a">Zahlung eingegangen — vielen Dank</h2>
    <p>Ihr Kontingent für <strong>${result.credits} Förderanträge</strong> ist freigeschaltet.</p>

    <div style="background:#f5f3ec;border:1px solid #b08c2e;border-radius:10px;padding:16px;margin:18px 0">
      <p style="margin:0 0 6px;font-size:13px;color:#6b6457">Ihr Kontingent-Code</p>
      <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:monospace;color:#1e3b2a">${escapeHtml(result.creditCode)}</p>
      <p style="margin:10px 0 0;font-size:13px;color:#6b6457">
        Gültig für ${result.credits} Anträge, 12 Monate ab heute. Geben Sie den Code an Ihre
        Lehrkräfte weiter — sie schalten damit ihre fertigen Anträge frei, ohne selbst zu zahlen.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <tr><td style="padding:4px 0;color:#6b6457">Paket</td><td style="padding:4px 0;text-align:right">${escapeHtml(result.packLabel)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Bezahlt (inkl. 19 % MwSt)</td><td style="padding:4px 0;text-align:right"><strong>${amount}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">davon MwSt</td><td style="padding:4px 0;text-align:right">${vatAmount}</td></tr>
    </table>

    <p style="font-size:13px;color:#6b6457;margin-top:18px">
      Eine formelle Rechnung erhalten Sie separat. Bei Rückfragen erreichen Sie uns unter
      <a href="mailto:office@aitema.de" style="color:#b08c2e">office@aitema.de</a>.
    </p>
  </div>`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Einzelantrag auf Rechnung — B2B (Förderverein / Schule / Träger)
// ---------------------------------------------------------------------------
// Anders als beim Kontingent wird KEIN Sammel-Code erzeugt: die konkrete
// Wizard-Session wird sofort freigeschaltet (paid_token), die Bestellung dient
// als Buchhaltungs-Record. Zahlung per Überweisung, Zahlungsziel 14 Tage; die
// formelle Rechnung erstellt die Buchhaltung extern (wie beim Kontingent).

export interface EinzelInvoiceInput {
  orgName: string;
  contactName: string;
  email: string;
  billingAddress: string;
  vatId?: string;
  poNumber?: string;
  note?: string;
  /** Wizard-Session, die freigeschaltet wurde (für Buchhaltungs-Zuordnung). */
  sessionToken: string;
  /** paid_token des freigeschalteten Antrags (Download-Zugang). */
  paidToken: string;
}

export interface EinzelInvoiceOrder {
  orderNumber: string;
  amountCents: number;
  orgName: string;
  contactName: string;
  email: string;
  billingAddress: string;
  vatId?: string;
  poNumber?: string;
  dueDate: string;
  paidToken: string;
}

/**
 * Legt eine Einzelantrag-Rechnungsbestellung an: persistiert sie in `org_orders`
 * (pack_id "einzel", credit_code NULL — kein Kontingent-Code), Status
 * "payment_pending". Die Session-/paid_token-Referenz wird in `note` abgelegt,
 * damit die Buchhaltung die Bestellung dem Antrag zuordnen kann.
 */
export async function createEinzelInvoiceOrder(
  input: EinzelInvoiceInput
): Promise<EinzelInvoiceOrder> {
  const now = new Date();
  const orderNumber = generateOrderNumber(now.getTime());
  const dueDate = dueDateISO(now);
  const linkNote = `[Einzelantrag auf Rechnung · Antrag-Session: ${input.sessionToken} · paid_token: ${input.paidToken}]`;
  const note = input.note ? `${input.note}\n${linkNote}` : linkNote;

  await query(
    `INSERT INTO org_orders
       (order_number, pack_id, credits, amount_cents, org_name, contact_name,
        email, billing_address, vat_id, po_number, note, credit_code, status, due_date,
        session_token)
     VALUES ($1,'einzel',1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,'payment_pending',$10,$11)`,
    [
      orderNumber,
      EINZELPREIS_CENTS,
      input.orgName,
      input.contactName,
      input.email,
      input.billingAddress,
      input.vatId ?? null,
      input.poNumber ?? null,
      note,
      dueDate,
      // Echte Spalte statt Freitext in `note`: nur so kann ein Storno den
      // freigeschalteten Antrag ueberhaupt wieder entwerten.
      input.sessionToken,
    ]
  );

  return {
    orderNumber,
    amountCents: EINZELPREIS_CENTS,
    orgName: input.orgName,
    contactName: input.contactName,
    email: input.email,
    billingAddress: input.billingAddress,
    vatId: input.vatId,
    poNumber: input.poNumber,
    dueDate,
    paidToken: input.paidToken,
  };
}

/**
 * Bestätigungs-Mail für den Einzelantrag-Rechnungskauf: Antrag ist bereits
 * freigeschaltet (Download-Link), Zahlung per Überweisung mit 14 Tagen Ziel.
 */
export function buildEinzelInvoiceConfirmationEmail(
  order: EinzelInvoiceOrder,
  downloadUrl: string | null
): EmailContent {
  const bank = getBankDetails();
  const vat = vatBreakdown(order.amountCents);
  const amount = formatEur(order.amountCents);
  const vatAmount = formatEur(vat.vatCents);
  const net = formatEur(vat.netCents);
  const dueDateDe = new Date(order.dueDate).toLocaleDateString("de-DE");

  const subject = `EduFunds — Ihr Förderantrag ist freigeschaltet · Bestellung ${order.orderNumber}`;

  const linkLine = downloadUrl ? `Ihr Antrag (12 Monate abrufbar):  ${downloadUrl}` : "";
  const text = [
    `Vielen Dank für Ihre Bestellung bei EduFunds.`,
    ``,
    `Ihr Förderantrag inklusive Finanzplan ist freigeschaltet.`,
    linkLine,
    ``,
    `Bestellnummer: ${order.orderNumber}`,
    `Organisation:  ${order.orgName}`,
    `Leistung:      Einzelantrag (1 KI-Förderantrag inkl. Finanzplan)`,
    `Betrag:        ${amount} (inkl. ${vatAmount} MwSt, netto ${net})`,
    ``,
    `Zahlung per Überweisung (Zahlungsziel ${PAYMENT_TERM_DAYS} Tage, bis ${dueDateDe}):`,
    `  Empfänger:        ${bank.accountHolder}`,
    `  IBAN:             ${bank.iban}`,
    `  BIC:              ${bank.bic}`,
    `  Bank:             ${bank.bankName}`,
    `  Betrag:           ${amount}`,
    `  Verwendungszweck: ${order.orderNumber}`,
    ``,
    `Die formelle Rechnung erhalten Sie separat. Bei Rückfragen: office@aitema.de.`,
  ].filter((l) => l !== "").join("\n");

  const downloadBlock = downloadUrl
    ? `<div style="background:#f5f3ec;border:1px solid #b08c2e;border-radius:10px;padding:16px;margin:18px 0">
         <p style="margin:0 0 6px;font-size:13px;color:#6b6457">Ihr Antrag (12 Monate abrufbar)</p>
         <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#78350f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Antrag öffnen</a>
       </div>`
    : "";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;max-width:560px;margin:0 auto;line-height:1.5">
    <h2 style="color:#1c1917">Vielen Dank für Ihre Bestellung</h2>
    <p>Ihr <strong>Förderantrag inklusive Finanzplan</strong> ist freigeschaltet.</p>
    ${downloadBlock}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <tr><td style="padding:4px 0;color:#6b6457">Bestellnummer</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Organisation</td><td style="padding:4px 0;text-align:right">${escapeHtml(order.orgName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Leistung</td><td style="padding:4px 0;text-align:right">Einzelantrag (1 Förderantrag)</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Betrag (inkl. 19 % MwSt)</td><td style="padding:4px 0;text-align:right"><strong>${amount}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">davon MwSt</td><td style="padding:4px 0;text-align:right">${vatAmount}</td></tr>
    </table>

    <h3 style="color:#1c1917;margin-bottom:6px">Zahlung per Überweisung</h3>
    <p style="font-size:13px;color:#6b6457;margin:0 0 8px">Zahlungsziel ${PAYMENT_TERM_DAYS} Tage (bis ${dueDateDe}).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:4px 0;color:#6b6457">Empfänger</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.accountHolder)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">IBAN</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.iban)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">BIC</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.bic)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Bank</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.bankName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Verwendungszweck</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
    </table>

    <p style="font-size:13px;color:#6b6457;margin-top:18px">
      Die formelle Rechnung erhalten Sie separat. Bei Rückfragen erreichen Sie uns unter
      <a href="mailto:office@aitema.de" style="color:#b08c2e">office@aitema.de</a>.
    </p>
  </div>`;

  return { subject, html, text };
}

/** Interne Benachrichtigung an aitema über einen Einzelantrag-Rechnungskauf. */
export function buildEinzelInvoiceAdminEmail(order: EinzelInvoiceOrder): EmailContent {
  const amount = formatEur(order.amountCents);
  const subject = `Neuer Einzelantrag auf Rechnung ${order.orderNumber} — ${order.orgName} (${amount})`;
  const lines = [
    `Neuer Einzelantrag-Rechnungskauf (B2B):`,
    ``,
    `Bestellnummer:    ${order.orderNumber}`,
    `Leistung:         Einzelantrag (1 Förderantrag inkl. Finanzplan)`,
    `Betrag:           ${amount} inkl. MwSt`,
    `Status:           payment_pending (Antrag bereits freigeschaltet; Zahlungsziel ${order.dueDate})`,
    `paid_token:       ${order.paidToken}`,
    ``,
    `Organisation:     ${order.orgName}`,
    `Ansprechpartner:  ${order.contactName}`,
    `E-Mail:           ${order.email}`,
    `USt-IdNr.:        ${order.vatId ?? "—"}`,
    `Bestellnr. Kunde: ${order.poNumber ?? "—"}`,
    `Rechnungsadresse:`,
    order.billingAddress,
    ``,
    `=> Formelle Rechnung erstellen und an ${order.email} senden.`,
  ];
  const text = lines.join("\n");
  const html = `<pre style="font-family:monospace;font-size:13px">${escapeHtml(
    lines.join("\n")
  )}</pre>`;
  return { subject, html, text };
}

/** Interne Benachrichtigung an aitema über einen Kontingent-Kartenkauf (B3). */
export function buildQuotaCardAdminEmail(result: QuotaCardResult): EmailContent {
  const amount = formatEur(result.amountCents);
  const subject = `Neuer Kontingent-Kartenkauf — ${result.orgName ?? result.email ?? "unbekannt"} (${amount})`;
  const lines = [
    `Neuer Kontingent-Kauf per Karte (Stripe, B3):`,
    ``,
    `Paket:           ${result.packLabel} (${result.credits} Anträge)`,
    `Betrag:          ${amount} inkl. MwSt (bezahlt)`,
    `Kontingent-Code: ${result.creditCode} (freigeschaltet)`,
    ``,
    `Organisation:    ${result.orgName ?? "—"}`,
    `E-Mail:          ${result.email ?? "—"}`,
    ``,
    `=> Formelle Rechnung erstellen und an ${result.email ?? "den Käufer"} senden.`,
  ];
  const text = lines.join("\n");
  const html = `<pre style="font-family:monospace;font-size:13px">${escapeHtml(
    lines.join("\n")
  )}</pre>`;
  return { subject, html, text };
}
