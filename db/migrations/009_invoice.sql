-- 009_invoice.sql — lexoffice-Rechnung pro Einzelantrag-Kartenkauf (B1)
--
-- Beim Stripe-Zahlungseingang erzeugt der Webhook automatisch eine finalisierte
-- Rechnung in lexoffice (Lexware Office) und verschickt sie als PDF.
-- Diese Spalten dienen (a) der Idempotenz gegen Webhook-Doppelzustellung
-- (lexoffice hat KEINEN Idempotenz-Header) und (b) als Audit/GoBD-Referenz auf
-- die fortlaufende Rechnungsnummer.
--
-- `invoice_created_at` ist der Verarbeitungs-Marker: sobald gesetzt, wird der
-- Rechnungs-/Mail-Block fuer diese Session nicht erneut ausgefuehrt — auch dann,
-- wenn die lexoffice-Erstellung fehlschlug (dann id/number NULL + Admin-Alert).

ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS invoice_lexoffice_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invoice_number       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS invoice_created_at   TIMESTAMPTZ;
