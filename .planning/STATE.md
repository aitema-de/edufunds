---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase 04 abgeschlossen — alle 11 Dossiers Strict-Schema-konform
stopped_at: Phase 5 context gathered (11 areas discussed, 36 decisions captured)
last_updated: "2026-05-19T21:01:23.167Z"
last_activity: 2026-05-19 -- Phase 04 complete (Wave 3 mit deferred Live-E2E-Smoke)
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 31
  completed_plans: 23
  percent: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-30)

**Core value:** Programme werden nicht generisch verarbeitet — der Wizard nutzt programm-spezifisches Wissen (Dossier), um zielgerichtet zu fragen und einen Antrag zu erstellen, der zu 100 % den Förderkriterien entspricht, semantisch hochwertig ist, nicht halluziniert und maximale Förderwahrscheinlichkeit erzielt.
**Current focus:** Phase 04 — programm-pflege-vollautomation-dossier-migration

## Current Position

Phase: 04 (programm-pflege-vollautomation-dossier-migration) — COMPLETE
Plan: 4 of 4 done (04-01 + 04-02 + 04-03 + 04-04). Naechste Phase: 05 Wizard-Pipeline-Tuning + UX
Status: Phase 04 abgeschlossen — alle 11 Dossiers Strict-Schema-konform
Last activity: 2026-05-19 -- Phase 04 complete (Wave 3 mit deferred Live-E2E-Smoke)

Progress: [██████████] 100% (Phase 03 von 7 done; uebernaechste Phase 04 Programm-Pflege Vollautomation)

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |
| 1 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-eval-korpus-matcher P01 | 25 | 3 tasks | 5 files |
| Phase 1 P01-02 | 25 | 3 tasks | 5 files |
| Phase 03 P01 | 227 | 2 tasks | 4 files |
| Phase 03 P03-02-cron-migration-cli-validator | 396 | 2 tasks | 6 files |
| Phase 03 P03-03-workflow-migration-test-runs | 2317 | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions sind in PROJECT.md Key-Decisions-Tabelle gepflegt. Roadmap-relevante Entscheidungen:

- Eval-First-Strategie: Bevor Matcher (MATCH-02/-03) und Pipeline (WIZ-01/-02/-03) getuned werden, entstehen messbare Eval-Korpora als Regressions-Basis (Phase 1 + Phase 5 Eval-Vorab-Schritt)
- Programm-Pflege-Sequenz: FETCH-01 (Provider-Migration) + FETCH-03 (Schema-Erweiterung) als Foundation in Phase 3, FETCH-02 (Vollautomation) + FETCH-04 (Dossier-Migration) als Build-Out in Phase 4
- Live-UAT als letzte Phase: UAT-01/-02/-03 erst nach Quality-Verbesserungen, sonst werden Pilot-Anwender mit halbgaren Iterationen verbrannt
- DeepSeek `deepseek-chat` als Default bleibt, Pipeline-Modell-Entscheidung vom 28.04. respektiert
- Plan 01-01: Reports und Snapshots als transient via .gitignore ausgeschlossen — Korpus selbst bleibt versioniert, Baselines kommen separat in Plan 01-02 (data/eval/BASELINE.md)
- Plan 01-01: LLM-Varianz im Matcher beobachtet (Off-Target-Rate Run 1 vs Run 2: 0% vs 50% bei identischem 3-Eintrag-Stub) — Plan 01-02 sollte Run-Stabilitaet evaluieren oder seed/temperature=0 erwaegen
- Phase-1-Baseline force-committed trotz .gitignore (Threat-Model T-01-09 SHA-Zuordnung)
- BASELINE.md mit JSON-Zahl 0.79 Cent statt Konsolen-formatEur-Display '< 0,01 €'
- Edge-Case-Befund stehengelassen: Matcher liefert Top-3 statt Klaerungsfrage — Phase-2-MATCH-03-Auftrag
- Plan 03-02 Auto-Fix: AntragsstrukturLegacySchema neu, validateForeignKeys mit Null-Check — sonst Bestands-Dossiers (5/11) blocken Legacy-Modus oder crashen FK-Check
- Plan 03-03 Verfeinerung: Live-Workflow-Dispatch (D-09 #1+#2) deferred bis main-Merge — GitHub-UI zeigt workflow_dispatch nur fuer Workflows auf default branch. Static-Acceptance + Live-D-09-#3 (zwei DeepSeek-Calls + Strict-Validator) decken die Substanz ab. Backlog `live-workflow-smoke-deferred.md` (3b27aaf) traegt das Nachhol-Smoke fest.
- Plan 03-03 Befund: Empty-Skip-Schutz triggert sauber inkl. echter LLM-Auslauf-Detektion (bundesweit-ganztag "Quelle zu allgemein" / nrwbank-moderne-schule "am 27.02.2026 ausgelaufen") — kein Bug, gewuenschtes Pre-Persist-Gate-Verhalten. Stale-Queue-Cleanup via Backlog `queue-pflege-stale-programme.md` (c49725e) fuer Phase 04.

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Frontend-Polish + Stripe-Vorbereitung (URGENT) — Markt-Blocker-Pfad (UI-Polish + Live-UAT-Vorbereitung + Stripe-Code-Pfade ohne Live-Account); Roadmap-Phase 3 (Programm-Pflege Foundation / Cron-Migration) bleibt unveraendert dahinter, wird erst akut wenn Programm-Pflege-Bedarf entsteht (2026-05-06)
- Phase 02.1 EXECUTED 2026-05-06: 6 Plans in 2 Wellen (Welle 1: 5 Plans sequenziell wegen Test-Skelett-File-Overlap; Welle 2: WIZ-04 Reload-Resume), HEAD `f9d550a` auf feature/wizard-adaptive. 0 Test-Regressionen (34 pre-existing-Failures unveraendert). Commits: 02.1-01 Test+Smoke-Skelette, 02.1-02 Stripe-Webhook-Haertung + 7 Tests gruen, 02.1-03 Empty-States + Mobile-Touch-Targets, 02.1-04 AntragSectionNav + h2-Anker + Edit-Button, 02.1-05 4 UAT-Templates, 02.1-06 PipelineStage-Heartbeat + Reload-Detect-Polling + failed-UI-Retry. Verifier-Run + Phase-Verification noch offen.

### Pending Todos

Aus `.planning/todos/pending/`:

- **queue-pflege-stale-programme.md** (created 2026-05-06, Phase 04 Kandidat) — Stale/expired Programme aus Prio-Queue ausraeumen. Auslauf-Schutz, Frist-Pre-Check, `cleanup-expired-queue.ts`-Skript, woechentliches Reporting. Begruendung: Phase 03 D-09 #3 Smoke fand zwei stale Top-Picks (bundesweit-ganztag, nrwbank-moderne-schule).
- **live-workflow-smoke-deferred.md** (created 2026-05-06, Phase 07 oder Pre-Live-UAT-Merge-Fenster) — Live-Workflow-Dispatch (D-09 #1 Dossier-Workflow + D-09 #2 Scanner-Workflow) sobald Branch nach main gemerged ist. Phase 03 D-09 #1+#2 sind via Static-Acceptance verifiziert; Live-Smoke nachzuholen sobald GitHub-UI workflow_dispatch zeigt.

### Blockers/Concerns

Issues, die zukünftige Phasen betreffen (aus codebase/CONCERNS.md übernommen, nicht milestone-blockierend, aber im Blick zu halten):

- **Stripe-Account / Live-Paywall** — Pfad A entschieden, Termin offen. Bewusst als v2 ausgeklammert (siehe PROJECT.md Out of Scope), Dev-Mock reicht für interne UATs in Phase 6.
- **Migrationen 002 + 003 nur auf Dev-DB** — vor Production-Launch (v2) auf Staging + Prod ausrollen. Phase 6 Pilot-UATs laufen auf Dev-Stand, kein Blocker für aktuelle Roadmap.
- **AVV-Setup für DeepSeek** — vor Live-Production-Onboarding klären (v2-Reminder, in PROJECT.md Constraints dokumentiert).
- **5 Legacy-Test-Suites failen pre-existing** — bewusst Out of Scope für aktuelle Milestone (siehe PROJECT.md), keine Auswirkung auf Wizard-Quality.

## Deferred Items

Items aus REQUIREMENTS.md v2 / Out of Scope, bewusst nicht in dieser Milestone:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Payments | PAY-01..04 (Stripe-Live-Account, Webhook-Secrets, Invoice/Tax) | v2 | 2026-04-30 |
| Auth | AUTH-01, SUB-01, SUB-02 (User-Accounts, Schulträger-Abos) | v2 | 2026-04-30 |
| Production | PROD-01..03 (Migrationen Staging/Prod + Wizard-Branch nach main) | v2 | 2026-04-30 |
| Tests | 5 Legacy-Test-Suites fixen | Out of Scope | 2026-04-30 |

## Session Continuity

Last session: --stopped-at
Stopped at: Phase 5 context gathered (11 areas discussed, 36 decisions captured)
Resume file: --resume-file

**Planned Phase:** 5 (wizard-pipeline-tuning-ux-l-cke) — 8 plans — 2026-05-19T21:01:23.132Z

### Wave-2-Blocker (entdeckt 2026-05-19)

**Drei strukturelle Issues, die vor Wave-2-Resume geklaert werden muessen:**

1. **LLM-Provider DeepSeek = 0 Balance.** DeepSeek-API-Roundtrip: `{"error":{"message":"Insufficient Balance"...}}`. Project-Default-Entscheidung (28.04.) war `deepseek-chat`. Aktion: Top-Up im DeepSeek-Dashboard oder LLM_PROVIDER-Entscheidung fuer Migrations-Tooling neu treffen.

2. **WSL→digitalpaktschule.de Connection-Timeout (8s+).** Quelle `bmbf-digitalpakt-2` (Sample-1) ist von WSL aus per curl nicht erreichbar (DNS OK, TCP-Connect timeout). Vom Hetzner-Server: HTTP 200 in 121ms. Workaround in Session getestet: SSH-Fetch nach `/tmp/digitalpakt-cache.html` + Temp-Patch dossier.quellen[0]. Funktional, aber Wegwerf-Hack — produktionsfertig waere CLI-Flag `--source-override` in migrate-legacy-dossier.ts.

3. **STRUKTURELLE Prompt-vs-Schema-Tension (das eigentliche Problem).** SYSTEM_PROMPT in `scripts/migrate-legacy-dossier.ts` sagt explizit „leeres Array ist erlaubt wenn die Quelle nichts hergibt" + „Wenn unsicher: lieber leere Liste als Erfindung". `RichtlinieStrictSchema` in `lib/wizard/richtlinien-validator.ts` verlangt `z.array(...).min(1)` fuer bestPractices, rejectGruende, vorbildFormulierungen. Gemini-2.5-pro (MODEL_PIPELINE bei LLM_PROVIDER=gemini) folgt der Anti-Halluzinations-Direktive korrekt → empty arrays → Strict-Schema fail → exit 1 → kein writeFile. Volltext-Volumen war 13 KB (genug Material), aber Gemini gibt fuer den BMBF-Digitalpakt nichts explizit Belegbares.

**Drei orthogonale Optionen, die Kolja entscheiden muss:**

| Option | Was zu tun | Risiko |
|---|---|---|
| A — DeepSeek-Top-Up + Retry | Stripe-Charge im DeepSeek-Dashboard, dann `/gsd-execute-phase 4 --wave 2`. `deepseek-chat` hatte in Phase 3 weniger Empty-Skips → ggf. ist die Tension dort weniger sichtbar. | Loest Issue 1+3 wenn deepseek-chat fuelliger antwortet. Issue 2 bleibt (Workaround per SSH-Fetch noetig) |
| B — SYSTEM_PROMPT loosen | Prompt-Aenderung in `scripts/migrate-legacy-dossier.ts`: ersetze „lieber leere Liste als Erfindung" durch „mindestens 1 belegbarer Eintrag pro Feld; bei Mangel das plausibelste Beispiel aus dem Volltext extrahieren" — atomic-commit fix(scripts): tune migrate-prompt for strict-schema min(1). | Bewusste Plan-Abweichung. Macht das Migrations-Tooling weniger streng als das Production-Scanner-Tooling (extract-richtlinie.ts) — dort bleibt der konservative Prompt. |
| C — Strict-Schema lockern auf `.min(0)` | Aenderung in `lib/wizard/richtlinien-validator.ts`. Bricht Phase-3-Foundation (D-06 verlangt explizit min 1). | NICHT empfohlen — verletzt Phase-3-Decision frontal. |

**Empfehlung:** Option A wenn DeepSeek-Top-Up moeglich. Sonst Option B + SSH-Fetch-Workaround als „Phase-04.1 Pre-Wave-2 Patches"-Mini-Phase einziehen.

### Wave-1-Resultat (DONE)

- 04-01 ✓ (HEAD a322301): lib/wizard/queue.ts + cleanup-expired-queue.ts, 3 Programme auf status=expired (incl. beider D-06-Test-Anker + Bonus hamburg-kultur-schule HTTP 404)
- 04-02 ✓ (HEAD a322301): migrate-legacy-dossier.ts + validate-single-dossier.ts (per Plan ohne writeFile-Path bei Validator-Fail — funktioniert wie spezifiziert)
- Branch `dossier-migration/phase-04` leer angelegt als Wave-2-Resume-Marker
