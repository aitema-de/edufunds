---
phase: 5
slug: wizard-pipeline-tuning-ux-l-cke
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existierend, `__tests__/`-Struktur) |
| **Config file** | `jest.config.{ts,js}` (Repo-Root, prüfen) |
| **Quick run command** | `npx jest __tests__/eval/ --bail` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30s (Eval-Unit-Tests mit LLM-Stubs); ~60-75 min (Full-Live-Baseline, separat) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest __tests__/eval/ --bail` (Quick Eval-Tests)
- **After every plan wave:** Run `npx jest` (Full Suite)
- **Before `/gsd-verify-work`:** Full suite green + 1× `npx tsx scripts/eval-pipeline.ts --replay` grün (Baseline-Replay)
- **Max feedback latency:** 30s (unit) / 60s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-Task-1 | 05-01 | 0 | WIZ-04 (Closure-Edit) | T-05-01-01 | WIZ-04 nur unter Phase 02.1 referenziert | grep | `grep -q "WIZ-04 \| Phase 02.1" .planning/REQUIREMENTS.md` | .planning/ROADMAP.md, .planning/REQUIREMENTS.md | ✅ green |
| 05-01-Task-2 | 05-01 | 0 | WIZ-01 Pre-Flight | T-05-01-02 | read-only Skript, schreibt nur Zaehler | script | `npx tsx scripts/check-dossier-coverage.ts && test -f data/eval/dossier-coverage-baseline.md` | scripts/check-dossier-coverage.ts | ✅ green |
| 05-01-Task-3a | 05-01 | 0 | WIZ-01 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-fk-match.test.ts --passWithNoTests` | __tests__/eval/pipeline-fk-match.test.ts | ✅ green |
| 05-01-Task-3b | 05-01 | 0 | WIZ-02 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-marker-detection.test.ts --passWithNoTests` | __tests__/eval/pipeline-marker-detection.test.ts | ✅ green |
| 05-01-Task-3c | 05-01 | 0 | WIZ-02 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-regex-detection.test.ts --passWithNoTests` | __tests__/eval/pipeline-regex-detection.test.ts | ✅ green |
| 05-01-Task-3d | 05-01 | 0 | WIZ-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-judge-rubric.test.ts --passWithNoTests` | __tests__/eval/pipeline-judge-rubric.test.ts | ✅ green |
| 05-01-Task-3e | 05-01 | 0 | WIZ-01 Sub-Metrik | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-finanzplan-sub.test.ts --passWithNoTests` | __tests__/eval/pipeline-finanzplan-sub.test.ts | ✅ green |
| 05-01-Task-3f | 05-01 | 0 | WIZ-01/-02/-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-determinism.test.ts --passWithNoTests` | __tests__/eval/pipeline-determinism.test.ts | ✅ green |
| 05-01-Task-3g | 05-01 | 0 | WIZ-01/-02/-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-snapshot-replay.test.ts --passWithNoTests` | __tests__/eval/pipeline-snapshot-replay.test.ts | ✅ green |
| 05-01-Task-3h | 05-01 | 0 | WIZ-01/-02/-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-aggregation.test.ts --passWithNoTests` | __tests__/eval/pipeline-aggregation.test.ts | ✅ green |
| 05-01-Task-3i | 05-01 | 0 | WIZ-01/-02/-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/pipeline-gate.test.ts --passWithNoTests` | __tests__/eval/pipeline-gate.test.ts | ✅ green |
| 05-01-Task-3j | 05-01 | 0 | WIZ-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/eval/geber-classification.test.ts --passWithNoTests` | __tests__/eval/geber-classification.test.ts | ✅ green |
| 05-01-Task-3k | 05-01 | 0 | WIZ-01/-02/-03 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/lib/wizard/config.test.ts --passWithNoTests` | __tests__/lib/wizard/config.test.ts | ✅ green |
| 05-01-Task-3l | 05-01 | 0 | WIZ-01/-02 | T-05-01-03 | it.todo() Skelett — keine Impl | unit | `npx jest __tests__/lib/wizard/pipeline.compliance.test.ts --passWithNoTests` | __tests__/lib/wizard/pipeline.compliance.test.ts | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Hinweis:** Planner befüllt diese Tabelle aus den `<automated>`-Blöcken jedes Tasks beim PLAN.md-Erzeugen. Wave 0 muss Test-Skelette für `eval-pipeline.ts`, `geber-classification.ts`, `finanzplan-validator-wrapper.ts` enthalten (CONTEXT.md D-32).

---

## Wave 0 Requirements

> 12 Test-Skelette laut Plan 05-01 Task 3 + 2 Fixture-Dateien (Warning 7 Resolution: synchronisiert mit Plan 05-01 `files_modified`).
> Alle 12 Tests sind laut RESEARCH §Validation Architecture Z.1325-1466 gerechtfertigt.

**Test-Skelette (12 Dateien — werden in Wave 0 als `it.todo()` angelegt, in Wave 2 Plan 05-04 Task 1c → lebende Tests):**

- [x] `__tests__/eval/pipeline-fk-match.test.ts` — WIZ-01 FK-Match auf antragsstruktur.abschnitte[].name (7 Tests)
- [x] `__tests__/eval/pipeline-marker-detection.test.ts` — WIZ-02 Layer-1 Marker-Detection multi-source (5 Tests)
- [x] `__tests__/eval/pipeline-regex-detection.test.ts` — WIZ-02 Layer-2 Regex + False-Positive-Schutz (6 Tests)
- [x] `__tests__/eval/pipeline-judge-rubric.test.ts` — WIZ-03 Judge mit LLM-Stub (4 Tests)
- [x] `__tests__/eval/pipeline-finanzplan-sub.test.ts` — Finanzplan-Sub-Metrik (4 Tests)
- [x] `__tests__/eval/pipeline-determinism.test.ts` — N=3 Mean+Population-Stddev (4 Tests)
- [x] `__tests__/eval/pipeline-snapshot-replay.test.ts` — Snapshot/Replay-Determinismus + Schema-Version-Check (3 Tests)
- [x] `__tests__/eval/pipeline-aggregation.test.ts` — Per-Geber-Gruppe-Breakdown (3 Tests)
- [x] `__tests__/eval/pipeline-gate.test.ts` — 2σ-Threshold-Logik pro Achse (D-25; 4 Tests)
- [x] `__tests__/eval/geber-classification.test.ts` — Mapping 11 Dossiers → 4-5 strategische Cluster (5 Tests)
- [x] `__tests__/lib/wizard/config.test.ts` — Env-Var-Parsing PIPELINE_CONFIG-Flags (4 Tests)
- [x] `__tests__/lib/wizard/pipeline.compliance.test.ts` — Compliance-Stage mit LLM-Stub (4 Tests, lebend in Wave 3 Plan 05-06)

**Fixture-Dateien (2):**

- [x] `__tests__/eval/fixtures/llm-stubs.ts` — STUB_JUDGE_RESPONSE_OEFFENTLICH + STUB_COMPLIANCE_VIOLATIONS
- [x] `__tests__/fixtures/pipeline-snapshot-borsigwalder.json` — UAT-28.04.-Snapshot-Fixture

**Pre-Flight (Daten-Survey, vor Test-Skelett-Anlage):**

- [x] `npx tsx scripts/check-dossier-coverage.ts` — Daten-Survey (Befund A5 aus RESEARCH.md: maxZeichen + vorbildFormulierungen-Coverage)
- [x] Output `data/eval/dossier-coverage-baseline.md` existiert mit 11 Dossier-Zeilen

*Begründung: 36 CONTEXT-Decisions + 6 Pitfalls aus RESEARCH.md erzwingen explizite Stubs, da LLM-Calls in CI nicht laufen können (`--replay`-Default). Warning 7 Resolution: 12 statt 7 Test-Files — die zusätzlichen 5 (regex-detection, judge-rubric, snapshot-replay, aggregation, gate) sind laut RESEARCH §Validation Architecture Z.1325-1466 alle gerechtfertigt (Layer-2-Regex/False-Positive, LLM-Judge-Mocking, Schema-Version-Check, Per-Cluster-Aggregation, achsen-spezifisches D-25-Gate).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-Closure-Live-Smoke (1× Live-Pipeline-Run mit nicht-Korpus-Anliegen) | WIZ-01/-02/-03 Anti-Overfitting | Live-LLM-Call mit frischem Test-Input; visueller Check auf UI-Side-Effects | `npx tsx scripts/eval-pipeline.ts --live --single <fresh-entry>` + manuelle Sichtung Output (D-36) |
| Marker-Liste-Kuration (Kolja-Review von ~176 Markern für 22 Einträge) | WIZ-02 Layer 1 | Kuratorische Qualität nicht automatisierbar, Claude generiert Entwürfe (D-14) | Wave 1 Checkpoint nach Marker-Generierung: Kolja-Review pro Eintrag |
| Korpus-Lock | Eval-Reproducibility | Inhaltliche Eignung der 20-25 Einträge | Wave 1 Checkpoint nach Korpus-Generierung: Kolja-Approval |
| BASELINE.md-Eintrag-Begründung bei Korpus-Updates | D-26 | Semantische Plausibilität („Korpus erweitert um X") | PR-Review |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Pre-Flight Daten-Survey + 12 Test-Files + 2 Fixtures)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Wave 0 complete (Plan 05-01, 2026-05-20)
