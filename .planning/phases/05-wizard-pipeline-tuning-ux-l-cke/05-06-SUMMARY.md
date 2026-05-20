---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "06"
subsystem: pipeline
tags: [compliance-check, pipeline-stage, feature-flag, tdd, eval, wave-3, hebel-2]

requires:
  - phase: 05-wizard-pipeline-tuning-ux-l-cke/05-03
    provides: PIPELINE_CONFIG mit complianceStageEnabled-Flag (Default OFF)
  - phase: 05-wizard-pipeline-tuning-ux-l-cke/05-04
    provides: Baseline WIZ-01/WIZ-02/WIZ-03 für Delta-Vergleich

provides:
  - "compliance-check als 8. PipelineStage (zwischen recheck und finanzplan)"
  - "runComplianceCheck(): deterministischer FK-Check gegen Pflichtabschnitte + maxZeichen"
  - "complianceLoopCount-Schutz: max 1 Revision-Iteration (DoS-Mitigation T-05-06-01)"
  - "5 lebende Tests in pipeline.compliance.test.ts (war it.todo)"
  - "Eval-Delta Hebel 2 vs Baseline: WIZ-01=0, WIZ-02=+1.2, WIZ-03=+2.8"

affects:
  - "05-08-PLAN.md (Wave 4 Decision: welche Hebel-Kombination wird Default)"
  - "GeneratingProgress.tsx (compliance-check bleibt bewusst silent)"

tech-stack:
  added: []
  patterns:
    - "Silent-Stage-Pattern: PipelineStage-Union erweitern, aber ORDER/STAGES-Array in GeneratingProgress bewusst nicht erweitern"
    - "Compliance-Loop-Count-Pattern: complianceLoopCount=0 vor Stage, max 1 Iteration via === 0 Guard"
    - "Deterministic-Usage-Pattern: runComplianceCheck() hat kein LLM-Call, gibt dummy-Usage {promptTokens: 0} zurück"

key-files:
  created:
    - .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-2.md
  modified:
    - lib/wizard/types.ts
    - lib/wizard/pipeline.ts
    - lib/wizard/stage-labels.ts
    - components/Wizard/GeneratingProgress.tsx
    - __tests__/lib/wizard/pipeline.compliance.test.ts

key-decisions:
  - "runComplianceCheck() ist deterministisch (kein LLM-Call) — spart Kosten, ist reproduzierbar"
  - "Silent-Stage via ORDER-Array-Auslassung (Option a aus Plan): GeneratingProgress.tsx ignoriert compliance-check automatisch"
  - "finalRes zu let umdeklariert (war const) — notwendig für Compliance-Revision-Re-Zuweisung"
  - "Hebel-2-Eval-Delta liegt im 2σ-Rauschbereich (N=1) — kein sicherer positiver Effekt, aber auch kein negativer"

requirements-completed: [WIZ-01]

duration: ~18min (Task 1 TDD-Zyklus) + ~17min (Eval-Run 992s)
completed: "2026-05-20"
---

# Phase 5 Plan 06: Wave-3 Hebel-2 Compliance-Check-Stage Summary

**Neue `compliance-check`-PipelineStage mit deterministischem FK-Check gegen Pflichtabschnitte, Loop-Count=1, Feature-Flag ON/OFF, UI-silent; Eval-Delta WIZ-01=0, WIZ-02=+1.2, WIZ-03=+2.8 (alle innerhalb 2σ-Rauschen)**

## Performance

- **Duration:** ~35 Minuten (Task 1: TDD + Implementierung, Task 2: Eval-Run 992s)
- **Completed:** 2026-05-20
- **Tasks:** 2 (Task 1 TDD, Task 2 Eval)
- **Files modified:** 6

## Accomplishments

- `compliance-check`-Stage als 8. PipelineStage implementiert — deterministischer Pflichtabschnitt-Check zwischen recheck und finanzplan
- 5 lebende Tests (TDD RED→GREEN) — alle grün, keine Regression in bestehenden Tests, `npx tsc --noEmit` clean
- Eval-Run Hebel 2 (`PIPELINE_COMPLIANCE_STAGE=1`, N=1, n=22 Eintraege) abgeschlossen: Gate PASSED, 16/20 Snapshots mit Compliance-Check, Loop-Count-Schutz bewährt

## Hebel-2-Implementierungs-Übersicht

Die Compliance-Check-Stage besteht aus drei Teilen:

1. **`runComplianceCheck(finalText, abschnitte)`** — Deterministischer FK-Check:
   - Art `"fehlt"`: Pflichtabschnitt-Name per Substring-Match nicht im Text (case-insensitive)
   - Art `"ueberlaenge"`: Section-Text > `maxZeichen`
   - Art `"nur-platzhalter"`: Section-Text < 50 Zeichen obwohl Pflichtabschnitt
   - Kein LLM-Call — dummy-Usage `{promptTokens: 0, candidatesTokens: 0}`

2. **`buildComplianceRevisionPrompt(currentText, violations)`** — Repair-Prompt für REVISION_SYSTEM-Call bei Violations

3. **Integration in `runPipeline()`** nach recheck, vor finanzplan:
   ```
   complianceLoopCount = 0 → emit compliance-check → runComplianceCheck() →
   wenn violations + loopCount===0 → generateText(REVISION_SYSTEM, complianceRevisionPrompt) → loopCount=1
   ```

## Eval-Delta-Tabelle (Hebel 2 vs Baseline N=3)

| Achse | Baseline Mean | Hebel-2 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|--------------|-------|---------------|
| WIZ-01 (Pflichtabschnitte) | 100.0 | 100.0 | 0.0 | ja (Deckeneffekt) |
| WIZ-02 (Halluzinations-Detection) | 98.3 | 99.5 | +1.2 | ja (2σ-Band 89.3–107.3) |
| WIZ-03 (Tonalitaets-Passung) | 46.3 | 49.1 | +2.8 | ja (2σ-Band 14.7–77.9) |
| Finanzplan-Validity (Sub) | 92.0 | 90.0 | -2.0 | ja |

## Compliance-Stats

- 16 von 20 erfolgreichen Snapshots hatten Richtlinie mit Pflichtabschnitten → Compliance-Check ausgefuehrt
- 4 Snapshots ohne Richtlinie → Stage komplett übersprungen (kein Crash, kein Event)
- complianceLoopCount-Schutz: kein Eintrag hatte mehr als 1 Compliance-Revision-Iteration (T-05-06-01 bewährt)
- 2 Einträge errored (nErrored=2) — nicht compliance-spezifisch

## Cross-Reference: Hebel 1 vs Hebel 2

Hebel 1 (Plan 05-05, Sharp Prompts) und Hebel 2 zeigen vergleichbares Delta-Niveau:
- WIZ-02: beide +1.2 (präventiv via Verbotsliste vs kurativ via Compliance-Repair)
- WIZ-03: Hebel 1 = -0.8, Hebel 2 = +2.8 (Varianz im N=1-Rauschbereich)

Beide Hebel adressieren unterschiedliche Schwächen: Hebel 1 wirkt präventiv in Section/Revision, Hebel 2 deterministisch post-hoc. Kombination in Plan 05-08 entschieden.

## Task Commits

1. **Task 1: Compliance-Stage implementieren (TDD)** — `688db24` (feat)
2. **Task 2: Eval-Run + Intermediate-Markdown** — `02fb273` (docs)

## Files Created/Modified

- `/home/kolja/edufunds-app/lib/wizard/types.ts` — PipelineStage-Union um `"compliance-check"` erweitert
- `/home/kolja/edufunds-app/lib/wizard/pipeline.ts` — `runComplianceCheck()`, `buildComplianceRevisionPrompt()`, Stage-Integration nach recheck; `finalRes` von const zu let
- `/home/kolja/edufunds-app/lib/wizard/stage-labels.ts` — Eintrag `"compliance-check": "Compliance-Pruefung"` (TS-Compile-Safety)
- `/home/kolja/edufunds-app/components/Wizard/GeneratingProgress.tsx` — Kommentar dokumentiert silent-stage-Verhalten (kein Code-Change nötig)
- `/home/kolja/edufunds-app/__tests__/lib/wizard/pipeline.compliance.test.ts` — 5 lebende Tests (war it.todo)
- `/home/kolja/edufunds-app/.planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-2.md` — Eval-Intermediate (neu)

## Decisions Made

- `runComplianceCheck()` deterministisch ohne LLM-Call: spart Kosten, ist reproduzierbar, verlässlicher als LLM-Parsierung
- Silent-Stage via ORDER-Array-Auslassung (nicht `if stage === "compliance-check" return null`): sauberer, kein Control-Flow-Overhead
- `finalRes` zu `let` umdeklariert — notwendig für Compliance-Revision-Neuzuweisung nach dem recheck-Block
- Eval liefert keine sicheren Effekte bei N=1 — Hebel bleibt OFF bis N=3-Verifikation in Plan 05-08

## Deviations from Plan

Keine — Plan exakt wie spezifiziert ausgeführt.

## Issues Encountered

Keine.

## Known Stubs

Keine — Compliance-Stage ist vollständig implementiert und via Feature-Flag toggelbar.

## Threat Flags

Keine neuen Sicherheits-relevanten Oberflächen (Compliance-Check ist deterministisch, kein neuer Netzwerk-Pfad).

## Next Phase Readiness

- Plan 05-07 (Wave 3 Hebel 3/4) kann parallel laufen — disjunkt zu pipeline.ts (modifiziert prompts.ts / geber-guidance.ts)
- Plan 05-08 (Wave 4 Default-Beschluss) hat alle 3 Wave-3-Intermediates (tuning-hebel-1-3.md + tuning-hebel-2.md)
- Eval-Entscheidung: N=3-Verifikation von Hebel 2 (oder Kombination) in Plan 05-08 vor Default-ON-Schaltung

---
*Phase: 05-wizard-pipeline-tuning-ux-l-cke*
*Completed: 2026-05-20*
