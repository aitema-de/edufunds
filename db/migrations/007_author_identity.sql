-- =============================================================================
-- Autor-Identität + Magic-Link-Resume (B4)
-- =============================================================================
-- Ziel: Anträge geräteübergreifend wiederaufnehmen, ohne Passwort-Login.
-- Ein Antrag kann (opt-in) an eine E-Mail gebunden werden (author_email,
-- unverifiziert). Der Zugriff auf die geräteübergreifende Liste „Meine Anträge"
-- wird erst durch einen Magic-Link freigegeben, der den Besitz der E-Mail
-- nachweist (single-use, kurzlebig). Der signierte Identity-Cookie traegt danach
-- die verifizierte E-Mail.
--
-- Siehe .planning/payments/MONETIZATION-ARCHITECTURE.md (B4) + D-5.

-- Opt-in-Bindung eines Antrags an die E-Mail des Autors (unverifiziert).
ALTER TABLE ki_antraege
  ADD COLUMN IF NOT EXISTS author_email VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_ki_antraege_author_email
  ON ki_antraege (author_email)
  WHERE author_email IS NOT NULL;

-- Magic-Links: einmalig einloesbare, kurzlebige Tokens fuer den E-Mail-Besitznachweis.
CREATE TABLE IF NOT EXISTS magic_links (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(200) NOT NULL,
  token       VARCHAR(64)  NOT NULL UNIQUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP    NOT NULL,
  used_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links (token);
