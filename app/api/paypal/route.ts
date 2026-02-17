export const dynamic = 'force-static';

import { NextRequest, NextResponse } from "next/server";

// PayPal API-Endpunkte
const PAYPAL_API = process.env.NODE_ENV === "production" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

// Access Token holen
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal Credentials fehlen");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

// Bestellung erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productType, customerData } = body;

    const prices = {
      einzel: "29.00",
      jahresabo: "149.00",
    };

    const productNames = {
      einzel: "EduFunds Einzelantrag",
      jahresabo: "EduFunds Jahresabo",
    };

    const accessToken = await getPayPalAccessToken();

    // PayPal Bestellung erstellen
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: prices[productType as keyof typeof prices],
            },
            description: productNames[productType as keyof typeof productNames],
            custom_id: customerData.email,
          },
        ],
        application_context: {
          brand_name: "EduFunds",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?method=paypal`,
          cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout/einzel`,
        },
      }),
    });

    const order = await response.json();

    if (order.id) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        approvalUrl: order.links.find((link: any) => link.rel === "approve")?.href,
      });
    } else {
      return NextResponse.json(
        { error: "Fehler bei PayPal-Bestellung" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("PayPal Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler", details: String(error) },
      { status: 500 }
    );
  }
}

// Zahlung erfassen
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await response.json();

    if (captureData.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        capture: captureData,
      });
    } else {
      return NextResponse.json(
        { error: "Zahlung nicht abgeschlossen" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PayPal Capture Error:", error);
    return NextResponse.json(
      { error: "Fehler bei Zahlungserfassung" },
      { status: 500 }
    );
  }
}
