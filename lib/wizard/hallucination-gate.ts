import type { WizardFacts } from "./types";
import type { Usage } from "./pricing";
import { HALLUCINATION_GATE_SYSTEM, buildHallucinationGatePrompt } from "./prompts";

/**
 * Halluzinations-Diff-Gate (Probe 09.06., Hebel 1)
 * --------------------------------------------------
 * Die Revisions-Stufe ist die staerkste Komponente der Pipeline, fuehrt aber
 * gelegentlich NEUE Erfindungen ein ("alte gegen neue Erfindung", Fall 5 der
 * Probe verschlimmerte sich durch die Revision). Dieses Gate vergleicht die
 * revidierte Fassung deterministisch gegen die ERLAUBTEN QUELLEN (Entwurf +
 * extrahierte Facts + Roh-Antworten des Nutzers): konkrete Zahlen und Eigennamen,
 * die NUR in der Revision auftauchen und in keiner Quelle stehen, sind mit hoher
 * Wahrscheinlichkeit halluziniert.
 *
 * Gefundene Treffer werden per gezieltem Repair-Call entschaerft. Uebernommen
 * wird der Repair NUR, wenn eine erneute deterministische Detektion echte
 * Verbesserung zeigt (strikt weniger Treffer, keine massive Kuerzung) — das Gate
 * kann die Halluzination also niemals verschlimmern.
 *
 * Detektion ist rein deterministisch (kein LLM) und damit unit-testbar; der
 * LLM-Repair wird wie bei consistency-revision injiziert.
 */

export interface IntroducedEntities {
  /** Neu eingefuehrte, nicht gedeckte Zahlen (Originaltext der Fundstelle). */
  numbers: string[];
  /** Neu eingefuehrte, nicht gedeckte Eigennamen/Partner/Personen. */
  entities: string[];
}

// ---------------------------------------------------------------------------
// Erlaubter Korpus
// ---------------------------------------------------------------------------

/** Sammelt rekursiv alle String-/Number-Blattwerte aus den Facts. */
function collectLeafValues(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectLeafValues(v, out);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) collectLeafValues(v, out);
  }
}

/**
 * Baut den erlaubten Quellen-Korpus: Entwurf (vor der Revision) + alle
 * Facts-Blattwerte + Roh-Antworten des Nutzers. Gegen DIESEN Korpus wird die
 * revidierte Fassung gediffed — alles, was hier vorkommt, gilt als gedeckt.
 */
export function buildAllowedCorpus(
  draft: string,
  facts: WizardFacts,
  userAnswers?: string[]
): string {
  const parts: string[] = [draft ?? ""];
  const leaves: string[] = [];
  collectLeafValues(facts, leaves);
  parts.push(leaves.join(" \n"));
  if (userAnswers?.length) parts.push(userAnswers.join(" \n"));
  return parts.join(" \n");
}

// ---------------------------------------------------------------------------
// Zahlen-Detektion
// ---------------------------------------------------------------------------

// Zahl mit optionalem Waehrungs-Praefix, deutschen Tausender-Trennern (Punkt
// oder Leerzeichen), optionalen Nachkommastellen und optionalem Einheiten-Suffix.
const NUM_RE =
  /(?:(€|eur|euro)\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d+))?\s*(€|eur\b|euro|%|prozent)?/gi;

// Bare Zahlen unterhalb dieser Schwelle ignorieren (Ordnungszahlen, "3 Ziele",
// "2 Wochen") — sie sind sehr false-positive-anfaellig. Geld-/Prozentangaben und
// groessere Zahlen werden unabhaengig davon geprueft.
const MIN_BARE_NUMBER = 13;

interface NumberHit {
  /** Originaltext der Fundstelle (fuer Anzeige + Repair-Prompt). */
  raw: string;
  /** Kanonische Form (Tausender-Trenner entfernt) — fuer Korpus-Vergleich. */
  canonical: string;
  value: number;
  isMoney: boolean;
  isPercent: boolean;
}

function scanNumbers(text: string): NumberHit[] {
  const hits: NumberHit[] = [];
  NUM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_RE.exec(text)) !== null) {
    const prefix = m[1];
    const intPart = m[2];
    const decimals = m[3];
    const suffix = m[4];
    if (!intPart) continue;
    const digits = intPart.replace(/[.\s]/g, "");
    if (!digits) continue;
    const canonical = decimals ? `${digits},${decimals}` : digits;
    const value = parseInt(digits, 10);
    const isMoney =
      /^(€|eur|euro)$/i.test(prefix ?? "") || /^(€|eur|euro)$/i.test(suffix ?? "");
    const isPercent = /^(%|prozent)$/i.test(suffix ?? "");
    hits.push({ raw: m[0].trim(), canonical, value, isMoney, isPercent });
  }
  return hits;
}

/** Kanonische Zahlenformen des Korpus — alles hierin gilt als gedeckt. */
function corpusNumberSet(corpus: string): Set<string> {
  const set = new Set<string>();
  for (const h of scanNumbers(corpus)) set.add(h.canonical);
  return set;
}

// ---------------------------------------------------------------------------
// Eigennamen-Detektion (hochpraezise Muster — deutsche Grossschreibung allein
// taugt nicht zur Eigennamen-Erkennung, daher nur sehr aussagekraeftige Marker)
// ---------------------------------------------------------------------------

// Name + Rechtsform-Suffix: "Bildungsbande e.V.", "MedienMacher gGmbH".
const LEGAL_RE =
  /([A-ZÄÖÜ][\wÄÖÜäöüß&.\-]*(?:[ -][A-ZÄÖÜ0-9][\wÄÖÜäöüß&.\-]*){0,4})\s+(e\.?\s?V\.?|gGmbH|gUG|gemeinnützige\s+GmbH|GbR|e\.\s?G\.)/g;

// Person mit Anrede/Titel: "Frau Dr. Müller", "Herr Schmidt".
const PERSON_RE =
  /\b(?:Frau|Herr)\s+(?:(?:Dr\.|Prof\.)\s+)*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g;

// Binnenmajuskel-Marken: "deinSchulhof", "KinderZukunft", "MedienKompetenz".
// Solche Schreibungen sind in normalem Deutsch extrem selten und ein starkes
// Marken-/Eigennamen-Signal.
const CAMEL_RE = /\b([A-Za-zÄÖÜäöü]+[a-zäöüß][A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+)\b/g;

// Rechtsformen / generische Tokens, die der CamelCase-Scanner faelschlich faengt.
const CAMEL_STOPLIST = new Set(["GmbH", "gGmbH", "gUG", "GbR"]);

function normalizeForLookup(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// Fuehrende Artikel/Determinative, die das Rechtsform-Muster mitfaengt ("Die
// Bildungsbande e.V.") — fuer den Korpus-Vergleich abstreifen, damit derselbe
// Name trotz anderem Artikel ("der Bildungsbande") als gedeckt erkannt wird.
const LEADING_STOP = new Set([
  "der", "die", "das", "den", "dem", "des",
  "ein", "eine", "einer", "einem", "einen", "eines",
  "unser", "unsere", "unserer", "unserem", "unseren",
]);

function stripLeadingStop(name: string): string {
  const toks = name.split(/\s+/);
  while (toks.length > 1 && LEADING_STOP.has(toks[0].toLowerCase())) toks.shift();
  return toks.join(" ");
}

interface EntityHit {
  /** Vollstaendige Fundstelle (fuer Anzeige + Repair). */
  raw: string;
  /** Distinktiver Kern fuer den Korpus-Vergleich (ohne Rechtsform/Anrede). */
  needle: string;
}

function scanEntities(text: string): EntityHit[] {
  const hits: EntityHit[] = [];

  for (const re of [LEGAL_RE, PERSON_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0].trim();
      const needle = stripLeadingStop((m[1] ?? m[0]).trim());
      if (needle.length >= 3) hits.push({ raw, needle });
    }
  }

  CAMEL_RE.lastIndex = 0;
  let cm: RegExpExecArray | null;
  while ((cm = CAMEL_RE.exec(text)) !== null) {
    const tok = cm[1];
    if (CAMEL_STOPLIST.has(tok)) continue;
    hits.push({ raw: tok, needle: tok });
  }

  return hits;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

const MAX_LIST = 20;

/**
 * Findet Zahlen und Eigennamen, die in `text` vorkommen, aber NICHT im erlaubten
 * Korpus gedeckt sind. Rein deterministisch (kein LLM).
 */
export function detectIntroduced(text: string, corpus: string): IntroducedEntities {
  const allowedNumbers = corpusNumberSet(corpus);
  const corpusLower = normalizeForLookup(corpus);

  const numbers: string[] = [];
  const seenNum = new Set<string>();
  for (const h of scanNumbers(text)) {
    if (allowedNumbers.has(h.canonical)) continue;
    const relevant = h.isMoney || h.isPercent || h.value >= MIN_BARE_NUMBER;
    if (!relevant) continue;
    const key = `${h.canonical}|${h.isMoney ? "€" : h.isPercent ? "%" : ""}`;
    if (seenNum.has(key)) continue;
    seenNum.add(key);
    numbers.push(h.raw);
  }

  const entities: string[] = [];
  const seenEnt = new Set<string>();
  for (const h of scanEntities(text)) {
    const needle = normalizeForLookup(h.needle);
    if (!needle || corpusLower.includes(needle)) continue;
    if (seenEnt.has(needle)) continue;
    seenEnt.add(needle);
    entities.push(h.raw);
  }

  return {
    numbers: numbers.slice(0, MAX_LIST),
    entities: entities.slice(0, MAX_LIST),
  };
}

// ---------------------------------------------------------------------------
// Repair (LLM injiziert)
// ---------------------------------------------------------------------------

export interface HallucinationGateDeps {
  /** Textgenerierung fuer den chirurgischen Repair. */
  revise: (system: string, user: string) => Promise<{ value: string; usage: Usage }>;
  /** Modell-Label fuer die Usage-Buchhaltung. */
  model: string;
}

export interface HallucinationGateResult {
  /** Bereinigter (oder unveraenderter) Antragstext. */
  finalText: string;
  /** Nach dem (uebernommenen) Repair noch verbliebene, ungedeckte Treffer. */
  residual: string[];
  /** true, wenn der Repair tatsaechlich uebernommen wurde. */
  repaired: boolean;
  /** LLM-Usages fuer die Kosten-Ledger. */
  usages: Array<{ model: string; usage: Usage }>;
}

// Ein uebernommener Repair darf den Text nicht massiv kuerzen (Anti-Truncation).
const MIN_LENGTH_RATIO = 0.6;

/**
 * Entschaerft die erkannten, nicht gedeckten Angaben per LLM und uebernimmt das
 * Ergebnis nur bei deterministisch nachgewiesener Verbesserung. Bei leerer
 * Trefferliste No-op (kein LLM-Call).
 */
export async function repairIntroduced(
  revisedText: string,
  introduced: IntroducedEntities,
  corpus: string,
  deps: HallucinationGateDeps
): Promise<HallucinationGateResult> {
  const beforeCount = introduced.numbers.length + introduced.entities.length;
  if (beforeCount === 0) {
    return { finalText: revisedText, residual: [], repaired: false, usages: [] };
  }

  const rev = await deps.revise(
    HALLUCINATION_GATE_SYSTEM,
    buildHallucinationGatePrompt(revisedText, introduced)
  );
  const usages = [{ model: deps.model, usage: rev.usage }];

  const candidate =
    typeof rev.value === "string" && rev.value.trim() ? rev.value : revisedText;

  const lengthOk = candidate.length >= revisedText.length * MIN_LENGTH_RATIO;
  const after = detectIntroduced(candidate, corpus);
  const afterCount = after.numbers.length + after.entities.length;
  const accept = lengthOk && afterCount < beforeCount;

  const finalText = accept ? candidate : revisedText;
  const residual = detectIntroduced(finalText, corpus);

  return {
    finalText,
    residual: [...residual.numbers, ...residual.entities],
    repaired: accept,
    usages,
  };
}
