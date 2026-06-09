---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: 04
type: execute
wave: 3
depends_on:
  - 01
  - 03
files_modified:
  - scripts/extract-richtlinie.ts
  - scripts/auto-pflege-step.ts
  - .github/workflows/weekly-auto-pflege.yml
  - .github/workflows/weekly-dossier-extraction.yml
  - .github/workflows/weekly-program-scan.yml
  - data/program-candidates.json
autonomous: false
requirements:
  - FETCH-02
  - FETCH-04
user_setup:
  - service: github-actions
    why: "Workflow nutzt secrets.DEEPSEEK_API_KEY (bestehend aus Phase 3) und secrets.GITHUB_TOKEN (auto-bereitgestellt). Optional secrets.GEMINI_API_KEY fuer Fallback. Plus: fuer den Live-E2E-Smoke (Task 4) muss der Branch dossier-migration/phase-04 einmalig zu origin gepusht sein, damit `gh workflow run` den Workflow auf diesem Branch starten kann."
    env_vars:
      - name: DEEPSEEK_API_KEY
        source: "Bereits aus Phase 3 in Repo-Secrets vorhanden — keine Aktion noetig"
      - name: GITHUB_TOKEN
        source: "Auto-bereitgestellt durch GitHub Actions (permissions issues:write fuer Failure-Issue + pull-requests:write fuer PR-Erstellung)"
    dashboard_config:
      - task: "Verifizieren dass GitHub-Actions Berechtigungen 'contents:write + pull-requests:write + issues:write' fuer den Workflow erlauben"
        location: "Repository Settings → Actions → General → Workflow permissions"
must_haves:
  truths:
    - "Workflow weekly-auto-pflege.yml laeuft pro neuem Programm sequenziell: Scan → HTTP-HEAD → Extract → Strict-Validator → PR pro Programm"
    - "Beide alten Workflow-Files (weekly-dossier-extraction.yml + weekly-program-scan.yml) sind geloescht"
    - "data/program-candidates.json ist geloescht (D-01: in-memory list im Workflow-Run)"
    - "scripts/extract-richtlinie.ts exportiert runExtraction als Library-Function (kann auch weiterhin als CLI laufen) MIT optionalem skipQueueUpdate-Parameter um Lost-Update-Race mit auto-pflege-step.ts Queue-Writer zu vermeiden"
    - "scripts/auto-pflege-step.ts ist ein TS-Wrapper, der pro Programm scan + HEAD-Check + extract(skipQueueUpdate=true) + Failure-Klassifizierung in try/catch hat — wird vom Workflow in einer Bash-Schleife aufgerufen"
    - "auto-pflege-step.ts ist der EINZIGE Queue-Writer im Workflow-Pfad (D-11 + Race-Avoidance)"
    - "Workflow-Failure resultiert in einem GitHub-Issue mit Label bot-failure (D-10/D-11/D-12), bei naechstem gruenem Lauf wird offenes Issue auto-closed"
    - "E2E-Live-Smoke gegen den dispatched Workflow auf dem feature-Branch bringt einen gruenen Workflow-Run hervor (Success-Criterion #4)"
    - "Finale Strict-Validator-Lauf gegen alle 11 Dossiers (Task 6) ist der materielle Verifikations-Anker fuer FETCH-04 in diesem Plan"
  artifacts:
    - path: ".github/workflows/weekly-auto-pflege.yml"
      provides: "Single-Cron-Workflow Scan→Extract→Queue mit Per-Programm-Resilience"
      contains: "weekly-auto-pflege"
      min_lines: 110
    - path: "scripts/auto-pflege-step.ts"
      provides: "TS-Wrapper fuer eine Per-Programm-Iteration, mit Failure-Klassifizierung. Einziger Queue-Writer (kein Race mit runExtraction)."
      min_lines: 120
    - path: "scripts/extract-richtlinie.ts"
      provides: "CLI + Library-Export von runExtraction (mit skipQueueUpdate-Opt-Param)"
      exports: ["runExtraction", "fetchOrRead"]
  key_links:
    - from: ".github/workflows/weekly-auto-pflege.yml"
      to: "scripts/auto-pflege-step.ts"
      via: "npx tsx in Workflow-Step"
      pattern: "npx tsx scripts/auto-pflege-step.ts"
    - from: "scripts/auto-pflege-step.ts"
      to: "scripts/extract-richtlinie.ts"
      via: "runExtraction Import (mit skipQueueUpdate=true)"
      pattern: "runExtraction\\(.*skipQueueUpdate.*true"
    - from: "scripts/auto-pflege-step.ts"
      to: "lib/wizard/queue.ts"
      via: "loadQueue + markExpiredInQueue Import (Phase 4 Plan 01 Foundation)"
      pattern: "from \"../lib/wizard/queue\""
---

<objective>
Single-Workflow `weekly-auto-pflege.yml` ersetzt funktional beide alten Cron-Workflows. Pro Programm-ID, die der Scanner findet UND die noch nicht in `data/foerderprogramme.json` steht: HTTP-HEAD-Pre-Check (aus Plan 01), Extract via `runExtraction` (jetzt als Library aus Plan 02 wiederverwendet, MIT `skipQueueUpdate=true` um Race-Conditions zu vermeiden), Strict-Validator-Gate, Queue-Score-Berechnung, PR-Erstellung pro Programm (D-02). Failures pro Programm werden eingesammelt und in einem GitHub-Issue mit Label `bot-failure` reportet — beim naechsten gruenen Run wird das Issue auto-geschlossen.

Purpose: D-01, D-02, D-03, D-10, D-11, D-12 aus CONTEXT.md. Erfuellt FETCH-02 (Success-Criteria #1 + #2 der Phase 4). E2E-Live-Smoke (Success-Criterion #4) ist als erzwungene Live-Workflow-Dispatch-Task im Plan eingebaut (Variante A aus der Cross-AI-Review). Plus: finaler Strict-Validator-Lauf gegen alle 11 Dossiers (Task 6) ist der materielle FETCH-04-Anker in diesem Plan — FETCH-04 wird in drei Plans gedeckt (04-02 Skript, 04-03 Migration der 11 Dossiers, 04-04 finaler Validator-Lauf nach Plan-04-Merge).

Output:
- `.github/workflows/weekly-auto-pflege.yml` neu mit allen Hardening-Patterns aus Phase 3 (set -euo pipefail, Secret-Pre-Flight, kein direkter github.event.inputs in Shell)
- `scripts/auto-pflege-step.ts` neu als Per-Programm-TS-Wrapper mit try/catch + Failure-Klasse + structured Log; ist der ALLEINIGE Queue-Writer im Workflow-Pfad
- `scripts/extract-richtlinie.ts` minimal-Refactor: `runExtraction` als `export` MIT optionalem `skipQueueUpdate?: boolean`-Parameter, `fetchOrRead` als `export`. CLI laeuft weiter (Default `skipQueueUpdate=false`, CLI behaelt sein bestehendes Queue-Write-Verhalten)
- Loeschungen: `.github/workflows/weekly-dossier-extraction.yml`, `.github/workflows/weekly-program-scan.yml`, `data/program-candidates.json`
- E2E-Live-Workflow-Dispatch-Smoke: Branch wird gepusht, `gh workflow run weekly-auto-pflege.yml --ref dossier-migration/phase-04 -f max_programs=0` gestartet, Lauf wird abgewartet, Exit 0 ist Acceptance fuer Success-Criterion #4
- Kolja-Checkpoint mit Workflow-Static-Acceptance + Live-Dispatch-Resultat
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-01-queue-status-expired-cleanup-PLAN.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-03-sample-first-migration-vollmigration-PLAN.md
@.github/workflows/weekly-dossier-extraction.yml
@.github/workflows/weekly-program-scan.yml
@scripts/extract-richtlinie.ts
@scripts/scan-new-programs.ts
@scripts/rebuild-queue.ts
@lib/wizard/llm.ts
@lib/wizard/richtlinien-validator.ts
@lib/wizard/queue.ts
@data/program-sources.json
@.planning/todos/pending/live-workflow-smoke-deferred.md

<interfaces>
<!-- AUS Plan 01 (Plan 04 depends_on 01): lib/wizard/queue.ts -->
```typescript
export type QueueStatus = "open" | "done" | "skip" | "expired";
export interface QueueItem { ... }
export interface Queue { ... }
export async function loadQueue(): Promise<Queue>;
export async function saveQueue(q: Queue): Promise<void>;
export async function markExpiredInQueue(programmId: string, reason: string): Promise<void>;
```

<!-- AUS scripts/extract-richtlinie.ts:225 (zu refactoring): -->
```typescript
// VORHER: async function runExtraction(programmId: string, srcs: string[]): Promise<void>
// NACHHER (mit Race-Avoidance fuer Library-Konsum):
export async function runExtraction(
  programmId: string,
  srcs: string[],
  opts?: { skipQueueUpdate?: boolean }   // Default false — CLI-Verhalten bleibt
): Promise<void>;
```
Auch `fetchOrRead` (Z.101) bekommt `export`.

**Race-Avoidance-Begruendung (Cross-AI-Review WARNING 2):** runExtraction ruft am Ende `markDoneInQueue` aus `extract-richtlinie.ts` (eigene loadQueue/saveQueue-Helpers, NICHT `lib/wizard/queue.ts`). Wenn `auto-pflege-step.ts` als Library-Konsument parallel ueber `lib/wizard/queue.ts` auf dieselbe `data/richtlinien-prioritaeten.json` schreibt, koennen zwei Load-Save-Zyklen kollidieren → Lost-Update-Risiko bei N>1 sequenziellen Programmen.

**Loesung:** `runExtraction` bekommt optionalen `skipQueueUpdate`-Parameter (Default false). `auto-pflege-step.ts` ruft `runExtraction(id, urls, { skipQueueUpdate: true })` auf und wird damit zum EINZIGEN Queue-Writer im Workflow-Pfad — er macht selbst den Queue-Push fuer neu gefundene Programme (siehe Task 2 Code) und ggf. ein abschliessendes markDone via `lib/wizard/queue.ts` (statt der internen `markDoneInQueue`). CLI-Pfad bleibt unveraendert.

<!-- AUS scan-new-programs.ts:152-178 (zu wiederverwendend): -->
`scanSource(src, verbose)` produziert eine `ScanResult["programme"]`-Liste pro Source. In Plan 04 wird die Logik nicht aus scan-new-programs.ts geforked — stattdessen ruft auto-pflege-step.ts intern eine analoge Inline-Function. Begruendung: scan-new-programs.ts ist heute auf `program-candidates.json`-Write hardcoded, das wollen wir loswerden (D-01).

Stattdessen: NEW utility-funktion in `scripts/auto-pflege-step.ts` selbst:
```typescript
async function scanAllSources(): Promise<Array<{name: string; detailUrl: string; sourceId: string; schulRelevanz?: number}>> { ... }
```
Liest data/program-sources.json + data/foerderprogramme.json fuer Dedup, ruft generateJson<ScanResult> pro Source, gibt EINE FLACHE LISTE neuer Programme zurueck. KEIN write auf program-candidates.json.

<!-- AUS scripts/rebuild-queue.ts:83-92 (computeScore) — Wiederverwendung-Pattern -->
```typescript
const TYP_BONUS: Record<string, number> = { bund: 20, eu: 15, stiftung: 10 };
function computeScore(p: {foerdersummeMax?: number|null; bundeslaender?: string[]; foerdergeberTyp?: string; kategorien?: string[]; schulformen?: string[]}): number {
  const max = p.foerdersummeMax || 1;
  const log = Math.log10(max) * 10;
  const reich = (p.bundeslaender ?? []).length * 2;
  const typ = TYP_BONUS[p.foerdergeberTyp ?? ""] ?? 0;
  const kat = Math.min((p.kategorien ?? []).length, 5) * 2;
  const sch = Math.min((p.schulformen ?? []).length, 5) * 2;
  return Math.round((log + reich + typ + kat + sch) * 10) / 10;
}
```
In auto-pflege-step.ts neu definieren, NICHT aus rebuild-queue.ts importieren (rebuild-queue.ts ist heute reine CLI, Re-Refactor in eigener Phase).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: scripts/extract-richtlinie.ts Library-Refactor (runExtraction + fetchOrRead als export, runExtraction mit skipQueueUpdate-Opt-Param zur Race-Avoidance)</name>
  <files>scripts/extract-richtlinie.ts</files>
  <read_first>
    - scripts/extract-richtlinie.ts (KOMPLETT — den Refactor minimal halten; insbesondere Z.225 runExtraction-Signatur, Z.342 markDoneInQueue-Call am Ende)
    - lib/wizard/queue.ts (Aus Plan 01 — Konsumenten-Switch vorbereiten ist Plan-04-Scope)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block "scripts/extract-richtlinie.ts (CLI → CLI + Library)" Z.436-450)
  </read_first>
  <action>
    Drei minimale Aenderungen mit dem Edit-Tool. WICHTIG: KEINE semantische Veraenderung der CLI-Logik — nur Export-Annotations + EIN optionaler Parameter + EIN conditional am markDoneInQueue-Call.

    **Aenderung 1 — fetchOrRead exportieren:**

    Suche Zeile 101 (`async function fetchOrRead(`) und ersetze `async function fetchOrRead(` mit `export async function fetchOrRead(`.

    **Aenderung 2 — runExtraction exportieren + Opt-Param:**

    Suche Zeile 225 (`async function runExtraction(programmId: string, srcs: string[]): Promise<void> {`) und ersetze die Signatur mit:
    ```typescript
    export async function runExtraction(
      programmId: string,
      srcs: string[],
      opts: { skipQueueUpdate?: boolean } = {}
    ): Promise<void> {
    ```

    **Aenderung 3 — markDoneInQueue-Call conditional machen:**

    Suche die Zeile `await markDoneInQueue(programmId);` (steht ca. Z.342 nach `console.log(`==> Geschrieben: ${outPath}`)`).
    Ersetze mit:
    ```typescript
      if (!opts.skipQueueUpdate) {
        await markDoneInQueue(programmId);
      }
    ```

    **Begruendung Aenderung 3:** Wenn `runExtraction` als Library aus `auto-pflege-step.ts` aufgerufen wird, ist der Caller fuer Queue-Mutationen verantwortlich (er schreibt den neuen Queue-Eintrag selbst via `lib/wizard/queue.ts`). Wenn `runExtraction` als CLI laeuft (Defaults: opts={}, also skipQueueUpdate=undefined === falsy), bleibt das alte Verhalten erhalten — markDoneInQueue wird aufgerufen. Das verhindert die Race-Condition (WARNING 2 aus Cross-AI-Review).

    **WICHTIG: Auch markSkipInQueue-Call (im substanzOk-Block, Z.301) bleibt UNVERAENDERT** — das ist der Empty-Extract-Skip-Schutz, der orthogonal zur Race ist und vom Caller NICHT uebernommen wird. Wenn die LLM-Extraktion leer war, ist es ok wenn extract-richtlinie.ts selbst den Skip-Status schreibt — der parallele auto-pflege-step.ts wuerde fuer dasselbe Programm sowieso keinen Queue-Push machen (continue im catch-Block stage="extract" sorgt dafuer).

    **NICHT taeuglich:**
    - Nicht den SYSTEM_PROMPT verfeinern
    - Nicht das CLI-Verhalten anpassen
    - Nicht die internen loadQueue/saveQueue/markSkipInQueue/markDoneInQueue auf `lib/wizard/queue.ts` umstellen (sauberer Konsumenten-Switch ist eigene Refactor-Phase)

    **Verifikation:** TypeScript compiliert + bestehende CLI-Modi (`--list`, `--next`, `<id> <urls>`) funktionieren weiterhin identisch + neue Signatur ist library-konsumierbar.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; grep -c "^export async function fetchOrRead" scripts/extract-richtlinie.ts &amp;&amp; grep -c "^export async function runExtraction" scripts/extract-richtlinie.ts &amp;&amp; grep -c "skipQueueUpdate" scripts/extract-richtlinie.ts &amp;&amp; grep -c "if (!opts.skipQueueUpdate)" scripts/extract-richtlinie.ts &amp;&amp; npx tsc --noEmit scripts/extract-richtlinie.ts &amp;&amp; npx tsx scripts/extract-richtlinie.ts 2>&amp;1 | head -1 | grep -q "Nutzung:"
    </automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "^export async function fetchOrRead" scripts/extract-richtlinie.ts` liefert genau 1
    - `grep -c "^export async function runExtraction" scripts/extract-richtlinie.ts` liefert genau 1
    - `grep -c "skipQueueUpdate" scripts/extract-richtlinie.ts` liefert mindestens 2 (Param-Deklaration + Conditional)
    - `grep -c "if (!opts.skipQueueUpdate)" scripts/extract-richtlinie.ts` liefert genau 1 (Conditional am markDoneInQueue-Call)
    - `grep -c "^async function loadQueue" scripts/extract-richtlinie.ts` liefert genau 1 (NICHT exportiert — bleibt private)
    - `grep -c "^async function markSkipInQueue" scripts/extract-richtlinie.ts` liefert genau 1 (NICHT exportiert, NICHT conditional gemacht — Empty-Skip-Schutz bleibt aktiv)
    - `grep -c "^async function markDoneInQueue" scripts/extract-richtlinie.ts` liefert genau 1 (NICHT exportiert)
    - `npx tsc --noEmit scripts/extract-richtlinie.ts` exit 0
    - `npx tsx scripts/extract-richtlinie.ts` (ohne Args) druckt die Nutzungs-Hilfe und exit 2 (CLI unveraendert)
    - `git diff scripts/extract-richtlinie.ts` zeigt NUR die Mini-Aenderungen (Diff <= 10 Zeilen — zwei export-Keywords + Opt-Param-Signatur + Conditional-Block)
  </acceptance_criteria>
  <done>
    extract-richtlinie.ts ist jetzt Dual-Use: CLI bleibt wie bisher (markDoneInQueue wird wie immer aufgerufen), `runExtraction` + `fetchOrRead` koennen von auto-pflege-step.ts importiert werden und mit `skipQueueUpdate=true` aufgerufen werden um Lost-Update-Race zu vermeiden.
  </done>
</task>

<task type="auto">
  <name>Task 2: scripts/auto-pflege-step.ts neu — Per-Programm-TS-Wrapper mit Scan + HEAD + Extract(skipQueueUpdate=true) + Queue-Score + Failure-Klassifizierung</name>
  <files>scripts/auto-pflege-step.ts (new)</files>
  <read_first>
    - scripts/scan-new-programs.ts (KOMPLETT — der Scanner-Code wird in vereinfachter Form in scanAllSources() integriert; KEIN program-candidates.json mehr)
    - scripts/extract-richtlinie.ts (post-Refactor — runExtraction + fetchOrRead sind jetzt importable, runExtraction mit skipQueueUpdate-Opt-Param)
    - scripts/rebuild-queue.ts (Score-Formel Z.83-92 wird wiederverwendet)
    - lib/wizard/queue.ts (Aus Plan 01 — loadQueue, saveQueue, markExpiredInQueue)
    - lib/wizard/llm.ts (generateJson + MODEL_INTERVIEW fuer Scan + MODEL_PIPELINE fuer Extract)
    - lib/wizard/richtlinien-validator.ts (Strict-Validator-Wiederverwendung; runExtraction ruft das selbst schon)
    - data/program-sources.json (3 Sources die gescannt werden)
    - data/foerderprogramme.json (zum Abgleich neue vs bekannte Programme)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block "Continue-on-Error mit Failure-Aggregation" Zeilen 601-603)
  </read_first>
  <action>
    Datei `scripts/auto-pflege-step.ts` neu anlegen (Write-Tool). Struktur:

    **1. Header-Kommentar (deutsch):**
    ```
    /**
     * Auto-Pflege-Step: ein einzelner Workflow-Lauf-Schritt.
     *
     * Eingabe:
     *   - Kein direktes CLI-Argument; ohne args wird ein Voll-Scan-+-Extract-Loop gemacht.
     *   - --dry-run               keine Schreiboperationen, nur Report.
     *   - --max-programs <N>      maximal N neue Programme pro Lauf extrahieren (Default 5).
     *   - --logs-dir <dir>        Verzeichnis fuer Per-Programm-JSON-Logs (Default logs/auto-pflege-<datum>/)
     *   - --failure-report <pfad> Pfad fuer das aggregierte Failure-Report-Markdown (Default failure-report.md)
     *
     * Vorgehen:
     *   1. Scan: data/program-sources.json lesen, pro Source generateJson<ScanResult> auf MODEL_INTERVIEW
     *      → flache Liste neuer Programme (gefiltert gegen foerderprogramme.json + queue)
     *   2. Pro Programm sequenziell:
     *      a. HTTP-HEAD-Pre-Check auf detailUrl. Bei 404/410/403: skip mit Reason, kein LLM-Call.
     *      b. runExtraction(programmId, [detailUrl], { skipQueueUpdate: true }) — produziert
     *         data/richtlinien/<id>.json (Strict-Validator-Gate ist in runExtraction enthalten).
     *         skipQueueUpdate=true: runExtraction macht KEINEN markDoneInQueue-Call mehr;
     *         auto-pflege-step.ts ist der EINZIGE Queue-Writer (vermeidet Lost-Update-Race).
     *      c. Queue-Entry erstellen + Score berechnen + push als neuen QueueItem mit status='done'
     *         via lib/wizard/queue.ts saveQueue. Atomar pro Programm.
     *   3. Jedes Programm in eigenem try/catch — bei Fehler: Failure-Klasse erfassen, weiter zum naechsten.
     *   4. Am Ende:
     *      - Per-Programm-JSON-Logs in --logs-dir
     *      - failure-report.md mit Liste der Skips/Failures (D-12 strukturiertes Issue-Body)
     *      - exit 0 (Workflow bleibt grun — Per-Programm-Resilience laut D-11)
     *      - Aber HAS_FAILURES=true via GITHUB_OUTPUT setzen, damit Workflow das Issue eroeffnet
     *
     * Race-Avoidance (Cross-AI-Review WARNING 2): auto-pflege-step.ts ist der EINZIGE
     * Queue-Writer im Workflow-Pfad. runExtraction wird mit skipQueueUpdate=true gerufen
     * (kein interner markDoneInQueue). Empty-Skip-Path in runExtraction (markSkipInQueue
     * bei substanzOk=false) bleibt aktiv, kollidiert aber nicht mit auto-pflege-step.ts
     * — bei Empty-Skip wirft runExtraction process.exit(5) und unser try/catch fangt das.
     */
    ```

    **2. Imports:**
    ```typescript
    import fs from "node:fs/promises";
    import path from "node:path";
    import { generateJson, MODEL_INTERVIEW } from "../lib/wizard/llm";
    import { runExtraction, fetchOrRead } from "./extract-richtlinie";
    import {
      loadQueue, saveQueue, type Queue, type QueueItem
    } from "../lib/wizard/queue";

    const SOURCES_PATH = path.join(process.cwd(), "data", "program-sources.json");
    const PROGRAMS_PATH = path.join(process.cwd(), "data", "foerderprogramme.json");
    const HEAD_TIMEOUT_MS = 10_000;
    const MAX_PROGRAMS_DEFAULT = 5;
    ```

    **3. Type-Definitionen** (lokal — kein Sharing mit scan-new-programs.ts):
    ```typescript
    interface Source { id: string; name: string; url: string; fokus?: string; }
    interface SourcesFile { sources: Source[]; }
    interface Foerderprogramm { id: string; name: string; infoLink?: string; foerdergeberTyp?: string; foerdersummeMax?: number | null; bundeslaender?: string[]; kategorien?: string[]; schulformen?: string[]; }

    type FailureStage = "scan" | "http-head" | "extract" | "validate" | "queue-write";
    interface FailureRecord {
      programmId?: string;
      stage: FailureStage;
      errorClass: string;       // z.B. "Error: HTTP 404"
      summary: string;          // 1 Zeile fuer Issue-Body
      timestamp: string;
    }

    interface ScanCandidate {
      name: string;
      detailUrl: string;
      sourceId: string;
      schulRelevanz?: number;
    }
    ```

    **4. EXTRACT_SYSTEM-Prompt** (1:1 von scan-new-programs.ts:67-85 kopieren — bewusste Duplikation, kein Import aus scan-new-programs.ts weil das CLI heute auf program-candidates.json hardcoded ist und wir das eben loswerden).

    **5. Hilfs-Funktionen:**
    - `slugifyProgramId(name: string): string` — neuer Programm-Name → ID-Slug (lowercase, replace umlaute, replace non-alphanumerisch durch -, trim). Beispiele:
      - "Foerderung XY 2026" → "foerderung-xy-2026"
      - "BMBF DigitalPakt 3.0" → "bmbf-digitalpakt-3-0"
    - `headStatus(url: string): Promise<{status: number; transient: boolean}>` — wie in Plan 01 Task 2 (HEAD-Methode, 10s Timeout via AbortController, Browser-UA).
    - `computeScore(p: ...): number` — wie Interface-Block oben zeigt, 1:1 aus rebuild-queue.ts.
    - `scanAllSources(): Promise<ScanCandidate[]>` — pro Source generateJson<ScanResult>, dedup gegen foerderprogramme.json (name + URL) UND gegen bestehende queue.items.programmId.
    - `writeFailureReport(failures: FailureRecord[], outPath: string): Promise<void>` — Markdown-Output mit Sektionen pro stage, fuer GitHub-Issue-Body.

    **6. Hauptfunktion `main()`:**
    ```typescript
    async function main() {
      const args = process.argv.slice(2);
      const dryRun = args.includes("--dry-run");
      const maxProgramsIdx = args.indexOf("--max-programs");
      const maxPrograms = maxProgramsIdx >= 0 ? parseInt(args[maxProgramsIdx + 1], 10) : MAX_PROGRAMS_DEFAULT;
      const logsDirIdx = args.indexOf("--logs-dir");
      const logsDir = logsDirIdx >= 0 ? args[logsDirIdx + 1] : path.join(process.cwd(), "logs", `auto-pflege-${new Date().toISOString().slice(0, 10)}`);
      const failureReportIdx = args.indexOf("--failure-report");
      const failureReport = failureReportIdx >= 0 ? args[failureReportIdx + 1] : path.join(process.cwd(), "failure-report.md");

      await fs.mkdir(logsDir, { recursive: true });

      const failures: FailureRecord[] = [];
      const successes: Array<{ programmId: string; detailUrl: string }> = [];

      // === Stage 1: Scan ===
      let candidates: ScanCandidate[] = [];
      try {
        candidates = await scanAllSources();
        console.log(`==> Scan: ${candidates.length} neue Programm-Kandidaten gefunden`);
      } catch (err) {
        failures.push({
          stage: "scan",
          errorClass: (err as Error).name ?? "ScanError",
          summary: `Scan komplett gescheitert: ${(err as Error).message.slice(0, 200)}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Cap auf maxPrograms — restliche kommen naechste Woche dran
      const cappedCandidates = candidates.slice(0, maxPrograms);
      if (candidates.length > maxPrograms) {
        console.log(`    Cap auf ${maxPrograms} (uebrige ${candidates.length - maxPrograms} folgen naechste Woche)`);
      }

      // === Stage 2: Per-Programm-Loop ===
      for (const c of cappedCandidates) {
        const programmId = slugifyProgramId(c.name);
        const perProgramLog: Array<{ stage: string; outcome: string; details?: unknown }> = [];
        try {
          // a) HTTP-HEAD-Pre-Check
          let head;
          try {
            head = await headStatus(c.detailUrl);
            perProgramLog.push({ stage: "http-head", outcome: `status=${head.status}` });
          } catch (err) {
            head = { status: 0, transient: true };
            perProgramLog.push({ stage: "http-head", outcome: "error", details: (err as Error).message });
          }
          if ([404, 410, 403].includes(head.status)) {
            failures.push({
              programmId,
              stage: "http-head",
              errorClass: `HTTP ${head.status}`,
              summary: `${c.name}: detailUrl ${c.detailUrl} liefert HTTP ${head.status}`,
              timestamp: new Date().toISOString(),
            });
            continue; // naechstes Programm
          }
          if (head.status === 0 || head.transient) {
            failures.push({
              programmId,
              stage: "http-head",
              errorClass: "transient",
              summary: `${c.name}: detailUrl ${c.detailUrl} transient (${head.status ?? "no-response"}) — naechste Woche neu versuchen`,
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          // b) runExtraction MIT skipQueueUpdate=true — produziert data/richtlinien/<id>.json
          //    mit Strict-Validator-Gate. KEIN markDoneInQueue von runExtraction-Seite,
          //    damit auto-pflege-step.ts der einzige Queue-Writer bleibt (Race-Avoidance).
          if (dryRun) {
            console.log(`==> [DRY-RUN] Wuerde runExtraction("${programmId}", ["${c.detailUrl}"], { skipQueueUpdate: true }) aufrufen`);
            perProgramLog.push({ stage: "extract", outcome: "skipped-dryrun" });
            continue;
          }

          try {
            await runExtraction(programmId, [c.detailUrl], { skipQueueUpdate: true });
            perProgramLog.push({ stage: "extract", outcome: "success" });
          } catch (err) {
            failures.push({
              programmId,
              stage: "extract",
              errorClass: (err as Error).name ?? "ExtractError",
              summary: `${programmId}: ${(err as Error).message.slice(0, 200)}`,
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          // c) Queue-Entry erstellen (NEU — Programm war vorher nicht in der Queue).
          //    Wir sind hier der EINZIGE Queue-Writer (runExtraction hat dank skipQueueUpdate
          //    keinen Queue-Touch gemacht). Lost-Update-Race ist ausgeschlossen.
          try {
            const q = await loadQueue();
            const existing = q.items.find((i) => i.programmId === programmId);
            if (!existing) {
              const score = computeScore({
                foerdersummeMax: null,           // Unbekannt — wird auf 1 → log10 = 0 → score-Anteil 0
                bundeslaender: [],
                foerdergeberTyp: "unbekannt",
                kategorien: [],
                schulformen: [],
              });
              const newItem: QueueItem = {
                programmId,
                name: c.name,
                foerdergeberTyp: "unbekannt",
                foerdersummeMax: null,
                reichweite: "?",
                infoLink: c.detailUrl,
                score,
                status: "done", // Extract gerade gelaufen
              };
              q.items.push(newItem);
              q.total = q.items.length;
              q.generatedAt = new Date().toISOString();
              await saveQueue(q);
              perProgramLog.push({ stage: "queue-write", outcome: "pushed", details: { score } });
            } else {
              // Programm war schon in der Queue — Status auf done bumpen
              existing.status = "done";
              q.generatedAt = new Date().toISOString();
              await saveQueue(q);
              perProgramLog.push({ stage: "queue-write", outcome: "marked-done" });
            }
            successes.push({ programmId, detailUrl: c.detailUrl });
          } catch (err) {
            failures.push({
              programmId,
              stage: "queue-write",
              errorClass: (err as Error).name ?? "QueueWriteError",
              summary: `${programmId}: ${(err as Error).message.slice(0, 200)}`,
              timestamp: new Date().toISOString(),
            });
          }
        } finally {
          // Pro Programm einen JSON-Log dump fuer Artifact-Upload
          await fs.writeFile(
            path.join(logsDir, `${programmId || "unknown"}.json`),
            JSON.stringify(perProgramLog, null, 2) + "\n"
          );
        }
      }

      // === Stage 3: Failure-Report ===
      await writeFailureReport(failures, failureReport);

      // === Stage 4: Output fuer Workflow ===
      console.log(`==> Auto-Pflege Ergebnis:`);
      console.log(`    Successes: ${successes.length}`);
      console.log(`    Failures:  ${failures.length}`);
      console.log(`    Logs:      ${logsDir}`);
      console.log(`    Report:    ${failureReport}`);

      const ghOutput = process.env.GITHUB_OUTPUT;
      if (ghOutput) {
        await fs.appendFile(ghOutput, `successes=${successes.length}\n`);
        await fs.appendFile(ghOutput, `failures=${failures.length}\n`);
        await fs.appendFile(ghOutput, `has_failures=${failures.length > 0 ? "true" : "false"}\n`);
        // Komma-separierte Liste der erfolgreich extrahierten programmIds — Workflow nutzt das fuer PR-Erstellung
        await fs.appendFile(ghOutput, `success_ids=${successes.map((s) => s.programmId).join(",")}\n`);
      }

      // Wichtig: exit 0 auch bei failures (D-11 Continue-on-Error). Failure-Issue
      // wird vom Workflow basierend auf has_failures=true erstellt.
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
    ```

    **7. `writeFailureReport`** — Markdown mit Sektionen pro stage, kompakt aber fuer GitHub-Issue-Body geeignet:
    ```typescript
    async function writeFailureReport(failures: FailureRecord[], outPath: string): Promise<void> {
      const date = new Date().toISOString().slice(0, 10);
      if (failures.length === 0) {
        await fs.writeFile(outPath, `# 🤖 dossier-bot ${date} — alles gruen, keine Failures.\n`);
        return;
      }
      const byStage = failures.reduce<Record<FailureStage, FailureRecord[]>>((acc, f) => {
        (acc[f.stage] ??= []).push(f);
        return acc;
      }, {} as never);
      const stages: FailureStage[] = ["scan", "http-head", "extract", "validate", "queue-write"];
      const lines: string[] = [`# 🤖 dossier-bot failure ${date}`, "", `Gesamt: ${failures.length} Failure(s).`, ""];
      for (const stage of stages) {
        const items = byStage[stage] ?? [];
        if (items.length === 0) continue;
        lines.push(`## Stage: ${stage} (${items.length})`);
        for (const it of items) {
          lines.push(`- **${it.programmId ?? "<no-id>"}** [${it.errorClass}] ${it.summary}`);
        }
        lines.push("");
      }
      lines.push("---");
      lines.push("Vollstaendige Logs als GitHub-Actions-Artifact (30-Tage-Retention).");
      await fs.writeFile(outPath, lines.join("\n") + "\n");
    }
    ```

    **8. Sicherstellen:** Keine Imports aus `scripts/scan-new-programs.ts` (das CLI bleibt zwar bestehen falls jemand es lokal noch braucht, aber unser Workflow ruft es nicht mehr auf). Keine direkten SDK-Imports (`@google/generative-ai`, `OpenAI`). KEIN write auf `data/program-candidates.json` (D-01: die Datei wird in Task 5 geloescht). runExtraction-Call MUSS `skipQueueUpdate: true` enthalten — Acceptance-Check unten verifiziert das.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsc --noEmit scripts/auto-pflege-step.ts &amp;&amp; grep -c "import.*runExtraction.*extract-richtlinie" scripts/auto-pflege-step.ts &amp;&amp; grep -c "import.*lib/wizard/queue" scripts/auto-pflege-step.ts &amp;&amp; grep -c "skipQueueUpdate: true" scripts/auto-pflege-step.ts &amp;&amp; ! grep -E "scan-new-programs|program-candidates" scripts/auto-pflege-step.ts &amp;&amp; ! grep -E '@google/generative-ai|^import OpenAI' scripts/auto-pflege-step.ts &amp;&amp; grep -c "scanAllSources" scripts/auto-pflege-step.ts &amp;&amp; grep -c "computeScore" scripts/auto-pflege-step.ts &amp;&amp; grep -c "writeFailureReport" scripts/auto-pflege-step.ts &amp;&amp; grep -c "process.env.GITHUB_OUTPUT" scripts/auto-pflege-step.ts &amp;&amp; npx tsx --env-file=.env.local scripts/auto-pflege-step.ts --dry-run --max-programs 0 | grep -E "Auto-Pflege Ergebnis"
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `scripts/auto-pflege-step.ts` existiert mit >= 120 Zeilen
    - `npx tsc --noEmit scripts/auto-pflege-step.ts` exit 0
    - `grep -c "import.*runExtraction.*extract-richtlinie" scripts/auto-pflege-step.ts` >= 1 (Library-Konsum aus Task 1)
    - `grep -c "import.*lib/wizard/queue" scripts/auto-pflege-step.ts` >= 1 (Plan 01 Foundation)
    - `grep -c "skipQueueUpdate: true" scripts/auto-pflege-step.ts` >= 1 (Race-Avoidance — Pflicht-Aufruf)
    - `grep -E "scan-new-programs|program-candidates" scripts/auto-pflege-step.ts` matched NICHTS (D-01 keine Wiederverwendung der alten Pipeline)
    - `grep -E '@google/generative-ai|^import OpenAI' scripts/auto-pflege-step.ts` matched NICHTS (LLM nur ueber Wrapper)
    - `grep -c "process.env.GITHUB_OUTPUT" scripts/auto-pflege-step.ts` >= 1 (Output-Bridge fuer Workflow)
    - `grep -c "headStatus" scripts/auto-pflege-step.ts` >= 1 (HTTP-HEAD-Pre-Check vorhanden)
    - `grep -c "FailureRecord" scripts/auto-pflege-step.ts` >= 1 (Struktur fuer D-12)
    - `grep -c "slugifyProgramId" scripts/auto-pflege-step.ts` >= 1 (Programm-ID-Generierung)
    - Dry-Run-Lauf `npx tsx --env-file=.env.local scripts/auto-pflege-step.ts --dry-run --max-programs 0` exit 0 und gibt "Auto-Pflege Ergebnis"-Zeile aus
  </acceptance_criteria>
  <done>
    auto-pflege-step.ts ist gebaut und compiliert sauber. Es ruft `runExtraction(..., { skipQueueUpdate: true })` auf — auto-pflege-step.ts ist damit der einzige Queue-Writer im Workflow-Pfad (Race-Avoidance laut Cross-AI-Review WARNING 2). Workflow kann das Skript in einer einfachen `npx tsx`-Zeile aufrufen.
  </done>
</task>

<task type="auto">
  <name>Task 3: .github/workflows/weekly-auto-pflege.yml neu mit Single-Cron + Issue-Creation + Artifact-Upload</name>
  <files>.github/workflows/weekly-auto-pflege.yml (new)</files>
  <read_first>
    - .github/workflows/weekly-dossier-extraction.yml (KOMPLETT — Phase-3-Hardening-Pattern uebernehmen)
    - .github/workflows/weekly-program-scan.yml (KOMPLETT — wird in diesem Plan geloescht, aber das Pattern aus Z.32-60 ist die Vorlage fuer den Secret-Pre-Flight-Block)
    - scripts/auto-pflege-step.ts (gerade angelegt — Aufruf-Signatur + GITHUB_OUTPUT-Felder)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block ".github/workflows/weekly-auto-pflege.yml" Zeilen 242-383)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md (D-10/D-11/D-12 Issue-Pattern)
  </read_first>
  <action>
    Datei `.github/workflows/weekly-auto-pflege.yml` neu anlegen mit folgender Struktur. **Alle Hardening-Patterns aus Phase 3 sind verbindlich** (set -euo pipefail in jedem run-Block, github.event.inputs in env-Vars laden statt direkt interpolieren, Secret-Pre-Flight-Check).

    ```yaml
    name: Weekly Auto-Pflege (Scanner → Extractor → Queue)

    # Single-Workflow fuer FETCH-02 (Phase 4 Plan 04). Ersetzt funktional die
    # vorherigen weekly-dossier-extraction.yml + weekly-program-scan.yml (beide
    # werden in Plan 04 Task 5 geloescht).
    #
    # Pro Lauf: Scan-aller-Sources → pro neuem Programm sequenziell
    # HTTP-HEAD-Pre-Check → runExtraction → Queue-Entry → PR pro Programm.
    # Failures pro Programm landen in einem GitHub-Issue mit Label `bot-failure`.

    on:
      schedule:
        - cron: "0 4 * * 1" # Montag 04:00 UTC, ersetzt funktional beide alten Workflows
      workflow_dispatch:
        inputs:
          max_programs:
            description: "Max neue Programme pro Lauf (Default 5, 0 erlaubt fuer Smoke)"
            required: false
            type: string
            default: "5"
          llm_provider:
            description: "LLM-Provider override (deepseek default; gemini-Fallback)"
            required: false
            type: choice
            options:
              - deepseek
              - gemini
            default: deepseek

    jobs:
      auto-pflege:
        runs-on: ubuntu-latest
        permissions:
          contents: write
          pull-requests: write
          issues: write
        steps:
          - name: Checkout
            uses: actions/checkout@v4
            with:
              fetch-depth: 0

          - name: Setup Node
            uses: actions/setup-node@v4
            with:
              node-version: "20"

          - name: Install dependencies
            run: npm ci

          - name: Auto-Pflege Step
            id: pflege
            env:
              DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
              GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
              LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
              MAX_PROGRAMS_INPUT: ${{ github.event.inputs.max_programs || '5' }}
            run: |
              set -euo pipefail
              if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
                echo "::error::DEEPSEEK_API_KEY Secret fehlt. Im Repo-Settings hinterlegen oder LLM_PROVIDER=gemini ueber workflow_dispatch waehlen."
                exit 1
              fi
              if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
                echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
                exit 1
              fi
              # max_programs aus User-Input ueber env in Bash-Var, dann zitiert verwenden
              MAX="${MAX_PROGRAMS_INPUT}"
              # Defense: muss ganze Zahl 0..50 sein (0 fuer Smoke erlaubt)
              if ! echo "${MAX}" | grep -qE '^[0-9]+$' || [ "${MAX}" -gt 50 ]; then
                echo "::error::max_programs muss eine ganze Zahl 0..50 sein, war '${MAX}'"
                exit 1
              fi
              npx tsx scripts/auto-pflege-step.ts --max-programs "${MAX}"

          - name: Detect changes per success_id
            id: collect
            run: |
              set -euo pipefail
              # success_ids ist eine Komma-separierte Liste aus auto-pflege-step.ts GITHUB_OUTPUT
              IDS="${{ steps.pflege.outputs.success_ids }}"
              echo "Successfully extracted IDs: ${IDS}"
              echo "ids=${IDS}" >> "${GITHUB_OUTPUT}"

          - name: Create one PR per successful programm_id
            if: steps.pflege.outputs.successes != '0' && steps.pflege.outputs.successes != ''
            env:
              IDS: ${{ steps.pflege.outputs.success_ids }}
              GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            run: |
              set -euo pipefail
              # WICHTIG: 1 PR pro Programm (D-02). Wir machen das im Bash, weil
              # peter-evans/create-pull-request@v7 als action laeuft pro Step und
              # nicht in einer for-Schleife. Stattdessen via gh CLI.
              IFS=',' read -ra ID_LIST <<< "${IDS}"
              for ID in "${ID_LIST[@]}"; do
                [ -z "${ID}" ] && continue
                BR="dossier-bot/${ID}"
                echo "==> PR fuer ${ID} auf branch ${BR}"
                git config user.name "dossier-bot"
                git config user.email "dossier-bot@users.noreply.github.com"
                git checkout -B "${BR}"
                git add "data/richtlinien/${ID}.json" "data/richtlinien-prioritaeten.json"
                if git diff --cached --quiet; then
                  echo "    Keine Aenderungen fuer ${ID}, ueberspringen"
                  continue
                fi
                git commit -m "chore(richtlinien): Dossier ${ID} via Auto-Pflege"
                git push origin "${BR}" --force-with-lease
                gh pr create \
                  --base "${{ github.ref_name }}" \
                  --head "${BR}" \
                  --title "Neues Dossier: ${ID}" \
                  --body "Automatisch vom woechentlichen Auto-Pflege-Cron extrahiert.

              **Programm:** \`${ID}\`

              ### Reviewer-Checkliste
              - [ ] Foerderhoehe / maxEur / mindestProzent stimmen mit Originalrichtlinie
              - [ ] Pflichtabschnitte abgedeckt, Leitfragen plausibel
              - [ ] Eigenanteil korrekt (Pflicht ja/nein, Mindest-Prozent)
              - [ ] Kumulierung (unvereinbarMit?) angemessen
              - [ ] Nicht-foerderfaehige Kosten nicht halluziniert
              - [ ] Quellen-URLs funktionieren
              - [ ] Best Practices: stehen wirklich in der Quelle (nicht halluziniert), max 5 Stueck
              - [ ] Reject-Gruende: aus Volltext belegbar, vermeidung-Feld konstruktiv
              - [ ] Vorbild-Formulierungen: abschnitt_id zeigt auf existierende Sektion (FK ok), Formulierung woertlich aus Quelle
              - [ ] Frist-Logik: typ korrekt (rolling vs fixe_stichtage), Daten im ISO-Format YYYY-MM-DD

              KI-Extraktion hat Halluzinations-Risiko, v.a. bei Zahlen. Bei Fehlern: Dossier hier im PR korrigieren oder Queue-Status auf 'skip' setzen, dann mergen." \
                  --label "richtlinien-bot,auto-generated" || echo "PR-Erstellung fuer ${ID} fehlgeschlagen — vermutlich existiert PR bereits"
                # Zurueck auf default-branch fuer den naechsten PR-Loop
                git checkout "${{ github.ref_name }}"
              done

          - name: Open failure issue
            if: steps.pflege.outputs.has_failures == 'true'
            env:
              GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            run: |
              set -euo pipefail
              DATE=$(date -u +%Y-%m-%d)
              gh issue create \
                --title "🤖 dossier-bot failure ${DATE}" \
                --label "bot-failure" \
                --body-file failure-report.md

          - name: Close stale failure issues on success
            if: steps.pflege.outputs.has_failures == 'false'
            env:
              GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            run: |
              set -euo pipefail
              for issue in $(gh issue list --label bot-failure --state open --json number -q '.[].number'); do
                echo "==> Auto-close bot-failure issue #${issue}"
                gh issue close "${issue}" --comment "Auto-resolved by green cron run on $(date -u +%Y-%m-%d)."
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
              if-no-files-found: warn
    ```

    **Wichtige Details die im Action-Body schon einkalkuliert sind:**
    - `permissions: issues: write` ist GESETZT (sonst kann `gh issue create` fehlschlagen)
    - PR-Loop nutzt `gh pr create` statt `peter-evans/create-pull-request@v7`, weil letzteres pro Step nur EINEN PR macht und unser Pattern N PRs pro Lauf erfordert (D-02). Branch-Pattern + Labels identisch zu Phase 3.
    - Default-Branch wird ueber `github.ref_name` referenziert (nicht hardcoded `main` oder `staging`) — robust fuer den aktuellen `feature/wizard-adaptive`-Stand.
    - `--force-with-lease` beim push verhindert versehentliches Overwrite paralleler Branch-Updates.
    - `if: steps.pflege.outputs.successes != '0' && steps.pflege.outputs.successes != ''` schuetzt vor leeren Laeufen (kein PR wenn keine neuen Programme).
    - Artifact-Upload ist `always()` damit auch bei Failures die Logs fuer 30 Tage zugaenglich sind (D-12).
    - `max_programs=0` ist explizit erlaubt (Smoke-Test-Friendly): der Workflow scannt dann zwar, extrahiert aber nichts → kein PR, schreibt nur Failure-Report (leer) + Artifact.

    **NICHT enthalten in diesem Workflow (Begruendung):**
    - Keine Telegram-Notification (Deferred laut CONTEXT.md, Scope-Creep)
    - Keine Retry-Logic fuer Rate-Limited-LLM-Calls (Deferred)
    - Kein workflow_dispatch fuer einzelnes Programm (Sample-Fall ist mit max_programs=1 ueber `--max-programs` abgedeckt)
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; test -f .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "set -euo pipefail" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "DEEPSEEK_API_KEY" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "issues: write" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "pull-requests: write" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "bot-failure" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "auto-pflege-step.ts" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "dossier-bot/" .github/workflows/weekly-auto-pflege.yml &amp;&amp; grep -c "richtlinien-bot" .github/workflows/weekly-auto-pflege.yml &amp;&amp; ! grep -E '\$\{\{ github\.event\.inputs\.[a-zA-Z_]+ \}\}' .github/workflows/weekly-auto-pflege.yml | grep -v "^.*env:" &amp;&amp; npx js-yaml .github/workflows/weekly-auto-pflege.yml &gt; /dev/null
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `.github/workflows/weekly-auto-pflege.yml` existiert mit >= 110 Zeilen
    - YAML ist valides YAML (parse via `npx js-yaml`)
    - `grep -c "set -euo pipefail" .github/workflows/weekly-auto-pflege.yml` >= 3 (jeder run-Block hat den Schutz)
    - `grep -c "DEEPSEEK_API_KEY" .github/workflows/weekly-auto-pflege.yml` >= 2 (Secret im env-Block + Pre-Flight-Check)
    - `grep -c "issues: write" .github/workflows/weekly-auto-pflege.yml` >= 1 (D-10 Issue-Creation-Berechtigung)
    - `grep -c "pull-requests: write" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "bot-failure" .github/workflows/weekly-auto-pflege.yml` >= 2 (Label-Create + Label-Lookup-for-Close)
    - `grep -c "scripts/auto-pflege-step.ts" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "dossier-bot/" .github/workflows/weekly-auto-pflege.yml` >= 1 (Branch-Pattern Phase 3)
    - `grep -c "richtlinien-bot" .github/workflows/weekly-auto-pflege.yml` >= 1 (PR-Label-Pattern Phase 3)
    - `grep -c "gh issue create" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "gh issue close" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "gh pr create" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "upload-artifact" .github/workflows/weekly-auto-pflege.yml` >= 1
    - `grep -c "retention-days: 30" .github/workflows/weekly-auto-pflege.yml` >= 1
    - Keine direkte `${{ github.event.inputs.X }}`-Interpolation in `run:`-Bloecken — User-Input wird via `env:`-Block geladen und dann als Bash-Var zitiert verwendet
  </acceptance_criteria>
  <done>
    Workflow ist statisch fertig, YAML valide, alle D-10/D-11/D-12-Strukturen sind enthalten. `max_programs=0` ist explizit erlaubt fuer den Live-Smoke in Task 4.
  </done>
</task>

<task type="auto">
  <name>Task 4: E2E-Live-Smoke: Push dossier-migration/phase-04 + gh workflow run weekly-auto-pflege.yml (Success-Criterion #4 — Variante A)</name>
  <files>(kein File-Modify im Repo, aber: git push origin dossier-migration/phase-04, gh workflow run, gh run watch)</files>
  <read_first>
    - .github/workflows/weekly-auto-pflege.yml (Task 3 Output)
    - scripts/auto-pflege-step.ts (Task 2 Output)
    - data/program-sources.json (3 Sources)
    - data/foerderprogramme.json (Dedup-Basis)
  </read_first>
  <action>
    Hintergrund: Cross-AI-Review WARNING 1 verlangt einen materiellen E2E-Smoke, kein Dry-Run, fuer Success-Criterion #4. Variante A: erzwungener Live-Workflow-Dispatch via `gh workflow run weekly-auto-pflege.yml` auf dem Feature-Branch mit `max_programs=0`. Damit muss der Workflow den `data/program-sources.json`-Scan auslesen + HTTP-HEADs ausfuehren + (wegen max_programs=0) keine LLM-Extracts machen + ein leeres Summary loggen ohne Crash. Acceptance: `gh run view <id>` zeigt conclusion=success.

    Voraussetzung: Branch `dossier-migration/phase-04` muss zu `origin` gepusht sein, damit GitHub den Workflow-File kennt. Vor Plan 04 Task 6 (Commit) ist der Workflow noch nicht commited — daher fuehren wir Task 4 NACH Task 6 aus (siehe verschobene Reihenfolge unten — Task 4 wird vor Task 5 dargestellt, aber im execution order ist Reihenfolge: Task 1 → 2 → 3 → 5 → 6 → 4 → 7). Plan 04 Wave 3 Execution dispatched Tasks in deklarierter Reihenfolge — daher wird hier ein ausdruecklicher Hinweis im Action-Body gesetzt:

    **PRE-CHECK:** Diese Task DARF erst laufen, wenn Task 6 (Commit) erfolgreich war — der Workflow-File muss commited UND gepusht sein, sonst dispatched gh workflow run einen Workflow-File der lokal lebt aber nicht auf der Remote-Ref existiert.

    Schritt 1 — Pre-Smoke-Sanity:
    ```bash
    cd /home/kolja/edufunds-app
    test -f .env.local && grep -q '^DEEPSEEK_API_KEY=' .env.local && echo "API-Key lokal ok"
    test "$(git branch --show-current)" = "dossier-migration/phase-04" && echo "Branch ok"
    # Pruefen dass der Workflow-File commited ist
    git log -1 --name-only | grep -q "weekly-auto-pflege.yml" || { echo "FEHLER: Workflow-File noch nicht im HEAD-Commit. Task 6 zuerst."; exit 1; }
    ```

    Schritt 2 — Lokaler Dry-Run-Smoke ZUERST (sanity, kein LLM-Verbrauch falls Scan 0 Kandidaten findet):
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx --env-file=.env.local scripts/auto-pflege-step.ts --dry-run --max-programs 0 --logs-dir /tmp/auto-pflege-smoke-logs --failure-report /tmp/auto-pflege-smoke-report.md 2>&1 | tee /tmp/auto-pflege-smoke.log
    echo "Lokal-Dry-Exit: $?"
    ```
    Erwartung: exit 0. Output zeigt "==> Auto-Pflege Ergebnis:" mit Successes=0 (wegen max-programs 0). Failures koennen 0 oder >=1 sein (Scan-Failure ist denkbar wenn DeepSeek down ist — dann wird der echte gh workflow run unten auch failen und das wird sichtbar).

    Schritt 3 — Branch pushen (falls noch nicht):
    ```bash
    cd /home/kolja/edufunds-app
    # Pruefen ob der Branch schon auf origin existiert mit dem aktuellen HEAD
    REMOTE_HEAD=$(git ls-remote origin refs/heads/dossier-migration/phase-04 | awk '{print $1}')
    LOCAL_HEAD=$(git rev-parse HEAD)
    if [ "${REMOTE_HEAD}" != "${LOCAL_HEAD}" ]; then
      echo "==> Pushe dossier-migration/phase-04 zu origin (war: ${REMOTE_HEAD:-<neu>}, ist: ${LOCAL_HEAD})"
      git push -u origin dossier-migration/phase-04
    else
      echo "==> Remote ist bereits auf ${LOCAL_HEAD} — push uebersprungen"
    fi
    ```

    Schritt 4 — Live-Workflow-Dispatch:
    ```bash
    cd /home/kolja/edufunds-app
    echo "==> Dispatching weekly-auto-pflege.yml auf Ref dossier-migration/phase-04 mit max_programs=0"
    gh workflow run weekly-auto-pflege.yml \
      --ref dossier-migration/phase-04 \
      -f max_programs=0 \
      -f llm_provider=deepseek

    # Kurze Wartezeit damit GitHub den Run anlegt
    sleep 8

    # Run-ID des juengsten Runs dieses Workflows finden
    RUN_ID=$(gh run list --workflow=weekly-auto-pflege.yml --branch=dossier-migration/phase-04 --limit=1 --json databaseId -q '.[0].databaseId')
    if [ -z "${RUN_ID}" ]; then
      echo "FEHLER: Keine Workflow-Run-ID gefunden — Dispatch fehlgeschlagen?"
      exit 1
    fi
    echo "==> Workflow-Run-ID: ${RUN_ID}"
    echo "==> Watching... (max 10 Minuten)"
    gh run watch "${RUN_ID}" --exit-status
    WATCH_EXIT=$?

    echo "==> gh run watch exit: ${WATCH_EXIT}"

    # Final-Status auslesen
    CONCLUSION=$(gh run view "${RUN_ID}" --json conclusion -q '.conclusion')
    echo "==> Workflow-Conclusion: ${CONCLUSION}"

    if [ "${CONCLUSION}" != "success" ]; then
      echo "FEHLER: Workflow-Run ${RUN_ID} hat conclusion='${CONCLUSION}' (erwartet: success)"
      echo "==> Letzte Log-Zeilen:"
      gh run view "${RUN_ID}" --log | tail -50
      exit 1
    fi
    echo "==> E2E-Live-Smoke gruen — Success-Criterion #4 materiell erfuellt."
    ```

    Schritt 5 — Verifikations-Notizen fuer SUMMARY festhalten:
    ```bash
    cd /home/kolja/edufunds-app
    echo "=== E2E-Live-Smoke Resultat ==="
    gh run view "${RUN_ID}" --json url,createdAt,conclusion,headBranch -q '{url, createdAt, conclusion, headBranch}'
    echo ""
    echo "=== Workflow-Log-Tail (letzte 30 Zeilen) ==="
    gh run view "${RUN_ID}" --log | tail -30 | tee /tmp/auto-pflege-live-smoke.log
    ```

    Schritt 6 — Cleanup (nicht kritisch, aber sauber):
    Das `bot-failure`-Issue wurde NICHT erstellt (max_programs=0 → keine Failures → has_failures=false → der Open-Issue-Step laeuft nicht). Falls doch (z.B. Scan ist gescheitert), MUSS Kolja das Issue im naechsten gruenen Lauf auto-closed sehen. Im Smoke-Lauf bleibt das Issue offen → manuell pruefen.

    **Fallback wenn Live-Smoke nicht moeglich** (z.B. `gh` ist nicht authentifiziert ODER Repo-Berechtigungen fehlen ODER Push verweigert wird):
    - Acceptance bleibt streng: Live-Smoke ist Pflicht fuer Success-Criterion #4.
    - Bei dauerhaftem Block: Plan 04 Task 7 (Kolja-Checkpoint) wird als HOLD markiert, Kolja entscheidet ueber ROADMAP-Anpassung (Success-Criterion #4 ggf. auf "Dry-Run-Smoke beweist Pipeline-Integritaet" abschwaechen, mit explizitem Eintrag in `live-workflow-smoke-deferred.md`). KEIN silent fallback auf Dry-Run.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsx --env-file=.env.local scripts/auto-pflege-step.ts --dry-run --max-programs 0 --logs-dir /tmp/verify-logs --failure-report /tmp/verify-report.md &amp;&amp; test -f /tmp/verify-report.md &amp;&amp; git ls-remote origin refs/heads/dossier-migration/phase-04 | grep -q "$(git rev-parse HEAD)" &amp;&amp; RUN_ID=$(gh run list --workflow=weekly-auto-pflege.yml --branch=dossier-migration/phase-04 --limit=1 --json databaseId -q '.[0].databaseId') &amp;&amp; test -n "${RUN_ID}" &amp;&amp; test "$(gh run view "${RUN_ID}" --json conclusion -q '.conclusion')" = "success"
    </automated>
  </verify>
  <acceptance_criteria>
    - Lokaler Dry-Run-Lauf `npx tsx --env-file=.env.local scripts/auto-pflege-step.ts --dry-run --max-programs 0` exit 0
    - `/tmp/auto-pflege-smoke-report.md` ist erstellt
    - `/tmp/auto-pflege-smoke-logs/` Verzeichnis ist erstellt
    - `git status --short data/` ist leer NACH dem Dry-Run (kein data-File modifiziert)
    - Branch `dossier-migration/phase-04` ist zu `origin` gepusht (Remote-HEAD == Local-HEAD)
    - `gh workflow run weekly-auto-pflege.yml --ref dossier-migration/phase-04 -f max_programs=0` exit 0
    - Workflow-Run wird via `gh run list` gefunden (RUN_ID ist gesetzt)
    - `gh run watch <RUN_ID> --exit-status` exit 0 (Workflow-Run abgewartet und gruen)
    - `gh run view <RUN_ID> --json conclusion -q '.conclusion'` exakt `"success"`
    - `/tmp/auto-pflege-live-smoke.log` enthaelt eine Zeile mit "Auto-Pflege Ergebnis" ODER aequivalentes Step-Success-Signal
  </acceptance_criteria>
  <done>
    E2E-Live-Smoke ist materiell gruen: Workflow wurde via gh workflow run dispatched, lief auf der GitHub-Actions-Umgebung mit `max_programs=0`, hat seinen Scan-Schritt durchlaufen, ein leeres failure-report.md geschrieben, das Artifact hochgeladen und mit conclusion=success beendet. Success-Criterion #4 ist damit nicht mehr ein Dry-Run-Surrogat, sondern ein echter Live-Lauf-Beweis.
  </done>
</task>

<task type="auto">
  <name>Task 5: Loeschungen — alte Workflows + program-candidates.json (D-01, D-03)</name>
  <files>.github/workflows/weekly-dossier-extraction.yml (deleted), .github/workflows/weekly-program-scan.yml (deleted), data/program-candidates.json (deleted if exists)</files>
  <read_first>
    - .github/workflows/weekly-dossier-extraction.yml (vor Loeschung — sicher dass kein noch ungenutztes Pattern verloren geht)
    - .github/workflows/weekly-program-scan.yml (vor Loeschung — analog)
  </read_first>
  <action>
    Schritt 1 — Existenz pruefen + Pre-Delete-Sanity:
    ```bash
    cd /home/kolja/edufunds-app
    ls .github/workflows/weekly-dossier-extraction.yml .github/workflows/weekly-program-scan.yml 2>&1
    ls data/program-candidates.json 2>/dev/null || echo "program-candidates.json existiert nicht — uebersprungen"
    # Sanity: weekly-auto-pflege.yml MUSS existieren BEVOR wir die alten loeschen
    test -f .github/workflows/weekly-auto-pflege.yml && echo "weekly-auto-pflege.yml vorhanden — Loeschung sicher"
    ```

    Schritt 2 — Backup-Block ueberpruefen (CONTEXT D-03: NICHT umbenennen, NICHT als Backup-Pfad behalten). Loeschung ist final, kein `*.bak`-File anlegen.

    Schritt 3 — Loeschungen via git rm:
    ```bash
    cd /home/kolja/edufunds-app
    git rm .github/workflows/weekly-dossier-extraction.yml
    git rm .github/workflows/weekly-program-scan.yml
    if [ -f data/program-candidates.json ]; then
      git rm data/program-candidates.json
    fi
    # Sanity:
    git status --short
    # Erwartung: D fuer beide Workflow-Files + ggf. D fuer program-candidates.json
    ```

    Schritt 4 — Cross-Reference-Check: Wird `program-candidates.json` noch irgendwo im Repo erwaehnt?
    ```bash
    cd /home/kolja/edufunds-app
    grep -r "program-candidates" --include="*.ts" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.md" . | grep -v "\.planning/" | grep -v "node_modules" | head -10
    # Erwartung: nur scripts/scan-new-programs.ts (das CLI bleibt bestehen!) erwaehnt es noch.
    # scan-new-programs.ts laeuft heute nicht mehr im Cron, ist aber als manuelles Tool ok.
    # Falls AENDERE Refs auftauchen (z.B. UI-Code) → STOP, das ist Plan-04-Bug
    ```

    Schritt 5 — scan-new-programs.ts laeuft selbststaendig nicht mehr (kein Cron mehr triggert es). Im Header-Kommentar des Skripts notieren:
    ```bash
    cd /home/kolja/edufunds-app
    # Headers anschauen
    head -20 scripts/scan-new-programs.ts
    ```
    DECISION: scan-new-programs.ts bleibt unveraendert. Das CLI bleibt fuer manuelle Source-Tests nutzbar (CONTEXT canonical_refs Z.80: "das Standalone-Skript bleibt für manuelle Source-Tests"). Eine separate Comment-Anpassung waere Scope-Creep.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; ! test -f .github/workflows/weekly-dossier-extraction.yml &amp;&amp; ! test -f .github/workflows/weekly-program-scan.yml &amp;&amp; ! test -f data/program-candidates.json &amp;&amp; test -f .github/workflows/weekly-auto-pflege.yml &amp;&amp; git status --short | grep -E "^D " | wc -l | (read N; test "$N" -ge 2)
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `.github/workflows/weekly-dossier-extraction.yml` existiert NICHT
    - Datei `.github/workflows/weekly-program-scan.yml` existiert NICHT
    - Datei `data/program-candidates.json` existiert NICHT
    - Datei `.github/workflows/weekly-auto-pflege.yml` existiert weiterhin (Replacement steht)
    - `git status --short` zeigt mindestens 2 Deletions (D-Praefix)
    - Cross-Reference-Check: program-candidates.json kommt nur noch in scripts/scan-new-programs.ts vor (das CLI bleibt erhalten) UND in .planning/-Files (Doku) — KEIN anderer Code-Path nutzt es
  </acceptance_criteria>
  <done>
    Die zwei alten Workflows sind weg, die Zwischendaten-Datei ist weg. Repo-State ist sauber: nur noch ein Auto-Pflege-Workflow als Single-Source-of-Truth.
  </done>
</task>

<task type="auto">
  <name>Task 6: Commit aller Plan-04-Aenderungen + finale Strict-Validator-Sanity (FETCH-04-Anker)</name>
  <files>(commit-only)</files>
  <read_first>
    - (alle Plan-04-modifizierten Files — git diff inspect)
  </read_first>
  <action>
    Schritt 1 — Sanity pre-commit:
    ```bash
    cd /home/kolja/edufunds-app
    git status --short
    git diff --stat HEAD
    # Erwartung: 1 modified (extract-richtlinie.ts), 2 deleted (alte yml), 1 new file (weekly-auto-pflege.yml), 1 new file (auto-pflege-step.ts), 0 or 1 deleted (program-candidates.json)
    ```

    Schritt 2 — Strict-Validator final-Lauf gegen alle 11 Dossiers. **Das ist der materielle FETCH-04-Verifikations-Anker in diesem Plan** (aus Cross-AI-Review BLOCKER 3: FETCH-04 ist nicht nur in 04-02 + 04-03 gedeckt, sondern auch hier in 04-04 finaler Lauf nach Plan-Merge):
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx scripts/validate-richtlinien.ts
    echo "Strict-Exit: $?"
    # Erwartung: exit 0 — Phase-3-Foundation + Plan-03-Migration + Plan-04-Refactor sind intakt
    ```
    Wenn exit != 0: STOP. Plan 04-04 darf nicht commited werden, wenn FETCH-04 gebrochen ist (z.B. weil der Library-Refactor in Task 1 versehentlich ein Dossier korrumpiert hat — sollte nicht passieren, aber Defense-in-Depth).

    Schritt 3 — Atomarer Commit. Alle Plan-04-Aenderungen in EINEM Commit, weil sie zusammen ein semantisches Ganzes bilden (Single-Workflow + Library-Refactor + Loeschungen + Auto-Pflege-Step):
    ```bash
    cd /home/kolja/edufunds-app
    git add scripts/extract-richtlinie.ts scripts/auto-pflege-step.ts .github/workflows/weekly-auto-pflege.yml
    git add -u .github/workflows/weekly-dossier-extraction.yml .github/workflows/weekly-program-scan.yml
    if [ -f data/program-candidates.json ] || git ls-files --deleted | grep -q "data/program-candidates.json"; then
      git add -u data/program-candidates.json 2>/dev/null || true
    fi
    git status --short

    git commit -m "$(cat <<'EOF'
    feat(workflows): single weekly-auto-pflege Workflow + Library-Refactor + Failure-Issue-Pattern

    Plan 04-04 (D-01/D-02/D-03/D-10/D-11/D-12): Single-Cron-Workflow ersetzt
    funktional die zwei alten Workflows (weekly-dossier-extraction.yml +
    weekly-program-scan.yml) und automatisiert Scanner -> HTTP-HEAD-Pre-Check
    -> Extract -> Strict-Validator-Gate -> PR pro Programm.

    Aenderungen:
    - scripts/extract-richtlinie.ts: minimal-Refactor, runExtraction + fetchOrRead
      als Library-Export. runExtraction bekommt optionalen Parameter
      `skipQueueUpdate` — CLI-Pfad unveraendert (Default false), Library-Konsum
      aus auto-pflege-step.ts ruft mit true auf um Lost-Update-Race mit dem
      lib/wizard/queue.ts-Writer zu vermeiden (Cross-AI-Review WARNING 2).
    - scripts/auto-pflege-step.ts: neuer TS-Wrapper fuer einen Per-Programm-Lauf
      mit try/catch + Failure-Klassifizierung (5 Stages: scan, http-head, extract,
      validate, queue-write). Setzt GITHUB_OUTPUT-Felder fuer den Workflow.
      Ist der EINZIGE Queue-Writer im Workflow-Pfad.
    - .github/workflows/weekly-auto-pflege.yml: Single-Workflow Mo 04:00 UTC.
      Pro Lauf: scan-all-sources -> max 5 Programme -> 1 PR pro Programm via
      gh pr create. Failure-Issue mit Label bot-failure (D-10), auto-close bei
      naechstem gruenem Lauf, 30-Tage-Artifact mit Per-Programm-Logs.
      workflow_dispatch erlaubt max_programs=0 fuer E2E-Smoke-Tests.
    - GELOESCHT: .github/workflows/weekly-dossier-extraction.yml,
      .github/workflows/weekly-program-scan.yml, data/program-candidates.json
      (D-01: in-memory list im Workflow-Run statt persistierter Zwischendatei).

    Foundation: konsumiert lib/wizard/queue.ts (Plan 04-01) UND die strict-konformen
    11 Dossiers aus Plan 04-03. Strict-Validator-Lauf gegen alle 11 Dossiers in
    diesem Commit war gruen — bestaetigt FETCH-04 nach Plan-04-Merge (parallel
    zu FETCH-02 hier neu erfuellt).

    E2E-Live-Workflow-Dispatch-Smoke folgt in Task 4 NACH diesem Commit.
    EOF
    )"
    ```

    Schritt 4 — Post-commit verification:
    ```bash
    cd /home/kolja/edufunds-app
    git log -1 --stat
    git log -1 --pretty=%s
    git log -1 --pretty=%b | head -40
    git diff --quiet  # exit 0 erwartet
    ```

    Schritt 5 — Branch-Snapshot fuer SUMMARY:
    ```bash
    cd /home/kolja/edufunds-app
    git log --oneline feature/wizard-adaptive..HEAD
    git diff feature/wizard-adaptive..HEAD --stat
    # Erwartung: 11 Migrations-Commits aus Plan 03 + 1 Commit aus Plan 04 = 12 Commits
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsx scripts/validate-richtlinien.ts &amp;&amp; git log -1 --pretty=%s | grep -E '^feat\(workflows\)' &amp;&amp; git log -1 --pretty=%b | grep -q "Plan 04-04" &amp;&amp; git log -1 --pretty=%b | grep -E "D-01|D-02|D-03" &amp;&amp; git log -1 --pretty=%b | grep -q "FETCH-04" &amp;&amp; git diff --quiet &amp;&amp; test "$(git log --oneline feature/wizard-adaptive..HEAD | wc -l)" -ge 12
    </automated>
  </verify>
  <acceptance_criteria>
    - `npx tsx scripts/validate-richtlinien.ts` exit 0 (alle 11 Dossiers strict-konform — FETCH-04 in diesem Plan bestaetigt)
    - HEAD-Commit-Subject: `feat(workflows): single weekly-auto-pflege Workflow + Library-Refactor + Failure-Issue-Pattern`
    - HEAD-Commit-Body enthaelt "Plan 04-04" UND mindestens 3 der Decision-Codes (D-01, D-02, D-03, D-10, D-11, D-12)
    - HEAD-Commit-Body enthaelt "FETCH-04" (Verifikations-Anker dokumentiert)
    - `git diff --quiet` exit 0 nach Commit
    - `git log --oneline feature/wizard-adaptive..HEAD | wc -l` >= 12 (11 Migrations-Commits aus Plan 03 + 1 Commit aus Plan 04)
    - HEAD-Commit `git log -1 --name-status` zeigt:
      - M scripts/extract-richtlinie.ts
      - A scripts/auto-pflege-step.ts
      - A .github/workflows/weekly-auto-pflege.yml
      - D .github/workflows/weekly-dossier-extraction.yml
      - D .github/workflows/weekly-program-scan.yml
      - (optional D data/program-candidates.json wenn die Datei vorher existierte)
  </acceptance_criteria>
  <done>
    Plan 04-04 ist atomar committed. Branch `dossier-migration/phase-04` enthaelt jetzt sowohl die Vollmigration (Plan 03) als auch die Vollautomations-Infrastruktur (Plan 04). FETCH-02 + FETCH-04 sind beide auf diesem Branch materiell erfuellt (FETCH-04 via finalem Strict-Validator-Lauf in diesem Plan dokumentiert). Bereit fuer Task 4 (E2E-Live-Smoke) und Task 7 (Kolja-Checkpoint).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 7: KOLJA-CHECKPOINT — Phase-4-Abschluss-Review (inkl. E2E-Live-Smoke)</name>
  <what-built>
    Phase 4 ist abgeschlossen. Auf Branch `dossier-migration/phase-04`:

    **Plan 01 (auf feature/wizard-adaptive — Pre-Migration-Branch):**
    - `lib/wizard/queue.ts` (neu): Status-Enum erweitert um `'expired'`, Helper-API
    - `scripts/cleanup-expired-queue.ts` (neu): HTTP-HEAD + Frist-Check ohne LLM
    - Test-Anker `bundesweit-ganztag` + `nrwbank-moderne-schule` auf status=expired

    **Plan 02 (auf feature/wizard-adaptive — Pre-Migration-Branch):**
    - `scripts/migrate-legacy-dossier.ts` (neu): Targeted-Fill-CLI fuer einzelnes Legacy-Dossier
    - `scripts/validate-single-dossier.ts` (neu): Helper-CLI fuer Einzeldossier-Strict-Validierung

    **Plan 03 (auf Branch dossier-migration/phase-04):**
    - 11 atomare Migrations-Commits in der Reihenfolge:
      1. Sample-1: bmbf-digitalpakt-2
      2. Sample-2: ferry-porsche-challenge-2025
      3-11. Restliche 9 Dossiers alphabetisch
    - Strict-Validator gruen gegen alle 11 Dossiers
    - Bestands-Felder byte-identisch zur Pre-Migration

    **Plan 04 (auf Branch dossier-migration/phase-04):**
    - `.github/workflows/weekly-auto-pflege.yml` (neu): Single-Cron Mo 04:00 UTC + workflow_dispatch fuer Smokes
    - `scripts/auto-pflege-step.ts` (neu): TS-Wrapper mit Per-Programm-Resilience; einziger Queue-Writer (Race-Avoidance)
    - `scripts/extract-richtlinie.ts` minimal-Refactor: runExtraction + fetchOrRead als export, runExtraction mit skipQueueUpdate-Opt-Param
    - Geloescht: weekly-dossier-extraction.yml, weekly-program-scan.yml, data/program-candidates.json
    - E2E-Live-Smoke (Task 4): `gh workflow run weekly-auto-pflege.yml --ref dossier-migration/phase-04 -f max_programs=0` mit conclusion=success

    Phase-4-Success-Criteria-Status:
    - ✅ #1 Scanner findet neue Programme automatisch und persistiert Dossier (auto-pflege-step.ts erfuellt, Workflow ruft es auf)
    - ✅ #2 Neu gefundenes Programm landet automatisch in der Queue mit berechnetem Score (auto-pflege-step.ts pusht den Eintrag)
    - ✅ #3 Alle 11 Dossiers haben die vier Phase-3-Felder, Strict-Validator gruen
    - ✅ #4 E2E-Live-Smoke ist gruen — Workflow wurde dispatched auf dem feature-Branch und beendete mit conclusion=success (Variante A aus Cross-AI-Review)
  </what-built>
  <files>(Review der Branch-Topologie + Workflow-YAML + gh run conclusion — keine Datei-Modifikation in dieser Task)</files>
  <action>Human-Verify-Checkpoint fuer Phase-4-Abschluss. Die Verifikations-Schritte stehen in <how-to-verify>. Executor wartet auf 'approved'/'PASS' (optional mit PR-Open-Anweisung) oder HOLD mit Befund.</action>
  <verify>Kolja hat 'approved'/'PASS' geantwortet — Phase 4 ist materiell abgeschlossen, FETCH-02 + FETCH-04 erfuellt. Optional: PR-Open auf den dossier-migration/phase-04-Branch ist Koljas Discretion.</verify>
  <done>Kolja hat 'approved'/'PASS' geantwortet — Phase 4 ist materiell abgeschlossen, FETCH-02 + FETCH-04 erfuellt. Optional: PR-Open auf den dossier-migration/phase-04-Branch ist Koljas Discretion.</done>
  <how-to-verify>
    1. **Branch-Topologie inspizieren:**
       ```bash
       cd /home/kolja/edufunds-app
       git log --oneline feature/wizard-adaptive..HEAD
       git log --oneline -5
       ```

    2. **Strict-Validator drueben:**
       ```bash
       cd /home/kolja/edufunds-app
       npx tsx scripts/validate-richtlinien.ts
       # Erwartung: "Alle 11 Dossiers valide (strict-Modus)." exit 0
       ```

    3. **Workflow-YAML Syntax pruefen:**
       ```bash
       cd /home/kolja/edufunds-app
       npx js-yaml .github/workflows/weekly-auto-pflege.yml > /dev/null && echo "YAML ok"
       ```

    4. **Loeschungs-Sanity:**
       ```bash
       cd /home/kolja/edufunds-app
       ls .github/workflows/
       # Erwartung: build-deploy.yml, deploy-staging.yml, deploy.yml, weekly-auto-pflege.yml (4 Files)
       # KEINE weekly-dossier-extraction.yml oder weekly-program-scan.yml mehr
       ls data/program-candidates.json 2>/dev/null
       # Erwartung: "No such file or directory"
       ```

    5. **E2E-Live-Smoke-Resultat inspizieren:**
       ```bash
       cd /home/kolja/edufunds-app
       gh run list --workflow=weekly-auto-pflege.yml --branch=dossier-migration/phase-04 --limit=3
       # Den juengsten Run mit conclusion=success identifizieren — das ist der Task-4-Smoke
       RUN_ID=$(gh run list --workflow=weekly-auto-pflege.yml --branch=dossier-migration/phase-04 --limit=1 --json databaseId -q '.[0].databaseId')
       gh run view "${RUN_ID}" --json url,conclusion -q '{url, conclusion}'
       # Erwartung: conclusion: success
       ```

    6. **PR-Strategie entscheiden:**
       Branch enthaelt 11 (Migration) + 1 (Plan 04) = 12 Commits. Optionen:
       a. **Ein Sammel-PR** `dossier-migration/phase-04` → `feature/wizard-adaptive` mit allen 12 Commits zusammen
       b. **Zwei PRs** — einen fuer Plan 01+02 auf feature/wizard-adaptive (sind dort schon commited), und einen fuer dossier-migration/phase-04 → feature/wizard-adaptive
       c. **Direkter Merge ohne PR** ins lokale feature/wizard-adaptive

       Empfehlung: Option (a) — ein Sammel-PR `dossier-migration/phase-04` -> `feature/wizard-adaptive`.

    7. **Entscheidung treffen:**
       - **APPROVE** (Phase 4 ist abgeschlossen): Antwort "approved" oder "PASS — Phase 4 abgeschlossen". Optional: "PR jetzt eroeffnen" oder "lokal liegen lassen bis Phase 5 startet".
       - **HOLD** (Befund): Konkretes Problem benennen.
  </how-to-verify>
  <resume-signal>
    Antworte mit "approved" / "PASS" wenn Phase 4 abgeschlossen ist.
    Optional: Hinweis ob PR jetzt eroeffnet werden soll oder ob der migration-Branch lokal liegen bleibt bis Phase 5 startet.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub-Actions-Workflow → externe Scanner-URLs | Scanner ruft 3 oeffentliche Bildungs-/Foerderdatenbank-URLs (data/program-sources.json) — keine Auth, kein PII |
| Workflow → DeepSeek-LLM | DEEPSEEK_API_KEY als Repo-Secret, niemals in Logs persistiert |
| auto-pflege-step.ts try/catch → Failure-Report → GitHub-Issue-Body | LLM-Response-Snippets im Failure-Report — KEIN API-Key-Leak weil wir nur error.message und error.name loggen, NICHT den vollen LLM-Response-Stream |
| Workflow → gh CLI (issue/pr create) | github.token als secrets.GITHUB_TOKEN, auto-bereitgestellt, scope-begrenzt auf das Repo (least-privilege) |
| Workflow → Branch-Push | Branch-Pattern `dossier-bot/<id>` mit `--force-with-lease`, kein Push auf main/staging |
| Queue-Writer-Pfad | NUR auto-pflege-step.ts schreibt im Workflow-Pfad in `data/richtlinien-prioritaeten.json`. runExtraction wird mit `skipQueueUpdate=true` aufgerufen → keine zwei parallelen Queue-Mutationen pro Programm-Lauf. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-17 | I (Information Disclosure) | DEEPSEEK_API_KEY in GitHub-Actions-Logs | mitigate | lib/wizard/llm.ts ist Single-Source-Wrapper, Skripte importieren nur ueber Wrapper. Acceptance-Check verbietet direkten `@google/generative-ai`/`openai`-Import in auto-pflege-step.ts. Failure-Report enthaelt nur `error.message` Slice (200 chars max) — nicht den vollen Stack-Trace mit ggf. eingebetteten Headers. |
| T-04-18 | T (Tampering) | LLM-Output landet ungeprueft in data/richtlinien/ | mitigate | runExtraction hat Strict-Validator-Gate als Pre-Persist-Check (Phase-3-Pattern). Wenn Validator failed → process.exit(1) in runExtraction, auto-pflege-step.ts try/catch faengt das ab und schreibt Failure-Record stage="extract". KEIN writeFile bei Verletzung. |
| T-04-19 | S (Spoofing) / SSRF | HTTP-HEAD + Extract gegen URLs aus Scanner-Output | mitigate | Scanner-Output kommt vom LLM und enthaelt URLs aus der Quell-Webseite — kein direkter User-Input. URLs werden gegen `data/foerderprogramme.json` deduped. HTTP-HEAD folgt Redirects auf 5 Hops (fetch-default). Falls in Zukunft user-supplied URLs reinkaemen → eigene Phase. |
| T-04-20 | D (DoS) | Workflow-Runtime-Explosion bei viele Kandidaten | mitigate | `--max-programs` Default 5, Cap auf 50 via env-Var-Validation im Workflow. Pro Programm sequenziell (kein parallelism), 60s LLM-Timeout (lib/wizard/llm.ts). Worst-Case ~5 × 60s = 5 Minuten LLM-Zeit pro Run. |
| T-04-21 | E (Elevation) | Workflow erhaelt issues:write + pull-requests:write Berechtigung | accept | Branch-Pattern `dossier-bot/<id>`, kein Push auf main/staging. PR-Open-Aktion ist scope-begrenzt auf dieses Repo. GH_TOKEN ist auto-bereitgestellt, kein PAT mit ueberbreitem Scope. |
| T-04-22 | R (Repudiation) | Bei Failure: welches Programm war Stage X | mitigate | Per-Programm-JSON-Log in logs/auto-pflege-<datum>/<id>.json mit Stage + Outcome + Details. Artifact-Upload mit 30-Tage-Retention (D-12). GitHub-Issue-Body mit strukturierter Liste pro Stage. |
| T-04-23 | T (Tampering) | Race-Condition bei zwei simultanen Workflow-Runs (z.B. Cron + manueller Dispatch) | mitigate | Branch-Pattern `dossier-bot/<id>` ist programmId-spezifisch — zwei Workflows fuer dasselbe Programm pushen auf denselben Branch. `--force-with-lease` schuetzt vor versehentlichem Overwrite (push schlaegt fehl wenn der remote-Branch sich geaendert hat). gh pr create faengt "PR existiert bereits" mit `|| echo "PR-Erstellung fehlgeschlagen"` ab. |
| T-04-24 | I (Info Disclosure) | LLM-Response-Snippets im Issue-Body | mitigate | writeFailureReport schreibt nur error.message (truncated 200) + error.name + programmId — KEIN raw LLM-Response. Vollstaendige Logs landen im Artifact (private fuer Repo-Mitglieder mit Actions-Zugriff, nicht oeffentlich im Issue). |
| T-04-27 | T (Tampering) | Queue-Lost-Update durch zwei parallele Writer (runExtraction + auto-pflege-step) | mitigate | runExtraction wird mit `skipQueueUpdate: true` aufgerufen → kein interner markDoneInQueue. auto-pflege-step.ts ist der EINZIGE Queue-Writer im Workflow-Pfad. Acceptance-Check Task 2: `grep -c "skipQueueUpdate: true"` >= 1. Verifiziert via Cross-AI-Review WARNING 2. |
</threat_model>

<verification>
1. **Type-Sanity:** `npx tsc --noEmit scripts/extract-richtlinie.ts scripts/auto-pflege-step.ts` exit 0
2. **Workflow-YAML-Validity:** `npx js-yaml .github/workflows/weekly-auto-pflege.yml > /dev/null` exit 0
3. **Phase-3-Pattern-Hardening:** `set -euo pipefail` in jedem run-Block (>= 3 Vorkommnisse), Secret-Pre-Flight, env-Var-Bridge fuer github.event.inputs
4. **D-01 Single-Workflow:** beide alten Workflows geloescht, program-candidates.json geloescht (ggf.)
5. **D-02 PR-pro-Programm:** Workflow nutzt `gh pr create` in Bash-Loop ueber comma-separated `success_ids`
6. **D-10 Failure-Issue:** `gh issue create --label bot-failure` + Auto-Close-Block
7. **D-11 Continue-on-Error:** auto-pflege-step.ts hat per-Programm try/catch, exit 0 auch bei Failures
8. **D-12 Strukturiertes Issue + Artifact:** writeFailureReport produziert Markdown mit Stage-Sektionen, upload-artifact retention 30 Tage
9. **Library-Refactor minimal:** git diff scripts/extract-richtlinie.ts zeigt nur Mini-Aenderungen (export-Keywords + Opt-Param + Conditional-Block)
10. **Race-Avoidance (Cross-AI-Review WARNING 2):** runExtraction-Aufruf in auto-pflege-step.ts MUSS `skipQueueUpdate: true` enthalten. Geprueft via grep in Task 2 acceptance.
11. **Plan-01-Foundation-Use:** auto-pflege-step.ts importiert aus `lib/wizard/queue` (loadQueue, saveQueue, QueueItem)
12. **Strict-Validator gruen (FETCH-04-Anker):** `npx tsx scripts/validate-richtlinien.ts` exit 0 vor Task-6-Commit
13. **E2E-Live-Smoke (Cross-AI-Review WARNING 1 Variante A):** gh workflow run dispatched, gh run watch exit 0, gh run view conclusion=success
</verification>

<success_criteria>
Plan 04-04 ist erfolgreich abgeschlossen, wenn:

- [ ] `scripts/extract-richtlinie.ts` exportiert `runExtraction` (mit `skipQueueUpdate`-Opt-Param) + `fetchOrRead` (CLI bleibt unveraendert)
- [ ] `scripts/auto-pflege-step.ts` existiert mit Per-Programm-try/catch + 5-Stage-Failure-Klassifizierung
- [ ] auto-pflege-step.ts ruft `runExtraction(..., { skipQueueUpdate: true })` auf (Race-Avoidance)
- [ ] `.github/workflows/weekly-auto-pflege.yml` existiert mit Single-Cron + Issue-Creation + Artifact-Upload, erlaubt `max_programs=0` fuer Smoke
- [ ] `.github/workflows/weekly-dossier-extraction.yml` UND `weekly-program-scan.yml` sind geloescht
- [ ] `data/program-candidates.json` ist geloescht (falls Datei vorher existierte)
- [ ] Workflow-YAML ist valide, alle Phase-3-Hardening-Patterns sind enthalten (set -euo pipefail, env-Bridge, Secret-Pre-Flight)
- [ ] Strict-Validator gegen alle 11 Dossiers gruen vor dem Plan-04-Commit (FETCH-04-Anker)
- [ ] E2E-Live-Smoke ist gruen: gh workflow run weekly-auto-pflege.yml --ref dossier-migration/phase-04 -f max_programs=0 hat conclusion=success
- [ ] FETCH-02 + FETCH-04 sind materiell erfuellt
- [ ] Plan 04-04 ist atomar committed mit Conventional-Prefix + Plan-Referenz + D-Code-Liste + FETCH-04-Erwaehnung im Body
- [ ] Final Kolja-Checkpoint hat "approved"-Antwort
</success_criteria>

<output>
Nach Abschluss: `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-04-vollautomations-workflow-library-refactor-e2e-SUMMARY.md` schreiben mit:
- Liste aller Plan-04-Modifikationen (add/modify/delete) mit File-Pfaden
- Workflow-Stages mit Output-Erwartung pro Stage (Scan → HEAD → Extract → Strict-Validator → Queue → PR)
- E2E-Live-Smoke-Resultat: Workflow-Run-ID, URL, conclusion, dauer
- Bestaetigung Race-Avoidance: runExtraction-Aufruf in auto-pflege-step.ts hat `skipQueueUpdate: true`
- Bestaetigung FETCH-04: Strict-Validator gegen alle 11 Dossiers gruen in Plan-04-Commit
- Phase-4-Closure-Status: alle 4 Success-Criteria abgehakt, FETCH-02 + FETCH-04 erfuellt
- Empfehlung fuer Plan-Phase-Verifier: Strict-Validator-Lauf, YAML-Parse, Plan-Migrations-Commits-Count >= 11, gh-run-conclusion=success
</output>
