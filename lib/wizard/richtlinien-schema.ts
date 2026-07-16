/**
 * Schema fuer programm-spezifische Foerderrichtlinien.
 *
 * Jedes Programm, fuer das wir ein sauberes Finanzplan- und Antrags-Gerüst
 * liefern wollen, braucht ein Dossier nach diesem Schema. Dossiers liegen
 * unter data/richtlinien/<programmId>.json.
 *
 * Programme ohne Dossier fallen auf generische Fragen/Finanzplan-Logik
 * zurueck — der Wizard kennzeichnet das fuer den Nutzer transparent.
 */

export type Kostenkategorie =
  | "personal"
  | "sachkosten"
  | "investitionen"
  | "honorare"
  | "reisekosten"
  | "overhead"
  | "sonstiges";

export interface Kostenposition {
  kategorie: Kostenkategorie;
  /** Ist diese Kategorie in diesem Programm ueberhaupt foerderfaehig? */
  foerderfaehig: boolean;
  /** Absolute Obergrenze pro Antrag (in EUR). */
  maxEur?: number;
  /** Prozentualer Anteil am Gesamtbudget des Antrags, als 0..100. */
  maxProzent?: number;
  /** Klartext-Bedingungen: inkl. Sozialabgaben? nur bei Vollzeit? etc. */
  bedingungen?: string[];
  /** Beispielhafte Posten, die klar foerderfaehig sind. */
  beispielePasst?: string[];
  /** Beispielhafte Posten, die NICHT foerderfaehig sind. */
  beispielePasstNicht?: string[];
}

export interface Eigenmittel {
  /** Ist Eigenanteil vorgeschrieben? */
  pflicht: boolean;
  /** Prozentualer Mindest-Eigenanteil (z. B. 20). */
  mindestProzent?: number;
  /** Welche Formen von Eigenmitteln werden anerkannt? */
  formenErlaubt?: Array<"finanziell" | "sachleistungen" | "eigenarbeit" | "drittmittel">;
  bemerkung?: string;
}

export interface Kumulierung {
  erlaubt: boolean | "bedingt";
  bedingungen?: string[];
  /**
   * IDs anderer Programme (aus foerderprogramme.json), die explizit
   * ausgeschlossen sind fuer dieselbe Massnahme.
   */
  unvereinbarMit?: string[];
  /** IDs, mit denen Kombination explizit empfohlen/moeglich ist. */
  kombinationMoeglichMit?: string[];
}

export interface AntragsAbschnitt {
  /** Interne Kurz-ID, wird vom Wizard fuer Mapping genutzt. */
  id: string;
  /** Menschenlesbarer Name / offizielle Ueberschrift im Antragsformular. */
  name: string;
  pflicht: boolean;
  /** Zeichenlimit, falls das Antragsformular eines vorgibt. */
  maxZeichen?: number;
  /** Leitfragen, die der Abschnitt beantworten muss. Formen die Interviewer- und Schreib-Prompts. */
  leitfragen?: string[];
  /** Kommentar fuer die KI zum Stil/Ton dieses Abschnitts. */
  stilhinweis?: string;
}

export interface Antragsstruktur {
  abschnitte: AntragsAbschnitt[];
  /** Verpflichtende/empfohlene Anlagen (z. B. Schultraeger-Beschluss). */
  anlagen?: string[];
  einreichungsweg: string;
  /** Bearbeitungszeit nach Einreichung, wenn bekannt. */
  bearbeitungsdauer?: string;
}

export interface Foerderhoehe {
  minEur?: number;
  maxEur?: number;
  /** Maximaler Foerderanteil an den Gesamtkosten (0..100). */
  maxProzentGesamtkosten?: number;
  bemerkung?: string;
}

export interface BestPractice {
  /** Themen-Kurzlabel, 3-60 Zeichen, z. B. "Zielgruppen-Schaerfe". */
  thema: string;
  /** Was funktionierte konkret im Antrag (mind. 10 Zeichen). */
  was_funktionierte: string;
  /** Optional: warum das funktionierte (Begruendung aus der Quelle). */
  warum?: string;
}

export interface RejectGrund {
  /** Klartext-Grund fuer Ablehnung, mind. 5 Zeichen. */
  grund: string;
  /** Wie haeufig dieser Grund auftritt (ASCII-only Diskriminator). */
  haeufigkeit?: "haeufig" | "gelegentlich";
  /** Optional: konstruktive Vermeidungs-Empfehlung. */
  vermeidung?: string;
}

export interface VorbildFormulierung {
  /**
   * FK gegen Antragsstruktur.abschnitte[].id. Validator prueft Integritaet.
   * Wenn die Section-Stage in Phase 5 fuer Abschnitt X arbeitet, holt sie
   * gezielt die Vorbild-Formulierungen mit abschnitt_id === X.
   */
  abschnitt_id: string;
  /** Woertliche Vorbild-Formulierung aus erfolgreichem Antrag, mind. 20 Zeichen. */
  formulierung: string;
  /** Optionaler Kontext, z. B. Ziel-Geber-Typ oder Antragsjahr. */
  kontext?: string;
}

/**
 * Diskriminierte Union fuer die Bewerbungs-Frist-Logik.
 *
 * - rolling: jederzeit einreichbar, keine Stichtage.
 * - fixe_stichtage: harte Termine, mind. einer noetig (ISO YYYY-MM-DD).
 *   `jaehrlich_wiederkehrend?` deckt den haeufigen Fall „immer bis 30.06."
 *   ab — ohne dieses Feld werden Dossiers durch Datums-Verstreichen
 *   kontinuierlich ungueltig.
 */
export type FristLogik =
  | { typ: "rolling" }
  | {
      typ: "fixe_stichtage";
      stichtage: string[];
      jaehrlich_wiederkehrend?: boolean;
    };

export interface Richtlinie {
  /** Dossier-Version. Datum wie "2026-04-20". */
  version: string;
  /** Zur Verifikation: was bei Erstellung als Quelle gelesen wurde. */
  quellen: string[];
  foerderhoehe: Foerderhoehe;
  kostenpositionen: Kostenposition[];
  eigenmittel: Eigenmittel;
  kumulierung: Kumulierung;
  antragsstruktur: Antragsstruktur;
  /** Freitext-Hinweise, die nicht ins Schema passen, aber fuer KI wichtig sind. */
  notizen?: string[];
  /** Liegt formal abgelaufen vor? */
  veraltet?: boolean;
  /**
   * 86cabdzwk: Per-Programm-Label fuer das erzeugte Dokument. Default "Antrag" —
   * bei Programmen, deren Deliverable kein Antrag ist (DigitalPakt: die Schule
   * erstellt ein "Medienkonzept", den Antrag stellt der Schultraeger), steuert
   * das Feld die UI-Beschriftung (Generierung, Paywall, Ergebnis, Checkout).
   */
  dokumentLabel?: string;
  /** Grammatikalisches Geschlecht des dokumentLabel (Default: "der" fuer Antrag, sonst "das"). */
  dokumentLabelGenus?: "der" | "die" | "das";
  /**
   * Best Practices erfolgreicher Antraege fuer dieses Programm.
   * Optional, weil Phase 4 die 11 Legacy-Dossiers nicht type-blocking migrieren muss (D-06).
   * Strict-Validator (lib/wizard/richtlinien-validator.ts) erzwingt das Feld fuer neu extrahierte Dossiers.
   */
  bestPractices?: BestPractice[];
  /** Typische Reject-Gruende. Optional (D-06). */
  rejectGruende?: RejectGrund[];
  /** Programm-spezifische Vorbild-Formulierungen, FK auf antragsstruktur.abschnitte[].id. Optional (D-06). */
  vorbildFormulierungen?: VorbildFormulierung[];
  /** Discriminated Union: rolling | fixe_stichtage. Optional (D-06). */
  fristLogik?: FristLogik;
}
