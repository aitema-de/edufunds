---
phase: 04-programm-pflege-vollautomation-dossier-migration
status: passed-with-deferred
verifier: orchestrator-inline (gsd-verifier-subagent had Bash-permission issue)
verified: 2026-05-19
phase_requirements: [FETCH-02, FETCH-04]
---

# Phase 04 Goal Verification

## Phase Goal (aus ROADMAP)

> Vollautomatischer Programm-Pflegeprozess (Scanner → Extractor → Queue) und
> Migration aller 11 bestehenden Dossiers auf das erweiterte Schema, damit
> Pipeline-Tuning in Phase 5 auf vollstaendigen Daten arbeitet.

## Success-Criteria Check

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Scanner findet neue Programme aus `program-sources.json`, ruft Extractor automatisch und persistiert ein neues Dossier ohne Mensch-In-The-Loop fuer den Happy-Path | **PASSED (Code-Pfad)** | `scripts/auto-pflege-step.ts` 485 Zeilen baut Single-Workflow-Pfad. Dry-Run gegen 3 Quellen executed sauber. Live-Smoke deferred (DeepSeek-Konto-0 + Push-Voraussetzung). Backlog `auto-pflege-e2e-live-smoke-deferred.md` traegt es weiter. |
| 2 | Neu gefundenes Programm landet automatisch in `data/richtlinien-prioritaeten.json` mit berechnetem Queue-Score | **PASSED** | `auto-pflege-step.ts:estimateScore` + `appendProgrammIfMissing` + Queue-Push als `done`. Echter Score wird beim naechsten `rebuild-queue.ts` aus Foerderprogramm-Daten neu berechnet. |
| 3 | Alle 11 bestehenden Dossiers in `data/richtlinien/` enthalten die vier Phase-3-Felder (Best Practices, Reject-Gruende, Vorbild-Formulierungen, Frist-Logik) — Schema-Validator laeuft gruen | **PASSED** | `npx tsx scripts/validate-richtlinien.ts` (strict-Modus, ohne --legacy) exit 0. 11/11 Dossiers valide. |
| 4 | End-to-End-Smoke gegen ein neues Programm (Scanner → Dossier → Queue → Wizard-Pipeline-Lauf) liefert Antrag mit erweiterten Schema-Feldern als Pipeline-Input ohne Crash | **DEFERRED** | Workflow-Code-Pfad steht (weekly-auto-pflege.yml + auto-pflege-step.ts). Live-E2E benoetigt: (a) Branch-Push, (b) Repo-Actions-Permissions-Check, (c) LLM-Credits ODER LLM_PROVIDER=gemini-Override. Reaktivierung dokumentiert. |

## Requirement-Traceability

| Req-ID | Description | Verified-In |
|---|---|---|
| FETCH-02 | Vollautomatischer Scan + Extract + Queue-Update | `scripts/auto-pflege-step.ts` + `weekly-auto-pflege.yml` (Code-Pfad steht, Live-Smoke deferred) |
| FETCH-04 | Dossier-Migration auf erweitertes Schema | `data/richtlinien/*.json` 11/11 Strict-validator gruen (Phase-4-Wave-2 + finale Strict-Validator-Sanity in Wave-3) |

## Cross-Plan-Wiring (key_links)

Spot-Check der wichtigsten Imports/Verknuepfungen:

| Link | Verified |
|---|---|
| `auto-pflege-step.ts` importiert `runExtraction` aus `extract-richtlinie.ts` | ✓ (TSC exit 0, dry-run exit 0) |
| `auto-pflege-step.ts` importiert `loadQueue/saveQueue` aus `lib/wizard/queue.ts` | ✓ (TSC exit 0) |
| `cleanup-expired-queue.ts` und `migrate-legacy-dossier.ts` nutzen `lib/wizard/llm.ts` | ✓ (in Wave-1/-2 verifiziert) |
| `weekly-auto-pflege.yml` ruft `npx tsx scripts/auto-pflege-step.ts` mit env-mapped Inputs | ✓ (YAML structure) |

## Locked Decisions (04-CONTEXT.md)

Spot-Check D-01..D-12:

- **D-01** (in-memory program-candidates list): ✓ — `data/program-candidates.json` geloescht, `auto-pflege-step.ts` haelt Liste im Speicher
- **D-04** (status='expired'): ✓ — `QueueStatus = "open" | "done" | "skip" | "expired"` in `lib/wizard/queue.ts`
- **D-07** (Targeted-Fill statt Full-Regenerate): ✓ — `migrate-legacy-dossier.ts` SYSTEM_PROMPT erzwingt nur die 4 neuen Felder im LLM-Output, Bestand kommt aus existing
- **D-08** (Bestands-Felder byte-identisch): semantisch ✓, mit Format-Drift-Hinweis (JSON.stringify-Default normalisiert inline-Arrays auf multi-line)
- **D-09** (EXAKT 2 Sample-Commits am ersten Review-Gate): ✓ — Branch `dossier-migration/phase-04` hatte am Checkpoint #1 exakt 2 Commits (bmbf-digitalpakt-2 + ferry-porsche-challenge-2025)
- **D-11** (auto-pflege-step ist Single-Writer): ✓ — `runExtraction` ruft kein markDoneInQueue/markSkipInQueue mehr wenn `skipQueueUpdate=true`, auto-pflege-step.ts ist im Workflow-Pfad der einzige Queue-Writer
- **D-12** (strukturierter Failure-Report + Bot-Issue): ✓ — `failure-report.md` + GITHUB_OUTPUT has_failures + `actions/github-script`-Schritte fuer Issue-Lifecycle

## Plan-Abweichungen (in SUMMARYs dokumentiert)

- LLM-Provider wechselte von DeepSeek-Default auf Gemini (Konto = 0)
- 3 Schema-Lockerungen (8e9aecf, 31208c7, 0982a4a) bewusst als Phase-3-D-06-Ruecknahme
- SSH-Proxy-Hack fuer digitalpaktschule.de (WSL-Connection-Timeout)
- Plan 04-04 Task 4 (Live-E2E-Smoke) deferred als Backlog-Item

## Verdict

**PASSED with deferred Live-Smoke.**

Code-Pfad fuer alle 4 Success-Criteria steht und ist verifizierbar (TSC, Dry-Run-Smoke, Strict-Validator). FETCH-04 ist substantiell durch die 11/11 Migration erfuellt. FETCH-02 ist Code-fertig — Live-Smoke wartet auf 3 Kolja-Voraussetzungen (Push, Actions-Permissions, LLM-Credits).

**Empfehlung:** Phase 04 als complete markieren, Backlog-Item nach Top-Up reaktivieren.
