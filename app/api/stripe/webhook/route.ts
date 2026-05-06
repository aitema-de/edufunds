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
        break;
      }
      case "charge.refunded":
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        // Minimal loggen. Echte Storno-/Refund-Logik kommt mit Phase 2 der Abos.
        console.log(`[stripe/webhook] ${event.type} — kein Handler aktiv.`);
        break;
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
