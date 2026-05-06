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

export type CritiqueSchwere = "hoch" | "mittel" | "niedrig";
export type CritiqueKategorie =
  | "floskel"
  | "belegluecke"
  | "richtlinie"
  | "inkonsistenz"
  | "sonstiges";

export interface CritiqueFinding {
  /** Name des betroffenen Abschnitts, oder 'global'/'finanzplan'. */
  abschnitt: string;
  /** Wörtliches Kurzzitat der Stelle, oder 'FEHLT' wenn der Inhalt ganz fehlt. */
  zitat: string;
  schwere: CritiqueSchwere;
  kategorie: CritiqueKategorie;
  /** Konkreter Vorschlag für die Revision. */
  vorschlag: string;
}

export interface Critique {
  zusammenfassung?: string;
  findings: CritiqueFinding[];
}

export type FindingStatus = "geschlossen" | "teilweise" | "offen";

export interface FindingResolution {
  /** 1-basierter Index in critiqueFindings. */
  index: number;
  status: FindingStatus;
  kommentar?: string;
}

export type ConsistencyArt =
  | "posten-ohne-textbezug"
  | "textbezug-ohne-posten"
  | "betrag-unstimmig"
  | "sonstiges";

export interface ConsistencyIssue {
  art: ConsistencyArt;
  beschreibung: string;
  /** Bezeichnung des betroffenen Finanzpostens, falls zuordenbar. */
  posten?: string;
  /** Kurzzitat aus dem Antragstext, falls zuordenbar. */
  textstelle?: string;
}

/**
 * Pipeline-Stage-Identifier — Single Source of Truth (RESEARCH Open Question #4).
 * pipeline.ts re-exportiert; GeneratingProgress importiert von hier.
 */
export type PipelineStage =
  | "outline"
  | "section"
  | "critique"
  | "revision"
  | "recheck"
  | "finanzplan"
  | "consistency"
  | "done";

export interface GenerationArtefacts {
  outline?: { titel: string; abschnitte: Array<{ name: string; fokus: string }> };
  sections?: Array<{ name: string; text: string }>;
  /** Gerenderter Critique-Text (Markdown-Liste). Fuer UI-Anzeige + Revision-Input. */
  critique?: string;
  /** Strukturierte Findings fuer spaetere Auswertung (UI, Re-Check). */
  critiqueFindings?: CritiqueFinding[];
  /** Ergebnis des Re-Check-Laufs: welche Findings hat die Revision geschlossen. */
  critiqueResolutions?: FindingResolution[];
  /** True, wenn mind. ein Finding mit schwere=hoch nicht abschliessend geschlossen ist. */
  hasOpenHighFindings?: boolean;
  /** Inkonsistenzen zwischen Antragstext und Finanzplan (Cross-Check). */
  consistencyIssues?: ConsistencyIssue[];
  /** True, wenn mindestens ein Konsistenz-Issue gefunden wurde. */
  hasConsistencyIssues?: boolean;
  finalText?: string;
  finanzplan?: Finanzplan;
  /** D-13 — Aktueller Pipeline-Stage waehrend Generation. Bei jedem emit() in DB persistiert. */
  stage?: PipelineStage;
  /** D-13 — ISO-Timestamp des letzten Stage-Updates. Frontend nutzt fuer Liveness-Check. */
  stageAt?: string;
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
