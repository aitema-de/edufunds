# Phase 5: Wizard-Pipeline-Tuning + UX-Luecke — Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 24 (12 NEU + 12 MODIFIZIERT/READ)
**Analogs found:** 20 / 24 (4 ohne Analog — Greenfield-Eval-Logik wie Judge-Rubric, Compliance-Stage)

> Sprache: deutsch + ASCII-Umlaut-Konvention (`ae/oe/ue/ss`) gemaess Repo-`CLAUDE.md`.

---

## File Classification

| Datei | NEU/MOD | Rolle | Data Flow | Engstes Analog | Match Quality |
|------|---------|-------|-----------|----------------|---------------|
| `scripts/eval-pipeline.ts` | NEU | CLI-Skript (npx tsx) | Korpus-JSON → runPipeline → Snapshot → Score → JSON+MD-Report | `scripts/eval-matcher.ts` (841 LOC) | **exact** (1-zu-1-Spiegel Phase 1 D-13/D-14) |
| `scripts/check-dossier-coverage.ts` | NEU | CLI-Skript Pre-Flight-Survey | `data/richtlinien/*.json` lesen → Felder-Matrix → `dossier-coverage-baseline.md` schreiben | `scripts/eval-matcher.ts:loadKorpusAndValidate` (Z.185-255) | role-match (read-only Survey-Skript-Pattern) |
| `lib/wizard/geber-classification.ts` | NEU | TS-Modul Mapping-Tabelle | `programmId: string` → `GeberGruppe` Lookup | `lib/wizard/programm-kriterien.ts` (160 LOC) | **exact** (Record-basiertes Mapping + Getter-Funktion) |
| `lib/wizard/config.ts` | NEU | TS-Modul Env-Var-Reader | `process.env.PIPELINE_*` → typed Config-Object | `lib/wizard/llm.ts` (Env-Read am Modul-Start) | role-match (Env-Read-Pattern) |
| `data/eval/pipeline-korpus.json` | NEU | JSON-Daten Top-Level-Array | Statische Korpus-Eintraege | `data/eval/matcher-korpus.json` (Phase 1) | **exact** (JSON-Array, Eintrag-pro-Item) |
| `data/eval/pipeline-snapshots/<ISO>/<id>-runN.json` | NEU | JSON-Daten Snapshot | `runPipeline()`-Output serialisiert | `data/eval/snapshots/2026-05-04-12-32-24/ev-XXX.json` | role-match (ISO-Subordner, JSON pro Entry) |
| `data/eval/pipeline-reports/<ISO>.json` + `.md` | NEU | JSON+MD-Report | Aggregat aus Eval-Lauf | `data/eval/reports/2026-05-XX.json` + `.md` | **exact** (gleiches `meta/aggregate/perEntry`-Schema) |
| `data/eval/README.md` | NEU | Doku Markdown | Static | Keine direkte Analog im Repo | no-analog (Wave 4 D-35) |
| `data/eval/TUNING.md` | NEU | Doku Markdown Append-only | Statisch (Playbook) | `data/eval/BASELINE.md` (append-only Pattern) | role-match (append-only History) |
| `data/eval/dossier-coverage-baseline.md` | NEU | Doku Markdown Pre-Flight-Output | Static, vom Survey-Skript erzeugt | `data/eval/BASELINE.md` | role-match |
| `.github/workflows/pipeline-eval.yml` | NEU | CI-Workflow YAML | PR-Trigger → npx tsx eval-pipeline.ts --replay → Annotation+exit | `.github/workflows/weekly-auto-pflege.yml` | role-match (Sibling-Workflow) |
| `__tests__/eval/pipeline-fk-match.test.ts` | NEU | Jest Unit-Test | Score-Logik gegen Fixtures | `__tests__/lib/wizard/matcher.parser.test.ts` | role-match (pure-function unit-test) |
| `__tests__/eval/pipeline-marker-detection.test.ts` | NEU | Jest Unit-Test | Layer-1 Marker-Detection | `__tests__/lib/wizard/matcher.parser.test.ts` | role-match |
| `__tests__/eval/pipeline-regex-detection.test.ts` | NEU | Jest Unit-Test | Layer-2 Regex + False-Positive | `__tests__/lib/wizard/matcher.parser.test.ts` | role-match |
| `__tests__/eval/pipeline-judge-rubric.test.ts` | NEU | Jest Unit-Test mit LLM-Stub | Rubric-Schema-Check via jest.mock | `__tests__/lib/wizard/pipeline-events.test.ts` (LLM-Mock) | **exact** (jest.mock("@/lib/wizard/llm") Pattern) |
| `__tests__/eval/pipeline-finanzplan-sub.test.ts` | NEU | Jest Unit-Test | validateFinanzplan()-Wrapper | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match (pure-function test) |
| `__tests__/eval/pipeline-determinism.test.ts` | NEU | Jest Unit-Test | N=3 mean/stddev-Berechnung | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match |
| `__tests__/eval/pipeline-snapshot-replay.test.ts` | NEU | Jest Unit-Test | Score-Determinismus bei gleichem Input | `__tests__/lib/wizard/richtlinien-loader.test.ts` | role-match |
| `__tests__/eval/pipeline-aggregation.test.ts` | NEU | Jest Unit-Test | Per-Geber-Gruppe-Breakdown | `__tests__/lib/wizard/matcher.parser.test.ts` | role-match |
| `__tests__/eval/pipeline-gate.test.ts` | NEU | Jest Unit-Test | 2σ-Threshold-Logik pro Achse | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match |
| `__tests__/eval/geber-classification.test.ts` | NEU | Jest Unit-Test | Mapping-Lookup-Verifikation | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match |
| `__tests__/lib/wizard/config.test.ts` | NEU | Jest Unit-Test | Env-Var-Parsing | `__tests__/lib/wizard/facts-extractor.test.ts` | role-match |
| `__tests__/lib/wizard/pipeline.compliance.test.ts` | NEU | Jest Integration-Test mit LLM-Stub | Compliance-Stage-Loop-Count + Event | `__tests__/lib/wizard/pipeline-events.test.ts` | **exact** (Pipeline-Stage-Event-Test mit LLM-Mock) |
| `__tests__/eval/fixtures/llm-stubs.ts` | NEU | Test-Fixture TS | Stub-Antwort-Generatoren | Inline-Stubs in `pipeline-events.test.ts` | role-match (mit Aufwertung zur Wiederverwendung) |
| `__tests__/fixtures/pipeline-snapshot-borsigwalder.json` | NEU | Test-Fixture JSON | UAT-28.04. Snapshot | `scripts/smoke-pipeline-with-extractor.ts` (DB-Session-Load) | role-match (Snapshot-Format aus runPipeline-Output) |
| `lib/wizard/pipeline.ts` | MOD | Pipeline-Orchestrator | 7-Stage-Loop, Wave-3 Compliance-Stage einfuegen | (sich selbst — geziele Erweiterung) | self-reference |
| `lib/wizard/prompts.ts` | MOD | Prompt-Strings | SECTION/REVISION/CRITIQUE/RECHECK_SYSTEM schaerfen | (sich selbst, Z.322-353 SECTION_SYSTEM, Z.393+ CRITIQUE_SYSTEM) | self-reference |
| `lib/wizard/types.ts` | MOD | TS-Types | `PipelineStage` um `compliance-check` erweitern (Z.129-137) | (sich selbst) | self-reference |
| `lib/wizard/geber-guidance.ts` | MOD | Geber-Rubrics | `critiqueFocus` + `sectionStyle` schaerfen (Z.27-95) | (sich selbst) | self-reference |
| `lib/wizard/programm-kriterien.ts` | MOD | ExtraGuidance-Records | Eintraege fuer 7 nicht-abgedeckte Dossier-Programme ergaenzen | (sich selbst, Z.25-139 pro-Programm-Record-Schema) | self-reference |
| `data/eval/BASELINE.md` | MOD | Append-only History | Phase-5-Block mit mean+stddev anhaengen | (sich selbst, Z.1-50 Phase-2-Eintrag-Vorbild) | self-reference |
| `.planning/ROADMAP.md` | MOD | Doku Markdown | Phase-5-Sektion Crits 1-5 + UI-hint editieren | (sich selbst) | self-reference |
| `.planning/REQUIREMENTS.md` | MOD | Doku Markdown | WIZ-04 Traceability auf Phase 02.1 verschieben | (sich selbst) | self-reference |
| `CLAUDE.md` (Repo-Root) | MOD | Doku Markdown | Eval-Sektion ergaenzen | (sich selbst) | self-reference |
| `.planning/codebase/STACK.md` | MOD | Doku Markdown | Eval-Apparat als Komponente | (sich selbst) | self-reference |

**No-analog files (Greenfield-Score-Logik):** Judge-Rubric-Definitionen pro Geber-Gruppe (`RUBRIC_OEFFENTLICH` etc.), Score-Berechnungs-Funktionen (`scoreWiz01/02/03`), Compliance-Stage-Skeleton — alles direkt aus RESEARCH.md Pattern 1-5 spezifiziert, kein bestehender Vorbild-Code.

---

## Pattern Assignments

### 1. `scripts/eval-pipeline.ts` (CLI-Skript, Korpus→Pipeline→Score→Report)

**Analog:** `scripts/eval-matcher.ts` (Phase 1 D-13/-14, 841 LOC, eta. Phase 2-2.3 stabil)

**Imports + REPO/Pfad-Konstanten-Pattern** (`scripts/eval-matcher.ts:30-43`):
```typescript
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
```
→ **Uebernehmen:** `runMatch` → `runPipeline`, `MatchInput/Result` → `WizardFacts + GenerationArtefacts`, alle Pfade auf `pipeline-*`-Sibling.

**Flag-Parsing-Pattern mit Exit-2-Disziplin** (`scripts/eval-matcher.ts:150-183`):
```typescript
function parseFlags(argv: string[]): Flags {
  const flags: Flags = { snapshot: false, replayDir: null, mdSummary: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--snapshot") { flags.snapshot = true; }
    else if (a === "--md-summary") { flags.mdSummary = true; }
    else if (a === "--replay") {
      const next = argv[i + 1];
      if (!next) {
        console.error(`${LOG_PREFIX} --replay benoetigt ein Verzeichnis als Argument.`);
        process.exit(2);
      }
      flags.replayDir = next; i++;
    } else {
      console.error(`${LOG_PREFIX} Unbekanntes Flag: ${a}\n...`);
      process.exit(2);
    }
  }
  if (flags.snapshot && flags.replayDir) {
    console.error(`${LOG_PREFIX} --snapshot und --replay sind nicht gleichzeitig erlaubt.`);
    process.exit(2);
  }
  return flags;
}
```
→ **Erweitern um:** `--live`, `--N=3`, `--deep`, `--pro-judge` (D-07, D-09, D-15, D-16).

**Korpus-Validation-Pattern** (`scripts/eval-matcher.ts:195-255`):
```typescript
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
      console.error(`${LOG_PREFIX} Eintrag ohne id/category/anliegen gefunden: ...`);
      process.exit(2);
    }
    for (const id of entry.expected_top3) {
      if (!validIds.has(id)) {
        console.error(`${LOG_PREFIX} Eintrag ${entry.id}: expected_top3-ID "${id}" nicht in foerderprogramme.json`);
        process.exit(2);
      }
    }
    // ...
  }
  return korpus;
}
```
→ **Anpassen:** statt `expected_top3` jetzt `programmId` (single) + `expected_forbidden_markers[]`-Array-Validation; `expected_geber_gruppe`-Enum-Check gegen `lib/wizard/geber-classification.ts`.

**Snapshot-Migration-Shim-Pattern** (`scripts/eval-matcher.ts:283-330`) ist Pflicht-Read fuer Pitfall 3 aus RESEARCH (Schema-Version-Drift). Phase 5 nutzt **Schema-Version-Check** statt Migration:
```typescript
if (snap.meta?.schemaVersion !== 1) {
  console.error(`${LOG_PREFIX} Snapshot-Schema-Version-Mismatch: erwartet 1, gefunden ${snap.meta?.schemaVersion}`);
  process.exit(2);
}
```

**Soft-Failure pro Eintrag** (`scripts/eval-matcher.ts:540-585`):
```typescript
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
    console.warn(`${LOG_PREFIX} Eintrag ${entry.id} fehlgeschlagen, weiter mit naechstem:`, errMsg);
  }
  // ...
}
```
→ **Uebernehmen 1-zu-1.** Phase-5-Aequivalent: `runPipeline()` mit catch → `errMsg` in `EntryResult` + `null`-Scores → Aggregat zaehlt `nErrored`.

**Aggregation-Pattern** (`scripts/eval-matcher.ts:427-513`):
```typescript
function aggregate(results: EntryResult[]): AggregateMetrics {
  const ok = results.filter((r) => r.error === undefined);
  const nonEdge = ok.filter((r) => r.recall !== null);
  // ...
  const recallAtThreeMean = nonEdge.length === 0 ? 0
    : nonEdge.reduce((s, r) => s + (r.recall ?? 0), 0) / nonEdge.length;
  // ...
  return {
    n: results.length,
    nNonEdge: nonEdge.length,
    nEdge: edge.length,
    nErrored: results.length - ok.length,
    // ...
  };
}
```
→ **Erweitern:** per-Geber-Gruppe-Breakdown (D-12) zusaetzlich zu per-Category. Mean+Stddev fuer WIZ-01/-02/-03 (D-16/-18). Inline mean/stddev (kein npm).

**Threshold-Gate-Pattern mit `process.exit(1)`** (`scripts/eval-matcher.ts:790-836`):
```typescript
console.log("\n" + "=".repeat(80));
console.log("D-16 Threshold-Gate (PR-Gate)");
console.log("=".repeat(80));
if (m.nExpectedClarif === 0) {
  console.warn(`[GATE] WARNUNG: 0 Eintraege mit expected_clarification=true im Korpus. ...`);
}
const gate: Record<string, boolean> = {
  "Recall@3 >= 0.42": m.recallAtThreeMean >= 0.42,
  "Off-Target < 5%": m.offTargetRate < 0.05,
  "Clarif-Precision >= 80%":
    m.clarifPrecision === null || m.clarifPrecision >= 0.80,
  // ...
};
for (const [target, ok] of Object.entries(gate)) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${target}`);
}
const failed = Object.entries(gate).filter(([, ok]) => !ok).map(([k]) => k);
if (failed.length > 0) {
  console.error(`\n[GATE FAILED] ${failed.length} Target(s) nicht erfuellt: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("\n[GATE PASSED] Alle D-16-Targets erfuellt.");
process.exit(0);
```
→ **Anpassen pro Achse (D-25):** WIZ-01 hart (2σ-Drop), WIZ-02 mittel (2σ + 10 %), WIZ-03 warning-only (immer pass, nur Log).

**main()-Disziplin + Crash-Handler** (`scripts/eval-matcher.ts:838-840`):
```typescript
main().catch((e) => {
  console.error(`${LOG_PREFIX} Crash:`, e);
  process.exit(1);
});
```
→ **Uebernehmen 1-zu-1.**

**Markdown-Summary-Pattern** (`scripts/eval-matcher.ts:744-787`):
```typescript
if (flags.mdSummary) {
  const mdPath = reportPath.replace(/\.json$/, ".md");
  const md = [
    `# Matcher-Eval Bericht ${isoStamp}`,
    ``,
    `- Korpus: ${korpus.length} Eintraege`,
    `- Modus: ${report.meta.mode}`,
    `- **Recall@3 Mittelwert:** ${m.recallAtThreeMean.toFixed(3)}`,
    // ...
    `## Per-Kategorie`,
    `| Kategorie | n | Recall@3 | Off-Target |`,
    `|---|---|---|---|`,
    ...(["kurz", "ausfuehrlich", "vag"] as const).map((cat) => { ... }),
  ].join("\n");
  await writeFile(mdPath, md);
}
```
→ **Anpassen:** Per-Geber-Gruppe-Table statt Per-Kategorie. WIZ-01/-02/-03 + Finanzplan-Sub als Haupt-Scores.

---

### 2. `scripts/check-dossier-coverage.ts` (Pre-Flight-Survey-Skript)

**Analog:** `scripts/eval-matcher.ts:loadKorpusAndValidate` (Z.185-255) — gleicher Top-Level-Async + readFile-pro-Dossier + Markdown-Write-Output. Survey-Skript ist Read-only-Variante.

**Pattern (Phase-5-Entwurf, abgeleitet aus RESEARCH `## Daten-Vorbedingungen-Befund`):**
```typescript
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const REPO = resolve(__dirname, "..");
const RICHTLINIEN_DIR = resolve(REPO, "data/richtlinien");
const OUT_PATH = resolve(REPO, "data/eval/dossier-coverage-baseline.md");

async function main() {
  const files = (await readdir(RICHTLINIEN_DIR)).filter((f) => f.endsWith(".json"));
  const rows: Array<{ id: string; pflicht: number; maxZeichen: number; vorbild: number; best: number; reject: number }> = [];
  for (const f of files) {
    const r = JSON.parse(await readFile(resolve(RICHTLINIEN_DIR, f), "utf-8"));
    const pflicht = (r.antragsstruktur?.abschnitte ?? []).filter((a: any) => a.pflicht !== false).length;
    const maxZeichen = (r.antragsstruktur?.abschnitte ?? []).filter((a: any) => typeof a.maxZeichen === "number" && a.maxZeichen > 0).length;
    rows.push({
      id: f.replace(/\.json$/, ""),
      pflicht,
      maxZeichen,
      vorbild: (r.vorbildFormulierungen ?? []).length,
      best: (r.bestPractices ?? []).length,
      reject: (r.rejectGruende ?? []).length,
    });
  }
  // ... Markdown-Table schreiben
}
main().catch((e) => { console.error(e); process.exit(1); });
```
**Output-Format-Vorlage** RESEARCH Z.134-146 (die Felder-Matrix-Tabelle ist direkt verwendbar).

---

### 3. `lib/wizard/geber-classification.ts` (Mapping-Modul)

**Analog:** `lib/wizard/programm-kriterien.ts` (160 LOC)

**Record-Mapping-Pattern** (`lib/wizard/programm-kriterien.ts:25-139`):
```typescript
const KRITERIEN: Record<string, ExtraGuidance> = {
  "bmbf-digitalpakt-2": { gewichtet: [...], pflichten: [...], fallen: [...] },
  "bosch-schulpreis": { gewichtet: [...], pflichten: [...], fallen: [...] },
  // ... pro Programm-ID ein Eintrag
};

export function getExtraGuidance(programmId: string): ExtraGuidance | null {
  return KRITERIEN[programmId] ?? null;
}
```
→ **Anwenden auf Phase 5:**
```typescript
// lib/wizard/geber-classification.ts (NEU Wave 1)
export type GeberGruppe =
  | "oeffentlich"          // bund + land aggregiert
  | "stiftung"
  | "eu"
  | "wirtschaftspreis"
  | "verband-uni";

const MAPPING: Record<string, GeberGruppe> = {
  "bmbf-digitalpakt-2": "oeffentlich",
  "berlin-startchancen": "oeffentlich",
  "ensam-bmz": "oeffentlich",
  "bosch-schulpreis": "wirtschaftspreis",
  "ferry-porsche-challenge-2025": "wirtschaftspreis",
  "ferry-porsche-challenge": "wirtschaftspreis",
  "aktion-mensch-schulkooperation": "stiftung",
  "kultur-macht-stark": "verband-uni",
  "klimalab-2026": "stiftung",
  "erasmus-schule-2026": "eu",
  "erasmus-schulentwicklung": "eu",
};

export function getGeberGruppe(programmId: string): GeberGruppe | "unknown" {
  return MAPPING[programmId] ?? "unknown";
}
```

**`format*`-Helper-Pattern** (`lib/wizard/programm-kriterien.ts:145-160`) ist Vorbild fuer optionalen `formatGeberGruppeLabel()`-Export.

**Test-Analog:** Die Test-Datei `__tests__/eval/geber-classification.test.ts` folgt dem Pattern von `__tests__/lib/wizard/facts-extractor.test.ts` (Z.1-60): kleine `describe()`-Blocks, `it()` mit konkretem Input → Expected-Output.

---

### 4. `lib/wizard/config.ts` (Feature-Flag-Loader)

**Kein 1-zu-1-Analog im Repo** — Env-Vars werden bisher inline in den Konsumenten gelesen (siehe `lib/wizard/llm.ts` und `app/api/wizard/checkout/route.ts`). Phase 5 etabliert ein eigenes Modul.

**Pattern (Phase-5-Entwurf, RESEARCH Open Question 4):**
```typescript
// lib/wizard/config.ts (NEU Wave 1)
/**
 * Feature-Flags fuer Pipeline-Tuning-Hebel (Phase 5 D-22).
 * Defaults sind alle OFF — Hebel werden via Env-Var aktiviert.
 * A/B-Eval kann Hebel einzeln ein/aus schalten und misst Delta pro Hebel.
 */
function readBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export const PIPELINE_CONFIG = Object.freeze({
  useVorbildFormulierungen: readBool("PIPELINE_USE_VORBILD_FORMULIERUNGEN", false),
  complianceStageEnabled:   readBool("PIPELINE_COMPLIANCE_STAGE", false),
  sharpPrompts:             readBool("PIPELINE_SHARP_PROMPTS", false),
  geberRoutingV2:           readBool("PIPELINE_GEBER_ROUTING_V2", false),
});
```

**Test-Pattern fuer Env-Var-Read** (analog `__tests__/lib/wizard/facts-extractor.test.ts` Stil — kleine describe/it-Bloecke). Wichtig: `jest.replaceProperty(process.env, "PIPELINE_*", ...)` oder `beforeEach`-Set-Reset-Pattern, weil `PIPELINE_CONFIG` ist `Object.freeze`d zum Modul-Load-Zeitpunkt.

---

### 5. `data/eval/pipeline-korpus.json` (Eval-Korpus)

**Analog:** `data/eval/matcher-korpus.json` (existiert, Z.1-50 als Vorbild gelesen)

**Top-Level-Array-Pattern, Eintrag-Schema** (`data/eval/matcher-korpus.json:1-50`):
```json
[
  {
    "id": "ev-001",
    "category": "ausfuehrlich",
    "anliegen": "Wir wollen an unserer Grundschule ...",
    "schulname": "Grundschule am Buschgraben",
    "schultyp": "grundschule",
    "bundesland": "Berlin",
    "geschaetztesBudgetEur": 8000,
    "expected_top3": ["aktion-mensch-schulkooperation", "kultur-macht-stark"],
    "expected_off_target": ["bmbf-digitalpakt-2"],
    "notes": "Klassischer Goldstandard: klares Anliegen, BL-Match ..."
  },
  {
    "id": "ev-003",
    "category": "vag",
    "anliegen": "Wir wollen unsere Schule besser machen ...",
    "expected_top3": [],
    "expected_clarification": true,
    "expected_missing_slots": ["bundesland", "zielgruppe", "thema"],
    "notes": "Edge-Case (D-07): bewusst zu vag fuer ein Ranking."
  }
]
```

**Phase-5-Schema-Erweiterung** (RESEARCH Pattern 1, Z.330-378):
- `id` → `"pv-XXX"` (Pipeline-eVal statt Eval) — Convention
- statt `anliegen` flat: `userAnswers[]` (ChatMessage-Sub-Array) + `facts: WizardFacts` (pre-extrahiert, D-06)
- `expected_forbidden_markers: [{ marker, description }]` neu (D-09 Layer 1)
- `expected_geber_gruppe` neu (D-28-Lookup-Result)
- `category` aus matcher `kurz|ausfuehrlich|vag` → pipeline `vag|mittel|hochwertig` (D-04 Mix)
- `edgeCase`-Enum mit 7 Werten aus D-05

---

### 6. `data/eval/pipeline-snapshots/<ISO>/<id>-runN.json` (Snapshot-Format)

**Analog:** `data/eval/snapshots/2026-05-04-12-32-24/<entry-id>.json` (Phase-1-ISO-Sub-Ordner-Konvention)

**Phase-1-Snapshot-Schreib-Pattern** (`scripts/eval-matcher.ts:587-589`):
```typescript
if (snapshotDir) {
  const snapPath = resolve(snapshotDir, `${entry.id}.json`);
  await writeFile(snapPath, JSON.stringify({ input, result }, null, 2));
}
```
→ **Erweitern fuer N=3** (RESEARCH Open Question 5): Dateiname `${entry.id}-run${runIndex}.json`. Replay-Modus auto-detected ob `-runN` oder Phase-1-Style.

**Schema-Version-Pflicht** (RESEARCH Pitfall 3):
```typescript
const snapshot: PipelineSnapshot = {
  korpus_id: entry.id,
  input: { programm, facts, richtlinie, messages },
  result: { artefacts, usages },
  meta: {
    iso: isoStamp,
    runIndex,                              // 1 | 2 | 3 (D-16)
    pipelineCommitSha: gitHeadSha,
    featureFlags: { ...PIPELINE_CONFIG },  // D-22 Feature-Flag-Snapshot
    latencyMs,
    schemaVersion: 1,                      // RESEARCH Pitfall 3
  },
};
```

---

### 7. `.github/workflows/pipeline-eval.yml` (CI-Threshold-Gate)

**Analog:** `.github/workflows/weekly-auto-pflege.yml` (220 LOC, Phase-4-Sibling)

**Workflow-Haertungs-Pattern** (`.github/workflows/weekly-auto-pflege.yml:67-90`):
```yaml
      - name: Run auto-pflege-step
        id: pflege
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
          MAX_PROGRAMS_INPUT: ${{ github.event.inputs.max_programs || '5' }}
          DRY_RUN_INPUT: ${{ github.event.inputs.dry_run || 'false' }}
        run: |
          set -euo pipefail
          if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
            echo "::error::DEEPSEEK_API_KEY Secret fehlt. ..."
            exit 1
          fi
          # ...
          npx tsx scripts/auto-pflege-step.ts "${ARGS[@]}"
```
→ **Uebernehmen 1-zu-1:** `set -euo pipefail`, Env-Mapping (NIE `${{ inputs.X }}` direkt in shell), Secret-Pre-Flight-Check, npx-tsx-Aufruf mit Array-Args.

**workflow_dispatch-Inputs-Pattern** (`.github/workflows/weekly-auto-pflege.yml:23-43`):
```yaml
on:
  schedule:
    - cron: "0 4 * * 1"
  workflow_dispatch:
    inputs:
      max_programs:
        description: "Maximal N neue Programme pro Lauf extrahieren"
        required: false
        type: string
        default: "5"
      llm_provider:
        description: "LLM-Provider override (deepseek default, gemini fuer Fallback)"
        required: false
        type: choice
        options: [deepseek, gemini]
        default: deepseek
```
→ **Anpassen** (RESEARCH Z.1152-1166):
```yaml
on:
  pull_request:
    paths:
      - "lib/wizard/**"
      - "data/richtlinien/**"
      - "data/eval/pipeline-korpus.json"
      - "scripts/eval-pipeline.ts"
  workflow_dispatch:
    inputs:
      mode:
        description: "Modus: replay (default, kein LLM) oder live (Cost ~3-4 EUR)"
        required: false
        type: choice
        options: [replay, live]
        default: replay
```

**Artifact-Upload-Pattern** (`.github/workflows/weekly-auto-pflege.yml:103-112`):
```yaml
      - name: Upload logs artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: auto-pflege-logs-${{ github.run_id }}
          path: |
            logs/auto-pflege-*/
            failure-report.md
          if-no-files-found: ignore
          retention-days: 14
```
→ **Anwenden:** Upload `data/eval/pipeline-reports/*.json` mit retention-days=30 (RESEARCH Z.1212-1218).

**GitHub-Annotation-Pattern via actions/github-script** (`.github/workflows/weekly-auto-pflege.yml:144-189`) ist Vorbild fuer Per-Achse-Annotation-Step in Phase 5.

**KEIN peter-evans/create-pull-request** in Phase 5 (RESEARCH Z.215 explizit: kein Auto-PR — Workflow ist Read-only-Gate).

---

### 8. `__tests__/eval/pipeline-judge-rubric.test.ts` + `pipeline.compliance.test.ts` (LLM-Mock-Tests)

**Analog:** `__tests__/lib/wizard/pipeline-events.test.ts` (82 LOC, jest.mock("@/lib/wizard/llm") als kanonisches Pattern)

**jest.mock-LLM-Stub-Pattern** (`__tests__/lib/wizard/pipeline-events.test.ts:17-39`):
```typescript
// LLM-Modul vollstaendig mocken — keine echten API-Calls in Tests.
// generateJson-Stub-Wert muss alle Pipeline-Stages befriedigen:
//   - Outline: abschnitte[] + titel (fuer Section-Loop)
//   - Critique: findings=[] (keine Findings → recheck wird uebersprungen)
//   - Recheck: resolutions=[]
//   - Finanzplan: posten=[] (leer → consistency wird uebersprungen)
//   - Consistency: issues=[]
// Alle Werte inline im Factory-Callback, damit Jest-Hoisting kein ReferenceError wirft.
jest.mock("@/lib/wizard/llm", () => ({
  generateText: jest.fn().mockResolvedValue({
    value: "Stub Section Text",
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  generateJson: jest.fn().mockResolvedValue({
    value: {
      titel: "Stub-Antrag",
      abschnitte: [{ name: "Einleitung", fokus: "Stub-Fokus" }],
      findings: [],
      zusammenfassung: "Stub",
      resolutions: [],
      posten: [],
      hinweise: [],
      issues: [],
    },
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
}));
```
→ **Erweitern fuer Judge-Rubric-Test:** `generateJson` muss Judge-Rubric-Output stuben (`{ kriterien: [...], gesamt: 75, summary: "..." }`). Erweitern fuer Compliance-Stage: stage-spezifische Mock-Implementations via `jest.fn().mockResolvedValueOnce(...)`-Chains.

**Event-Reihenfolge-Test-Pattern** (`__tests__/lib/wizard/pipeline-events.test.ts:48-66`):
```typescript
describe("pipeline — PipelineEvents (D-04, D-13)", () => {
  it("ruft onEvent fuer jede Stage in korrekter Reihenfolge auf — D-04", async () => {
    const events: PipelineEvent["stage"][] = [];
    try {
      await runPipeline(
        minimalProgramm,
        {} as never,
        null,
        (e: PipelineEvent) => { events.push(e.stage); }
      );
    } catch { /* Pipeline darf scheitern bei minimal-stubbed Mocks */ }
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.slice(0, 4)).toEqual(["outline", "section", "critique", "revision"]);
  });
});
```
→ **Erweitern fuer compliance-test:** `expect(events).toContain("compliance-check")` bei aktivem Feature-Flag; `expect(events).not.toContain("compliance-check")` bei OFF.

---

### 9. `__tests__/eval/fixtures/llm-stubs.ts` (Stub-Wiederverwendung)

**Analog:** Inline-Mocks in `__tests__/lib/wizard/pipeline-events.test.ts` (Z.17-39)

**Pattern:** Stubs in `__tests__/eval/fixtures/llm-stubs.ts` extrahieren — wiederverwendbar in `pipeline-judge-rubric.test.ts` + `pipeline.compliance.test.ts`:
```typescript
// __tests__/eval/fixtures/llm-stubs.ts (NEU Wave 0)
export const JUDGE_RUBRIC_STUB = {
  kriterien: [
    { id: "messbare-wirkung", score: 75, beleg: "Stub-Zitat", verbesserung: "Stub" },
    // ...
  ],
  gesamt: 75,
  summary: "Solider Stub-Antrag.",
};

export const PIPELINE_LLM_FACTORY = () => ({
  generateText: jest.fn().mockResolvedValue({
    value: "Stub Section Text",
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  generateJson: jest.fn().mockResolvedValue({
    value: { /* alle Felder analog pipeline-events.test.ts */ },
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
});
```

---

### 10. `__tests__/eval/pipeline-fk-match.test.ts` + Sibling-Unit-Tests

**Analog:** `__tests__/lib/wizard/matcher.parser.test.ts` (Z.1-50 als Vorbild gelesen)

**Pure-function unit-test-Pattern** (`__tests__/lib/wizard/matcher.parser.test.ts:13-50`):
```typescript
describe("parsePipeMatches — 4-Spalten-Pipe-Format", () => {
  it("parst korrekte 4-Spalten-Zeile (id|score|passt_weil|achtung_bei) — D-01", () => {
    const out = parsePipeMatches(
      "prog-a|85|Guter Match.|Frist beachten.",
      VALID
    );
    expect(out).toEqual([
      { id: "prog-a", score: 85, passt_weil: "Guter Match.", achtung_bei: "Frist beachten." },
    ]);
  });

  it("verwirft Zeile mit 3 Spalten (Soft-Failure, kein Throw) — D-02", () => {
    expect(() => parsePipeMatches("prog-a|85|Kein viertes Feld", VALID)).not.toThrow();
    const out = parsePipeMatches("prog-a|85|Kein viertes Feld", VALID);
    expect(out).toEqual([]);
  });
});
```
→ **Anwenden:** scoreWiz01/scoreWiz02 sind pure-Funktionen → Input-Fixture + erwartete Outputs (siehe RESEARCH Z.1387-1417 fuer konkrete Test-Beispiele Marker/Regex/User-Cross-Check).

**Mehrere `describe`-Bloecke pro Test-File** (siehe `__tests__/lib/wizard/facts-extractor.test.ts`) — Konvention: 1 describe pro Funktion, klare it()-Namen mit Behavior-Statement.

---

### 11. `lib/wizard/pipeline.ts` (MOD — neue compliance-check-Stage)

**Self-Reference + Pattern aus Z.165-323** (`runPipeline()`)

**Stage-Insertion-Pattern** (`lib/wizard/pipeline.ts:263-277`):
```typescript
let resolutions: FindingResolution[] = [];
let hasOpenHigh = false;
if (critique.findings.length > 0) {
  emit({ stage: "recheck", message: "Gutachten-Punkte prüfen" });
  const recheckRes = await generateJson<unknown>(
    MODEL_FLASH,
    RECHECK_SYSTEM,
    buildRecheckPrompt(critiqueRendered, finalRes.value)
  );
  usages.push({ model: MODEL_FLASH, usage: recheckRes.usage });
  resolutions = normalizeResolutions(recheckRes.value, critique.findings.length);
  hasOpenHigh = resolutions.some((r) => {
    if (r.status === "geschlossen") return false;
    const f = critique.findings[r.index - 1];
    return f?.schwere === "hoch";
  });
}
```
→ **Neue Stage zwischen recheck und finanzplan** (RESEARCH Pattern 5, D-20 Hebel 2):
```typescript
let complianceLoopCount = 0;
if (PIPELINE_CONFIG.complianceStageEnabled && richtlinie?.antragsstruktur?.abschnitte) {
  emit({ stage: "compliance-check", message: "Pflichtabschnitt-Check" });
  const complianceCheck = await runComplianceCheck(
    finalRes.value,
    richtlinie.antragsstruktur.abschnitte
  );
  usages.push(complianceCheck.usage);
  if (complianceCheck.violations.length > 0 && complianceLoopCount === 0) {
    const revFix = await generateText(
      MODEL_PRO,
      REVISION_SYSTEM,
      buildComplianceRevisionPrompt(finalRes.value, complianceCheck.violations)
    );
    finalRes.value = revFix.value;
    usages.push({ model: MODEL_PRO, usage: revFix.usage });
    complianceLoopCount = 1;
  }
}
```
**Wichtige Disziplin:** `complianceLoopCount` (RESEARCH Anti-Pattern Z.726) — Max 1 Iteration zwingend, sonst Endlos-Loop-Risiko.

**emit()-Wrapper-Disziplin** (`lib/wizard/pipeline.ts:172-174`):
```typescript
const emit = (e: PipelineEvent) => {
  try { onEvent?.(e); } catch (err) { console.warn("[pipeline] onEvent threw, ignoring:", err); }
};
```
→ Compliance-Stage muss denselben emit-Wrapper nutzen (silent stage, kein UI-Update — `GeneratingProgress.tsx` ignoriert unbekannte Stages).

---

### 12. `lib/wizard/prompts.ts` (MOD — SECTION/CRITIQUE/REVISION/RECHECK schaerfen)

**Self-Reference auf bestehende Verbots-Listen** (`lib/wizard/prompts.ts:322-353` SECTION_SYSTEM, Z.393-401 CRITIQUE_SYSTEM)

**Halluzinations-Verbots-Listen-Pattern** (`lib/wizard/prompts.ts:324-336`):
```typescript
## Halluzinations-Verbot (HART)
Du bekommst zusätzlich zu den FAKTEN die ROHEN USER-ANTWORTEN als Quellen-Anker.
Du darfst AUSSCHLIESSLICH Tatsachen verwenden, die in den User-Antworten oder in
den extrahierten Fakten stehen. ... Lieber kürzer als erfunden.

NIEMALS in den Antragstext aufnehmen, wenn nicht im User-Input belegt:
- **Aktenzeichen, Geschäftszeichen, Beschluss-Nummern** (Az., G.Z., ...) — Schulen geben fast nie welche an.
- **Tagesgenaue Datumsangaben** (Beschlüsse, Schreiben, Termine) — wenn User nur "demnächst" sagte, kein "12.03.2026" daraus machen.
- **Tarif-Stufen, Personalkosten-Berechnungen** ("TV-L E9a", "4h × 50 Wochen × 20 €/h") — nur wenn der User das selbst gerechnet hat.
- **Bezirks-/Behördennamen** über das hinaus, was der User nannte.
- ...
```
→ **Schaerfen (Wave 3 Hebel 1, D-20):**
1. Ergaenze Few-Shot-Negativbeispiele aus UAT-28.04.-Marker (Borsigwalder-Reproducer). Pattern: pro Verbots-Punkt 1 konkretes Bad-Example + 1 Good-Example.
2. **CRITIQUE_SYSTEM** (Z.393): „ERSTE Pflicht-Pruefung — HALLUZINATIONS-AUDIT" bereits vorhanden; in **RECHECK_SYSTEM** (Z.625) auch einfuegen (D-20 Hebel 1).
3. **REVISION_SYSTEM** (Z.560): „Füge keine neuen Behauptungen oder Zahlen ein." beibehalten, aber ergaenzen um „Loesche jede Tatsache aus dem Entwurf, fuer die du keinen User-Input-Bezug findest."

**Behind-Flag** (D-22): Sharp-Prompts werden via `PIPELINE_CONFIG.sharpPrompts` aktiviert — d.h. die geschaerften Prompt-Varianten leben in `prompts.ts` als alternative Strings + `if (PIPELINE_CONFIG.sharpPrompts) use SECTION_SYSTEM_SHARP else SECTION_SYSTEM`. Plan-Phase entscheidet, ob Sharp-Variante als 2. Konstante oder als Postfix-Block im selben String.

---

### 13. `lib/wizard/types.ts` (MOD — `PipelineStage` Erweiterung)

**Self-Reference** (`lib/wizard/types.ts:129-137`):
```typescript
export type PipelineStage =
  | "outline"
  | "section"
  | "critique"
  | "revision"
  | "recheck"
  | "finanzplan"
  | "consistency"
  | "done";
```
→ **Erweitern um:** `| "compliance-check"` (nach `"recheck"` einsortieren — Reihenfolge der Stages im Type spiegelt Run-Reihenfolge):
```typescript
export type PipelineStage =
  | "outline"
  | "section"
  | "critique"
  | "revision"
  | "recheck"
  | "compliance-check"        // NEU Wave 3 (D-20 Hebel 2, silent)
  | "finanzplan"
  | "consistency"
  | "done";
```

**TypeScript-Strict-Mode-Implikation** (RESEARCH Open Question 7): `GeneratingProgress.tsx` muss case `"compliance-check": return null;` oder Exhaustive-Check-Fallback bekommen, sonst Compile-Error. Wave-3-Plan loest das.

---

### 14. `lib/wizard/geber-guidance.ts` (MOD — Rubrics schaerfen)

**Self-Reference** (`lib/wizard/geber-guidance.ts:27-95`)

**Aktuelles Pattern pro GeberGuidance** (`lib/wizard/geber-guidance.ts:55-68` Beispiel STIFTUNG):
```typescript
const STIFTUNG: GeberGuidance = {
  label: "Stiftungsfoerderung",
  interviewerPriorities: `Prioritaeten fuer Stiftungsfoerderungen:
1. Passung zur Stiftungsmission: ...
2. Geschichte & Mensch: ...
3. Zielgruppe SEHR spezifisch: ...
4. Wirkung in Beispielen, nicht nur Zahlen.
5. Besonderheiten der Schule (Lage, soziale Faktoren, Milieu).
6. Nachhaltigkeit: realistisch, ehrlich — Stiftungen mögen keinen PR-Glanz ohne Substanz.
7. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung erzaehlerischer, typisch: Unsere Schule (Kontext) → Der Bedarf (Szene, Menschen) → Unsere Idee → Was wir konkret tun → Was entsteht (Wirkung) → Wie es weitergeht.`,
  sectionStyle: `Tonalitaet: klar, menschlich, konkret. ...`,
  critiqueFocus: `Pruefe: Ist die Mission-Passung explizit? Gibt es mindestens EIN konkretes Beispiel/Szene, ...`,
};
```
→ **Wave 3 Hebel 4 Schaerfung:** pro Geber-Typ ergaenzen um:
1. **Negativ-Marker** (Wendungen, die der Geber-Typ explizit NICHT mag) — analog Negativ-Listen in `prompts.ts` Z.346
2. **Konkret-vs-abstrakt-Beispiele** im `sectionStyle`-Feld
3. **Per-Achse-Kriterien-Sticheln** im `critiqueFocus`-Feld (Stiftung: „1 konkrete Szene Pflicht", EU: „mind. 1 Partnerschule namentlich genannt", etc.)

**Verhaeltnis zu `geber-classification.ts`:** `GeberTyp` (8 Werte) in `geber-guidance.ts` bleibt fuer Prompt-Injection erhalten — `geber-classification.ts` ist die NEUE strategische Aggregation fuer Eval-WIZ-03. Beide existieren parallel.

---

### 15. `lib/wizard/programm-kriterien.ts` (MOD — 7 Dossiers ergaenzen)

**Self-Reference Record-Pattern** (`lib/wizard/programm-kriterien.ts:25-139`)

**Eintragsschema** (Beispiel `aktion-mensch-schulkooperation` Z.123-138):
```typescript
"aktion-mensch-schulkooperation": {
  gewichtet: [
    "Aktion Mensch foerdert KOOPERATIONEN zwischen Schule und einem sozialen Traeger ...",
    "Junge Menschen mit Behinderung / in schwierigen Lebenslagen sind Zielgruppe ...",
    "Selbstbestimmung und Teilhabe der Zielgruppe: ...",
    "Barrierefreiheit: baulich, kommunikativ, sozial — konkret benennen, was umgesetzt wird.",
  ],
  pflichten: [
    "Partner-Organisation muss Aktion-Mensch-foerderfaehig sein ...",
    "Kofinanzierung: 30 % Eigenanteil in der Regel erforderlich.",
  ],
  fallen: [
    "Reine Schulprojekte ohne einen zusaetzlichen sozialen Traeger — nicht foerderfaehig.",
    "Tokenistische Inklusion ('auch eine Foerderschule besucht uns einmal') ...",
  ],
},
```
→ **Ergaenzen fuer fehlende Dossier-Programme** (Wave 3 Hebel 4): die 11 Dossier-Programm-IDs durchgehen, fuer jene **ohne** Eintrag in `KRITERIEN`-Record je 4-8 `gewichtet`-Punkte + 1-3 `pflichten` + 2-4 `fallen` schreiben. Quellen: dasselbe Dossier (`bestPractices` / `rejectGruende` / `notizen`). Pattern garantiert: kein neues Schema, nur mehr Records.

---

### 16. `data/eval/BASELINE.md` (MOD — Phase-5-Eintrag anhaengen)

**Self-Reference Format** (`data/eval/BASELINE.md:1-50` Phase-2.3-Eintrag als Vorbild)

**Phase-2.3-Eintrag-Pattern** (`data/eval/BASELINE.md:6-30`):
```markdown
## 2026-05-05 — Phase-2.3 Hebel 1+2 + Stabilitaets-Run (Clarif-Precision 62.5 % → 75 %)

- **Matcher-Commit:** wird mit diesem Commit ergaenzt
- **Korpus-Version:** v3 (unveraendert)
- **Hebel 1 (Theme-Boost-Bug-Fix):** ALL_KATEGORIEN min-length-Filter ≥ 4 Zeichen ...
- **Hebel 2 (Slot-Heuristik schaerfen):** MATCHER_SYSTEM-Prompt erweitert ...

### Threshold-Gate Vergleich Phase 2.2 → Phase 2.3 (jeweils 2-Run-Mittel)

| Metrik | Phase 2.2 (Run-2-Wert) | Phase 2.3 Run 1 | Phase 2.3 Run 2 | D-17-Target | Status |
|--------|------------------------|-----------------|-----------------|-------------|--------|
| **Recall@3** | 0.544 | 0.491 | **0.447** | ≥ 0.42 | ✓ PASS |
| ... | | | | | |
```
→ **Phase-5-Block anhaengen** mit dem konkreten Markdown-Skeleton aus RESEARCH Z.1088-1142 (mean+stddev statt 2-Run-Mittel, Per-Geber-Gruppe-Tabelle ergaenzen, Methodik-Hinweis WIZ-01 Coverage-only).

**Append-only-Disziplin** (`data/eval/BASELINE.md:3-4`): „Append-only History. Phase 2+ fügt neue Einträge oben dran. Skript schreibt NICHT in diese Datei — manuelle Pflege per PR."
→ Phase 5 fuegt Block oben dran (vor Phase-2.3-Eintrag), Skript bleibt read-only.

---

### 17. `data/eval/README.md` + `TUNING.md` + `dossier-coverage-baseline.md` (NEU Wave 4)

**Kein 1-zu-1-Analog im Repo** — Phase 5 etabliert das Eval-Apparat-Doku-Konventionalia.

**Format-Empfehlungen:**
- `README.md`: Markdown-Sektionen analog `data/program-sources.json`-Doku-Stil + Phase-1-D-15-Skript-Konvention (Aufruf-Beispiele, Flag-Liste, Exit-Codes)
- `TUNING.md`: Append-only-Disziplin analog `BASELINE.md` — pro Tuning-Iteration ein Markdown-Section mit `## YYYY-MM-DD — Hebel X — Score-Delta` (Plan-Phase entscheidet tabellarisch vs Section)
- `dossier-coverage-baseline.md`: Format ist die Felder-Matrix-Tabelle aus RESEARCH Z.134-146 — vom Survey-Skript geschrieben (1× Wave 0)

---

## Shared Patterns

### Skript-CLI-Konvention (`npx tsx`)

**Source:** Repo-Konvention via `CLAUDE.md` Z.42: „Skripte: `npx tsx scripts/<name>.ts` — kein Build-Schritt"

**Apply to:** `scripts/eval-pipeline.ts`, `scripts/check-dossier-coverage.ts`

```typescript
// Top-Level async + main + crash-handler
async function main() { /* ... */ }
main().catch((e) => {
  console.error(`${LOG_PREFIX} Crash:`, e);
  process.exit(1);
});
```

### Process-Exit-Disziplin

**Source:** `scripts/eval-matcher.ts` (Z.27, Z.831, Z.840)

**Apply to:** Alle CLI-Skripte (`eval-pipeline.ts`, `check-dossier-coverage.ts`)

```typescript
// Exit-Codes-Konvention:
//   0  Alles erfuellt / Gate PASSED
//   1  Gate FAILED ODER unerwarteter Crash
//   2  CLI-Fehler / Korpus-Validation fehlgeschlagen
```

### Read-only-Constraint gegen `lib/wizard/`

**Source:** RESEARCH Z.220-221 + `scripts/eval-matcher.ts` Z.8 („Read-only gegen den Matcher")

**Apply to:** `scripts/eval-pipeline.ts` Wave 1+2 (Baseline-Run-Phase) — bis Wave 3 darf das Eval-Skript KEINE Code-Aenderungen an `lib/wizard/pipeline.ts` triggern. Wave 3 modifiziert Pipeline + misst Delta gegen Baseline.

### LLM-Mock in Jest

**Source:** `__tests__/lib/wizard/pipeline-events.test.ts` Z.17-39

**Apply to:** Alle Tests in `__tests__/eval/` (Wave 0)

```typescript
jest.mock("@/lib/wizard/llm", () => ({
  generateText: jest.fn().mockResolvedValue({ value: "Stub", usage: { ... } }),
  generateJson: jest.fn().mockResolvedValue({ value: { /* Stub-Felder */ }, usage: { ... } }),
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
}));
```

### Path-Conventionalia (REPO/resolve)

**Source:** `scripts/eval-matcher.ts:38-42`

**Apply to:** Alle neuen Skripte + Test-Fixtures
```typescript
const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/pipeline-korpus.json");
```
**Sicherheits-Aspekt** (RESEARCH V12): `--replay <dir>` Pfad wird via `resolve(REPO, dir, ...)` — kein weiteres Sanitization, weil CI-only ohne externen Input.

### ISO-Stamp-Pfad-Konvention

**Source:** `scripts/eval-matcher.ts:530-535` + `data/eval/snapshots/2026-05-04-12-32-24/...`

**Apply to:** Snapshots + Reports unter `data/eval/pipeline-*`
```typescript
const isoStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
// -> 2026-05-XX-HH-MM-SS
```

### Cost-Ledger-Aggregation

**Source:** `scripts/eval-matcher.ts:638-645` + `lib/wizard/pricing.ts` (`CostLedger` API)

**Apply to:** `scripts/eval-pipeline.ts` Aggregat-Sektion. **Read-only im Replay-Modus** (RESEARCH Z.637-638): Costs aus Snapshot, nicht akkumulieren.

### CI-Workflow-Haertung

**Source:** `.github/workflows/weekly-auto-pflege.yml` (`set -euo pipefail`, env-Mapping, Secret-Pre-Flight)

**Apply to:** `.github/workflows/pipeline-eval.yml`

```yaml
- name: Run something
  env:
    DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
    MODE: ${{ github.event.inputs.mode || 'replay' }}
  run: |
    set -euo pipefail
    if [ "$MODE" = "live" ] && [ -z "${DEEPSEEK_API_KEY}" ]; then
      echo "::error::DEEPSEEK_API_KEY Secret fehlt fuer --live-Modus"
      exit 1
    fi
```

### Deutsch + ASCII-Umlaut

**Source:** `CLAUDE.md` Repo-Root + bestehende Dateien (alle .md/.ts)

**Apply to:** Alle neuen Files Wave 0-4. Code-Strings + Doku in deutsch (`ae/oe/ue/ss`), Code-Identifier ASCII. **Ausnahme:** UI-Strings in `lib/wizard/prompts.ts` haben native Umlaute (User-facing Texte) — Konvention beibehalten.

### Append-only-Disziplin (BASELINE / TUNING)

**Source:** `data/eval/BASELINE.md` Z.3-4

**Apply to:** `data/eval/BASELINE.md` (Phase-5-Block), `data/eval/TUNING.md` (NEU Wave 4)

Beide Files sind manuell-gepflegt via PR. Skript schreibt NICHT in `BASELINE.md` (Anti-Pattern, RESEARCH Z.725). Tuning-Iterationen schreiben nur Reports unter `data/eval/pipeline-reports/`, der Mensch erstellt den BASELINE/TUNING-Eintrag.

---

## No Analog Found

| Datei | Rolle | Data Flow | Begruendung |
|------|------|-----------|--------------|
| Judge-Rubric-Konstanten (`RUBRIC_OEFFENTLICH` etc.) | Daten-Konstanten in `scripts/eval-pipeline.ts` | Static Rubric-Pro-Geber-Gruppe | Greenfield — RESEARCH Pattern 3 (Z.499-558) ist der einzige Vorbild. Plan-Phase nutzt diesen Entwurf 1-zu-1. |
| `scoreWiz03` mit LLM-Judge-Call | Score-Berechnung in `scripts/eval-pipeline.ts` | finalText + Rubric → JSON-Score | Greenfield — RESEARCH Pattern 3 + Code-Examples Z.611. Kein Repo-Vorbild fuer LLM-as-Judge. |
| `runComplianceCheck` + `buildComplianceRevisionPrompt` | Pipeline-Stage in `lib/wizard/pipeline.ts` | finalText + Pflichtabschnitte → Violations[] | Greenfield — RESEARCH Pattern 5 (Z.675-715) ist Pflicht-Read. Kein direkter Pipeline-Stage-Vorbild. |
| `data/eval/README.md` + `TUNING.md` | Doku-Markdown | Static | Kein Eval-Apparat-README im Repo (`BASELINE.md` ist History, nicht Apparat-Doku). Plan-Phase entwirft Format frisch. |

**Konsequenz fuer Planner:** Diese 4 Bausteine erhalten Plan-Sections mit direktem RESEARCH-Code-Excerpt-Verweis (Z.499-558, Z.611, Z.675-715) — kein Repo-Analog zum Kopieren.

---

## Metadata

**Analog search scope:**
- `/home/kolja/edufunds-app/scripts/` (eval-matcher.ts, smoke-pipeline-*.ts)
- `/home/kolja/edufunds-app/lib/wizard/` (pipeline.ts, types.ts, prompts.ts, geber-guidance.ts, programm-kriterien.ts, finanzplan-validator.ts)
- `/home/kolja/edufunds-app/__tests__/` (lib/wizard/*, components/Wizard/*, lib/*)
- `/home/kolja/edufunds-app/.github/workflows/` (weekly-auto-pflege.yml, deploy-*.yml)
- `/home/kolja/edufunds-app/data/eval/` (BASELINE.md, matcher-korpus.json, snapshots/, reports/)

**Files scanned:** ~30 (gezielt gelesen: 12 Volltexte + 18 Header/Top-30-Zeilen)

**Highlight-Reads:**
- `scripts/eval-matcher.ts` — 5 Sektionen (Z.1-183, 185-330, 332-513, 515-836, 838-840)
- `lib/wizard/pipeline.ts` — Vollstaendig (Z.1-337)
- `lib/wizard/types.ts` — Z.1-200 (PipelineStage + GenerationArtefacts kanonisch)
- `lib/wizard/programm-kriterien.ts` — Vollstaendig (Mapping-Pattern fuer geber-classification.ts)
- `lib/wizard/geber-guidance.ts` — Vollstaendig (Rubric-Vorbild Wave 3 Hebel 4)
- `lib/wizard/finanzplan-validator.ts` — Z.1-80 (validateFinanzplan-Signatur)
- `__tests__/lib/wizard/pipeline-events.test.ts` — Vollstaendig (LLM-Mock-Pattern)
- `.github/workflows/weekly-auto-pflege.yml` — Vollstaendig (Sibling-Workflow-Vorbild)
- `data/eval/BASELINE.md` — Z.1-50 (Format-Vorbild Phase-5-Block)
- `lib/wizard/prompts.ts` — Z.1-100 + Z.322-401 (System-Prompt-Schaerfungs-Target)

**Pattern extraction date:** 2026-05-19

---

*Phase: 05-wizard-pipeline-tuning-ux-l-cke*
*Patterns mapped: 2026-05-19 durch gsd-pattern-mapper*
