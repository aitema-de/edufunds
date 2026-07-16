-- =============================================================================
-- Bestellstatus-Lebenszyklus (org_orders)
-- =============================================================================
-- Bisher wurde `status` bei der Bestellung auf 'payment_pending' gesetzt und von
-- KEINER Zeile Code jemals wieder geaendert. Folgen:
--
--  1. Eine bezahlte Rechnung war vom System nicht von einer unbezahlten zu
--     unterscheiden — es gab keinen Zahlungsabgleich.
--  2. Die Bremse gegen unbezahlte Sofort-Freischaltungen (MAX_OPEN_INVOICE_ORDERS,
--     zaehlt 'payment_pending' pro E-Mail) hatte damit KEINE Lösemechanik: Ein
--     Kunde, der zweimal bestellt und brav bezahlt, wurde beim dritten Mal
--     dauerhaft mit 409 abgewiesen. Die Bremse bestrafte den zahlenden Stammkunden.
--
-- Ausserdem: Der Einzelantrag-Rechnungskauf verknuepft die Bestellung mit dem
-- freigeschalteten Antrag bisher nur als FREITEXT in `note`
-- ("[… Antrag-Session: <token> · paid_token: <token>]"). Darauf laesst sich nicht
-- handeln — ein Storno muesste den Text parsen. Daher eine echte Spalte.

ALTER TABLE org_orders
  ADD COLUMN IF NOT EXISTS paid_at       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  -- Einzelantrag auf Rechnung: an welchem Antrag haengt diese Bestellung?
  -- (Kontingent-Bestellungen nutzen stattdessen credit_code.)
  ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);

-- Die drei Status waren bisher nur ein Kommentar im Schema, nichts erzwang sie.
ALTER TABLE org_orders DROP CONSTRAINT IF EXISTS org_orders_status_check;
ALTER TABLE org_orders
  ADD CONSTRAINT org_orders_status_check
  CHECK (status IN ('payment_pending', 'paid', 'cancelled'));

-- Der Mahnlauf sucht ueberfaellige, noch offene Bestellungen.
CREATE INDEX IF NOT EXISTS idx_org_orders_due_open
  ON org_orders (due_date)
  WHERE status = 'payment_pending';
