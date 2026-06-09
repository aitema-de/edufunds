---
created: 2026-05-19
source: plan-04-04 Task 4 (Live-E2E-Smoke deferred bei Wave-3-Ausfuehrung)
priority: medium
estimated_minutes: 30
blocks: full FETCH-02 closure (Phase 4 Success-Criterion #4 partial)
---

# TODO: Live-E2E-Smoke fuer weekly-auto-pflege.yml

## Was zu tun ist

`gh workflow run weekly-auto-pflege.yml` gegen den `feature/wizard-adaptive`-Branch
ausloesen, einmal mit `dry_run=true` (Scan-Smoke), einmal mit `dry_run=false`
(echter Lauf gegen 1 neues Programm).

Pruefen:
1. Workflow-Run laeuft gruen durch (per-Programm-try/catch funktioniert)
2. Wenn neue Programme gefunden + extrahiert: PR mit Label `richtlinien-bot` entsteht
3. Wenn Failures auftraten: Issue mit Label `bot-failure,auto-pflege` entsteht
4. Bei naechstem gruenen Lauf: offenes Bot-Issue wird auto-closed
5. Artifact `auto-pflege-logs-<run_id>` ist herunterladbar mit `failure-report.md` + `logs/auto-pflege-*/`

## Voraussetzungen

- **Branch push:** `feature/wizard-adaptive` muss auf `origin` gepushed sein
  (aktuell 30+ Commits ahead). `gh workflow run` braucht einen Push, damit der
  Workflow-File auf dem Branch existiert.
- **GitHub-Actions-Permissions:** Repository-Settings → Actions → General →
  Workflow permissions muss `contents:write + pull-requests:write +
  issues:write` erlauben.
- **Repo-Secrets:** `DEEPSEEK_API_KEY` (Phase-3-Vorhanden, aber Konto = 0) ODER
  `GEMINI_API_KEY` + Workflow-Input `llm_provider=gemini`.

## Begruendung fuer Deferral

Bei Wave-3-Ausfuehrung (2026-05-19) war:
- Konto-Balance bei DeepSeek = 0 (Live-Smoke wuerde mit 402 scheitern).
- `feature/wizard-adaptive` war 30+ Commits ahead von origin (push noetig).
- Setup-Schritte sind Kolja-Action, nicht Orchestrator-Scope.

Code-Teile (Library-Refactor, auto-pflege-step.ts, Workflow-YAML, Loeschungen)
sind committed + Strict-Validator gegen alle 11 Dossiers gruen. Phase-4-FETCH-04-
Anker (Success-Criterion #3) ist damit erfuellt; Success-Criterion #4 (Live-E2E)
wartet auf dieses Todo.

## Reaktivierung

Wenn DeepSeek-Top-Up erfolgt ODER Plan, mit Gemini zu fahren: ein-Klick-Setup:
```bash
git push -u origin feature/wizard-adaptive
gh workflow run weekly-auto-pflege.yml --ref feature/wizard-adaptive \
    -f llm_provider=gemini -f max_programs=1 -f dry_run=false
gh run watch
gh run download <run_id>  # logs+failure-report
```

## Verwandt

- Backlog `live-workflow-smoke-deferred.md` (aus Phase 03-03) — analoge Situation
  fuer dossier-extraction + program-scan, jetzt durch dieses Item ersetzt (die
  alten Workflows wurden in Plan 04-04 geloescht).
