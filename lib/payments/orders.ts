/**
 * Kontingent-Rechnungskauf (B2) — Bestellung anlegen + Bestaetigungs-Mail bauen.
 *
 * Ablauf (D-7..D-10):
 *   1. Paket pruefen (nur Kontingent-Pakete, kein Einzelantrag).
 *   2. Kontingent-Code SOFORT erzeugen (Quelle "invoice", 12 Monate gueltig).
 *   3. Bestellung (`org_orders`) mit Bestellnummer + Code persistieren.
 *   4. Aufrufer (Route) versendet die Bestaetigungs-Mail (Resend).
 *
 * Die formelle Rechnung erstellt die Buchhaltung extern; die Mail ist eine
 * Bestellbestaetigung mit Bankverbindung, Verwendungszweck und Zahlungsziel.
 */
import { query } from "@/lib/db";
import { createCreditCode } from "@/lib/wizard/credit-codes";
import { getPack, formatEur, vatBreakdown, type Pack } from "@/lib/payments/packs";
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

/** Monate, die ein gekauftes Kontingent ab Kauf gueltig ist (D-10). */
export const CREDIT_VALIDITY_MONTHS = 12;

function expiresAtISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + CREDIT_VALIDITY_MONTHS);
  return d.toISOString();
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

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Baut die Bestellbestaetigung (Betrag, Bankverbindung, Verwendungszweck, Code). */
/** HTML-Escaping fuer alle benutzerkontrollierten Felder an HTML-E-Mail-Senken. */
function escapeHtml(s: string): string {
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

  const subject = `EduFunds — Ihr Kontingent (${order.credits} Antraege) · Bestellung ${order.orderNumber}`;

  const text = [
    `Vielen Dank fuer Ihre Bestellung bei EduFunds.`,
    ``,
    `Bestellnummer: ${order.orderNumber}`,
    `Organisation:  ${order.orgName}`,
    `Paket:         ${pack.label} (${order.credits} Antraege)`,
    `Betrag:        ${amount} (inkl. ${vatAmount} MwSt, netto ${net})`,
    ``,
    `Ihr Kontingent-Code:  ${order.creditCode}`,
    `Gueltig fuer ${order.credits} Foerderantraege, 12 Monate ab heute.`,
    `Geben Sie den Code an Ihre Lehrkraefte weiter — sie schalten damit ihre`,
    `fertigen Antraege frei, ohne selbst zu zahlen.`,
    ``,
    `Zahlung per Ueberweisung (Zahlungsziel ${PAYMENT_TERM_DAYS} Tage, bis ${dueDateDe}):`,
    `  Empfaenger:       ${bank.accountHolder}`,
    `  IBAN:             ${bank.iban}`,
    `  BIC:              ${bank.bic}`,
    `  Bank:             ${bank.bankName}`,
    `  Betrag:           ${amount}`,
    `  Verwendungszweck: ${order.orderNumber}`,
    ``,
    `Die formelle Rechnung erhalten Sie separat. Bei Rueckfragen: office@aitema.de.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0a1628;max-width:560px;margin:0 auto;line-height:1.5">
    <h2 style="color:#0a1628">Vielen Dank fuer Ihre Bestellung</h2>
    <p>Ihr Kontingent fuer <strong>${order.credits} Foerderantraege</strong> ist freigeschaltet.</p>

    <div style="background:#f5f3ec;border:1px solid #c9a227;border-radius:10px;padding:16px;margin:18px 0">
      <p style="margin:0 0 6px;font-size:13px;color:#64748b">Ihr Kontingent-Code</p>
      <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:monospace;color:#0a1628">${escapeHtml(order.creditCode)}</p>
      <p style="margin:10px 0 0;font-size:13px;color:#64748b">
        Gueltig fuer ${order.credits} Antraege, 12 Monate ab heute. Geben Sie den Code an Ihre
        Lehrkraefte weiter — sie schalten damit ihre fertigen Antraege frei, ohne selbst zu zahlen.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0">
      <tr><td style="padding:4px 0;color:#64748b">Bestellnummer</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Organisation</td><td style="padding:4px 0;text-align:right">${escapeHtml(order.orgName)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Paket</td><td style="padding:4px 0;text-align:right">${escapeHtml(pack.label)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Betrag (inkl. 19 % MwSt)</td><td style="padding:4px 0;text-align:right"><strong>${amount}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">davon MwSt</td><td style="padding:4px 0;text-align:right">${vatAmount}</td></tr>
    </table>

    <h3 style="color:#0a1628;margin-bottom:6px">Zahlung per Ueberweisung</h3>
    <p style="font-size:13px;color:#64748b;margin:0 0 8px">Zahlungsziel ${PAYMENT_TERM_DAYS} Tage (bis ${dueDateDe}).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:4px 0;color:#64748b">Empfaenger</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.accountHolder)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">IBAN</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.iban)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">BIC</td><td style="padding:4px 0;text-align:right;font-family:monospace">${escapeHtml(bank.bic)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Bank</td><td style="padding:4px 0;text-align:right">${escapeHtml(bank.bankName)}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Verwendungszweck</td><td style="padding:4px 0;text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
    </table>

    <p style="font-size:13px;color:#64748b;margin-top:18px">
      Die formelle Rechnung erhalten Sie separat. Bei Rueckfragen erreichen Sie uns unter
      <a href="mailto:office@aitema.de" style="color:#c9a227">office@aitema.de</a>.
    </p>
  </div>`;

  return { subject, html, text };
}

/** Interne Benachrichtigung an aitema ueber eine neue Bestellung (Buchhaltung). */
export function buildOrderAdminEmail(order: OrderRecord): EmailContent {
  const pack = getPack(order.packId) as Pack;
  const amount = formatEur(order.amountCents);
  const subject = `Neue Kontingent-Bestellung ${order.orderNumber} — ${order.orgName} (${amount})`;
  const lines = [
    `Neue Kontingent-Bestellung (Rechnungskauf, B2):`,
    ``,
    `Bestellnummer:   ${order.orderNumber}`,
    `Paket:           ${pack.label} (${order.credits} Antraege)`,
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
