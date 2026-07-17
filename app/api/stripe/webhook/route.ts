import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { query } from "@/lib/db";
import { markSessionPaid } from "@/lib/wizard/session";
import {
  fulfillQuotaCardPurchase,
  buildQuotaCardConfirmationEmail,
  buildQuotaCardAdminEmail,
  type QuotaCardResult,
} from "@/lib/payments/orders";
import { revokeSessionAccess, revokeQuotaCodeByStripeSession } from "@/lib/payments/refund";
import { sendMail } from "@/lib/mail";
import { runInvoiceJob, buildInvoiceJobParams } from "@/lib/payments/invoice";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "office@aitema.de";

/**
 * Verschickt die Bestaetigungs-/Admin-Mail fuer einen Kontingent-Kartenkauf (B3).
 * Best-effort: der Code steht bereits in der DB; Mailfehler werden geloggt.
 */
async function sendQuotaCardMails(result: QuotaCardResult): Promise<void> {
  if (result.email) {
    const confirm = buildQuotaCardConfirmationEmail(result);
    await sendMail(
      { to: result.email, subject: confirm.subject, html: confirm.html, text: confirm.text },
      "stripe/webhook"
    );
  }
  const admin = buildQuotaCardAdminEmail(result);
  await sendMail(
    { to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, text: admin.text, replyTo: result.email },
    "stripe/webhook"
  );
}

/**
 * Rueckerstattung → Zugriff entwerten (PAY-03).
 *
 * Vorher lief hier nur ein console.log: der Kunde bekam sein Geld zurueck und
 * behielt Antrag bzw. Kontingent unbegrenzt.
 */
async function handleChargeRefunded(ch: Stripe.Charge): Promise<void> {
  // TEILerstattung entwertet NICHT. Wer 5 von 29,90 EUR zurueckbekommt (Kulanz),
  // hat die Leistung bezahlt und behaelt sie. Nur die volle Rueckzahlung dreht
  // den Kauf zurueck.
  const voll = (ch.amount_refunded ?? 0) >= (ch.amount ?? 0);
  if (!voll) {
    console.log(
      `[stripe/webhook] charge.refunded ${ch.id}: Teilerstattung ` +
        `(${ch.amount_refunded}/${ch.amount}) — Zugriff bleibt bestehen`
    );
    return;
  }

  const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;

  // 1) Einzelantrag: der Wizard-Checkout legt wizard_session_token in die
  //    PaymentIntent-Metadaten. Der Charge erbt sie in der Regel — aber darauf
  //    verlassen wir uns nicht: notfalls den PaymentIntent nachladen.
  let token = (ch.metadata?.wizard_session_token as string | undefined) ?? null;
  if (!token && pi) {
    const intent = await getStripe().paymentIntents.retrieve(pi);
    token = (intent.metadata?.wizard_session_token as string | undefined) ?? null;
  }
  if (token) {
    const r = await revokeSessionAccess(token);
    console.log(
      `[stripe/webhook] charge.refunded ${ch.id}: Session ${token} ` +
        (r.revoked
          ? `entwertet (paid_token ${r.revokedToken} ungueltig)`
          : `war bereits entwertet oder nie bezahlt`)
    );
    return;
  }

  // 2) Kontingent-Kartenkauf: dieser Checkout setzt KEINE PaymentIntent-Metadaten.
  //    Ueber den PaymentIntent die Checkout-Session finden — daran haengt der Code
  //    (credit_codes.stripe_session_id).
  if (pi) {
    const sessions = await getStripe().checkout.sessions.list({ payment_intent: pi, limit: 1 });
    const cs = sessions.data[0];
    if (cs) {
      const r = await revokeQuotaCodeByStripeSession(cs.id);
      if (r.revoked) {
        console.log(
          `[stripe/webhook] charge.refunded ${ch.id}: Kontingent-Code ${r.code} entwertet ` +
            `(${r.creditsVerfallen} offene Credits verfallen)`
        );
        return;
      }
    }
  }

  // Nichts zugeordnet: darf nicht still bleiben — hier ist Geld zurueckgeflossen,
  // ohne dass ein Zugriff entzogen wurde.
  console.warn(
    `[stripe/webhook] charge.refunded ${ch.id}: WEDER Antrag NOCH Kontingent zugeordnet — ` +
      `nichts entwertet. Bitte manuell pruefen (payment_intent=${pi ?? "unbekannt"}).`
  );
}

export const runtime = "nodejs";
// Wichtig: Stripe braucht den ROHEN Body zur Signatur-Pruefung.
// Next.js App Router liefert den rohen Body via `await request.text()`.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe nicht konfiguriert" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "stripe-signature Header fehlt" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] Signatur-Pruefung fehlgeschlagen:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Audit-Trail: event.id ist von Stripe vergeben, kein Secret — sicher zu loggen (RESEARCH §1.2)
  console.log(`[stripe/webhook] event.id=${event.id} type=${event.type}`);

  // Idempotenz-Riegel (Defense-in-depth): bereits verarbeitete Events überspringen.
  // Fehlt die Tabelle (Migration 011 noch nicht angewandt), nicht hart scheitern —
  // die Datenebene ist ohnehin idempotent; wir loggen und verarbeiten normal weiter.
  try {
    const seen = await query<{ event_id: string }>(
      `SELECT event_id FROM stripe_webhook_events WHERE event_id = $1`,
      [event.id]
    );
    if (seen.rowCount && seen.rowCount > 0) {
      console.log(`[stripe/webhook] event.id=${event.id} bereits verarbeitet — übersprungen (dedup)`);
      return NextResponse.json({ received: true, deduped: true });
    }
  } catch (dedupErr) {
    console.error("[stripe/webhook] Dedup-Vorabprüfung fehlgeschlagen (verarbeite trotzdem):", dedupErr);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        // B3 — Self-Service-Kontingent per Karte: eigener Pfad, erzeugt einen
        // Kontingent-Code (idempotent pro Session) statt eine Wizard-Session zu
        // bezahlen.
        if (cs.metadata?.mode === "org_quota") {
          if (cs.payment_status !== "paid") {
            console.warn(
              `[stripe/webhook] org_quota, aber payment_status=${cs.payment_status} fuer ${cs.id}`
            );
            break;
          }
          const packId = (cs.metadata?.pack_id as string | undefined) ?? "";
          const result = await fulfillQuotaCardPurchase({
            stripeSessionId: cs.id,
            packId,
            orgName: (cs.metadata?.org_name as string | undefined) ?? undefined,
            email:
              cs.customer_details?.email ??
              (cs.metadata?.purchaser_email as string | undefined) ??
              undefined,
          });
          console.log(
            `[stripe/webhook] org_quota ${cs.id} -> code=${result.creditCode} ` +
              `credits=${result.credits} (alreadyExisted=${result.alreadyExisted})`
          );
          // Mail nur beim ERSTEN Verarbeiten (kein Doppelversand bei Retry).
          if (!result.alreadyExisted) {
            await sendQuotaCardMails(result);
          }
          break;
        }

        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        if (!token) {
          console.warn("[stripe/webhook] checkout.session.completed ohne wizard_session_token");
          break;
        }
        if (cs.payment_status !== "paid") {
          console.warn(
            `[stripe/webhook] checkout.session.completed, aber payment_status=${cs.payment_status} fuer ${token}`
          );
          break;
        }
        const updated = await markSessionPaid(token, {
          stripeSessionId: cs.id,
          stripeCustomerEmail: cs.customer_details?.email ?? undefined,
          tier: (cs.metadata?.tier as string | undefined) ?? "einzelantrag",
          source: "card",
        });
        console.log(
          `[stripe/webhook] Session ${token} -> paid (paidToken=${updated.paidToken})`
        );
        // PAY-03: lexoffice-Rechnung + §312i-Bestelleingangsbestätigung.
        // Best-effort — ein lexoffice-/Mailfehler darf den bereits bezahlten Kauf
        // nicht 500en. Doppelzustellung faengt die Event-Dedup oben ab
        // (stripe_webhook_events, Migration 011); scheitert die Rechnung, bleibt
        // der Marker leer und scripts/rechnung-nachholen.ts kann sie nachholen.
        //
        // Die Zuordnung Session -> Rechnungsdaten liegt bewusst in
        // buildInvoiceJobParams (lib/payments/invoice.ts): Der Nachlauf muss
        // exakt dieselbe Rechnung erzeugen wie dieser Pfad, sonst repariert er
        // etwas anderes als das Kaputte.
        await runInvoiceJob(buildInvoiceJobParams(cs, updated.paidToken));
        break;
      }
      case "checkout.session.expired": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        console.log(`[stripe/webhook] checkout.session.expired fuer ${token ?? "unknown"}`);
        // TODO PAY-03 (State-Hook): Session-Hinweis "Zahlung abgebrochen — neu starten?" im UI rendern.
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        await handleChargeRefunded(ch);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const token = (cs.metadata?.wizard_session_token as string | undefined) ?? null;
        console.log(`[stripe/webhook] async_payment_failed fuer ${token ?? "unknown"}`);
        // TODO PAY-03 (Mail-Hook): User benachrichtigen, Retry-Pfad anbieten.
        break;
      }
      default:
        // andere Events ignorieren (payment_intent.*, invoice.* etc.)
        break;
    }

    // RECORD-ON-SUCCESS: event.id erst NACH fehlerfreier Verarbeitung eintragen,
    // damit ein Fehler oben in den catch fällt (500 → Stripe-Retry) statt hier
    // fälschlich als "verarbeitet" markiert zu werden. ON CONFLICT DO NOTHING
    // deckt die seltene Race (zwei gleichzeitige Zustellungen desselben Events) ab.
    try {
      await query(
        `INSERT INTO stripe_webhook_events (event_id, event_type)
         VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING`,
        [event.id, event.type]
      );
    } catch (recErr) {
      // Tabelle fehlt/DB-Fehler: nicht den 200 gefährden — Verarbeitung war
      // erfolgreich, die Datenebene ist idempotent gegen eine etwaige Doppelung.
      console.error("[stripe/webhook] event.id konnte nicht als verarbeitet vermerkt werden:", recErr);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Handler-Fehler:", err);
    return NextResponse.json(
      { error: "handler failed" },
      { status: 500 }
    );
  }
}
