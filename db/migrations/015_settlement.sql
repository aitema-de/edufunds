-- =============================================================================
-- Anteilige Abrechnung bei Teilverbrauch
-- =============================================================================
-- Fall: Ein Träger bestellt ein 20er-Paket (459,90 EUR), löst 3 Anträge ein und
-- zahlt nicht. Fordern wir 459,90 EUR oder 3 × 29,90 = 89,70 EUR?
--
-- Entscheidung (Kolja, 14.07.2026): anteilig. Die offenen Credits werden entwertet,
-- abgerechnet werden nur die tatsächlich genutzten Anträge — zum EINZELPREIS, ohne
-- Mengenrabatt. Das ist fair, leicht durchsetzbar, und der verlorene Rabatt ist
-- genau der Anreiz, doch zu zahlen. Eine Forderung über 89,70 EUR treibt man ein;
-- über 459,90 EUR gegen eine Schule mit drei Anträgen streitet man sich.
--
-- settled_amount_cents ist die REDUZIERTE Forderung. Der ursprüngliche Betrag
-- (amount_cents) bleibt unangetastet — sonst wäre nicht mehr nachvollziehbar, was
-- bestellt und was abgerechnet wurde (GoBD).

ALTER TABLE org_orders
  ADD COLUMN IF NOT EXISTS settled_at           TIMESTAMP,
  ADD COLUMN IF NOT EXISTS settled_amount_cents INTEGER;
