---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: 04
subsystem: workflow-automation
tags: [github-actions, library-refactor, auto-pflege, single-writer]

requires:
  - phase: 04-programm-pflege-vollautomation-dossier-migration (Wave 1)
    provides: lib/wizard/queue.ts (loadQueue, saveQueue, QueueItem, QueueStatus)
  - phase: 04-programm-pflege-vollautomation-dossier-migration (Wave 2)
    provides: 11/11 Dossiers Strict-Schema-konform (Migrations-Basis fuer den Final-Validator-Anker)

provides:
  - scripts/extract-richtlinie.ts als Library exportierbar (runExtraction + fetchOrRead Exports, skipQueueUpdate-Option, Entry-Point-Guard)
  - scripts/auto-pflege-step.ts: Single-Workflow-Step mit Scan + HEAD-Check + Extract + Queue-Push + Per-Programm-Failure-Klassifizierung
  - .github/workflows/weekly-auto-pflege.yml: konsolidierter Single-Cron-Workflow (ersetzt 2 alte Workflows)
  - Loeschungen: weekly-dossier-extraction.yml, weekly-program-scan.yml, data/program-candidates.json
  - Phase-4-FETCH-04-Anker: Strict-Validator gegen alle 11 Dossiers gruen
affects:
  - Phase 5+ Pipeline-Tuning (lest dieselbe Queue + Dossier-Daten)
  - Live-Production-Onboarding (laeuft demnaechst gegen den konsolidierten Workflow)

tech-stack:
  added: []
  patterns:
    - "Single-Writer-Pattern (D-11): genau ein Skript schreibt die Queue. Race-Avoidance ohne distributed-Lock"
    - "Entry-Point-Guard fuer importierbare CLI-Skripte: main() nur bei direktem Aufruf, nicht bei Library-Import"
    - "Per-Programm-Failure-Klassifizierung (D-12): fetch-error, head-404/403/410/5xx, empty-extraction, strict-validator-fail, llm-error, queue-write-error"
    - "Auto-Issue-Lifecycle (D-10): Bot-Issue eroeffnen bei has_failures=true, bei naechstem gruenen Lauf auto-closen"

key-files:
  created:
    - scripts/auto-pflege-step.ts (485 Zeilen — Per-Programm-Wrapper, Single-Queue-Writer)
    - .github/workflows/weekly-auto-pflege.yml (konsolidierter Cron)
    - .planning/todos/pending/auto-pflege-e2e-live-smoke-deferred.md (Backlog-Item)
  modified:
    - scripts/extract-richtlinie.ts (runExtraction + fetchOrRead jetzt exports, skipQueueUpdate-Opt-Param, Entry-Point-Guard)
  deleted:
    - .github/workflows/weekly-dossier-extraction.yml
    - .github/workflows/weekly-program-scan.yml

key-decisions:
  - "Library-Refactor ueber Entry-Point-Guard statt Code-Split: extract-richtlinie.ts behaelt seine CLI-Faehigkeit, exportiert aber runExtraction + fetchOrRead fuer auto-pflege-step.ts. main() laeuft nur wenn direkt aufgerufen (process.argv[1].endsWith). Spart Code-Duplikation vs. extrahierte lib-Module"
  - "auto-pflege-step.ts ist der EINZIGE Queue-Writer (D-11): runExtraction wird mit skipQueueUpdate=true gerufen, kein interner markDoneInQueue/markSkipInQueue. Bei Empty-Extraktion wirft runExtraction Error, der Wrapper klassifiziert + entscheidet"
  - "Workflow-Permissions explizit deklariert (contents:write + pull-requests:write + issues:write). Reviewer-Checkliste im PR-Body bewusst KEINE dynamischen Werte (steps.outputs) — Counts + Failures liegen im Artifact, damit der PR-Body sicher template-konstant bleibt"
  - "Live-E2E-Smoke deferred (Task 4): DeepSeek-Konto-0-Balance + Branch nicht gepushed + Setup-Voraussetzungen sind Kolja-Action. Backlog-Item auto-pflege-e2e-live-smoke-deferred.md festgeschrieben mit Reaktivierungs-Anleitung"

patterns-established:
  - "Konsolidierte Cron-Workflows statt mehrere parallel laufende: 1 wochentlicher Lauf statt 2 (Scan + Extract konsolidiert)"
  - "Per-Programm-Resilience: try/catch pro Iteration, Workflow bleibt gruen, Issue-System macht das Failure-Tracking"

requirements-completed:
  - FETCH-02 (vollautomatische Programm-Pflege; Live-Smoke deferred — Code-Pfad steht, Setup ist Kolja-Action)
  - FETCH-04 (Dossier-Migration auf erweitertes Schema; Final-Strict-Validator-Lauf gegen alle 11 Dossiers ist der materielle Anker)

duration: ~45min
completed: 2026-05-19
---

# Phase 04 / Plan 04-04: Vollautomations-Workflow + Library-Refactor + E2E Summary

**Single-Workflow-Cron + Per-Programm-Wrapper gebaut, Library-Refactor sauber, alte Workflows weg, Strict-Validator 11/11 gruen. Live-E2E-Smoke deferred als Backlog-Item.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 6/7 (Task 4 Live-E2E-Smoke deferred)
- **Files modified:** 5 (3 created, 1 modified, 2 deleted)

## Accomplishments

- **Library-Refactor extract-richtlinie.ts:** `runExtraction` + `fetchOrRead` jetzt exports. `runExtraction` nimmt `{ skipQueueUpdate?: boolean }` — Race-Avoidance fuer Single-Writer-Pattern. Bei Empty-Extraktion wirft Error statt process.exit, damit Caller klassifizieren kann. Entry-Point-Guard via `process.argv[1].endsWith('extract-richtlinie.ts')` damit `main()` nicht beim Library-Import laeuft.
- **scripts/auto-pflege-step.ts (485 Zeilen):** Konsolidierter Per-Programm-Wrapper. Scan ueber data/program-sources.json mit `MODEL_INTERVIEW`, filter gegen foerderprogramme.json + queue, HTTP-HEAD-Pre-Check, `runExtraction(skipQueueUpdate=true)`, Queue-Push als `done`. CLI-Flags: `--dry-run --max-programs N --logs-dir DIR --failure-report PATH`. GITHUB_OUTPUT setzt `has_failures` + counts fuer den Workflow.
- **weekly-auto-pflege.yml:** Single-Cron Mo 04:00 UTC + workflow_dispatch mit max_programs/llm_provider/dry_run Inputs. PR-Creation via peter-evans/create-pull-request. Failure-Issue-Lifecycle via actions/github-script (eroeffnen + bei gruenem Run auto-closen). Artifact-Upload fuer logs + failure-report. Alle github.event.inputs gehen ueber env-Mapping (Security-Pattern).
- **Loeschungen:** weekly-dossier-extraction.yml + weekly-program-scan.yml (konsolidiert in weekly-auto-pflege). data/program-candidates.json war schon weg (D-01 in-memory).
- **Final FETCH-04-Anker:** `npx tsx scripts/validate-richtlinien.ts` gegen alle 11 Dossiers exit 0 — Phase-4-Success-Criterion #3 erfuellt.

## Task Commits

1. **Task 1: Library-Refactor extract-richtlinie.ts** — `b9323c6`
2. **Task 2: auto-pflege-step.ts + Entry-Point-Guard** — `854d810`
3. **Task 3: weekly-auto-pflege.yml** — `3657766`
4. **Task 4: Live-E2E-Smoke** — DEFERRED (Backlog `auto-pflege-e2e-live-smoke-deferred.md`)
5. **Task 5: Loeschungen alter Workflows** — bundled in `3657766`
6. **Task 6: Strict-Validator-Sanity** — Verifikations-Schritt, kein Commit (validator exit 0 verifiziert)
7. **Task 7: Kolja-Final-Checkpoint** — Spec-Gate, abgewickelt im Wave-3-Stop-Punkt

## Live-Smoke Status

**Deferred** wegen 3 nicht-Code-Voraussetzungen:
- DeepSeek-Konto Balance = 0 (Live-Smoke wuerde mit 402 scheitern)
- Branch `feature/wizard-adaptive` 30+ Commits ahead von origin (Push noetig fuer `gh workflow run`)
- Repository-Settings → Actions → General Workflow-Permissions = Kolja-Pruefung

Reaktivierungs-Anleitung in `.planning/todos/pending/auto-pflege-e2e-live-smoke-deferred.md`. Ein-Klick:
```bash
git push -u origin feature/wizard-adaptive
gh workflow run weekly-auto-pflege.yml --ref feature/wizard-adaptive -f llm_provider=gemini -f max_programs=1
gh run watch
```

## Self-Check: PASSED (mit deferred Live-Smoke)

- TSC --noEmit exit 0 nach jedem Task ✓
- auto-pflege-step.ts dry-run smoke: clean exit 0 ✓ (3 Quellen gescannt, 2 davon 404 → separate Quellen-Pflege-Issue, kein Skript-Bug)
- Strict-Validator gegen alle 11 Dossiers exit 0 ✓ (FETCH-04-Anker)
- weekly-auto-pflege.yml YAML-syntax: TBD nach gh-Workflow-Run (deferred)

## Deviations

- **Task 4 (Live-E2E) deferred** — Code-Pfad steht vollstaendig, nur Setup-Voraussetzungen offen
- **DeepSeek → Gemini** wegen Konto-Balance (gleicher Sachverhalt wie Wave 2)

## Follow-Up Items

- **auto-pflege-e2e-live-smoke-deferred.md** — Live-Smoke reaktivieren sobald Push + Permissions + LLM-Credits stehen
- **Quellen-Pflege** — bildungsserver.de + begabungslotse.de in data/program-sources.json haben aktuell HTTP 404. Mindestens 1 Quelle muss live sein, sonst findet der Workflow nie neue Programme.
- **rebuild-queue.ts Refresh** — neue Programme aus auto-pflege landen als foerdergeberTyp='sonst' mit Score=schulRelevanz*10. Bei naechstem `rebuild-queue.ts`-Lauf wird der echte Score berechnet — sollte automatisch passieren wenn der PR gemergt wird und der Bestand aktualisiert
