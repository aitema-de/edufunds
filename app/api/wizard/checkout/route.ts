import { NextRequest, NextResponse } from "next/server";
import { getWizardSession } from "@/lib/wizard/session";

/**
 * Stripe-Checkout-Stub.
 *
 * Sobald der Stripe-Account + Price-ID da sind, wird dieser Handler die
 * Checkout-Session erzeugen und die redirect-URL zurueckgeben. Bis dahin:
 * - in dev:   404-Hinweis auf Dev-Mock
 * - in prod:  503, bis Stripe konfiguriert ist
 */
export async function POST(req: NextRequest) {
  const { sessionToken, tier } = (await req.json().catch(() => ({}))) as {
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

  const hasStripe = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_EINZELANTRAG;
  if (!hasStripe) {
    return NextResponse.json(
      {
        error:
          "Zahlung noch nicht aktiv — Stripe-Konfiguration fehlt. Bitte später erneut versuchen.",
      },
      { status: 503 }
    );
  }

  // TODO: hier waere die Stripe-Integration in D2
  return NextResponse.json(
    { error: "Stripe-Integration folgt (D2)." },
    { status: 501 }
  );
}
