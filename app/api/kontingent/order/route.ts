export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getPack } from "@/lib/payments/packs";
import {
  createOrder,
  buildOrderConfirmationEmail,
  buildOrderAdminEmail,
  type OrderRecord,
} from "@/lib/payments/orders";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "EduFunds <noreply@aitema.de>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";

const orderSchema = z.object({
  packId: z.string().min(1, "Paket erforderlich"),
  orgName: z.string().trim().min(2, "Name der Organisation erforderlich").max(200),
  contactName: z.string().trim().min(2, "Ansprechpartner erforderlich").max(200),
  email: z.string().trim().email("Gueltige E-Mail-Adresse erforderlich").max(200),
  billingAddress: z.string().trim().min(10, "Vollstaendige Rechnungsadresse erforderlich").max(1000),
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
      return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
    }

    const parsed = orderSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Eingaben unvollstaendig";
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
    if (resend && resendApiKey) {
      try {
        const confirm = buildOrderConfirmationEmail(order);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: order.email,
          subject: confirm.subject,
          html: confirm.html,
          text: confirm.text,
        });
        const admin = buildOrderAdminEmail(order);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: admin.subject,
          html: admin.html,
          text: admin.text,
          replyTo: order.email,
        });
      } catch (mailErr) {
        console.error("[api/kontingent/order] Mailversand fehlgeschlagen:", mailErr);
        // Kein harter Fehler: Code steht in der DB, Mail kann manuell nachgeholt werden.
      }
    } else {
      console.warn("[api/kontingent/order] RESEND_API_KEY fehlt — keine Mail versendet.");
    }

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
