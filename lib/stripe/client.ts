import Stripe from "stripe";

/**
 * Server-seitiger Stripe-Client (Singleton).
 * Wirft sichtbar, wenn STRIPE_SECRET_KEY nicht konfiguriert ist —
 * Aufrufe werden dann im jeweiligen Route-Handler mit 503 beantwortet.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
  cached = new Stripe(key, {
    // ohne apiVersion: die Account-Default wird genutzt.
    typescript: true,
  });
  return cached;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
