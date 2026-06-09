import { NextRequest, NextResponse } from "next/server";
import { getWizardSession } from "@/lib/wizard/session";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";

const TIER_CONFIG: Record<string, { priceEnv: string; label: string }> = {
  einzelantrag: { priceEnv: "STRIPE_PRICE_EINZELANTRAG", label: "Einzelantrag" },
};

function appUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    `${new URL(req.url).protocol}//${req.headers.get("host")}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, tier = "einzelantrag" } = (await req.json().catch(() => ({}))) as {
      sessionToken?: string;
      tier?: string;
    };
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    if (session.paidToken) {
      return NextResponse.json({
        checkoutUrl: null,
        alreadyPaid: true,
        paidToken: session.paidToken,
      });
    }

    const tierCfg = TIER_CONFIG[tier];
    if (!tierCfg) {
      return NextResponse.json({ error: `Unbekannter Tier: ${tier}` }, { status: 400 });
    }

    if (!stripeConfigured() || !process.env[tierCfg.priceEnv]) {
      return NextResponse.json(
        {
          error:
            "Zahlung noch nicht aktiv — Stripe-Konfiguration fehlt. Bitte später erneut versuchen.",
        },
        { status: 503 }
      );
    }

    const base = appUrl(req);
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env[tierCfg.priceEnv]!, quantity: 1 }],
      success_url: `${base}/antrag/checkout/success?session_token=${encodeURIComponent(
        sessionToken
      )}&cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/antrag/${encodeURIComponent(session.foerderprogrammId)}/wizard`,
      metadata: {
        wizard_session_token: sessionToken,
        programm_id: session.foerderprogrammId,
        tier,
      },
      payment_intent_data: {
        metadata: {
          wizard_session_token: sessionToken,
          tier,
        },
      },
      allow_promotion_codes: true,
      locale: "de",
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (err) {
    console.error("[api/wizard/checkout] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout fehlgeschlagen" },
      { status: 500 }
    );
  }
}
