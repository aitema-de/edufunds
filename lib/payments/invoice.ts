/**
 * Rechnungs- + Bestaetigungs-Flow fuer den Einzelantrag-Kartenkauf (B1).
 *
 * Vom Stripe-Webhook (checkout.session.completed, einzelantrag) aufgerufen:
 *   1. Idempotenz-Check (invoice_created_at) gegen Webhook-Doppelzustellung.
 *   2. lexoffice-Rechnung erzeugen + PDF holen (best-effort).
 *   3. §312i-Bestelleingangsbestaetigung IMMER an den Kaeufer senden
 *      (mit PDF-Anhang, falls die Rechnung erzeugt werden konnte).
 *   4. Bei lexoffice-Fehler: Admin-Alert, damit die Rechnung manuell folgt.
 *   5. Verarbeitungs-Marker setzen — NUR bei tatsaechlich erzeugter Rechnung.
 *
 * Bewusst best-effort: Die Zahlung ist bereits erfolgt und der Antrag
 * freigeschaltet — ein lexoffice-/Mailfehler darf den Webhook nicht 500en.
 *
 * ZU PUNKT 5, geaendert am 17.07.2026: Hier stand "auch bei Teil-Fehlschlag ->
 * kein Re-Run". Das war kein Versehen, sondern noetig, solange `invoice_created_at`
 * der EINZIGE Schutz gegen Stripes Webhook-Wiederholungen war — ohne den Marker
 * haette eine zweite Zustellung eine zweite Rechnung erzeugt.
 *
 * Diese Begruendung ist entfallen: Migration 011 (`stripe_webhook_events`) ist
 * seit 17.07.2026 auf Prod und dedupliziert auf EVENT-Ebene. Der Marker muss die
 * Doppelrolle nicht mehr tragen — und durfte sie nicht behalten: Er verbuchte
 * jeden Fehlschlag als Erfolg. Am 17.07.2026 real geworden (abgelaufener
 * lexoffice-Key -> 401): Antrag 35 trug invoice_created_at, aber weder Nummer
 * noch PDF, und kein Nachlauf war mehr moeglich — die Rechnung waere still und
 * dauerhaft verloren gewesen. Reparaturweg: scripts/rechnung-nachholen.ts
 */
import type Stripe from "stripe";
import { query } from "@/lib/db";
import { sendMail, type MailAttachment } from "@/lib/mail";
import { trustedAppUrl } from "@/lib/app-url";
import {
  createInvoice,
  getInvoiceNumber,
  getInvoiceDocumentFileId,
  downloadFile,
  lexofficeConfigured,
} from "@/lib/lexoffice/client";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";
const VAT_RATE = 19;
const LINE_ITEM_NAME = "EduFunds — Förderantrag (Einzelantrag)";

/**
 * Soll die lexoffice-Rechnung festgeschrieben werden (fortlaufende Nummer + PDF)?
 * Default true. `LEXOFFICE_FINALIZE=false` erzeugt nur einen löschbaren Entwurf —
 * für Generalprobe/Tests, damit kein echter, GoBD-bindender Beleg entsteht
 * (lexoffice hat keine Sandbox). Siehe docs/GENERALPROBE-DEPLOY.md.
 */
export function invoiceFinalizeEnabled(): boolean {
  return process.env.LEXOFFICE_FINALIZE !== "false";
}

/**
 * Org-/Vereinsname aus dem Stripe-Custom-Field, sonst der Name aus den
 * Kundendaten. Lag bis 17.07.2026 lokal im Webhook.
 */
export function orgNameFromSession(cs: Stripe.Checkout.Session): string {
  const field = cs.custom_fields?.find((f) => f.key === "organisation");
  const fromField = field?.text?.value?.trim();
  return fromField || cs.customer_details?.name?.trim() || "Unbekannt";
}

/**
 * Baut die Rechnungs-Parameter aus einer Stripe-Checkout-Session.
 *
 * EINE Quelle fuer beide Aufrufer — den Webhook und scripts/rechnung-nachholen.ts.
 * Bewusst hier und nicht im Skript nachgebaut: Eine zweite Fassung wuerde
 * driften, und der Nachlauf muesste dann exakt die Rechnung erzeugen, die der
 * Webhook erzeugt haette — sonst repariert er etwas anderes als das Kaputte.
 *
 * `paidToken` kommt aus der DB (markSessionPaid bzw. ki_antraege.paid_token) und
 * bildet den Download-Link. Die Basis-URL stammt aus trustedAppUrl(), nie aus
 * Request-Headern (Host-Header-Injection).
 */
export function buildInvoiceJobParams(
  cs: Stripe.Checkout.Session,
  paidToken?: string | null
): InvoiceJobParams {
  const addr = cs.customer_details?.address;
  const appBase = trustedAppUrl();
  return {
    stripeSessionId: cs.id,
    email: cs.customer_details?.email ?? undefined,
    orgName: orgNameFromSession(cs),
    address: {
      supplement: cs.customer_details?.name ?? undefined,
      street: [addr?.line1, addr?.line2].filter(Boolean).join(", ") || undefined,
      zip: addr?.postal_code ?? undefined,
      city: addr?.city ?? undefined,
      countryCode: addr?.country ?? undefined,
    },
    vatId: cs.customer_details?.tax_ids?.[0]?.value ?? undefined,
    grossCents: cs.amount_total ?? 2990,
    downloadUrl: appBase && paidToken ? `${appBase}/antrag/download/${paidToken}` : undefined,
  };
}

export interface InvoiceJobParams {
  stripeSessionId: string;
  email?: string;
  /** Org-/Vereinsname aus dem Stripe-Custom-Field (Pflicht bei B2B). */
  orgName: string;
  address: {
    supplement?: string;
    street?: string;
    zip?: string;
    city?: string;
    countryCode?: string;
  };
  vatId?: string;
  /** Bruttobetrag in Cent, z. B. 2990. */
  grossCents: number;
  /**
   * Vollständige, vertrauenswürdige Download-URL des Antrags
   * (`<trustedAppUrl>/antrag/download/<paidToken>`). Wird in die Bestätigungsmail
   * als „über-heute-hinaus"-Zugang eingebettet. Fehlt sie (z. B. NEXT_PUBLIC_APP_URL
   * nicht gesetzt), geht die Mail ohne Link raus (fail-safe).
   */
  downloadUrl?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

/** Netto/USt aus Bruttobetrag (kaufmaennisch gerundet). Exportiert fuer Tests. */
export function vatFromGross(grossCents: number, rate = VAT_RATE): { netCents: number; vatCents: number } {
  const netCents = Math.round(grossCents / (1 + rate / 100));
  return { netCents, vatCents: grossCents - netCents };
}

async function isProcessed(stripeSessionId: string): Promise<boolean> {
  const res = await query<{ done: boolean }>(
    `SELECT (invoice_created_at IS NOT NULL) AS done FROM ki_antraege WHERE stripe_session_id = $1 LIMIT 1`,
    [stripeSessionId]
  );
  return res.rows[0]?.done === true;
}

async function markProcessed(
  stripeSessionId: string,
  invoiceId?: string,
  invoiceNumber?: string
): Promise<void> {
  await query(
    `UPDATE ki_antraege
        SET invoice_lexoffice_id = $2,
            invoice_number       = $3,
            invoice_created_at   = now()
      WHERE stripe_session_id = $1`,
    [stripeSessionId, invoiceId ?? null, invoiceNumber ?? null]
  );
}

/** §312i-Bestelleingangsbestaetigung (+ Rechnungshinweis). Exportiert fuer Tests. */
export function buildConfirmationEmail(params: {
  orgName: string;
  grossCents: number;
  invoiceNumber?: string;
  hasPdf: boolean;
  /** Vollständige Download-URL des Antrags. Fehlt sie, wird kein Link gerendert. */
  downloadUrl?: string;
}): { subject: string; html: string; text: string } {
  const { orgName, grossCents, invoiceNumber, hasPdf, downloadUrl } = params;
  const amount = formatEur(grossCents);
  const { vatCents } = vatFromGross(grossCents);
  const vatAmount = formatEur(vatCents);
  const rechnungHinweis = hasPdf
    ? `Ihre Rechnung${invoiceNumber ? ` ${invoiceNumber}` : ""} finden Sie im Anhang dieser E-Mail.`
    : `Ihre Rechnung erhalten Sie in Kürze separat per E-Mail.`;

  const subject = hasPdf && invoiceNumber
    ? `EduFunds — Bestellbestätigung & Rechnung ${invoiceNumber}`
    : `EduFunds — Bestellbestätigung`;

  const linkTextBlock = downloadUrl
    ? [
        `Ihren Antrag öffnen und herunterladen:`,
        downloadUrl,
        ``,
        `Dieser Link bleibt 12 Monate gültig — am besten als Lesezeichen speichern.`,
        `Mit dieser E-Mail-Adresse finden Sie Ihren Antrag jederzeit auch unter „Meine Anträge" wieder.`,
        ``,
      ]
    : [];

  const text = [
    `Vielen Dank für Ihre Bestellung bei EduFunds.`,
    ``,
    `Hiermit bestätigen wir den Eingang Ihrer Bestellung und das Zustandekommen des Vertrags.`,
    `Ihr Förderantrag ist freigeschaltet und steht Ihnen zum Export zur Verfügung.`,
    ``,
    ...linkTextBlock,
    `Auftraggeber: ${orgName}`,
    `Leistung:     Förderantrag (Einzelantrag)`,
    `Betrag:       ${amount} (inkl. ${vatAmount} USt, 19 %)`,
    ``,
    rechnungHinweis,
    ``,
    `Bei Rückfragen erreichen Sie uns unter office@aitema.de.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e3b2a;max-width:560px;margin:0 auto;line-height:1.5">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1e3b2a;margin:0 0 18px;padding-bottom:12px;border-bottom:2px solid #d9b44a">Edu<span style="font-style:italic;color:#b08c2e">Funds</span></div>
    <h2 style="color:#1e3b2a">Vielen Dank für Ihre Bestellung</h2>
    <p>Hiermit bestätigen wir den Eingang Ihrer Bestellung und das Zustandekommen des Vertrags.
       Ihr <strong>Förderantrag ist freigeschaltet</strong> und steht Ihnen zum Export zur Verfügung.</p>

    ${downloadUrl ? `
    <div style="margin:22px 0;padding:18px;border:1px solid #b08c2e;border-radius:10px;background:#fbf7ec">
      <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#1e3b2a;color:#f5efe0;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Antrag öffnen &amp; herunterladen</a>
      <p style="font-size:13px;color:#6b6457;margin:12px 0 0">
        Der Link bleibt <strong>12 Monate</strong> gültig — am besten als Lesezeichen speichern.
        Mit dieser E-Mail-Adresse finden Sie Ihren Antrag jederzeit auch unter
        <strong>„Meine Anträge"</strong> wieder.
      </p>
    </div>` : ``}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <tr><td style="padding:4px 0;color:#6b6457">Auftraggeber</td><td style="padding:4px 0;text-align:right">${escapeHtml(orgName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Leistung</td><td style="padding:4px 0;text-align:right">Förderantrag (Einzelantrag)</td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">Betrag (inkl. 19 % USt)</td><td style="padding:4px 0;text-align:right"><strong>${amount}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b6457">davon USt</td><td style="padding:4px 0;text-align:right">${vatAmount}</td></tr>
    </table>

    <p style="font-size:14px">${escapeHtml(rechnungHinweis)}</p>

    <p style="font-size:13px;color:#6b6457;margin-top:18px">
      Bei Rückfragen erreichen Sie uns unter
      <a href="mailto:office@aitema.de" style="color:#b08c2e">office@aitema.de</a>.
    </p>
  </div>`;

  return { subject, html, text };
}

async function alertAdmin(p: InvoiceJobParams, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  const lines = [
    `lexoffice-Rechnung konnte NICHT automatisch erstellt werden — bitte manuell anlegen.`,
    ``,
    `Stripe-Session: ${p.stripeSessionId}`,
    `Auftraggeber:   ${p.orgName}`,
    `E-Mail:         ${p.email ?? "—"}`,
    `Betrag:         ${formatEur(p.grossCents)} (brutto, inkl. 19 % USt)`,
    `USt-IdNr.:      ${p.vatId ?? "—"}`,
    `Adresse:        ${[p.address.street, `${p.address.zip ?? ""} ${p.address.city ?? ""}`.trim(), p.address.countryCode]
      .filter(Boolean)
      .join(", ")}`,
    ``,
    `Fehler: ${msg}`,
  ];
  await sendMail(
    {
      to: ADMIN_EMAIL,
      subject: `⚠️ lexoffice-Rechnung fehlgeschlagen — ${p.orgName} (${formatEur(p.grossCents)})`,
      html: `<pre style="font-family:monospace;font-size:13px">${escapeHtml(lines.join("\n"))}</pre>`,
      text: lines.join("\n"),
      replyTo: p.email,
    },
    "stripe/webhook/invoice"
  );
}

/**
 * Vollständiger best-effort-Flow. Idempotent über `invoice_created_at`.
 * Wirft NICHT — Fehler werden geloggt/gealertet, der Marker wird trotzdem gesetzt.
 */
export async function runInvoiceJob(p: InvoiceJobParams): Promise<void> {
  if (await isProcessed(p.stripeSessionId)) {
    console.log(`[invoice] Session ${p.stripeSessionId} bereits verarbeitet — übersprungen.`);
    return;
  }

  let pdf: Buffer | null = null;
  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;

  try {
    if (!lexofficeConfigured()) throw new Error("LEXOFFICE_API_KEY fehlt");
    const finalize = invoiceFinalizeEnabled();
    const inv = await createInvoice(
      {
        address: { name: p.orgName, ...p.address },
        lineItemName: LINE_ITEM_NAME,
        grossAmount: p.grossCents / 100,
        taxRatePercentage: VAT_RATE,
        remark: p.vatId ? `USt-IdNr. des Kunden: ${p.vatId}` : undefined,
      },
      { finalize }
    );
    invoiceId = inv.id;
    if (finalize) {
      // Festgeschriebene Rechnung: Nummer + gerendertes PDF holen.
      invoiceNumber = await getInvoiceNumber(inv.id);
      const fileId = await getInvoiceDocumentFileId(inv.id);
      pdf = await downloadFile(fileId);
      console.log(`[invoice] Rechnung ${invoiceNumber ?? inv.id} erzeugt für ${p.stripeSessionId}`);
    } else {
      // Entwurf (Generalprobe): keine Nummer, kein PDF — Entwürfe sind nicht
      // gerendert und manuell löschbar. Bestätigungsmail geht ohne Anhang raus.
      console.log(
        `[invoice] lexoffice-ENTWURF ${inv.id} erzeugt (LEXOFFICE_FINALIZE=false) für ${p.stripeSessionId} — keine Nummer/PDF`
      );
    }
  } catch (err) {
    console.error(`[invoice] lexoffice fehlgeschlagen für ${p.stripeSessionId}:`, err);
    await alertAdmin(p, err);
  }
  const rechnungErzeugt = Boolean(invoiceId);

  // §312i: Bestelleingangsbestätigung IMMER senden (PDF anhängen falls vorhanden).
  if (p.email) {
    const mail = buildConfirmationEmail({
      orgName: p.orgName,
      grossCents: p.grossCents,
      invoiceNumber,
      hasPdf: Boolean(pdf),
      downloadUrl: p.downloadUrl,
    });
    const attachments: MailAttachment[] | undefined = pdf
      ? [{ filename: `Rechnung-${invoiceNumber ?? "EduFunds"}.pdf`, content: pdf }]
      : undefined;
    await sendMail(
      { to: p.email, subject: mail.subject, html: mail.html, text: mail.text, attachments },
      "stripe/webhook/invoice"
    );
  } else {
    console.warn(`[invoice] keine Käufer-E-Mail für ${p.stripeSessionId} — keine Bestätigung versendet.`);
  }

  // NUR als erledigt markieren, wenn tatsaechlich eine Rechnung entstanden ist.
  //
  // Vorher lief markProcessed() bedingungslos — auch nach einem Fehlschlag im
  // catch oben. Da isProcessed() an `invoice_created_at IS NOT NULL` haengt, hat
  // sich damit JEDER gescheiterte Lauf selbst als erledigt verbucht: kein
  // Nachlauf, keine Reparatur, die Rechnung dauerhaft und still verloren.
  // Real geworden am 17.07.2026: Der lexoffice-Key war abgelaufen (401), Antrag
  // 35 blieb mit invoice_created_at=<Zeitpunkt>, aber ohne Nummer und ohne PDF.
  //
  // Jetzt bleibt der Marker bei Misserfolg leer -> scripts/rechnung-nachholen.ts
  // (und jeder kuenftige Retry) kann den Lauf wiederholen. Der Preis ist eine
  // moegliche zweite Bestaetigungsmail beim Nachlauf — akzeptiert: Die erste ging
  // ohne Rechnung raus, die zweite traegt sie im Anhang.
  if (rechnungErzeugt) {
    await markProcessed(p.stripeSessionId, invoiceId, invoiceNumber);
  } else {
    console.warn(
      `[invoice] ${p.stripeSessionId}: NICHT als erledigt markiert (keine Rechnung entstanden) — ` +
        `nachholbar via scripts/rechnung-nachholen.ts`
    );
  }
}
