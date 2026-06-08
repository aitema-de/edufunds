// Laufzeit-Route: liest Request-Body, Env-Vars und ruft die Stripe-API —
// muss dynamisch sein (force-static war falsch und verhindert korrektes POST).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const PRICES = { einzel: 2900, jahresabo: 14900 } as const;
const PRODUCT_NAMES = {
  einzel: "EduFunds Einzelantrag",
  jahresabo: "EduFunds Jahresabo",
} as const;
const PRODUCT_DESCRIPTIONS = {
  einzel: "1 KI-generierter Antrag + Support",
  jahresabo: "5 Anträge pro Jahr + Prioritäts-Support",
} as const;

type ProductType = keyof typeof PRICES;

async function getStripe() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

export async function POST(request: NextRequest) {
  // Konfigurations-Gate: ohne Key sauber 503 statt 500 mit Stacktrace.
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Bezahlung per Stripe ist derzeit nicht verfügbar (nicht konfiguriert)." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const productType = body?.productType as ProductType | undefined;
    const customerData = body?.customerData as
      | { email?: string; name?: string; school?: string }
      | undefined;
    const successUrl: string | undefined = body?.successUrl;
    const cancelUrl: string | undefined = body?.cancelUrl;

    // Input-Validierung: fehlende/ungültige Felder -> 400 statt 500.
    if (productType !== "einzel" && productType !== "jahresabo") {
      return NextResponse.json(
        { error: "Ungültiger productType (erwartet: einzel oder jahresabo)" },
        { status: 400 }
      );
    }
    if (!customerData?.email) {
      return NextResponse.json(
        { error: "customerData.email ist erforderlich" },
        { status: 400 }
      );
    }

    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: PRODUCT_NAMES[productType],
              description: PRODUCT_DESCRIPTIONS[productType],
            },
            unit_amount: PRICES[productType],
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_URL}/checkout/cancel`,
      customer_email: customerData.email,
      metadata: {
        productType,
        customerName: customerData.name ?? "",
        school: customerData.school ?? "",
      },
    } as any);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error) {
    // Kein Stacktrace an den Client leaken — nur loggen.
    console.error("Stripe Error:", error);
    return NextResponse.json(
      { error: "Stripe-Integration fehlgeschlagen" },
      { status: 500 }
    );
  }
}
