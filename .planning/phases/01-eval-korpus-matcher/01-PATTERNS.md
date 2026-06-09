# Phase 1: Eval-Korpus Matcher - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 5 (3 TS-Skript / 1 JSON-Daten / 1 Markdown-Doku)
**Analogs found:** 4 / 5 (BASELINE.md ist Markdown-Doku ohne direkten Code-Analog)

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `data/eval/matcher-korpus.json` | data-fixture | static-load | `mocks/test-programme.json` (+ Daten-Konvention `data/foerderprogramme.json`) | role-match (Test-Fixture-Struktur als JSON-Array auf Top-Ebene) |
| `scripts/eval-matcher.ts` | tooling-script (CLI) | batch + request-response (Live-LLM ueber `runMatch`) | `scripts/smoke-pipeline-with-extractor.ts` (Hauptanalog) + `scripts/smoke-pipeline-models.ts` (A/B-Aggregation/Tabellen-Output) + `scripts/smoke-facts-extractor.ts` (per-entry-Check + exit-code) + `scripts/extract-richtlinie.ts` (process.argv-CLI-Flags) | role-match (mehrere Patterns kombiniert — kein Skript hat exakt diesen Mix) |
| `data/eval/reports/<ISO>.json` | output-artefact | file-I/O (write) | `tmp/pipeline-extractor-*.json` Output-Pattern aus `smoke-pipeline-with-extractor.ts` Zeilen 200-214 | role-match (gleiches mkdir+writeFile-JSON.stringify-Pattern, neuer Pfad) |
| `data/eval/snapshots/<ISO>/<entry-id>.json` | output-artefact | file-I/O (write/read) | `tmp/ab-section/{modell}_run{r}.md` aus `smoke-pipeline-models.ts` Zeile 214-219 (Per-Run-File-Pattern) | role-match |
| `data/eval/BASELINE.md` | documentation | file-I/O (manual append) | kein direkter Code-Analog; orientiert sich an `CLAUDE.md`/`PR_DRAFT_WIZARD.md` Doku-Stil | no-analog (siehe „No Analog Found") |

## Pattern Assignments

### `scripts/eval-matcher.ts` (tooling-script, batch + request-response)

**Hauptanalog:** `scripts/smoke-pipeline-with-extractor.ts`
**Sekundaere Analoga:** `scripts/smoke-pipeline-models.ts` (A/B-Aggregation), `scripts/smoke-facts-extractor.ts` (Per-Entry-Checks), `scripts/extract-richtlinie.ts` (CLI-Flags)

**1) File-Header-JSDoc-Block (warum existiert das Skript + Run-Kommando)**

Quelle: `scripts/smoke-pipeline-with-extractor.ts:1-12`
```typescript
/**
 * End-to-End-Re-Run der Pipeline mit dem UAT-Korpus vom 28.04. UND der neuen
 * dedizierten Facts-Extractor-Stage (Bug #5-Fix).
 *
 * Unterschied zu smoke-pipeline-rerun.ts: dort werden die in der DB gespeicherten
 * UAT-Facts (mit den meisten Slots null) an runPipeline gegeben — hier wird
 * extractFacts zuerst auf den Verlauf angewendet, sodass die Pipeline mit einem
 * reichhaltigen Facts-Stand startet. ...
 *
 * Run: `npx tsx --env-file=.env.local scripts/smoke-pipeline-with-extractor.ts`
 */
```

Konvention: Top-of-file JSDoc-Block in deutscher Sprache mit Zweck + expliziter `Run:`-Zeile mit `npx tsx --env-file=.env.local <pfad>`. Eval-Matcher uebernimmt das 1:1 inkl. Hinweis auf `--snapshot`/`--replay`/`--md-summary`-Flags.

**2) Imports + REPO-Konstante (Pfad-Aufloesung)**

Quelle: `scripts/smoke-pipeline-with-extractor.ts:14-25`
```typescript
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { GenerationArtefacts, WizardFacts, WizardMessage } from "../lib/wizard/types";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";
import { runPipeline } from "../lib/wizard/pipeline";
import { extractFacts } from "../lib/wizard/facts-extractor";

const REPO = resolve(__dirname, "..");
const SESSION_TOKEN = "37571430-e26c-448f-aef1-59e902097d1c";
```

Konvention: Imports relative `../lib/...` (NICHT `@/`-Alias — Skripte umgehen das Next-Build) · `node:fs/promises` und `node:path` als Node-Built-ins · Modul-private Konstanten oben SCREAMING_SNAKE_CASE. Eval-Matcher braucht: `runMatch`, `MatchInput`, `MatchResult` aus `../lib/wizard/matcher`, `Foerderprogramm` aus `../lib/foerderSchema`, `addUsage`/`emptyLedger` aus `../lib/wizard/pricing`.

**3) CLI-Argument-Parsing (Flags)**

Quelle: `scripts/extract-richtlinie.ts:314-342`
```typescript
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Nutzung:\n" +
        "  npx tsx scripts/extract-richtlinie.ts --list [N]\n" +
        "  npx tsx scripts/extract-richtlinie.ts --next [zusaetzliche-urls...]\n" +
        "  npx tsx scripts/extract-richtlinie.ts <programmId> <url-oder-datei> [weitere...]\n"
    );
    process.exit(2);
  }

  if (args[0] === "--list") {
    const n = args[1] ? parseInt(args[1], 10) : 10;
    await cmdList(...);
    return;
  }
  if (args[0] === "--next") {
    await cmdNext(args.slice(1));
    return;
  }
  ...
}
```

Konvention: Plain `process.argv.slice(2)` mit String-Vergleich auf `args[0]`/`includes(...)` — KEIN externer Argparser (yargs/commander/`util.parseArgs`) im Repo. Default-Branch (= ohne Flag) ist Live-Run; `--snapshot`, `--replay <dir>`, `--md-summary` werden via einfacher Index-Suche in `args` erkannt. Bei Unbekanntem Flag `process.exit(2)` mit Nutzungs-Hinweis.

**4) Top-Level-Async + Console-Sektionen + Process-Exit-Disziplin**

Quelle: `scripts/smoke-pipeline-with-extractor.ts:109-220`
```typescript
async function main() {
  console.log("=".repeat(80));
  console.log("Pipeline End-to-End Re-Run mit geschaerftem Critique");
  console.log("=".repeat(80));

  const [programm, richtlinie, session] = await Promise.all([loadProgramm(), loadRichtlinie(), loadSession()]);
  console.log(`Programm: ${programm.name}`);
  // ... Stages mit '\n>>> Stage X startet ...' und Sub-Bullet-Logs
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Konvention: `async function main()` als einziger Einstieg, `main().catch(...) process.exit(1)` am Datei-Ende. Sektion-Header mit `"=".repeat(80)` + Titel + nochmal `"=".repeat(80)`. Stage-Start mit `'\n>>> ... startet ...'`-Pattern. Eval-Matcher nutzt das Pro-Korpus-Eintrag fuer Live-Logging.

**5) Per-Entry-Check + Aggregation (Recall@3 / Off-Target-Rate)**

Quelle: `scripts/smoke-facts-extractor.ts:61-138, 163-184`
```typescript
interface SlotCheck {
  slot: string;
  expected: string;
  actual: unknown;
  ok: boolean;
  level: "critical" | "soft";
}

function check(facts: WizardFacts): SlotCheck[] {
  return [
    { slot: "schule.name", expected: "Borsigwalder Grundschule", actual: schule.name,
      ok: schule.name === "Borsigwalder Grundschule", level: "critical" },
    // ...
  ];
}
// Per-entry-Auswertung
console.log("\nSlot-Checks (CRITICAL = Bug-#5-Beweis, SOFT = LLM-Varianz erlaubt):");
for (const c of checks) {
  const sym = c.ok ? "✓" : "✗";
  const tag = c.level === "critical" ? "[CRIT]" : "[soft]";
  console.log(`  ${sym} ${tag} ${c.slot} — erwartet: ${c.expected}`);
}
const critPassed = critical.filter((c) => c.ok).length;
console.log(`\nCRITICAL: ${critPassed}/${critical.length} bestanden.`);
```

Konvention: Pro Korpus-Eintrag eine `EntryResult`-Struktur mit erwartet/ist/passed-Feldern; Aggregation via `array.filter(... ).length`-Pattern. Eval-Matcher uebersetzt das auf:
- pro Eintrag: `expectedTop3`, `matcherTop3`, `recall = |intersection|/|expectedTop3|`, `offTargetHit = matcher_top3 ∩ expected_off_target !== ∅`
- Aggregation: arithmetisches Mittel ueber Nicht-Edge-Eintraege (D-09) + Per-Kategorie-Breakdown via `entries.filter(e => e.category === 'kurz').reduce(...)`

**6) Cost-Aggregation ueber alle Entries (`CostLedger`)**

Quelle: `scripts/smoke-pipeline-with-extractor.ts:153-156` + `lib/wizard/pricing.ts:78-93`
```typescript
// im Smoke:
let totalTokens = 0;
for (const u of result.usages) totalTokens += u.usage.promptTokens + u.usage.candidatesTokens;
console.log(`Calls: ${result.usages.length}, Tokens gesamt: ${totalTokens}`);
```
+ aus `lib/wizard/pricing.ts`:
```typescript
export function addUsage(ledger: CostLedger, model: string, usage: Usage): CostLedger {
  const usdCents = computeUsdCents(model, usage);
  return {
    calls: ledger.calls + 1,
    promptTokens: ledger.promptTokens + usage.promptTokens,
    candidatesTokens: ledger.candidatesTokens + usage.candidatesTokens,
    totalTokens: ledger.totalTokens + usage.promptTokens + usage.candidatesTokens,
    usdCents: Math.round((ledger.usdCents + usdCents) * 100) / 100,
    eurCents: Math.round((ledger.eurCents + usdCents * USD_TO_EUR) * 100) / 100,
    entries: [...ledger.entries, { model, ...usage, usdCents }],
  };
}
```

Konvention: Pro Korpus-Eintrag liefert `runMatch()` ein `costs: CostLedger`. Eval-Matcher startet mit `let aggregate = emptyLedger();` und merged via wiederholtem `addUsage` (oder `for (const e of result.costs.entries) aggregate = addUsage(aggregate, e.model, { promptTokens: e.promptTokens, candidatesTokens: e.candidatesTokens })`). Endresultat: `aggregate.eurCents` als „Gesamtkosten in Euro-Cent" (D-12). `formatEur(aggregate.eurCents)` aus pricing.ts liefert die deutsche EUR-Formatierung.

**7) Hochrechnungs-/Zusammenfassungs-Tabelle am Skript-Ende**

Quelle: `scripts/smoke-pipeline-models.ts:232-261`
```typescript
console.log("\n" + "=".repeat(80));
console.log("ZUSAMMENFASSUNG");
console.log("=".repeat(80));
for (const modell of MODELLE) {
  const runs = all.filter((r) => r.modell === modell);
  if (!runs.length) continue;
  const avg = (sel: (r: RunResult) => number) => runs.reduce((s, r) => s + sel(r), 0) / runs.length;
  const min = (sel: (r: RunResult) => number) => Math.min(...runs.map(sel));
  const max = (sel: (r: RunResult) => number) => Math.max(...runs.map(sel));
  console.log(`\n${modell} (n=${runs.length})`);
  console.log(`  Latenz:           min ${(min((r) => r.latenzMs) / 1000).toFixed(1)}s · avg ${...}`);
  console.log(`  Kosten/Call:      ${avg((r) => r.usdCents).toFixed(3)} ¢ (avg)`);
}
```

Konvention: Konsolen-Tabelle als Plain-`console.log`-Block mit `"=".repeat(80)`-Trennlinien, deutschem Header („ZUSAMMENFASSUNG"), 2-Leerzeichen-Einrueckung, Punkt-Mittelpunkt `·` als Trennzeichen, Werte rechtsbuendig durch `padEnd`. Discretion (D-15): cli-table3 wird im Repo nicht genutzt — bleib bei `console.log` + Manual-Padding (oder schlankem `console.table` fuer einfache 2-Spalten-Faelle).

**8) JSON-Output-Persistenz (Reports + Snapshots)**

Quelle: `scripts/smoke-pipeline-with-extractor.ts:201-214`
```typescript
const outDir = resolve(REPO, "tmp");
const { mkdir, writeFile } = await import("node:fs/promises");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "pipeline-extractor-finaltext.md"), result.artefacts.finalText ?? "");
await writeFile(resolve(outDir, "pipeline-extractor-finanzplan.json"), newFinanzplanText);
await writeFile(
  resolve(outDir, "pipeline-extractor-critique.json"),
  JSON.stringify({ findings, resolutions }, null, 2)
);
```

Konvention: `mkdir(..., { recursive: true })` vor jedem Write · `JSON.stringify(obj, null, 2)` mit 2-Space-Pretty-Print · UTF-8 Default ohne Encoding-Param. Eval-Matcher ersetzt `tmp/` durch `data/eval/reports/` bzw. `data/eval/snapshots/<ISO>/`. ISO-Datum via `new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")` (Standard-Pattern fuer dateinamenfaehige Timestamps).

**9) `runMatch()`-Aufruf (zu evaluierende Funktion)**

Quelle: `lib/wizard/matcher.ts:209-252`
```typescript
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

export async function runMatch(input: MatchInput): Promise<MatchResult> { ... }
```

Konvention (Punkt-fuer-Punkt-Spiegelung in D-01):
- Korpus-Eintrag-Felder `id`, `category`, `notes`, `expected_top3`, `expected_off_target` sind **eval-spezifisch** und nicht im `MatchInput`
- Korpus-Eintrag-Feld `anliegen` (+ optionale Schul-Profil-Felder) wird 1:1 zu `MatchInput` (Spread-Pattern: `runMatch({ anliegen: e.anliegen, schulname: e.schulname, ... })`)
- Score-Threshold `< 50` wird vom Matcher selbst gefiltert (Zeile 238) — Eval-Skript liefert nur das `MatchResult.matches`-Array (max. 3 Eintraege) durch (D-17)
- `totalCandidates` und `filteredOut` aus dem Result koennen pro Eintrag in den Report aufgenommen werden (Diagnose: hat der BL-Filter Korpus-Erwartungen rausgekickt?)

**10) Validation: `expected_top3`-IDs muessen in `data/foerderprogramme.json` existieren**

Pattern-Vorbild: `lib/wizard/matcher.ts:233-240` (Set-Lookup gegen `programme.map((p) => p.id)`)
```typescript
const validIds = new Set(programme.map((p) => p.id));
const rawMatches = parsePipeMatches(rawText, validIds);
// ...
const p = programme.find((x) => x.id === m.id);
if (!p) continue;
```

Konvention: Eval-Matcher laedt zu Beginn `data/foerderprogramme.json`, baut `validIds = new Set(...)` und prueft pro Korpus-Eintrag, ob alle `expected_top3` und `expected_off_target` IDs in dem Set liegen. Bei Fehler: `console.error('[korpus-validation] Eintrag ev-007: expected_top3-ID "XYZ" nicht in foerderprogramme.json')` + `process.exit(2)` BEVOR der erste LLM-Call abgesetzt wird.

---

### `data/eval/matcher-korpus.json` (data-fixture, static-load)

**Analog:** `mocks/test-programme.json` (Test-Fixture-Pattern) · sekundaer `data/foerderprogramme.json` (Top-Level-Array-Konvention)

**Datei-Form:** JSON-Array auf Top-Ebene (D-04, kein Wrapper-Objekt). Anders als `data/richtlinien-prioritaeten.json` (das hat einen Wrapper mit `items`-Array fuer Metadaten) folgt das Korpus dem schlanken `foerderprogramme.json`-Pattern: direkt `[ {...}, {...}, ... ]`.

**Konventionen aus `lib/foerderSchema.ts`-Konvention (siehe `.planning/codebase/CONVENTIONS.md` Zeile 22):**
- Domain-Bezeichner deutsch in Identifiern erlaubt (`anliegen`, `schulname`, `bundesland`)
- Umlaute werden in JSON-Datenfeldern bewusst durch `ae/oe/ue/ss` ersetzt — Encoding-Drift vermeiden. Beispiel: `"besonderheiten"` (nicht `"besönderheiten"`), `"foerderfaehig"` (nicht `"förderfähig"`).
- camelCase im JSON-Schema (D-01: `expected_top3`/`expected_off_target` mit Snake-Case ist ein **Sonderfall** — Begruendung im Korpus-Header als JSON-Kommentar/JSON-Schluessel `_meta` festhalten, oder in v1.1 auf `expectedTop3` umstellen)

**Empfohlenes Schema (aus D-01 abgeleitet):**
```json
[
  {
    "id": "ev-001",
    "category": "ausfuehrlich",
    "anliegen": "Wir wollen einen Schulgarten anlegen...",
    "schulname": "Grundschule am Buschgraben",
    "schultyp": "grundschule",
    "bundesland": "Berlin",
    "geschaetztesBudgetEur": 8000,
    "expected_top3": ["aktion-mensch", "kultur-macht-stark"],
    "expected_off_target": ["bmbf-digitalpakt-2"],
    "notes": "Klassischer Goldstandard: klares Anliegen, BL-Match auf Berlin-Programme, Digital-Programm als Off-Target."
  }
]
```

**Validierungs-Hook:** `programmId`s in `expected_top3` und `expected_off_target` MUESSEN in `data/foerderprogramme.json` existieren (siehe Pattern 10 oben). Skript validiert beim Start.

---

### `data/eval/reports/<ISO>.json` (output-artefact, file-I/O write)

**Analog:** `tmp/pipeline-extractor-critique.json` (aus `smoke-pipeline-with-extractor.ts:206-209`)

**Output-Pattern:**
```typescript
await mkdir(resolve(REPO, "data/eval/reports"), { recursive: true });
const isoStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
await writeFile(
  resolve(REPO, `data/eval/reports/${isoStamp}.json`),
  JSON.stringify({ meta, aggregate, perEntry }, null, 2)
);
```

**Discretion-Punkt aus CONTEXT (D-15):** JSON-Schema-Detail-Tiefe ist Discretion — Empfehlung: pro Eintrag mindestens `id`, `category`, `expected_top3`, `expected_off_target`, `actual_top3` (mit id/score/begruendung), `recall`, `offTargetHit`, `latencyMs`, `costs.eurCents`. Aggregat oben: drei Hauptzahlen + Per-Kategorie-Breakdown + Latency-Mittelwert + `formatEur(totalEurCents)`.

---

### `data/eval/snapshots/<ISO>/<entry-id>.json` (output-artefact, file-I/O write/read)

**Analog:** `tmp/ab-section/{modell}_run{r}.md` aus `smoke-pipeline-models.ts:213-219`

**Snapshot-Pattern:**
```typescript
// Schreiben (--snapshot):
const snapDir = resolve(REPO, `data/eval/snapshots/${isoStamp}`);
await mkdir(snapDir, { recursive: true });
await writeFile(
  resolve(snapDir, `${entry.id}.json`),
  JSON.stringify({ input: matchInput, result: matchResult }, null, 2)
);

// Lesen (--replay <dir>):
const snapPath = resolve(REPO, replayDir, `${entry.id}.json`);
const { result } = JSON.parse(await readFile(snapPath, "utf-8"));
// → keine LLM-Calls, nur Score-/Recall-Berechnung
```

Konvention (D-14): Sub-Ordner pro Run-Datum (Discretion), eine Datei pro Korpus-Eintrag, JSON mit `input` + `result` (komplettes `MatchResult` inkl. `costs` und `totalCandidates`). Replay-Modus liest Snapshots, wertet identische Aggregations-Logik aus, schreibt Report ohne `costs`-Aggregat (oder mit `costs: { source: "snapshot" }`-Marker).

---

### `data/eval/BASELINE.md` (documentation, append-only)

**Analog:** keiner direkt — Markdown-Doku-Stil orientiert sich an `CLAUDE.md` (deutsch, kurze Abschnitte, Tabellen) und `PR_DRAFT_WIZARD.md` (Status + Datum-Stempel pro Eintrag).

**Append-only-Konvention (D-16):** Skript schreibt NICHT in `BASELINE.md` (manuell gepflegt). Phase 2 fuegt neue Eintraege oben dran. Empfohlene Struktur:
```markdown
# Matcher-Eval Baseline

## 2026-04-30 — Phase-1-Baseline (Korpus v1, n=27)

- **Matcher-Commit:** `<sha>`
- **Recall@3 (Mittelwert):** 0.78
- **Off-Target-Rate:** 11 %
- **Per-Kategorie:** kurz 0.72 / 0.15 · ausfuehrlich 0.85 / 0.06 · vag 0.69 / 0.18
- **Latenz/Eintrag:** 2.1s avg
- **Gesamtkosten:** 2.7 ¢
- **Report:** `data/eval/reports/2026-04-30T10-15-22.json`

## 2026-XX-XX — Phase-2-Erste-Iteration ...
```

## Shared Patterns

### Sprache und Encoding
**Quelle:** `CLAUDE.md` Zeile 19-22 + `.planning/codebase/CONVENTIONS.md` „Domain Language"
**Apply to:** alle neuen Dateien
- Deutsch in Doku, Logs, Commit-Subjects, JSDoc, Konsolen-Output
- ASCII-Umlaut-Substitution (`ae/oe/ue/ss`) in JSON-Daten und Konsolen-Strings, die durch Tooling laufen
- Domain-Bezeichner deutsch (`anliegen`, `schulname`, `programm`)

### Deepseek-Default + `--env-file=.env.local`
**Quelle:** `lib/wizard/llm.ts` (Default `deepseek-chat`) + `scripts/smoke-pipeline-with-extractor.ts:11`
**Apply to:** `scripts/eval-matcher.ts`
- Skript ruft `runMatch()` ohne Provider-Override → erbt automatisch DeepSeek `deepseek-chat`
- Run-Befehl: `npx tsx --env-file=.env.local scripts/eval-matcher.ts [flags]` (env-file ist PFLICHT, sonst fehlen `DEEPSEEK_API_KEY` und `DATABASE_URL`)
- Eval braucht **keine** DB-Connection (nur `runMatch` der read-only auf `data/foerderprogramme.json` + `data/richtlinien-prioritaeten.json` arbeitet) — `env-file`-Flag bleibt aber drin wegen `DEEPSEEK_API_KEY`

### Soft-Failure pro Korpus-Eintrag
**Quelle:** `lib/wizard/facts-extractor.ts` (siehe `CONVENTIONS.md` „Soft-failure pattern", Zeile 79-88)
```typescript
try {
  const result = await runMatch(matchInput);
  // ...
} catch (err) {
  console.warn(`[eval-matcher] Eintrag ${entry.id} fehlgeschlagen, weiter mit naechstem:`, err);
  perEntry.push({ id: entry.id, error: String(err), recall: null, offTargetHit: null });
}
```
- Konvention: ein einzelner LLM-Fehler bricht den Lauf nicht ab, wird als `error`-Feld pro Eintrag im Report ausgewiesen, in der Aggregation aus dem Recall-Mittel ausgeschlossen (analog Edge-Cases mit `expected_top3 = []`)
- Modul-Praefix in Logs: `[eval-matcher]` — folgt Pattern aus `console.warn("[wizard/facts-extractor] ...")`

### File-Naming
**Quelle:** `.planning/codebase/CONVENTIONS.md` „Naming Patterns" Zeile 12
- Skripte: kebab-case mit Kategorie-Praefix (`smoke-` fuer Smoke-Tests, `eval-` fuer Eval-Skripte ist passende Erweiterung)
- Daten-JSON: kebab-case (`matcher-korpus.json`, nicht `matcherKorpus.json` oder `matcher_korpus.json`)
- Markdown-Doku: SCREAMING_CASE fuer Top-Level-Konventions-/Status-Dateien (`BASELINE.md`, vergleiche `CLAUDE.md`, `DEPLOY.md`)

### TypeScript-Strict + Result-Objekte mit benannten Feldern
**Quelle:** `.planning/codebase/CONVENTIONS.md` „Function Design" + `MatchResult`-Definition in `matcher.ts:49-54`
- Tuple vermeiden, Named-Field-Objects bevorzugt: `{ matches, costs, totalCandidates, filteredOut }` statt `[matches, costs, ...]`
- Eval-Matcher-interne Typen: `interface KorpusEntry { ... }`, `interface EntryResult { ... }`, `interface AggregateMetrics { ... }` (alle PascalCase) — Export nur wo noetig (Smoke-Skripte exportieren typisch nichts; eval-matcher kann pure-internal bleiben)

## No Analog Found

| Datei | Rolle | Begruendung |
|-------|-------|-------------|
| `data/eval/BASELINE.md` | Dokumentation | Repo hat keine append-only-History-Markdown-Datei mit identischer Struktur. Vorbild kommt aus `RESEARCH.md`/Best-Practice (z. B. Eval-Logs aus ML-Repos). Doku-Stil aus `CLAUDE.md` adaptieren — bewusst manuell gepflegt, kein Code-Analog noetig. |

## Metadata

**Analog search scope:**
- `scripts/` (alle 9 `smoke-*.ts` + `extract-richtlinie.ts` + `scan-new-programs.ts` durchforstet)
- `lib/wizard/matcher.ts` (Hauptbezugspunkt fuer API)
- `lib/wizard/pricing.ts` (CostLedger-Aggregation)
- `data/foerderprogramme.json` + `data/richtlinien-prioritaeten.json` (Datenformat-Konventionen)
- `mocks/test-programme.json` (Fixture-Konvention)
- `.planning/codebase/CONVENTIONS.md`, `STACK.md`, `STRUCTURE.md`

**Files scanned:** 12 (3 Hauptanaloga gelesen, 9 weitere ueberflogen via Grep + STRUCTURE.md-Index)

**Pattern extraction date:** 2026-04-30

**Wichtige Lehre fuer den Planner:**
Das Eval-Skript ist eine **Komposition** aus drei Smoke-Skript-Patterns — kein Skript im Repo macht heute genau das. Konkret:
- Live-LLM-Loop ueber n Eintraege → `smoke-pipeline-with-extractor.ts`
- Pro-Modell-/Pro-Run-Aggregation mit Konsolen-Tabelle → `smoke-pipeline-models.ts`
- Per-Entry-Pass/Fail-Checks mit critical/soft-Klassifikation → `smoke-facts-extractor.ts`
- CLI-Flags (`--list`/`--next` als Vorbild fuer `--snapshot`/`--replay`/`--md-summary`) → `extract-richtlinie.ts`

Der Planner sollte das im Plan-Action explizit benennen, damit der Implementierer nicht den falschen Single-Analog 1:1 kopiert.
