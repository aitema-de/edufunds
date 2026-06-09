---
title: Live-Workflow-Smoke (D-09 #1 + #2) deferred bis Phase 7 Pre-Live-UAT
created: 2026-05-06
source: Phase 03 D-09 Checkpoint (Workflow-Files nicht auf main → workflow_dispatch nicht triggerbar)
priority: medium
related_phase_candidate: 07 (Live-UAT) ODER beim ersten PR-Merge nach main
related_requirements: [FETCH-01 Provider-Migration]
---

# Live-Workflow-Dispatch nachholen sobald Branch auf main gemerged ist

## Befund (Phase 03 D-09 Checkpoint 2026-05-06)

GitHub-Regel: `workflow_dispatch`-Workflows sind in der Actions-UI nur sichtbar und triggerbar, wenn die Workflow-File auf dem **default branch** (hier: `origin/main`) existiert.

Die zwei in Plan 03-03 erweiterten Workflow-Files
(`weekly-dossier-extraction.yml`, `weekly-program-scan.yml`)
liegen aktuell ausschließlich auf `feature/wizard-adaptive`. In der GitHub-Actions-Sidebar des Repos `Aitema-gmbh/edufunds` werden sie deshalb nicht angezeigt — Kolja kann den Dispatch-Button nicht klicken.

## Ersatz-Verifikation in Phase 03

D-09 #1 (Dossier-Workflow Live-Run) und D-09 #2 (Scanner-Workflow Live-Run) wurden in Phase 03 als verifiziert eingestuft auf Basis von:

- **Static-Greppable-Acceptance** in Plan 03-03 (alle 4 Reviewer-Checkpoints, `LLM_PROVIDER`-Input, `DEEPSEEK_API_KEY`-Pflicht-Block, GEMINI-Fallback) — Suiten grün
- **YAML-Syntax-Validierung** beider Workflows
- **Branch-Pattern + Labels + Cron-Schedules** unverändert verifiziert (Diff-Vergleich)
- **Cron-Skript-Migration** (die Skripte, die der Workflow aufruft) durch D-09 #3 zwei Live-DeepSeek-Calls + Wave-2-Tests bewiesen

Phase 03 ist also nicht "halb verifiziert" — die Migration ist substantiell sauber. Es fehlt nur der End-to-End Live-Dispatch.

## Akzeptanz-Kriterium für Nachhol-Smoke

Sobald die Branch nach `main` gemerged ist (egal ob als Phase-3-PR-only oder als Phase-7-Sammel-PR):

1. **GitHub UI →** https://github.com/Aitema-gmbh/edufunds/actions
2. **DEEPSEEK_API_KEY** als Repo-Secret prüfen / setzen.
3. **D-09 #1:** "Weekly Richtlinien-Dossier Extraktion" → "Run workflow" → `program_id`: `kmk-pad-foerderung` (oder ein anderes Programm mit konkretem infoLink) → `llm_provider`: `deepseek` → Run starten.
   - Erwartet: Workflow grün + PR `dossier-bot/<id>` mit 4 neuen Reviewer-Checkpoints + JSON-Diff zeigt 4 neue Top-Level-Felder.
4. **D-09 #2:** "Weekly Programm-Scan" → "Run workflow" → `llm_provider`: `deepseek`.
   - Erwartet: Workflow grün. Leerer Run ("Keine neuen Kandidaten") = OK.

Bei Fehler: ggf. Anti-Halluzinations-Block in `extract-richtlinie.ts` SYSTEM_PROMPT nachschärfen, oder Datenqualität in `data/richtlinien-prioritaeten.json` aufräumen (siehe `queue-pflege-stale-programme.md`).

## Rahmen

Nicht-blockierend. Der einzige Mehrwert eines Live-Smokes wäre die Verifikation des GitHub-Side-Permissions-Setup (`contents: write`, `pull-requests: write`) und der DeepSeek-Repo-Secret-Konfiguration. Beides ist niedrig-Risiko und bei Bedarf im PR-Merge-Fenster nachholbar.
