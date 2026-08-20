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
 *   --korpus <pfad>   — anderer Korpus statt data/eval/pipeline-korpus.json
 *                       (z. B. aus scripts/eval-simuser.ts). Schaltet das
 *                       Threshold-Gate auf warning-only, siehe unten.
 *
 * Run: `npx tsx --env-file=.env.local scripts/eval-pipeline.ts [flags]`
 *
 * Exit-Codes:
 *   0  Threshold-Gate PASSED (oder kein Baseline-Eintrag zum Vergleich)
 *   1  Threshold-Gate FAILED (WIZ-01 oder WIZ-02 unter Baseline-2σ) ODER Crash
 *   2  CLI-Fehler / Korpus-Validation fehlgeschlagen / Snapshot-Fehler
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { bestimmeAntragsart } from "@/lib/wizard/antragsart";
import { getGeberGruppe, ALL_GEBER_GRUPPEN } from "@/lib/wizard/geber-classification";
import { PIPELINE_CONFIG } from "@/lib/wizard/config";
import { MODEL_FLASH, MODEL_PRO } from "@/lib/wizard/llm";
import { emptyLedger, addUsage, formatEur } from "@/lib/wizard/pricing";
import { pruefeSubstanz, substanzQuote, splitFinalText } from "@/lib/wizard/substanz";
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
import type { Wiz04Result } from "./eval-pipeline-internals";
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
  istWiz03Skip,
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
const KORPUS_DEFAULT = resolve(REPO, "data/eval/pipeline-korpus.json");
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
  --korpus <pfad>           anderer Korpus (Gate wird dann warning-only)

Konflikt: --snapshot und --replay können nicht gleichzeitig verwendet werden.

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
    korpus: null,
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
        console.error(`${LOG_PREFIX} --replay benötigt ein Verzeichnis als Argument.`);
        printUsage();
        process.exit(2);
      }
      flags.replay = next;
      i++;
    } else if (a === "--single") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        console.error(`${LOG_PREFIX} --single benötigt eine Entry-ID als Argument.`);
        printUsage();
        process.exit(2);
      }
      flags.single = next;
      i++;
    } else if (a === "--korpus") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        console.error(`${LOG_PREFIX} --korpus benötigt einen Pfad als Argument.`);
        printUsage();
        process.exit(2);
      }
      flags.korpus = next;
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
    console.error(`${LOG_PREFIX} --snapshot und --replay können nicht gleichzeitig verwendet werden.`);
    printUsage();
    process.exit(2);
  }

  return flags;
}

// ============================================================================
// Korpus laden + validieren
// ============================================================================

async function loadKorpusAndValidate(
  single?: string | null,
  korpusPfad?: string | null
): Promise<PipelineKorpusEntry[]> {
  const pfad = korpusPfad ? resolve(REPO, korpusPfad) : KORPUS_DEFAULT;
  let korpusRaw: string;
  try {
    korpusRaw = await readFile(pfad, "utf-8");
  } catch (err) {
    console.error(
      `${LOG_PREFIX} Korpus-Datei nicht gefunden: ${pfad}`
    );
    process.exit(2);
  }

  let korpus: PipelineKorpusEntry[];
  try {
    korpus = JSON.parse(korpusRaw) as PipelineKorpusEntry[];
  } catch {
    console.error(`${LOG_PREFIX} ${pfad} ist kein valides JSON.`);
    process.exit(2);
  }

  if (!Array.isArray(korpus)) {
    console.error(`${LOG_PREFIX} ${pfad} ist kein JSON-Array auf Top-Ebene.`);
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
        `${LOG_PREFIX} Eintrag ${entry.id}: expected_geber_gruppe "${entry.expected_geber_gruppe}" ist kein gültiger Wert (${[...validGeberGruppen].join(", ")})`
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
  let snapPath = resolve(replayDir, `${entryId}-run${runIndex}.json`);
  let raw: string;
  try {
    raw = await readFile(snapPath, "utf-8");
  } catch {
    // Fallback: angeforderter Run fehlt -> niedrigsten vorhandenen Run dieses
    // Eintrags verwenden. Baseline-Snapshots koennen einzelne Run-Luecken haben
    // (z. B. Generierungs-Fehler beim Baseline-Lauf); fuer den Replay genuegt
    // ein repraesentativer Snapshot pro Eintrag.
    let fallback: string | null = null;
    try {
      const candidates = (await readdir(replayDir))
        .filter((f) => f.startsWith(`${entryId}-run`) && f.endsWith(".json"))
        .map((f) => ({ f, n: parseInt(f.match(/-run(\d+)\.json$/)?.[1] ?? "999", 10) }))
        .sort((a, b) => a.n - b.n);
      if (candidates.length > 0) fallback = candidates[0].f;
    } catch {
      /* readdir-Fehler -> unten als nicht gefunden behandeln */
    }
    if (!fallback) {
      console.error(
        `${LOG_PREFIX} Snapshot-Datei nicht gefunden: ${snapPath} (kein Run für ${entryId} vorhanden)`
      );
      process.exit(2);
    }
    snapPath = resolve(replayDir, fallback);
    console.warn(
      `${LOG_PREFIX} ${entryId}-run${runIndex}.json fehlt — nutze ${fallback} als Ersatz.`
    );
    raw = await readFile(snapPath, "utf-8");
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
      `${LOG_PREFIX} Weder --live noch --replay angegeben. Bitte einen Modus wählen.`
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

  // WIZ-04 Begruendungs-Substanz — deterministisch, laeuft auch im Replay
  // (misst gespeicherte Artefakte neu, kein LLM, keine Kosten).
  // Gemessen wird die FINALE FASSUNG (das Kunden-Artefakt) — die Revision
  // repariert Substanz-Findings, und genau das muss die Metrik sehen.
  // Fallback auf die Entwurfs-Abschnitte nur, wenn finalText fehlt.
  const wiz04Sections = artefacts.finalText
    ? splitFinalText(artefacts.finalText)
    : (artefacts.sections ?? []).map((s) => ({ name: s.name, text: s.text ?? "" }));
  const wiz04Befunde = wiz04Sections
    .map((s) => pruefeSubstanz(s.name, s.text))
    .filter((b) => b.relevant);
  const wiz04Quote = substanzQuote(wiz04Sections);
  const wiz04: Wiz04Result = {
    score: wiz04Quote === null ? null : Math.round(wiz04Quote * 1000) / 10,
    relevante: wiz04Befunde.length,
    mitSubstanz: wiz04Befunde.filter((b) => b.hatSubstanz).length,
  };

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
    wiz04,
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
        `${LOG_PREFIX}   [${entry.id}] Run ${i}/${flags.N}: WIZ-01=${score.wiz01.coveragePercent.toFixed(0)}% WIZ-02=${score.wiz02.score.toFixed(0)} WIZ-03=${score.wiz03.score} WIZ-04=${score.wiz04.score === null ? "n/a" : score.wiz04.score.toFixed(0) + "%"}`
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
        wiz04: { score: null, relevante: 0, mitSubstanz: 0 },
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
  const wiz04Scores: number[] = [];
  const finanzplanScores: number[] = [];
  let nErrored = 0;
  let wiz03JudgeFehler = 0;
  let wiz03Uebersprungen = 0;
  let wiz03Bewertet = 0;

  const geberGruppeMap = new Map<GeberGruppe, { wiz01: number[]; wiz02: number[]; wiz03: number[] }>();
  const dossierMap = new Map<string, { wiz01: number[]; wiz02: number[] }>();

  for (const [, { entry, scores }] of allResults) {
    const erroredRuns = scores.filter((s) => s.error);
    if (erroredRuns.length > 0) nErrored++;

    const validScores = scores.filter((s) => !s.error);
    if (validScores.length === 0) continue;

    // WIZ-03-Judge-Fehler zaehlen, BEVOR die Nullen ins Mittel wandern.
    for (const s of validScores) {
      wiz03Bewertet++;
      if (!s.wiz03.error) continue;
      if (istWiz03Skip(s.wiz03.error)) wiz03Uebersprungen++;
      else wiz03JudgeFehler++;
    }

    // Mean ueber N Runs pro Eintrag
    const entryWiz01Mean =
      validScores.reduce((s, x) => s + x.wiz01.coveragePercent, 0) / validScores.length;
    const entryWiz02Mean =
      validScores.reduce((s, x) => s + x.wiz02.score, 0) / validScores.length;
    const entryWiz03Mean =
      validScores.reduce((s, x) => s + x.wiz03.score, 0) / validScores.length;
    // Finanzplan: nur Runs mit bewertbarem Plan (score != null). Ein Preis kennt
    // keinen Finanzteil — er fliesst nicht als 0 ein, sondern gar nicht.
    const finanzplanValid = validScores
      .map((x) => x.finanzplan?.score)
      .filter((v): v is number => typeof v === "number");
    const entryFinanzplanMean =
      finanzplanValid.length > 0
        ? finanzplanValid.reduce((s, x) => s + x, 0) / finanzplanValid.length
        : null;

    // WIZ-04: nur Runs mit messbarer Quote (score != null); ein Eintrag ganz
    // ohne relevante Abschnitte fliesst nicht ein (statt als 0 oder 100 zu luegen).
    const wiz04Valid = validScores
      .map((x) => x.wiz04?.score)
      .filter((v): v is number => typeof v === "number");
    if (wiz04Valid.length > 0) {
      wiz04Scores.push(wiz04Valid.reduce((s, x) => s + x, 0) / wiz04Valid.length);
    }

    wiz01Scores.push(entryWiz01Mean);
    wiz02Scores.push(entryWiz02Mean);
    wiz03Scores.push(entryWiz03Mean);
    if (entryFinanzplanMean !== null) finanzplanScores.push(entryFinanzplanMean);

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
    wiz04: aggregateNRuns(wiz04Scores),
    finanzplan: aggregateNRuns(finanzplanScores),
    perGeberGruppe,
    perDossier,
    wiz03JudgeFehler,
    wiz03Uebersprungen,
    wiz03Bewertet,
  };
}

/**
 * Messgeraet-Pruefung (Befund 17.08.2026). Der CI-Eval lief nach dem Wechsel auf
 * Mistral mit WIZ-03 = 0,0 (σ 0,0) ueber ALLE 25 Eintraege durch und meldete
 * GATE PASSED — der Workflow gab `MISTRAL_API_KEY` nicht weiter, `scoreWiz03`
 * verschluckte jeden 401 und lieferte `score: 0`. Weil WIZ-03 warning-only ist,
 * winkte das Gate eine totgelegte Metrik durch (drop=64,60).
 *
 * Ein defektes Messgeraet ist kein schlechtes Messergebnis. Deshalb hart, und
 * ausdruecklich UNABHAENGIG von warning-only:
 *  - Judge-Fehler in mehr als 10 % der bewerteten Runs → Abbruch (Exit 2, Setup).
 *  - jede Metrik mit mean 0,0 UND stddev 0,0 bei n > 1 → Abbruch (Backstop, falls
 *    eine kuenftige Score-Funktion ihre Fehler anders verschluckt).
 * Einzelne transiente Fehler (≤ 10 %) sind nur eine Warnung mit Zahl — ein
 * Netzhaenger soll die Batterie nicht rot machen, aber auch nicht unsichtbar sein.
 * Exportiert fuer Tests.
 */
export function pruefeMessgeraet(metrics: AggregateMetrics): string[] {
  const befunde: string[] = [];

  if (metrics.wiz03Bewertet > 0 && metrics.wiz03JudgeFehler > 0) {
    const anteil = metrics.wiz03JudgeFehler / metrics.wiz03Bewertet;
    if (anteil > 0.1) {
      befunde.push(
        `WIZ-03-Judge antwortete in ${metrics.wiz03JudgeFehler} von ${metrics.wiz03Bewertet} Runs nicht ` +
          `(${(anteil * 100).toFixed(0)} %). Die betroffenen Runs stehen als 0 im Mittel — die Zahl ist ` +
          `KEIN Qualitätsurteil. Ursache prüfen (API-Key des Judge-Modells, Netz, Modell-ID); ` +
          `in CI: gibt der Workflow den Key des Judge-Providers weiter?`
      );
    }
  }

  const metrikPaare: Array<[string, ScoreStat]> = [
    ["WIZ-01", metrics.wiz01],
    ["WIZ-02", metrics.wiz02],
    ["WIZ-03", metrics.wiz03],
    ["WIZ-04", metrics.wiz04],
    ["Finanzplan", metrics.finanzplan],
  ];
  for (const [name, stat] of metrikPaare) {
    if (stat.runs.length > 1 && stat.mean === 0 && stat.stddev === 0) {
      befunde.push(
        `${name} ist über alle ${stat.runs.length} Einträge exakt 0,0 bei σ 0,0. Eine Metrik ohne ` +
          `jede Streuung ist ein defektes Messgerät, kein Ergebnis.`
      );
    }
  }

  return befunde;
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
    `| WIZ-03 (Tonalitäts-Passung) | ${m.wiz03.mean.toFixed(1)} | ${m.wiz03.stddev.toFixed(1)} |`,
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
  /** null, solange BASELINE.md noch keine WIZ-04-Zeile traegt (aeltere Staende). */
  wiz04: ScoreStat | null;
} | null> {
  if (!existsSync(BASELINE_MD_PATH)) return null;

  const raw = await readFile(BASELINE_MD_PATH, "utf-8");
  // Einfaches Pattern: sucht letzte Phase-5-Baseline-Tabelle
  // Format: | WIZ-01 (Pflichtabschnitte) | XX.X | X.X | ...
  const tablePattern =
    /WIZ-01[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)[\s\S]*?WIZ-02[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)[\s\S]*?WIZ-03[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)/;
  const m = raw.match(tablePattern);
  if (!m) return null;

  // WIZ-04 separat und tolerant: aeltere BASELINE.md-Staende haben die Zeile
  // nicht — dann laeuft das Gate fuer WIZ-04 nicht (statt zu crashen).
  const m04 = raw.match(/WIZ-04[^|]*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);

  return {
    wiz01: { mean: parseFloat(m[1]), stddev: parseFloat(m[2]), runs: [] },
    wiz02: { mean: parseFloat(m[3]), stddev: parseFloat(m[4]), runs: [] },
    wiz03: { mean: parseFloat(m[5]), stddev: parseFloat(m[6]), runs: [] },
    wiz04: m04 ? { mean: parseFloat(m04[1]), stddev: parseFloat(m04[2]), runs: [] } : null,
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
    `${LOG_PREFIX}   WIZ-03:  mean=${metrics.wiz03.mean.toFixed(1)}  stddev=${metrics.wiz03.stddev.toFixed(1)}` +
      (metrics.wiz03JudgeFehler > 0 || metrics.wiz03Uebersprungen > 0
        ? `  [Judge-Fehler ${metrics.wiz03JudgeFehler}, übersprungen ${metrics.wiz03Uebersprungen} von ${metrics.wiz03Bewertet}]`
        : "")
  );
  console.log(
    `${LOG_PREFIX}   WIZ-04:  mean=${metrics.wiz04.mean.toFixed(1)}  stddev=${metrics.wiz04.stddev.toFixed(1)}  (Begründungs-Substanz)`
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
  const korpus = await loadKorpusAndValidate(flags.single, flags.korpus);
  console.log(`${LOG_PREFIX} Korpus geladen: ${korpus.length} Eintraege`);

  // Was der Replay-Modus NICHT beurteilen kann — bitte nicht wegkuerzen.
  //
  // Befund 19.08.2026: Beim Prompt-Caching-Umbau (Umsortierung in
  // buildSectionPrompt) lief der CI-Gate gruen durch, OHNE die Aenderung
  // ueberhaupt sehen zu koennen. Der PR-Trigger dieses Workflows feuert bei
  // `lib/wizard/**`, faehrt dort aber immer `--replay` — und Replay bewertet
  // AUFGEZEICHNETE Artefakte neu, ruft also kein Modell auf. Alles, was sich
  // auf das auswirkt, was ANS MODELL GEHT (Prompts, Pipeline-Logik, Provider,
  // Modellwahl), ist fuer Replay unsichtbar. Ein gruener Haken heisst dann nur:
  // "die Bewertungslogik ist unveraendert" — nicht "die Qualitaet stimmt noch".
  if (flags.replay) {
    console.log(
      `${LOG_PREFIX} ⚠️  REPLAY misst die Bewertungs-Logik gegen gespeicherte Artefakte — ` +
        `es laeuft KEIN Modell.\n` +
        `${LOG_PREFIX}    Damit ist dieser Lauf BLIND fuer alles, was aendert, was ans Modell geht: ` +
        `Prompts (lib/wizard/prompts.ts), Pipeline-Logik, Provider, Modellwahl.\n` +
        `${LOG_PREFIX}    Wer daran etwas geaendert hat, braucht --live. Ein gruenes Replay belegt es NICHT.`
    );
  }

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

  // Messgeraet-Pruefung VOR dem Gate: ein defektes Messgeraet darf nicht als
  // Ergebnis durchgewinkt werden (Befund 17.08.2026, siehe pruefeMessgeraet).
  const messgeraetBefunde = pruefeMessgeraet(metrics);
  if (messgeraetBefunde.length > 0) {
    console.error(`${LOG_PREFIX}`);
    console.error(`${LOG_PREFIX} ===== MESSGERÄT DEFEKT =====`);
    for (const b of messgeraetBefunde) console.error(`${LOG_PREFIX}   ✗ ${b}`);
    console.error(
      `${LOG_PREFIX} Abbruch ohne Gate-Urteil — die Zahlen dieses Laufs sind nicht auswertbar.`
    );
    process.exit(2);
  }

  // Threshold-Gate (D-25)
  const baseline = await loadBaselineFromMd();
  if (baseline) {
    console.log(`${LOG_PREFIX}`);
    console.log(`${LOG_PREFIX} ===== Threshold-Gate-Check =====`);
    const gateW01 = passesThreshold(metrics.wiz01, baseline.wiz01, "WIZ-01");
    const gateW02 = passesThreshold(metrics.wiz02, baseline.wiz02, "WIZ-02");
    const gateW03 = passesThreshold(metrics.wiz03, baseline.wiz03, "WIZ-03");
    const gateW04 = baseline.wiz04
      ? passesThreshold(metrics.wiz04, baseline.wiz04, "WIZ-04")
      : null;

    console.log(
      `${LOG_PREFIX}   WIZ-01 (hart):         ${gateW01.passed ? "PASSED" : "FAILED"} — ${gateW01.reason}`
    );
    console.log(
      `${LOG_PREFIX}   WIZ-02 (mittel):       ${gateW02.passed ? "PASSED" : "FAILED"} — ${gateW02.reason}`
    );
    console.log(
      `${LOG_PREFIX}   WIZ-03 (warning-only): ${gateW03.passed ? "OK" : "WARN"} — ${gateW03.reason}`
    );
    if (gateW04) {
      // HART, weil deterministisch: kein Judge-Rauschen, das WIZ-03 zur
      // Dauer-Warnung gemacht hat. Faellt die Substanz-Quote unter
      // Baseline-2σ, hat jemand die Begruendung wieder wegoptimiert.
      console.log(
        `${LOG_PREFIX}   WIZ-04 (hart):         ${gateW04.passed ? "PASSED" : "FAILED"} — ${gateW04.reason}`
      );
    } else {
      console.log(
        `${LOG_PREFIX}   WIZ-04:                kein Baseline-Eintrag — Gate inaktiv (BASELINE.md ergänzen)`
      );
    }

    const verletzt = !gateW01.passed || !gateW02.passed || (gateW04 !== null && !gateW04.passed);

    if (flags.korpus) {
      // Die Schwellwerte in BASELINE.md stammen aus dem handautorisierten Korpus.
      // Ein anderer Korpus hat andere Antworten und damit eine andere natuerliche
      // Hoehe — ein hartes Gate wuerde hier nicht Regression messen, sondern den
      // Korpuswechsel. Also melden statt blockieren; die Zahlen sind trotzdem
      // aussagekraeftig, aber nur GEGEN EINEN LAUF DESSELBEN KORPUS.
      console.log(
        `${LOG_PREFIX}   ⚠️  --korpus gesetzt (${flags.korpus}) — Gate ist warning-only.` +
          ` Die Baseline-Schwellwerte gelten für data/eval/pipeline-korpus.json;` +
          ` vergleiche diesen Lauf nur mit einem anderen Lauf DESSELBEN Korpus.`
      );
      console.log(`${LOG_PREFIX} [GATE ${verletzt ? "WARN" : "OK"} — nicht blockierend]`);
    } else if (verletzt) {
      console.error(`${LOG_PREFIX} [GATE FAILED] Regression unter Baseline-2σ erkannt.`);
      process.exit(1);
    } else {
      console.log(`${LOG_PREFIX} [GATE PASSED]`);
    }
  } else {
    console.log(
      `${LOG_PREFIX} Kein Phase-5-Baseline-Eintrag in BASELINE.md gefunden — Gate-Check übersprungen.`
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
