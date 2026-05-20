/**
 * Eval-Skript fuer die Generate-Pipeline (lib/wizard/pipeline.ts).
 * Laedt data/eval/pipeline-korpus.json, ruft runPipeline pro Eintrag auf,
 * berechnet WIZ-01 (Pflichtabschnitt-Coverage), WIZ-02 (Halluzinations-Detection),
 * WIZ-03 (LLM-as-Judge Tonalitaet), Finanzplan-Sub-Metrik.
 * Schreibt Snapshots + Reports + optionales Markdown-Summary.
 * 2σ-Threshold-Gate (D-25): WIZ-01 hart, WIZ-02 mittel, WIZ-03 warning-only.
 *
 * Flags:
 *   (default)         — kein LLM-Call, erwartet --replay oder --live
 *   --live            — erzwingt LLM-Calls via runPipeline()
 *   --replay <dir>    — evaluiert gegen gespeicherte Snapshots ohne LLM-Calls
 *   --N=<1-5>         — Anzahl Runs pro Eintrag (default 1, max 5; T-05-04-01-Mitigation)
 *   --snapshot        — schreibt Snapshots nach data/eval/pipeline-snapshots/<ISO>/
 *   --md-summary      — schreibt MD-Report nach data/eval/pipeline-reports/<ISO>.md
 *   --deep            — aktiviert WIZ-02 Layer 3 LLM-Judge (teurer!)
 *   --pro-judge       — schaltet WIZ-03-Judge auf deepseek-v4-pro
 *   --single <id>     — evaluiert nur diesen Korpus-Eintrag (Pre-Closure-Smoke)
 *
 * Run: `npx tsx --env-file=.env.local scripts/eval-pipeline.ts [flags]`
 *
 * Exit-Codes:
 *   0  Threshold-Gate PASSED (oder kein Baseline-Eintrag zum Vergleich)
 *   1  Threshold-Gate FAILED (WIZ-01 oder WIZ-02 unter Baseline-2σ) ODER Crash
 *   2  CLI-Fehler / Korpus-Validation fehlgeschlagen / Snapshot-Fehler
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { getGeberGruppe, ALL_GEBER_GRUPPEN } from "@/lib/wizard/geber-classification";
import { PIPELINE_CONFIG } from "@/lib/wizard/config";
import { MODEL_FLASH, MODEL_PRO } from "@/lib/wizard/llm";
import { emptyLedger, addUsage, formatEur } from "@/lib/wizard/pricing";
import type { GeberGruppe } from "@/lib/wizard/geber-classification";

const execFile = promisify(execFileCb);

// Re-Exporte aus eval-pipeline-internals fuer Test-Importe
export {
  SNAPSHOT_SCHEMA_VERSION,
  LOG_PREFIX,
  HALLU_REGEX_PATTERNS,
  RUBRIC_OEFFENTLICH,
  RUBRIC_STIFTUNG,
  RUBRIC_EU,
  RUBRIC_WIRTSCHAFTSPREIS,
  RUBRIC_VERBAND_UNI,
  RUBRICS,
  JUDGE_SYSTEM,
  buildJudgeUserPrompt,
  normalizeAbschnittName,
  extractContext,
  scoreWiz01,
  scoreWiz02,
  scoreWiz03,
  scoreFinanzplan,
  aggregateNRuns,
  passesThreshold,
} from "./eval-pipeline-internals";
export type {
  PipelineKorpusEntry,
  PipelineSnapshot,
  Wiz01Result,
  Wiz02Result,
  Wiz03Result,
  FinanzplanSubResult,
  ScoreStat,
  AggregateMetrics,
  Flags,
  EntryScores,
  PerGeberGruppeStats,
  PerDossierStats,
  JudgeRubric,
  JudgeResponse,
  MarkerHit,
  RegexHit,
} from "./eval-pipeline-internals";

import {
  SNAPSHOT_SCHEMA_VERSION,
  LOG_PREFIX,
  scoreWiz01,
  scoreWiz02,
  scoreWiz03,
  scoreFinanzplan,
  aggregateNRuns,
  passesThreshold,
  normalizeAbschnittName,
} from "./eval-pipeline-internals";
import type {
  PipelineKorpusEntry,
  PipelineSnapshot,
  AggregateMetrics,
  Flags,
  EntryScores,
  ScoreStat,
  PerGeberGruppeStats,
  PerDossierStats,
} from "./eval-pipeline-internals";

// ============================================================================
// Pfad-Konstanten
// ============================================================================

const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/pipeline-korpus.json");
const REPORTS_DIR = resolve(REPO, "data/eval/pipeline-reports");
const SNAPSHOTS_DIR_BASE = resolve(REPO, "data/eval/pipeline-snapshots");
const RICHTLINIEN_DIR = resolve(REPO, "data/richtlinien");
const PROGRAMME_PATH = resolve(REPO, "data/foerderprogramme.json");
const BASELINE_MD_PATH = resolve(REPO, "data/eval/BASELINE.md");

// ============================================================================
// CLI-Flags
// ============================================================================

function printUsage(): void {
  console.error(
    `Nutzung:
  npx tsx --env-file=.env.local scripts/eval-pipeline.ts [flags]

Flags:
  --live                    erzwingt LLM-Calls via runPipeline()
  --replay <dir>            evaluiert gegen gespeicherte Snapshots (kein LLM)
  --N=<1-5>                 Anzahl Runs pro Eintrag (default 1)
  --snapshot                schreibt Snapshots nach data/eval/pipeline-snapshots/<ISO>/
  --md-summary              schreibt MD-Report
  --deep                    aktiviert WIZ-02 Layer 3 LLM-Judge
  --pro-judge               schaltet WIZ-03-Judge auf deepseek-v4-pro
  --single <entry-id>       evaluiert nur diesen Korpus-Eintrag

Konflikt: --snapshot und --replay koennen nicht gleichzeitig verwendet werden.

Exit-Codes:
  0  Gate PASSED (oder keine Baseline)
  1  Gate FAILED oder Crash
  2  CLI-Fehler / Validierungsfehler`
  );
}

export function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    live: false,
    snapshot: false,
    replay: null,
    N: 1,
    deep: false,
    proJudge: false,
    mdSummary: false,
    single: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") {
      flags.live = true;
    } else if (a === "--snapshot") {
      flags.snapshot = true;
    } else if (a === "--md-summary") {
      flags.mdSummary = true;
    } else if (a === "--deep") {
      flags.deep = true;
    } else if (a === "--pro-judge") {
      flags.proJudge = true;
    } else if (a === "--replay") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        console.error(`${LOG_PREFIX} --replay benoetigt ein Verzeichnis als Argument.`);
        printUsage();
        process.exit(2);
      }
      flags.replay = next;
      i++;
    } else if (a === "--single") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        console.error(`${LOG_PREFIX} --single benoetigt eine Entry-ID als Argument.`);
        printUsage();
        process.exit(2);
      }
      flags.single = next;
      i++;
    } else if (a.startsWith("--N=")) {
      const val = parseInt(a.slice(4), 10);
      if (isNaN(val) || val < 1 || val > 5) {
        console.error(
          `${LOG_PREFIX} --N muss eine Zahl zwischen 1 und 5 sein (erhalten: ${a.slice(4)}).`
        );
        printUsage();
        process.exit(2);
      }
      flags.N = val;
    } else {
      console.error(`${LOG_PREFIX} Unbekanntes Flag: ${a}`);
      printUsage();
      process.exit(2);
    }
  }

  // Konflikt-Check: --snapshot + --replay gleichzeitig
  if (flags.snapshot && flags.replay) {
    console.error(`${LOG_PREFIX} --snapshot und --replay koennen nicht gleichzeitig verwendet werden.`);
    printUsage();
    process.exit(2);
  }

  return flags;
}

// ============================================================================
// Korpus laden + validieren
// ============================================================================

async function loadKorpusAndValidate(single?: string | null): Promise<PipelineKorpusEntry[]> {
  let korpusRaw: string;
  try {
    korpusRaw = await readFile(KORPUS_PATH, "utf-8");
  } catch (err) {
    console.error(
      `${LOG_PREFIX} Korpus-Datei nicht gefunden: ${KORPUS_PATH}`
    );
    process.exit(2);
  }

  let korpus: PipelineKorpusEntry[];
  try {
    korpus = JSON.parse(korpusRaw) as PipelineKorpusEntry[];
  } catch {
    console.error(`${LOG_PREFIX} pipeline-korpus.json ist kein valides JSON.`);
    process.exit(2);
  }

  if (!Array.isArray(korpus)) {
    console.error(`${LOG_PREFIX} pipeline-korpus.json ist kein JSON-Array auf Top-Ebene.`);
    process.exit(2);
  }

  // Programme-FK-Validation
  const programmeRaw = await readFile(PROGRAMME_PATH, "utf-8");
  const programme = JSON.parse(programmeRaw) as Foerderprogramm[];
  const validProgrammeIds = new Set(programme.map((p) => p.id));

  // Geber-Gruppe-Validation
  const validGeberGruppen = new Set<string>(ALL_GEBER_GRUPPEN);

  for (const entry of korpus) {
    if (!entry.id || !entry.category) {
      console.error(
        `${LOG_PREFIX} Eintrag ohne id/category: ${JSON.stringify(entry).slice(0, 120)}`
      );
      process.exit(2);
    }
    if (!validProgrammeIds.has(entry.programmId)) {
      console.error(
        `${LOG_PREFIX} Eintrag ${entry.id}: programmId "${entry.programmId}" nicht in foerderprogramme.json`
      );
      process.exit(2);
    }
    if (!validGeberGruppen.has(entry.expected_geber_gruppe)) {
      console.error(
        `${LOG_PREFIX} Eintrag ${entry.id}: expected_geber_gruppe "${entry.expected_geber_gruppe}" ist kein gueltiger Wert (${[...validGeberGruppen].join(", ")})`
      );
      process.exit(2);
    }
    if (!Array.isArray(entry.expected_forbidden_markers)) {
      console.error(
        `${LOG_PREFIX} Eintrag ${entry.id}: expected_forbidden_markers muss ein Array sein.`
      );
      process.exit(2);
    }
  }

  // --single Filter
  if (single) {
    const filtered = korpus.filter((e) => e.id === single);
    if (filtered.length === 0) {
      console.error(`${LOG_PREFIX} --single: Entry-ID "${single}" nicht im Korpus gefunden.`);
      process.exit(2);
    }
    return filtered;
  }

  return korpus;
}

// ============================================================================
// Snapshot-Load / Schema-Version-Check (Pitfall 3)
// ============================================================================

export async function loadReplaySnapshot(
  replayDir: string,
  entryId: string,
  runIndex: number
): Promise<PipelineSnapshot> {
  const snapPath = resolve(replayDir, `${entryId}-run${runIndex}.json`);
  let raw: string;
  try {
    raw = await readFile(snapPath, "utf-8");
  } catch {
    console.error(
      `${LOG_PREFIX} Snapshot-Datei nicht gefunden: ${snapPath}`
    );
    process.exit(2);
  }

  let snap: PipelineSnapshot;
  try {
    snap = JSON.parse(raw) as PipelineSnapshot;
  } catch {
    console.error(`${LOG_PREFIX} Snapshot ${snapPath} ist kein valides JSON.`);
    process.exit(2);
  }

  if (snap.meta?.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    console.error(
      `${LOG_PREFIX} Snapshot-Schema-Version-Mismatch in ${snapPath}: ` +
        `erwartet ${SNAPSHOT_SCHEMA_VERSION}, gefunden ${snap.meta?.schemaVersion}. ` +
        `Bitte Snapshot neu generieren (--live --snapshot).`
    );
    process.exit(2);
  }

  return snap;
}

// ============================================================================
// Live-Pipeline-Run + Snapshot-Schreiben
// ============================================================================

async function runPipelineForKorpus(
  entry: PipelineKorpusEntry,
  runIndex: number,
  programme: Foerderprogramm[],
  snapshotDir: string | null
): Promise<PipelineSnapshot> {
  const programm = programme.find((p) => p.id === entry.programmId);
  if (!programm) {
    throw new Error(`Programm ${entry.programmId} nicht in foerderprogramme.json`);
  }

  const richtlinie = await loadRichtlinie(entry.programmId);
  const messages: WizardMessage[] = entry.userAnswers.map((a, idx) => ({
    id: String(idx),
    role: a.role,
    kind: a.kind,
    content: a.content,
    at: new Date().toISOString(),
  }));

  const startMs = Date.now();
  const pipelineResult = await runPipeline(
    programm,
    entry.facts,
    richtlinie,
    undefined,
    messages
  );
  const latencyMs = Date.now() - startMs;

  // Git-SHA (best-effort via execFile — kein shell-injection-Risiko da keine User-Inputs)
  let pipelineCommitSha = "unknown";
  try {
    const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: REPO });
    pipelineCommitSha = stdout.trim().slice(0, 8);
  } catch {
    // ignorieren wenn git nicht verfuegbar
  }

  const snap: PipelineSnapshot = {
    korpus_id: entry.id,
    input: {
      programm,
      facts: entry.facts,
      richtlinie,
      messages,
    },
    result: pipelineResult,
    meta: {
      iso: new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19),
      runIndex: runIndex as 1 | 2 | 3,
      pipelineCommitSha,
      featureFlags: {
        useVorbildFormulierungen: String(PIPELINE_CONFIG.useVorbildFormulierungen),
        complianceStageEnabled: String(PIPELINE_CONFIG.complianceStageEnabled),
        sharpPrompts: String(PIPELINE_CONFIG.sharpPrompts),
        geberRoutingV2: String(PIPELINE_CONFIG.geberRoutingV2),
      },
      latencyMs,
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    },
  };

  if (snapshotDir) {
    await mkdir(snapshotDir, { recursive: true });
    const snapPath = resolve(snapshotDir, `${entry.id}-run${runIndex}.json`);
    await writeFile(snapPath, JSON.stringify(snap, null, 2), "utf-8");
    console.log(`${LOG_PREFIX}   Snapshot geschrieben: ${snapPath}`);
  }

  return snap;
}

// ============================================================================
// Score-Berechnung pro Eintrag
// ============================================================================

async function evaluateEntry(
  entry: PipelineKorpusEntry,
  flags: Flags,
  runIndex: number,
  snapshotDir: string | null,
  programme: Foerderprogramm[],
  judgeModel: string
): Promise<EntryScores> {
  let snap: PipelineSnapshot;

  if (flags.replay) {
    const replayPath = resolve(REPO, flags.replay);
    snap = await loadReplaySnapshot(replayPath, entry.id, runIndex);
  } else if (flags.live) {
    snap = await runPipelineForKorpus(entry, runIndex, programme, snapshotDir);
  } else {
    console.error(
      `${LOG_PREFIX} Weder --live noch --replay angegeben. Bitte einen Modus waehlen.`
    );
    process.exit(2);
  }

  const artefacts = snap.result.artefacts;
  const richtlinie = snap.input.richtlinie;
  const userAnswers = entry.userAnswers
    .filter((a) => a.role === "user")
    .map((a) => a.content);

  const wiz01 = scoreWiz01(artefacts, richtlinie);
  const wiz02 = scoreWiz02(
    artefacts,
    entry.expected_forbidden_markers,
    userAnswers,
    entry.facts
  );

  const gruppe = getGeberGruppe(entry.programmId);
  const wiz03 = await scoreWiz03(artefacts.finalText ?? "", gruppe, judgeModel);

  // Finanzplan-Hallu-Marker zaehlen (aus Layer-1-Hits die im Finanzplan gefunden wurden)
  const finanzplanHalluCount = wiz02.layer1MarkerHitsDetail.filter(
    (h) =>
      h.foundIn === "finanzplan-bezeichnung" || h.foundIn === "finanzplan-begruendung"
  ).length;
  const finanzplan = scoreFinanzplan(artefacts.finanzplan, richtlinie, finanzplanHalluCount);

  return {
    wiz01,
    wiz02,
    wiz03,
    finanzplan,
    latencyMs: 0,
  };
}

// ============================================================================
// N-Runs pro Eintrag
// ============================================================================

async function runForEntry(
  entry: PipelineKorpusEntry,
  flags: Flags,
  snapshotDir: string | null,
  programme: Foerderprogramm[],
  judgeModel: string
): Promise<EntryScores[]> {
  const results: EntryScores[] = [];
  for (let i = 1; i <= flags.N; i++) {
    try {
      const score = await evaluateEntry(
        entry,
        flags,
        i,
        snapshotDir,
        programme,
        judgeModel
      );
      results.push(score);
      console.log(
        `${LOG_PREFIX}   [${entry.id}] Run ${i}/${flags.N}: WIZ-01=${score.wiz01.coveragePercent.toFixed(0)}% WIZ-02=${score.wiz02.score.toFixed(0)} WIZ-03=${score.wiz03.score}`
      );
    } catch (err) {
      // Soft-Failure pro Eintrag — kein Abbruch (RESEARCH Pattern Z.540-585)
      console.error(
        `${LOG_PREFIX}   [${entry.id}] Run ${i}: FEHLER — ${err instanceof Error ? err.message : String(err)}`
      );
      results.push({
        wiz01: {
          pflichtAbschnitteTotal: 0,
          pflichtAbschnitteCovered: 0,
          coveragePercent: 0,
          maxZeichenOK: null,
          maxZeichenViolations: [],
          missingAbschnitte: [],
        },
        wiz02: {
          layer1MarkerHits: 0,
          layer1MarkerExpected: 0,
          layer2RegexHits: 0,
          layer1MarkerHitsDetail: [],
          layer2RegexHitsDetail: [],
          score: 0,
        },
        wiz03: {
          judgeResponse: null,
          score: 0,
          gruppe: entry.expected_geber_gruppe as GeberGruppe,
          error: err instanceof Error ? err.message : String(err),
        },
        finanzplan: {
          vorAutofix: { okFuerFreigabe: false, errorCount: 0, warningCount: 0, gesamtEur: 0 },
          hallu_marker_in_finanzplan: 0,
          score: 0,
        },
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

// ============================================================================
// Aggregation
// ============================================================================

export function aggregate(
  allResults: Map<string, { entry: PipelineKorpusEntry; scores: EntryScores[] }>
): AggregateMetrics {
  const wiz01Scores: number[] = [];
  const wiz02Scores: number[] = [];
  const wiz03Scores: number[] = [];
  const finanzplanScores: number[] = [];
  let nErrored = 0;

  const geberGruppeMap = new Map<GeberGruppe, { wiz01: number[]; wiz02: number[]; wiz03: number[] }>();
  const dossierMap = new Map<string, { wiz01: number[]; wiz02: number[] }>();

  for (const [, { entry, scores }] of allResults) {
    const erroredRuns = scores.filter((s) => s.error);
    if (erroredRuns.length > 0) nErrored++;

    const validScores = scores.filter((s) => !s.error);
    if (validScores.length === 0) continue;

    // Mean ueber N Runs pro Eintrag
    const entryWiz01Mean =
      validScores.reduce((s, x) => s + x.wiz01.coveragePercent, 0) / validScores.length;
    const entryWiz02Mean =
      validScores.reduce((s, x) => s + x.wiz02.score, 0) / validScores.length;
    const entryWiz03Mean =
      validScores.reduce((s, x) => s + x.wiz03.score, 0) / validScores.length;
    const entryFinanzplanMean =
      validScores.reduce((s, x) => s + x.finanzplan.score, 0) / validScores.length;

    wiz01Scores.push(entryWiz01Mean);
    wiz02Scores.push(entryWiz02Mean);
    wiz03Scores.push(entryWiz03Mean);
    finanzplanScores.push(entryFinanzplanMean);

    // Per-Geber-Gruppe
    const gruppe = getGeberGruppe(entry.programmId);
    if (gruppe !== "unknown") {
      if (!geberGruppeMap.has(gruppe)) {
        geberGruppeMap.set(gruppe, { wiz01: [], wiz02: [], wiz03: [] });
      }
      const g = geberGruppeMap.get(gruppe)!;
      g.wiz01.push(entryWiz01Mean);
      g.wiz02.push(entryWiz02Mean);
      g.wiz03.push(entryWiz03Mean);
    }

    // Per-Dossier
    if (!dossierMap.has(entry.programmId)) {
      dossierMap.set(entry.programmId, { wiz01: [], wiz02: [] });
    }
    const d = dossierMap.get(entry.programmId)!;
    d.wiz01.push(entryWiz01Mean);
    d.wiz02.push(entryWiz02Mean);
  }

  // Per-Geber-Gruppe-Breakdown
  const perGeberGruppe: PerGeberGruppeStats[] = [];
  for (const gruppe of ALL_GEBER_GRUPPEN) {
    const g = geberGruppeMap.get(gruppe);
    if (!g || g.wiz01.length === 0) continue;
    perGeberGruppe.push({
      gruppe,
      n: g.wiz01.length,
      wiz01Mean: g.wiz01.reduce((s, x) => s + x, 0) / g.wiz01.length,
      wiz02Mean: g.wiz02.reduce((s, x) => s + x, 0) / g.wiz02.length,
      wiz03Mean: g.wiz03.reduce((s, x) => s + x, 0) / g.wiz03.length,
    });
  }

  // Per-Dossier-Breakdown
  const perDossier: PerDossierStats[] = [];
  for (const [programmId, d] of dossierMap) {
    if (d.wiz01.length === 0) continue;
    perDossier.push({
      programmId,
      n: d.wiz01.length,
      wiz01Mean: d.wiz01.reduce((s, x) => s + x, 0) / d.wiz01.length,
      wiz02Mean: d.wiz02.reduce((s, x) => s + x, 0) / d.wiz02.length,
    });
  }

  return {
    n: allResults.size,
    nErrored,
    wiz01: aggregateNRuns(wiz01Scores),
    wiz02: aggregateNRuns(wiz02Scores),
    wiz03: aggregateNRuns(wiz03Scores),
    finanzplan: aggregateNRuns(finanzplanScores),
    perGeberGruppe,
    perDossier,
  };
}

// ============================================================================
// Report schreiben
// ============================================================================

async function writeReport(
  iso: string,
  metrics: AggregateMetrics,
  allResults: Map<string, { entry: PipelineKorpusEntry; scores: EntryScores[] }>,
  flags: Flags
): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });

  // JSON-Report immer
  const jsonPath = resolve(REPORTS_DIR, `${iso}.json`);
  const reportData = {
    iso,
    flags,
    metrics,
    entries: Object.fromEntries(
      Array.from(allResults.entries()).map(([id, { scores }]) => [id, scores])
    ),
  };
  await writeFile(jsonPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`${LOG_PREFIX} JSON-Report: ${jsonPath}`);

  // MD-Summary optional
  if (flags.mdSummary) {
    const mdPath = resolve(REPORTS_DIR, `${iso}.md`);
    const md = buildMdReport(iso, metrics, flags);
    await writeFile(mdPath, md, "utf-8");
    console.log(`${LOG_PREFIX} MD-Report: ${mdPath}`);
  }
}

function buildMdReport(iso: string, m: AggregateMetrics, flags: Flags): string {
  const lines: string[] = [
    `# Eval-Pipeline-Report ${iso}`,
    ``,
    `**Korpus:** n=${m.n}, Fehler: ${m.nErrored}`,
    `**N-Runs:** ${flags.N}`,
    `**Modus:** ${flags.replay ? `replay (${flags.replay})` : "live"}`,
    ``,
    `## Haupt-Scores`,
    ``,
    `| Achse | Mean | Stddev |`,
    `|-------|------|--------|`,
    `| WIZ-01 (Pflichtabschnitte) | ${m.wiz01.mean.toFixed(1)} | ${m.wiz01.stddev.toFixed(1)} |`,
    `| WIZ-02 (Halluzinations-Detection) | ${m.wiz02.mean.toFixed(1)} | ${m.wiz02.stddev.toFixed(1)} |`,
    `| WIZ-03 (Tonalitaets-Passung) | ${m.wiz03.mean.toFixed(1)} | ${m.wiz03.stddev.toFixed(1)} |`,
    `| Finanzplan-Validity (Sub) | ${m.finanzplan.mean.toFixed(1)} | ${m.finanzplan.stddev.toFixed(1)} |`,
    ``,
  ];

  if (m.perGeberGruppe.length > 0) {
    lines.push(`## Per-Geber-Gruppe (WIZ-03)`);
    lines.push(``);
    lines.push(`| Gruppe | n | WIZ-01 | WIZ-02 | WIZ-03 |`);
    lines.push(`|--------|---|--------|--------|--------|`);
    for (const g of m.perGeberGruppe) {
      lines.push(
        `| ${g.gruppe} | ${g.n} | ${g.wiz01Mean.toFixed(1)} | ${g.wiz02Mean.toFixed(1)} | ${g.wiz03Mean.toFixed(1)} |`
      );
    }
    lines.push(``);
  }

  if (m.perDossier.length > 0) {
    lines.push(`## Per-Dossier (WIZ-01 + WIZ-02)`);
    lines.push(``);
    lines.push(`| Dossier | n | WIZ-01 | WIZ-02 |`);
    lines.push(`|---------|---|--------|--------|`);
    for (const d of m.perDossier) {
      lines.push(
        `| ${d.programmId} | ${d.n} | ${d.wiz01Mean.toFixed(1)} | ${d.wiz02Mean.toFixed(1)} |`
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ============================================================================
// BASELINE.md lesen (fuer Threshold-Gate)
// ============================================================================

export async function loadBaselineFromMd(): Promise<{
  wiz01: ScoreStat;
  wiz02: ScoreStat;
  wiz03: ScoreStat;
} | null> {
  if (!existsSync(BASELINE_MD_PATH)) return null;

  const raw = await readFile(BASELINE_MD_PATH, "utf-8");
  // Einfaches Pattern: sucht letzte Phase-5-Baseline-Tabelle
  // Format: | WIZ-01 (Pflichtabschnitte) | XX.X | X.X | ...
  const tablePattern =
    /WIZ-01[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)[\s\S]*?WIZ-02[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)[\s\S]*?WIZ-03[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)/;
  const m = raw.match(tablePattern);
  if (!m) return null;

  return {
    wiz01: { mean: parseFloat(m[1]), stddev: parseFloat(m[2]), runs: [] },
    wiz02: { mean: parseFloat(m[3]), stddev: parseFloat(m[4]), runs: [] },
    wiz03: { mean: parseFloat(m[5]), stddev: parseFloat(m[6]), runs: [] },
  };
}

// ============================================================================
// Konsolen-Tabelle ausgeben
// ============================================================================

function printConsoleTable(metrics: AggregateMetrics): void {
  console.log(`\n${LOG_PREFIX} ===== Aggregat-Ergebnis =====`);
  console.log(
    `${LOG_PREFIX}   Korpus:  n=${metrics.n}  Fehler=${metrics.nErrored}`
  );
  console.log(
    `${LOG_PREFIX}   WIZ-01:  mean=${metrics.wiz01.mean.toFixed(1)}  stddev=${metrics.wiz01.stddev.toFixed(1)}`
  );
  console.log(
    `${LOG_PREFIX}   WIZ-02:  mean=${metrics.wiz02.mean.toFixed(1)}  stddev=${metrics.wiz02.stddev.toFixed(1)}`
  );
  console.log(
    `${LOG_PREFIX}   WIZ-03:  mean=${metrics.wiz03.mean.toFixed(1)}  stddev=${metrics.wiz03.stddev.toFixed(1)}`
  );
  console.log(
    `${LOG_PREFIX}   Finanzp: mean=${metrics.finanzplan.mean.toFixed(1)}  stddev=${metrics.finanzplan.stddev.toFixed(1)}`
  );

  if (metrics.perGeberGruppe.length > 0) {
    console.log(`${LOG_PREFIX}`);
    console.log(`${LOG_PREFIX}   Per-Geber-Gruppe:`);
    for (const g of metrics.perGeberGruppe) {
      console.log(
        `${LOG_PREFIX}     ${g.gruppe.padEnd(18)} n=${g.n}  WIZ-01=${g.wiz01Mean.toFixed(1)}  WIZ-02=${g.wiz02Mean.toFixed(1)}  WIZ-03=${g.wiz03Mean.toFixed(1)}`
      );
    }
  }
}

// ============================================================================
// main()
// ============================================================================

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  console.log(`${LOG_PREFIX} flags:`, flags);

  const startEpoch = Date.now();

  // Wenn weder --live noch --replay: frueher Fehler
  if (!flags.live && !flags.replay) {
    console.error(
      `${LOG_PREFIX} Bitte --live oder --replay <dir> angeben.`
    );
    printUsage();
    process.exit(2);
  }

  // Replay-Verzeichnis pruefen
  if (flags.replay) {
    const replayPath = resolve(REPO, flags.replay);
    if (!existsSync(replayPath)) {
      console.error(`${LOG_PREFIX} Replay-Verzeichnis nicht gefunden: ${replayPath}`);
      process.exit(2);
    }
  }

  // Korpus laden + validieren
  const korpus = await loadKorpusAndValidate(flags.single);
  console.log(`${LOG_PREFIX} Korpus geladen: ${korpus.length} Eintraege`);

  // Programme laden (fuer Live-Modus)
  const programmeRaw = await readFile(PROGRAMME_PATH, "utf-8");
  const programme = JSON.parse(programmeRaw) as Foerderprogramm[];

  // ISO-Timestamp fuer Reports + Snapshots
  const iso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  // Snapshot-Verzeichnis anlegen
  let snapshotDir: string | null = null;
  if (flags.snapshot) {
    snapshotDir = resolve(SNAPSHOTS_DIR_BASE, iso);
    await mkdir(snapshotDir, { recursive: true });
    console.log(`${LOG_PREFIX} Snapshot-Verzeichnis: ${snapshotDir}`);
  }

  // Judge-Modell
  const judgeModel = flags.proJudge ? MODEL_PRO : MODEL_FLASH;
  console.log(`${LOG_PREFIX} Judge-Modell: ${judgeModel}`);

  // Pro Eintrag N-Runs fahren
  const allResults = new Map<string, { entry: PipelineKorpusEntry; scores: EntryScores[] }>();
  for (const entry of korpus) {
    console.log(`${LOG_PREFIX} [${entry.id}] starte ${flags.N} Run(s)...`);
    const scores = await runForEntry(entry, flags, snapshotDir, programme, judgeModel);
    allResults.set(entry.id, { entry, scores });
  }

  // Aggregation
  const metrics = aggregate(allResults);

  // Konsolen-Tabelle
  printConsoleTable(metrics);

  // Reports schreiben
  await writeReport(iso, metrics, allResults, flags);

  // Threshold-Gate (D-25)
  const baseline = await loadBaselineFromMd();
  if (baseline) {
    console.log(`${LOG_PREFIX}`);
    console.log(`${LOG_PREFIX} ===== Threshold-Gate-Check =====`);
    const gateW01 = passesThreshold(metrics.wiz01, baseline.wiz01, "WIZ-01");
    const gateW02 = passesThreshold(metrics.wiz02, baseline.wiz02, "WIZ-02");
    const gateW03 = passesThreshold(metrics.wiz03, baseline.wiz03, "WIZ-03");

    console.log(
      `${LOG_PREFIX}   WIZ-01 (hart):         ${gateW01.passed ? "PASSED" : "FAILED"} — ${gateW01.reason}`
    );
    console.log(
      `${LOG_PREFIX}   WIZ-02 (mittel):       ${gateW02.passed ? "PASSED" : "FAILED"} — ${gateW02.reason}`
    );
    console.log(
      `${LOG_PREFIX}   WIZ-03 (warning-only): ${gateW03.passed ? "OK" : "WARN"} — ${gateW03.reason}`
    );

    if (!gateW01.passed || !gateW02.passed) {
      console.error(`${LOG_PREFIX} [GATE FAILED] Regression unter Baseline-2σ erkannt.`);
      process.exit(1);
    }
    console.log(`${LOG_PREFIX} [GATE PASSED]`);
  } else {
    console.log(
      `${LOG_PREFIX} Kein Phase-5-Baseline-Eintrag in BASELINE.md gefunden — Gate-Check uebersprungen.`
    );
  }

  const durationSec = ((Date.now() - startEpoch) / 1000).toFixed(0);
  console.log(`${LOG_PREFIX} Fertig in ${durationSec}s.`);
}

// Nur ausfuehren wenn direkt als Skript gestartet (nicht bei import in Tests)
const isMainModule =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] === __filename ||
      process.argv[1]?.replace(/\.js$/, "") === __filename?.replace(/\.js$/, "");

if (isMainModule) {
  main().catch((e) => {
    console.error(`${LOG_PREFIX} Crash:`, e);
    process.exit(1);
  });
}
