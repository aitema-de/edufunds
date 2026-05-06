/**
 * Eval-Skript fuer den Programm-Matcher (lib/wizard/matcher.ts).
 * Laedt data/eval/matcher-korpus.json, ruft runMatch pro Eintrag auf,
 * berechnet Recall@3 + Off-Target-Rate + Edge-Case-Metrik + Phase-2-Clarif-Metriken
 * (D-15: Clarification-Precision/Falsch-Pos-Rate/Slot-Coverage), schreibt
 * JSON-Bericht nach data/eval/reports/<ISO>.json.
 *
 * Read-only gegen den Matcher — keine Code-Aenderungen an lib/wizard/matcher.ts.
 *
 * Phase 2 (Plan 02-03): MatchResult ist Tagged-Union {kind: "ranking" | "clarification"}.
 * Skript dispatched auf result.kind, misst Clarif-Precision/Falsch-Pos/Slot-Coverage,
 * codiert D-16-Threshold-Gate als process.exit(1) bei Gate-Fail (D-17 PR-Gate).
 *
 * Flags:
 *   (default)        — Live-DeepSeek-Calls, ~3 Cent fuer 30 Eintraege
 *   --snapshot       — speichert Matcher-Output je Eintrag in data/eval/snapshots/<ISO>/
 *   --replay <dir>   — evaluiert gegen gespeicherte Snapshots ohne LLM-Calls
 *                       (Phase-1-Snapshots ohne `kind`-Feld werden automatisch via Shim migriert)
 *   --md-summary     — schreibt zusaetzlich data/eval/reports/<ISO>.md
 *
 * Run: `npx tsx --env-file=.env.local scripts/eval-matcher.ts [flags]`
 * Alias: `npm run eval:matcher` (gleicher Effekt, ohne Flags).
 *
 * Exit-Codes:
 *   0  Alle D-16-Targets erfuellt (GATE PASSED)
 *   1  Mind. ein D-16-Target nicht erfuellt (GATE FAILED) ODER unerwarteter Crash
 *   2  CLI-Fehler / Korpus-Validation fehlgeschlagen
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { MatchInput, MatchResult } from "../lib/wizard/matcher";
import { runMatch } from "../lib/wizard/matcher";
import type { CostLedger } from "../lib/wizard/pricing";
import { addUsage, emptyLedger, formatEur } from "../lib/wizard/pricing";

const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/matcher-korpus.json");
const PROGRAMME_PATH = resolve(REPO, "data/foerderprogramme.json");
const REPORTS_DIR = resolve(REPO, "data/eval/reports");
const SNAPSHOTS_DIR_BASE = resolve(REPO, "data/eval/snapshots");
const LOG_PREFIX = "[eval-matcher]";

const ALLOWED_SLOTS = ["bundesland", "zielgruppe", "thema"] as const;
type Slot = (typeof ALLOWED_SLOTS)[number];

// --- Interne Typen ------------------------------------------------------

type Category = "kurz" | "ausfuehrlich" | "vag";

interface KorpusEntry {
  id: string;
  category: Category;
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  expected_top3: string[];
  expected_off_target: string[];
  notes?: string;
  // Phase-2-Erweiterungen (D-13, D-14):
  /** D-13: wenn true, erwartet Eval, dass der Matcher mit kind="clarification" antwortet. */
  expected_clarification?: boolean;
  /** D-14: optional, fuer Slot-Coverage-Diagnose (nicht PR-Gate). */
  expected_missing_slots?: Slot[];
  // WR-03: Snapshot-Audit-Felder fuer kuenftige D-09-Test-Eintraege.
  /** Optional: erzwinge Ranking-Pfad (D-09 Override-Test). */
  forceRanking?: boolean;
  /** Optional: voriges Anliegen fuer Praezisierungs-Test (D-09). */
  previousAnliegen?: string;
}

interface EntryResult {
  id: string;
  category: Category;
  expected_top3: string[];
  expected_off_target: string[];
  /** D-04: passt_weil + achtung_bei (Phase-2-Schema, alte Pauschal-Spalte hart entfernt). Leer bei kind="clarification". */
  actual_top3: Array<{ id: string; score: number; passt_weil: string; achtung_bei: string }>;
  /** Recall@3, null bei Edge-Cases (expected_top3.length === 0) oder bei Errors/Clarification. */
  recall: number | null;
  /** True, wenn mindestens ein expected_off_target im Matcher-Top-3 auftaucht; null bei Clarification/Error. */
  offTargetHit: boolean | null;
  latencyMs: number;
  costs: { eurCents: number; usdCents: number; calls: number; totalTokens: number };
  totalCandidates: number;
  filteredOut: number;
  /** Bei Soft-Failure (runMatch wirft) gesetzt. */
  error?: string;
  // Phase-2-Erweiterungen (D-15):
  /** Kopie aus KorpusEntry fuer aggregate() ohne KorpusEntry-Ref. */
  expectedClarification: boolean;
  /**
   * - "hit": expected=true UND actual.kind=clarification
   * - "miss": expected=true UND actual.kind=ranking
   * - "false_pos": expected=false UND actual.kind=clarification
   * - "not_applicable": Eintrag mit error ODER (expected=false UND actual=ranking)
   */
  clarifResult: "hit" | "miss" | "false_pos" | "not_applicable";
  /** D-14: Anteil erwarteter Slots im Frage-Text (0-1), null wenn kein expected_missing_slots gesetzt oder kein clarification-Result. */
  slotCoverage: number | null;
  /** Falls clarification: die Frage selbst (zur Inspektion im Report). */
  clarifQuestion?: string;
}

interface PerCategoryStats {
  n: number;
  recallMean: number;
  offTargetRate: number;
}

interface AggregateMetrics {
  n: number;
  nNonEdge: number;
  nEdge: number;
  nErrored: number;
  recallAtThreeMean: number;
  offTargetRate: number;
  perCategory: Record<Category, PerCategoryStats>;
  latencyMsMean: number;
  totalEurCents: number;
  totalUsdCents: number;
  totalCalls: number;
  totalTokens: number;
  edgeCaseEmptyTopK: number;
  edgeCaseLeakHits: number;
  // Phase-2-Erweiterungen (D-15):
  /** Zahl der Eintraege mit expected_clarification === true (ohne Errors). */
  nExpectedClarif: number;
  /** Zahl der Eintraege mit expected_clarification !== true UND ohne Errors. */
  nExpectedNoClarif: number;
  /** Anteil der expected_clarification=true, die korrekt clarification erhielten. null wenn nExpectedClarif === 0. */
  clarifPrecision: number | null;
  /** Anteil der expected_clarification=false, die faelschlich clarification erhielten. null wenn nExpectedNoClarif === 0. */
  clarifFalschPosRate: number | null;
  /** Mittelwert slotCoverage ueber Eintraege mit definierter slotCoverage (diagnostisch). */
  slotCoverageMean: number | null;
}

interface Flags {
  snapshot: boolean;
  replayDir: string | null;
  mdSummary: boolean;
}

// --- CLI-Flags ----------------------------------------------------------

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { snapshot: false, replayDir: null, mdSummary: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--snapshot") {
      flags.snapshot = true;
    } else if (a === "--md-summary") {
      flags.mdSummary = true;
    } else if (a === "--replay") {
      const next = argv[i + 1];
      if (!next) {
        console.error(`${LOG_PREFIX} --replay benoetigt ein Verzeichnis als Argument.`);
        process.exit(2);
      }
      flags.replayDir = next;
      i++;
    } else {
      console.error(
        `${LOG_PREFIX} Unbekanntes Flag: ${a}\n` +
          `Nutzung:\n` +
          `  npx tsx --env-file=.env.local scripts/eval-matcher.ts\n` +
          `  npx tsx --env-file=.env.local scripts/eval-matcher.ts --snapshot\n` +
          `  npx tsx --env-file=.env.local scripts/eval-matcher.ts --replay <dir>\n` +
          `  npx tsx --env-file=.env.local scripts/eval-matcher.ts --md-summary\n`
      );
      process.exit(2);
    }
  }
  if (flags.snapshot && flags.replayDir) {
    console.error(`${LOG_PREFIX} --snapshot und --replay sind nicht gleichzeitig erlaubt.`);
    process.exit(2);
  }
  return flags;
}

// --- Korpus laden + validieren -----------------------------------------

/**
 * Laedt das Korpus und validiert alle programmId-Referenzen gegen
 * data/foerderprogramme.json. Bricht VOR dem ersten LLM-Call ab,
 * wenn eine ID unbekannt ist (Schutz gegen Tippfehler im Korpus).
 *
 * Phase-2-Erweiterung: prueft expected_missing_slots auf erlaubte Werte.
 * Bei Drift: warn (kein fail) — diagnostisches Feld, nicht PR-Gate-Kritisch.
 */
async function loadKorpusAndValidate(): Promise<KorpusEntry[]> {
  const korpusRaw = await readFile(KORPUS_PATH, "utf-8");
  const korpus = JSON.parse(korpusRaw) as KorpusEntry[];
  if (!Array.isArray(korpus)) {
    console.error(`${LOG_PREFIX} matcher-korpus.json ist kein JSON-Array auf Top-Ebene.`);
    process.exit(2);
  }

  const programmeRaw = await readFile(PROGRAMME_PATH, "utf-8");
  const programme = JSON.parse(programmeRaw) as Foerderprogramm[];
  const validIds = new Set(programme.map((p) => p.id));

  for (const entry of korpus) {
    if (!entry.id || !entry.category || !entry.anliegen) {
      console.error(
        `${LOG_PREFIX} Eintrag ohne id/category/anliegen gefunden: ${JSON.stringify(entry).slice(0, 120)}`
      );
      process.exit(2);
    }
    if (!Array.isArray(entry.expected_top3) || !Array.isArray(entry.expected_off_target)) {
      console.error(
        `${LOG_PREFIX} Eintrag ${entry.id}: expected_top3/expected_off_target muessen Arrays sein.`
      );
      process.exit(2);
    }
    for (const id of entry.expected_top3) {
      if (!validIds.has(id)) {
        console.error(
          `${LOG_PREFIX} Eintrag ${entry.id}: expected_top3-ID "${id}" nicht in foerderprogramme.json`
        );
        process.exit(2);
      }
    }
    for (const id of entry.expected_off_target) {
      if (!validIds.has(id)) {
        console.error(
          `${LOG_PREFIX} Eintrag ${entry.id}: expected_off_target-ID "${id}" nicht in foerderprogramme.json`
        );
        process.exit(2);
      }
    }
    // Phase 2 (D-14): expected_missing_slots-Validation — warn-only, kein fail.
    if (entry.expected_missing_slots !== undefined) {
      if (!Array.isArray(entry.expected_missing_slots)) {
        console.warn(
          `${LOG_PREFIX} Eintrag ${entry.id}: expected_missing_slots ist kein Array — Eintrag ignoriert die Slot-Coverage-Metrik.`
        );
      } else {
        for (const slot of entry.expected_missing_slots) {
          if (!ALLOWED_SLOTS.includes(slot as Slot)) {
            console.warn(
              `${LOG_PREFIX} Eintrag ${entry.id}: expected_missing_slots enthaelt unerlaubten Wert "${slot}" (erlaubt: ${ALLOWED_SLOTS.join(", ")}) — Eintrag ignoriert.`
            );
          }
        }
      }
    }
  }

  return korpus;
}

// --- Matcher-Aufruf (Live oder Replay) ---------------------------------

function entryToMatchInput(entry: KorpusEntry): MatchInput {
  const input: MatchInput = { anliegen: entry.anliegen };
  if (entry.schulname !== undefined) input.schulname = entry.schulname;
  if (entry.schultyp !== undefined) input.schultyp = entry.schultyp;
  if (entry.bundesland !== undefined) input.bundesland = entry.bundesland;
  if (entry.geschaetztesBudgetEur !== undefined)
    input.geschaetztesBudgetEur = entry.geschaetztesBudgetEur;
  // WR-03: forceRanking + previousAnliegen aus Korpus uebernehmen, damit kuenftige
  // D-09-Test-Eintraege im Snapshot dokumentiert sind und das Replay den Override-
  // /Praezisierungs-Pfad korrekt reproduziert.
  if (entry.forceRanking !== undefined) input.forceRanking = entry.forceRanking;
  if (entry.previousAnliegen !== undefined) input.previousAnliegen = entry.previousAnliegen;
  return input;
}

/**
 * Phase-2-Snapshot-Shim (Pitfall 3 aus 02-RESEARCH.md):
 * Alte Phase-1-Snapshots haben `result.matches[].begruendung` und KEIN `result.kind`.
 * Diese werden hier zu Phase-2-Format hochgemappt:
 * - `kind: "ranking"`
 * - `m.begruendung` -> `m.passt_weil`, `m.achtung_bei = ""`
 *
 * Phase-2-Snapshots (mit `kind`) werden unveraendert durchgereicht.
 */
function migrateOldSnapshot(snap: { input: MatchInput; result: any }): {
  input: MatchInput;
  result: MatchResult;
} {
  const r = snap.result;
  if (r && r.kind !== undefined) {
    // bereits Phase-2-Format
    return snap as { input: MatchInput; result: MatchResult };
  }
  if (r && Array.isArray(r.matches)) {
    // Phase-1-Format: matches mit begruendung, kein kind-Feld
    const migrated: MatchResult = {
      kind: "ranking" as const,
      matches: r.matches.map((m: any) => ({
        id: m.id,
        score: m.score,
        passt_weil: m.passt_weil ?? m.begruendung ?? "",
        achtung_bei: m.achtung_bei ?? "",
        programm: m.programm,
      })),
      costs: r.costs ?? emptyLedger(),
      totalCandidates: r.totalCandidates ?? 0,
      filteredOut: r.filteredOut ?? 0,
    };
    return { input: snap.input, result: migrated };
  }
  // Fallback: leeres Ranking
  return {
    input: snap.input,
    result: {
      kind: "ranking" as const,
      matches: [],
      costs: emptyLedger(),
      totalCandidates: 0,
      filteredOut: 0,
    },
  };
}

async function loadReplayResult(
  replayDir: string,
  entryId: string
): Promise<{ input: MatchInput; result: MatchResult }> {
  const snapPath = resolve(REPO, replayDir, `${entryId}.json`);
  const raw = await readFile(snapPath, "utf-8");
  const parsed = JSON.parse(raw) as { input: MatchInput; result: any };
  return migrateOldSnapshot(parsed);
}

// --- Per-Entry-Auswertung ----------------------------------------------

function computeRecall(expected: string[], actualIds: string[]): number | null {
  if (expected.length === 0) return null;
  const actualSet = new Set(actualIds);
  let hits = 0;
  for (const id of expected) if (actualSet.has(id)) hits++;
  return hits / expected.length;
}

function computeOffTargetHit(offTargets: string[], actualIds: string[]): boolean {
  const actualSet = new Set(actualIds);
  for (const id of offTargets) if (actualSet.has(id)) return true;
  return false;
}

/**
 * D-14 Slot-Coverage: misst soft (per Wort-Vorkommen), wie viele der erwarteten
 * fehlenden Slots im Klaerungsfrage-Text adressiert werden. Diagnostisch, nicht PR-Gate.
 *
 * Rueckgabe: 0..1, oder 1.0 falls expectedSlots leer.
 */
function computeSlotCoverage(frage: string, expectedSlots: Slot[]): number {
  if (expectedSlots.length === 0) return 1.0;
  const lower = frage.toLowerCase();
  const keywords: Record<Slot, string[]> = {
    bundesland: [
      "bundesland",
      "land",
      "region",
      "wo ",
      "welchem land",
      "berlin",
      "bayern",
      "nrw",
      "hessen",
      "sachsen",
      "hamburg",
      "bremen",
      "thueringen",
      "thüringen",
      "baden",
      "wuerttemberg",
      "württemberg",
      "rheinland",
      "schleswig",
      "mecklenburg",
      "niedersachsen",
      "saarland",
      "brandenburg",
    ],
    zielgruppe: [
      "zielgruppe",
      "schultyp",
      "schulform",
      "klasse",
      "klassenstufe",
      "wer",
      "schueler",
      "schüler",
      "kinder",
      "jugendliche",
      "grundschule",
      "gymnasium",
      "oberschule",
      "realschule",
      "gesamtschule",
      "stadtteilschule",
      "foerderschule",
      "förderschule",
      "alter",
    ],
    thema: [
      "thema",
      "schwerpunkt",
      "fokus",
      "bereich",
      "worum",
      "was genau",
      "welches projekt",
      "art",
      "richtung",
      "inhalt",
    ],
  };
  let hits = 0;
  for (const slot of expectedSlots) {
    const kws = keywords[slot] ?? [slot];
    if (kws.some((kw) => lower.includes(kw))) hits++;
  }
  return hits / expectedSlots.length;
}

// --- Aggregation -------------------------------------------------------

function aggregate(results: EntryResult[]): AggregateMetrics {
  const ok = results.filter((r) => r.error === undefined);
  const nonEdge = ok.filter((r) => r.recall !== null);
  const edge = ok.filter((r) => r.recall === null);

  const recallAtThreeMean =
    nonEdge.length === 0
      ? 0
      : nonEdge.reduce((s, r) => s + (r.recall ?? 0), 0) / nonEdge.length;
  const offTargetCount = nonEdge.filter((r) => r.offTargetHit === true).length;
  const offTargetRate = nonEdge.length === 0 ? 0 : offTargetCount / nonEdge.length;

  const perCategory: Record<Category, PerCategoryStats> = {
    kurz: { n: 0, recallMean: 0, offTargetRate: 0 },
    ausfuehrlich: { n: 0, recallMean: 0, offTargetRate: 0 },
    vag: { n: 0, recallMean: 0, offTargetRate: 0 },
  };
  for (const cat of ["kurz", "ausfuehrlich", "vag"] as const) {
    const subset = nonEdge.filter((r) => r.category === cat);
    perCategory[cat] = {
      n: subset.length,
      recallMean:
        subset.length === 0
          ? 0
          : subset.reduce((s, r) => s + (r.recall ?? 0), 0) / subset.length,
      offTargetRate:
        subset.length === 0
          ? 0
          : subset.filter((r) => r.offTargetHit === true).length / subset.length,
    };
  }

  const latencyMsMean =
    ok.length === 0 ? 0 : ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length;

  const totalEurCents = ok.reduce((s, r) => s + r.costs.eurCents, 0);
  const totalUsdCents = ok.reduce((s, r) => s + r.costs.usdCents, 0);
  const totalCalls = ok.reduce((s, r) => s + r.costs.calls, 0);
  const totalTokens = ok.reduce((s, r) => s + r.costs.totalTokens, 0);

  // Edge-Case-Metriken (Phase 1, D-11)
  const edgeCaseEmptyTopK = edge.filter((r) => r.actual_top3.length === 0).length;
  const edgeCaseLeakHits = edge.filter((r) => r.offTargetHit === true).length;

  // Phase-2-Metriken (D-15): Clarification-Precision / Falsch-Pos-Rate / Slot-Coverage
  const expectedClarifEntries = ok.filter((r) => r.expectedClarification);
  const expectedNoClarifEntries = ok.filter((r) => !r.expectedClarification);
  const nExpectedClarif = expectedClarifEntries.length;
  const nExpectedNoClarif = expectedNoClarifEntries.length;
  const clarifPrecision =
    nExpectedClarif === 0
      ? null
      : expectedClarifEntries.filter((r) => r.clarifResult === "hit").length / nExpectedClarif;
  const clarifFalschPosRate =
    nExpectedNoClarif === 0
      ? null
      : expectedNoClarifEntries.filter((r) => r.clarifResult === "false_pos").length /
        nExpectedNoClarif;

  const slotCovered = ok.filter((r) => r.slotCoverage !== null);
  const slotCoverageMean =
    slotCovered.length === 0
      ? null
      : slotCovered.reduce((s, r) => s + (r.slotCoverage ?? 0), 0) / slotCovered.length;

  return {
    n: results.length,
    nNonEdge: nonEdge.length,
    nEdge: edge.length,
    nErrored: results.length - ok.length,
    recallAtThreeMean,
    offTargetRate,
    perCategory,
    latencyMsMean,
    totalEurCents: Math.round(totalEurCents * 100) / 100,
    totalUsdCents: Math.round(totalUsdCents * 100) / 100,
    totalCalls,
    totalTokens,
    edgeCaseEmptyTopK,
    edgeCaseLeakHits,
    nExpectedClarif,
    nExpectedNoClarif,
    clarifPrecision,
    clarifFalschPosRate,
    slotCoverageMean,
  };
}

// --- main --------------------------------------------------------------

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  console.log("=".repeat(80));
  console.log("Matcher-Eval — Live-Lauf");
  console.log("=".repeat(80));
  console.log(
    `${LOG_PREFIX} Modus: ${flags.replayDir ? `replay (${flags.replayDir})` : flags.snapshot ? "live+snapshot" : "live"}`
  );

  const korpus = await loadKorpusAndValidate();
  console.log(`${LOG_PREFIX} Korpus geladen: ${korpus.length} Eintraege, alle programmIds valide.`);

  const isoStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const snapshotDir = flags.snapshot ? resolve(SNAPSHOTS_DIR_BASE, isoStamp) : null;
  if (snapshotDir) {
    await mkdir(snapshotDir, { recursive: true });
    console.log(`${LOG_PREFIX} Snapshots werden geschrieben nach: ${snapshotDir}`);
  }

  const results: EntryResult[] = [];
  let aggLedger: CostLedger = emptyLedger();

  for (const entry of korpus) {
    const input = entryToMatchInput(entry);
    console.log(`\n>>> Eintrag ${entry.id} (${entry.category}) startet ...`);
    const t0 = Date.now();

    let result: MatchResult | null = null;
    let errMsg: string | undefined;
    try {
      if (flags.replayDir) {
        const replay = await loadReplayResult(flags.replayDir, entry.id);
        result = replay.result;
      } else {
        result = await runMatch(input);
      }
    } catch (err) {
      // Soft-Failure: Eintrag-Fehler bricht den Lauf nicht ab.
      errMsg = String(err instanceof Error ? err.message : err);
      console.warn(
        `${LOG_PREFIX} Eintrag ${entry.id} fehlgeschlagen, weiter mit naechstem:`,
        errMsg
      );
    }

    const latencyMs = Date.now() - t0;
    const expectedClarification = entry.expected_clarification ?? false;

    if (!result || errMsg !== undefined) {
      results.push({
        id: entry.id,
        category: entry.category,
        expected_top3: entry.expected_top3,
        expected_off_target: entry.expected_off_target,
        actual_top3: [],
        recall: null,
        offTargetHit: null,
        latencyMs,
        costs: { eurCents: 0, usdCents: 0, calls: 0, totalTokens: 0 },
        totalCandidates: 0,
        filteredOut: 0,
        error: errMsg ?? "unknown",
        expectedClarification,
        clarifResult: "not_applicable",
        slotCoverage: null,
      });
      continue;
    }

    if (snapshotDir) {
      const snapPath = resolve(snapshotDir, `${entry.id}.json`);
      await writeFile(snapPath, JSON.stringify({ input, result }, null, 2));
    }

    // Tagged-Union dispatchen (D-08).
    let actualTop3: EntryResult["actual_top3"] = [];
    let recall: number | null = null;
    let offTargetHit: boolean | null = null;
    let totalCandidatesVal = 0;
    let filteredOutVal = 0;
    let clarifResult: EntryResult["clarifResult"] = "not_applicable";
    let slotCoverage: number | null = null;
    let clarifQuestion: string | undefined;

    if (result.kind === "clarification") {
      // Klaerungsfrage: kein Ranking, keine Recall/Off-Target-Bewertung
      clarifQuestion = result.question;
      clarifResult = expectedClarification ? "hit" : "false_pos";
      // Slot-Coverage nur messen, wenn im Korpus annotiert
      if (
        Array.isArray(entry.expected_missing_slots) &&
        entry.expected_missing_slots.length > 0
      ) {
        // Filter auf erlaubte Slot-Werte (Drift-Schutz)
        const validSlots = entry.expected_missing_slots.filter((s): s is Slot =>
          ALLOWED_SLOTS.includes(s as Slot)
        );
        if (validSlots.length > 0) {
          slotCoverage = computeSlotCoverage(result.question, validSlots);
        }
      }
    } else {
      // result.kind === "ranking"
      actualTop3 = result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        passt_weil: m.passt_weil,
        achtung_bei: m.achtung_bei,
      }));
      const actualIds = actualTop3.map((m) => m.id);
      recall = computeRecall(entry.expected_top3, actualIds);
      offTargetHit = computeOffTargetHit(entry.expected_off_target, actualIds);
      totalCandidatesVal = result.totalCandidates;
      filteredOutVal = result.filteredOut;
      // expected=true UND ranking → miss; expected=false UND ranking → not_applicable (das ist der Soll-Fall)
      clarifResult = expectedClarification ? "miss" : "not_applicable";
    }

    // Ledger nur im Live-Modus akkumulieren — bei Replay sind das die alten
    // Kosten aus dem Snapshot, nicht der aktuelle Lauf.
    if (!flags.replayDir) {
      for (const e of result.costs.entries) {
        aggLedger = addUsage(aggLedger, e.model, {
          promptTokens: e.promptTokens,
          candidatesTokens: e.candidatesTokens,
        });
      }
    }

    const entryResult: EntryResult = {
      id: entry.id,
      category: entry.category,
      expected_top3: entry.expected_top3,
      expected_off_target: entry.expected_off_target,
      actual_top3: actualTop3,
      recall,
      offTargetHit,
      latencyMs,
      costs: {
        eurCents: result.costs.eurCents,
        usdCents: result.costs.usdCents,
        calls: result.costs.calls,
        totalTokens: result.costs.totalTokens,
      },
      totalCandidates: totalCandidatesVal,
      filteredOut: filteredOutVal,
      expectedClarification,
      clarifResult,
      slotCoverage,
    };
    if (clarifQuestion !== undefined) entryResult.clarifQuestion = clarifQuestion;
    results.push(entryResult);

    const actualIds = actualTop3.map((m) => m.id);
    const recallStr = recall === null ? (result.kind === "clarification" ? "n/a (clarif)" : "edge-case") : recall.toFixed(2);
    const offTargetStr = offTargetHit === null ? "n/a" : String(offTargetHit);
    const slotCovStr = slotCoverage === null ? "" : `  Slot-Cov: ${(slotCoverage * 100).toFixed(0)}%`;
    console.log(
      `  Top-3: [${actualIds.join(", ")}]  Recall: ${recallStr}  Clarif: ${clarifResult}${slotCovStr}  Off-Target: ${offTargetStr}  Latenz: ${(latencyMs / 1000).toFixed(2)}s`
    );
  }

  const m = aggregate(results);

  // --- Konsolen-Bericht ------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("Matcher-Eval — Konsolen-Bericht");
  console.log("=".repeat(80));
  console.log(
    `Eintraege: ${m.n} (Non-Edge: ${m.nNonEdge}, Edge: ${m.nEdge}, Errored: ${m.nErrored})`
  );
  console.log(`Recall@3 Mittelwert: ${m.recallAtThreeMean.toFixed(3)}`);
  console.log(`Off-Target-Rate:     ${(m.offTargetRate * 100).toFixed(1)} %`);
  // Phase-2-Metriken (D-15)
  console.log(
    `Clarif-Precision:    ${
      m.clarifPrecision === null ? "n/a (keine expected_clarification=true)" : (m.clarifPrecision * 100).toFixed(1) + " %"
    }  (von ${m.nExpectedClarif} erwarteten Klaerungs-Eintraegen)`
  );
  console.log(
    `Clarif-FalschPos:    ${
      m.clarifFalschPosRate === null
        ? "n/a (keine expected_clarification=false)"
        : (m.clarifFalschPosRate * 100).toFixed(1) + " %"
    }  (von ${m.nExpectedNoClarif} erwarteten Ranking-Eintraegen)`
  );
  if (m.slotCoverageMean !== null) {
    console.log(`Slot-Coverage (diag): ${(m.slotCoverageMean * 100).toFixed(1)} %`);
  }
  console.log("\nPer-Kategorie:");
  for (const cat of ["kurz", "ausfuehrlich", "vag"] as const) {
    const c = m.perCategory[cat];
    console.log(
      `  ${cat.padEnd(13)} n=${c.n}  recall ${c.recallMean.toFixed(3)}  off-target ${(c.offTargetRate * 100).toFixed(1)} %`
    );
  }
  console.log(`\nLatenz/Eintrag: ${(m.latencyMsMean / 1000).toFixed(2)}s avg`);
  console.log(
    `Gesamtkosten:   ${
      flags.replayDir
        ? "< 0,01 EUR (replay-modus, keine LLM-Calls)"
        : formatEur(m.totalEurCents)
    }`
  );
  console.log(
    `\nEdge-Cases (n=${m.nEdge}): ${m.edgeCaseEmptyTopK} mit leerer Matcher-Liste, ${m.edgeCaseLeakHits} mit Off-Target-Leak.`
  );

  // --- JSON-Report -----------------------------------------------------
  await mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = resolve(REPORTS_DIR, `${isoStamp}.json`);
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      korpusPath: "data/eval/matcher-korpus.json",
      korpusSize: korpus.length,
      mode: flags.replayDir ? "replay" : flags.snapshot ? "live+snapshot" : "live",
      replayDir: flags.replayDir ?? null,
      matcherFile: "lib/wizard/matcher.ts",
    },
    aggregate: m,
    perEntry: results,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON-Bericht: ${reportPath}`);

  // --- Optional: Markdown-Summary -------------------------------------
  if (flags.mdSummary) {
    const mdPath = reportPath.replace(/\.json$/, ".md");
    const md = [
      `# Matcher-Eval Bericht ${isoStamp}`,
      ``,
      `- Korpus: ${korpus.length} Eintraege`,
      `- Modus: ${report.meta.mode}`,
      `- **Recall@3 Mittelwert:** ${m.recallAtThreeMean.toFixed(3)}`,
      `- **Off-Target-Rate:** ${(m.offTargetRate * 100).toFixed(1)} %`,
      `- **Clarif-Precision:** ${
        m.clarifPrecision === null ? "n/a" : (m.clarifPrecision * 100).toFixed(1) + " %"
      } (n=${m.nExpectedClarif})`,
      `- **Clarif-FalschPos-Rate:** ${
        m.clarifFalschPosRate === null
          ? "n/a"
          : (m.clarifFalschPosRate * 100).toFixed(1) + " %"
      } (n=${m.nExpectedNoClarif})`,
      m.slotCoverageMean === null
        ? `- **Slot-Coverage:** n/a`
        : `- **Slot-Coverage (diag):** ${(m.slotCoverageMean * 100).toFixed(1)} %`,
      `- **Latenz/Eintrag:** ${(m.latencyMsMean / 1000).toFixed(2)}s avg`,
      `- **Gesamtkosten:** ${
        flags.replayDir ? "< 0,01 EUR (replay)" : formatEur(m.totalEurCents)
      }`,
      ``,
      `## Per-Kategorie`,
      ``,
      `| Kategorie | n | Recall@3 | Off-Target |`,
      `|---|---|---|---|`,
      ...(["kurz", "ausfuehrlich", "vag"] as const).map((cat) => {
        const c = m.perCategory[cat];
        return `| ${cat} | ${c.n} | ${c.recallMean.toFixed(3)} | ${(c.offTargetRate * 100).toFixed(1)} % |`;
      }),
      ``,
      `## Edge-Cases`,
      ``,
      `- n = ${m.nEdge}`,
      `- Mit leerer Matcher-Liste: ${m.edgeCaseEmptyTopK}`,
      `- Mit Off-Target-Leak: ${m.edgeCaseLeakHits}`,
      ``,
    ].join("\n");
    await writeFile(mdPath, md);
    console.log(`Markdown-Summary: ${mdPath}`);
  }

  // --- D-16/D-17 Threshold-Gate ----------------------------------------
  // Mechanischer PR-Gate: process.exit(1) bei Verfehlung mind. eines Targets.
  // Null-Werte (clarifPrecision/clarifFalschPosRate ohne entsprechende Korpus-Eintraege)
  // gelten als pass — kein erzwungenes Failing bei strukturell unmessbaren Targets.
  console.log("\n" + "=".repeat(80));
  console.log("D-16 Threshold-Gate (PR-Gate)");
  console.log("=".repeat(80));
  // WR-04: Korpus-Drift-Warnung — null gilt im Gate weiterhin als pass (siehe unten),
  // aber 0 Eintraege mit expected_clarification=true (oder =false) maskiert das
  // Clarif-Target strukturell. Sichtbare Warnung beugt Silent-Pass nach Refactor vor.
  if (m.nExpectedClarif === 0) {
    console.warn(
      `[GATE] WARNUNG: 0 Eintraege mit expected_clarification=true im Korpus. ` +
      `Clarif-Precision-Target wird strukturell NICHT gemessen — Korpus pruefen!`
    );
  }
  if (m.nExpectedNoClarif === 0) {
    console.warn(
      `[GATE] WARNUNG: 0 Eintraege mit expected_clarification=false im Korpus. ` +
      `Clarif-FalschPos-Target wird strukturell NICHT gemessen — Korpus pruefen!`
    );
  }
  const gate: Record<string, boolean> = {
    "Recall@3 >= 0.42": m.recallAtThreeMean >= 0.42,
    "Off-Target < 5%": m.offTargetRate < 0.05,
    "Clarif-Precision >= 80%":
      m.clarifPrecision === null || m.clarifPrecision >= 0.80,
    "Clarif-FalschPos <= 10%":
      m.clarifFalschPosRate === null || m.clarifFalschPosRate <= 0.10,
  };
  for (const [target, ok] of Object.entries(gate)) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${target}`);
  }
  const failed = Object.entries(gate)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  if (failed.length > 0) {
    console.error(
      `\n[GATE FAILED] ${failed.length} Target(s) nicht erfuellt: ${failed.join(", ")}`
    );
    console.log(`\n${LOG_PREFIX} Lauf abgeschlossen (mit Gate-Verfehlung).`);
    process.exit(1);
  }
  console.log("\n[GATE PASSED] Alle D-16-Targets erfuellt.");
  console.log(`\n${LOG_PREFIX} Lauf abgeschlossen.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`${LOG_PREFIX} Crash:`, e);
  process.exit(1);
});
