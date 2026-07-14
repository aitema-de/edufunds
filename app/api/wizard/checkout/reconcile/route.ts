/**
 * POST /api/wizard/checkout/reconcile
 *
 * Fallback, wenn der Stripe-Webhook ausbleibt.
 *
 * WARUM ES DAS GIBT: Die Freischaltung haengt allein am Webhook
 * (`checkout.session.completed` → `markSessionPaid`). Kommt der nicht an, hat der
 * Kunde gezahlt und bekommt nichts — und es gibt keinen Weg, das zu heilen ausser
 * einem Entwickler mit DB-Zugang. Genau dieser Fall ist beim Domain-Wechsel real:
 * Der im Stripe-Dashboard registrierte Endpoint zeigt nach dem Apex-Switch noch auf
 * `app.edufunds.org`, und Stripe folgt Redirects bei Webhooks nicht zuverlaessig
 * (Runbook 9.5). Ein vergessener Haken dort = jede Zahlung laeuft ins Leere.
 *
 * Diese Route fragt Stripe direkt: Ist die Checkout-Session bezahlt? Wenn ja, wird
 * freigeschaltet — dieselbe Wirkung wie der Webhook, nur vom Erfolgs-Screen aus
 * angestossen. Der Webhook bleibt der Normalweg; das hier ist das Sicherheitsnetz.
 *
 * SICHERHEIT: Die Stripe-Session-ID (`cs`) steht in der Redirect-URL, ist also dem
 * Client bekannt. Wir schalten deshalb NUR frei, wenn
 *   (a) Stripe `payment_status === "paid"` meldet, UND
 *   (b) der in Stripes METADATEN hinterlegte `wizard_session_token` mit dem
 *       uebergebenen Token uebereinstimmt.
 * Damit reicht eine erbeutete fremde `cs` nicht: Wer den zugehoerigen (geheimen)
 * Wizard-Token nicht kennt, bekommt nichts. Und wir vertrauen nie dem Token aus dem
 * Request, sondern immer dem aus den Stripe-Metadaten.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { tryMarkSessionPaid } from "@/lib/wizard/session";
import { secureEquals } from "@/lib/secure-compare";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { sessionToken?: unknown; cs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken.trim() : "";
  const cs = typeof body.cs === "string" ? body.cs.trim() : "";

  if (!sessionToken || !cs) {
    return NextResponse.json({ error: "sessionToken und cs erforderlich" }, { status: 400 });
  }
  // Stripe-Checkout-Sessions beginnen immer mit "cs_". Frueh aussteigen, statt eine
  // beliebige Zeichenkette an die Stripe-API zu schicken.
  if (!cs.startsWith("cs_")) {
    return NextResponse.json({ error: "Ungültige Checkout-Session" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Zahlung nicht konfiguriert" }, { status: 503 });
  }

  try {
    const stripe = getStripe();
    const cso = await stripe.checkout.sessions.retrieve(cs);

    // (a) Wirklich bezahlt? Alles andere (unpaid, no_payment_required) faellt durch.
    if (cso.payment_status !== "paid") {
      return NextResponse.json(
        { ok: false, reason: "not_paid", paymentStatus: cso.payment_status },
        { status: 409 },
      );
    }

    // (b) Gehoert die Zahlung zu DIESEM Antrag? Maßgeblich sind Stripes Metadaten,
    // nicht die Behauptung des Clients.
    const tokenFromStripe = cso.metadata?.wizard_session_token ?? "";
    if (!tokenFromStripe || !secureEquals(tokenFromStripe, sessionToken)) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    // Freischalten — race-sicher und idempotent (derselbe Aufruf wie im Webhook).
    // Laeuft der Webhook parallel, gewinnt einer von beiden; didSet verhindert Doppelung.
    // source bleibt "card": Es IST eine Kartenzahlung ueber Stripe — diese Route ist
    // nur der zweite Erkennungsweg, nicht eine andere Zahlungsart.
    const { session: paid, didSet } = await tryMarkSessionPaid(tokenFromStripe, {
      source: "card",
      tier: (cso.metadata?.tier as string) ?? "einzelantrag",
      stripeSessionId: cso.id,
      stripeCustomerEmail: cso.customer_details?.email ?? undefined,
    });

    if (!paid.paidToken) {
      return NextResponse.json({ error: "Freischaltung fehlgeschlagen" }, { status: 500 });
    }

    if (didSet) {
      // Das ist der Ernstfall: Der Webhook ist NICHT angekommen. Laut und sichtbar
      // loggen — wenn das gehaeuft auftritt, stimmt etwas mit dem Endpoint nicht
      // (falsche Domain im Dashboard, abgelaufenes whsec, Traefik-Regel).
      console.warn(
        `[checkout/reconcile] Zahlung ${cs} war bezahlt, aber NICHT freigeschaltet — ` +
          `der Webhook ist ausgeblieben. Nachtraeglich freigeschaltet. ` +
          `Stripe-Webhook-Endpoint pruefen!`,
      );
    }

    return NextResponse.json({ ok: true, paidToken: paid.paidToken, recovered: didSet });
  } catch (err) {
    console.error("[checkout/reconcile] Fehler:", err);
    return NextResponse.json({ error: "Abgleich fehlgeschlagen" }, { status: 500 });
  }
}
