-- =============================================================================
-- Stripe-Webhook-Idempotenz (event.id-Dedup) — Security-Härtung Go-Live
-- =============================================================================
-- Defense-in-depth gegen doppelte Webhook-Zustellung. Die Datenebene ist bereits
-- idempotent (invoice_created_at, findCodeByStripeSession, `WHERE paid_token IS
-- NULL`), aber ein zentraler event.id-Riegel verhindert jede Doppelverarbeitung,
-- auch für künftige Handler ohne eigene Idempotenz.
--
-- Muster im Handler: RECORD-ON-SUCCESS — die event_id wird erst NACH erfolgreicher
-- Verarbeitung eingetragen. So bricht ein Fehler (500) den Stripe-Retry NICHT
-- (die event_id fehlt noch → Retry verarbeitet erneut, idempotent). Nur echte
-- Doppel-/Re-Zustellungen eines bereits verarbeiteten Events werden übersprungen.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id    TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
