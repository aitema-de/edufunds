-- =============================================================================
-- Feedback-Ticketnummern (Pilot-Feedback-Button)
-- =============================================================================
-- Die laufende Ticketnummer (#001, #002, …) wurde bisher per ClickUp-Abfrage
-- (max #NNN + 1) bestimmt — fragil: ohne passend benannte Vortasks blieb max=0,
-- also IMMER #001. Eine SERIAL-Sequenz liefert atomar + monoton hochlaufende
-- Nummern, unabhängig von ClickUp.

CREATE TABLE IF NOT EXISTS feedback_tickets (
  id            SERIAL PRIMARY KEY,
  feedback_type VARCHAR(30),
  url           TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
