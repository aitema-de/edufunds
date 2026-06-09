/**
 * Testbare Pure-Function-Library fuer das Pipeline-Eval-Skript.
 *
 * Diese Datei enthaelt alle Score-Funktionen, Typen, Konstanten und
 * Rubric-Definitionen als exportierbare Pure Functions — KEINE IO, KEINE Seiteneffekte.
 * Das ermoeglicht Unit-Tests ohne LLM-Calls oder Dateisystem-Zugriff.
 *
 * Struktur (Phase-5-RESEARCH §Pattern 1-3 + Code-Examples Z.820-1083):
 *   1. Types (PipelineKorpusEntry, PipelineSnapshot, EntryResult, AggregateMetrics, ...)
 *   2. Konstanten (SNAPSHOT_SCHEMA_VERSION, LOG_PREFIX, HALLU_REGEX_PATTERNS)
 *   3. Judge-Rubrics (5 Geber-Gruppen: RUBRIC_OEFFENTLICH, _STIFTUNG, _EU, _WIRTSCHAFTSPREIS, _VERBAND_UNI)
 *   4. JUDGE_SYSTEM-Prompt + buildJudgeUserPrompt
 *   5. Score-Funktionen: scoreWiz01, scoreWiz02, scoreWiz03, scoreFinanzplan
 *   6. Aggregation: aggregateNRuns, passesThreshold
 *   7. Helper: normalizeAbschnittName, extractContext
 *
 * Imports: ALLE anderen Importe laufen ueber scripts/eval-pipeline.ts — diese
 * Datei haengt NUR von lib/wizard/types.ts, lib/wizard/richtlinien-schema.ts,
 * lib/wizard/finanzplan-validator.ts und lib/wizard/llm.ts ab.
 */

import type { GenerationArtefacts, Finanzplan, WizardFacts } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { GeberGruppe } from "@/lib/wizard/geber-classification";
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import { generateJson } from "@/lib/wizard/llm";
import { MODEL_FLASH, MODEL_PRO } from "@/lib/wizard/llm";

// ============================================================================
// Konstanten
// ============================================================================

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const LOG_PREFIX = "[eval-pipeline]";

// ============================================================================
// Types (RESEARCH §Pattern 1, Z.330-403)
// ============================================================================

export interface PipelineKorpusEntry {
  // === Identifier ===
  id: string;
  category: "vag" | "mittel" | "hochwertig";
  edgeCase?:
    | "vag-extrem"
    | "profil-fehlt"
    | "programm-mismatch"
    | "widerspruechlich"
    | "bl-konflikt"
    | "antworten-zu-lang"
    | "antrag-spruenge";

  // === Pipeline-Inputs (D-06) ===
  programmId: string;
  schulProfil: {
    name?: string;
    typ?: string;
    bundesland?: string;
    schuelerzahl?: number;
    besonderheiten?: string;
  };
  userAnswers: Array<{
    role: "ai" | "user";
    kind: "question" | "answer";
    content: string;
  }>;
  facts: WizardFacts;

  // === WIZ-02 Erwartungen (D-09 Layer 1) ===
  expected_forbidden_markers: Array<{
    marker: string;
    description: string;
  }>;

  // === WIZ-03 Erwartungen (D-28 Geber-Cluster) ===
  expected_geber_gruppe: GeberGruppe;

  // === Kuratoren-Notiz ===
  notes?: string;
}

export interface PipelineSnapshot {
  korpus_id: string;
  input: {
    programm: Foerderprogramm;
    facts: WizardFacts;
    richtlinie: Richtlinie | null;
    messages: Array<{ role: "ai" | "user"; kind: "question" | "answer" | "note"; content: string; id: string; at: string }>;
  };
  result: {
    artefacts: GenerationArtefacts;
    usages: Array<{ model: string; usage: { promptTokens: number; candidatesTokens: number } }>;
  };
  meta: {
    iso: string;
    runIndex: 1 | 2 | 3;
    pipelineCommitSha: string;
    featureFlags: Record<string, string>;
    latencyMs: number;
    schemaVersion: number;
  };
}

export interface Wiz01Result {
  pflichtAbschnitteTotal: number;
  pflichtAbschnitteCovered: number;
  coveragePercent: number;
  maxZeichenOK: boolean | null;
  maxZeichenViolations: Array<{
    abschnittName: string;
    maxZeichen: number;
    actualZeichen: number;
  }>;
  missingAbschnitte: string[];
}

export interface MarkerHit {
  marker: string;
  snippet: string;
  foundIn: "section" | "finalText" | "finanzplan-bezeichnung" | "finanzplan-begruendung";
}

export interface RegexHit {
  pattern: string;
  match: string;
  falsePositiveCheck: "user-stated" | "facts-stated" | "neither";
  snippet: string;
  foundIn: "section" | "finalText" | "finanzplan-begruendung";
}

export interface Wiz02Result {
  layer1MarkerHits: number;
  layer1MarkerExpected: number;
  layer2RegexHits: number;
  layer1MarkerHitsDetail: Array<MarkerHit>;
  layer2RegexHitsDetail: Array<RegexHit>;
  score: number;
}

export interface JudgeKriterium {
  id: string;
  score: number;
  beleg: string;
  verbesserung: string;
}

export interface JudgeResponse {
  kriterien: JudgeKriterium[];
  gesamt: number;
  summary: string;
}

export interface Wiz03Result {
  judgeResponse: JudgeResponse | null;
  score: number;
  gruppe: GeberGruppe | "unknown";
  error?: string;
}

export interface FinanzplanSubResult {
  vorAutofix: {
    okFuerFreigabe: boolean;
    errorCount: number;
    warningCount: number;
    gesamtEur: number;
  };
  hallu_marker_in_finanzplan: number;
  score: number;
}

export interface ScoreStat {
  mean: number;
  stddev: number;
  runs: number[];
}

export interface EntryScores {
  wiz01: Wiz01Result;
  wiz02: Wiz02Result;
  wiz03: Wiz03Result;
  finanzplan: FinanzplanSubResult;
  latencyMs: number;
  error?: string;
}

export interface PerGeberGruppeStats {
  gruppe: GeberGruppe;
  n: number;
  wiz01Mean: number;
  wiz02Mean: number;
  wiz03Mean: number;
}

export interface PerDossierStats {
  programmId: string;
  n: number;
  wiz01Mean: number;
  wiz02Mean: number;
}

export interface AggregateMetrics {
  n: number;
  nErrored: number;
  wiz01: ScoreStat;
  wiz02: ScoreStat;
  wiz03: ScoreStat;
  finanzplan: ScoreStat;
  perGeberGruppe: PerGeberGruppeStats[];
  perDossier: PerDossierStats[];
}

export interface Flags {
  live: boolean;
  snapshot: boolean;
  replay: string | null;
  N: number;
  deep: boolean;
  proJudge: boolean;
  mdSummary: boolean;
  single: string | null;
}

// ============================================================================
// HALLU_REGEX_PATTERNS (RESEARCH Z.454-465)
// ============================================================================

export const HALLU_REGEX_PATTERNS: Record<string, RegExp> = {
  aktenzeichen: /\b(?:Az\.?|G\.?Z\.?|Gz\.?)\s*[:.]?\s*\d{1,5}\s*\/\s*(?:19|20)\d{2}\b/gi,
  tv_l_code: /\bTV[\s-]?L\s*E?\d{1,2}[a-z]?\b/gi,
  datum_praezise: /\b(?:0?[1-9]|[12]\d|3[01])\.(?:0?[1-9]|1[0-2])\.(?:19|20)\d{2}\b/g,
  haushaltsstelle: /\bHaushaltsstelle\s+\d{2,5}\s*\/\s*\d{3,7}\b/gi,
  kmk_zitat: /\bKMK[-\s]Strategie\s+["„]Bildung\s+in\s+der\s+digitalen\s+Welt[""]?/gi,
  rahmenvertrag: /\bRahmenvertrag(?:s|es)?\b/gi,
  mdm_loesung: /\bMDM[-\s]?L(?:oesung|ösung)\b/gi,
};

// ============================================================================
// Judge-Rubrics (RESEARCH Z.513-557)
// ============================================================================

export interface JudgeRubricKriterium {
  id: string;
  name: string;
  beschreibung: string;
  gewichtung: number;
}

export interface JudgeRubric {
  gruppe: GeberGruppe;
  kriterien: JudgeRubricKriterium[];
  gesamtBeschreibung: string;
}

export const RUBRIC_OEFFENTLICH: JudgeRubric = {
  gruppe: "oeffentlich",
  gesamtBeschreibung: `Bundes- und Landes-Foerderungen erwarten sachliche, evidenzbasierte
Antraege mit klaren Wirkungs-Indikatoren, Bezug zu Bildungsstrategien (KMK, Bildungsplan,
DigitalPakt-Kontext) und expliziter Strukturverankerung der Nachhaltigkeit. Pathos-Sprache,
PR-Stil oder erzaehlerische Anfaenge sind Negativ-Signale.`,
  kriterien: [
    {
      id: "messbare-wirkung",
      name: "Messbare Wirkungs-Indikatoren",
      beschreibung:
        "Sind Wirkungs-Aussagen mit quantifizierbaren Indikatoren versehen (Teilnehmende, Stunden, Vorher/Nachher)? Oder bleiben sie generisch ('verbessert Lernerfolg')?",
      gewichtung: 25,
    },
    {
      id: "strategiebezug",
      name: "Bezug zu Bildungsstrategien",
      beschreibung:
        "Adressiert der Antrag explizit nationale/landesweite Bildungsstrategien (KMK, Bildungsplan)? Konkret verankert oder nur abstrakte Erwaehnung?",
      gewichtung: 20,
    },
    {
      id: "transferfaehigkeit",
      name: "Transferfaehigkeit",
      beschreibung:
        "Wird beschrieben, wie das Vorhaben auf andere Schulen uebertragbar ist? Strukturell verankert oder nur 'lessons learned' abstrakt?",
      gewichtung: 15,
    },
    {
      id: "kooperationen",
      name: "Externe Kooperationen",
      beschreibung:
        "Werden konkrete externe Partner (Hochschule, Stiftung, Betrieb) mit Namen + Rolle benannt? Oder abstrakt 'externe Partner'?",
      gewichtung: 15,
    },
    {
      id: "nachhaltigkeit-struktur",
      name: "Strukturelle Nachhaltigkeit",
      beschreibung:
        "Ist die Nachhaltigkeit ueber das Foerderende hinaus strukturell beschrieben (Curriculum-Verankerung, Personal-Plan, Betrieb-Konzept)? Oder hohl ('wird fortgefuehrt')?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung:
        "Sachlich-fachlicher Ton? Oder PR-Glanz / Pathos-Formeln / Floskeln ('passgenau', 'innovativ', 'zukunftsweisend')?",
      gewichtung: 10,
    },
  ],
};

export const RUBRIC_STIFTUNG: JudgeRubric = {
  gruppe: "stiftung",
  gesamtBeschreibung: `Stiftungen foerdern nach Mission-Passung, nicht nach Buerokratie-Konformitaet.
Sie erwarten erzaehlerisch-zugaengliche Antraege mit menschlichem Bezug zur Zielgruppe,
ehrlicher Problemschilderung und konkreter Wirkungserzaehlung. PR-Glanz und
institutionelle Floskeln sind Negativ-Signale — Ehrlichkeit ueber Luecken wird belohnt.`,
  kriterien: [
    {
      id: "mission-passung",
      name: "Mission-Passung",
      beschreibung:
        "Greift der Antrag die spezifische Foerdermission der Stiftung auf? Oder ist es eine generische Projektbeschreibung?",
      gewichtung: 25,
    },
    {
      id: "konkrete-szene",
      name: "Konkrete Szene / Zielgruppen-Naehe",
      beschreibung:
        "Wird die Zielgruppe konkret und lebendig beschrieben (ein konkretes Beispiel, ein Kind, eine Situation)? Oder abstrakt-demografisch?",
      gewichtung: 20,
    },
    {
      id: "zielgruppe-spezifisch",
      name: "Zielgruppen-Spezifitaet",
      beschreibung:
        "Ist klar, WER genau gefördert wird und WARUM diese Gruppe besonders bedarf (Benachteiligung, Risiko, Potenzial)? Oder bleibt es bei allgemeiner 'Schülerinnen und Schüler'?",
      gewichtung: 15,
    },
    {
      id: "wirkung-narrativ",
      name: "Wirkungserzaehlung",
      beschreibung:
        "Wird eine nachvollziehbare Kausalkette beschrieben: Aktivitaet → Zwischenergebnis → Wirkung bei der Zielgruppe? Oder nur Aktivitaetenliste?",
      gewichtung: 15,
    },
    {
      id: "ehrlichkeit",
      name: "Ehrlichkeit / Selbstreflexion",
      beschreibung:
        "Werden Risiken, Luecken oder offene Fragen offen genannt? Oder ist es nur Selbstdarstellung ohne Reflexion?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung:
        "Zugaenglicher, menschlicher Ton ohne PR-Glanz? Oder institutionell-distanziert / Pathos-schwer?",
      gewichtung: 10,
    },
  ],
};

export const RUBRIC_EU: JudgeRubric = {
  gruppe: "eu",
  gesamtBeschreibung: `EU-Foerderungen (Erasmus+, Horizont, etc.) erwarten formell-strukturierte Antraege
mit explizitem europaeischem Mehrwert, Adressierung von EU-Querschnittsthemen (Inklusion,
Digitalisierung, Green), konkreten Partnerschaften mit europaeischen Institutionen und
klaren Evaluations- und Disseminationsplaenen. Deutsche-only-Perspektiven sind Negativ-Signale.`,
  kriterien: [
    {
      id: "europaeischer-mehrwert",
      name: "Europaeischer Mehrwert",
      beschreibung:
        "Wird erklaert, warum das Vorhaben europaeische Foerderung braucht und was der spezifische europaeische Mehrwert ist? Oder haette auch eine nationale Foerderung gereicht?",
      gewichtung: 25,
    },
    {
      id: "querschnittsthemen",
      name: "EU-Querschnittsthemen",
      beschreibung:
        "Werden EU-Prioritaeten explizit adressiert (Inklusion, Digitalisierung, gruenem Wandel, europaeische Werte)? Oder nur tangential?",
      gewichtung: 20,
    },
    {
      id: "partnerschaft-konkret",
      name: "Partnerschaft konkret",
      beschreibung:
        "Werden europaeische Partner mit Organisation, Land, Rolle konkret benannt? Oder abstrakt 'europaeische Partner'?",
      gewichtung: 15,
    },
    {
      id: "evaluation-dissemination",
      name: "Evaluation + Dissemination",
      beschreibung:
        "Gibt es einen konkreten Evaluationsplan (Methodik, Zeitpunkte, Indikatoren) und Disseminationsplan (Zielgruppen, Kanaele, Reichweite)?",
      gewichtung: 15,
    },
    {
      id: "innovation",
      name: "Innovation / Neuigkeit",
      beschreibung:
        "Wird erklaert, was neu oder innovativ am Ansatz ist? Oder ist es ein Standard-Austauschprojekt ohne besondere Neuigkeit?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung:
        "Formell-strukturiert im EU-Sprachduktus? Oder zu informell / narrativ fuer EU-Gutachter-Konventionen?",
      gewichtung: 10,
    },
  ],
};

export const RUBRIC_WIRTSCHAFTSPREIS: JudgeRubric = {
  gruppe: "wirtschaftspreis",
  gesamtBeschreibung: `Wirtschaftspreise und unternehmensnahe Foerderungen erwarten praegnante,
story-driven Antraege die das Vorhaben knapp und ueberzeugend auf den Punkt bringen.
Die Schule als Gesamtorganisation soll sichtbar sein, nicht nur das Projekt. Komplexe
Buerokratie-Sprache und strukturlose Aufzaehlungen sind Negativ-Signale.`,
  kriterien: [
    {
      id: "story-driven",
      name: "Story-Driven Praesentation",
      beschreibung:
        "Hat der Antrag einen klaren Erzaehlbogen (Ausgangslage → Problem → Loesung → Wirkung)? Oder ist es eine Postenaufzaehlung ohne roten Faden?",
      gewichtung: 25,
    },
    {
      id: "vorhaben-praegnant",
      name: "Vorhaben praegnant auf den Punkt",
      beschreibung:
        "Ist das Kernvorhaben in 1-2 Saetzen klar benennbar? Oder braucht es mehrere Abschnitte um zu verstehen, was genau gemacht wird?",
      gewichtung: 20,
    },
    {
      id: "wirkung-konkret",
      name: "Wirkung konkret",
      beschreibung:
        "Sind die Wirkungen konkret und nachpruefbar (Zahlen, Zeitraum, Zielgruppe)? Oder generisch-vage?",
      gewichtung: 15,
    },
    {
      id: "glaubwuerdigkeit",
      name: "Glaubwuerdigkeit",
      beschreibung:
        "Wirkt die Schule als zuverlaessige Umsetzerin? Werden Erfahrungen und Ressourcen genannt, die Vertrauen wecken?",
      gewichtung: 15,
    },
    {
      id: "preis-eignung",
      name: "Preis-Eignung",
      beschreibung:
        "Ist erklaerbar, warum dieses Projekt preiswuerdig ist (Vorbildcharakter, Innovation, Uebertragbarkeit)?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung:
        "Knapp, engagiert, zugaenglich — angemessen fuer Jurys aus Wirtschaft/Zivilgesellschaft? Oder zu buerokratisch / akademisch?",
      gewichtung: 10,
    },
  ],
};

export const RUBRIC_VERBAND_UNI: JudgeRubric = {
  gruppe: "verband-uni",
  gesamtBeschreibung: `Verbands- und Hochschul-Foerderungen erwarten sachlich-evidenzbasierte Antraege
mit expliziter Methodenbeschreibung, Fachterminologie des Bereichs und Bezug zu
bestehender Forschung/Praxis. Wirkungsaussagen sollten durch Indikatoren oder
Fachquellen belegt sein. Pathos oder allgemeine Schulbegeisterungs-Sprache sind
Negativ-Signale.`,
  kriterien: [
    {
      id: "fachlich-belegt",
      name: "Fachliche Begruendung",
      beschreibung:
        "Werden Bedarf und Ansatz fachlich begruendet (Verweis auf Forschungsstand, Fachliteratur, Statistik)? Oder nur auf Intuition/Beobachtung?",
      gewichtung: 25,
    },
    {
      id: "methodik-explizit",
      name: "Methodik explizit",
      beschreibung:
        "Ist die didaktische / organisationale Methodik klar beschrieben (Modell, Vorgehensweise, Phasen)? Oder bleibt es bei 'wir machen Workshops'?",
      gewichtung: 20,
    },
    {
      id: "zielgruppe-spezifisch",
      name: "Zielgruppen-Spezifitaet",
      beschreibung:
        "Wird differenziert beschrieben, WER genau die Zielgruppe ist und welche spezifischen Beduerfnisse sie hat?",
      gewichtung: 15,
    },
    {
      id: "wirkung-evidenz",
      name: "Wirkung evidenzbasiert",
      beschreibung:
        "Werden Wirkungsaussagen durch messbare Indikatoren, Evaluationsdesign oder Verweis auf analoge Studien begruendet?",
      gewichtung: 15,
    },
    {
      id: "kooperationen",
      name: "Fachliche Kooperationen",
      beschreibung:
        "Werden Partner aus Wissenschaft, Fachinstitutionen oder Fachverbänden konkret benannt? Oder abstrakt?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung:
        "Sachlich-evidenzbasiert mit akzeptabler Fachterminologie? Oder zu emotional / zu allgemein fuer Verbands-/Hochschulgutachter?",
      gewichtung: 10,
    },
  ],
};

/** Alle Rubrics nach Geber-Gruppe indiziert */
export const RUBRICS: Record<GeberGruppe, JudgeRubric> = {
  oeffentlich: RUBRIC_OEFFENTLICH,
  stiftung: RUBRIC_STIFTUNG,
  eu: RUBRIC_EU,
  wirtschaftspreis: RUBRIC_WIRTSCHAFTSPREIS,
  "verband-uni": RUBRIC_VERBAND_UNI,
};

// ============================================================================
// Judge-Prompt (RESEARCH Z.573-611)
// ============================================================================

export const JUDGE_SYSTEM = `Du bist ein erfahrener Foerdermittel-Gutachter. Deine einzige Aufgabe:
einen vorgelegten Foerderantrag gegen eine spezifische Rubric zu bewerten, die auf den
Geber-Typ zugeschnitten ist. Du urteilst pro Kriterium 0-100, vergibst danach einen
Gesamt-Score (gewichteter Mittelwert) und nennst pro Kriterium 1 konkreten Beleg
(Zitat aus dem Antrag) plus 1 Verbesserungs-Hinweis.

## Anti-Halluzinations-Regel
Du bewertest NUR was im vorgelegten Antrag steht. Du erfindest keine Bewertungs-
Grundlagen. Wenn ein Kriterium im Antrag nicht adressierbar ist, score < 40 und
"nicht erwaehnt" als Beleg.

## Ausgabe
AUSSCHLIESSLICH valides JSON, kein Markdown-Fence:
{
  "kriterien": [
    {
      "id": "kriterium-id",
      "score": 0..100,
      "beleg": "max 120 Zeichen Zitat oder 'nicht erwaehnt'",
      "verbesserung": "1 Satz, was die Revision tun sollte"
    }
  ],
  "gesamt": 0..100,
  "summary": "1-2 Saetze Gesamteindruck"
}`;

export function buildJudgeUserPrompt(antragText: string, rubric: JudgeRubric): string {
  return `RUBRIC (Geber-Gruppe: ${rubric.gruppe}):
${rubric.gesamtBeschreibung}

KRITERIEN:
${rubric.kriterien
  .map(
    (k) => `[${k.id}] ${k.name} (Gewichtung ${k.gewichtung}%)
  ${k.beschreibung}`
  )
  .join("\n\n")}

ANTRAG (zu bewerten):
${antragText}

Bewerte den Antrag streng gegen die Rubric. JSON-Output gemaess Schema im System-Prompt.`;
}

// ============================================================================
// Helper-Funktionen
// ============================================================================

/**
 * Normalisiert einen Abschnittsnamen fuer case-insensitiven Vergleich.
 * Pitfall 6: Pipeline liefert Sektionsnamen die variieren koennen.
 */
export function normalizeAbschnittName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Extrahiert einen Kontext-Snippet um einen Fund-Match herum.
 * Gibt maximal `contextLen` Zeichen beidseitig um den Fund zurueck.
 */
export function extractContext(haystack: string, match: string, contextLen: number): string {
  const idx = haystack.toLowerCase().indexOf(match.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - contextLen);
  const end = Math.min(haystack.length, idx + match.length + contextLen);
  return haystack.slice(start, end);
}

/**
 * Erkennt in welcher Quelle ein Marker-Treffer vorliegt.
 */
function detectMarkerSource(
  haystack: string,
  marker: string,
  artefacts: GenerationArtefacts
): MarkerHit["foundIn"] {
  const lowerMarker = marker.toLowerCase();
  // Finanzplan-Quellen
  for (const p of artefacts.finanzplan?.posten ?? []) {
    if (p.bezeichnung?.toLowerCase().includes(lowerMarker)) return "finanzplan-bezeichnung";
    if (p.begruendung?.toLowerCase().includes(lowerMarker)) return "finanzplan-begruendung";
  }
  // Sections
  for (const s of artefacts.sections ?? []) {
    if (s.text.toLowerCase().includes(lowerMarker)) return "section";
  }
  // finalText
  if ((artefacts.finalText ?? "").toLowerCase().includes(lowerMarker)) return "finalText";
  return "finalText";
}

/**
 * Erkennt in welcher Quelle ein Regex-Treffer vorliegt.
 */
function detectRegexSource(
  matchStr: string,
  artefacts: GenerationArtefacts
): RegexHit["foundIn"] {
  const lower = matchStr.toLowerCase();
  for (const p of artefacts.finanzplan?.posten ?? []) {
    if (p.begruendung?.toLowerCase().includes(lower)) return "finanzplan-begruendung";
  }
  for (const s of artefacts.sections ?? []) {
    if (s.text.toLowerCase().includes(lower)) return "section";
  }
  return "finalText";
}

// ============================================================================
// Score-Funktionen
// ============================================================================

/**
 * WIZ-01: FK-Match auf antragsstruktur.abschnitte[].name + optionaler maxZeichen-Check.
 * RESEARCH Code-Beispiel Z.846-906 (1-zu-1).
 */
export function scoreWiz01(
  artefacts: GenerationArtefacts,
  richtlinie: Richtlinie | null
): Wiz01Result {
  if (!richtlinie?.antragsstruktur?.abschnitte) {
    return {
      pflichtAbschnitteTotal: 0,
      pflichtAbschnitteCovered: 0,
      coveragePercent: 100,
      maxZeichenOK: null,
      maxZeichenViolations: [],
      missingAbschnitte: [],
    };
  }

  const pflichtAbschnitte = richtlinie.antragsstruktur.abschnitte.filter(
    (a) => a.pflicht !== false
  );
  const sectionNames = new Set(
    (artefacts.sections ?? []).map((s) => normalizeAbschnittName(s.name))
  );

  const covered = pflichtAbschnitte.filter((a) =>
    sectionNames.has(normalizeAbschnittName(a.name))
  );

  const missing = pflichtAbschnitte
    .filter((a) => !sectionNames.has(normalizeAbschnittName(a.name)))
    .map((a) => a.name);

  // maxZeichen-Check: nur wenn Dossier es setzt
  const maxZeichenAbschnitte = pflichtAbschnitte.filter(
    (a) => typeof a.maxZeichen === "number" && a.maxZeichen > 0
  );
  const violations: Wiz01Result["maxZeichenViolations"] = [];
  if (maxZeichenAbschnitte.length > 0) {
    for (const ab of maxZeichenAbschnitte) {
      const section = (artefacts.sections ?? []).find(
        (s) => normalizeAbschnittName(s.name) === normalizeAbschnittName(ab.name)
      );
      if (section && ab.maxZeichen !== undefined && section.text.length > ab.maxZeichen) {
        violations.push({
          abschnittName: ab.name,
          maxZeichen: ab.maxZeichen,
          actualZeichen: section.text.length,
        });
      }
    }
  }

  return {
    pflichtAbschnitteTotal: pflichtAbschnitte.length,
    pflichtAbschnitteCovered: covered.length,
    coveragePercent:
      pflichtAbschnitte.length === 0
        ? 100
        : (covered.length / pflichtAbschnitte.length) * 100,
    maxZeichenOK: maxZeichenAbschnitte.length === 0 ? null : violations.length === 0,
    maxZeichenViolations: violations,
    missingAbschnitte: missing,
  };
}

/**
 * WIZ-02: 2-Layer-Hybrid-Detection (Marker + Regex mit False-Positive-Check).
 * RESEARCH Code-Beispiel Z.923-988 (1-zu-1).
 */
export function scoreWiz02(
  artefacts: GenerationArtefacts,
  expectedForbidden: PipelineKorpusEntry["expected_forbidden_markers"],
  userAnswers: string[],
  facts: WizardFacts
): Wiz02Result {
  // Haystack: finalText + sections[].text + finanzplan-Bezeichnung + -Begruendung
  // Pitfall 1+2: BEIDE Quellen scannen
  const haystackParts = [
    artefacts.finalText ?? "",
    ...(artefacts.sections ?? []).map((s) => `[${s.name}] ${s.text}`),
    ...(artefacts.finanzplan?.posten.map(
      (p) => `${p.bezeichnung} | ${p.begruendung ?? ""}`
    ) ?? []),
  ];
  const haystack = haystackParts.join("\n\n");
  const userSrc = userAnswers.join("\n").toLowerCase();
  const factsSrc = JSON.stringify(facts).toLowerCase();

  // === Layer 1: Marker-Hits ===
  const layer1Hits: Array<MarkerHit> = [];
  for (const m of expectedForbidden) {
    if (haystack.toLowerCase().includes(m.marker.toLowerCase())) {
      layer1Hits.push({
        marker: m.marker,
        snippet: extractContext(haystack, m.marker, 60),
        foundIn: detectMarkerSource(m.marker, m.marker, artefacts),
      });
    }
  }

  // === Layer 2: Regex mit User-Cross-Check ===
  const layer2Hits: Array<RegexHit> = [];
  for (const [name, pattern] of Object.entries(HALLU_REGEX_PATTERNS)) {
    // RegExp-Global-Flag benoetigt Reset fuer erneute Ausfuehrung
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    const matches = Array.from(haystack.matchAll(freshPattern));
    for (const m of matches) {
      const matchStr = m[0];
      const inUser = userSrc.includes(matchStr.toLowerCase());
      const inFacts = factsSrc.includes(matchStr.toLowerCase());
      layer2Hits.push({
        pattern: name,
        match: matchStr,
        falsePositiveCheck: inUser ? "user-stated" : inFacts ? "facts-stated" : "neither",
        snippet: extractContext(haystack, matchStr, 60),
        foundIn: detectRegexSource(matchStr, artefacts),
      });
    }
  }

  // Score: % Marker NICHT gefunden + Penalty pro echter Regex-Halluzination
  const layer1Avoided = expectedForbidden.length - layer1Hits.length;
  const layer1Score =
    expectedForbidden.length === 0
      ? 100
      : (layer1Avoided / expectedForbidden.length) * 100;
  const layer2EchteHallus = layer2Hits.filter(
    (h) => h.falsePositiveCheck === "neither"
  ).length;
  // Score-Penalty: 10 Punkte pro echter Layer-2-Halluzination (max -100)
  const layer2Penalty = Math.min(layer2EchteHallus * 10, 100);
  const score = Math.max(0, layer1Score - layer2Penalty);

  return {
    layer1MarkerHits: layer1Hits.length,
    layer1MarkerExpected: expectedForbidden.length,
    layer1MarkerHitsDetail: layer1Hits,
    layer2RegexHits: layer2EchteHallus,
    layer2RegexHitsDetail: layer2Hits,
    score,
  };
}

/**
 * WIZ-03: LLM-as-Judge mit Rubric pro Geber-Cluster.
 * RESEARCH Pattern 3, D-10, D-15 (temperature: 0, response_format json_object).
 */
export async function scoreWiz03(
  finalText: string,
  gruppe: GeberGruppe | "unknown",
  judgeModel: string
): Promise<Wiz03Result> {
  if (!finalText || finalText.trim().length === 0) {
    return { judgeResponse: null, score: 0, gruppe, error: "leerer finalText" };
  }
  if (gruppe === "unknown") {
    return {
      judgeResponse: null,
      score: 0,
      gruppe,
      error: "Geber-Gruppe unbekannt — WIZ-03 uebersprungen",
    };
  }

  const rubric = RUBRICS[gruppe];

  try {
    const result = await generateJson<JudgeResponse>(
      judgeModel,
      JUDGE_SYSTEM,
      buildJudgeUserPrompt(finalText, rubric),
      { maxTokens: 2000 }
    );
    const response = result.value;

    // Gewichteten Gesamt-Score aus Kriterien berechnen (falls Judge-Score abweicht)
    let weightedScore = 0;
    let totalGewichtung = 0;
    if (Array.isArray(response.kriterien) && response.kriterien.length > 0) {
      for (const k of response.kriterien) {
        const rubricKriterium = rubric.kriterien.find((rk) => rk.id === k.id);
        const gewichtung = rubricKriterium?.gewichtung ?? 0;
        weightedScore += (k.score ?? 0) * gewichtung;
        totalGewichtung += gewichtung;
      }
      weightedScore = totalGewichtung > 0 ? weightedScore / totalGewichtung : response.gesamt;
    } else {
      weightedScore = response.gesamt ?? 0;
    }

    return {
      judgeResponse: response,
      score: Math.round(weightedScore),
      gruppe,
    };
  } catch (err) {
    return {
      judgeResponse: null,
      score: 0,
      gruppe,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Finanzplan-Sub-Metrik: validateFinanzplan() + Hallu-Marker-Penalty.
 * RESEARCH Code-Beispiel Z.1015-1042 (1-zu-1).
 */
export function scoreFinanzplan(
  finanzplan: Finanzplan | undefined,
  richtlinie: Richtlinie | null,
  hallu_marker_in_finanzplan: number
): FinanzplanSubResult {
  if (!finanzplan) {
    return {
      vorAutofix: { okFuerFreigabe: false, errorCount: 0, warningCount: 0, gesamtEur: 0 },
      hallu_marker_in_finanzplan,
      score: 0,
    };
  }
  const v = validateFinanzplan(finanzplan, richtlinie);
  const errors = v.warnungen.filter((w) => w.level === "error").length;
  const warnings = v.warnungen.filter((w) => w.level === "warning").length;
  // Penalty: -20 pro Error, -5 pro Hallu-Marker im Finanzplan-Bereich
  const score = Math.max(0, 100 - errors * 20 - hallu_marker_in_finanzplan * 5);
  return {
    vorAutofix: {
      okFuerFreigabe: v.okFuerFreigabe,
      errorCount: errors,
      warningCount: warnings,
      gesamtEur: v.gesamtEur,
    },
    hallu_marker_in_finanzplan,
    score,
  };
}

// ============================================================================
// Aggregations-Funktionen (RESEARCH Z.1055-1083)
// ============================================================================

/**
 * Berechnet Mean + Population-Stddev (NICHT Sample N-1) ueber N Runs.
 * Konsistent mit Phase-1-Pattern + BASELINE.md-Methodik (RESEARCH Z.724).
 */
export function aggregateNRuns(runs: number[]): ScoreStat {
  if (runs.length === 0) return { mean: 0, stddev: 0, runs: [] };
  const mean = runs.reduce((s, x) => s + x, 0) / runs.length;
  const variance = runs.reduce((s, x) => s + (x - mean) ** 2, 0) / runs.length;
  const stddev = Math.sqrt(variance);
  return { mean, stddev, runs };
}

/**
 * 2σ-Threshold-Gate mit achsen-spezifischem Block-Status (D-25):
 * - WIZ-01: hart — block bei drop > 2σ
 * - WIZ-02: mittel — block bei drop > 2σ + 10 % baseline.mean
 * - WIZ-03: warning-only — immer pass
 */
export function passesThreshold(
  current: ScoreStat,
  baseline: ScoreStat,
  axis: "WIZ-01" | "WIZ-02" | "WIZ-03"
): { passed: boolean; reason: string } {
  const twoSigma = baseline.stddev * 2;
  const drop = baseline.mean - current.mean;
  switch (axis) {
    case "WIZ-01":
      return {
        passed: drop <= twoSigma,
        reason: `drop=${drop.toFixed(2)}, 2σ=${twoSigma.toFixed(2)}`,
      };
    case "WIZ-02":
      // mittel: block bei > 10 % Regression UEBER baseline-2σ
      return {
        passed: drop <= twoSigma + baseline.mean * 0.1,
        reason: `drop=${drop.toFixed(2)}, threshold=${(twoSigma + baseline.mean * 0.1).toFixed(2)}`,
      };
    case "WIZ-03":
      // warning-only: immer pass, drop nur loggen
      return {
        passed: true,
        reason: `drop=${drop.toFixed(2)} (warning-only)`,
      };
  }
}
