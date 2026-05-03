/**
 * Eval-Skript für den Programm-Matcher (lib/wizard/matcher.ts).
 * Lädt data/eval/matcher-korpus.json, ruft runMatch pro Eintrag auf,
 * berechnet Recall@3 + Off-Target-Rate + Edge-Case-Metrik, schreibt
 * JSON-Bericht nach data/eval/reports/<ISO>.json.
 *
 * Read-only gegen den Matcher — keine Code-Änderungen an lib/wizard/matcher.ts.
 *
 * Flags:
 *   (default)        — Live-DeepSeek-Calls, ~3 Cent für 30 Einträge
 *   --snapshot       — speichert Matcher-Output je Eintrag in data/eval/snapshots/<ISO>/
 *   --replay <dir>   — evaluiert gegen gespeicherte Snapshots ohne LLM-Calls
 *   --md-summary     — schreibt zusätzlich data/eval/reports/<ISO>.md
 *
 * Run: `npx tsx --env-file=.env.local scripts/eval-matcher.ts [flags]`
 * Alias: `npm run eval:matcher` (gleicher Effekt, ohne Flags).
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
}

interface EntryResult {
  id: string;
  category: Category;
  expected_top3: string[];
  expected_off_target: string[];
  actual_top3: Array<{ id: string; score: number; begruendung: string }>;
  /** Recall@3, null bei Edge-Cases (expected_top3.length === 0) oder bei Errors. */
  recall: number | null;
  /** True, wenn mindestens ein expected_off_target im Matcher-Top-3 auftaucht. */
  offTargetHit: boolean | null;
  latencyMs: number;
  costs: { eurCents: number; usdCents: number; calls: number; totalTokens: number };
  totalCandidates: number;
  filteredOut: number;
  /** Bei Soft-Failure (runMatch wirft) gesetzt. */
  error?: string;
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
        console.error(`${LOG_PREFIX} --replay benötigt ein Verzeichnis als Argument.`);
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
 * Lädt das Korpus und validiert alle programmId-Referenzen gegen
 * data/foerderprogramme.json. Bricht VOR dem ersten LLM-Call ab,
 * wenn eine ID unbekannt ist (Schutz gegen Tippfehler im Korpus).
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
        `${LOG_PREFIX} Eintrag ${entry.id}: expected_top3/expected_off_target müssen Arrays sein.`
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
  return input;
}

async function loadReplayResult(
  replayDir: string,
  entryId: string
): Promise<{ input: MatchInput; result: MatchResult }> {
  const snapPath = resolve(REPO, replayDir, `${entryId}.json`);
  const raw = await readFile(snapPath, "utf-8");
  return JSON.parse(raw) as { input: MatchInput; result: MatchResult };
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

  // Edge-Case-Metriken (D-11)
  const edgeCaseEmptyTopK = edge.filter((r) => r.actual_top3.length === 0).length;
  const edgeCaseLeakHits = edge.filter((r) => r.offTargetHit === true).length;

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
  console.log(`${LOG_PREFIX} Korpus geladen: ${korpus.length} Einträge, alle programmIds valide.`);

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
        `${LOG_PREFIX} Eintrag ${entry.id} fehlgeschlagen, weiter mit nächstem:`,
        errMsg
      );
    }

    const latencyMs = Date.now() - t0;

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
      });
      continue;
    }

    if (snapshotDir) {
      const snapPath = resolve(snapshotDir, `${entry.id}.json`);
      await writeFile(snapPath, JSON.stringify({ input, result }, null, 2));
    }

    const actualIds = result.matches.map((m) => m.id);
    const recall = computeRecall(entry.expected_top3, actualIds);
    const offTargetHit = computeOffTargetHit(entry.expected_off_target, actualIds);

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

    results.push({
      id: entry.id,
      category: entry.category,
      expected_top3: entry.expected_top3,
      expected_off_target: entry.expected_off_target,
      actual_top3: result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        begruendung: m.begruendung,
      })),
      recall,
      offTargetHit,
      latencyMs,
      costs: {
        eurCents: result.costs.eurCents,
        usdCents: result.costs.usdCents,
        calls: result.costs.calls,
        totalTokens: result.costs.totalTokens,
      },
      totalCandidates: result.totalCandidates,
      filteredOut: result.filteredOut,
    });

    console.log(
      `  Top-3: [${actualIds.join(", ")}]  Recall: ${
        recall === null ? "edge-case" : recall.toFixed(2)
      }  Off-Target-Hit: ${offTargetHit}  Latenz: ${(latencyMs / 1000).toFixed(2)}s`
    );
  }

  const m = aggregate(results);

  // --- Konsolen-Bericht ------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("Matcher-Eval — Konsolen-Bericht");
  console.log("=".repeat(80));
  console.log(
    `Einträge: ${m.n} (Non-Edge: ${m.nNonEdge}, Edge: ${m.nEdge}, Errored: ${m.nErrored})`
  );
  console.log(`Recall@3 Mittelwert: ${m.recallAtThreeMean.toFixed(3)}`);
  console.log(`Off-Target-Rate:     ${(m.offTargetRate * 100).toFixed(1)} %`);
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
        ? "< 0,01 € (replay-modus, keine LLM-Calls)"
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
      `- Korpus: ${korpus.length} Einträge`,
      `- Modus: ${report.meta.mode}`,
      `- **Recall@3 Mittelwert:** ${m.recallAtThreeMean.toFixed(3)}`,
      `- **Off-Target-Rate:** ${(m.offTargetRate * 100).toFixed(1)} %`,
      `- **Latenz/Eintrag:** ${(m.latencyMsMean / 1000).toFixed(2)}s avg`,
      `- **Gesamtkosten:** ${
        flags.replayDir ? "< 0,01 € (replay)" : formatEur(m.totalEurCents)
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

  console.log(`\n${LOG_PREFIX} Lauf abgeschlossen.`);
}

main().catch((e) => {
  console.error(`${LOG_PREFIX} Crash:`, e);
  process.exit(1);
});
