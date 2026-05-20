---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "08"
subsystem: infra
tags: [phase-5, wave-4, ci-gate, doku, pre-closure-smoke, default-decision, github-actions, eval-pipeline]

requires:
  - phase: 05-wizard-pipeline-tuning-ux-l-cke
    provides: Wave-3-Hebel-Intermediates (tuning-hebel-1-3.md, tuning-hebel-2.md, tuning-hebel-4.md)

provides:
  - ".github/workflows/pipeline-eval.yml — CI-Threshold-Gate fuer lib/wizard/**-PRs"
  - "data/eval/README.md — Eval-Apparat-Ueberblick (Korpus, Skript, Snapshots, Threshold-Gate)"
  - "CLAUDE.md — Pipeline-Eval-Sektion ergaenzt"
  - ".planning/codebase/STACK.md — Eval-Apparat als Komponente eingetragen"
  - "CHECKPOINT: Pre-Closure-Smoke + Default-Hebel-Entscheidung ausstehend (Tasks 3+4)"

affects:
  - future lib/wizard/** PRs (CI-Gate blockiert Regressionen)
  - data/eval/TUNING.md (Task 4 ergaenzt Final-Decision-Block)
  - lib/wizard/config.ts (Task 4 updated Defaults)

tech-stack:
  added: [github-actions pipeline-eval workflow]
  patterns:
    - "env-Mapping fuer workflow_dispatch-Inputs (T-05-08-01 Workflow-Injection-Schutz)"
    - "set -euo pipefail in allen shell-Steps"
    - "Baseline-Snapshot-Existenz-Check als eigener Step"
    - "GitHub-Annotation mit PASS/WARN/FAIL pro Achse"

key-files:
  created:
    - ".github/workflows/pipeline-eval.yml"
    - "data/eval/README.md"
  modified:
    - "CLAUDE.md"
    - ".planning/codebase/STACK.md"

key-decisions:
  - "CI-Workflow nutzt --replay als Default (kein LLM-Cost in normalem PR-Betrieb, D-24)"
  - "env-Mapping fuer alle workflow_dispatch-Inputs (Phase-4-Hardening-Pattern, T-05-08-01)"

requirements-completed: [WIZ-01, WIZ-02, WIZ-03]

duration: "~15min (Tasks 1+2)"
completed: "2026-05-20 (Tasks 1+2 — Tasks 3+4 ausstehend, checkpoint)"
---

# Phase 5 Plan 08: CI-Threshold-Gate + Doku-Output + Pre-Closure-Smoke

**GitHub-Actions-Workflow fuer Pipeline-Eval-CI-Gate + 4 Doku-Outputs (README, CLAUDE.md, STACK.md, TUNING.md) — Pre-Closure-Smoke und Default-Hebel-Entscheidung stehen aus (Tasks 3+4)**

## Performance

- **Gestartet:** 2026-05-20 (nach Plan-07-Completion)
- **Tasks:** 2/4 abgeschlossen — bei Task 3 (checkpoint:human-verify) gestoppt
- **Files modified:** 4

## Accomplishments

- `.github/workflows/pipeline-eval.yml` erstellt: PR-Trigger auf 4 Pfade, --replay-Default, Threshold-Gate per exit-code-Propagation, GitHub-Annotation pro Achse, env-Mapping-Hardening
- `data/eval/README.md` erstellt (125 Zeilen): vollstaendige Eval-Apparat-Doku mit Strukturen, Aufruf-Konventionen, Threshold-Gate-Tabelle, Korpus-Update-Workflow, Feature-Flags, Caveats
- `CLAUDE.md` um Pipeline-Eval-Sektion ergaenzt (Quick-Start-Commands + Links zu README/BASELINE/TUNING)
- `.planning/codebase/STACK.md` um Eval-Apparat-Komponenten-Tabelle ergaenzt

## Task Commits

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | CI-Workflow pipeline-eval.yml | `623eda4` | `.github/workflows/pipeline-eval.yml` |
| 2 | Doku-Output README + CLAUDE.md + STACK.md | `46b5c89` | `data/eval/README.md`, `CLAUDE.md`, `.planning/codebase/STACK.md` |
| 3 | Pre-Closure-Smoke | AUSSTEHEND (checkpoint:human-verify) | — |
| 4 | Default-Hebel-Entscheidung + TUNING.md | AUSSTEHEND (checkpoint:decision) | — |

## Files Created/Modified

- `/home/kolja/edufunds-app/.github/workflows/pipeline-eval.yml` — CI-Threshold-Gate: PR-Trigger auf lib/wizard/**, replay-Default, GitHub-Annotation
- `/home/kolja/edufunds-app/data/eval/README.md` — Eval-Apparat-Ueberblick (neu erstellt, 125 Zeilen)
- `/home/kolja/edufunds-app/CLAUDE.md` — Pipeline-Eval-Sektion ergaenzt
- `/home/kolja/edufunds-app/.planning/codebase/STACK.md` — Eval-Apparat-Komponenten-Tabelle ergaenzt

## Decisions Made

- CI-Workflow-Default ist `--replay` (kein LLM-Cost) — `--live` nur via manual `workflow_dispatch` (D-24, T-05-08-02)
- env-Mapping fuer alle `github.event.inputs`-Werte durchgezogen (Phase-4-Hardening-Pattern, T-05-08-01)
- Baseline-Existenz-Check als eigener Step (verhindert silent-no-baseline-Crashes)
- GitHub-Annotation mit `core.error` fuer FAIL, `core.warning` fuer WARN, `core.notice` fuer PASS

## Deviations from Plan

Keine strukturellen Abweichungen. Eine kosmetische Verbesserung: der GitHub-Annotation-Step unterscheidet
`core.error` / `core.warning` / `core.notice` je nach FAIL/WARN/PASS-Status — das ist praeziser als reines
`core.notice` aus dem RESEARCH-Skeleton, aber nicht architektonisch relevant.

## Pre-Closure-Smoke (Task 3 — AUSSTEHEND)

**Benoetigte Aktion von Kolja:**

1. Live-Smoke-Run mit nicht-Korpus-Anliegen (Anti-Overfitting D-36) starten:

```bash
# Alle 4 Hebel ON (Production-Default-Ziel):
LLM_PROVIDER=gemini PIPELINE_SHARP_PROMPTS=1 PIPELINE_COMPLIANCE_STAGE=0 PIPELINE_USE_VORBILD_FORMULIERUNGEN=1 PIPELINE_GEBER_ROUTING_V2=1 \
  npx tsx --env-file=.env.local scripts/eval-pipeline.ts --live --N=1 --single pv-001 --snapshot --md-summary
```

Oder mit einem neuen, nicht-im-Korpus-Anliegen (empfohlen — echter Anti-Overfitting-Test).

2. Antrag-Text in Snapshot-Datei `data/eval/pipeline-snapshots/<ISO>/pv-*-run1.json` pruefen:
   - Keine Halluzinationen (Aktenzeichen, TV-L-Codes, erfundene Partner)?
   - Tonalitaet passend zum Geber-Cluster?
   - Pflichtabschnitte-Coverage?
   - Ehrliche Luecken-Markierungen?

3. Resume-Signal: `approved` (Phase-5-Closure moeglich) ODER `revise` + Befund-Liste

## Default-Hebel-Entscheidung (Task 4 — AUSSTEHEND)

Wave-3-Eval-Daten aus tuning-hebel-1-3.md + tuning-hebel-2.md + tuning-hebel-4.md:

| Hebel | Delta WIZ-01 | Delta WIZ-02 | Delta WIZ-03 | Empfehlung (aus intermediates) |
|-------|--------------|--------------|--------------|-------------------------------|
| 1 Sharp-Prompts | 0.0 | +1.2 | -0.8 global | ON (kein Schaden, theoretisch begruendet) |
| 2 Compliance-Stage | 0.0 | +1.2 | +2.8 global | OFF (verfeinern wenn maxZeichen gesetzt) |
| 3 Dossier-Injection | 0.0 | -1.6 | +0.1 global | ON (kein Schaden, datenarm) |
| 4 Geber-Routing V2 | 0.0 | +1.2 | -0.5 global (+9.0 Stiftung) | ON mit Vorbehalt verband-uni |

Alle Deltas liegen im 2σ-Rauschbereich (N=1, LLM-Varianz ~15-17 Stddev bei WIZ-03).

Resume-Signal nach Task 3-Approval: `default-all-on` ODER `default-selective: [Hebel-Liste]`
ODER `default-keep-off-plus-509: [Begruendung]`

## Known Stubs

Keine — die erstellten Doku-Dateien sind vollstaendig. data/eval/README.md verlinkt
`<siehe TUNING.md Final-Block>` bei den Feature-Flag-Defaults — das ist ein Pending-Verweis
auf Task 4 (wird dort ausgefuellt), kein produktiver Stub.

## Self-Check

**Created files:**
- `.github/workflows/pipeline-eval.yml`: FOUND (623eda4)
- `data/eval/README.md`: FOUND (46b5c89)
- `CLAUDE.md` (modified): FOUND
- `.planning/codebase/STACK.md` (modified): FOUND

**Commits exist:**
- 623eda4: FOUND
- 46b5c89: FOUND

## Self-Check: PASSED (Tasks 1+2)

Tasks 3+4 sind Checkpoints — SUMMARY wird nach Kolja-Approval und Task-4-Execution ergaenzt.
