export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPack } from "@/lib/payments/packs";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";

/**
 * Self-Service-Kontingent per Karte (B3).
 *
 * Erzeugt eine Stripe-Checkout-Session fuer ein Kontingent-Paket. Der Preis wird
 * inline aus der zentralen Paket-Tabelle (`packs.ts`) gesetzt (price_data) — es
 * werden KEINE vorab angelegten Stripe-Price-Objekte gebraucht, damit Anzeige,
 * Bestellung und Charge nie driften. Nach erfolgreicher Zahlung erzeugt der
 * Webhook (metadata.mode=org_quota) den Kontingent-Code.
 */
const checkoutSchema = z.object({
  packId: z.string().min(1, "Paket erforderlich"),
  orgName: z.string().trim().min(2, "Name der Organisation erforderlich").max(200),
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich").max(200),
});

function appUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    `${new URL(req.url).protocol}//${req.headers.get("host")}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Eingaben unvollständig";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { packId, orgName, email } = parsed.data;

    const pack = getPack(packId);
    if (!pack || !pack.isQuota) {
      return NextResponse.json(
        { error: "Unbekanntes oder nicht bestellbares Paket." },
        { status: 400 }
      );
    }

    if (!stripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Kartenzahlung noch nicht aktiv — Stripe-Konfiguration fehlt. Bitte Rechnungskauf nutzen.",
        },
        { status: 503 }
      );
    }

    const base = appUrl(req);
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: pack.priceCents,
            product_data: {
              name: `EduFunds Kontingent — ${pack.label}`,
              description: `${pack.credits} Förderanträge, 12 Monate gültig`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${base}/kontingent?bezahlt=1&cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/kontingent?abgebrochen=1`,
      metadata: {
        mode: "org_quota",
        pack_id: pack.id,
        org_name: orgName,
        purchaser_email: email,
      },
      // AGB-Einbeziehung: Stripe zeigt eine Pflicht-Checkbox „Ich stimme den AGB zu".
      // Ohne sie kaeme der Vertrag ueber ein Kontingent (bis 459,90 EUR) zustande, ohne dass
      // die AGB je einbezogen waeren — dann gelten weder die KI-Klausel noch die
      // Haftungsbegrenzung. Identisch zum Einzelantrag-Checkout gesteuert.
      ...(process.env.STRIPE_TOS_CONSENT !== "off"
        ? { consent_collection: { terms_of_service: "required" as const } }
        : {}),
      locale: "de",
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (err) {
    console.error("[api/kontingent/checkout] Fehler:", err);
    return NextResponse.json(
      { error: "Checkout fehlgeschlagen" },
      { status: 500 }
    );
  }
}
