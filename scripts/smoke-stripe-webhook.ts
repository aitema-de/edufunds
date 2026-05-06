/**
 * Smoke-Test fuer app/api/stripe/webhook (Plan 02.1-02).
 * Nutzung: `npx tsx --env-file=.env.local scripts/smoke-stripe-webhook.ts`
 * Voraussetzung: Dev-Server laeuft auf http://localhost:3101
 * Voraussetzung: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in .env.local
 */

import Stripe from "stripe";

const BASE_URL = process.env.WEBHOOK_SMOKE_BASE_URL ?? "http://localhost:3101";

interface WebhookSmokeSummary {
  positivTest: boolean;
  negativTest: boolean;
}

async function main(): Promise<WebhookSmokeSummary> {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !webhookSecret) {
    throw new Error(
      "STRIPE_SECRET_KEY und STRIPE_WEBHOOK_SECRET muessen in .env.local gesetzt sein."
    );
  }

  const stripe = new Stripe(secret, { typescript: true });

  // Test-Payload: simuliertes checkout.session.completed-Event
  const testPayload = JSON.stringify({
    id: "evt_test_smoke_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_smoke_123",
        metadata: {
          wizard_session_token: "test-token-from-smoke-script",
        },
        payment_status: "paid",
        customer_details: {
          email: "test@example.com",
        },
      },
    },
  });

  // [1/3] Signatur generieren und POST senden
  console.log("[1/3] Generiere Test-Signatur via stripe.webhooks.generateTestHeaderString ...");
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: testPayload,
    secret: webhookSecret,
  });
  console.log(`  -> Signatur generiert (${signature.slice(0, 30)}...)`);

  // [2/3] Positiv-Pfad: gueltiger Event mit korrekter Signatur → 200
  console.log("[2/3] Positiv-Pfad: POST mit gueltiger Signatur ...");
  const positiveRes = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: testPayload,
  });
  const positiveBody = await positiveRes.json().catch(() => ({})) as { received?: boolean; error?: string };
  const positivTest =
    positiveRes.status === 200 && positiveBody.received === true;
  if (positivTest) {
    console.log(`  -> OK: status=${positiveRes.status}, received=${positiveBody.received}`);
  } else {
    console.error(
      `  -> FAIL: status=${positiveRes.status}, body=${JSON.stringify(positiveBody)}`
    );
  }

  // [3/3] Negativ-Pfad: gefaelschte Signatur → 400
  console.log("[3/3] Negativ-Pfad: POST mit gefaelschter Signatur (v1=fake) → erwartet 400 ...");
  const negativeRes = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "v1=fake_signature_for_smoke_test",
    },
    body: testPayload,
  });
  const negativeBody = await negativeRes.json().catch(() => ({})) as { error?: string };
  const negativTest = negativeRes.status === 400;
  if (negativTest) {
    console.log(`  -> OK: status=${negativeRes.status} (erwartet 400)`);
  } else {
    console.error(
      `  -> FAIL: status=${negativeRes.status}, body=${JSON.stringify(negativeBody)}`
    );
  }

  const ok = positivTest && negativTest;
  if (ok) {
    console.log("\nSMOKE OK — Webhook-Route antwortet korrekt auf gueltige und ungueltige Signaturen.");
  } else {
    console.error("\nSMOKE FAIL — Mindestens ein Pfad schlug fehl (s.o.).");
    process.exit(1);
  }

  return { positivTest, negativTest };
}

main().catch((err) => {
  console.error("SMOKE FAIL:", err);
  process.exit(1);
});
