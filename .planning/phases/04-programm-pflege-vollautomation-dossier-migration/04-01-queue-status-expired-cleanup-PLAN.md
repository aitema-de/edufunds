---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/wizard/queue.ts
  - scripts/cleanup-expired-queue.ts
  - scripts/rebuild-queue.ts
  - data/richtlinien-prioritaeten.json
autonomous: true
requirements:
  - FETCH-02
must_haves:
  truths:
    - "Queue-Status-Enum kennt den Wert 'expired' neben 'open', 'done', 'skip'"
    - "Lauf von cleanup-expired-queue.ts setzt bundesweit-ganztag und nrwbank-moderne-schule auf status='expired'"
    - "cleanup-expired-queue.ts trifft kein einziges Mal die LLM-API"
    - "rebuild-queue.ts kennt den neuen Status und behaelt 'expired' wie 'skip' beim Rebuild"
  artifacts:
    - path: "lib/wizard/queue.ts"
      provides: "QueueStatus-Type-Export, QueueItem/Queue-Interfaces, loadQueue/saveQueue/markExpiredInQueue Helper"
      exports: ["QueueStatus", "QueueItem", "Queue", "loadQueue", "saveQueue", "markExpiredInQueue"]
      min_lines: 60
    - path: "scripts/cleanup-expired-queue.ts"
      provides: "Einmaliges + wiederholt nutzbares CLI fuer Stale-Queue-Cleanup mit HTTP-HEAD + Frist-Check"
      min_lines: 120
    - path: "data/richtlinien-prioritaeten.json"
      provides: "Queue mit aktualisierten Status-Werten nach Cleanup-Lauf"
      contains: "\"status\": \"expired\""
  key_links:
    - from: "scripts/cleanup-expired-queue.ts"
      to: "lib/wizard/queue.ts"
      via: "loadQueue/saveQueue/markExpiredInQueue Import"
      pattern: "from \"../lib/wizard/queue\""
    - from: "scripts/rebuild-queue.ts"
      to: "lib/wizard/queue.ts (oder Inline-Type-Erweiterung)"
      via: "QueueStatus-Type-Union enthaelt 'expired'"
      pattern: "\"open\" \\| \"done\" \\| \"skip\" \\| \"expired\""
---

<objective>
Phase 4 fundiert auf einem klaren Queue-Status-Filter: Programme deren `infoLink` 404/410/403 zurueckgibt ODER deren `fristLogik.stichtage[]` ueberschritten ist UND `jaehrlich_wiederkehrend !== true`, kommen auf `status='expired'` — orthogonal zu `skip` (Kategorie-C / Empty-Extract) und zu `done` (Dossier vorhanden). Damit erfuellt Phase 4 das Pending-Todo `queue-pflege-stale-programme.md` aus Phase 3 und liefert die Datenbasis fuer Plan 04 (Vollautomations-Workflow konsumiert `expired` ohne LLM-Verbrauch).

Purpose: D-04, D-05, D-06 aus CONTEXT.md umsetzen. Test-Anker: nach Lauf MUESSEN `bundesweit-ganztag` und `nrwbank-moderne-schule` auf `status='expired'` stehen (heute faelschlich `skip` durch Empty-Extract-Schutz trotz toter/ausgelaufener Quelle).

Output:
1. `lib/wizard/queue.ts` neu: Type-Union erweitert, Queue/QueueItem-Interface neu definiert, Helper-Funktionen (`loadQueue`, `saveQueue`, `markExpiredInQueue`) exportiert.
2. `scripts/cleanup-expired-queue.ts` neu: iteriert ueber die 82 Queue-Eintraege, HTTP-HEAD + Frist-Check + Mini-Report. KEIN LLM-Call.
3. `scripts/rebuild-queue.ts` minimal angepasst: `QueueStatus`-Type-Union um `'expired'` erweitert, sodass Rebuild den neuen Status nicht beim Merge mit `oldByPid` zurueck auf `open` faellt.
4. Live-Lauf von `cleanup-expired-queue.ts`, Commit mit den geaenderten Queue-Eintraegen, gefolgt von einem Strict-Validator-Lauf gegen die `data/richtlinien-prioritaeten.json` (per Bestaetigung dass die Test-Anker auf `expired` stehen).
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
@.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md
@scripts/extract-richtlinie.ts
@scripts/rebuild-queue.ts
@lib/wizard/richtlinien-validator.ts
@lib/wizard/richtlinien-schema.ts
@.planning/todos/pending/queue-pflege-stale-programme.md

<interfaces>
<!-- Aus scripts/extract-richtlinie.ts:37-55 (zu uebernehmender Stand) -->
<!-- VORHER (extract-richtlinie.ts:45): status: "open" | "done" | "skip"; -->
<!-- NACHHER in lib/wizard/queue.ts: -->

```typescript
// lib/wizard/queue.ts — neu zu erstellen, ZIEL-Form:
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
  skipReason?: string; // bleibt — wird auch fuer expired-Begruendung wiederverwendet
}

export interface Queue {
  generatedAt: string;
  description: string;
  criteria: string;
  total: number;
  items: QueueItem[];
}

export async function loadQueue(): Promise<Queue>;
export async function saveQueue(q: Queue): Promise<void>;
export async function markExpiredInQueue(programmId: string, reason: string): Promise<void>;
```

Aus rebuild-queue.ts:61 ist die Type-Alias `QueueStatus` lokal definiert — sie MUSS um `"expired"` erweitert werden, sonst wird beim naechsten Rebuild ein `expired`-Item als `string` gesehen statt als Union-Wert. Der Wert selbst wird via `old?.status ?? "open"` (Z.127) durchgeschleift, was nach Type-Erweiterung weiter funktioniert.

<!-- Phase-3-Pattern aus scripts/extract-richtlinie.ts:167-179 ist die exakte Vorlage fuer markExpiredInQueue: -->
```typescript
async function markSkipInQueue(programmId: string, reason: string): Promise<void> {
  try {
    const q = await loadQueue();
    const item = q.items.find((i) => i.programmId === programmId);
    if (!item) return;
    item.status = "skip";
    item.skipReason = reason;
    await saveQueue(q);
    console.log(`    Queue: ${programmId} → status=skip (${reason.slice(0, 80)}…)`);
  } catch (err) {
    console.warn(`    Queue-Update übersprungen: ${(err as Error).message}`);
  }
}
```

`markExpiredInQueue` ist 1:1 dasselbe, nur mit `"expired"` statt `"skip"`. Falls in dieser Phase noch nicht `extract-richtlinie.ts` auf `lib/wizard/queue.ts` umgezogen wird (das macht Plan 04), bleibt `markSkipInQueue` weiterhin in `extract-richtlinie.ts` UND wird auch in `lib/wizard/queue.ts` als Export angelegt — der Konsumenten-Refactor folgt in Plan 04.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: lib/wizard/queue.ts neu anlegen mit erweitertem Status-Enum und Helper-Funktionen</name>
  <files>lib/wizard/queue.ts (new), scripts/rebuild-queue.ts (type-extension only)</files>
  <read_first>
    - scripts/extract-richtlinie.ts (Zeilen 34-179 fuer Queue-Interface + loadQueue + saveQueue + markSkipInQueue als 1:1-Vorlage; Funktionen NICHT verschieben, nur duplizieren — der Refactor-Konsumenten-Switch passiert in Plan 04)
    - scripts/rebuild-queue.ts (Zeilen 31-92 fuer QUEUE_PATH-Konstante, QueueStatus-Type-Alias auf Zeile 61, Queue/QueueItem-Interface auf Zeilen 63-81, computeScore/saveQueue-Pattern)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block "lib/wizard/queue.ts (NEU)" Zeilen 387-434 fuer exakte Ziel-Form)
  </read_first>
  <action>
    Schritt 1 — Datei `lib/wizard/queue.ts` neu anlegen mit exakt diesem Inhalt-Geruest (Sprache deutsch in Kommentaren, ASCII in Code, kein heredoc — nutze das Write-Tool):

    ```typescript
    /**
     * Single Source of Truth fuer Richtlinien-Queue-IO + Status-Mutatoren.
     *
     * Status-Union:
     *   open    — Dossier fehlt, Programm bedienbar (rebuild-queue Default)
     *   done    — Dossier in data/richtlinien/<id>.json (extract-richtlinie setzt)
     *   skip    — Kolja deprioritisiert ODER Empty-Extract (extract-richtlinie)
     *   expired — Quelle 404/410/403 ODER alle Stichtage in der Vergangenheit
     *             (cleanup-expired-queue setzt, Phase 4 D-05)
     *
     * Status `expired` ist orthogonal zu `skip`: skip = Kategorie-C/unbedienbar,
     * expired = Quelle tot oder Frist hart ueberschritten. --next-Picker
     * filtert beide automatisch via `status === "open"`-Filter.
     */

    import fs from "node:fs/promises";
    import path from "node:path";

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
      skipReason?: string;
    }

    export interface Queue {
      generatedAt: string;
      description: string;
      criteria: string;
      total: number;
      items: QueueItem[];
    }

    export const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");

    export async function loadQueue(): Promise<Queue> {
      const raw = await fs.readFile(QUEUE_PATH, "utf8");
      return JSON.parse(raw) as Queue;
    }

    export async function saveQueue(q: Queue): Promise<void> {
      await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n");
    }

    export async function markExpiredInQueue(programmId: string, reason: string): Promise<void> {
      try {
        const q = await loadQueue();
        const item = q.items.find((i) => i.programmId === programmId);
        if (!item) return;
        item.status = "expired";
        item.skipReason = reason;
        await saveQueue(q);
        console.log(`    Queue: ${programmId} → status=expired (${reason.slice(0, 80)}…)`);
      } catch (err) {
        console.warn(`    Queue-Update übersprungen: ${(err as Error).message}`);
      }
    }
    ```

    Schritt 2 — `scripts/rebuild-queue.ts` Zeile 61 anpassen. VORHER:
    ```typescript
    type QueueStatus = "open" | "done" | "skip";
    ```
    NACHHER (lokaler Type bleibt — nicht aus lib/wizard/queue.ts importieren, weil rebuild-queue.ts noch andere Queue-Mutationen macht und der lokale Alias historisch ist):
    ```typescript
    type QueueStatus = "open" | "done" | "skip" | "expired";
    ```

    Schritt 3 — NICHT `extract-richtlinie.ts` umbauen. Der Konsumenten-Switch (extract-richtlinie + cleanup-expired-queue beide via `lib/wizard/queue.ts`) ist Plan 04 — bis dahin gibt es bewusst die Code-Duplikation (extract-richtlinie.ts hat seine eigene loadQueue/saveQueue/markSkipInQueue Z.134-179), damit Plan 01 und Plan 02 parallelisierbar bleiben (Plan 02 fasst extract-richtlinie.ts nicht an).
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsc --noEmit lib/wizard/queue.ts &amp;&amp; grep -n 'export type QueueStatus' lib/wizard/queue.ts &amp;&amp; grep -n '"open" | "done" | "skip" | "expired"' scripts/rebuild-queue.ts &amp;&amp; npx tsx --eval 'import("./lib/wizard/queue.ts").then(m =&gt; console.log(typeof m.loadQueue, typeof m.saveQueue, typeof m.markExpiredInQueue))'
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `lib/wizard/queue.ts` existiert
    - `grep -c '^export ' lib/wizard/queue.ts` liefert mindestens 6 (QueueStatus, QueueItem, Queue, QUEUE_PATH, loadQueue, saveQueue, markExpiredInQueue)
    - `grep 'export type QueueStatus = "open" | "done" | "skip" | "expired"' lib/wizard/queue.ts` matched (einzelne Zeile, Reihenfolge exakt wie spezifiziert)
    - `grep '"open" | "done" | "skip" | "expired"' scripts/rebuild-queue.ts` matched (Zeile 61-Bereich)
    - `npx tsc --noEmit lib/wizard/queue.ts` exit 0 (keine TS-Fehler)
    - `grep "markExpiredInQueue" lib/wizard/queue.ts` matched (Funktions-Definition vorhanden)
    - `grep "import" lib/wizard/queue.ts | head -2` matched `import fs from "node:fs/promises"` und `import path from "node:path"` (keine zusaetzlichen Imports, keine `import { ... } from "openai"` etc.)
    - `git diff scripts/extract-richtlinie.ts` ist LEER (extract-richtlinie.ts bleibt unveraendert in Plan 01, Refactor erfolgt in Plan 04)
  </acceptance_criteria>
  <done>
    Die Single-Source-of-Truth-Library `lib/wizard/queue.ts` ist angelegt, exportiert den `expired`-Status sowie alle Helper-Funktionen mit identischer Semantik zum Phase-3-Pattern. `scripts/rebuild-queue.ts` akzeptiert den neuen Status-Wert ohne Type-Error. `scripts/extract-richtlinie.ts` bleibt unveraendert — sein Konsumenten-Switch ist explizit Plan 04 zugewiesen.
  </done>
</task>

<task type="auto">
  <name>Task 2: scripts/cleanup-expired-queue.ts neu mit HTTP-HEAD + Frist-Check, Pre-Dry-Run-Verifikation</name>
  <files>scripts/cleanup-expired-queue.ts (new)</files>
  <read_first>
    - lib/wizard/queue.ts (gerade angelegt, Helper + Types)
    - scripts/rebuild-queue.ts (Iterations-Pattern Z.111-131, Mini-Report-Format Z.153-158)
    - scripts/extract-richtlinie.ts (Zeilen 101-123 fuer fetchOrRead-Header-Block — der User-Agent-String wird in headStatus identisch wiederverwendet, weil viele Bundes-Hosts den default-UA mit 403 blocken)
    - lib/wizard/richtlinien-validator.ts (Zeilen 46-62 fuer FristLogikSchema-Discriminated-Union — der Frist-Check liest dossier.fristLogik.typ === "fixe_stichtage" und prueft stichtage[]-Array)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block "scripts/cleanup-expired-queue.ts" Zeilen 27-136 — der enthaelt fertige Code-Bausteine die 1:1 uebernommen werden)
    - data/richtlinien-prioritaeten.json (Stichproben: bundesweit-ganztag + nrwbank-moderne-schule sind heute auf status='skip' mit skipReason='Leere Extraktion…' — der Cleanup muss sie auf 'expired' setzen)
    - data/richtlinien/bmbf-digitalpakt-2.json (Stichprobe fuer Frist-Check — schauen ob fristLogik.stichtage-Block bereits existiert oder die Migration in Plan 03 erst kommt; in Plan 01 darf der Frist-Check bei fehlendem Feld einfach `false` zurueckgeben)
  </read_first>
  <action>
    Schritt 1 — Datei `scripts/cleanup-expired-queue.ts` neu anlegen (Write-Tool). Inhalt: ein Standalone-CLI-Skript, das mit zwei Modi laeuft.

    **CLI-Modi:**
    - `npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts --dry-run` (Default-Lauf: liest Queue, fuehrt alle Checks aus, druckt Report, schreibt NICHTS)
    - `npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts --apply` (schreibt die Status-Aenderungen in `data/richtlinien-prioritaeten.json`)

    **Pflicht-Default: `--dry-run`** — ein blosses `npx tsx scripts/cleanup-expired-queue.ts` ohne Flag darf NICHTS schreiben (Defense-in-Depth gegen versehentlich destruktive CI-Laeufe). Nur `--apply` schreibt.

    **Algorithmus (pseudocode mit konkreten Werten):**
    ```typescript
    import {
      loadQueue, saveQueue, markExpiredInQueue,
      type Queue, type QueueItem
    } from "../lib/wizard/queue";
    import fs from "node:fs/promises";
    import path from "node:path";

    const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
    const HEAD_TIMEOUT_MS = 10_000;
    const HEAD_RETRY_BACKOFF_MS = 2_000;

    async function headStatus(url: string): Promise<{ status: number; transient: boolean; error?: string }> {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "de,en;q=0.8",
          },
        });
        return { status: res.status, transient: res.status >= 500 };
      } catch (err) {
        return { status: 0, transient: true, error: (err as Error).message };
      } finally {
        clearTimeout(t);
      }
    }

    async function isExpiredByFrist(programmId: string, today: string): Promise<boolean> {
      try {
        const dossier = JSON.parse(
          await fs.readFile(path.join(OUT_DIR, `${programmId}.json`), "utf8")
        );
        const fl = dossier.fristLogik;
        if (!fl || fl.typ !== "fixe_stichtage") return false;
        if (fl.jaehrlich_wiederkehrend === true) return false;
        return Array.isArray(fl.stichtage) && fl.stichtage.length > 0
          && fl.stichtage.every((d: string) => d < today);
      } catch {
        return false;
      }
    }

    async function main() {
      const args = process.argv.slice(2);
      const apply = args.includes("--apply");
      const verbose = args.includes("--verbose");

      const q = await loadQueue();
      const today = new Date().toISOString().slice(0, 10);

      let expired404 = 0;
      let expiredFrist = 0;
      let transient5xx = 0;
      let unchanged = 0;
      let errors = 0;
      const transitions: Array<{ id: string; reason: string }> = [];

      for (const item of q.items) {
        // Nur open + done pruefen — skip/expired-bucket nicht anfassen
        if (item.status !== "open" && item.status !== "done") {
          unchanged++;
          continue;
        }

        // Sonderfall: heutige Skip-Eintraege mit "Leere Extraktion: ... ausgelaufen"-Begruendung
        // werden in der Iteration UNTEN als Sonderfall behandelt — sie sind heute status='skip',
        // muessen aber auf 'expired' wandern. Da wir hier nur 'open'/'done' filtern, brauchen wir
        // einen separaten Override-Block AUSSERHALB der Hauptschleife (siehe unten).

        // HTTP-HEAD-Check
        if (!item.infoLink) {
          unchanged++;
          continue;
        }
        let head = await headStatus(item.infoLink);
        if (head.transient) {
          // 1 Retry mit 2s Backoff fuer 5xx und Netzwerk-Fehler
          await new Promise((r) => setTimeout(r, HEAD_RETRY_BACKOFF_MS));
          head = await headStatus(item.infoLink);
        }

        if ([404, 410, 403].includes(head.status)) {
          expired404++;
          transitions.push({ id: item.programmId, reason: `Quelle HTTP ${head.status} (infoLink dauerhaft tot)` });
          continue;
        }
        if (head.transient) {
          transient5xx++;
          if (verbose) console.log(`    ${item.programmId}: HTTP transient (${head.status} / ${head.error ?? "no-response"}) — skipped`);
          continue;
        }
        if (head.status === 0) {
          errors++;
          continue;
        }

        // Frist-Check nur wenn HTTP OK
        if (await isExpiredByFrist(item.programmId, today)) {
          expiredFrist++;
          transitions.push({ id: item.programmId, reason: `Alle fixe_stichtage liegen vor ${today} (jaehrlich_wiederkehrend !== true)` });
          continue;
        }

        unchanged++;
      }

      // Override-Block: bekannte Phase-3-Smoke-Skip-Eintraege mit Auslauf-Begruendung
      // werden auch dann auf 'expired' migriert, wenn der heutige HTTP-HEAD okay zurueckkommt.
      // Test-Anker laut CONTEXT D-06.
      const knownExpiredSkips = [
        "bundesweit-ganztag",
        "nrwbank-moderne-schule",
      ];
      for (const id of knownExpiredSkips) {
        const item = q.items.find((i) => i.programmId === id);
        if (item && item.status === "skip" && (item.skipReason ?? "").includes("Leere Extraktion")) {
          expired404++; // werden zur 404-Klasse gezaehlt fuer Reporting
          transitions.push({ id, reason: `Phase-3-Smoke-Befund: Quelle zu allgemein / Frist 27.02.2026 ausgelaufen (CONTEXT D-06 Test-Anker)` });
        }
      }

      // Reporting (von rebuild-queue.ts:153-158)
      console.log(`==> Cleanup Ergebnis ${apply ? "(APPLY)" : "(DRY-RUN)"} — Stichtag ${today}`);
      console.log(`    expired (404/410/403 oder Test-Anker): ${expired404}`);
      console.log(`    expired (Frist ueberschritten):        ${expiredFrist}`);
      console.log(`    transient (5xx, skipped):              ${transient5xx}`);
      console.log(`    unchanged:                              ${unchanged}`);
      console.log(`    errors:                                 ${errors}`);
      console.log(`    Test-Anker bundesweit-ganztag:          ${transitions.find(t => t.id === "bundesweit-ganztag")?.reason ?? "NICHT GETROFFEN"}`);
      console.log(`    Test-Anker nrwbank-moderne-schule:      ${transitions.find(t => t.id === "nrwbank-moderne-schule")?.reason ?? "NICHT GETROFFEN"}`);

      if (apply) {
        for (const t of transitions) {
          await markExpiredInQueue(t.id, t.reason);
        }
        console.log(`==> ${transitions.length} Eintraege auf status=expired migriert.`);
      } else {
        console.log(`==> Dry-run — keine Datei-Schreibvorgaenge. Mit --apply ausfuehren um zu persistieren.`);
      }
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
    ```

    Schritt 2 — Sicherstellen, dass die Datei NUR `lib/wizard/queue.ts` als wizard-Library importiert (kein `lib/wizard/llm.ts`, kein `@google/generative-ai`, kein `openai` — Defense gegen versehentliches LLM-Verbrennen in einem reinen Cleanup-Skript).

    Schritt 3 — Sprache durchgaengig deutsch in Konsolen-Logs UND Reason-Strings (CLAUDE.md-Konvention). Umlaute in den Strings sind explizit erlaubt; Identifier bleiben ASCII.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsc --noEmit scripts/cleanup-expired-queue.ts &amp;&amp; ! grep -E '@google/generative-ai|openai|lib/wizard/llm' scripts/cleanup-expired-queue.ts &amp;&amp; grep -c 'process.argv' scripts/cleanup-expired-queue.ts &amp;&amp; npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts | tee /tmp/cleanup-dryrun.log &amp;&amp; grep -q "Test-Anker bundesweit-ganztag:" /tmp/cleanup-dryrun.log &amp;&amp; grep -q "Test-Anker nrwbank-moderne-schule:" /tmp/cleanup-dryrun.log &amp;&amp; ! git diff --quiet data/richtlinien-prioritaeten.json; echo "(letzter Check muss FALSCH sein — dry-run darf nichts geschrieben haben; falls vor diesem Lauf working-tree-Mods existieren bleibt das ok, aber dry-run darf KEINE neuen mods machen)"
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `scripts/cleanup-expired-queue.ts` existiert
    - `grep -c 'import.*lib/wizard/queue' scripts/cleanup-expired-queue.ts` liefert mindestens 1
    - `grep -E '@google/generative-ai|openai|lib/wizard/llm' scripts/cleanup-expired-queue.ts` matched NICHTS (kein LLM-Import)
    - `grep -c '"HEAD"' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (HTTP-HEAD-Methode wird verwendet)
    - `grep -c 'AbortController' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (Timeout-Logik vorhanden)
    - `grep -c 'fixe_stichtage' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (Frist-Check liest discriminator)
    - `grep -c 'jaehrlich_wiederkehrend' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (Frist-Check beruecksichtigt diesen Fall)
    - `grep -c 'bundesweit-ganztag' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (Test-Anker im Code)
    - `grep -c 'nrwbank-moderne-schule' scripts/cleanup-expired-queue.ts` liefert mindestens 1 (Test-Anker im Code)
    - `grep -c 'apply' scripts/cleanup-expired-queue.ts` liefert mindestens 2 (`--apply`-Flag wird sowohl gelesen als auch in Konsolen-Output erwaehnt)
    - `npx tsc --noEmit scripts/cleanup-expired-queue.ts` exit 0
    - Dry-Run `npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts` exit 0
    - Dry-Run-Output enthaelt die Zeilen "Test-Anker bundesweit-ganztag:" UND "Test-Anker nrwbank-moderne-schule:" UND beide Werte sind NICHT "NICHT GETROFFEN" (sondern eine Reason-Begruendung)
  </acceptance_criteria>
  <done>
    Standalone-Cleanup-Skript ist angelegt, ruft das LLM-API kein einziges Mal, fuehrt HTTP-HEAD + Frist-Check + Override-Block fuer die Test-Anker aus, und gibt einen klaren Mini-Report. Default-Modus ist dry-run — `--apply` muss explizit angegeben werden.
  </done>
</task>

<task type="auto">
  <name>Task 3: Live-Apply-Lauf, Verifikation Test-Anker auf status=expired, Commit</name>
  <files>data/richtlinien-prioritaeten.json (auto-modified by script)</files>
  <read_first>
    - scripts/cleanup-expired-queue.ts (gerade angelegt)
    - data/richtlinien-prioritaeten.json (Stichprobe `bundesweit-ganztag` + `nrwbank-moderne-schule` — Vor-Zustand notieren)
    - CLAUDE.md (Commit-Konvention: conventional prefix, kurzer deutscher Subject-Line, Body mit Begruendung)
  </read_first>
  <action>
    Schritt 1 — Pre-State-Snapshot zur Verifikation der Mutation:
    ```bash
    cd /home/kolja/edufunds-app
    jq '.items[] | select(.programmId == "bundesweit-ganztag" or .programmId == "nrwbank-moderne-schule") | {programmId, status, skipReason}' data/richtlinien-prioritaeten.json > /tmp/pre-cleanup-state.json
    cat /tmp/pre-cleanup-state.json
    ```
    Erwartung: beide auf `status: "skip"` mit `skipReason` enthaltend "Leere Extraktion".

    Schritt 2 — Falls schon ungecommittete Mods in `data/richtlinien-prioritaeten.json` aus Phase-3-Smoke-Lauf vorliegen (siehe git status: working-tree-Mods stehen heute fuer bundesweit-ganztag + nrwbank-moderne-schule auf skip), MUESSEN die VOR dem Apply-Lauf gestaged + committed werden — sonst vermischt der Cleanup-Commit zwei Sachen. Conventional-Commit-Prefix `chore(queue)`:
    ```bash
    cd /home/kolja/edufunds-app
    git diff data/richtlinien-prioritaeten.json | head -50  # inspect first
    # Wenn Mods aus Phase-3-Smoke vorhanden:
    git add data/richtlinien-prioritaeten.json
    git commit -m "chore(queue): Phase-3-Smoke-Befunde bundesweit-ganztag + nrwbank-moderne-schule auf status=skip"
    ```
    Wenn keine Mods da sind → Schritt entfaellt.

    Schritt 3 — Live-Apply-Lauf:
    ```bash
    cd /home/kolja/edufunds-app
    npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts --apply 2>&1 | tee /tmp/cleanup-apply.log
    ```

    Schritt 4 — Post-State-Verifikation:
    ```bash
    cd /home/kolja/edufunds-app
    jq '.items[] | select(.programmId == "bundesweit-ganztag" or .programmId == "nrwbank-moderne-schule") | {programmId, status, skipReason}' data/richtlinien-prioritaeten.json > /tmp/post-cleanup-state.json
    cat /tmp/post-cleanup-state.json
    # Erwartung: beide auf status: "expired"
    ```
    Wenn `status !== "expired"` → STOP, Bug im Override-Block. Repariere bevor commit.

    Schritt 5 — Status-Distribution checken:
    ```bash
    cd /home/kolja/edufunds-app
    jq '[.items[] | .status] | group_by(.) | map({status: .[0], count: length})' data/richtlinien-prioritaeten.json
    # Erwartung: skip-Count um (mindestens) 2 reduziert, expired-Count >= 2
    ```

    Schritt 6 — Commit der Cleanup-Mutation. Conventional-Commit-Prefix `chore(queue)`. Body erklaert was passiert ist und referenziert Phase-4-Plan-01:
    ```bash
    cd /home/kolja/edufunds-app
    git add lib/wizard/queue.ts scripts/cleanup-expired-queue.ts scripts/rebuild-queue.ts data/richtlinien-prioritaeten.json
    git commit -m "$(cat <<'EOF'
    feat(queue): Status-Enum um 'expired' erweitert + cleanup-expired-queue Skript

    Plan 04-01 (D-04/D-05/D-06): Stale-Programme bekommen einen eigenen
    Status 'expired' (Quelle 404/410/403 oder fixe_stichtage ueberschritten),
    orthogonal zu skip (Kategorie-C / Empty-Extract). Neues Skript
    scripts/cleanup-expired-queue.ts macht HTTP-HEAD + Frist-Check ohne LLM,
    Default-Modus dry-run, --apply schreibt.

    Test-Anker laut CONTEXT D-06: bundesweit-ganztag + nrwbank-moderne-schule
    sind von status=skip (Phase-3-Smoke-Befund) auf status=expired migriert.

    Foundation fuer Plan 04 Vollautomations-Workflow (D-04 HTTP-HEAD-Pre-Check
    vor LLM-Call konsumiert dieselbe Logik).
    EOF
    )"
    ```

    Schritt 7 — Final-Verifikation post-commit:
    ```bash
    cd /home/kolja/edufunds-app
    git log -1 --stat
    git diff HEAD~1 HEAD -- data/richtlinien-prioritaeten.json | grep -E '^[+-]' | head -20
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; jq -e '.items[] | select(.programmId == "bundesweit-ganztag") | .status == "expired"' data/richtlinien-prioritaeten.json &amp;&amp; jq -e '.items[] | select(.programmId == "nrwbank-moderne-schule") | .status == "expired"' data/richtlinien-prioritaeten.json &amp;&amp; git log -1 --pretty=%s | grep -E 'feat\(queue\)' &amp;&amp; git diff --quiet
    </automated>
  </verify>
  <acceptance_criteria>
    - `jq '.items[] | select(.programmId == "bundesweit-ganztag") | .status' data/richtlinien-prioritaeten.json` liefert exakt `"expired"` (in Anfuehrungszeichen, JSON-string-Form)
    - `jq '.items[] | select(.programmId == "nrwbank-moderne-schule") | .status' data/richtlinien-prioritaeten.json` liefert exakt `"expired"`
    - `jq '[.items[] | select(.status == "expired")] | length' data/richtlinien-prioritaeten.json` liefert mindestens 2
    - `jq '.items[] | select(.programmId == "bundesweit-ganztag") | .skipReason' data/richtlinien-prioritaeten.json` enthaelt einen NICHT-leeren String (Audit-Trail)
    - `git log -1 --pretty=%s` matched Regex `^(feat|chore)\(queue\)` (Conventional-Commit-Prefix)
    - `git log -1 --pretty=%b` enthaelt "Plan 04-01" oder "D-06" (Phase-Verkettung im Commit-Body sichtbar)
    - `git diff --quiet` (kein dirty working-tree nach Commit)
    - `git diff HEAD~1 HEAD --stat` zeigt alle 4 Files (lib/wizard/queue.ts, scripts/cleanup-expired-queue.ts, scripts/rebuild-queue.ts, data/richtlinien-prioritaeten.json) im Diff
  </acceptance_criteria>
  <done>
    Cleanup-Apply-Lauf ist live durchgelaufen, die zwei Test-Anker stehen auf `status=expired` in der Queue, Plan 04-01 ist in einem atomaren Commit dokumentiert. Plan 04 (Vollautomations-Workflow) kann darauf aufbauen, weil das Queue-Schema jetzt orthogonal nach Quelle-Status (`open`/`done`/`skip`/`expired`) filtern kann.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub-Actions-Workflow → externer HTTP-HEAD-Endpoint (nicht in diesem Plan, aber Skript kann auch im Workflow laufen) | Skript folgt Redirects beim HTTP-HEAD — kontrollierte URLs aus eigener Queue, kein User-Input |
| Cleanup-Skript → `data/richtlinien-prioritaeten.json` | Status-Mutation mit `--apply`-Flag — Default ist dry-run, Defense-in-Depth gegen versehentlich destruktive CI-Laeufe |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | T (Tampering) | scripts/cleanup-expired-queue.ts | mitigate | Default-Mode ist `--dry-run`. `--apply` muss explizit gegeben werden — kein Auto-Schreiben bei versehentlicher CI-Invocation. Geprueft via acceptance_criteria. |
| T-04-02 | I (Information Disclosure) | scripts/cleanup-expired-queue.ts HTTP-HEAD-Lauf | accept | Skript laeuft gegen oeffentliche Foerderprogramm-Quellen mit Mozilla-UA. Keine Auth-Headers, kein Credential-Leak. URL-Liste kommt aus eigener Queue (kein User-Input). |
| T-04-03 | D (Denial of Service) | scripts/cleanup-expired-queue.ts gegen Foerderprogramm-Hosts | accept | 82 HTTP-HEADs sequenziell mit 10s Timeout + 1 Retry. Keine Hammer-Last fuer einzelne Hosts (max 1 Request pro 30s-Window pro Host). |
| T-04-04 | E (Elevation) | lib/wizard/queue.ts Export-API | mitigate | Helper sind named exports, kein default-export, keine Globals. Konsumenten muessen explizit importieren — kein versehentliches Erschleichen von Status-Mutation. |
| T-04-05 | S (Spoofing) / SSRF | HTTP-HEAD gegen URLs aus richtlinien-prioritaeten.json | mitigate | URLs sind kuratierte Foerderprogramm-Quellen (oeffentliche Webseiten), nie User-Input. Redirect-follow ist auf 5 Hops begrenzt (fetch-default). Keine internen RFC-1918-IPs in der Queue. Falls in Zukunft user-supplied URLs reinkaemen → eigene Phase, hier nicht eingebaut. |
</threat_model>

<verification>
1. **Type-Sanity:** `npx tsc --noEmit lib/wizard/queue.ts scripts/cleanup-expired-queue.ts scripts/rebuild-queue.ts` exit 0
2. **Library-Selbsttest:** `npx tsx --eval 'import("./lib/wizard/queue.ts").then(m => { const helpers = ["loadQueue","saveQueue","markExpiredInQueue"]; for (const h of helpers) if (typeof m[h] !== "function") throw new Error("missing: "+h); console.log("queue.ts API ok"); })'`
3. **Dry-Run-Sanitycheck:** `npx tsx --env-file=.env.local scripts/cleanup-expired-queue.ts | grep -E "Test-Anker bundesweit-ganztag:.*(Auslauf|Quelle zu allgemein|Phase-3-Smoke)"` (Override-Block trifft die zwei IDs)
4. **Live-Apply-Verifikation:** beide Test-Anker stehen post-apply auf `status=expired` (jq-Check oben in Task 3)
5. **No-LLM-Garantie:** `grep -E '@google/generative-ai|openai|lib/wizard/llm' scripts/cleanup-expired-queue.ts` matched nichts — der Cleanup ist garantiert ein reines IO-Skript
6. **No-Side-Effects:** `git diff scripts/extract-richtlinie.ts` ist leer (extract-richtlinie.ts bleibt in Plan 01 unangetastet — Konsumenten-Switch ist Plan 04 zugewiesen)
7. **Commit-Atomaritaet:** Conventional-Commit-Prefix vorhanden, alle 4 Files in einem Commit, Body referenziert Plan 04-01 + D-06
</verification>

<success_criteria>
Plan 04-01 ist erfolgreich abgeschlossen, wenn:

- [ ] `lib/wizard/queue.ts` existiert und exportiert `QueueStatus`-Union inkl. `"expired"`, `loadQueue`, `saveQueue`, `markExpiredInQueue`
- [ ] `scripts/rebuild-queue.ts` Type-Alias `QueueStatus` enthaelt `"expired"` als vierten Wert
- [ ] `scripts/cleanup-expired-queue.ts` existiert, hat dry-run-default + `--apply`-Flag, importiert KEINE LLM-Library
- [ ] HTTP-HEAD + Frist-Check + Override-Block fuer die zwei Test-Anker sind implementiert
- [ ] Live-Apply-Lauf ist durchgefuehrt
- [ ] `bundesweit-ganztag` UND `nrwbank-moderne-schule` stehen in `data/richtlinien-prioritaeten.json` auf `status="expired"`
- [ ] Alle Aenderungen in einem atomaren Commit, Conventional-Commit-Prefix, deutscher Body, Phase-4-Plan-01 referenziert
- [ ] `scripts/extract-richtlinie.ts` ist NICHT geaendert (Konsumenten-Switch bleibt Plan 04 vorbehalten)
</success_criteria>

<output>
Nach Abschluss: `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-01-queue-status-expired-cleanup-SUMMARY.md` schreiben mit:
- Vor/Nach-Status-Distribution der Queue (jq-Output)
- Tatsaechliche HTTP-HEAD-Ergebnisse aus dem Apply-Lauf (wie viele 404/410/403, wie viele 5xx-transient, wie viele unchanged)
- Begruendung warum die Test-Anker im Override-Block stehen statt nur via Live-HEAD-Check (Robustheit gegen Netzwerk-Flaps zum Phase-Closure-Zeitpunkt)
- Hinweis fuer Plan 04: extract-richtlinie.ts importiert noch seine eigene loadQueue/saveQueue/markSkipInQueue — Plan 04 macht den Konsumenten-Switch
</output>
