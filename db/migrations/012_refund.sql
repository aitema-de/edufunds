-- =============================================================================
-- Rückerstattung: Zugriff entwerten (PAY-03)
-- =============================================================================
-- Bisher lief nach einer Rückerstattung nur ein console.log: der Download-Token
-- blieb unbegrenzt gültig, das Kontingent weiter einlösbar. Zahlungsstatus und
-- Zugriffsrecht liefen dauerhaft auseinander.
--
-- ⚠️ Das TODO im Webhook behauptete, Migration 004 kenne den Status "refunded"
-- bereits. Das stimmte NICHT — die jüngste CHECK-Constraint (003) kennt ihn
-- nicht, ein UPDATE auf 'refunded' wäre an der Constraint gescheitert. Deshalb
-- hier zuerst der Status.
--
-- Entwerten heisst: paid_token auf NULL. Der Token ist der Schlüssel zu DREI
-- Türen (Download-Seite, finanzplan/autofix, finanzplan/legitimize) — nur wenn
-- er verschwindet, schliessen alle drei. Der alte Token wandert nach
-- refunded_token: fuer die Nachvollziehbarkeit und damit die Download-Seite
-- erklaeren kann, warum der Link nicht mehr geht (statt einer nackten 404).

ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS refunded_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refunded_token VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_ki_antraege_refunded_token
  ON ki_antraege (refunded_token)
  WHERE refunded_token IS NOT NULL;

ALTER TABLE ki_antraege DROP CONSTRAINT IF EXISTS ki_antraege_status_check;
ALTER TABLE ki_antraege
  ADD CONSTRAINT ki_antraege_status_check
  CHECK (status IN ('draft', 'in_progress', 'complete', 'paid', 'refunded', 'submitted', 'approved', 'rejected'));

-- Kontingent-Codes: Rückerstattung eines Kontingent-Kaufs (bis 459,90 EUR) muss
-- die noch offenen Credits entwerten. Nicht ueber expires_at loesen — das waere
-- eine Luege gegenueber dem Nutzer ("abgelaufen" statt "erstattet") und wuerde
-- den echten Ablauf ueberschreiben. Bereits eingeloeste Credits bleiben
-- protokolliert (credits_used unangetastet, GoBD/Audit).
ALTER TABLE credit_codes
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
