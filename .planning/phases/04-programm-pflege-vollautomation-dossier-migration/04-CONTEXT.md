# Phase 4: Programm-Pflege Vollautomation + Dossier-Migration - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Aus dem Phase-3-Foundation-Stack (LLM-Wrapper, 4-Felder-Schema, Strict-Validator) wird ein wartungsarmer Auto-Pflegeprozess: Ein **Single-Workflow** scannt die 3 konfigurierten Quellen, extrahiert für jedes neu gefundene Programm ein Dossier nach dem erweiterten Schema, berechnet Queue-Score und persistiert beides in einem PR pro Programm (FETCH-02). Parallel werden die **11 Legacy-Dossiers** in `data/richtlinien/` per Targeted-Fill um die vier Phase-3-Felder ergänzt (FETCH-04), sodass Phase 5 Pipeline-Tuning auf vollständigen Daten arbeitet.

**Was Phase 4 NICHT macht:**
- Pipeline-Tuning, das die neuen Felder konsumiert → Phase 5 (WIZ-01..04)
- Live-Workflow-Dispatch-Smoke (D-09 #1+#2) bleibt deferred bis main-Merge → siehe `.planning/todos/pending/live-workflow-smoke-deferred.md`
- Stripe / Production-Deployment → Phase 6/7
- Telegram-Notifications für Bot-Failures (Scope-Creep, Token-Setup vermeiden)

</domain>

<decisions>
## Implementation Decisions

### Pipeline-Topologie

- **D-01:** Ein einziger Cron-Workflow `weekly-auto-pflege.yml` ersetzt funktional beide alten Files (`weekly-program-scan.yml` + `weekly-dossier-extraction.yml`). Er scannt die Quellen aus `data/program-sources.json`, extrahiert pro gefundenem Programm direkt ein Dossier, berechnet Queue-Score und schreibt einen PR. Kein Zwischenschritt mit `data/program-candidates.json` — die Datei entfällt komplett (in-memory list im Workflow-Run).
- **D-02:** **Sequenziell**, **1 PR pro Programm**: Workflow läuft pro Programm `Extract → Validate → PR `dossier-bot/<id>` mit Dossier + Queue-Patch`. N PRs bei N neuen Programmen. Atomarer Rollback pro Programm via PR-Revert, granulares Review. Skipped/expired Programme schreiben keinen PR, nur eine Zeile in der Workflow-Summary.
- **D-03:** Die zwei alten Workflow-Files werden **gelöscht** (nicht umbenannt, nicht als Backup-Pfad behalten). `extract-richtlinie.ts` bleibt als lokales CLI-Tool für manuelle Re-Runs (`--next`, `<id> <urls...>`), wird vom neuen Workflow als Library-Function aufgerufen. Cron-Schedule des neuen Workflows: Montag 04:00 UTC (analog dem alten dossier-extraction).

### Stale-Queue-Strategie

- **D-04:** **HTTP-HEAD + Frist-Datum-Check vor jedem LLM-Call.** Im `--next`-Picker UND im neuen Vollautomations-Workflow vor dem Extract-Aufruf: (a) HTTP-HEAD auf `infoLink` — bei 404/410/403 → `status=expired`, kein LLM-Call. (b) Wenn Dossier bereits existiert UND `fristLogik.stichtage[]` vorhanden UND alle Stichtage in der Vergangenheit liegen UND `jaehrlich_wiederkehrend` ist nicht true → `status=expired`. 5xx-Antworten lösen 1 Retry aus, dann skip-mit-Grund="quelle-temporär-down" (kein expired, kein LLM verbrannt).
- **D-05:** **Neuer Queue-Status `expired`** als vierter Wert neben `open` / `done` / `skip`. `--next`-Picker ignoriert sowohl `skip` als auch `expired`. Audit-Trail: `expired` zeigt explizit warum ein Programm raus ist (Quelle 404 oder Frist überschritten), ohne den `skip`-Bucket für Kategorie-C / unbedienbar-Begründungen zu verschmutzen.
- **D-06:** **Retroaktive Queue-Migration** als einmaliger Lauf in Phase 4. `scripts/cleanup-expired-queue.ts` iteriert über alle 82 Queue-Einträge, wendet die HTTP-HEAD + Frist-Logik aus D-04 an, schreibt Status-Updates und produziert einen Mini-Report (X expired, Y errors, Z unchanged). **Test-Anker (aus Phase-3-D-09 #3 Befund):** `bundesweit-ganztag` und `nrwbank-moderne-schule` müssen nach dem Cleanup-Lauf auf `status=expired` stehen.

### Legacy-Dossier-Migration

- **D-07:** **Targeted-Fill** statt komplettes LLM-Re-Extract. Neues Skript `scripts/migrate-legacy-dossier.ts <id>` lädt das Bestands-Dossier, baut einen schlanken LLM-Prompt mit Bestands-Daten als Anti-Halluzinations-Kontext, extrahiert NUR die vier fehlenden Felder (`bestPractices`, `rejectGruende`, `vorbildFormulierungen`, `fristLogik`), merged in das Bestands-Dossier, validiert strict (Strict-Schema + FK-Check für `vorbildFormulierungen[].abschnitt_id`), schreibt zurück. **Bestands-Felder bleiben byte-identisch.** Kosten: ~11 × 0.04¢ = ~0.5¢.
- **D-08:** **1 PR `dossier-migration/phase-04` mit 11 Commits** (1 pro Dossier in alphabetischer Reihenfolge der Programm-IDs). Atomarer Rollback pro Dossier via `git revert <hash>` im PR möglich. Ein gemeinsames Review-Fenster, mappt sauber auf Phase-4-Closure. KEINE 11 separaten PRs (Overhead) und KEIN 1-Commit-Sammelfile (kein granularer Rollback).
- **D-09:** **Sample-First-Pattern** mit 2 strategisch unterschiedlichen Dossiers vor Vollmigration:
  1. `bmbf-digitalpakt-2` (Bundes-Bigcase, 87 Programme erwarten ähnliche Struktur)
  2. `ferry-porsche-challenge-2025` (Stiftungs-Smallcase, repräsentativ für die FP-Reihe)

  Kolja reviewed den PR mit nur diesen 2 Commits. Bei Qualitäts-Pass wird das Skript für die restlichen 9 Dossiers fortgesetzt, die weiteren 9 Commits werden auf denselben PR-Branch gepushed. Bei Quality-Fail → Re-Prompting der Migrations-Stage, kein Verlust von 11 LLM-Calls.

### Failure-Handling im Vollautomations-Workflow

- **D-10:** **GitHub-Issue mit Label `bot-failure`** als Notification-Kanal. Bei Workflow-Failure (any non-zero exit OR ≥1 Programm im try/catch-Catch) erstellt der Workflow ein Issue `🤖 dossier-bot failure <datum>` im Repo `Aitema-gmbh/edufunds` mit Label `bot-failure`. Bei nächstem grünem Cron-Run wird das offene Issue auto-closed (gh CLI-Aufruf im Workflow). Kein Telegram (Token-Setup ist Scope-Creep, Cron-Failures sind Latenz-tolerant).
- **D-11:** **Continue-on-Error pro Programm.** Jedes Programm läuft im eigenen try/catch im Workflow-Step. Bei Failure: Programm überspringen, Error in Failure-Liste sammeln, nächstes Programm starten. Workflow endet immer im Erfolgs-Pfad, schreibt am Ende EIN Issue mit Liste aller übersprungenen Programme + ihrer Error-Klassen. Successful-Dossier-PRs werden alle erstellt — kein Komplett-Verlust einer Woche wegen 1 LLM-Hiccup.
- **D-12:** **Strukturiertes Issue + Logs als GitHub-Actions-Artifact.** Issue-Body enthält: Programm-IDs, Stage (`scan` / `http-head` / `extract` / `validate`), Error-Klasse, kurze Zusammenfassung pro Programm. Vollständige Logs (LLM-Prompt, LLM-Response, Stack-Trace) gehen in einen GitHub-Actions-Artifact mit 30-Tage-Retention. Issue bleibt scanbar, Debug-Daten zugänglich on-demand. **NO Secret-Leakage:** API-Keys werden vor Log-Persistierung redacted (analog scrubbing-Pattern aus llm.ts wenn vorhanden, sonst neu).

### Claude's Discretion

- Konkretes `cleanup-expired-queue.ts`-Skript-Layout (Tool-of-choice für HTTP-HEAD: `node:http` / `node:https` ist gut genug, kein `axios`/`got`)
- HTTP-HEAD-Timeout (Default 10s reicht)
- 5xx-Retry-Backoff (1 Retry mit 2s Pause)
- Migrations-Prompt-Wording für `migrate-legacy-dossier.ts` — Anti-Halluzinations-Block aus `extract-richtlinie.ts` SYSTEM_PROMPT als Basis, mit dem Zusatz „Bestands-Daten in Kontext-Block — NICHT widersprechen, NICHT überschreiben"
- GitHub-Issue-Title-Format (`🤖 dossier-bot failure 2026-MM-DD`)
- Workflow-Job-Namen, Step-Namen, Output-Format
- Queue-Score-Berechnung für neue Programme im Workflow: bestehende Formel aus `scripts/rebuild-queue.ts` (log10(maxEur)\*10 + BLs.length\*2 + typBonus + min(kategorien,5)\*2 + min(schulformen,5)\*2) wiederverwenden
- Ob `version`-Feld im Dossier auf `2026-05-19` o.ä. gebumpt wird oder unverändert bleibt

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Scope + Requirements

- `.planning/ROADMAP.md` §`Phase 4: Programm-Pflege Vollautomation + Dossier-Migration` — 4 Success-Criteria, Goal-Statement, FETCH-02 + FETCH-04 als Pflicht-Requirements
- `.planning/REQUIREMENTS.md` §FETCH-02 (Vollautomatischer Programm-Pflegeprozess) + §FETCH-04 (11 Dossiers migrieren) — Acceptance-Wording

### Foundation aus Phase 3 (LOCKED)

- `.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md` — Phase-3-Decisions die hier weiter gelten: `deepseek-chat`-Default (NICHT v4-flash/-pro), Strict + `--legacy`-Validator-Modi, FK-Integrität für `vorbildFormulierungen[].abschnitt_id`, Schema mit 4 optionalen Top-Level-Feldern.
- `lib/wizard/richtlinien-schema.ts` — Strict-Schema-Definition incl. der 4 Phase-3-Felder, plus `RichtlinieLegacySchema` für Migration-Übergang
- `lib/wizard/richtlinien-validator.ts` — `RichtlinieStrictSchema.safeParse` + `validateForeignKeys` als Pre-Persist-Gate (Phase-3-Pattern, hier wiederverwenden)
- `lib/wizard/llm.ts` — Single-Source-of-Truth Provider-Wrapper, `MODEL_PIPELINE` für Migration- + Extract-Calls
- `scripts/extract-richtlinie.ts` — wird vom neuen Workflow als Library-Function aufgerufen UND bleibt als CLI für manuelle Re-Runs. SYSTEM_PROMPT mit Anti-Halluzinations-Block als Vorbild für `migrate-legacy-dossier.ts`
- `scripts/scan-new-programs.ts` — Scanner-Logik wird in neuen Workflow integriert; das Standalone-Skript bleibt für manuelle Source-Tests
- `scripts/validate-richtlinien.ts` — Strict + `--legacy`-Modus aus Phase 3; nach FETCH-04-Migration sollte Strict gegen alle 11 Dossiers grün sein

### Cron-Workflow-Pattern

- `.github/workflows/weekly-dossier-extraction.yml` — Phase-3-Workflow mit `peter-evans/create-pull-request@v7`, Branch-Pattern `dossier-bot/<id>`, Labels `richtlinien-bot` + `auto-generated`, Pre-Flight-Check für `DEEPSEEK_API_KEY`. Pattern wird übernommen für neuen Workflow.
- `.github/workflows/weekly-program-scan.yml` — wird durch neuen Workflow ersetzt; Phase-3-Reviewer-Checkliste-Konvention bleibt

### Daten-Stand (Read-Reference)

- `data/richtlinien/*.json` — die 11 Legacy-Dossiers (Targeted-Fill-Target). Aktuelle IDs: aktion-mensch-schulkooperation, berlin-startchancen, bmbf-digitalpakt-2, bosch-schulpreis, ensam-bmz, erasmus-schule-2026, erasmus-schulentwicklung, ferry-porsche-challenge-2025, ferry-porsche-challenge, klimalab-2026, kultur-macht-stark
- `data/richtlinien-prioritaeten.json` — Queue mit 82 Einträgen (11 done, 3 skip, 68 open). Wird in Phase 4 erweitert um `status=expired` und retroaktiv migriert. Working-Tree-Mods aus Phase-3-Smoke (`bundesweit-ganztag` + `nrwbank-moderne-schule` auf skip) sind ungecommitted und fließen als Test-Anker in D-06 ein.
- `data/program-sources.json` — 3 Scanner-Quellen (bildungsserver, foerderdatenbank, begabungslotse). Schema unverändert, Vollautomations-Workflow konsumiert sie.

### Phase-3-Deferrals (aus Phase 4 zu adressieren oder explizit verschoben)

- `.planning/todos/pending/queue-pflege-stale-programme.md` — Befund + Akzeptanz-Kriterien, die in D-04 / D-05 / D-06 abgehakt werden. Test-Anker `bundesweit-ganztag` + `nrwbank-moderne-schule` aus diesem Todo.
- `.planning/todos/pending/live-workflow-smoke-deferred.md` — bleibt Phase 4 deferred; wird beim ersten main-Merge nachgeholt (NICHT Teil dieser Phase).

### Projekt-Konventionen

- `CLAUDE.md` (Projekt-Root) — Sprache deutsch in Docs/Commits/Logs; Encoding-Regel ASCII in JSON-Datenfeldern (Feldnamen), Umlaute in Werten erlaubt; Branch-Flow `feature/* → staging → main`; Conventional-Commit-Präfixe.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `lib/wizard/llm.ts::generateJson<T>` — Pflicht-Aufruf für alle LLM-Calls in `cleanup-expired-queue.ts` (falls dort LLM nötig wird — eher nicht) und in `migrate-legacy-dossier.ts` (Targeted-Fill-LLM-Call). Single Source of Truth aus Phase 3.
- `lib/wizard/richtlinien-validator.ts` — `RichtlinieStrictSchema` + `validateForeignKeys`. Beide neuen Skripte (Migration + Vollautomations-Workflow) müssen diesen Validator als Pre-Persist-Gate aufrufen, analog zum Phase-3-Pattern in `extract-richtlinie.ts`.
- `scripts/extract-richtlinie.ts::markSkipInQueue` (in Phase-3-Code-Review WR-01 von `markBlockedInQueue` umbenannt) — wird in `cleanup-expired-queue.ts` als Analog-Pattern für `markExpiredInQueue` wiederverwendet.
- `scripts/rebuild-queue.ts` — Score-Formel-Builder. Neuer Workflow ruft dieselbe Formel auf, um den Queue-Score für neu eingefügte Programme zu berechnen.
- `scripts/extract-richtlinie.ts::SYSTEM_PROMPT` — Anti-Halluzinations-Block aus Phase 3. Als Vorbild für den `migrate-legacy-dossier.ts`-Prompt nehmen (gleicher Stil, gleiche Verbote).

### Established Patterns

- **PR-Pattern:** `peter-evans/create-pull-request@v7`, Branch-Pattern `dossier-bot/<id>`, Labels `richtlinien-bot` + `auto-generated`, `delete-branch: true`. Phase-3-D-11.
- **GitHub-Workflow-Härtung:** `set -euo pipefail`, Secret-Pre-Flight-Check, keine direkte Nutzer-Eingabe-Interpolation in Shell. Phase-3-Review hat das bestätigt.
- **Validator-Pre-Persist-Gate:** `safeParse` + `validateForeignKeys` vor `fs.writeFile`, harter `process.exit(1)` bei Verletzung. Pflicht-Muster aus Phase 3.
- **Empty-Skip-Schutz:** Wenn LLM keine Substanz findet → `status=skip` mit LLM-Begründung. Wird ab Phase 4 ergänzt um `status=expired` (D-05) als orthogonalen Filter.
- **CLI-Tools nutzen `npx tsx --env-file=.env.local`** für lokale Smokes (Phase-3-Konvention).

### Integration Points

- **Neuer Workflow `.github/workflows/weekly-auto-pflege.yml`** — Single-Workflow-Entry für FETCH-02. Ruft intern `scripts/scan-new-programs.ts` als Library + `scripts/extract-richtlinie.ts` als Library + neue Queue-Score-Berechnung + HTTP-HEAD-Pre-Check + GitHub-Issue-Creation-Step.
- **Neues Skript `scripts/cleanup-expired-queue.ts`** — Einmal-Lauf in Phase 4, läuft danach auch wöchentlich oder bleibt manuell-trigger (Discretion). Nutzt HTTP-HEAD + Frist-Logik aus D-04.
- **Neues Skript `scripts/migrate-legacy-dossier.ts <id>`** — Targeted-Fill-Skript für FETCH-04. Kann auch standalone aufgerufen werden, falls künftig ein einzelnes Dossier nachgepflegt werden muss.
- **Erweiterung `lib/wizard/queue.ts`** (oder Inline in `cleanup-expired-queue.ts`) — Status-Enum erweitern um `'expired'`, `markExpiredInQueue` analog zu `markSkipInQueue`.
- **`data/richtlinien-prioritaeten.json` Schema-Update** — Status-Werte: `'open' | 'done' | 'skip' | 'expired'`. Migrations-Skript schreibt diese Datei.

</code_context>

<specifics>
## Specific Ideas

- Test-Anker für D-06 Stale-Migration: nach Cleanup-Lauf müssen `bundesweit-ganztag` und `nrwbank-moderne-schule` auf `status=expired` stehen (NICHT mehr `skip` wie heute durch Empty-Skip-Schutz fälschlich gesetzt).
- Sample-First-Pattern wählt `bmbf-digitalpakt-2` + `ferry-porsche-challenge-2025` als die beiden Discovery-Sample-Dossiers — Bundes-Bigcase + Stiftungs-Smallcase, decken den Stil-Range der Migration ab.
- LLM-Calls für Targeted-Fill sollen den Bestands-Daten-Kontext als Anti-Halluzinations-Anker nutzen — d.h. das Bestands-Dossier wird im Prompt mitgegeben mit der expliziten Anweisung „Diese Werte NICHT widersprechen, NICHT überschreiben, nur die vier fehlenden Felder ergänzen".

</specifics>

<deferred>
## Deferred Ideas

- **Telegram-Notification für Bot-Failures** — Bot-Token-Setup im GitHub-Runner ist Scope-Creep, GitHub-Issues sind Latenz-tolerant genug. Wenn Cron-Failures kritisch werden, kann das in einer eigenen Phase ergänzt werden.
- **Workflow-Retry-Logic für Rate-Limited-LLM-Calls** — Wenn DeepSeek-Rate-Limits in der Wildnis ein Thema werden, kann ein separater Retry-Layer ergänzt werden. Aktuell ist Continue-on-Error pro Programm robust genug.
- **Pflichtfeld-Validierung im Scanner** (z.B. infoLink muss URL sein, Quelle muss in `program-sources.json` referenziert sein) — gehört in Scanner-Validation-Logik, nicht in den `--next`-Picker.
- **Auto-Recovery-PRs** wenn ein Bot-Failure-Issue offen ist und der Workflow grün läuft — Phase 4 macht nur Auto-Close, keine Bot-Heilungs-PRs.
- **`version`-Feld-Bump im Dossier-Schema** auf `2026-05-19` o.ä. — Claude's Discretion, nicht kritisch.
- **Live-Workflow-Dispatch-Smoke** (D-09 #1+#2 aus Phase 3) — bleibt deferred bis main-Merge, siehe `.planning/todos/pending/live-workflow-smoke-deferred.md`.

</deferred>

---

*Phase: 04-programm-pflege-vollautomation-dossier-migration*
*Context gathered: 2026-05-19*
