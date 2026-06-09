# Phase 4: Programm-Pflege Vollautomation + Dossier-Migration — Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 7 (3 NEW, 2 DELETED, 4+ MODIFIED)
**Analogs found:** 7 / 7 (alle NEW-Files haben ≥1 starkes Analog im Repo)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/weekly-auto-pflege.yml` | workflow / cron | batch + PR-emit | `.github/workflows/weekly-dossier-extraction.yml` | exact (Pattern direkt fortschreiben, um Scan-Step + Per-Programm-Loop erweitern) |
| `scripts/cleanup-expired-queue.ts` | script (one-shot + reusable lib) | batch transform | `scripts/rebuild-queue.ts` (Iteration über Queue) + `scripts/extract-richtlinie.ts::markSkipInQueue` (Status-Mutator) | role-match (Score-Iteration) + exact (Status-Mutator) |
| `scripts/migrate-legacy-dossier.ts` | script (LLM targeted-fill CLI) | request-response (LLM) + file-I/O | `scripts/extract-richtlinie.ts::runExtraction` | exact (Anti-Halluzinations-Prompt + Validator-Gate + writeFile) |
| `lib/wizard/queue.ts` (NEU) oder Inline | utility / lib | data transform | `scripts/extract-richtlinie.ts::markSkipInQueue` + `scripts/rebuild-queue.ts` (Queue/QueueItem-Interfaces) | exact |
| `data/richtlinien-prioritaeten.json` (Status-Erweiterung) | data | static | bestehend, Schema-Erweiterung um `'expired'` | — |
| `data/richtlinien/*.json` (11 Dossiers, +4 Felder) | data | static | bereits durch Strict-Schema definiert (`bestPractices`/`rejectGruende`/`vorbildFormulierungen`/`fristLogik`) | — |
| `scripts/extract-richtlinie.ts` (Library-Fähigkeit) | script (CLI + lib export) | request-response | aktuell rein CLI — minimal Anpassung zum Export von `runExtraction` | self-refactor |

DELETED:
- `.github/workflows/weekly-program-scan.yml` (Funktion wandert in weekly-auto-pflege.yml)
- `.github/workflows/weekly-dossier-extraction.yml` (Funktion wandert in weekly-auto-pflege.yml)

---

## Pattern Assignments

### `scripts/cleanup-expired-queue.ts` (script, batch transform)

**Analog 1 (Queue-Iteration):** `scripts/rebuild-queue.ts`
**Analog 2 (Status-Mutator):** `scripts/extract-richtlinie.ts::markSkipInQueue`

**Imports + Pfad-Konstanten (von `scripts/rebuild-queue.ts:31-35` + `scripts/extract-richtlinie.ts:25-35`):**
```typescript
import fs from "node:fs/promises";
import path from "node:path";

const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");
const OUT_DIR = path.join(process.cwd(), "data", "richtlinien"); // fuer Frist-Check muss bestehende Dossiers laden
```

**Queue-Load/Save-Pattern (von `scripts/extract-richtlinie.ts:134-141`):**
```typescript
async function loadQueue(): Promise<Queue> {
  const raw = await fs.readFile(QUEUE_PATH, "utf8");
  return JSON.parse(raw) as Queue;
}

async function saveQueue(q: Queue): Promise<void> {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n");
}
```

**Status-Mutator-Pattern (von `scripts/extract-richtlinie.ts:167-179`, 1:1 als `markExpiredInQueue` neu schreiben):**
```typescript
async function markExpiredInQueue(programmId: string, reason: string): Promise<void> {
  try {
    const q = await loadQueue();
    const item = q.items.find((i) => i.programmId === programmId);
    if (!item) return;
    item.status = "expired";
    item.skipReason = reason; // Reason-Feld bleibt wiederverwendet, audit-relevant
    await saveQueue(q);
    console.log(`    Queue: ${programmId} → status=expired (${reason.slice(0, 80)}…)`);
  } catch (err) {
    console.warn(`    Queue-Update übersprungen: ${(err as Error).message}`);
  }
}
```

**Iterations-Pattern (von `scripts/rebuild-queue.ts:111-131`):**
```typescript
// Hier NICHT map() benutzen — wir wollen pro Item asynchron HEAD-Call machen
for (const item of q.items) {
  if (item.status !== "open" && item.status !== "done") continue; // skip-bucket nicht anfassen
  // ... HTTP-HEAD + Frist-Check + ggf. markExpiredInQueue
}
```

**HTTP-HEAD-Pattern (NEU, kein Analog im Repo — Claude's Discretion aus CONTEXT D-04):**
```typescript
// node:fetch ist seit Node 18 standard, kein axios/got nötig
async function headStatus(url: string, timeoutMs = 10_000): Promise<{ status: number; transient: boolean }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      // UA aus extract-richtlinie.ts:107-112 wiederverwenden — viele Bundes-Seiten blocken Bot-UA
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    return { status: res.status, transient: res.status >= 500 };
  } finally {
    clearTimeout(t);
  }
}
```

**Frist-Logik-Check (NEU, gegen `fristLogik`-Schema aus `lib/wizard/richtlinien-validator.ts:46-62`):**
```typescript
async function isExpiredByFrist(programmId: string): Promise<boolean> {
  try {
    const dossier = JSON.parse(await fs.readFile(path.join(OUT_DIR, `${programmId}.json`), "utf8"));
    const fl = dossier.fristLogik;
    if (!fl || fl.typ !== "fixe_stichtage") return false;
    if (fl.jaehrlich_wiederkehrend === true) return false;
    const today = new Date().toISOString().slice(0, 10);
    return Array.isArray(fl.stichtage) && fl.stichtage.length > 0
      && fl.stichtage.every((d: string) => d < today);
  } catch {
    return false; // kein Dossier vorhanden = kein expiry-by-Frist möglich
  }
}
```

**Mini-Report-Output (Pattern aus `scripts/rebuild-queue.ts:153-158`):**
```typescript
console.log(`==> Cleanup Ergebnis:`);
console.log(`    expired (404/410/403): ${expired404}`);
console.log(`    expired (Frist überschritten): ${expiredFrist}`);
console.log(`    transient (5xx, skipped): ${transient5xx}`);
console.log(`    unchanged: ${unchanged}`);
console.log(`    errors: ${errors}`);
// Test-Anker laut CONTEXT D-06: bundesweit-ganztag + nrwbank-moderne-schule MUSS expired sein
```

**Error-Pattern (von `scripts/rebuild-queue.ts:169-172`):**
```typescript
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

### `scripts/migrate-legacy-dossier.ts` (script, request-response + file-I/O)

**Analog:** `scripts/extract-richtlinie.ts::runExtraction` (Zeilen 225-344)

**Imports pattern (von `scripts/extract-richtlinie.ts:25-32`):**
```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
```

**SYSTEM-PROMPT-Pattern (von `scripts/extract-richtlinie.ts:57-99`, Anti-Halluzinations-Block übernehmen, neu rahmen für Targeted-Fill):**
```typescript
const SYSTEM_PROMPT = `Du erweiterst ein bestehendes Foerderrichtlinien-Dossier um VIER neue Felder: bestPractices, rejectGruende, vorbildFormulierungen, fristLogik. Alle BESTEHENDEN Felder bleiben UNVERAENDERT — du widersprichst NICHT, ueberschreibst NICHT, ergaenzt NICHTS ausserhalb der vier Zielfelder.

[... Zielfeld-Schema-Block analog extract-richtlinie.ts:84-89 ...]

REGELN GEGEN HALLUZINATION (kritisch — befolge sie strikt):
- Bestands-Daten in Kontext-Block sind unangreifbar. Wenn die Quelle nichts zu einem Feld hergibt, gib leeres Array zurueck.
- bestPractices und vorbildFormulierungen MUESSEN aus dem gelieferten Volltext belegbar sein.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus dem Bestands-antragsstruktur.abschnitte[].id entsprechen.
- stichtage IMMER im Format YYYY-MM-DD.
- Maximal 5 Eintraege pro Feld.

Nur valides JSON ausgeben, NUR die vier Felder als Top-Level-Objekt:
{ "bestPractices": [...], "rejectGruende": [...], "vorbildFormulierungen": [...], "fristLogik": {...} }`;
```

**LLM-Call-Pattern (von `scripts/extract-richtlinie.ts:247-264`):**
```typescript
console.log("==> LLM-Targeted-Fill laeuft (Provider: lib/wizard/llm.ts)");
let fill: { bestPractices: unknown; rejectGruende: unknown; vorbildFormulierungen: unknown; fristLogik: unknown };
try {
  const llmResult = await generateJson<typeof fill>(
    MODEL_PIPELINE,
    SYSTEM_PROMPT,
    userPrompt, // mit Bestands-Dossier als Kontext + Quellen-Volltext
    { maxTokens: 4000 } // kleiner als extract (8000) — nur 4 Felder
  );
  fill = llmResult.value;
} catch (err) {
  console.error(`LLM-Aufruf fehlgeschlagen: ${(err as Error).message}`);
  process.exit(3);
}
```

**Validator-Gate-Pattern (von `scripts/extract-richtlinie.ts:317-332`, exakt 1:1 wiederverwenden):**
```typescript
const merged: Richtlinie = { ...existing, ...fill };
merged.version = new Date().toISOString().slice(0, 10); // Discretion: Bump zulaessig

const strictParse = RichtlinieStrictSchema.safeParse(merged);
if (!strictParse.success) {
  console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
  for (const issue of strictParse.error.issues) {
    console.error(`    ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}
const fkIssues = validateForeignKeys(merged as never, programmId);
if (fkIssues.length > 0) {
  console.error(`==> FK-Verletzungen fuer ${programmId}:`);
  for (const issue of fkIssues) {
    console.error(`    ${issue.abschnitt_id}: ${issue.reason}`);
  }
  process.exit(1);
}

await fs.writeFile(
  path.join(OUT_DIR, `${programmId}.json`),
  JSON.stringify(merged, null, 2) + "\n"
);
console.log(`==> Migriert: data/richtlinien/${programmId}.json`);
```

**CLI-Entry-Pattern (von `scripts/extract-richtlinie.ts:346-379`, vereinfacht — nur 1 Modus):**
```typescript
async function main() {
  const args = process.argv.slice(2);
  const [programmId] = args;
  if (!programmId) {
    console.error("Nutzung: npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>");
    process.exit(2);
  }
  await migrate(programmId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

### `.github/workflows/weekly-auto-pflege.yml` (workflow, batch + PR-emit)

**Analog:** `.github/workflows/weekly-dossier-extraction.yml` (gesamtes File)

**Trigger-Pattern (von `weekly-dossier-extraction.yml:9-26`):**
```yaml
on:
  schedule:
    - cron: "0 4 * * 1" # Montag 04:00 UTC, ersetzt funktional beide alten Workflows
  workflow_dispatch:
    inputs:
      llm_provider:
        description: "LLM-Provider override"
        required: false
        type: choice
        options:
          - deepseek
          - gemini
        default: deepseek
```

**Job-Setup-Pattern (von `weekly-dossier-extraction.yml:27-46`):**
```yaml
jobs:
  auto-pflege:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write  # peter-evans/create-pull-request@v7
      issues: write          # NEU fuer D-10/D-11/D-12 Failure-Issue
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: "20" }

      - name: Install dependencies
        run: npm ci
```

**Secret-Pre-Flight-Check (von `weekly-dossier-extraction.yml:56-65`, exakt 1:1 übernehmen):**
```yaml
env:
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
run: |
  set -euo pipefail
  if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
    echo "::error::DEEPSEEK_API_KEY Secret fehlt. ..."
    exit 1
  fi
  if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
    exit 1
  fi
```

**PR-Pattern (von `weekly-dossier-extraction.yml:99-131`, pro Programm einen PR — D-02):**
```yaml
- name: Create Pull Request for ${{ steps.extract.outputs.programm_id }}
  if: steps.diff.outputs.changed == 'true'
  uses: peter-evans/create-pull-request@v7
  with:
    commit-message: "chore(richtlinien): Dossier ${{ steps.extract.outputs.programm_id }} via Auto-Pflege"
    branch: dossier-bot/${{ steps.extract.outputs.programm_id }}
    delete-branch: true
    title: "Neues Dossier: ${{ steps.extract.outputs.programm_id }}"
    body: |
      Automatisch vom wöchentlichen Auto-Pflege-Cron extrahiert.

      **Programm:** `${{ steps.extract.outputs.programm_id }}`

      ### Reviewer-Checkliste
      - [ ] Förderhöhe / maxEur / mindestProzent stimmen mit Originalrichtlinie
      [... 10 Checkboxen exakt wie in weekly-dossier-extraction.yml:113-123 ...]
    labels: |
      richtlinien-bot
      auto-generated
```

**Diff-Detection-Pattern (von `weekly-dossier-extraction.yml:88-97`, identisch pro Programm):**
```yaml
- name: Detect changes
  id: diff
  run: |
    set -euo pipefail
    if git diff --quiet data/richtlinien data/richtlinien-prioritaeten.json; then
      echo "changed=false" >> "${GITHUB_OUTPUT}"
    else
      echo "changed=true" >> "${GITHUB_OUTPUT}"
    fi
```

**Continue-on-Error pro Programm (NEU für D-11 — kein direktes Analog, Idiom aus Workflow-Pattern):**
```yaml
- name: Process program ${{ matrix.programmId }}
  continue-on-error: true  # KEY: pro Programm robust
  id: process
  run: |
    set -euo pipefail
    # try-catch in TS-Wrapper-Script statt direkt in Shell — sauberer Error-Classifier
    npx tsx scripts/auto-pflege-step.ts "${{ matrix.programmId }}"
```

**GitHub-Issue-Creation-Pattern (NEU für D-10/D-12 — Idiom mit gh CLI):**
```yaml
- name: Open failure issue
  if: failure() || env.HAS_FAILURES == 'true'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    set -euo pipefail
    DATE=$(date -u +%Y-%m-%d)
    gh issue create \
      --title "🤖 dossier-bot failure ${DATE}" \
      --label bot-failure \
      --body-file failure-report.md

- name: Close stale failure issues on success
  if: success()
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    set -euo pipefail
    for issue in $(gh issue list --label bot-failure --state open --json number -q '.[].number'); do
      gh issue close "${issue}" --comment "Auto-resolved by green cron run."
    done

- name: Upload diagnostic artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: dossier-bot-logs-${{ github.run_id }}
    path: |
      logs/
      failure-report.md
    retention-days: 30
```

---

### `lib/wizard/queue.ts` (NEU, utility) ODER Inline in `cleanup-expired-queue.ts`

**Analog:** `scripts/extract-richtlinie.ts:37-55` (Queue-Interfaces) + `scripts/rebuild-queue.ts:61-81`

**Status-Enum-Erweiterung (D-05, neuer Wert `'expired'`):**
```typescript
// VORHER (extract-richtlinie.ts:46):
// status: "open" | "done" | "skip";

// NACHHER:
export type QueueStatus = "open" | "done" | "skip" | "expired";

export interface QueueItem {
  programmId: string;
  name: string;
  foerdergeberTyp?: string;
  foerdersummeMax?: number | null;
  reichweite?: string;
  infoLink?: string;
  score: number;
  status: QueueStatus;
  skipReason?: string; // bleibt — wird auch fuer expired-Reason wiederverwendet
}

export interface Queue {
  generatedAt: string;
  description: string;
  criteria: string;
  total: number;
  items: QueueItem[];
}
```

**Public-Helper-Pattern (Refactor von 3 Stellen, die heute jeweils eigene loadQueue/saveQueue/markX haben):**
```typescript
export async function loadQueue(): Promise<Queue> { /* fs.readFile + JSON.parse */ }
export async function saveQueue(q: Queue): Promise<void> { /* JSON.stringify mit \n */ }
export async function markDoneInQueue(programmId: string): Promise<void> { /* von extract-richtlinie.ts:143-156 */ }
export async function markSkipInQueue(programmId: string, reason: string): Promise<void> { /* von extract-richtlinie.ts:167-179 */ }
export async function markExpiredInQueue(programmId: string, reason: string): Promise<void> { /* NEU, analog markSkipInQueue */ }
```

**Knock-on: `scripts/rebuild-queue.ts:61` Type-Alias erweitern:**
```typescript
type QueueStatus = "open" | "done" | "skip" | "expired"; // expired wird durch oldByPid weitergetragen
```

---

### `scripts/extract-richtlinie.ts` (CLI → CLI + Library)

**Minimaler Refactor:** `runExtraction` als Named Export verfügbar machen, damit `weekly-auto-pflege.yml` ein dünnes Wrapper-Script (`scripts/auto-pflege-step.ts`) hat, das `runExtraction(id, [infoLink])` direkt aufruft.

**Vor (extract-richtlinie.ts:225):**
```typescript
async function runExtraction(programmId: string, srcs: string[]): Promise<void> {
```

**Nach:**
```typescript
export async function runExtraction(programmId: string, srcs: string[]): Promise<void> {
```

Genauso für `fetchOrRead` (Z.101) und idealerweise auch `markSkipInQueue` (Z.167) — letztere wandert ohnehin nach `lib/wizard/queue.ts`, dann ist `extract-richtlinie.ts` der Konsument.

---

## Shared Patterns

### LLM-Wrapper (Single Source of Truth)

**Source:** `lib/wizard/llm.ts` (Phase-3-Konvention)
**Apply to:** `migrate-legacy-dossier.ts`, `auto-pflege-step.ts` (jeder LLM-Call in Phase 4)

```typescript
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";

const llmResult = await generateJson<MyShape>(
  MODEL_PIPELINE,
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 4000 } // klein fuer targeted-fill, gross (8000) fuer full-extract
);
const value = llmResult.value;
const { promptTokens, candidatesTokens } = llmResult.usage; // optional fuer Cost-Log
```

**WICHTIG:** Niemals `@google/generative-ai` oder `openai` direkt importieren. Phase-3-FETCH-01 hat diese Verhärtung etabliert.

### Validator-Pre-Persist-Gate

**Source:** `lib/wizard/richtlinien-validator.ts` + `scripts/extract-richtlinie.ts:317-332`
**Apply to:** `migrate-legacy-dossier.ts`, `auto-pflege-step.ts` — JEDER Pfad, der ein Dossier nach `data/richtlinien/` schreibt

```typescript
import { RichtlinieStrictSchema, validateForeignKeys } from "../lib/wizard/richtlinien-validator";

// 1. Strict-Schema-Parse — bei Verletzung: process.exit(1), KEIN writeFile
const strictParse = RichtlinieStrictSchema.safeParse(parsed);
if (!strictParse.success) {
  console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
  for (const issue of strictParse.error.issues) {
    console.error(`    ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

// 2. Cross-Field-FK-Check — vorbildFormulierungen[].abschnitt_id MUSS auf existierende abschnitte.id zeigen
const fkIssues = validateForeignKeys(parsed as never, programmId);
if (fkIssues.length > 0) { /* exit 1 */ }

// 3. Erst JETZT schreiben
await fs.writeFile(outPath, JSON.stringify(parsed, null, 2) + "\n");
```

### Empty-Skip + Expired-Filter (Orthogonal)

**Source:** `scripts/extract-richtlinie.ts:266-306` (Empty-Skip-Schutz) + NEU für `expired`
**Apply to:** Vollautomations-Workflow + Cleanup-Skript

| Status | Bedeutung | Wird gesetzt von |
|--------|-----------|------------------|
| `open` | Dossier fehlt, Programm bedienbar | rebuild-queue.ts (default) |
| `done` | Dossier in `data/richtlinien/<id>.json` | extract-richtlinie.ts:143 |
| `skip` | Kolja hat manuell deprioritisiert ODER Empty-Extract | extract-richtlinie.ts:167 |
| `expired` | infoLink 404/410/403 ODER alle Stichtage in Vergangenheit | cleanup-expired-queue.ts (NEU) |

**`--next`-Picker-Filter (Phase 4 Anpassung in extract-richtlinie.ts:206):**
```typescript
// VORHER: const next = q.items.find((i) => i.status === "open");
// NACHHER:
const next = q.items.find((i) => i.status === "open");  // bleibt — open ignoriert skip UND expired automatisch
```
Aber: Test-Anker D-06 verifiziert, dass `bundesweit-ganztag` + `nrwbank-moderne-schule` von `skip` → `expired` migriert werden (heute fälschlich `skip` wegen Empty-Extract trotz toter Quelle).

### GitHub-Workflow-Härtung

**Source:** `.github/workflows/weekly-dossier-extraction.yml:50-86`
**Apply to:** `weekly-auto-pflege.yml`

| Regel | Konkret |
|-------|---------|
| `set -euo pipefail` | Erste Zeile jedes `run:`-Blocks |
| User-Input NIE direkt interpolieren | `${{ github.event.inputs.X }}` → in `env:` laden, dann Bash-Var `"${X}"` zitiert |
| Secret-Pre-Flight | Vor LLM-Calls `if [ -z "${DEEPSEEK_API_KEY}" ]; then ... exit 1; fi` |
| Inline Node-Eval mit env-Bridge | `PID="${PID}" node -e "... process.env.PID ..."` statt String-Interpolation in JS-Code |

Konkretes Anti-Pattern-Beispiel aus weekly-dossier-extraction.yml:67-74 (bewusst defensiv, hier weiterverwenden):
```yaml
PID="${PROGRAM_ID_INPUT}"
LINK=$(PID="${PID}" node -e "
  const q = require('./data/richtlinien-prioritaeten.json');
  const it = q.items.find(i => i.programmId === process.env.PID);
  // ...
")
```

### CLI-Aufruf-Konvention für lokale Smokes

**Source:** Phase-3-Konvention, CLAUDE.md
**Apply to:** Alle neuen TS-Skripte

```bash
npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts
npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts bmbf-digitalpakt-2
```

`--env-file=.env.local` lädt `DEEPSEEK_API_KEY` aus dem lokalen File ins `process.env` — analog zu allen bestehenden smoke-*.ts Scripts.

### Stop-Conditions / Process-Exit-Codes

**Source:** `scripts/extract-richtlinie.ts` (etabliert in Phase 3)
**Apply to:** Alle neuen Skripte für konsistente CI-Signalisierung

| Exit | Bedeutung | Ursprung |
|------|-----------|----------|
| 0 | Erfolg | default |
| 1 | Schema-/FK-Verletzung (Pre-Persist-Gate-Verletzung) | extract-richtlinie.ts:323,331 |
| 2 | Nutzungs-Fehler (fehlende Args) | extract-richtlinie.ts:355,371 |
| 3 | LLM-Aufruf fehlgeschlagen | extract-richtlinie.ts:263 |
| 4 | Datenfehler (z.B. infoLink fehlt in Queue) | extract-richtlinie.ts:216 |
| 5 | Leere Extraktion (substanzOk=false) | extract-richtlinie.ts:305 |

Für `cleanup-expired-queue.ts` und `migrate-legacy-dossier.ts` dieselbe Skala verwenden — der Workflow-Bash kann dann pro Exit-Code andere Failure-Klassen ans GitHub-Issue (D-12) weiterreichen.

### Deutsche Encoding-Konvention

**Source:** `CLAUDE.md:19` + Phase-3-Konvention
**Apply to:** Alle Konsolen-Ausgaben + PR-Bodies + Commit-Messages

- Deutsch in Doku, Texten, Commit-Messages, Logs
- Umlaute (ä/ö/ü/ß) **in Werten erlaubt** (PR-Body, Konsolen-Output)
- **In JSON-Datenfeldern (Feldnamen + Schlüssel-Werten):** ASCII bevorzugen (`haeufig` statt `häufig` etc.) — alle bestehenden Schemas folgen dem
- **In LLM-Prompts:** SYSTEM_PROMPT in extract-richtlinie.ts nutzt durchgehend ASCII-Äquivalente (`Foerderrichtlinie`, `Foerderhoehe`) — selbe Konvention für migrate-prompt

### Pricing-Tracking (optional, falls Kostentransparenz gewünscht)

**Source:** `lib/wizard/llm.ts:21` (Type) + `lib/wizard/pricing.ts`
**Apply to:** Auto-Pflege-Workflow für Pro-Run-Kosten-Log

```typescript
const llmResult = await generateJson<T>(...);
const { promptTokens, candidatesTokens } = llmResult.usage;
console.log(`    Tokens: ${promptTokens} in + ${candidatesTokens} out`);
```

Konsistent zu extract-richtlinie.ts:339-341.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (HTTP-HEAD-Check-Logik) | utility-fragment | request-response | Im Repo existiert KEIN existierender HTTP-HEAD-Caller. Alle bisherigen `fetch()`-Aufrufe sind GET (extract-richtlinie.ts:107, scan-new-programs.ts:101). Für `cleanup-expired-queue.ts` müssen wir das HEAD-Pattern neu etablieren — Vorschlag im PATTERNS-Block oben (AbortController-Timeout + Browser-UA aus extract-richtlinie.ts wiederverwenden). |
| (Issue-Auto-Close-Logik im Workflow) | workflow-step | event | Kein existierender Workflow ruft `gh issue close` auf. Pattern oben ist Idiom-Vorschlag, basiert auf GitHub-Actions-Best-Practice (`gh issue list --label X --state open` + Loop). |
| (Continue-on-Error mit Failure-Aggregation) | workflow-orchestration | batch | Bestehende Workflows haben kein Per-Item-Resilience. NEU für D-11. Empfehlung: TS-Wrapper `scripts/auto-pflege-step.ts` macht try/catch pro Programm und schreibt `logs/<programmId>.log` + `failure-report.md`-Anhang — der Workflow ruft das in einer Bash-Schleife pro Programm-ID auf. Nicht via GitHub-Actions-Matrix (überkill für N<5 typisch). |

---

## Wichtige Knock-on-Effekte (für Planner)

1. **`scripts/extract-richtlinie.ts::markSkipInQueue` ist bereits Phase-3-D-11-Anker** (D-11 in Phase-3-Kontext = Workflow-PR-Pattern; CONTEXT Z.118 hier referenziert Phase-3-D-11). Wenn `lib/wizard/queue.ts` neu angelegt wird, MUSS extract-richtlinie.ts denselben Helper-Import nutzen (kein Code-Duplikat) — andernfalls drift zwischen 3 Status-Mutator-Stellen.

2. **`data/richtlinien-prioritaeten.json` Status-Enum-Migration:** Beim ersten Schreiben mit `status: "expired"` werden alle Konsumenten gezwungen, die Status-Union zu erweitern. Konsumenten heute: `extract-richtlinie.ts` (Z.46), `rebuild-queue.ts` (Z.61), `validate-data.ts`/`validate-data.js`. Planner sollte verifizieren, dass die Status-Enum-Erweiterung in beiden Source-Files synchron passiert.

3. **CONTEXT D-09 Sample-First (`bmbf-digitalpakt-2` + `ferry-porsche-challenge-2025`):** Das `migrate-legacy-dossier.ts`-Skript MUSS für genau diese zwei Dossiers stoppbar sein (z.B. nicht in einer Schleife alle 11 nacheinander, sondern explizit pro-ID-CLI). Pattern oben mit `<programmId>`-Pflichtargument deckt das.

4. **CONTEXT D-08 (1 PR mit 11 Commits):** Workflow-relevant — der Planner muss klar machen, dass `migrate-legacy-dossier.ts` lokal in 11 separaten Commits gefahren wird, NICHT in einem CI-Cron. Workflow `weekly-auto-pflege.yml` ist NUR für FETCH-02 (neue Programme), NICHT für FETCH-04 (Migration).

5. **`data/program-candidates.json` entfällt komplett** (CONTEXT D-01). Wenn diese Datei nicht mehr geschrieben wird, sollte sie auch nicht mehr im Repo liegen — Planner muss die Lösch-Aktion explizit machen, sonst bleibt sie als toter Artefakt.

---

## Metadata

**Analog search scope:**
- `/home/kolja/edufunds-app/scripts/` (78 Files, fokussiert auf `extract-richtlinie.ts`, `scan-new-programs.ts`, `rebuild-queue.ts`, `validate-richtlinien.ts`)
- `/home/kolja/edufunds-app/.github/workflows/` (5 Files, fokussiert auf `weekly-*.yml`)
- `/home/kolja/edufunds-app/lib/wizard/` (`llm.ts`, `richtlinien-validator.ts`, `richtlinien-schema.ts`)
- `/home/kolja/edufunds-app/data/richtlinien/` (11 Dossier-Files, 1 inspiziert für Schema-Realität)

**Files scanned (in voller Tiefe gelesen):**
- `scripts/extract-richtlinie.ts` (380 Zeilen)
- `scripts/scan-new-programs.ts` (262 Zeilen)
- `scripts/rebuild-queue.ts` (173 Zeilen)
- `scripts/validate-richtlinien.ts` (126 Zeilen)
- `lib/wizard/llm.ts` (227 Zeilen)
- `lib/wizard/richtlinien-validator.ts` (194 Zeilen)
- `lib/wizard/richtlinien-schema.ts` (Top 80 Zeilen)
- `.github/workflows/weekly-dossier-extraction.yml` (131 Zeilen)
- `.github/workflows/weekly-program-scan.yml` (102 Zeilen)
- `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md`
- `.planning/ROADMAP.md` (Phase-4-Section)
- `CLAUDE.md`

**Pattern extraction date:** 2026-05-19
