/**
 * Heuristische Projekt-Ueberlappung zwischen zwei WizardFacts.
 *
 * Nutzen: Kumulierungs-Check (erkennt doppelte Foerderung derselben Massnahme)
 * und spaeter Pipeline-Qualitaetscheck (erkennt wenn generierter Antrag den
 * eigenen Fakten zu fern kommt).
 *
 * Kein NLP — Präfix-Matching ueber Projekt-Kern-Tokens. Präfix-Matching ist
 * fuer deutsche Komposita wichtig: "wettbewerb", "wettbewerbe",
 * "wettbewerbsvorbereitung" zaehlen als derselbe Wortstamm.
 */

import type { WizardFacts } from "./types";

export const OVERLAP_HARD = 0.45;
export const OVERLAP_SOFT = 0.22;

/** Mindestlaenge fuer gemeinsamen Präfix. Kurzer — mehr False-Positives. */
const MIN_SHARED_PREFIX = 5;

/**
 * Deutsche Stoppwoerter, die in fast jedem Bildungsantrag vorkommen.
 * Ohne diese Liste dominieren Worte wie "schule" oder "projekt" den Vergleich
 * und zwei voellig unterschiedliche Projekte sehen faelschlich aehnlich aus.
 */
const STOPWORDS = new Set<string>([
  "schule",
  "schulen",
  "schuelerinnen",
  "schueler",
  "schuelern",
  "unterricht",
  "lernen",
  "lernende",
  "bildung",
  "bildungsarbeit",
  "foerderung",
  "foerdern",
  "projekt",
  "projekte",
  "projektes",
  "kinder",
  "kindern",
  "jugend",
  "jugendliche",
  "jugendlichen",
  "verein",
  "vereins",
  "vereine",
  "traeger",
  "schultraeger",
  "massnahme",
  "massnahmen",
  "programm",
  "programme",
  "antrag",
  "antraege",
  "besonders",
  "insbesondere",
  "sowie",
  "sowohl",
  "klassen",
  "klasse",
]);

/** Normalisiert Umlaute/ß und entfernt Nicht-Buchstaben. */
function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[^a-z0-9\s]/g, " ");
}

type ProjektFacts = {
  titel?: string;
  kurzbeschreibung?: string;
  zielgruppe?: string;
  ziele?: string[];
  aktivitaeten?: string[];
};
type WirkungFacts = { erwartete_ergebnisse?: string[] };
type BudgetFacts = { hauptposten?: string[] };

/** Extrahiert Kern-Tokens aus Projekt-, Wirkung- und Budget-Facts. */
export function tokensFromFacts(f: WizardFacts): string[] {
  const projekt = f.projekt as ProjektFacts | undefined;
  const wirkung = f.wirkung as WirkungFacts | undefined;
  const budget = f.budget as BudgetFacts | undefined;
  const chunks: string[] = [];
  if (projekt?.titel) chunks.push(projekt.titel);
  if (projekt?.kurzbeschreibung) chunks.push(projekt.kurzbeschreibung);
  if (projekt?.zielgruppe) chunks.push(projekt.zielgruppe);
  if (Array.isArray(projekt?.ziele)) chunks.push(projekt.ziele.join(" "));
  if (Array.isArray(projekt?.aktivitaeten)) chunks.push(projekt.aktivitaeten.join(" "));
  if (Array.isArray(wirkung?.erwartete_ergebnisse))
    chunks.push(wirkung.erwartete_ergebnisse.join(" "));
  if (Array.isArray(budget?.hauptposten)) chunks.push(budget.hauptposten.join(" "));
  if (chunks.length === 0) return [];
  const set = new Set(
    normalizeText(chunks.join(" "))
      .split(/\s+/)
      .filter((t) => t.length >= MIN_SHARED_PREFIX && !STOPWORDS.has(t))
  );
  return [...set];
}

/**
 * Zwei Tokens gelten als "gleicher Wortstamm", wenn das kuerzere ein Praefix
 * des laengeren ist und selbst mindestens MIN_SHARED_PREFIX Zeichen lang ist.
 */
function sharesStem(x: string, y: string): boolean {
  const short = x.length <= y.length ? x : y;
  const long = x.length > y.length ? x : y;
  return short.length >= MIN_SHARED_PREFIX && long.startsWith(short);
}

/**
 * Symmetrisches Dice-aehnliches Overlap-Mass.
 * score = |matchedInA| + |matchedInB|  /  |A| + |B|
 */
export function projektUeberlappung(
  a: WizardFacts,
  b: WizardFacts
): { score: number; commonTokens: string[] } {
  const A = tokensFromFacts(a);
  const B = tokensFromFacts(b);
  if (A.length === 0 || B.length === 0) return { score: 0, commonTokens: [] };

  const matchedA = new Set<string>();
  const matchedB = new Set<string>();
  const common: string[] = [];

  for (const x of A) {
    for (const y of B) {
      if (!sharesStem(x, y)) continue;
      if (!matchedA.has(x)) {
        matchedA.add(x);
        common.push(x.length <= y.length ? x : y);
      }
      matchedB.add(y);
    }
  }

  const score = (matchedA.size + matchedB.size) / (A.length + B.length);
  const dedupCommon = [...new Set(common)].slice(0, 8);
  return { score, commonTokens: dedupCommon };
}
