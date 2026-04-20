-- =============================================================================
-- Paywall-Erweiterung für ki_antraege
-- =============================================================================
-- Ziel: vollstaendiger Antrag + Finanzplan werden nur nach erfolgreicher
-- Zahlung zum Download freigeschaltet. Ohne Login, anonym: ein separater
-- paid_token dient als Entitlement-Handle fuer die Download-URL.
--
-- paid_token         — opaker 64-stelliger Token, der die Freischaltung identifiziert
-- paid_at            — Zeitpunkt der Zahlungsbestaetigung (via Stripe-Webhook)
-- stripe_session_id  — zur Audit-Ablage (Stripe-Checkout-Session-ID)
-- stripe_customer_email — fuer manuelle Reconciliation
-- tier               — gewaehlter Pricing-Tier ("einzelantrag" in Phase 1)
-- status um 'paid' erweitert

ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS paid_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(200),
  ADD COLUMN IF NOT EXISTS stripe_customer_email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tier VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ki_antraege_paid_token
  ON ki_antraege(paid_token) WHERE paid_token IS NOT NULL;

ALTER TABLE ki_antraege DROP CONSTRAINT IF EXISTS ki_antraege_status_check;
ALTER TABLE ki_antraege
  ADD CONSTRAINT ki_antraege_status_check
  CHECK (status IN ('draft', 'in_progress', 'complete', 'paid', 'submitted', 'approved', 'rejected'));
