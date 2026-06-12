-- Migration 010: Newsletter-Ausgaben (Entwurf → Freigabe → Versand)
--
-- Persistiert generierte Newsletter-Ausgaben mit Freigabe-Workflow.
-- Der Cron-Job erzeugt monatlich einen Entwurf (status='draft'); ein Admin
-- prüft/bearbeitet ihn im Admin-Bereich, gibt ihn frei (status='approved')
-- und löst den Versand aus (status='sending' → 'sent' bzw. 'failed').
--
-- Idempotent: CREATE ... IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id            SERIAL PRIMARY KEY,
  issue_number  TEXT        NOT NULL,                 -- z.B. "Ausgabe #3"
  subject       TEXT,                                 -- finale Betreffzeile (überschreibt Default)
  status        TEXT        NOT NULL DEFAULT 'draft', -- draft | approved | sending | sent | failed
  data          JSONB       NOT NULL,                 -- NewsletterData (Editorial, Programme, Tipp, Insight, News)
  generated_by  TEXT        NOT NULL DEFAULT 'cron',  -- cron | manual
  llm_provider  TEXT,                                 -- deepseek | mistral | gemini
  program_ids   TEXT[]      NOT NULL DEFAULT '{}',    -- IDs der gefeaturten Programme (Rotation/Anti-Wiederholung)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at   TIMESTAMPTZ,
  approved_by   TEXT,
  sent_at       TIMESTAMPTZ,
  send_stats    JSONB                                 -- { total, successful, failed }
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status  ON newsletter_issues(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_created ON newsletter_issues(created_at DESC);
