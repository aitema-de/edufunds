-- =============================================================================
-- Mahnlauf (Zahlungserinnerung → Mahnung + Credit-Sperre)
-- =============================================================================
-- Der Rechnungskauf schaltet SOFORT frei, bevor Geld geflossen ist. Bisher
-- bemerkte niemand, wenn die Rechnung nie bezahlt wurde: kein Mahnlauf, kein
-- Zahlungsabgleich (Migration 013 hat den Status-Lebenszyklus nachgeliefert).
--
-- Zwei Zeitstempel, damit jede Stufe GENAU EINMAL laeuft — ein Cron, der
-- zweimal am Tag feuert, darf nicht zweimal mahnen.

ALTER TABLE org_orders
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP,  -- Stufe 1: Zahlungserinnerung
  ADD COLUMN IF NOT EXISTS dunning_sent_at  TIMESTAMP;  -- Stufe 2: Mahnung + Sperre
