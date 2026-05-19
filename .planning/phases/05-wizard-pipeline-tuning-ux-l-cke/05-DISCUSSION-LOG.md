# Phase 5: Wizard-Pipeline-Tuning + UX-Lücke - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 05-wizard-pipeline-tuning-ux-l-cke
**Areas discussed:** Korpus-Strategie, Metriken pro WIZ-Achse, Phase-Scope + Tuning-Hebel, Threshold-Gate + PR-Discipline, Geber-Typ-Klassifikation, Edge-Cases + Finanzplan-Eval, Reproducibility, Feature-Flags + UI-Hint, Phase-Wave-Struktur, Test-Skelette + Wave-0, Dokumentations-Output + ROADMAP-Update

---

## Korpus-Strategie

| Frage | Optionen | Gewählt |
|---|---|---|
| Korpus-Größe | Kompakt (12-15) / **Mittel (20-25, analog Phase 1)** / Groß (30-40) | ✓ Mittel (20-25) |
| Quelle | UAT-Real / **Hybrid 60/40 UAT+synthetisch** / Rein synthetisch | ✓ Hybrid 60/40 |
| Coverage | **Alle 11 Dossiers + 5-7 Edge-Cases** / Stress-Sample 4-6 / Sample-First 2-3 | ✓ Alle 11 + Edge-Cases |
| Qualitäts-Mix | **Vag-dominant 50/30/20** / Balanciert 33/33/33 / Goldstandard 20/40/40 | ✓ Vag-dominant 50/30/20 |
| Snapshot/Replay | **Pflicht-Snapshot Replay-Default --live für Refresh** / Live-Default / Hybrid Stage-Level | ✓ Pflicht-Snapshot |
| Eintrag-Struktur | **Facts-Block + User-Answers-Array (replay-fertig)** / Voll-Wizard-Sitzung / Hybrid mit Flag | ✓ Facts-Block + Answers |
| Pfad | **data/eval/pipeline-korpus.json (Sibling)** / data/eval/pipeline/ Unterordner / Custom | ✓ pipeline-korpus.json Sibling |

---

## Metriken pro WIZ-Achse

| Frage | Optionen | Gewählt |
|---|---|---|
| WIZ-01 | **Strict FK-Match + harter maxZeichen** / Semantisch / Strict-Default + --tolerant-Flag | ✓ Strict FK-Match |
| WIZ-02 | Marker-Liste / LLM-as-Judge / **Hybrid 3-Layer (Marker + Regex + LLM-Judge optional)** | ✓ Hybrid 3-Layer |
| WIZ-03 | LLM-Judge alle 8 GeberTypen / LLM-Judge 3 Hauptachsen / Heuristik | ✓ LLM-Judge alle 8 (später revidiert auf 4-5 strategische Gruppen, siehe Area 5) |
| Aggregat-Reports | **3 Haupt-Scores + Per-Dossier + Per-Geber-Typ-Breakdown** / +Diff-Report / Minimalistisch | ✓ 3 Haupt-Scores + Breakdowns |
| Baseline | **HEAD feature/wizard-adaptive (Phase-4-Closure)** / Eingefrorener Pre-Tuning-Commit / Mehrstufige | ✓ HEAD feature/wizard-adaptive |
| Marker-Kuration | **Claude generiert + Kolja reviewt+editiert** / Vollautomatisch / Kolja manuell | ✓ Claude + Kolja-Review (Phase 1 D-08 Pattern) |
| Judge-Modell | deepseek-chat default / deepseek-v4-pro / **Hybrid (chat default + --pro-judge Flag)** | ✓ Hybrid |

---

## Phase-Scope + Tuning-Hebel

| Frage | Optionen | Gewählt |
|---|---|---|
| Phase-Scope | Nur Korpus+Baseline / **Korpus+Baseline+1. Tuning-Welle bis Schwellwert** / Korpus+Baseline+Tuning bis ROADMAP-Crit hart | ✓ Korpus+Baseline+1. Tuning-Welle |
| Tuning-Hebel (multi) | Prompts schärfen, Pipeline-Stages erweitern, Dossier-Daten nutzen, Geber-Typ-Routing | ✓ ALLE 4 |
| Reihenfolge | **Eval-first datengetrieben (ROI-Reihenfolge)** / Prompts-first / Strukturell-first | ✓ Eval-first datengetrieben |
| DoD | **Messbares Delta (WIZ-01 +20%, WIZ-02 +50%, WIZ-03 Delta>0)** / ROADMAP-Crit hart / Tuning bis Mess-Ebene | ✓ Messbares Delta |
| Schwellwerte konkret | **Konservativ (WIZ-01 ≥80%, WIZ-02 ≥50% Reduktion, WIZ-03 Delta>0)** / Aggressiv (95%/80%/Delta>+15) / Achsen-spezifisch | ✓ Konservativ |
| Eskalation | **Welle 2 in selber Phase** / Folge-Phase 5.1 / Entscheidung im Moment | ✓ Welle 2 in selber Phase |
| WIZ-04 / Crit #5 | **Ja, explizit entfernen + ROADMAP-Edit** / Verifizieren ob 02.1-06 schliesst / Behalten | ✓ Explizit entfernen |

---

## Threshold-Gate + PR-Discipline

| Frage | Optionen | Gewählt |
|---|---|---|
| PR-Pflicht | **Ja hart (CI blockt Merge bei Regression)** / Lokales Pre-Push-Hook / Manuell-empfohlen | ✓ Ja hart |
| Block-Status | **Achsen-spezifisch (WIZ-01 hart, WIZ-02 mittel >10%, WIZ-03 warning)** / Alles hart / Alles warning | ✓ Achsen-spezifisch |
| Korpus-Updates | **Baseline-Recalc im selben PR** / Korpus-Update read-only seitens CI / Korpus-Versionierung | ✓ Baseline-Recalc im selben PR |
| CI-Workflow | **Neuer .github/workflows/pipeline-eval.yml** / Integriert in bestehenden CI / Manual-dispatch only | ✓ Neuer pipeline-eval.yml |

---

## Geber-Typ-Klassifikation

| Frage | Optionen | Gewählt |
|---|---|---|
| Wirtschaftspreis | Neues foerderpreisTyp-Feld / Heuristik aus bestehenden Feldern / **Explizite Mapping-Tabelle lib/wizard/geber-classification.ts** | ✓ Mapping-Tabelle |
| Auswertungs-Typen | 8 GeberTypen / **4-5 strategische Gruppen (öffentlich/Stiftung/EU/Wirtschaftspreis/Verband+Uni)** / Beide | ✓ 4-5 strategische Gruppen |
| Pflege | Claude+Kolja+Cron / **Nur 11 Dossiers initial gemappt, weitere ad-hoc** / Manuelle Kolja-Pflege | ✓ Nur 11 initial |

---

## Edge-Cases + Finanzplan-Eval

| Frage | Optionen | Gewählt |
|---|---|---|
| Edge-Cases | **UAT-realistische Stress-Fälle (vag-extrem + Datensatz-Lücken + Programm-Mismatch + Widerspruch + BL-Konflikt)** / Strukturelle / Claude-generiert | ✓ UAT-realistisch (7 konkrete Cases) |
| Finanzplan-Metrik | **Ja, neue Sub-Metrik 'Finanzplan-Validity' aus finanzplan-validator.ts** / Teil von WIZ-01/-02 / Hybrid Sub-Metrik im Report | ✓ Neue Sub-Metrik |
| Validator-Hook | **Direkt nach finanzplan-stage in Pipeline (GenerationArtefacts lesen)** / Eval-Skript ruft separat | ✓ Direkt nach finanzplan-stage |

---

## Reproducibility / LLM-Determinismus

| Frage | Optionen | Gewählt |
|---|---|---|
| Variabilität | **Mean of N=3 für Baseline, Single-Run für Iteration** / Immer N=3 / Single-Run Temp=0+Seed | ✓ Mean of N=3 Baseline, Single Iteration |
| Toleranz | **Std-Abweichung × 2 als Toleranz-Band (2σ statistisch grounded)** / Festes 5%-Band / Achsen-spezifische Toleranz | ✓ 2σ-Band |
| Baseline-Format | **mean+stddev in BASELINE.md, alle 3 Einzelresultate in reports/<ISO>.json** / Nur Mean | ✓ mean+stddev + Einzelresultate |

---

## Feature-Flags + UI-Hint

| Frage | Optionen | Gewählt |
|---|---|---|
| Feature-Flags | **Ja alle 4 Hebel Env-Var-gesteuert (PIPELINE_USE_VORBILD_FORMULIERUNGEN, etc.)** / Nur 2 / Keine | ✓ Alle 4 Env-Var |
| UI-Hint | **Keine UI-Berührung (UI-hint aus ROADMAP streichen)** / Optional GeneratingProgress 8 Stages / Admin-Dashboard | ✓ Keine UI-Berührung |
| Live-Smoke | **Ja 1 Live-Pipeline-Run mit nicht-Korpus-Anliegen vor Closure** / Nein (Eval reicht) / Hybrid | ✓ Ja Live-Smoke |

---

## Phase-Wave-Struktur

| Frage | Optionen | Gewählt |
|---|---|---|
| Phase-2-Dep | Nein parallel / **Ja warten auf Phase-2-Closure (Konsistenz)** / Planning jetzt, Execution wartet | ✓ Warten auf Phase-2-Closure |
| Plan-Anzahl | **6-8 Plans in 3-4 Wellen (analog Phase 4)** / 10-12 granular / 4-5 kompakt | ✓ 6-8 Plans / 3-4 Wellen |
| Wave-Parallelität | **Tuning-Hebel-Welle parallel (4 Hebel disjunkt)** / Sequenziell / Hybrid | ✓ Tuning parallel |

---

## Test-Skelette + Wave-0

| Frage | Optionen | Gewählt |
|---|---|---|
| Wave-0 | **Ja Test-Skelette für eval-pipeline.ts + geber-classification.ts + finanzplan-validator-wrapper.ts** / Inline / Hybrid | ✓ Wave-0 Test-Skelette |
| Test-Typen (multi) | Unit (Score-Berechnung), Integration (Snapshot-Korpus), Live-Smoke, Determinismus | ✓ ALLE 4 |
| Test-Pfad | **__tests__/eval/ (Sibling)** / scripts/__tests__/ | ✓ __tests__/eval/ |

---

## Dokumentations-Output + ROADMAP-Update

| Frage | Optionen | Gewählt |
|---|---|---|
| ROADMAP-Edit-Timing | **Im 1. Plan der Phase 5 (Wave 0, expliziter Step)** / Pre-Plan durch Planner / Letzter Plan vor Closure | ✓ Wave 0 expliziter Step |
| Docs (multi) | data/eval/README.md, CLAUDE.md Eval-Sektion, .planning/codebase/STACK.md, data/eval/TUNING.md-Playbook | ✓ ALLE 4 |
| Crit-Update | **#5 gestrichen + Crits #1-4 angepasst auf konservative Schwellwerte** / #5 nur gestrichen / #5 + #4 auf 4-5 Gruppen | ✓ #5 raus + konservative Schwellwerte |

---

## Claude's Discretion

Aus Diskussion ergeben — keine konkreten User-Wahlen, sondern Bereiche die der Planner/Researcher selbst entscheidet:

- Konsolen-Tabellen-Formatierung des Eval-Skripts
- Snapshot-Dateinamenschema-Details
- LLM-Judge-Rubric-Wortlaut pro strategischer Geber-Gruppe (Researcher schlägt vor, Kolja kann editieren)
- Konkrete `expected_forbidden_markers[]` pro Korpus-Eintrag (Claude generiert, Kolja reviewt)
- Score-Range-Normalisierung pro WIZ-Achse
- Feature-Flag-Default-Werte
- `data/eval/TUNING.md`-Format
- ROADMAP-Wortlaut-Feintuning

## Deferred Ideas

Aus Diskussion abgeleitet — explizit nicht Phase-5-Scope:

- WIZ-02-Layer-3 LLM-Judge als CI-Default (--deep bleibt optional in Phase 5)
- Eval-Result-Admin-Dashboard (`/admin/eval`-UI)
- NDCG-light / Position-aware Tonalitäts-Metrik
- Score-Erwartungen pro Pflichtabschnitt (Mindest-Länge)
- Real-User-Anliegen-Sammlung mit Anonymisierungs-Workflow
- Pipeline-Stage-Reorder
- Multi-Provider-A/B (OpenAI/Anthropic)
- Auto-Tuning-Pipeline (RLHF)
- GeneratingProgress-Erweiterung auf 8 Stages
- Phase-5-Parallel-Start zu Phase 2
- Per-Eintrag-N=10-Stability-Tests
- Seed-basierte Determinismus
- Auto-Klassifikation neuer Programme im Phase-4-Workflow
