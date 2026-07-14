export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPack } from "@/lib/payments/packs";
import {
  createOrder,
  buildOrderConfirmationEmail,
  buildOrderAdminEmail,
  countOpenInvoiceOrders,
  MAX_OPEN_INVOICE_ORDERS,
  type OrderRecord,
} from "@/lib/payments/orders";
import { sendMail } from "@/lib/mail";
import { pruefeRechnungsAdresse, ablehnungsText } from "@/lib/payments/invoice-eligibility";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";

const orderSchema = z.object({
  packId: z.string().min(1, "Paket erforderlich"),
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
 * Kontingent-Rechnungskauf (B2): legt eine Bestellung an, erzeugt sofort den
 * Sammel-Code und versendet Bestaetigung (Kunde) + Benachrichtigung (aitema).
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const parsed = orderSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Eingaben unvollständig";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const data = parsed.data;

    // Honeypot: gefuelltes verstecktes Feld -> stiller Erfolg (Bot abweisen).
    if (data.website && data.website.trim() !== "") {
      return NextResponse.json({ ok: true });
    }
    // Zu schnell abgesendet -> wahrscheinlich Bot.
    if (typeof data.timestamp === "number" && Date.now() - data.timestamp < 3000) {
      return NextResponse.json({ error: "Bitte einen Moment warten und erneut senden." }, { status: 429 });
    }

    const pack = getPack(data.packId);
    if (!pack || !pack.isQuota) {
      return NextResponse.json({ error: "Unbekanntes oder nicht bestellbares Paket." }, { status: 400 });
    }

    // Tuersteher: Der Rechnungskauf ist der dienstlichen Adresse einer Schule oder
    // eines Traegers vorbehalten — er existiert, WEIL die nicht mit Karte zahlen
    // koennen, nicht damit sich jeder anonym bedienen kann. Steht vor der
    // Bremse: billiger (keine DB) und praeziser.
    const adresse = pruefeRechnungsAdresse(data.email);
    if (!adresse.ok) {
      return NextResponse.json({ error: ablehnungsText(adresse.grund) }, { status: 422 });
    }

    // Missbrauchsbremse: Der Rechnungskauf schaltet SOFORT frei, bevor Geld
    // geflossen ist (bis 459,90 EUR). Wer bereits offene Rechnungen hat, bekommt
    // keine weitere Sofort-Freischaltung. Das IP-Limit ('invoice', 3/24h) bremst
    // Massen-Skripte; diese Grenze denselben Besteller mit wechselnder IP.
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

    const order: OrderRecord = await createOrder({
      packId: data.packId,
      orgName: data.orgName,
      contactName: data.contactName,
      email: data.email,
      billingAddress: data.billingAddress,
      vatId: data.vatId,
      poNumber: data.poNumber,
      note: data.note,
    });

    // Mails best-effort — die Bestellung ist bereits persistiert + Code freigegeben.
    const confirm = buildOrderConfirmationEmail(order);
    await sendMail(
      { to: order.email, subject: confirm.subject, html: confirm.html, text: confirm.text },
      "api/kontingent/order"
    );
    const admin = buildOrderAdminEmail(order);
    await sendMail(
      { to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, text: admin.text, replyTo: order.email },
      "api/kontingent/order"
    );

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      creditCode: order.creditCode,
      credits: order.credits,
      amountCents: order.amountCents,
      dueDate: order.dueDate,
    });
  } catch (err) {
    console.error("[api/kontingent/order] Fehler:", err);
    return NextResponse.json({ error: "Bestellung fehlgeschlagen" }, { status: 500 });
  }
}
