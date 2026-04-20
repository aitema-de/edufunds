export type WizardPhase =
  | "interviewing"
  | "ready_to_generate"
  | "generating"
  | "complete"
  | "failed";

export interface WizardMessage {
  id: string;
  role: "ai" | "user";
  kind: "question" | "answer" | "note";
  content: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface WizardFacts {
  schule?: {
    name?: string;
    typ?: string;
    bundesland?: string;
    schuelerzahl?: number;
    besonderheiten?: string;
  };
  projekt?: {
    titel?: string;
    kurzbeschreibung?: string;
    ziele?: string[];
    zielgruppe?: string;
    aktivitaeten?: string[];
    zeitraum?: string;
  };
  wirkung?: {
    erwartete_ergebnisse?: string[];
    messbare_indikatoren?: string[];
    nachhaltigkeit?: string;
  };
  budget?: {
    beantragt_eur?: number;
    eigenmittel_eur?: number;
    hauptposten?: string[];
  };
  programmpassung?: {
    kriterien_adressiert?: string[];
    offene_luecken?: string[];
  };
  [k: string]: unknown;
}

export interface InterviewerMeta {
  totalQuestions: number;
  maxQuestions: number;
  programmCriteria?: string[];
}

export interface Finanzposten {
  id: string;
  kategorie: "personal" | "sachkosten" | "investitionen" | "honorare" | "reisekosten" | "overhead" | "sonstiges";
  bezeichnung: string;
  betragEur: number;
  /** Kurzbegruendung / Hinweis, warum dieser Posten foerderfaehig und notwendig ist. */
  begruendung?: string;
  /** true, wenn dieser Posten als Eigenanteil gerechnet wird (nicht aus Foerderung, sondern Traeger/Schule). */
  eigenanteil?: boolean;
}

export interface Finanzplan {
  posten: Finanzposten[];
  /** ISO-Zeitstempel, wann der Plan erzeugt oder zuletzt geaendert wurde. */
  generiertAm: string;
  /** Gesetzt, sobald der Nutzer den Plan freigegeben hat. */
  legitimiertAm?: string;
  /** Kommentar des Generators, z. B. Hinweise auf offene Fragen. */
  hinweise?: string[];
}

export interface GenerationArtefacts {
  outline?: { titel: string; abschnitte: Array<{ name: string; fokus: string }> };
  sections?: Array<{ name: string; text: string }>;
  critique?: string;
  finalText?: string;
  finanzplan?: Finanzplan;
}

export interface WizardSessionData {
  phase: WizardPhase;
  messages: WizardMessage[];
  facts: WizardFacts;
  interviewer: InterviewerMeta;
  generation?: GenerationArtefacts;
  /** Token-Ledger der Gemini-Calls (siehe lib/wizard/pricing.ts). */
  costs?: import("./pricing").CostLedger;
}

export interface WizardSession {
  id: number;
  sessionToken: string;
  foerderprogrammId: string;
  foerderprogrammName: string;
  status: "draft" | "in_progress" | "complete" | "paid" | "submitted" | "approved" | "rejected";
  data: WizardSessionData;
  createdAt: string;
  updatedAt: string;
  /** Sobald bezahlt: opaker Token fuer Download-URL /antrag/download/[paid_token]. */
  paidToken?: string;
  paidAt?: string;
  stripeSessionId?: string;
  tier?: string;
}

export interface NextStepQuestion {
  kind: "question";
  question: string;
  rationale?: string;
  updatedFacts: WizardFacts;
}

export interface NextStepReady {
  kind: "ready";
  summary: string;
  updatedFacts: WizardFacts;
}

export type NextStep = NextStepQuestion | NextStepReady;
