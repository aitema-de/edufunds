-- =============================================================================
-- Wizard-Session Erweiterung für ki_antraege
-- =============================================================================
-- Erlaubt anonymes Wiederaufnehmen via session_token (UUID).
-- Erweitert status um 'in_progress' (Wizard läuft) und 'complete' (Wizard fertig,
-- noch nicht "submitted" an den Fördergeber).

ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ki_antraege_session_token
  ON ki_antraege(session_token) WHERE session_token IS NOT NULL;

ALTER TABLE ki_antraege DROP CONSTRAINT IF EXISTS ki_antraege_status_check;
ALTER TABLE ki_antraege
  ADD CONSTRAINT ki_antraege_status_check
  CHECK (status IN ('draft', 'in_progress', 'complete', 'submitted', 'approved', 'rejected'));
