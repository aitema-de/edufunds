/**
 * Matching: Anliegen + Schul-Kontext → gerankte Liste passender Foerderprogramme.
 * Nutzt das Interview-Modell mit Plain-Text-Pipe-Format. JSON-Mode ist bei
 * DeepSeek 5–10× langsamer (zu viel internes Reasoning um JSON-Strukturen),
 * deshalb hier Format `id|score|begruendung` pro Zeile.
 */

import foerderprogrammeData from "@/data/foerderprogramme.json";
import prioritaetenData from "@/data/richtlinien-prioritaeten.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { MODEL_FLASH, generateText } from "./llm";
import { addUsage, emptyLedger, type CostLedger } from "./pricing";

const programme = foerderprogrammeData as Foerderprogramm[];

/**
 * Map programmId → Queue-Score. Wird zum Top-N-Prefilter genutzt, damit der
 * LLM-Prompt schlank bleibt (DeepSeek skaliert hart mit Input-Groesse).
 */
const QUEUE_SCORES: Map<string, number> = new Map(
  ((prioritaetenData as { items?: Array<{ programmId: string; score: number; status?: string }> }).items ?? [])
    .filter((q) => q.status !== "skip")
    .map((q) => [q.programmId, q.score] as const)
);

/** Wieviele Programme maximal an den LLM uebergeben werden. */
const MAX_LLM_CANDIDATES = 20;
/** Wieviele Treffer der LLM maximal liefern soll. */
const MAX_MATCHES = 3;
/** Hard-Cap fuer Output-Tokens. Reicht satt fuer 3 Pipe-Zeilen
 * (~150 Tokens echte Nutzlast). Notbremse, kein aktiver Cut. */
const MATCHER_MAX_TOKENS = 400;

export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
}

export interface MatchedProgramm {
  id: string;
  score: number;
  begruendung: string;
  programm: Foerderprogramm;
}

export interface MatchResult {
  matches: MatchedProgramm[];
  costs: CostLedger;
  totalCandidates: number;
  filteredOut: number;
}

/**
 * Vor-Filter: Programme ausschliessen, die aufgrund harter Kriterien nicht passen.
 * Reduziert Token-Verbrauch und Halluzinationen des Matchers.
 */
/** Vollnamen der Bundeslaender → Daten-Codes wie sie in foerderprogramme.json stehen. */
const BUNDESLAND_NAME_TO_CODE: Record<string, string> = {
  "BADEN-WÜRTTEMBERG": "DE-BW",
  "BADEN-WUERTTEMBERG": "DE-BW",
  "BAYERN": "DE-BY",
  "BERLIN": "DE-BE",
  "BRANDENBURG": "DE-BB",
  "BREMEN": "DE-HB",
  "HAMBURG": "DE-HH",
  "HESSEN": "DE-HE",
  "MECKLENBURG-VORPOMMERN": "DE-MV",
  "NIEDERSACHSEN": "DE-NI",
  "NORDRHEIN-WESTFALEN": "DE-NW",
  "RHEINLAND-PFALZ": "DE-RP",
  "SAARLAND": "DE-SL",
  "SACHSEN": "DE-SN",
  "SACHSEN-ANHALT": "DE-ST",
  "SCHLESWIG-HOLSTEIN": "DE-SH",
  "THÜRINGEN": "DE-TH",
  "THUERINGEN": "DE-TH",
};

/** Akzeptiert Vollname (z. B. „Baden-Württemberg") ODER Code (z. B. „DE-BW") und liefert den Code. */
function normalizeBundesland(raw: string | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  // Schon Code-Form?
  if (/^DE-[A-Z]{2}$/.test(upper)) return upper;
  return BUNDESLAND_NAME_TO_CODE[upper] ?? null;
}

function prefilter(input: MatchInput, all: Foerderprogramm[]): Foerderprogramm[] {
  const blCode = normalizeBundesland(input.bundesland);
  return all.filter((p) => {
    // Abgelaufene Fristen ausschliessen
    if ((p as any).status && (p as any).status === "abgelaufen") return false;

    // Landesprogramme filtern: wenn User bundesland gesetzt hat und
    // Programm explizit andere Laender fordert
    if (blCode && Array.isArray((p as any).bundeslaender) && (p as any).bundeslaender.length > 0) {
      const entries = ((p as any).bundeslaender as string[]).map((x) => x.toLowerCase());
      // "alle" bedeutet bundesweit; sonst exakter Match auf BL-Code
      const isBundesweit = entries.includes("alle");
      const matchesBL = entries.includes(blCode.toLowerCase());
      if (!isBundesweit && !matchesBL) return false;
    }

    return true;
  });
}

/**
 * Baut eine kompakte Karten-Darstellung pro Programm (für den LLM-Prompt).
 * Bewusst minimal — DeepSeek-Latency skaliert mit Input-Groesse, daher nur die
 * Felder, die der Matcher fuer Score + Begruendung braucht. Frist/Geber/Typ/
 * Zielgruppe werden erst spaeter (Programm-Detail-Seite) ausgespielt.
 */
interface CompactProgrammCard {
  id: string;
  name: string;
  foerdersumme?: number | string;
  kategorien?: string[];
  kurz?: string;
}

function toCard(p: Foerderprogramm): CompactProgrammCard {
  return {
    id: p.id,
    name: p.name,
    foerdersumme: (p as any).foerdersummeMax ?? (p as any).foerdersummeText,
    kategorien: ((p as any).kategorien ?? []).slice(0, 4),
    kurz: ((p as any).kurzbeschreibung ?? "").substring(0, 120),
  };
}

const MATCHER_SYSTEM = `Du bist Foerdermittel-Berater fuer Schulen in Deutschland.
Aufgabe: Anliegen + Liste von Foerderprogrammen → die ${MAX_MATCHES} BESTEN Treffer.

## Kriterien (Reihenfolge = Gewicht)
1. Thematische Passung  2. Formale Passung (Schultyp, Bundesland, Summe)
3. Praktikabilitaet  4. Wirkungstiefe

## Verboten
- Programme erfinden (nur IDs aus der Liste)
- Score < 50 (lieber leere Liste als Gefaelligkeit)

## AUSGABE — exakt ${MAX_MATCHES} Zeilen, Format pro Zeile:
id|score|begruendung

- id: exakt aus der Liste, kein Whitespace drum
- score: ganze Zahl 50-100
- begruendung: 1 Satz, MAX 15 Woerter, sachlich, mit konkretem Bezug zum Anliegen

## Beispiel
bmbf-digitalpakt-2|95|Bundesweite Foerderung digitaler Schulinfrastruktur, deckt Bibliotheks-Hardware ab.
ferry-porsche-challenge|80|Wettbewerb fuer kreative Bildungsprojekte mit digitaler Komponente.
kultur-macht-stark|65|Aussserschulische kulturelle Bildung, Lese- und Medienkompetenz foerderbar.

KEINE Vorrede, KEINE Markdown-Bullets/Fences, KEINE Erklaerung danach.
Sortiert nach Score absteigend. Wenn weniger als ${MAX_MATCHES} Programme passen, weniger Zeilen ausgeben.`;

function buildUserPrompt(input: MatchInput, cards: CompactProgrammCard[]): string {
  const ctx: string[] = [];
  ctx.push(`ANLIEGEN DER SCHULE:\n${input.anliegen.trim()}`);
  const profile: string[] = [];
  if (input.schulname) profile.push(`Name: ${input.schulname}`);
  if (input.schultyp) profile.push(`Schultyp: ${input.schultyp}`);
  if (input.bundesland) profile.push(`Bundesland: ${input.bundesland}`);
  if (input.geschaetztesBudgetEur)
    profile.push(`Geschaetztes Budget: ${input.geschaetztesBudgetEur.toLocaleString("de-DE")} EUR`);
  if (profile.length) ctx.push(`\nSCHUL-PROFIL:\n${profile.join("\n")}`);
  ctx.push(`\nKANDIDATENLISTE (${cards.length} Programme):\n${JSON.stringify(cards)}`);
  ctx.push(`\nLiefere die ${MAX_MATCHES} besten Treffer im Pipe-Format. IDs exakt wie in der Liste.`);
  return ctx.join("\n");
}

interface RawMatch {
  id: string;
  score: number;
  begruendung: string;
}

/**
 * Parser fuer das Pipe-Format `id|score|begruendung`.
 * Robust gegen Vorrede, Bullet-Praefixe, Markdown-Fences. Pipes in der
 * Begruendung werden zusammengefuehrt (split.length-bedingt).
 */
function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    // Markdown-Fences und Leerzeilen verwerfen
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    // fuehrende Bullets/Nummern entfernen ("- ", "* ", "1. ", "1) ")
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    const idx1 = cleaned.indexOf("|");
    if (idx1 < 0) continue;
    const idx2 = cleaned.indexOf("|", idx1 + 1);
    if (idx2 < 0) continue;
    const id = cleaned.slice(0, idx1).trim();
    const scoreStr = cleaned.slice(idx1 + 1, idx2).trim();
    const begruendung = cleaned.slice(idx2 + 1).trim();
    const score = parseInt(scoreStr, 10);
    if (!id || !validIds.has(id) || isNaN(score)) continue;
    out.push({ id, score, begruendung });
  }
  return out;
}

export async function runMatch(input: MatchInput): Promise<MatchResult> {
  if (!input.anliegen || input.anliegen.trim().length < 20) {
    throw new Error(
      "Bitte beschreibe dein Anliegen etwas ausfuehrlicher (mind. 20 Zeichen)."
    );
  }

  const filtered = prefilter(input, programme);

  // Top-N nach Queue-Score: aussichtsreichste Programme zuerst, Rest faellt
  // weg. Ein Programm ohne Queue-Eintrag bekommt Score 0 (landet hinten).
  const topN = [...filtered]
    .sort((a, b) => (QUEUE_SCORES.get(b.id) ?? 0) - (QUEUE_SCORES.get(a.id) ?? 0))
    .slice(0, MAX_LLM_CANDIDATES);
  const cards = topN.map(toCard);

  const { value: rawText, usage } = await generateText(
    MODEL_FLASH,
    MATCHER_SYSTEM,
    buildUserPrompt(input, cards),
    { maxTokens: MATCHER_MAX_TOKENS }
  );

  const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);
  const validIds = new Set(programme.map((p) => p.id));
  const rawMatches = parsePipeMatches(rawText, validIds);

  const matches: MatchedProgramm[] = [];
  for (const m of rawMatches) {
    if (m.score < 50) continue;
    const p = programme.find((x) => x.id === m.id);
    if (!p) continue;
    matches.push({ id: m.id, score: Math.round(m.score), begruendung: m.begruendung, programm: p });
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    matches: matches.slice(0, MAX_MATCHES),
    costs,
    totalCandidates: filtered.length,
    filteredOut: programme.length - filtered.length,
  };
}
