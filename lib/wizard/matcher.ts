/**
 * Matching: Anliegen + Schul-Kontext → gerankte Liste passender Foerderprogramme
 * ODER Klaerungsfrage bei vagem Anliegen.
 *
 * Nutzt das Interview-Modell mit Plain-Text-Pipe-Format. JSON-Mode ist bei
 * DeepSeek 5–10× langsamer (zu viel internes Reasoning um JSON-Strukturen),
 * deshalb hier Format `id|score|passt_weil|achtung_bei` pro Zeile (4 Spalten,
 * D-01) ODER `CLARIFY|<frage>` als erste Zeile bei vagem Anliegen (D-05).
 *
 * Tagged-Union-Return: `{ kind: "ranking", ... }` oder `{ kind: "clarification", ... }`
 * (D-08). Frontend dispatched auf `kind` und rendert entsprechend.
 */

import foerderprogrammeData from "@/data/foerderprogramme.json";
import prioritaetenData from "@/data/richtlinien-prioritaeten.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { MODEL_FLASH, generateText } from "./llm";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
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

/** Wieviele Programme maximal an den LLM uebergeben werden.
 * Plan 02-09 Phase-2.2: 20 → 40 erhoeht — Theme-Score-Boost zieht thematisch
 * relevante Programme mit niedrigem Queue-Score in den Cut. Latenz-Kosten
 * vertretbar (~+0.5s pro Match). */
const MAX_LLM_CANDIDATES = 40;
/** Wieviele Treffer der LLM maximal liefern soll. */
const MAX_MATCHES = 3;
/** Hard-Cap fuer Output-Tokens. Reicht satt fuer 3 Pipe-Zeilen
 * (4 Spalten + ggf. CLARIFY-Variante, ~200 Tokens echte Nutzlast). Notbremse, kein aktiver Cut. */
// 600 = Erhoehung fuer Phase-2.1-Prompt-Erweiterung (war 400)
const MATCHER_MAX_TOKENS = 600;

/**
 * Plan 02-10 Drift-Score-Cap (Phase-2.2):
 * Server-Side-Cap fuer aktion-mensch-schulkooperation und bmbf-digitalpakt-2.
 * Prompt-Verbote in Phase 2.1 (MATCHER_SYSTEM-Drift-Defaults) wirken nicht
 * zuverlaessig — der LLM zieht beide Programme weiter bei nicht-passenden
 * Anliegen. Cap unter den 50-Score-Threshold zwingt sie aus dem Final-Set.
 *
 * Cap greift NUR wenn der entsprechende Anker im Anliegen (oder previousAnliegen)
 * fehlt. Bei klarem Inklusions/Digital-Bezug bleiben die Programme legitime Treffer.
 */
const DRIFT_CAP_SCORE = 40;

// =============================================================================
// C5 — Groessenordnungs-Plausibilitaet (Hebel 3, Probe Fall 10: DBU 100k-400k
// fuer ein ~9.500-EUR-Snack-Projekt einer Grundschule). Deterministischer
// achtung_bei-Hinweis, wenn die Foerderhoehe eines Programms nicht zum
// (optionalen) Projektbudget passt. Demotion nur bei BELEGTER starker
// Ueberdimensionierung (Budget bekannt) — im budgetlosen Vage-Fall NUR ein
// sichtbarer Hinweis, keine Score-Aenderung (kein riskantes Heuristik-Raten).
// =============================================================================
/** Ab dieser Mindest-Foerdersumme = Grossprojekt-Schiene (nur 3 Programme im Katalog, u.a. DBU). */
const GROSSPROJEKT_MIN_EUR = 100_000;
/** Programm-Min > Budget × Faktor → zu gross fuer das Vorhaben (Warnung). */
const OVERSIZE_FACTOR = 3;
/** Programm-Min > Budget × Faktor → zusaetzlich demoten (belegte starke Ueberdimensionierung). */
const SEVERE_OVERSIZE_FACTOR = 6;
/** Budget > Programm-Max × Faktor → Programm zu klein fuers Vorhaben (Warnung). */
const UNDERSIZE_FACTOR = 1.5;
/** Score-Deckel bei belegter starker Ueberdimensionierung — demotet unter klar passende Treffer. */
const SIZE_DEMOTE_CAP = 58;

function fmtEur(n: number): string {
  return n.toLocaleString("de-DE") + " EUR";
}

/**
 * Liefert einen Groessenordnungs-Hinweis (oder "") fuer ein Programm relativ zum
 * optionalen Projektbudget. Exportiert fuer Tests.
 */
export function sizeAchtung(p: Foerderprogramm, budget?: number): string {
  const min = (p as { foerdersummeMin?: number | null }).foerdersummeMin;
  const max = (p as { foerdersummeMax?: number | null }).foerdersummeMax;
  if (typeof budget === "number" && budget > 0) {
    if (typeof min === "number" && min > 0 && min > budget * OVERSIZE_FACTOR) {
      return `Foerderung ab ${fmtEur(min)} — deutlich groesser als euer geschaetztes Vorhaben (~${fmtEur(budget)}); ggf. ein niedrigschwelligeres Programm pruefen.`;
    }
    if (typeof max === "number" && max > 0 && budget > max * UNDERSIZE_FACTOR) {
      return `Foerderhoehe bis ${fmtEur(max)} — kleiner als euer Vorhaben (~${fmtEur(budget)}); ggf. ergaenzende Foerderquelle noetig.`;
    }
    return "";
  }
  // Kein Budget bekannt: nur die klar grossskalige Schiene markieren (keine Demotion).
  if (typeof min === "number" && min >= GROSSPROJEKT_MIN_EUR) {
    return `Grossprojekt-Foerderung (ab ${fmtEur(min)}, meist mit hohem Eigenanteil) — passt nur bei entsprechend grossem, mehrjaehrigem Vorhaben.`;
  }
  return "";
}

/** true, wenn der achtung_bei-Text bereits einen Groessen-/Foerderhoehen-Hinweis traegt (Dedupe). */
function mentionsScale(text: string): boolean {
  return /gro(ß|ss)projekt|f(oe|ö)rderh(oe|ö)he|f(oe|ö)rdersumme|niedrigschwellig|(ue|ü)berdimension|deutlich gr(oe|ö)sser/i.test(
    text
  );
}

/** Inklusions-Anker fuer aktion-mensch-schulkooperation. */
function hasInklusionsAnchor(text: string): boolean {
  const t = text.toLowerCase();
  return /inklusion|integration|migrationshintergrund|migrant|f(o|oe|ö)rderbedarf|barriere|sonderp(a|ae|ä)dagog|behinder|sprachf(o|oe|ö)rder/.test(
    t
  );
}

/** Digital/Hardware-Anker fuer bmbf-digitalpakt-2. */
function hasDigitalAnchor(text: string): boolean {
  const t = text.toLowerCase();
  return /digital|tablet|ipad|hardware|laptop|notebook|whiteboard|server|software|computer|wlan|netzwerk|ger(a|ae|ä)t.*beschaff|vr.brille|ar.brille|beamer/.test(
    t
  );
}

/**
 * Plan 02-09 Theme-Score-Boost (Phase-2.2):
 * Anliegen-spezifische Sortier-Achse zusaetzlich zum statischen Queue-Score.
 * Vor dem Top-N-Cut: pro Programm pruefen, wie viele seiner `kategorien` im
 * Anliegen-Text als Substring erwaehnt sind. Bonus = min(hits, 3) * 25.
 *
 * Hebt domain-spezifische Programme mit niedrigem Queue-Score (z.B.
 * niedersachsen-sport Score 40, baywa-laufen-wald Score 22) in den Pipe-Cut,
 * wenn ihre Kategorie im Anliegen erwaehnt ist.
 */
const THEME_BOOST_PER_HIT = 25;
const THEME_BOOST_MAX_HITS = 3;

/**
 * Sortierte Liste aller eindeutigen Kategorien aus foerderprogramme.json.
 * Min-Length-Filter ≥ 4 Zeichen: kurze Kategorien wie "ki", "oer", "bne" werden
 * ausgeschlossen, weil Wort-Grenzen-Match bei 2-3-Buchstaben-Tokens unzuverlaessig
 * ist und sie zu Substring-False-Positives in Vorbearbeitung tendieren (Phase 2.3).
 */
const ALL_KATEGORIEN: string[] = (() => {
  const set = new Set<string>();
  for (const p of programme) {
    const kats = (p as { kategorien?: string[] }).kategorien ?? [];
    for (const k of kats) {
      const lower = String(k).toLowerCase();
      if (lower.length >= 4) set.add(lower);
    }
  }
  return Array.from(set);
})();

/**
 * Hebel 3 — Theme-Alias-Cluster (umgangssprachlicher Begriff → kanonische Tags).
 *
 * Der reine `\b<kategorie>\b`-Match (unten) hat zwei Luecken, die bewirken, dass
 * vage/umgangssprachliche Anliegen KEINEN Theme-Boost bekommen → der Top-N-Cut
 * faellt auf den reinen Queue-Score zurueck = die Default-Magnete:
 *   (a) Vokabel-Mismatch: Nutzer sagt "Tablets"/"programmieren", die Katalog-Tags
 *       heissen "digitalisierung"/"informatik" — kein Substring-Treffer.
 *   (b) Synonym-/Flexions-Splits im Tag-Vokabular selbst: "digitalisierung" (20×)
 *       vs "digital" (4×) vs "digitales" (1×); "naturwissenschaft" vs Plural.
 *
 * Jeder Trigger (Stamm-Match) fuegt den GESAMTEN kanonischen Cluster zu den
 * Anliegen-Themen hinzu — so erhaelt jedes Programm mit irgendeinem Cluster-Tag
 * den Theme-Boost und wird in den LLM-Cut gezogen. Beeinflusst NUR den 40er-Cut
 * (Kandidatenauswahl), nicht das finale Ranking — das macht weiterhin das LLM.
 * Alle `tags` sind reale Kategorien aus foerderprogramme.json.
 */
const THEME_ALIASES: ReadonlyArray<{ trigger: RegExp; tags: readonly string[] }> = [
  // Digital / Hardware (Probe Fall 1 "Tablets")
  { trigger: /\b(tablet|ipad|laptop|notebook|computer|pc|hardware|wlan|smartboard|whiteboard|beamer|software|app|apps|digital|internet|ger(ae|ä)t)/i,
    tags: ["digitalisierung", "digital", "digitales", "digitale-bildung", "medien", "medienbildung", "medienkompetenz", "hardware", "ausstattung", "cloud", "cybersicherheit"] },
  // Programmieren / Informatik / Robotik (Probe Fall 8)
  { trigger: /\b(programmier|coding|code|coden|informatik|roboter|robotik|3d.?druck|elektronik|gaming|scratch|calliope|micro.?bit)/i,
    tags: ["informatik", "programmierung", "robotik", "mint", "technik", "digitalisierung", "elektronik", "mikroelektronik", "3d-druck"] },
  // MINT / Mathe / Naturwissenschaft / Forschen (Korpus ev-015: "naturkundliche
  // Exkursion"/"Aquarium" = Biologie/Naturkunde, traf bisher nur den Umwelt-Cluster)
  { trigger: /\b(mint|mathe|rechnen|naturwissenschaft|naturkund|aquarium|forsch|experiment|physik|chemie|biologie|technik|logik|tueftel|t(ue|ü)ftel)/i,
    tags: ["mint", "mathematik", "naturwissenschaft", "naturwissenschaften", "technik", "forschung", "experiment", "experimente", "physik", "chemie", "biologie", "logik", "wissenschaft"] },
  // Sport / Bewegung (Probe Fall 3 "Bewegung")
  { trigger: /\b(sport|beweg|turn|fussball|fu(ss|ß)ball|ballspiel|schwimm|fitness|motorik|toben|leichtathletik)/i,
    tags: ["sport", "bewegung", "gesundheit", "tanz"] },
  // Lesen / Sprache / DaZ (Probe Fall 4 "Lesen", Fall 9 "Deutsch")
  { trigger: /\b(lese|buch|b(ue|ü)cher|bibliothek|vorlesen|sprach|deutsch|daz|daf|mehrsprach|alphabetis|wortschatz|schreiben)/i,
    tags: ["lesen", "sprache", "sprachen", "deutsch", "integration", "chancengleichheit", "basiskompetenzen", "interkulturell"] },
  // Kultur / Musik / Kunst / Theater (Probe Fall 6 "Musikinstrumente"; Korpus
  // ev-027 "Konzertfahrten" = kulturell, traf bisher keinen Cluster)
  { trigger: /\b(musik|instrument|theater|schauspiel|kunst|malen|basteln|kreativ|chor|konzert|band|film|tanz|gestalt)/i,
    tags: ["kultur", "kunst", "kulturelle-bildung", "musik", "theater", "tanz", "film", "bildende-kunst", "kreativitaet", "kuenste"] },
  // Natur / Umwelt / Garten / Schulhof (Probe Fall 2 "Schulhof", Fall 7 "Garten")
  { trigger: /\b(garten|schulhof|schulgarten|au(ss|ß)engel(ae|ä)nde|hochbeet|beet|begr(ue|ü)n|pflanz|natur|umwelt|tiere|insekt|nabu|wald|teich|klima|nachhaltig|(oe|ö)ko|wasser|artenviel|gel(ae|ä)nde)/i,
    tags: ["umwelt", "umweltbildung", "natur", "naturschutz", "naturerleben", "naturbildung", "nachhaltigkeit", "klimaschutz", "klima", "oekologie", "artenvielfalt", "wald", "garten", "schulgarten", "schulhof", "gartengestaltung", "wasser", "energie", "bne"] },
  // Demokratie / Soziales / Mobbing / Gewalt (Probe Fall 5 "Mobbing")
  { trigger: /\b(mobbing|gewalt|streit|konflikt|respekt|demokrat|mitbestimm|partizip|beteilig|toleranz|vielfalt|diskriminier|ausgrenz|zusammenleben|sozial|miteinander|zivilcourage)/i,
    tags: ["demokratie", "politische-bildung", "partizipation", "beteiligung", "soziales", "praevention", "gewaltpraevention", "extremismuspraevention", "toleranz", "vielfalt", "respekt", "zusammenleben", "teilhabe", "zivilgesellschaft", "kinderschutz"] },
  // Gesundheit / Ernaehrung (Probe Fall 10 "gesundes Essen")
  { trigger: /\b(gesund|ern(ae|ä)hr|essen|kochen|koch|obst|gem(ue|ü)se|fr(ue|ü)hst(ue|ü)ck|verbraucher|haushalt|zahn|sucht)/i,
    tags: ["gesundheit", "ernaehrung", "verbraucherbildung", "haushalt", "alltagskompetenzen", "praevention"] },
  // Inklusion / Foerderbedarf
  { trigger: /\b(inklusi|integration|f(oe|ö)rderbedarf|behinder|barriere|sonderp(ae|ä)dagog|benachteilig|migration|chancengleich|heterogen)/i,
    tags: ["inklusion", "integration", "teilhabe", "barrierefreiheit", "barrierenabbau", "chancengleichheit", "vielfalt", "benachteiligung", "bildungsgerechtigkeit", "foerderung"] },
] as const;

/**
 * Extrahiert Themen aus dem Anliegen-Text via Wort-Grenzen-Match (Phase 2.3) PLUS
 * Alias-Cluster-Expansion (Hebel 3). Der `\b<kat>\b`-Match eliminiert False-Positives
 * wie "ki" in "Kinder", "natur" in "natuerlich". Diakritika/Umlaut-Toleranz nicht
 * noetig fuer den Exakt-Match, weil Kategorien in foerderprogramme.json bereits in
 * ASCII-Form sind. Die Alias-Trigger decken umgangssprachliche/abgeleitete Begriffe
 * UND Umlaut-Varianten ab. Exportiert fuer Tests.
 */
export function extractAnliegenThemes(anliegen: string): Set<string> {
  const t = anliegen.toLowerCase();
  const hits = new Set<string>();
  // 1. Exakter Kategorie-Match (wie bisher).
  for (const kat of ALL_KATEGORIEN) {
    const escaped = kat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(t)) hits.add(kat);
  }
  // 2. Alias-Cluster: jeder Trigger zieht seinen gesamten Tag-Cluster herein.
  for (const alias of THEME_ALIASES) {
    if (alias.trigger.test(t)) {
      for (const tag of alias.tags) hits.add(tag);
    }
  }
  return hits;
}

/** Theme-Boost pro Programm: Anzahl Schnitt-Kategorien × per-Hit-Bonus, gecapped. */
function themeBoost(programm: Foerderprogramm, anliegenThemes: Set<string>): number {
  if (anliegenThemes.size === 0) return 0;
  const kats = (programm as { kategorien?: string[] }).kategorien ?? [];
  let hits = 0;
  for (const k of kats) {
    if (anliegenThemes.has(String(k).toLowerCase())) hits++;
  }
  return Math.min(hits, THEME_BOOST_MAX_HITS) * THEME_BOOST_PER_HIT;
}

/** Groesse des deterministischen Kandidaten-Cuts (= was an den LLM geht). */
export const CUT_SIZE = MAX_LLM_CANDIDATES;

/** Ein prefilter-Ueberlebender mit aufgeschluesseltem Sortier-Score. */
export interface CutCandidate {
  programm: Foerderprogramm;
  /** QueueScore + themeBoost — bestimmt die Cut-Reihenfolge. */
  sortScore: number;
  queueScore: number;
  themeBoost: number;
}

/** Ergebnis der deterministischen Kandidaten-Auswahl vor dem LLM. */
export interface CutSelection {
  /** Alle prefilter-Ueberlebenden, absteigend nach sortScore. */
  ranked: CutCandidate[];
  /** Die ersten CUT_SIZE Programme = exakt das, was an den LLM uebergeben wird. */
  cut: Foerderprogramm[];
  /** Die aus dem Anliegen extrahierten Themen-Tags (Diagnose). */
  anliegenThemes: Set<string>;
}

/**
 * Deterministische Kandidaten-Auswahl VOR dem LLM: prefilter (Status/Bundesland)
 * → sortScore (QueueScore + themeBoost) → Top-CUT_SIZE.
 *
 * Exportiert fuer die Cut-Coverage-Eval (`scripts/eval-cut-coverage.ts`): misst
 * rein deterministisch (ohne LLM-Rauschen), ob das fachlich passende Programm
 * ueberhaupt in den Cut kommt. `runMatch` nutzt dieselbe Funktion → keine
 * Logik-Drift zwischen Produktion und Messung.
 */
export function selectCutCandidates(input: MatchInput): CutSelection {
  const filtered = prefilter(input, programme);
  // previousAnliegen mitberuecksichtigen fuer D-09 Praezisierungs-Pfad.
  const themeText = `${input.anliegen} ${input.previousAnliegen ?? ""}`;
  const anliegenThemes = extractAnliegenThemes(themeText);
  const ranked: CutCandidate[] = filtered
    .map((p) => {
      const queueScore = QUEUE_SCORES.get(p.id) ?? 0;
      const boost = themeBoost(p, anliegenThemes);
      return { programm: p, sortScore: queueScore + boost, queueScore, themeBoost: boost };
    })
    .sort((a, b) => b.sortScore - a.sortScore);
  const cut = ranked.slice(0, CUT_SIZE).map((entry) => entry.programm);
  return { ranked, cut, anliegenThemes };
}

export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  /**
   * Eval-Befund 2026-06-19: Antragsteller-Typ-Hardfilter (analog zum
   * BalkanGrant-Eligibility-Gate). EduFunds foerdert SCHULEN — antragsberechtigt
   * sind Schule, Schultraeger und Foerderverein. Privatunternehmen und reine
   * Kitas sind NICHT antragsberechtigt; fuer sie darf der Matcher keine
   * Schulprogramme erfinden. Wenn gesetzt, hat dieser Wert Vorrang vor der
   * Freitext-Heuristik (classifyApplicant).
   */
  antragstellerTyp?:
    | "schule"
    | "schultraeger"
    | "foerderverein"
    | "kita"
    | "privatunternehmen"
    | "sonstige";
  /** D-09: wenn true, unterdrueckt CLARIFY-Dispatch — der Matcher MUSS ranken. */
  forceRanking?: boolean;
  /** D-09: bei zweitem Aufruf nach Klaerungsfrage — urspruengliches Anliegen als Kontext. */
  previousAnliegen?: string;
}

/**
 * Ein einzelner Match-Treffer im Ranking-Pfad.
 * D-04: altes Pauschal-Feld ist hart entfernt — ersetzt durch `passt_weil` + `achtung_bei`.
 */
export interface MatchHit {
  id: string;
  score: number;
  /** D-01: max ~25 Worte, konkreter Bezug zum Anliegen. */
  passt_weil: string;
  /** D-01: max ~20 Worte, kann leer sein (Trailing-Pipe im Pipe-Format). */
  achtung_bei: string;
  programm: Foerderprogramm;
}

/**
 * Tagged-Union (D-08): entweder gerankte Treffer ODER Klaerungsfrage.
 * Feldname `costs` (nicht `cost` — Codebase-Konvention, siehe pricing.ts).
 */
export type MatchResult =
  | {
      kind: "ranking";
      matches: MatchHit[];
      costs: CostLedger;
      totalCandidates: number;
      filteredOut: number;
    }
  | {
      kind: "clarification";
      question: string;
      costs: CostLedger;
    };

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
    // Nicht-aktive Programme ausschliessen. Bug-Fix (Hebel 3): der Filter pruefte
    // bisher `status === "abgelaufen"` — diesen Wert gibt es im Katalog gar nicht
    // (reale Werte: "aktiv" / "archiviert" / "review_needed"), der Filter war
    // wirkungslos. "archiviert" = terminal (alte Wettbewerbsrunden, Dubletten),
    // "review_needed" = noch nicht freigegeben (z. B. strategische Partnerschaften
    // ohne offenen Call). Beide gehoeren nicht als Live-Treffer in den Cut.
    const status = (p as any).status;
    if (status === "archiviert" || status === "review_needed") return false;
    // Abgelaufene Programme (Frist-Ende in der Vergangenheit) nicht matchen —
    // sonst schreibt der Wizard einen Antrag fuer eine geschlossene Ausschreibung.
    if (isProgrammAbgelaufen(p)) return false;

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
Aufgabe: Anliegen + Liste von Foerderprogrammen → entweder die ${MAX_MATCHES} BESTEN Treffer
oder eine kurze Klaerungsfrage, falls das Anliegen zu vage ist.

## Kriterien (Reihenfolge = Gewicht) — kein thematischer Drift
1. Thematische Passung — domain-spezifisch hat IMMER Vorrang vor allgemein
   (z.B. "Mathe-Wettbewerbe" → Mathe-spezifische Programme schlagen
   generische Schul-Wettbewerbe; "NABU-Standort" → NABU/Natur-Programme
   schlagen Klima/Inklusion; "Mehrsprachige Buecher" → Sprache/Lesen-Programme
   schlagen allgemeine Bibliotheks-Programme)
2. Formale Passung (Schultyp, Bundesland, Summe)
3. Praktikabilitaet  4. Wirkungstiefe

## Wichtig — KEIN Drift in Defaults
- Bei klar thematischer Anfrage NICHT auf "aktion-mensch-schulkooperation"
  zurueckfallen, wenn das Anliegen keinen Inklusions-Bezug hat
- Bei klar thematischer Anfrage NICHT auf "bmbf-digitalpakt-2" zurueckfallen,
  wenn das Anliegen keinen Digital/Hardware-Bezug hat
- Bei klar thematischer Anfrage (Mathe/Sport/Kultur/Sprache/Natur) IMMER
  mind. ein Domain-spezifisches Programm im Top-3, falls eines existiert
- Wenn ein Programm thematisch klar passt, Score >= 60 setzen — NICHT
  kuenstlich niedrig, weil andere formale Aspekte fehlen (BL/Schultyp).
  Lieber Score 65 mit "achtung_bei: Bundesland im Profil ergaenzen" als
  leere Liste.

## Verboten
- Programme erfinden (nur IDs aus der Liste)
- Score < 50 (lieber leere Liste als Gefaelligkeit)
- Pipe-Char \`|\` im Inhalt von passt_weil/achtung_bei

## AUSGABE — zwei moegliche Formen:

### Form A — wenn Anliegen VAGE (≥2 Pflicht-Slots fehlen ODER Multi-Thema):
CLARIFY|<konkrete Frage mit konkreten Optionen>

ZUERST Slots zaehlen, DANN entscheiden — auch wenn die Programmliste klare
thematische Treffer enthaelt: thematische Passung ersetzt nicht die Klaerung
fehlender Slots.

Pflicht-Slots:
- Bundesland: gilt als gefuellt, wenn das Anliegen ODER das Schul-Profil ein konkretes Bundesland nennt
- Zielgruppe/Schultyp: gilt als gefuellt, wenn ein Schultyp/Klassenstufe/Schuelergruppe genannt ist
- Thematischer Fokus: gilt als gefuellt, wenn das Anliegen GENAU EIN klares
  Themenfeld nennt (z.B. "digital", "Sport", "Lesen", "Inklusion", "Kultur").
  Gilt als FEHLEND in folgenden Faellen:
  (a) keines genannt
  (b) mehrere widerspruechliche genannt ("Sport, Kultur und Digitales")
  (c) drei oder mehr unentschiedene Optionen ("Theater, MINT-AG oder
      Austausch — was passt wirtschaftlich?")
  (d) Phrasen wie "irgendwas zwischen X und Y", "wir wissen noch nicht
      wo der Hebel am groessten ist", "viele Ideen, aber nichts Konkretes"

ZUSATZ-REGEL — Multi-Thema triggert IMMER CLARIFY:
Wenn der Thema-Slot in (b) oder (c) faellt (≥2 widerspruechliche Themen oder
≥3 unentschiedene Optionen), IMMER Form A — selbst wenn Bundesland und
Schultyp beide gefuellt sind. Der Schwerpunkt MUSS geklaert sein, weil
Foerderschienen sich nicht beliebig kombinieren lassen.

Beispiel CLARIFY (BL fehlt + Thema fehlt):
CLARIFY|Fuer welches Bundesland sucht ihr und welcher Schwerpunkt steht im Vordergrund — z.B. Digitalisierung, Sport, Kultur oder etwas anderes?

Beispiel CLARIFY (mehrere widerspruechliche Themen — auch bei vollen Slots):
CLARIFY|Ihr nennt Theater, MINT-AG und Austausch — das sind sehr verschiedene Foerderschienen. Welcher Bereich steht fuer euch im Vordergrund?

Beispiel CLARIFY (unentschiedene Strategie):
CLARIFY|"Irgendwas zwischen Inklusion, Demokratielernen und Internationalisierung" ist zu breit. Welcher der drei Bereiche soll der Schwerpunkt sein?

Beispiel CLARIFY (Thema vorhanden, aber Schultyp + BL fehlen):
Anliegen "Wir wuerden gern etwas im Bereich Bewegung oder Sport starten" (Schultyp leer, BL leer):
CLARIFY|Fuer welche Schulform und welches Bundesland? Bei Sport-Foerderung gibt es starke landesspezifische Programme — ohne BL koennen wir nicht zielsicher empfehlen.

Beispiel CLARIFY (Thema generisch, Schultyp + BL fehlen):
Anliegen "Projekt fuer Kinder, kreativer Bereich" (Schultyp leer, BL leer):
CLARIFY|Welche Schulform und welches Bundesland? "Kreativer Bereich" ist breit — Theater/Musik/Kunst-AG haben jeweils eigene Foerderschienen.

### Form B — wenn Anliegen KLAR genug (exakt ${MAX_MATCHES} oder weniger Zeilen):
id|score|passt_weil|achtung_bei

Regeln Form B:
- id: exakt aus der Liste, kein Whitespace drum
- score: ganze Zahl 50-100
- passt_weil: max ~25 Worte, sachlich, mit konkretem Bezug zum Anliegen. ALLTAGSSPRACHLICH — kein Foerder-/Verwaltungsfachjargon. Statt "ausserschulischer Charakter" schreibe "freiwilliges Angebot neben dem Unterricht"; statt "Letztzuwendungsempfaenger" o. Ae. konkrete, verstaendliche Worte. Eine Schulleitung muss den Satz ohne Nachschlagen verstehen.
- achtung_bei: max ~20 Worte, kann LEER sein — dann Trailing-Pipe (\`id|score|text|\`). Ebenfalls alltagssprachlich, kein Fachjargon.
- Genau 4 Spalten — bei leerem achtung_bei: Trailing-Pipe ist PFLICHT, sonst wird die Zeile verworfen
- Pipe-Char \`|\` im Text VERBOTEN

Beispiele Form B:
bmbf-digitalpakt-2|92|Bundesweite Foerderung digitaler Schulinfrastruktur, deckt Hardware ab.|Antragsfrist naht — Einreichung vor Juli pruefen.
kultur-macht-stark|75|Foerdert freiwillige Kulturangebote neben dem Unterricht, etwa Theater- oder Musik-AGs.|

### NEGATIVBEISPIELE — was NICHT erlaubt ist:
CLARIFY|Was wollt ihr genau?                       <- zu vage, keine Optionen
bmbf-digitalpakt-2|90|Passt.|                      <- passt_weil zu kurz
kultur-macht-stark|85|gut.                         <- FEHLENDE Trailing-Pipe (3 statt 4 Spalten)
prog-x|70|Text mit | im Inhalt.|Achtung.           <- Pipe im Text verboten

## NEGATIVBEISPIELE — was NICHT erlaubt ist (Drift):
Anliegen "Mathe-Wettbewerbe ausbauen" -> Top-3 mit playmobil-hobpreis|ferry-porsche-challenge|claussen-simon
  <- FALSCH: kaenguru-der-mathematik / mathe-im-advent / bundeswettbewerb-mathematik haetten Vorrang
Anliegen "Schul-Aquarium und NABU-Standort" -> Top-3 mit kultur-macht-stark|klimalab|aktion-mensch
  <- FALSCH: nabu-schulen / bfn-artenvielfalt / stiftung-kinder-forschen sind Domain-spezifisch
Anliegen "Mehrsprachige Bibliothek (600 Buecher Tuerkisch/Arabisch)" -> leere Liste
  <- FALSCH: lesen-macht-stark / sprache-macht-stark / mercator-integration passen klar

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

  // D-09: Conditional-Bloecke fuer forceRanking + previousAnliegen
  if (input.forceRanking) {
    ctx.push(
      `\n[HINWEIS]: Auch wenn das Anliegen vage erscheint — KEIN CLARIFY. Direkt ranken (ggf. mit niedrigen Scores).`
    );
  }
  if (input.previousAnliegen) {
    ctx.push(
      `\nURSPRUENGLICHES ANLIEGEN (Kontext-Referenz):\n${input.previousAnliegen.trim()}`
    );
  }
  return ctx.join("\n");
}

/**
 * Internes Roh-Format nach Pipe-Parser.
 * 4 Spalten exakt — Soft-Failure verwirft Zeilen mit !=4 Spalten (D-02).
 */
interface RawMatch {
  id: string;
  score: number;
  passt_weil: string;
  achtung_bei: string;
}

/**
 * Parser fuer das Pipe-Format `id|score|passt_weil|achtung_bei`.
 * D-01: exakt 4 Spalten erforderlich.
 * D-02: Zeilen mit Spalten != 4 werden Soft-Failure (continue) verworfen — kein Throw.
 * D-05: CLARIFY|-Zeilen werden hier ignoriert (Dispatch passiert in runMatch).
 *
 * Robust gegen Vorrede, Bullet-Praefixe, Markdown-Fences.
 * Trailing-Pipe (`id|score|text|`) wird korrekt als leeres `achtung_bei: ""` geparst,
 * da JavaScript `"a|b|c|".split("|")` 4 Elemente zurueckgibt (letztes leer).
 */
export function parsePipeMatches(text: string, validIds: Set<string>): RawMatch[] {
  const out: RawMatch[] = [];
  for (const rawLine of text.split("\n")) {
    // Markdown-Fences und Leerzeilen verwerfen
    if (/^\s*```/.test(rawLine) || !rawLine.trim()) continue;
    // fuehrende Bullets/Nummern entfernen ("- ", "* ", "1. ", "1) ")
    const cleaned = rawLine.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, "");
    // CLARIFY-Zeilen werden in runMatch dispatched, nicht hier
    if (cleaned.startsWith("CLARIFY|")) continue;

    const parts = cleaned.split("|");
    // D-02: Soft-Failure bei Spalten != 4
    if (parts.length !== 4) continue;

    const [id, scoreStr, passt_weil, achtung_bei] = parts.map((s) => s.trim());
    const score = parseInt(scoreStr, 10);
    // WR-05: Score-Range 0-100 hart pruefen — pathologische LLM-Outputs (z.B. score=999) raus.
    // score < 50 wird weiterhin in runMatch gefiltert (zentrale Geschaeftslogik), aber
    // hier zentralisieren wir die formale Range-Validierung.
    if (!id || !validIds.has(id) || isNaN(score) || score < 0 || score > 100) continue;

    out.push({
      id,
      score,
      passt_weil: passt_weil ?? "",
      achtung_bei: achtung_bei ?? "",
    });
  }
  return out;
}

/** Schultyp-Werte, die einen echten Schulkontext belegen (→ antragsberechtigt). */
const SCHULTYP_WERTE = new Set([
  "grundschule", "hauptschule", "realschule", "gymnasium", "gesamtschule",
  "foerderschule", "förderschule", "berufsschule", "iss", "oberschule",
  "sekundarschule", "gemeinschaftsschule", "schule",
]);

/**
 * Antragsteller-Typ-Hardfilter (Eval-Befund 2026-06-19).
 *
 * EduFunds foerdert Schulen — antragsberechtigt sind **Schule, Schultraeger,
 * Foerderverein**. **Privatunternehmen** (GmbH/Firma fuer den eigenen Betrieb)
 * und **reine Kitas/Kindergaerten** sind NICHT antragsberechtigt; fuer sie darf
 * der Matcher keine Schulprogramme vorschlagen (analog zur harten
 * eligible:false-Pruefung im BalkanGrant-Matcher).
 *
 * Reihenfolge: explizites `antragstellerTyp` hat Vorrang; sonst konservative
 * Freitext-Heuristik auf `schulname` + `anliegen`. Die Heuristik ist bewusst
 * vorsichtig — sie sperrt nur bei klaren Nicht-Schul-Signalen UND fehlendem
 * Schultyp, damit echte (auch private/gGmbH-getragene) Schulen nie faelschlich
 * abgewiesen werden.
 */
export function classifyApplicant(input: MatchInput): {
  eligible: boolean;
  typ: NonNullable<MatchInput["antragstellerTyp"]> | "unbekannt";
  grund: string;
} {
  const ELIGIBLE = new Set(["schule", "schultraeger", "foerderverein"]);

  if (input.antragstellerTyp) {
    const t = input.antragstellerTyp;
    return ELIGIBLE.has(t)
      ? { eligible: true, typ: t, grund: "antragsberechtigt (explizit)" }
      : { eligible: false, typ: t, grund: `nicht antragsberechtigt: ${t}` };
  }

  const name = (input.schulname ?? "").toLowerCase();
  const anliegen = (input.anliegen ?? "").toLowerCase();
  const hay = `${name} ${anliegen}`;
  const schultyp = (input.schultyp ?? "").trim().toLowerCase();
  const hatSchultyp = SCHULTYP_WERTE.has(schultyp);

  // Foerderverein ist ein zulaessiges Antrags-Vehikel FUER eine Schule.
  if (/f[oö]rderverein/.test(hay)) {
    return { eligible: true, typ: "foerderverein", grund: "Foerderverein (Schulfoerderung)" };
  }

  // Reine Kita/Kindergarten ohne Schulkontext → nicht antragsberechtigt.
  if (/\b(kita|kindergarten|kindertagesst|kindertagespflege|krippe)\b/.test(hay) && !hatSchultyp) {
    return { eligible: false, typ: "kita", grund: "Kita/Kindergarten ohne Schulkontext" };
  }

  // Privatunternehmen: Firmen-Rechtsform im Namen ODER betriebliches Anliegen,
  // jeweils NUR ohne belegten Schultyp (echte Schulen — auch gGmbH-getragene —
  // tragen einen Schultyp und werden so nicht erfasst). "gGmbH" loest die
  // \bgmbh\b-Grenze bewusst nicht aus (vorangestelltes "g").
  const firmenRechtsform = /\bgmbh\b|\bag\b|\bug\b|\bgbr\b|\bkg\b|\bohg\b|\bunternehmen\b|\bfirma\b|\bbetrieb\b/.test(name);
  const betrieblichesAnliegen = /unser(?:es|em|en)?\s+(unternehmen|betrieb|firma|bauunternehmen)|f[uü]r\s+(?:unser|den)\s+betrieb|gewinn|maschinen f[uü]r|ausbau unseres/.test(anliegen);
  if ((firmenRechtsform || betrieblichesAnliegen) && !hatSchultyp) {
    return { eligible: false, typ: "privatunternehmen", grund: "Privatunternehmen ohne Schulkontext" };
  }

  // Default: als Schule behandeln (eligible).
  return { eligible: true, typ: hatSchultyp ? "schule" : "unbekannt", grund: "Schulkontext angenommen" };
}

export async function runMatch(input: MatchInput): Promise<MatchResult> {
  if (!input.anliegen || input.anliegen.trim().length < 20) {
    throw new Error(
      "Bitte beschreibe dein Anliegen etwas ausfuehrlicher (mind. 20 Zeichen)."
    );
  }

  // Antragsteller-Typ-Hardfilter (Eval-Befund 2026-06-19): bevor ueberhaupt
  // gerankt wird, pruefen, ob der Antragsteller antragsberechtigt ist. Fuer
  // Privatunternehmen / reine Kitas darf der Matcher KEINE Schulprogramme
  // vorschlagen. Greift auch bei forceRanking=true — Foerderfaehigkeit ist
  // nicht verhandelbar (analog BalkanGrant eligible:false). Antwort als
  // clarification mit ehrlicher Begruendung; der Eval-Endpunkt liefert dafuer []
  // → no_match_invention_rate sinkt.
  const elig = classifyApplicant(input);
  if (!elig.eligible) {
    const wofuer = elig.typ === "kita"
      ? "Kitas und Kindergaerten"
      : elig.typ === "privatunternehmen"
        ? "Privatunternehmen"
        : "dieser Antragstellertyp";
    return {
      kind: "clarification",
      question:
        `EduFunds vermittelt Foerderprogramme fuer SCHULEN. Antragsberechtigt sind ` +
        `Schulen, Schultraeger und Foerdervereine — fuer ${wofuer} koennen wir keine ` +
        `passenden Schulprogramme vorschlagen. Falls ein Foerderverein oder Schultraeger ` +
        `stellvertretend fuer eine Schule beantragt, gib bitte die Schule an.`,
      costs: emptyLedger(),
    };
  }

  // Plan 02-09: Deterministische Kandidaten-Auswahl (prefilter → QueueScore +
  // ThemeBoost → Top-CUT_SIZE). Identisch zur Cut-Coverage-Eval (selectCutCandidates).
  const selection = selectCutCandidates(input);
  const cards = selection.cut.map(toCard);

  const { value: rawText, usage } = await generateText(
    MODEL_FLASH,
    MATCHER_SYSTEM,
    buildUserPrompt(input, cards),
    // temperature 0: identische Eingabe -> reproduzierbare Scores. Ohne das
    // nutzt der Provider seinen Default (>0) und der Score schwankt pro Lauf.
    { maxTokens: MATCHER_MAX_TOKENS, temperature: 0 }
  );

  const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);

  // D-05/D-08/D-09: CLARIFY-Dispatch VOR Parser.
  // Nur die ALLERERSTE Zeile zaehlt — spaetere CLARIFY|-Zeilen werden in
  // parsePipeMatches per `continue` ignoriert.
  // forceRanking=true unterdrueckt den Dispatch komplett.
  const firstLine = rawText.trim().split("\n")[0]?.trim() ?? "";
  if (!input.forceRanking && firstLine.startsWith("CLARIFY|")) {
    const question = firstLine.slice("CLARIFY|".length).trim();
    return { kind: "clarification", question, costs };
  }

  // Standard-Ranking-Pfad
  const validIds = new Set(programme.map((p) => p.id));
  const rawMatches = parsePipeMatches(rawText, validIds);

  // Plan 02-10: Drift-Score-Cap auf Anliegen-Anker pruefen.
  // previousAnliegen mitberuecksichtigen, damit Praezisierungs-Submit den Anker
  // aus der ersten Runde nicht verliert (D-09).
  const ankerText = `${input.anliegen} ${input.previousAnliegen ?? ""}`;
  const hasInklusion = hasInklusionsAnchor(ankerText);
  const hasDigital = hasDigitalAnchor(ankerText);

  const matches: MatchHit[] = [];
  for (const m of rawMatches) {
    let effectiveScore = m.score;
    if (m.id === "aktion-mensch-schulkooperation" && !hasInklusion) {
      effectiveScore = Math.min(effectiveScore, DRIFT_CAP_SCORE);
    }
    if (m.id === "bmbf-digitalpakt-2" && !hasDigital) {
      effectiveScore = Math.min(effectiveScore, DRIFT_CAP_SCORE);
    }
    const p = programme.find((x) => x.id === m.id);
    if (!p) continue;

    // C5 Groessenordnungs-Plausibilitaet: Hinweis immer, Demotion nur bei
    // belegter starker Ueberdimensionierung (Budget bekannt & Min > Budget × 6).
    const sizeNote = sizeAchtung(p, input.geschaetztesBudgetEur);
    if (sizeNote && typeof input.geschaetztesBudgetEur === "number" && input.geschaetztesBudgetEur > 0) {
      const min = (p as { foerdersummeMin?: number | null }).foerdersummeMin;
      if (typeof min === "number" && min > input.geschaetztesBudgetEur * SEVERE_OVERSIZE_FACTOR) {
        effectiveScore = Math.min(effectiveScore, SIZE_DEMOTE_CAP);
      }
    }

    if (effectiveScore < 50) continue;

    const achtung_bei =
      sizeNote && !mentionsScale(m.achtung_bei)
        ? m.achtung_bei
          ? `${m.achtung_bei} ${sizeNote}`
          : sizeNote
        : m.achtung_bei;

    matches.push({
      id: m.id,
      score: Math.round(effectiveScore),
      passt_weil: m.passt_weil,
      achtung_bei,
      programm: p,
    });
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    kind: "ranking",
    matches: matches.slice(0, MAX_MATCHES),
    costs,
    totalCandidates: selection.ranked.length,
    filteredOut: programme.length - selection.ranked.length,
  };
}
