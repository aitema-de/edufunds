-- =============================================================================
-- Self-Service-Kontingent per Karte (B3) — Idempotenz pro Stripe-Session
-- =============================================================================
-- Beim Kartenkauf eines Kontingents (Checkout metadata.mode=org_quota) erzeugt
-- der Stripe-Webhook automatisch einen Kontingent-Code. Stripe kann denselben
-- checkout.session.completed mehrfach zustellen (Retry / At-least-once). Damit
-- daraus nicht mehrere Codes (und mehrere Mails) entstehen, koppeln wir den
-- Code eindeutig an die Stripe-Checkout-Session.
--
-- Die Spalte stripe_session_id existiert bereits (Migration 004). Hier nur der
-- partielle Unique-Index als Race-sicherer Idempotenz-Guard.
--
-- Siehe .planning/payments/MONETIZATION-ARCHITECTURE.md (B3).

CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_codes_stripe_session
  ON credit_codes (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
