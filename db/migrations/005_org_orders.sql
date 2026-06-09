-- =============================================================================
-- Kontingent-Rechnungskauf (Modell B2 — oeffentliche Hand / Schultraeger)
-- =============================================================================
-- Ein Traeger bestellt ein Kontingent-Paket (5/10/20 Antraege) per Rechnung
-- (Bankueberweisung, Zahlungsziel 14 Tage). Der Kontingent-Code wird SOFORT
-- mit der Bestellung freigegeben (D: "sofort mit Rechnung") — die formelle
-- Rechnung erstellt die Buchhaltung extern, das System mailt Bestaetigung + Code.
--
-- Siehe .planning/payments/MONETIZATION-ARCHITECTURE.md (D-7..D-10).

CREATE TABLE IF NOT EXISTS org_orders (
  id              SERIAL PRIMARY KEY,
  order_number    VARCHAR(40)  NOT NULL UNIQUE,        -- EDU-<base36>-<rand>, = Verwendungszweck
  pack_id         VARCHAR(30)  NOT NULL,               -- pack5 | pack10 | pack20
  credits         INTEGER      NOT NULL CHECK (credits > 0),
  amount_cents    INTEGER      NOT NULL CHECK (amount_cents > 0), -- Brutto inkl. MwSt

  -- Org- / Rechnungsdaten
  org_name        VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(200) NOT NULL,
  email           VARCHAR(200) NOT NULL,
  billing_address TEXT         NOT NULL,
  vat_id          VARCHAR(50),                         -- optional: USt-IdNr.
  po_number       VARCHAR(100),                        -- optional: Bestellnummer der Behoerde
  note            TEXT,

  -- Verknuepfung zum erzeugten Kontingent-Code (1 Sammel-Code je Kauf, D-9)
  credit_code     VARCHAR(40)  REFERENCES credit_codes(code),

  status          VARCHAR(30)  NOT NULL DEFAULT 'payment_pending', -- payment_pending | paid | cancelled
  due_date        DATE,                                -- Zahlungsziel
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_orders_email  ON org_orders(email);
CREATE INDEX IF NOT EXISTS idx_org_orders_status ON org_orders(status);
