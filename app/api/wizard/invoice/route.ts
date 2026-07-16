export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWizardSession, tryMarkSessionPaid } from "@/lib/wizard/session";
import {
  createEinzelInvoiceOrder,
  buildEinzelInvoiceConfirmationEmail,
  buildEinzelInvoiceAdminEmail,
  countOpenInvoiceOrders,
  escapeHtml,
  MAX_OPEN_INVOICE_ORDERS,
  type EinzelInvoiceOrder,
} from "@/lib/payments/orders";
import { trustedAppUrl } from "@/lib/app-url";
import { sendMail } from "@/lib/mail";
import { pruefeRechnungsAdresse, ablehnungsText } from "@/lib/payments/invoice-eligibility";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";

const invoiceSchema = z.object({
  sessionToken: z.string().min(8, "sessionToken erforderlich"),
  orgName: z.string().trim().min(2, "Name der Organisation erforderlich").max(200),
  contactName: z.string().trim().min(2, "Ansprechpartner erforderlich").max(200),
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich").max(200),
  billingAddress: z.string().trim().min(10, "Vollständige Rechnungsadresse erforderlich").max(1000),
  vatId: z.string().trim().max(50).optional(),
  poNumber: z.string().trim().max(100).optional(),
  note: z.string().trim().max(2000).optional(),
  // Spam-Schutz
  website: z.string().optional(), // Honeypot (muss leer sein)
  timestamp: z.number().optional(), // Ladezeit (>= 3s vor Absenden)
});

/**
 * Einzelantrag auf Rechnung (B2B): schaltet die Wizard-Session SOFORT frei
 * (paid_token), legt die Bestellung in org_orders an und mailt Bestätigung
 * (Kunde, inkl. Download-Link + Bankverbindung) + Buchhaltungs-Hinweis (aitema).
 * Zahlung per Überweisung, Zahlungsziel 14 Tage. Idempotent: bereits bezahlte
 * Sessions liefern den bestehenden paid_token zurück.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const parsed = invoiceSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Eingaben unvollständig";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const data = parsed.data;

    // Honeypot: gefuelltes verstecktes Feld -> stiller Erfolg (Bot abweisen).
    if (data.website && data.website.trim() !== "") {
      return NextResponse.json({ ok: true });
    }
    if (typeof data.timestamp === "number" && Date.now() - data.timestamp < 3000) {
      return NextResponse.json(
        { error: "Bitte einen Moment warten und erneut senden." },
        { status: 429 }
      );
    }

    const session = await getWizardSession(data.sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Antrag nicht gefunden" }, { status: 404 });
    }
    // Idempotent: bereits freigeschaltet -> bestehenden Token liefern.
    if (session.paidToken) {
      return NextResponse.json({ ok: true, alreadyPaid: true, paidToken: session.paidToken });
    }

    // Tuersteher: Kauf auf Rechnung nur mit dienstlicher Adresse (Schule/Traeger).
    // Steht — wie die Bremse — BEWUSST vor tryMarkSessionPaid: danach waere der
    // Antrag schon freigeschaltet.
    const adresse = pruefeRechnungsAdresse(data.email);
    if (!adresse.ok) {
      return NextResponse.json({ error: ablehnungsText(adresse.grund) }, { status: 422 });
    }

    // Missbrauchsbremse: Wir schalten gleich SOFORT frei, bevor Geld geflossen ist.
    // Wer bereits offene Rechnungen hat, bekommt keine weitere Sofort-Freischaltung.
    // (Das IP-Limit 'invoice' 3/24h bremst Skripte, das hier denselben Besteller
    // mit wechselnder IP.) Steht BEWUSST vor tryMarkSessionPaid — danach waere der
    // Antrag schon frei.
    const offen = await countOpenInvoiceOrders(data.email);
    if (offen >= MAX_OPEN_INVOICE_ORDERS) {
      return NextResponse.json(
        {
          error:
            "Für diese E-Mail-Adresse sind bereits Rechnungen offen. " +
            "Bitte begleichen Sie diese zuerst oder wenden Sie sich an office@edufunds.org.",
        },
        { status: 409 },
      );
    }

    // 1) Session freischalten (race-sicher). Käufer-Mail bindet den Antrag.
    const { session: paid, didSet } = await tryMarkSessionPaid(data.sessionToken, {
      source: "invoice",
      tier: "einzelantrag",
      stripeCustomerEmail: data.email,
    });
    if (!paid.paidToken) {
      return NextResponse.json({ error: "Freischaltung fehlgeschlagen" }, { status: 500 });
    }
    if (!didSet) {
      // Zwischenzeitlich anderweitig bezahlt -> bestehenden Token liefern, keine Bestellung doppeln.
      return NextResponse.json({ ok: true, alreadyPaid: true, paidToken: paid.paidToken });
    }

    const paidToken = paid.paidToken;
    const downloadUrl = trustedAppUrl() ? `${trustedAppUrl()}/antrag/download/${paidToken}` : null;

    // 2) Bestellung persistieren + Mails (best-effort — der Antrag ist bereits frei).
    let order: EinzelInvoiceOrder | null = null;
    try {
      order = await createEinzelInvoiceOrder({
        orgName: data.orgName,
        contactName: data.contactName,
        email: data.email,
        billingAddress: data.billingAddress,
        vatId: data.vatId,
        poNumber: data.poNumber,
        note: data.note,
        sessionToken: data.sessionToken,
        paidToken,
      });
    } catch (e) {
      // Antrag bleibt freigeschaltet; Accounting-Lücke darf nicht still bleiben.
      console.error("[api/wizard/invoice] Bestellung konnte nicht persistiert werden:", e);
      const alertText = `paid_token: ${paidToken}\nSession: ${data.sessionToken}\nOrg: ${data.orgName}\nE-Mail: ${data.email}\nRechnung manuell erstellen.`;
      await sendMail(
        {
          to: ADMIN_EMAIL,
          subject: `⚠️ Einzelantrag-Rechnung: Bestellung NICHT persistiert (${data.orgName})`,
          // Alle Werte escapen — orgName/email sind nutzerkontrolliert (XSS im Admin-Postfach).
          html: `<pre>${escapeHtml(alertText)}</pre>`,
          text: alertText,
        },
        "api/wizard/invoice"
      );
    }

    if (order) {
      const confirm = buildEinzelInvoiceConfirmationEmail(order, downloadUrl);
      await sendMail(
        { to: order.email, subject: confirm.subject, html: confirm.html, text: confirm.text },
        "api/wizard/invoice"
      );
      const admin = buildEinzelInvoiceAdminEmail(order);
      await sendMail(
        { to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, text: admin.text, replyTo: order.email },
        "api/wizard/invoice"
      );
    }

    return NextResponse.json({
      ok: true,
      paidToken,
      orderNumber: order?.orderNumber ?? null,
      dueDate: order?.dueDate ?? null,
    });
  } catch (err) {
    console.error("[api/wizard/invoice] Fehler:", err);
    return NextResponse.json({ error: "Rechnungskauf fehlgeschlagen" }, { status: 500 });
  }
}
