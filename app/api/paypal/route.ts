// Laufzeit-Route: liest Request-Body, Env-Vars und ruft die PayPal-API —
// muss dynamisch sein (force-static war falsch und verhindert korrektes POST/PUT).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// PayPal API-Endpunkte
const PAYPAL_API =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PRICES = { einzel: "29.00", jahresabo: "149.00" } as const;
const PRODUCT_NAMES = {
  einzel: "EduFunds Einzelantrag",
  jahresabo: "EduFunds Jahresabo",
} as const;

type ProductType = keyof typeof PRICES;

function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/** Frische 503-Antwort, wenn PayPal nicht konfiguriert ist. */
function notConfiguredResponse() {
  return NextResponse.json(
    { error: "Bezahlung per PayPal ist derzeit nicht verfügbar (nicht konfiguriert)." },
    { status: 503 }
  );
}

// Access Token holen (Aufrufer stellen sicher, dass Credentials vorhanden sind)
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID as string;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET as string;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

// Bestellung erstellen
export async function POST(request: NextRequest) {
  // Konfigurations-Gate: ohne Credentials sauber 503 statt 500 mit Stacktrace.
  if (!paypalConfigured()) {
    return notConfiguredResponse();
  }

  try {
    const body = await request.json().catch(() => null);
    const productType = body?.productType as ProductType | undefined;
    const customerData = body?.customerData as { email?: string } | undefined;

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

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: PRICES[productType],
            },
            description: PRODUCT_NAMES[productType],
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
    }
    return NextResponse.json({ error: "Fehler bei PayPal-Bestellung" }, { status: 502 });
  } catch (error) {
    console.error("PayPal Error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// Zahlung erfassen
export async function PUT(request: NextRequest) {
  if (!paypalConfigured()) {
    return notConfiguredResponse();
  }

  try {
    const body = await request.json().catch(() => null);
    const orderId: string | undefined = body?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "orderId ist erforderlich" }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await response.json();

    if (captureData.status === "COMPLETED") {
      return NextResponse.json({ success: true, capture: captureData });
    }
    return NextResponse.json({ error: "Zahlung nicht abgeschlossen" }, { status: 400 });
  } catch (error) {
    console.error("PayPal Capture Error:", error);
    return NextResponse.json({ error: "Fehler bei Zahlungserfassung" }, { status: 500 });
  }
}
