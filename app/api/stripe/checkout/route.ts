export const dynamic = 'force-static';

import { NextRequest, NextResponse } from "next/server";

// Stripe nur laden wenn Key vorhanden
const getStripe = async () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY fehlt");
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" as any,
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      productType,
      customerData,
      successUrl,
      cancelUrl
    } = body;

    const prices = {
      einzel: 2900,
      jahresabo: 14900,
    };

    const productNames = {
      einzel: "EduFunds Einzelantrag",
      jahresabo: "EduFunds Jahresabo",
    };

    const stripe = await getStripe();

    // Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productNames[productType as keyof typeof productNames],
              description: productType === "einzel" 
                ? "1 KI-generierter Antrag + Support" 
                : "5 Anträge pro Jahr + Prioritäts-Support",
            },
            unit_amount: prices[productType as keyof typeof prices],
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_URL}/checkout/cancel`,
      customer_email: customerData.email,
      metadata: {
        productType,
        customerName: customerData.name,
        school: customerData.school,
      },
    } as any);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    return NextResponse.json(
      { error: "Stripe-Integration fehlgeschlagen", details: String(error) },
      { status: 500 }
    );
  }
}
