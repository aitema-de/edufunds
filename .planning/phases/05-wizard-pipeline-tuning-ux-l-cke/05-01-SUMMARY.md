---
phase: "05-wizard-pipeline-tuning-ux-l-cke"
plan: "01"
subsystem: "eval/planning"
tags: [phase-5, wave-0, eval, pre-flight, roadmap-edit, test-skeletons]
dependency_graph:
  requires: []
  provides:
    - "ROADMAP.md Phase-5 auf D-19-Schwellwerte aktualisiert"
    - "REQUIREMENTS.md WIZ-04 Closure-Edit"
    - "scripts/check-dossier-coverage.ts Pre-Flight-Survey"
    - "data/eval/dossier-coverage-baseline.md Felder-Matrix"
    - "12 Test-Skelette fuer Wave-2/3-Implementatoren"
    - "05-VALIDATION.md nyquist_compliant=true"
  affects:
    - "Wave-1 Plans 05-02 + 05-03 koennen auf Baseline-Befund referenzieren"
    - "Wave-2 Plan 05-04 kann Test-Skelette direkt als lebende Tests implementieren"
tech_stack:
  added: []
  patterns:
    - "npx tsx Skript-Pattern (analog eval-matcher.ts)"
    - "it.todo() Test-Skelett-Konvention fuer Wave-0"
key_files:
  created:
    - "scripts/check-dossier-coverage.ts"
    - "data/eval/dossier-coverage-baseline.md"
    - "__tests__/eval/pipeline-fk-match.test.ts"
    - "__tests__/eval/pipeline-marker-detection.test.ts"
    - "__tests__/eval/pipeline-regex-detection.test.ts"
    - "__tests__/eval/pipeline-judge-rubric.test.ts"
    - "__tests__/eval/pipeline-finanzplan-sub.test.ts"
    - "__tests__/eval/pipeline-determinism.test.ts"
    - "__tests__/eval/pipeline-snapshot-replay.test.ts"
    - "__tests__/eval/pipeline-aggregation.test.ts"
    - "__tests__/eval/pipeline-gate.test.ts"
    - "__tests__/eval/geber-classification.test.ts"
    - "__tests__/lib/wizard/config.test.ts"
    - "__tests__/lib/wizard/pipeline.compliance.test.ts"
    - "__tests__/eval/fixtures/llm-stubs.ts"
    - "__tests__/fixtures/pipeline-snapshot-borsigwalder.json"
  modified:
    - ".planning/ROADMAP.md"
    - ".planning/REQUIREMENTS.md"
    - ".planning/phases/05-wizard-pipeline-tuning-ux-l-cke/05-VALIDATION.md"
decisions:
  - "WIZ-04 Closure als reiner ROADMAP/REQUIREMENTS-Edit — Implementierung war bereits in Plan 02.1-06"
  - "Dossier-Coverage-Befund: maxZeichen 0/11 gesetzt → WIZ-01 Primary = Pflichtabschnitt-Coverage"
  - "vorbildFormulierungen nur bei 2/11 Dossiers (aktion-mensch: 3, kultur-macht-stark: 4) → Hebel-3-Delta nur fuer diese 2 messbar"
  - "53 it.todo() in 12 Test-Files — alle als pending gruen, kein Impl-Code in Wave 0"
metrics:
  duration: "~6 Minuten"
  completed: "2026-05-20"
  tasks_completed: 3
  files_created: 16
  files_modified: 3
---

# Phase 05 Plan 01: Wave-0 Pre-Flight Summary

**One-liner:** ROADMAP/REQUIREMENTS auf konservative D-19-Schwellwerte (80%/50%/+Delta) aktualisiert, Pre-Flight-Dossier-Survey (0/11 maxZeichen, 2/11 vorbildFormulierungen), 12 Test-Skelette mit 53 it.todo() fuer Wave-2/3-Implementatoren angelegt.

---

## Was wurde gebaut

### Task 1: ROADMAP.md + REQUIREMENTS.md (D-34, WIZ-04-Closure)

**ROADMAP.md Phase-5-Sektion geaendert:**

1. **Crit #5 entfernt** — "User kann den Wizard-Tab schliessen und ... fortsetzen (WIZ-04)" — Reload-Resume in Phase 02.1 (Plan 02.1-06) implementiert
2. **`**UI hint**: yes` entfernt** — Phase 5 ist Backend/Eval-only
3. **Requirements-Zeile** WIZ-04 entfernt (nur WIZ-01, WIZ-02, WIZ-03)
4. **Crit #1** um Sub-Metrik erweitert: "Finanzplan-Validity als dokumentierte Sub-Metrik"
5. **Crit #2** auf konservativ: "≥ 80 % der Pflichtabschnitte" (statt 100 %)
6. **Crit #3** auf konservativ: "≥ 50 % Reduktion der kuratierten Halluzinations-Marker" (statt 0 Halluzinationen)
7. **Crit #4** auf konservativ: "Score-Delta > 0 pro strategischer Geber-Gruppe (4-5 Cluster aus D-10)"

**REQUIREMENTS.md geaendert:**

- WIZ-04 aus Abschnitt "Antragswizard-Qualitaet" entfernt
- WIZ-04 unter "Frontend-UI-Polish" eingefuegt (Phase 02.1-Referenz)
- Traceability-Tabelle war bereits korrekt: `WIZ-04 | Phase 02.1 (Frontend-Polish + Stripe-Vorbereitung) | Pending`

### Task 2: Dossier-Coverage-Survey (RESEARCH §Daten-Vorbedingungen, A5)

**`scripts/check-dossier-coverage.ts`** (112 Zeilen):
- Liest alle 11 Dossiers aus `data/richtlinien/`, zaehlt pro Dossier: pflicht-Abschnitte, maxZeichen-gesetzt, vorbildFormulierungen, bestPractices, rejectGruende
- Schreibt `data/eval/dossier-coverage-baseline.md` mit Felder-Matrix-Tabelle + Implikationen-Sektion
- Pattern analog `scripts/eval-matcher.ts` (top-level async main + catch-Handler)

**Dossier-Coverage-Befund (11 Dossiers):**

| Dossier | Pflicht | maxZeichen | vorbildFormul. | bestPractices | rejectGruende |
|---------|---------|------------|----------------|---------------|---------------|
| aktion-mensch-schulkooperation | 7 | 0 | 3 | 2 | 0 |
| berlin-startchancen | 0 | 0 | 0 | 1 | 0 |
| bmbf-digitalpakt-2 | 6 | 0 | 0 | 2 | 0 |
| bosch-schulpreis | 6 | 0 | 0 | 3 | 0 |
| ensam-bmz | 8 | 0 | 0 | 5 | 5 |
| erasmus-schule-2026 | 0 | 0 | 0 | 0 | 0 |
| erasmus-schulentwicklung | 4 | 0 | 0 | 2 | 4 |
| ferry-porsche-challenge-2025 | 0 | 0 | 0 | 0 | 4 |
| ferry-porsche-challenge | 0 | 0 | 0 | 0 | 3 |
| klimalab-2026 | 0 | 0 | 0 | 0 | 0 |
| kultur-macht-stark | 7 | 0 | 4 | 4 | 4 |

**Implikationen:**
- **maxZeichen:** 0/11 gesetzt → WIZ-01 Eval-Methodik nutzt Pflichtabschnitt-Coverage als Primary, maxZeichen-Check optional (D-19, Pitfall 7 aus RESEARCH)
- **Hebel 3 (vorbildFormulierungen-Injection):** wirkt nur fuer 2/11 Dossiers (aktion-mensch: 3, kultur-macht-stark: 4) — Wave-3-Plan-05-06 misst Delta nur fuer diese 2 Dossiers

### Task 3: 12 Test-Skelette + 2 Fixture-Dateien + VALIDATION.md

**12 Test-Dateien mit 53 it.todo() gesamt:**

| Datei | Anzahl | Bereich |
|-------|--------|---------|
| `__tests__/eval/pipeline-fk-match.test.ts` | 7 | WIZ-01 FK-Match |
| `__tests__/eval/pipeline-marker-detection.test.ts` | 5 | WIZ-02 Layer-1 |
| `__tests__/eval/pipeline-regex-detection.test.ts` | 6 | WIZ-02 Layer-2 + False-Positive |
| `__tests__/eval/pipeline-judge-rubric.test.ts` | 4 | WIZ-03 Judge+Rubric |
| `__tests__/eval/pipeline-finanzplan-sub.test.ts` | 4 | Finanzplan-Sub-Metrik |
| `__tests__/eval/pipeline-determinism.test.ts` | 4 | N=3 Mean+Stddev |
| `__tests__/eval/pipeline-snapshot-replay.test.ts` | 3 | Snapshot/Replay |
| `__tests__/eval/pipeline-aggregation.test.ts` | 3 | Per-Geber-Gruppe-Breakdown |
| `__tests__/eval/pipeline-gate.test.ts` | 4 | 2σ-Threshold-Gate |
| `__tests__/eval/geber-classification.test.ts` | 5 | 11-Dossier-Mapping |
| `__tests__/lib/wizard/config.test.ts` | 4 | Env-Var-Parsing 4 Feature-Flags |
| `__tests__/lib/wizard/pipeline.compliance.test.ts` | 4 | Compliance-Stage LLM-Stub |

**2 Fixture-Dateien:**
- `__tests__/eval/fixtures/llm-stubs.ts` — STUB_JUDGE_RESPONSE_* + STUB_COMPLIANCE_VIOLATIONS (Wave-2-Platzhalter)
- `__tests__/fixtures/pipeline-snapshot-borsigwalder.json` — UAT-28.04.-Snapshot-Fixture (Wave-2-Platzhalter)

**05-VALIDATION.md:**
- `nyquist_compliant: true`
- `wave_0_complete: true`
- Per-Task Verification Map: 14 Zeilen (Tasks 1-3 mit allen Test-Files)
- Wave-0-Checkliste vollstaendig abgehakt

---

## Deviations from Plan

None — Plan executed exactly as written.

---

## Folge-Plan-Hinweise

**Wave 1 (Plan 05-02 + 05-03 parallel starten):**
- `05-02-PLAN.md` — Korpus-Kuration: `pipeline-korpus.json` mit 22 Eintraegen, 2 Kolja-Checkpoints (D-14). Marker-Liste pro Eintrag Claude generiert → Kolja reviewt.
- `05-03-PLAN.md` — `geber-classification.ts` (11 Dossiers gemappt) + `lib/wizard/config.ts` (4 Feature-Flags D-22). Test-Skelette 05-01-Task-3j + 05-01-Task-3k werden hier zu lebenden Tests.

**Fuer Wave-2-Implementatoren (Plan 05-04):**
- Dossier-Coverage-Baseline steht unter `data/eval/dossier-coverage-baseline.md`
- 12 Test-Skelette mit konkreten `it.todo()`-Beschreibungen exakt in lebende Tests umwandeln
- UAT-28.04.-Snapshot fuer `pipeline-snapshot-borsigwalder.json` aus `smoke-pipeline-with-extractor.ts` gewinnen

---

## Self-Check: PASSED

**Dateien existieren:**
- FOUND: scripts/check-dossier-coverage.ts
- FOUND: data/eval/dossier-coverage-baseline.md
- FOUND: __tests__/eval/pipeline-fk-match.test.ts (+ alle 9 weiteren eval-Tests)
- FOUND: __tests__/lib/wizard/config.test.ts
- FOUND: __tests__/lib/wizard/pipeline.compliance.test.ts
- FOUND: __tests__/eval/fixtures/llm-stubs.ts
- FOUND: __tests__/fixtures/pipeline-snapshot-borsigwalder.json
- FOUND: .planning/ROADMAP.md (editiert)
- FOUND: .planning/REQUIREMENTS.md (editiert)
- FOUND: 05-VALIDATION.md (nyquist_compliant: true)

**Commits existieren:**
- a5fc18b: docs(05): phase-5 roadmap + requirements auf endzustand
- 43c86cb: feat(05): pre-flight dossier-coverage-survey
- fa1984e: test(05): wave-0 test-skelette fuer 12 eval+config+compliance-tests
