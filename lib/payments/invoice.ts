/**
 * Rechnungs- + Bestaetigungs-Flow fuer den Einzelantrag-Kartenkauf (B1).
 *
 * Vom Stripe-Webhook (checkout.session.completed, einzelantrag) aufgerufen:
 *   1. Idempotenz-Check (invoice_created_at) gegen Webhook-Doppelzustellung.
 *   2. lexoffice-Rechnung erzeugen + PDF holen (best-effort).
 *   3. §312i-Bestelleingangsbestaetigung IMMER an den Kaeufer senden
 *      (mit PDF-Anhang, falls die Rechnung erzeugt werden konnte).
 *   4. Bei lexoffice-Fehler: Admin-Alert, damit die Rechnung manuell folgt.
 *   5. Verarbeitungs-Marker setzen (auch bei Teil-Fehlschlag -> kein Re-Run).
 *
 * Bewusst best-effort: Die Zahlung ist bereits erfolgt und der Antrag
 * freigeschaltet — ein lexoffice-/Mailfehler darf den Webhook nicht 500en.
 */
import { query } from "@/lib/db";
import { sendMail, type MailAttachment } from "@/lib/mail";
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

  await markProcessed(p.stripeSessionId, invoiceId, invoiceNumber);
}
