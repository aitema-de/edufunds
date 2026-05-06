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
}
