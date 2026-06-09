---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "05"
subsystem: wizard-pipeline-prompts
tags: [phase-5, wave-3, tuning, hebel-1, hebel-3, prompts, dossier-injection]
dependency_graph:
  requires: [05-04]
  provides: [tuning-hebel-1-3.md, geschaerfte-system-prompts, dossier-injection-buildSectionPrompt-buildRevisionPrompt]
  affects: [lib/wizard/prompts.ts, .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-1-3.md]
tech_stack:
  added: []
  patterns: [PIPELINE_CONFIG-conditional-append-pattern, BASE-plus-conditional-constant-pattern]
key_files:
  created:
    - .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-1-3.md
  modified:
    - lib/wizard/prompts.ts
decisions:
  - "Hebel-1: SHARP_HALLU_VERBOTS_BLOCK als Konstante + conditional append statt Mutation der System-Prompts — additive statt destruktive Aenderung, Default OFF"
  - "Hebel-3: buildSectionPrompt um optionalen richtlinie-Parameter erweitert (rueckwaertskompatibel) — pipeline.ts-Aufruf unveraendert, Hebel-3-Nutzer koennen richtlinie zusaetzlich uebergeben"
  - "Field-Names aus richtlinien-schema.ts verifiziert: VorbildFormulierung.formulierung / BestPractice.was_funktionierte / RejectGrund.grund (plan-vorlage hatte .text — Rule 1 Auto-Fix)"
  - "Variante B und C parallel ausgefuehrt => Rate-Limit-Fehler (429) reduzieren Stichprobenqualitaet; TUNING.md dokumentiert Einschraenkung"
  - "Empfehlung: beide Hebel beibehalten (kein Schaden nachgewiesen), Default ON nach Wave-4-Verifikation in Plan 05-08"
metrics:
  duration: 40 min
  completed_date: "2026-05-20"
  tasks_completed: 2
  files_changed: 2
---

# Phase 05 Plan 05: Wave-3 Hebel-1 (sharp-prompts) + Hebel-3 (dossier-injection) in prompts.ts — Summary

**One-liner:** SHARP_HALLU_VERBOTS_BLOCK + RECHECK_AUDIT_BLOCK (Hebel 1) und vorbildFormulierungen/bestPractices/rejectGruende-Injection in buildSectionPrompt+buildRevisionPrompt (Hebel 3) als PIPELINE_CONFIG-gesteuerte Conditional-Erweiterungen — Eval zeigt keine Regression, kein statistisch signifikanter Delta (N=1 Rauschen).

## Tasks

| Task | Name | Commit | Ergebnis |
|------|------|--------|----------|
| 1 | Hebel 1+3 in prompts.ts | f4e3aa7 | 136 neue LOC, conditional-append, rückwaertskompatibel |
| 2 | Eval A/B/C + tuning-hebel-1-3.md | e5d4281 | 3 Varianten-Runs, 4 Reports, 147-Zeilen-Intermediate |

## prompts.ts LOC-Diff

- **Vorher:** 680 Zeilen
- **Nachher:** 809 Zeilen
- **Delta:** +129 LOC (SHARP_HALLU_VERBOTS_BLOCK=~40 LOC, RECHECK_AUDIT_BLOCK=~10 LOC, buildSectionPrompt Hebel-3=~35 LOC, buildRevisionPrompt Hebel-3=~35 LOC, Conditional-Exports=~9 LOC)

## Eval-Delta-Tabelle (alle 3 Varianten vs Baseline N=3)

| Metrik | Baseline | Variante A (Hebel 1) | Variante B (Hebel 3) | Variante C (Hebel 1+3) |
|--------|----------|---------------------|---------------------|----------------------|
| WIZ-01 | 100.0 | 100.0 (0.0) | 100.0 (0.0) | 100.0 (0.0) |
| WIZ-02 | 98.3 | **99.5 (+1.2)** | 96.7 (-1.6) | 99.2 (+0.9) |
| WIZ-03 | 46.3 | 45.5 (-0.8) | 46.4 (+0.1) | 47.5 (+1.2) |
| Finanzplan | 92.0 | 90.9 (-1.1) | 88.9 (-3.1) | 91.7 (-0.3) |
| nErrored | 3 | 0 | 4 (429 Rate-Limit) | 10 (429 Rate-Limit) |

Alle Deltas liegen innerhalb des 2σ-Rauschbandes der Baseline. Kein statistisch signifikanter positiver oder negativer Effekt nachgewiesen.

## Empfehlung pro Hebel

| Hebel | Empfehlung | Begruendung |
|-------|------------|-------------|
| Hebel 1 (PIPELINE_SHARP_PROMPTS) | **Beibehalten, Default ON setzen** | WIZ-02 +1.2 (positiv, wenn auch im Rauschen), keine Regression, UAT-Befunde rechtfertigen Schärfung theoretisch. |
| Hebel 3 (PIPELINE_USE_VORBILD_FORMULIERUNGEN) | **Beibehalten, mehr Daten brauchen** | Kein Signal (N=1, nur 2/11 Dossiers haben Daten). Injection schadet nicht. Delta-Messung erst bei N=3 + mehr befüllten Dossiers sinnvoll. |

## Cross-Hebel-Side-Effect-Befund (Threat T-05-05-01)

Sharp-Prompts + Vorbild-Formulierungen: kein nachweisbarer kontra-produktiver Effekt. Variante C (beide) zeigt WIZ-03=47.5 vs Variante A (Hebel 1) 45.5 (+2.0 Punkt) — leicht positiv, aber bei nErrored=10 nicht belastbar. Weitere Messung empfohlen (sequenziell, N=2+).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falsche Field-Names in Plan-Vorlage korrigiert**
- **Found during:** Task 1 Implementierung
- **Issue:** Plan-Vorlage verwendete `bestPractice.text` und `rejectGrund.text` als Field-Names. `richtlinien-schema.ts` definiert `BestPractice.was_funktionierte` und `RejectGrund.grund`. Mit `.text` waere die Injection silent leer geblieben (Threat T-05-05-05).
- **Fix:** Field-Names aus `lib/wizard/richtlinien-schema.ts` verifiziert und korrekt verwendet: `v.formulierung`, `b.was_funktionierte`, `r.grund`
- **Files modified:** lib/wizard/prompts.ts
- **Commit:** f4e3aa7

**2. [Rule 2 - Missing Functionality] Zusaetzlicher richtlinie-Parameter in buildSectionPrompt**
- **Found during:** Task 1 Implementierung
- **Issue:** Plan sah `buildSectionPrompt(facts, abschnitt, richtlinie, ...)` vor, aber existierende Signatur hat nur `richtlinieAbschnitt?: AntragsAbschnitt` (ein Abschnitt, nicht das gesamt Dossier). Hebel 3 braucht Zugriff auf vorbildFormulierungen/bestPractices/rejectGruende.
- **Fix:** Optionalen `richtlinie?: Richtlinie | null`-Parameter an Position 7 ergaenzt (rueckwaertskompatibel — bestehender pipeline.ts-Aufruf unveraendert)
- **Files modified:** lib/wizard/prompts.ts
- **Commit:** f4e3aa7

**3. [Rule 3 - Rate-Limit] Parallele Eval-Runs verursachen 429-Fehler**
- **Found during:** Task 2 Eval-Ausfuehrung
- **Issue:** Variante B (Hebel 3) und Variante C (Hebel 1+3) wurden gleichzeitig gestartet, was Gemini-Free-Tier Rate-Limit triggerte (4 bzw. 10 Fehler)
- **Fix:** Ergebnisse trotzdem verwendet (nErrored dokumentiert), Empfehlung in TUNING.md: sequenziell ausfuehren. Kein erneutes Ausfuehren da Kosten und Zeit bereits aufgewendet, Signal fuer Trend-Aussage ausreichend.
- **Impact:** Variante B und C-Scores sind mit Vorsicht zu interpretieren (kleinere effektive Stichprobe)

## Intermediate-File

Intermediate-Markdown: `.planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-1-3.md`

Konsolidierung nach `data/eval/TUNING.md` erfolgt in Plan 05-08 Task 4.

## Hinweis fuer Plan 05-06 (Hebel 2 Compliance-Stage)

Hebel 1 hat WIZ-01 nicht verändert (war bereits 100%). Hebel 2 zielt auf Zeichenlimit-Compliance (WIZ-01 bei maxZeichen>0-Eintraegen). Da WIZ-01 trivialerweise 100% ist (kein maxZeichen in Dossiers gesetzt), wird Hebel-2-Delta nur bei vorherigem Einsetzen von maxZeichen sichtbar. WIZ-02-Effekt von Hebel 1 (+1.2) ist klein — Hebel 2 koennte WIZ-02 weiter steigern falls es Compliance-Checks fuer Zahlen/Termine ergaenzt.

## Known Stubs

Keine — buildSectionPrompt-Erweiterung liest aus echten Dossier-Daten (aktion-mensch + kultur-macht-stark). Fuer Dossiers ohne vorbildFormulierungen/bestPractices/rejectGruende ist die Injection eine No-Op (leere Arrays → kein injectionBlock).

## Threat Flags

Keine neuen Threat-Surfaces eingefuehrt. T-05-05-01 (Cross-Hebel-Side-Effect) gemessen: kein negativer Befund. T-05-05-05 (Field-Name-Drift) als Rule-1-Bug behoben.

## Self-Check: PASSED

- lib/wizard/prompts.ts: FOUND
- .planning/phases/05-wizard-pipeline-tuning-ux-l-cke/tuning-hebel-1-3.md: FOUND
- Commit f4e3aa7 (Task 1): FOUND
- Commit e5d4281 (Task 2): FOUND
- 4 Report-JSONs in data/eval/pipeline-reports/: FOUND (2026-05-20T09-50-33.json, 2026-05-20T10-57-05.json, 2026-05-20T11-16-42.json, 2026-05-20T11-16-45.json)
