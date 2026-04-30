# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-30)

**Core value:** Programme werden nicht generisch verarbeitet — der Wizard nutzt programm-spezifisches Wissen (Dossier), um zielgerichtet zu fragen und einen Antrag zu erstellen, der zu 100 % den Förderkriterien entspricht, semantisch hochwertig ist, nicht halluziniert und maximale Förderwahrscheinlichkeit erzielt.
**Current focus:** Phase 1 — Eval-Korpus Matcher

## Current Position

Phase: 1 of 6 (Eval-Korpus Matcher)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-30 — Roadmap erstellt (14 v1-Requirements auf 6 Phasen gemappt, 100 % Coverage)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions sind in PROJECT.md Key-Decisions-Tabelle gepflegt. Roadmap-relevante Entscheidungen:

- Eval-First-Strategie: Bevor Matcher (MATCH-02/-03) und Pipeline (WIZ-01/-02/-03) getuned werden, entstehen messbare Eval-Korpora als Regressions-Basis (Phase 1 + Phase 5 Eval-Vorab-Schritt)
- Programm-Pflege-Sequenz: FETCH-01 (Provider-Migration) + FETCH-03 (Schema-Erweiterung) als Foundation in Phase 3, FETCH-02 (Vollautomation) + FETCH-04 (Dossier-Migration) als Build-Out in Phase 4
- Live-UAT als letzte Phase: UAT-01/-02/-03 erst nach Quality-Verbesserungen, sonst werden Pilot-Anwender mit halbgaren Iterationen verbrannt
- DeepSeek `deepseek-chat` als Default bleibt, Pipeline-Modell-Entscheidung vom 28.04. respektiert

### Pending Todos

Aus `.planning/todos/pending/` — noch keine erfasst.

None yet.

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

Last session: 2026-04-30
Stopped at: Roadmap erstellt (14 v1-Requirements auf 6 Phasen gemappt) — bereit für `/gsd-plan-phase 1`
Resume file: None
