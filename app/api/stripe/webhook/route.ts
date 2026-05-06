import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { markSessionPaid } from "@/lib/wizard/session";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
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
        });
        console.log(
          `[stripe/webhook] Session ${token} -> paid (paidToken=${updated.paidToken})`
        );
        // TODO PAY-03 (Mail-Hook): Invoice-Mail an Kaeufer ueber resend@^4.1.1 (sobald Stripe-Account live).
        // TODO PAY-03 (State-Hook): UI-Flag "Antrag wurde bezahlt" + Confetti-Hinweis im naechsten Wizard-Mount.
        // TODO PAY-03 (DB-Schema-Hook): Wenn Migration 004 paid-Status um Sub-Werte erweitert (refunded/expired), hier dispatchen.
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
        console.log(`[stripe/webhook] charge.refunded ${ch.id}`);
        // TODO PAY-03 (DB-Schema-Hook): paid_token invalidieren — Migration 004 erweitert ki_antraege.status um "refunded".
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

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Handler-Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler failed" },
      { status: 500 }
    );
  }
}
