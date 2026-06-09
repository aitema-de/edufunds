---
phase: 3
slug: programm-pflege-foundation
status: ready-for-execution
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-06
updated: 2026-05-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest `^29.7.0` + ts-jest `^29.4.9` (config in `jest.config.js`, `next/jest`-async-Wrapper) |
| **Config file** | `/home/kolja/edufunds-app/jest.config.js` |
| **Quick run command** | `npm test -- --testPathPattern=richtlinien-validator` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5-10s quick, ~30-60s full |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npm test -- --testPathPattern='(richtlinien-validator|richtlinien-loader|scripts/extract|scripts/scan)'` (~10-15s)
- **After every plan wave:** Run `npm test` (full suite, ~30-60s — Delta gegen 34 pre-existing-Failures aus Memory tracken, KEINE neuen Regressions)
- **Before `/gsd-verify-work`:** Full suite green delta + Workflow-Dispatch-Runs (D-09 #1+#2) + lokaler Smoke (D-09 #3) + Validator-CLI gegen Legacy (D-09 #4)
- **Max feedback latency:** 60 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FETCH-03 | T-Backward-Compat-Break | Schema additiv erweitert, alle 11 Legacy-Dossiers compilen weiterhin | static / type-check | `npx tsc --noEmit` exit 0 + grep verifies 4 new sub-interfaces + 4 new optional fields | ✅ existing schema file | ⬜ pending |
| 03-01-02 | 01 | 1 | FETCH-03 | T-Schema-Injection / T-FK-Drift | Strict + Legacy-Schema getrennt, FK-Check separat | unit | `npm test -- --testPathPattern='richtlinien-(validator\|loader)' --silent` exit 0 mit ≥12 passed | ❌ W0 (validator + 2 test files NEW) | ⬜ pending |
| 03-02-01 | 02 | 2 | FETCH-01 + FETCH-03 | T-Schema-Injection / T-Halluzination | Wrapper-Migration + Anti-Halluzinations-Prompt + Validator-Pre-Persist | static-grep + tsc | `npm test -- --testPathPattern='scripts/extract-richtlinie' --silent` exit 0 mit ≥11 passed | ✅ existing script + ❌ W0 test file NEW | ⬜ pending |
| 03-02-02 | 02 | 2 | FETCH-01 | T-FK-Drift | Scanner-Migration + neuer CLI-Validator mit --legacy-Flag | static-grep + smoke | `npm test -- --testPathPattern='scripts/scan-new-programs' --silent` exit 0 mit ≥7 passed; `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0; ohne flag exit 1 | ✅ existing script + ❌ W0 test file + ❌ NEW validator script | ⬜ pending |
| 03-03-01 | 03 | 3 | FETCH-01 | T-Secret-Leak | DEEPSEEK_API_KEY-Pflicht + GEMINI-Fallback + 4 neue Reviewer-Checkpoints | static-grep + yaml-validate | grep-checks for DEEPSEEK_API_KEY/LLM_PROVIDER/4 new checklist items + `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/weekly-dossier-extraction.yml'))"` exit 0 | ✅ existing yaml | ⬜ pending |
| 03-03-02 | 03 | 3 | FETCH-01 | T-Secret-Leak | Scanner-Workflow analog migriert | static-grep + yaml-validate | grep-checks for DEEPSEEK_API_KEY/LLM_PROVIDER + yaml.safe_load exit 0 | ✅ existing yaml | ⬜ pending |
| 03-03-03 | 03 | 3 | FETCH-01 | T-Pre-Flight-Drift | D-09 #1+#2+#3 manuelle Smokes | manual (checkpoint) | Workflow-Dispatch + lokaler `--next`-Smoke (D-09); user-attest required | N/A (manual) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `__tests__/lib/wizard/richtlinien-validator.test.ts` — Plan 03-01 Task 2 erstellt (Strict + Legacy + DU-Edge-Cases + FK-Check)
- [x] `__tests__/lib/wizard/richtlinien-loader.test.ts` — Plan 03-01 Task 2 erstellt-oder-erweitert (alle 11 Legacy-Dossiers laden ohne Crash)
- [x] `__tests__/scripts/extract-richtlinie.test.ts` — Plan 03-02 Task 1 erstellt (statische Grep-Tests fuer Wrapper-Migration + Prompt-Erweiterung + Validator-Aufruf)
- [x] `__tests__/scripts/scan-new-programs.test.ts` — Plan 03-02 Task 2 erstellt (analog statische Grep-Tests)

> Hinweis: Falls einer dieser Test-Dateien-Pfade durch Phase-02-Wave-0-Pattern-Konflikt schon angefasst wurde (Memory „Workflow-Bug GSD execute-phase Step 5.5 Resurrected-Files-Schutz"), Cherry-Pick-Pattern verwenden statt direktem Add. Die 4 neuen Test-Dateien sind alle in Phase 3 frisch — Cherry-Pick relevanter, falls execute-phase irgendeine als „resurrected" fehlinterpretiert.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-Flight-Check schlaegt fehl ohne `DEEPSEEK_API_KEY` | FETCH-01 | GitHub-Workflow-Verhalten erfordert Secret-Manipulation auf Repo-Ebene | Workflow-Dispatch-Run mit Secret entfernt; Pre-Check-Step muss exit-1 mit klarer Fehlermeldung |
| Workflow `weekly-dossier-extraction.yml` laeuft erfolgreich gegen 1 Test-Programm-ID | FETCH-01 | GitHub-Actions-UI-Klick (D-09 #1) | UI workflow_dispatch mit `program_id` aus Vorauswahl-Liste; PR muss korrekt erstellt werden, Body muss 4 neue Reviewer-Checkpoints enthalten |
| Workflow `weekly-program-scan.yml` laeuft erfolgreich ohne Argumente | FETCH-01 | GitHub-Actions-UI-Klick (D-09 #2) | UI workflow_dispatch ohne Args; Default-Sources; Lauf gruen; leeres Ergebnis OK |
| Lokaler Smoke `--next` produziert Dossier mit allen 4 neuen Feldern | FETCH-03 | benoetigt Live-LLM-Call gegen DeepSeek (D-09 #3) | `LLM_PROVIDER=deepseek npx tsx scripts/extract-richtlinie.ts --next` + anschliessend `npx tsx scripts/validate-richtlinien.ts` strict — neuer programmId hat keine Issues in Output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (3 tasks have automated, 1 task is manual checkpoint per D-09)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (4 neue Test-Dateien)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (quick run ~10-15s, full suite ~30-60s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved by planner (2026-05-06) — Phase 3 ready for `/gsd-execute-phase 3`
