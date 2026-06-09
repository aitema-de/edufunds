-- =============================================================================
-- Kontingent-Codes (Entitlement-Schicht, Modell B1)
-- =============================================================================
-- Ziel: Eine Organisation (Schultraeger) zahlt vorab ein Kontingent von N
-- Antraegen. Lehrkraefte loesen beim Freischalten einen Code ein (statt selbst
-- zu zahlen) — der Code dekrementiert atomar ein Guthaben und mintet via
-- markSessionPaid() denselben paid_token wie die Kartenzahlung.
--
-- Siehe .planning/payments/MONETIZATION-ARCHITECTURE.md (Entscheidungen D-1..D-6).

-- Entitlement-Quelle pro Antrag dokumentieren (card | code).
ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS entitlement_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS credit_code VARCHAR(40);

-- Guthaben-Codes.
CREATE TABLE IF NOT EXISTS credit_codes (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(40)  NOT NULL UNIQUE,
  credits_total   INTEGER      NOT NULL CHECK (credits_total > 0),
  credits_used    INTEGER      NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  org_name        VARCHAR(200),
  purchaser_email VARCHAR(200),
  source          VARCHAR(30)  NOT NULL DEFAULT 'manual', -- manual | invoice | stripe
  stripe_session_id VARCHAR(200),
  note            TEXT,
  expires_at      TIMESTAMP,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT credit_codes_not_overspent CHECK (credits_used <= credits_total)
);

-- Einloese-Protokoll (Audit + spaetere Verbrauchs-Attribution pro Schule).
CREATE TABLE IF NOT EXISTS credit_code_redemptions (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(40) NOT NULL REFERENCES credit_codes(code),
  session_token VARCHAR(64) NOT NULL,
  paid_token    VARCHAR(64),
  redeemer_note VARCHAR(200), -- optional: Schule/E-Mail fuer Report
  redeemed_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_code_redemptions_code
  ON credit_code_redemptions(code);
