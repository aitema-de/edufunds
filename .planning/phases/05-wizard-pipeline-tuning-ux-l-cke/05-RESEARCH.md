# Phase 5: Wizard-Pipeline-Tuning + UX-Luecke — Research

**Researched:** 2026-05-19
**Domain:** LLM-Pipeline-Evaluation, Halluzinations-Detection, LLM-as-Judge, Snapshot/Replay-Tooling
**Confidence:** HIGH (Stack + Patterns sind aus Phase 1 vorhanden; Judge-Rubric-Design + Layer-2-Regex sind MEDIUM, da neu fuer dieses Repo)

> Sprache: deutsche Doku-Konvention dieser Codebasis (`CLAUDE.md` Repo-Root) — ASCII mit ae/oe/ue/ss in Markdown/Code-Identifiern, weil bestehende Phase-Docs + Code dieser Konvention folgen. Globale `ä/ö/ü/ß`-Regel wird vom Projekt-CLAUDE.md ueberschrieben (siehe Konventions-Sektion).

## Summary

Phase 5 baut die Pipeline-Eval-Apparatur **als 1-zu-1-Spiegel von Phase 1** auf — selbe Verzeichnisstruktur (`data/eval/pipeline-*`), selbes Skript-Pattern (`scripts/eval-pipeline.ts`), selbes Snapshot/Replay-Konzept (D-07/D-14), selbe append-only `BASELINE.md`-Pflege. Das groesste Risiko ist **nicht** das Eval-Skript an sich, sondern die **Daten-Vorbedingungen**: nur 1 von 11 Dossiers (`kultur-macht-stark`) hat alle vier Phase-3-Felder (vorbildFormulierungen + bestPractices + rejectGruende + maxZeichen). Phase 4 sollte das geschlossen haben, hat es aber laut Survey nicht (siehe `## Daten-Vorbedingungen-Befund`). Das beeinflusst WIZ-01 (maxZeichen-Check geht ins Leere bei 0 maxZeichen-Eintraegen) und Hebel 3 (vorbildFormulierungen-Injection wirkt nur bei kultur-macht-stark + aktion-mensch). Wave 0 muss diesen Befund eskalieren bevor das Eval-Skript gebaut wird.

Der **3-Layer-Halluzinations-Detection-Ansatz** (D-09 Marker / Regex / optional LLM-Judge) ist solide etabliert in der LLM-Eval-Literatur (G-Eval, lighteval, lm-eval-harness) und passt strukturell zur UAT-28.04.-Marker-Liste. Layer 1 (Marker pro Eintrag) gibt 95 % der Detection mit 0 LLM-Cost, Layer 2 (Regex) faengt strukturell typische Erfindungen (Aktenzeichen-Muster, TV-L-Codes, DD.MM.YYYY-Daten), Layer 3 ist `--deep`-only.

Das **LLM-as-Judge-Rubric** fuer WIZ-03 ist der wackeligste Teil — alle Quellen warnen vor LLM-Judge-Inkonsistenz (Liu et al. 2023, „G-Eval"). Mitigationen: rubric-basierte Scoring statt freier Skala, niedrige Temperatur, JSON-structured Output, **N=3-Mean mit 2σ-Toleranz** (D-16/-17) faengt das Rauschen ab.

**Primary recommendation:** Wave 0 startet mit zwei harten Pre-Flight-Checks: (1) Daten-Vorbedingung Phase-3-Felder pro Dossier dokumentieren + Eskalation an Kolja, (2) Test-Skelette fuer Eval-Score-Berechnung schreiben (kein LLM). Wave 1 kann dann Korpus + Geber-Mapping parallel kuratieren. Wave 2 baut das Eval-Skript gegen die Test-Skelette.

## User Constraints (from CONTEXT.md)

### Locked Decisions

Zitate aus `05-CONTEXT.md` `<decisions>` — die nachfolgenden 36 Decisions sind ohne weitere Diskussion gesetzt; Plan-Phase darf NICHT alternativen explorieren:

**Eval-Korpus-Strategie:**
- **D-01:** Korpus-Groesse 20-25, Pfad `data/eval/pipeline-korpus.json`
- **D-02:** Hybrid 60 % UAT-Real / 40 % synthetisch+kuratiert
- **D-03:** 1 Standard pro 11 Dossiers + 5-7 Stress-Edge-Cases
- **D-04:** Antwort-Qualitaets-Mix 50 % vag / 30 % mittel / 20 % hochwertig
- **D-05:** 7 Edge-Case-Typen (vag-extrem, Profil fehlt, Programm-Mismatch, widerspruechlich, BL-Konflikt, lange-Antworten, Antrag-Rueckspruenge)
- **D-06:** Eintrag-Struktur: `programmId` + `schul-profil` + `user-antworten[]` (`ChatMessage`) + pre-extrahierte `WizardFacts`. Skip Interview-Stage.
- **D-07:** **Pflicht-Snapshot, Replay-Default**. `--live` fuer LLM-Lauf. Snapshots `data/eval/pipeline-snapshots/<ISO>/<entry-id>.json`.

**Metriken:**
- **D-08:** WIZ-01 = strict FK auf `antragsstruktur.abschnitte[].id` + harter maxZeichen-Check
- **D-09:** WIZ-02 = 3-Layer-Hybrid (Marker + Regex + optional LLM-Judge mit `--deep`)
- **D-10:** WIZ-03 = LLM-as-Judge mit Rubric, **4-5 strategische Geber-Gruppen** (oeffentlich / Stiftung / EU / Wirtschaftspreis / Verband+Uni)
- **D-11:** Finanzplan als WIZ-Sub-Metrik, NICHT eigene Top-Level-Achse. Validity-Score aus `finanzplan-validator.ts`.
- **D-12:** 3 Haupt-Scores + Finanzplan-Sub + Per-Dossier + Per-Geber-Gruppe-Breakdown. JSON in `data/eval/pipeline-reports/<ISO>.json` + Konsolen-Tabelle + `--md-summary`.
- **D-13:** Baseline = HEAD `feature/wizard-adaptive` (Phase-4-Closure-Commit). 1x Baseline-Run, Commit-SHA + Datum in `data/eval/BASELINE.md`.
- **D-14:** Marker-Listen Hybrid (Claude generiert, Kolja reviewt — wie Phase 1 D-08)
- **D-15:** Judge-LLM `deepseek-chat` default, `--pro-judge` schaltet auf `deepseek-v4-pro`

**Reproducibility:**
- **D-16:** Baseline = Mean of N=3 Runs pro Eintrag (Iteration: Single-Run). Bei Gate-FAIL: automatischer N=3-Re-Run.
- **D-17:** Threshold-Gate-Toleranz = Std-Abweichung x 2 (2σ ≈ 95 % Konfidenz).
- **D-18:** `BASELINE.md` mit mean+stddev pro Score; `reports/<ISO>.json` mit allen 3 Einzel-Ergebnissen.

**Tuning-Hebel:**
- **D-19:** Schwellwerte Phase-5: **WIZ-01 ≥ 80 % Pflichtabschnitte, WIZ-02 ≥ 50 % Marker-Reduktion, WIZ-03 Score-Delta > 0 pro Geber-Gruppe**.
- **D-20:** Alle 4 Hebel im Scope: Prompts schaerfen (CRITIQUE/SECTION/REVISION/RECHECK) + neue Stage `compliance-check` zwischen `recheck` und `done` + Dossier-Daten (vorbildFormulierungen + bestPractices + rejectGruende) in SECTION/REVISION injizieren + Geber-Routing ausbauen.
- **D-21:** Hebel-Reihenfolge eval-first datengetrieben. Wave 3 = 4 Plans parallel, da disjunkte Code-Pfade.
- **D-22:** 4 Env-Var-gesteuerte Feature-Flags: `PIPELINE_USE_VORBILD_FORMULIERUNGEN` / `PIPELINE_COMPLIANCE_STAGE` / `PIPELINE_SHARP_PROMPTS` / `PIPELINE_GEBER_ROUTING_V2`. Default-Werte konfiguriert in `lib/wizard/config.ts` (neu).
- **D-23:** Wenn Schwellwert nicht erreicht: 2. Tuning-Welle in derselben Phase 5, NICHT 5.1.

**Threshold-Gate:**
- **D-24:** Eval-Skript als Pflicht-Vorabcheck bei PRs mit `lib/wizard/**` oder `data/richtlinien/**`. Default-CI-Aufruf ist `--replay` (kein LLM-Cost).
- **D-25:** Achsen-spezifischer Block-Status: WIZ-01 = hart (jede Regression unter Baseline-2σ); WIZ-02 = mittel (block bei > 10 % Regression); WIZ-03 = warning-only.
- **D-26:** Korpus-Updates erfordern Baseline-Recalc im selben PR (1x `--live` + `BASELINE.md`-Eintrag mit Begruendung).
- **D-27:** CI-Workflow `.github/workflows/pipeline-eval.yml`, PR-Trigger auf `lib/wizard/**` + `data/richtlinien/**`, manual-dispatch, parsed Report-JSON fuer GitHub-Annotation pro Achse.

**Geber-Classification:**
- **D-28:** Neues Modul `lib/wizard/geber-classification.ts` mit Mapping Programm-ID → strategische Geber-Gruppe.
- **D-29:** 4-5 strategische Cluster ueberschreiben 8 GeberTypen.

**Wave-Struktur:**
- **D-30:** 6-8 Plans in 4 Wellen
- **D-31:** Wave-0 ROADMAP-Update + REQUIREMENTS Traceability + Test-Skelette / Wave-1 Korpus + Geber-Mapping parallel / Wave-2 Eval-Skript + Baseline-Lauf / Wave-3 4 Tuning-Plans parallel / Wave-4 CI-Gate + Pre-Closure-Smoke + Doku
- **D-32:** Jest-Tests in `__tests__/eval/` mit LLM-Stubs/Mocks
- **D-33:** Phase 5 wartet auf Phase 2 (Konsistenz, disjunkte Code-Pfade)

**Doku + ROADMAP-Edit:**
- **D-34:** ROADMAP.md-Edit im 1. Plan der Phase 5 (Wave 0): Crit #5 streichen (Reload-Resume → 02.1), `UI hint: yes` streichen, Crits #1-4 auf konservative Schwellwerte umformulieren, Crit #1 um Finanzplan-Validity-Sub-Metrik erweitern. REQUIREMENTS.md Traceability entsprechend.
- **D-35:** Doku-Output: `data/eval/README.md` + `CLAUDE.md` (Eval-Sektion) + `STACK.md` (Eval-Apparat) + `data/eval/TUNING.md` (append-only Playbook).
- **D-36:** Pre-Closure: 1 Live-Pipeline-Run mit nicht-Korpus-Anliegen vor Phase-Closure (verhindert Korpus-Overfitting).

### Claude's Discretion

- Konsolen-Tabellen-Formatierung im Eval-Skript (ASCII vs `cli-table3`)
- Snapshot-Datei-Schema (Sub-Ordner pro Run-Datum vs flach mit Hash) — Empfehlung dieser Research: Sub-Ordner pro ISO (Phase-1-Konvention beibehalten)
- Parallelitaet der Pipeline-Calls (sequenziell ist OK)
- LLM-Judge-Rubric-Wortlaut pro Geber-Gruppe (Research schlaegt vor, siehe `## WIZ-03 Judge-Rubric-Design`)
- Konkrete `expected_forbidden_markers[]` pro Eintrag (Claude generiert, Kolja reviewt)
- Score-Range-Normalisierung pro WIZ-Achse — Empfehlung dieser Research: alle auf 0-100, weil das in `BASELINE.md` aggregierbar ist und 2σ-Berechnung konsistent macht
- Feature-Flag-Defaults — Empfehlung: alle 4 default OFF in `lib/wizard/config.ts`, ON nur via Env-Var. Wave 3 misst Delta per Hebel ein/aus. Nach erfolgreichem Tuning: Defaults werden in finalem Plan auf ON gesetzt.
- `data/eval/TUNING.md`-Format — Empfehlung: tabellarisch + ein „Run-Memo"-Block pro Tuning-Iteration
- ROADMAP-Wortlaut-Feintuning (Bedeutung entspricht D-34)

### Deferred Ideas (OUT OF SCOPE)

- WIZ-04 Reload-Resume (in Phase 02.1 erledigt, Phase 5 streicht nur ROADMAP-Eintrag)
- UI-Polish, neue Pipeline-Stages mit UI-Anzeige (compliance-check ist silent)
- WIZ-02-Layer-3 LLM-Judge als CI-Default (bleibt `--deep`-only in Phase 5)
- Eval-Result-Admin-Dashboard, NDCG-light, Position-aware Tonalitaets-Metrik
- Score-Erwartungen pro Pflichtabschnitt (Mindest-Laenge)
- Real-User-Anliegen-Sammlung mit Anonymisierungs-Workflow (Phase 6 Sache)
- Pipeline-Stage-Reorder, Multi-Provider-A/B, Auto-Tuning/RLHF
- GeneratingProgress.tsx 8-Stage-Erweiterung
- Per-Eintrag-N=10-Stability-Tests, Seed-basierter Determinismus (DeepSeek Seed-Param ist nur teilweise implementiert)
- Auto-Klassifikation neuer Programme im Phase-4-Workflow

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **WIZ-01** | Pipeline-Tuning fuer hoehere Programmkonformitaet (Eval gegen Pflichtabschnitte / Zeichenlimits aller 11 Dossiers) | `## WIZ-01 strict FK-Match-Logik` — FK auf `richtlinie.antragsstruktur.abschnitte[].id`, Output kommt aus `GenerationArtefacts.sections[].name`. **ACHTUNG:** keines der 11 Dossiers hat aktuell `maxZeichen` gesetzt — siehe `## Daten-Vorbedingungen-Befund`. |
| **WIZ-02** | Pipeline-Tuning fuer hoehere Halluzinations-Resistenz (Eval mit verschaerften niedrig-qualitativen Test-Inputs) | `## WIZ-02 3-Layer-Hybrid-Detection` — Marker (D-09 L1) + Regex (D-09 L2) + optional LLM-Judge (D-09 L3 `--deep`). Anchor: UAT-28.04. mit 8 dokumentierten Markern. |
| **WIZ-03** | Pipeline-Tuning fuer hoehere Foerderwahrscheinlichkeit (semantische Qualitaet, „passt-zum-Geber"-Tonalitaet) | `## WIZ-03 LLM-as-Judge Rubric-Design` — 4-5 strategische Geber-Cluster mit eigener Rubric-Definition pro Cluster. Mapping in `lib/wizard/geber-classification.ts` (D-28). |

(WIZ-04 Reload-Resume ist NICHT in Phase 5 — Phase 5 streicht es nur aus ROADMAP/REQUIREMENTS gemaess D-34.)

## Architectural Responsibility Map

Phase 5 ist Backend/Tooling-only — kein Frontend, keine DB-Migrationen. Folgende Tier-Zuordnung:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Eval-Korpus | Daten / Repo | — | Versionierte JSON-Datei `data/eval/pipeline-korpus.json` analog `matcher-korpus.json` |
| `eval-pipeline.ts` Skript | Node-CLI (npx tsx) | — | Folgt etablierter `scripts/`-Konvention; ruft `runPipeline()` aus `lib/wizard/pipeline.ts` direkt |
| Pipeline-Code | Backend `lib/wizard/` | — | Tuning-Targets sind Prompts + neue Stage + Geber-Routing + Dossier-Injection — alle in `lib/wizard/` |
| LLM-Judge-Call | Backend (DeepSeek API via `lib/wizard/llm.ts`) | — | Wiederverwendet Provider-Wrapper, kein neuer Provider noetig |
| Geber-Classification | Backend `lib/wizard/geber-classification.ts` (neu) | — | Mapping-Tabelle Programm-ID → strategische Geber-Gruppe; pure TS-Modul ohne IO |
| Feature-Flags | Backend `lib/wizard/config.ts` (neu) | — | Env-Var-Read am Modul-Start, kein Side-Effect |
| Compliance-Stage | Backend `lib/wizard/pipeline.ts` | Backend `types.ts` (PipelineStage-Erweiterung) | Stage emittiert NICHT an GeneratingProgress → keine Frontend-Aenderung noetig |
| CI-Workflow | GitHub Actions (`.github/workflows/pipeline-eval.yml`) | — | Sibling zu `weekly-auto-pflege.yml` |
| Snapshots / Reports | Daten / Repo (`data/eval/pipeline-snapshots/` + `data/eval/pipeline-reports/`) | — | Versioniert wie Phase-1-Snapshots/Reports |

**Sanity:** Keine Capabilities mit falschem Tier — alles ist klar Backend/Tooling. Frontend bleibt unangetastet.

## Daten-Vorbedingungen-Befund (CRITICAL)

Survey ueber alle 11 Dossiers in `data/richtlinien/` (Stand 2026-05-19):

| Dossier | Pflicht-Abschnitte | maxZeichen-set | vorbildFormul. | bestPractices | rejectGruende |
|---------|-------------------|----------------|---------------|---------------|---------------|
| aktion-mensch-schulkooperation | 7 | **0** | 3 | 2 | **0** |
| berlin-startchancen | **0** | **0** | **0** | 1 | **0** |
| bmbf-digitalpakt-2 | 6 | **0** | **0** | 2 | **0** |
| bosch-schulpreis | 6 | **0** | **0** | 3 | **0** |
| ensam-bmz | 8 | **0** | **0** | 5 | 5 |
| erasmus-schule-2026 | **0** | **0** | **0** | **0** | **0** |
| erasmus-schulentwicklung | 4 | **0** | **0** | 2 | 4 |
| ferry-porsche-challenge-2025 | **0** | **0** | **0** | **0** | 4 |
| ferry-porsche-challenge | **0** | **0** | **0** | **0** | 3 |
| klimalab-2026 | **0** | **0** | **0** | **0** | **0** |
| kultur-macht-stark | 7 | **0** | 4 | 4 | 4 |

**Implikationen fuer Phase 5:**

1. **WIZ-01 strict-FK-Check (D-08) hat Daten-Loecher:** 6 von 11 Dossiers haben gar keine Pflicht-Abschnitte definiert (`berlin-startchancen`, `erasmus-schule-2026`, beide ferry-porsche-Versionen, `klimalab-2026`). Eval-Skript muss diese als „kein FK-Check moeglich, Score = n/a" markieren. Eintraege im Korpus, die solche Dossiers referenzieren, koennen nur WIZ-02/-03 messen.
2. **maxZeichen-Check (D-08) ist aktuell ungemessen:** 0/11 Dossiers haben das Feld gesetzt. Plan-Phase muss eskalieren: entweder (a) Pre-Phase-5-Step „Pflicht-maxZeichen-Befuellung" (1 Plan in Phase 4-Nachzug), oder (b) WIZ-01-Schwellwert konsistent ohne maxZeichen formulieren (z.B. „Pflichtabschnitte-Coverage allein"). **Empfehlung:** Variante (b) — Phase-5-Schwellwert 80 % aus D-19 bezieht sich primaer auf Abschnitt-IDs; maxZeichen-Aspekt bleibt im Eval-Schema als optionaler Soft-Check, falls Daten kommen. Wave-0-Plan dokumentiert das in `BASELINE.md`-Methodik-Sektion.
3. **Hebel 3 (D-20 #3) wirkt nur teilweise:** Dossier-Injection mit `vorbildFormulierungen[]` greift nur fuer `aktion-mensch-schulkooperation` (3) und `kultur-macht-stark` (4) — die anderen 9 Dossiers haben `vorbildFormulierungen: []` oder `undefined`. Eval misst Delta nur fuer diese 2. Plan-Phase entweder: vorbildFormulierungen pro Dossier minimal befuellen (out of scope laut Phase 5) ODER Hebel 3 nur fuer diese 2 Dossiers im A/B-Eval messen.
4. **bestPractices vs rejectGruende:** `aktion-mensch`, `bmbf-digitalpakt-2`, `bosch-schulpreis` und 4 weitere haben `bestPractices` aber 0 `rejectGruende`. `ferry-porsche-challenge` (beide Versionen) hat das Gegenteil. Hebel 3 muss flexibel sein.

**Empfohlene Wave-0-Aktion (PLAN-PHASE-Eskalation):** Vor dem Eval-Skript-Bau soll der Planner einen kurzen `pre-flight-data-survey.md`-Plan in Wave 0 ergaenzen — `npx tsx scripts/survey-richtlinien-felder.ts` (existiert nicht, ist ein 30-Zeilen-Skript), Output in `data/eval/dossier-coverage-baseline.md`. Wenn 0/11 maxZeichen-Felder befuellt sind, in `BASELINE.md` explizit machen: „WIZ-01 in Phase-5-Baseline ist Abschnitt-IDs-only".

## Standard Stack

### Core (alles bereits im Repo, KEIN neuer Dependency)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai (DeepSeek-kompatibel) | ^6.34.0 | `lib/wizard/llm.ts` Provider-Wrapper, `deepseek-chat` default | Etabliert seit 28.04. fuer alle LLM-Calls; Phase 5 erbt 60s-Timeout + Cost-Ledger |
| zod | ^3.24.1 | `lib/wizard/richtlinien-validator.ts` Strict-Schema | FK-Check auf `antragsstruktur.abschnitte[].id` laeuft schon hierueber; Eval-Skript kann denselben Validator wiederverwenden |
| pg | ^8.18.0 | Datenbank-Client | Nur fuer `--from-db`-Modus (Korpus-Eintraege aus echten Sessions ziehen) — Phase 5 nutzt das NICHT default, weil D-06 pre-extrahierte Korpus-Daten verwendet |
| tsx | ^4.21.0 | `npx tsx scripts/eval-pipeline.ts` Direkt-Ausfuehrung | Repo-Konvention fuer alle Skripte |
| jest | ^29.7.0 | `__tests__/eval/` Unit + Integration | D-32 Wave-0-Test-Skelette |
| node:fs/promises + node:path | Node 20 builtins | Datei-IO fuer Korpus, Snapshots, Reports | Phase-1-Pattern aus `eval-matcher.ts` |

### Supporting (alles im Repo, NICHT neu installieren)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lib/wizard/pipeline.ts` (Repo) | — | `runPipeline()` ist die Eval-API | Eval-Skript ruft das direkt mit Korpus-Eintraegen auf |
| `lib/wizard/facts-extractor.ts` (Repo) | — | `WizardFacts` pre-extrahieren fuer Korpus-Eintraege (D-06) | Reduziert Eval-Variabilitaet; Korpus speichert pre-extrahierte Facts, Eval-Skript skipt Extractor-Stage |
| `lib/wizard/finanzplan-validator.ts` (Repo) | — | `validateFinanzplan()` → `ValidationResult.okFuerFreigabe` ist Finanzplan-Validity-Score-Input (D-11) | Eval ruft Validator nach Pipeline-Run, zaehlt error-Level-Warnungen |
| `lib/wizard/finanzplan-autofix.ts` (Repo) | — | Optional: Eval misst „valid vor Autofix" vs „valid nach Autofix"-Delta (D-11) | Existiert schon, kein neuer Code |
| `lib/wizard/pricing.ts` (Repo) | — | `CostLedger`-Aggregation pro Eval-Eintrag | Phase-1-Pattern |
| `lib/wizard/richtlinien-loader.ts` (Repo) | — | Dossier-Lookup-Helper, derselbe Loader fuer Pipeline + Eval-FK-Match | Wiederverwendung — Eval-Skript laed Dossier nur einmal pro Eintrag |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Eigene mean/stddev-Berechnung inline | `simple-statistics` npm | Nicht noetig — N=3 mean+stddev sind 4 Zeilen inline. Keine neue Dependency. |
| `cli-table3` fuer Konsolen-Tabelle | Plain `console.log`-Spalten | Bestehende Smoke-Skripte nutzen Plain-Format (`scripts/eval-matcher.ts` Z.685-723). Konsistent bleiben. |
| LLM-Eval-Framework (lighteval, deepeval, ragas) | Inline-TypeScript-Skript | Bestehendes `eval-matcher.ts`-Pattern ist gut etabliert; externes Framework waere Overengineering fuer 20-25 Eintraege. Phase 5 etabliert nur die Eval-Apparatur, kein generisches Framework. |
| Snapshot-Format mit Hash-Dateinamen | Sub-Ordner pro Run-ISO | Phase 1 nutzt ISO-Sub-Ordner (`data/eval/snapshots/2026-05-04-12-32-24/`). Konsistent bleiben. |
| OpenAI / Anthropic als Judge-LLM | DeepSeek (selber Provider) | Cost / Diversifikation — out-of-scope per REQUIREMENTS (DeepSeek + Gemini-Fallback reichen). |

**Installation:** Keine. Alle benoetigten Pakete sind im Repo (`npm ci` reicht).

**Version verification:** Nicht erforderlich — keine neuen Dependencies. Bestehende Versionen sind in Phase 3+4 validiert. `tsx ^4.21.0`, `jest ^29.7.0`, `openai ^6.34.0`, `zod ^3.24.1`, `pg ^8.18.0` (alle aus `.planning/codebase/STACK.md` Stand 2026-04-30).

## Architecture Patterns

### System Architecture Diagram

```
              ┌───────────────────────────────────────────────────────────────┐
              │   data/eval/pipeline-korpus.json (20-25 Korpus-Eintraege)     │
              │   - programmId + schul-profil + user-antworten + facts        │
              │   - expected_forbidden_markers[] (Layer-1, D-09)              │
              │   - expected_geber_gruppe (D-28-Lookup-Result)                │
              └────────────────────────────┬──────────────────────────────────┘
                                           │
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│   scripts/eval-pipeline.ts  (CLI mit --replay default, --live, --deep, --N)   │
│                                                                                │
│   pro Korpus-Eintrag:                                                          │
│                                                                                │
│   ┌──────────────────┐    ┌───────────────────┐    ┌────────────────────────┐ │
│   │ Live-Modus       │ -- │ runPipeline()     │ -- │ Snapshot schreiben     │ │
│   │ (DeepSeek-Calls) │    │ aus pipeline.ts   │    │ (data/eval/pipeline-   │ │
│   └──────────────────┘    │ liefert           │    │ snapshots/<ISO>/...)   │ │
│   ┌──────────────────┐    │ GenerationArte-   │    └────────────────────────┘ │
│   │ Replay-Modus     │ -- │ facts             │                                │
│   │ (Snapshot-Load)  │    └─────────┬─────────┘                                │
│   └──────────────────┘              │                                          │
│                                     ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐  │
│   │  Score-Berechnung pro Eintrag (kein LLM noetig fuer L1/L2)             │  │
│   │                                                                         │  │
│   │  WIZ-01: GenerationArtefacts.sections[].name → FK-Match auf             │  │
│   │          richtlinie.antragsstruktur.abschnitte[].id|name                │  │
│   │          (+ optional maxZeichen-Check bei Dossiers die das haben)      │  │
│   │                                                                         │  │
│   │  WIZ-02: GenerationArtefacts.sections[].text + finalText + finanzplan  │  │
│   │          → Layer 1: grep gegen expected_forbidden_markers[]            │  │
│   │          → Layer 2: Regex (Az/TV-L/DD.MM.YYYY/Haushaltsstelle)         │  │
│   │          → Layer 3 (opt --deep): LLM-Judge mit Quellen-Anker            │  │
│   │                                                                         │  │
│   │  WIZ-03: GenerationArtefacts.finalText → LLM-Judge-Call mit             │  │
│   │          Rubric pro geber-classification(programmId) (D-28)             │  │
│   │                                                                         │  │
│   │  Finanzplan-Sub: validateFinanzplan(artefacts.finanzplan, richtlinie)  │  │
│   │                  → okFuerFreigabe + #error-Level-Warnungen              │  │
│   └─────────────────────────────────────────┬──────────────────────────────┘  │
│                                              │                                 │
│                                              ▼                                 │
│   Aggregation: mean+stddev pro Score ueber N=3-Wiederholungen (--N=3)         │
│                                              │                                 │
│                                              ▼                                 │
└──────────────────────────────────────────────┼─────────────────────────────────┘
                                               ▼
       ┌──────────────────────────────────────────────────────────────────┐
       │  data/eval/pipeline-reports/<ISO>.json (Audit-Trail, N=3-Detail) │
       │  data/eval/pipeline-reports/<ISO>.md  (PR-lesbar, mean+stddev)   │
       │  data/eval/BASELINE.md (append-only, Phase-5-Eintrag manuell)    │
       │  Konsolen-Tabelle (3 Haupt-Scores + Sub + Per-Dossier-Breakdown) │
       │  Exit-Code 1 wenn Threshold-Gate-FAIL (D-24/-25)                 │
       └──────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
       ┌──────────────────────────────────────────────────────────────────┐
       │  .github/workflows/pipeline-eval.yml                              │
       │  PR-Trigger auf lib/wizard/** + data/richtlinien/**               │
       │  → npx tsx scripts/eval-pipeline.ts --replay --md-summary         │
       │  → GitHub-Annotation pro Achse (parsed aus reports/<ISO>.json)    │
       │  → process.exit(1) bei Gate-FAIL → PR blocked                     │
       └──────────────────────────────────────────────────────────────────┘
```

**Trace des Primary Use Case:** Entwickler aendert SECTION_SYSTEM-Prompt in `lib/wizard/prompts.ts` → PR offen → CI laeuft `eval-pipeline.ts --replay` gegen letzten Snapshot-Satz → Score-Berechnung gegen Marker + FK + Judge → JSON-Report → 2σ-Vergleich gegen `BASELINE.md` → exit 0/1 → PR-Status gruen/rot. Live-Modus wird nur bei Baseline-Refresh + Korpus-Aenderung gefahren (D-26).

### Recommended Project Structure

```
edufunds-app/
├── data/
│   ├── eval/
│   │   ├── matcher-korpus.json                # Phase 1 (existiert)
│   │   ├── matcher-snapshots/                 # Phase 1 (existiert, "snapshots/")
│   │   ├── matcher-reports/                   # Phase 1 (existiert, "reports/")
│   │   ├── BASELINE.md                        # append-only — Phase 5 ergaenzt
│   │   ├── pipeline-korpus.json               # NEU Phase 5 (Wave 1)
│   │   ├── pipeline-snapshots/                # NEU Phase 5
│   │   │   └── 2026-05-XX-HH-MM-SS/
│   │   │       ├── ev-001.json
│   │   │       └── ...
│   │   ├── pipeline-reports/                  # NEU Phase 5
│   │   │   ├── 2026-05-XX-HH-MM-SS.json
│   │   │   └── 2026-05-XX-HH-MM-SS.md
│   │   ├── README.md                          # NEU Phase 5 (Wave 4, D-35)
│   │   ├── TUNING.md                          # NEU Phase 5 (Wave 4, D-35)
│   │   └── dossier-coverage-baseline.md       # NEU Phase 5 (Wave 0, Pre-Flight)
│   └── richtlinien/                           # 11 Dossiers (existieren)
│
├── lib/wizard/
│   ├── pipeline.ts                            # Tuning Wave 3 (compliance-check Stage)
│   ├── prompts.ts                             # Tuning Wave 3 Hebel 1
│   ├── geber-guidance.ts                      # Tuning Wave 3 Hebel 4 (Rubrics schaerfen)
│   ├── programm-kriterien.ts                  # Tuning Wave 3 Hebel 4 (ExtraGuidance ergaenzen)
│   ├── geber-classification.ts                # NEU Phase 5 Wave 1 (D-28)
│   ├── config.ts                              # NEU Phase 5 Wave 1 (D-22 Feature-Flags)
│   ├── types.ts                               # Wave 3: PipelineStage erweitern um "compliance-check"
│   ├── finanzplan-validator.ts                # unveraendert, wiederverwendet
│   └── (alle existierenden Module)
│
├── scripts/
│   ├── eval-matcher.ts                        # Phase 1 (Pattern-Vorbild)
│   ├── eval-pipeline.ts                       # NEU Phase 5 Wave 2
│   ├── survey-richtlinien-felder.ts           # NEU Phase 5 Wave 0 (Pre-Flight)
│   └── smoke-pipeline-*.ts                    # bestehende Smoke-Skripte (Pattern-Vorbild)
│
├── __tests__/eval/                            # NEU Phase 5 Wave 0 (D-32)
│   ├── pipeline-fk-match.test.ts              # WIZ-01 Score-Logik
│   ├── pipeline-marker-detection.test.ts      # WIZ-02 L1 Marker-Logik
│   ├── pipeline-regex-detection.test.ts       # WIZ-02 L2 Regex-Patterns
│   ├── pipeline-judge-rubric.test.ts          # WIZ-03 Rubric mit LLM-Stub
│   ├── pipeline-finanzplan-sub.test.ts        # Finanzplan-Sub-Metrik
│   ├── pipeline-snapshot-replay.test.ts       # D-07 Snapshot/Replay
│   ├── pipeline-determinism.test.ts           # D-16/-17 N=3 mean+stddev
│   └── pipeline-aggregation.test.ts           # Per-Geber-Gruppe-Breakdown
│
└── .github/workflows/
    ├── weekly-auto-pflege.yml                 # Phase 4 (Sibling-Vorbild)
    └── pipeline-eval.yml                      # NEU Phase 5 Wave 4 (D-27)
```

### Pattern 1: Eval-Korpus-JSON-Schema (Phase 5)

**What:** Pro Eintrag in `data/eval/pipeline-korpus.json` werden alle Inputs fuer `runPipeline()` PLUS die Erwartungen fuer Score-Berechnung gespeichert. JSON-Array auf Top-Level (Phase-1-Konvention D-04).

**When to use:** Korpus-Wave 1, Snapshot-Generation Wave 2, Replay-Score-Logik in CI Wave 4.

**Example:**

```typescript
// Source: Phase-5-Eigen-Entwurf, abgeleitet aus matcher-korpus.json + D-06
interface PipelineKorpusEntry {
  // === Identifier ===
  id: string;                                  // z.B. "pv-001" (Pipeline-eVal-001)
  category: "vag" | "mittel" | "hochwertig";  // D-04 Qualitaets-Mix
  edgeCase?:
    | "vag-extrem"
    | "profil-fehlt"
    | "programm-mismatch"
    | "widerspruechlich"
    | "bl-konflikt"
    | "antworten-zu-lang"
    | "antrag-spruenge";                       // D-05

  // === Pipeline-Inputs (D-06) ===
  programmId: string;                          // muss in foerderprogramme.json existieren
  schulProfil: {
    name?: string;
    typ?: string;
    bundesland?: string;
    schuelerzahl?: number;
    besonderheiten?: string;
  };
  userAnswers: Array<{
    role: "ai" | "user";
    kind: "question" | "answer";
    content: string;
  }>;                                          // ChatMessage-Sub-Array (D-06)
  facts: WizardFacts;                          // pre-extrahiert, skipt Interview-Stage

  // === WIZ-02 Erwartungen (D-09 Layer 1) ===
  expected_forbidden_markers: Array<{
    marker: string;                            // exakte Substring, case-insensitive
    description: string;                       // warum dieser Marker hier = Halluzination
  }>;

  // === WIZ-03 Erwartungen (D-28 Geber-Cluster) ===
  expected_geber_gruppe:
    | "oeffentlich"
    | "stiftung"
    | "eu"
    | "wirtschaftspreis"
    | "verband-uni";

  // === Kuratoren-Notiz (Phase-1-Pattern D-08) ===
  notes?: string;                              // warum dieser Eintrag im Korpus, Quelle UAT/synth
}
```

**Pro Korpus-Eintrag generiert ein Live-Lauf:**

```typescript
// data/eval/pipeline-snapshots/2026-05-XX-HH-MM-SS/pv-001.json
interface PipelineSnapshot {
  korpus_id: string;                           // FK auf pipeline-korpus.json[i].id
  input: {                                     // genau das, was an runPipeline() ging
    programm: Foerderprogramm;
    facts: WizardFacts;
    richtlinie: Richtlinie | null;
    messages: WizardMessage[];
  };
  result: {                                    // Output von runPipeline()
    artefacts: GenerationArtefacts;
    usages: PipelineUsage[];
  };
  meta: {
    iso: string;
    runIndex: 1 | 2 | 3;                       // D-16 N=3
    pipelineCommitSha: string;                 // git rev-parse HEAD
    featureFlags: Record<string, string>;      // D-22 Feature-Flag-Snapshot
    latencyMs: number;
  };
}
```

### Pattern 2: 3-Layer-Halluzinations-Detection (WIZ-02)

**What:** Layer 1 = O(n)-Substring-Grep gegen Marker-Liste pro Eintrag. Layer 2 = Regex-Pass ueber `finalText + sections[].text + finanzplan-Begruendungen` mit ~6-8 generischen Patterns. Layer 3 = LLM-Judge mit Quellen-Anker, nur unter `--deep`.

**When to use:** Score-Berechnung pro Eintrag, nach Snapshot-Generation oder im Replay.

**Example:**

```typescript
// Source: Eigen-Entwurf basierend auf UAT-28.04.-Marker + LLM-Eval-Literatur (G-Eval pattern)
interface Wiz02Score {
  layer1_marker_hits: Array<{
    marker: string;
    foundIn: "section" | "finalText" | "finanzplan-bezeichnung" | "finanzplan-begruendung";
    snippet: string;                           // 60 Zeichen um den Hit (Audit-Trail)
  }>;
  layer2_regex_hits: Array<{
    pattern: "aktenzeichen" | "tv-l-code" | "datum-praezise" | "haushaltsstelle" | "kmk-zitat" | "rahmenvertrag" | "mdm-loesung";
    match: string;
    foundIn: "section" | "finalText" | "finanzplan-begruendung";
    falsePositiveCheck: "user-stated" | "facts-stated" | "neither";  // bei "neither": echte Halluzination
  }>;
  layer3_judge_findings?: Array<{              // nur bei --deep
    statement: string;
    classification: "belegt" | "unbelegt-aber-plausibel" | "erfunden";
    judgeReasoning: string;
  }>;
  score: number;                               // 0-100, hoeher = besser (weniger Halluzinationen)
}

// Layer 1 Implementation (deterministisch, keine LLM)
function detectMarkers(
  artefacts: GenerationArtefacts,
  expectedForbidden: KorpusEntry["expected_forbidden_markers"]
): Array<MarkerHit> {
  const haystack = [
    artefacts.finalText ?? "",
    ...(artefacts.sections ?? []).map((s) => `[${s.name}] ${s.text}`),
    ...(artefacts.finanzplan?.posten.map((p) => `${p.bezeichnung} ${p.begruendung ?? ""}`) ?? []),
  ].join("\n");
  const lower = haystack.toLowerCase();
  return expectedForbidden
    .filter((m) => lower.includes(m.marker.toLowerCase()))
    .map((m) => ({ marker: m.marker, snippet: extractContext(haystack, m.marker, 60) }));
}

// Layer 2 Implementation (Regex)
// Source: UAT-28.04.-Marker + DigitalPakt-2.0-Antrags-Konventionen
const HALLU_REGEX_PATTERNS = {
  aktenzeichen: /\b(?:Az\.?|G\.?Z\.?|Gz\.?)\s*[:.]?\s*\d{1,5}\s*\/\s*(?:19|20)\d{2}\b/gi,
  // Beispiel-Hits: "Az 123/2026", "Az. 4711/2024", "GZ: 99/2025"
  tv_l_code: /\bTV[\s-]?L\s*E?\d{1,2}[a-z]?\b/gi,
  // Beispiel-Hits: "TV-L E9", "TV L 13", "TVL E11a"
  datum_praezise: /\b(?:0?[1-9]|[12]\d|3[01])\.(?:0?[1-9]|1[0-2])\.(?:19|20)\d{2}\b/g,
  // Beispiel-Hits: "12.12.2025", "15.03.2026". FILTERN gegen user-stated dates!
  haushaltsstelle: /\bHaushaltsstelle\s+\d{2,5}\s*\/\s*\d{3,7}\b/gi,
  kmk_zitat: /\bKMK[-\s]Strategie\s+["„]Bildung\s+in\s+der\s+digitalen\s+Welt["“]?/gi,
  rahmenvertrag: /\bRahmenvertrag(?:s|es)?\b/gi,
  mdm_loesung: /\bMDM[-\s]?L(?:oesung|ösung)\b/gi,
};

function detectRegexHits(
  artefacts: GenerationArtefacts,
  userAnswers: string[],
  facts: WizardFacts
): Array<RegexHit> {
  // ... iteriert ueber Patterns, prueft falsch-positiv via userAnswers + facts
  // (z.B. wenn User "Bezirksamt Berlin-Mitte" SELBST nennt, ist es im Output keine Halluzination)
}
```

**Regex-Pattern-Begruendung pro Pattern:**

| Pattern | Quelle | False-Positive-Risiko | Mitigation |
|---------|--------|----------------------|------------|
| `aktenzeichen` | UAT-28.04. Marker „Az 123/2026" | Wenn User selbst Aktenzeichen nennt | Cross-Check gegen `userAnswers.join().match(pattern)` |
| `tv_l_code` | UAT-28.04. „TV-L E9" | Wenn Schule mit Tarif-Eingruppierung umgeht | userAnswers-Check |
| `datum_praezise` | UAT-28.04. „12.12.2025" / „15.03.2026" | Schulkonferenz-Daten koennen real sein | userAnswers-Check + facts-Check |
| `haushaltsstelle` | UAT-28.04. „1234/56789" | Sehr selten legitim im Antrag | Niedrige FP-Rate, kein Check noetig |
| `kmk_zitat` | UAT-28.04. KMK-Marker | KMK-Bezug kann legitim sein, wenn User explizit nennt | userAnswers-Check (z.B. „KMK kenne ich" ist explizites Nicht-Kennen) |
| `rahmenvertrag` | UAT-28.04. „MDM-Loesung", „Rahmenvertraege" | Schultraeger nutzen das real | userAnswers-Check, ggf. context-deletion bei `kein Rahmenvertrag` |
| `mdm_loesung` | UAT-28.04. Marker | Mobile-Device-Management ist legitim wenn aus DP1 da | userAnswers-Check + facts.schule.besonderheiten-Check |

### Pattern 3: LLM-as-Judge mit Rubric (WIZ-03)

**What:** Pro strategischer Geber-Gruppe gibt es eine Rubric mit 4-6 Kriterien. Judge-LLM bewertet `artefacts.finalText` gegen die Rubric in einem strukturierten JSON-Output (Score 0-100 pro Kriterium + Gesamt-Score).

**When to use:** Score-Berechnung WIZ-03 pro Eintrag. LIVE-Modus, weil Judge-Output Snapshot-Teil ist (Replay-Modus liest Judge-Score aus Snapshot, nicht neu berechnet).

**Example:**

```typescript
// Source: Eigen-Entwurf basierend auf LLM-Eval-Literatur (G-Eval, rubric scoring)
//         + bestehende lib/wizard/geber-guidance.ts critiqueFocus-Bloecke

interface JudgeRubric {
  gruppe: GeberGruppe;
  kriterien: Array<{
    id: string;                                // z.B. "messbare-wirkung"
    name: string;
    beschreibung: string;                      // 1-2 Saetze, was der Judge konkret prueft
    gewichtung: number;                        // Summe der gewichtungen = 100
  }>;
  gesamtBeschreibung: string;                  // 2-3 Saetze, was die Gruppe als Geber will
}

// Beispiel-Rubric "oeffentlich" (Bund + Land aggregiert):
const RUBRIC_OEFFENTLICH: JudgeRubric = {
  gruppe: "oeffentlich",
  gesamtBeschreibung: `Bundes- und Landes-Foerderungen erwarten sachliche, evidenzbasierte
Antraege mit klaren Wirkungs-Indikatoren, Bezug zu Bildungsstrategien (KMK, Bildungsplan,
DigitalPakt-Kontext) und expliziter Strukturverankerung der Nachhaltigkeit. Pathos-Sprache,
PR-Stil oder erzaehlerische Anfaenge sind Negativ-Signale.`,
  kriterien: [
    {
      id: "messbare-wirkung",
      name: "Messbare Wirkungs-Indikatoren",
      beschreibung: "Sind Wirkungs-Aussagen mit quantifizierbaren Indikatoren versehen (Teilnehmende, Stunden, Vorher/Nachher)? Oder bleiben sie generisch ('verbessert Lernerfolg')?",
      gewichtung: 25,
    },
    {
      id: "strategiebezug",
      name: "Bezug zu Bildungsstrategien",
      beschreibung: "Adressiert der Antrag explizit nationale/landesweite Bildungsstrategien (KMK, Bildungsplan)? Konkret verankert oder nur abstrakte Erwaehnung?",
      gewichtung: 20,
    },
    {
      id: "transferfaehigkeit",
      name: "Transferfaehigkeit",
      beschreibung: "Wird beschrieben, wie das Vorhaben auf andere Schulen uebertragbar ist? Strukturell verankert oder nur 'lessons learned' abstrakt?",
      gewichtung: 15,
    },
    {
      id: "kooperationen",
      name: "Externe Kooperationen",
      beschreibung: "Werden konkrete externe Partner (Hochschule, Stiftung, Betrieb) mit Namen + Rolle benannt? Oder abstrakt 'externe Partner'?",
      gewichtung: 15,
    },
    {
      id: "nachhaltigkeit-struktur",
      name: "Strukturelle Nachhaltigkeit",
      beschreibung: "Ist die Nachhaltigkeit ueber das Foerderende hinaus strukturell beschrieben (Curriculum-Verankerung, Personal-Plan, Betrieb-Konzept)? Oder hohl ('wird fortgefuehrt')?",
      gewichtung: 15,
    },
    {
      id: "tonalitaet",
      name: "Tonalitaets-Passung",
      beschreibung: "Sachlich-fachlicher Ton? Oder PR-Glanz / Pathos-Formeln / Floskeln ('passgenau', 'innovativ', 'zukunftsweisend')?",
      gewichtung: 10,
    },
  ],
};
```

**Rubric-Vorschlaege pro Gruppe (Claude's Discretion — Kolja darf editieren):**

| Gruppe | Kriterien (Stichworte) | Wertung 0-100 |
|--------|------------------------|---------------|
| **oeffentlich** (bund+land) | messbare-wirkung 25 / strategiebezug 20 / transferfaehigkeit 15 / kooperationen 15 / nachhaltigkeit-struktur 15 / tonalitaet 10 | Sachlich-strategiebezogen |
| **stiftung** | mission-passung 25 / konkrete-szene 20 / zielgruppe-spezifisch 15 / wirkung-narrativ 15 / ehrlichkeit 15 / tonalitaet 10 | Erzaehlerischer, menschlich, ehrlich (keine PR-Glanz) |
| **eu** | europaeischer-mehrwert 25 / querschnittsthemen 20 / partnerschaft-konkret 15 / evaluation-dissemination 15 / innovation 15 / tonalitaet 10 | Formell, EU-Konventionen, explizit zu EU-Prioritaeten |
| **wirtschaftspreis** | story-driven 25 / vorhaben-praegnant 20 / wirkung-konkret 15 / glaubwuerdigkeit 15 / preis-eignung 15 / tonalitaet 10 | Knapp, story-driven, Schul-als-Ganzes-Perspektive |
| **verband-uni** | fachlich-belegt 25 / methodik-explizit 20 / zielgruppe-spezifisch 15 / wirkung-evidenz 15 / kooperationen 15 / tonalitaet 10 | Sachlich-evidenzbasiert, weniger Pathos, fachterminologie OK |

**Judge-LLM-Prompt-Skeleton (deepseek-chat default, D-15):**

```typescript
const JUDGE_SYSTEM = `Du bist ein erfahrener Foerdermittel-Gutachter. Deine einzige Aufgabe:
einen vorgelegten Foerderantrag gegen eine spezifische Rubric zu bewerten, die auf den
Geber-Typ zugeschnitten ist. Du urteilst pro Kriterium 0-100, vergibst danach einen
Gesamt-Score (gewichteter Mittelwert) und nennst pro Kriterium 1 konkreten Beleg
(Zitat aus dem Antrag) plus 1 Verbesserungs-Hinweis.

## Anti-Halluzinations-Regel
Du bewertest NUR was im vorgelegten Antrag steht. Du erfindest keine Bewertungs-
Grundlagen. Wenn ein Kriterium im Antrag nicht adressierbar ist, score < 40 und
"nicht erwaehnt" als Beleg.

## Ausgabe
AUSSCHLIESSLICH valides JSON, kein Markdown-Fence:
{
  "kriterien": [
    {
      "id": "messbare-wirkung",
      "score": 0..100,
      "beleg": "max 120 Zeichen Zitat oder 'nicht erwaehnt'",
      "verbesserung": "1 Satz, was die Revision tun sollte"
    }
  ],
  "gesamt": 0..100,
  "summary": "1-2 Saetze Gesamteindruck"
}`;

function buildJudgePrompt(antragText: string, rubric: JudgeRubric): string {
  return `RUBRIC (Geber-Gruppe: ${rubric.gruppe}):
${rubric.gesamtBeschreibung}

KRITERIEN:
${rubric.kriterien.map(k => `[${k.id}] ${k.name} (Gewichtung ${k.gewichtung}%)
  ${k.beschreibung}`).join("\n\n")}

ANTRAG (zu bewerten):
${antragText}

Bewerte den Antrag streng gegen die Rubric. JSON-Output gemaess Schema im System-Prompt.`;
}
```

**Determinismus-Tricks fuer Judge (LLM-as-Judge ist rauschig — D-25 macht WIZ-03 deshalb warning-only):**

- `response_format: { type: "json_object" }` erzwingt structured Output (deepseek + openai-API)
- `maxTokens: 2000` (Rubric mit 6 Kriterien × ~200 Tokens = ~1200 Tokens Output)
- N=3 Mean (D-16) deckt LLM-Varianz ab
- Keine Temperatur-Anpassung — DeepSeek-API hat `temperature` Default 1.0; auf 0 setzen via `temperature: 0` wenn moeglich (DeepSeek-API supports temperature). **Empfehlung Plan-Phase:** explizit `temperature: 0` im Judge-Call testen.

### Pattern 4: Snapshot/Replay mit Score-Logik-Iteration

**What:** Live-Modus erzeugt N=3 Snapshots pro Korpus-Eintrag und schreibt sie weg. Replay-Modus liest Snapshots, fuehrt aber Score-Berechnung neu durch — erlaubt Score-Logik-Aenderungen ohne LLM-Cost.

**When to use:** Default-CI-Run (D-24 Replay). Score-Logik-Iteration in Phase 5 (Wave 2 + Wave 3 Iterationen).

**Example:** Adaptiert aus `scripts/eval-matcher.ts` Z.283-330 (Phase-1-Pattern).

```typescript
async function loadReplaySnapshot(
  replayDir: string,
  entryId: string,
  runIndex: 1 | 2 | 3
): Promise<PipelineSnapshot> {
  // Pfad-Konvention: data/eval/pipeline-snapshots/<ISO>/<entry-id>-run<N>.json
  const snapPath = resolve(REPO, replayDir, `${entryId}-run${runIndex}.json`);
  const raw = await readFile(snapPath, "utf-8");
  return JSON.parse(raw) as PipelineSnapshot;
}

async function evaluateEntry(
  entry: PipelineKorpusEntry,
  flags: Flags,
  runIndex: 1 | 2 | 3
): Promise<EntryScore> {
  let snapshot: PipelineSnapshot;
  if (flags.replayDir) {
    snapshot = await loadReplaySnapshot(flags.replayDir, entry.id, runIndex);
  } else {
    // Live-Modus: runPipeline() ausfuehren
    snapshot = await runPipelineForKorpus(entry, runIndex);
    if (flags.snapshot) await writeSnapshot(snapshot, flags.snapshotDir);
  }

  // Score-Berechnung — IMMER live, auch im Replay-Modus
  const wiz01 = scoreWiz01(snapshot.result.artefacts, snapshot.input.richtlinie);
  const wiz02 = scoreWiz02(snapshot.result.artefacts, entry.expected_forbidden_markers,
                          entry.userAnswers, entry.facts, flags.deep);
  const wiz03 = await scoreWiz03(snapshot.result.artefacts.finalText ?? "",
                                  classifyGeber(entry.programmId), flags.judgeModel);
  const finanzplanSub = scoreFinanzplan(snapshot.result.artefacts.finanzplan,
                                         snapshot.input.richtlinie);
  return { ...wiz01, ...wiz02, ...wiz03, finanzplanSub, snapshot };
}
```

### Pattern 5: Compliance-Stage als 8. Pipeline-Stage (D-20 Hebel 2)

**What:** Zwischen `recheck` und `done` ein neuer LLM-Call, der strict gegen `richtlinie.antragsstruktur.abschnitte[].id` + maxZeichen prueft und bei Verletzung eine Revision triggert. Maximal 1 Iteration (Loop-Count), sonst Schleifen-Risiko.

**When to use:** Wave 3 Hebel 2 (Feature-Flag `PIPELINE_COMPLIANCE_STAGE`).

**Example-Skeleton:**

```typescript
// lib/wizard/pipeline.ts (Wave 3 Hebel 2)

// 1. PipelineStage erweitern in types.ts:
export type PipelineStage =
  | "outline" | "section" | "critique" | "revision" | "recheck"
  | "compliance-check"          // NEU Wave 3
  | "finanzplan" | "consistency" | "done";

// 2. In runPipeline() nach recheck einfuegen:
if (config.complianceStageEnabled && richtlinie?.antragsstruktur?.abschnitte) {
  emit({ stage: "compliance-check", message: "Pflichtabschnitt-Check" });
  const complianceCheck = await runComplianceCheck(
    finalRes.value,                            // aktuell finaler Text
    richtlinie.antragsstruktur.abschnitte
  );
  usages.push(complianceCheck.usage);

  if (complianceCheck.violations.length > 0 && !complianceLoopCount) {
    // Trigger 1x Revision mit explizitem Compliance-Findings-Input
    const revFix = await generateText(
      MODEL_PRO,
      REVISION_SYSTEM,
      buildComplianceRevisionPrompt(finalRes.value, complianceCheck.violations)
    );
    finalRes.value = revFix.value;
    usages.push({ model: MODEL_PRO, usage: revFix.usage });
    complianceLoopCount = 1;  // verhindert Schleife
  }
}

// 3. ComplianceCheck-Schema:
interface ComplianceCheck {
  violations: Array<{
    abschnittId: string;
    art: "fehlt" | "ueberlaenge" | "nur-platzhalter";
    detail: string;
  }>;
  usage: PipelineUsage;
}
```

**SILENT-Verhalten gegenueber GeneratingProgress:** Die `emit()`-Calls sind unveraendert weitergereicht, aber das Frontend rendert nur die 7 bekannten Stages. Wenn `stage="compliance-check"` ankommt, ignoriert GeneratingProgress.tsx das (TypeScript-Type-Erweiterung gibt Compile-Error — siehe Anti-Pattern unten). **Mitigation:** In GeneratingProgress.tsx einen kleinen Map-Fallback einbauen `if (stage === "compliance-check") return null;` ODER `stage`-Type-Erweiterung in `types.ts` als Union, GeneratingProgress.tsx zeigt nur die 7 bekannten an. Plan-Phase entscheidet (D-20 sagt „silent stage").

### Anti-Patterns to Avoid

- **Korpus-Drift: Pipeline-Snapshots versionieren OHNE den Korpus zu pinen.** Wenn ein Eintrag in `pipeline-korpus.json` geaendert wird (z.B. user-antwort umformuliert), aber Snapshot vom alten Run noch im Replay-Verzeichnis liegt, vergleicht das Skript Aepfel mit Birnen. **Mitigation:** Korpus-Eintrag-ID + `korpus_id` im Snapshot — wenn Mismatch oder Korpus-Hash-Drift: explizit fail im Replay (analog `migrateOldSnapshot` Pattern in eval-matcher.ts).
- **Marker-Liste vom Eval-Skript SELBST gegen Output gegen User-Antworten haendisch verkreuzen.** False-Positive-Risiko: wenn User selbst „TV-L E9" sagt, ist es im Output legitim. **Mitigation:** Layer 1 Marker sind RAW (kein Cross-Check, weil Kuratorin sicherstellt dass Marker nur Halluzinations-Marker sind); Layer 2 Regex MUSS Cross-Check gegen `userAnswers + facts` — sonst false-positive-Pflicht.
- **Judge-Call ohne `temperature: 0` / structured Output.** Output rauscht zu stark fuer 2σ-Toleranz aus N=3. **Mitigation:** explizit `response_format: { type: "json_object" }` und niedrige Temperatur.
- **N=3-Variance-Berechnung mit Bessel-Korrektur (N-1).** Bei N=3 ist (N-1)=2, das macht stddev 50 % groesser als N. Phase-1-Pattern: arithmetisches Mean, stddev mit N (population) — konsistent mit eval-matcher.ts-Aggregat. Plan-Phase: dokumentieren in `BASELINE.md`-Methodik.
- **Eval-Skript schreibt selbst in BASELINE.md.** Phase-1-D-16: BASELINE.md ist manuell-gepflegt, Skript schreibt nur Reports. Konsistent bleiben.
- **`compliance-check`-Stage ohne Loop-Count.** Bei Hebel 2 ohne Loop-Count koennte Pipeline endlos zwischen `compliance-check` und `revision` pendeln. **Mitigation:** Max 1 Iteration (siehe Code-Skeleton oben).
- **Feature-Flag-Defaults auf ON in `lib/wizard/config.ts`.** Wenn alle Hebel default ON sind, kann Wave 3 keinen Delta-pro-Hebel messen. **Mitigation:** Defaults OFF, ON nur via Env-Var. Nach erfolgreichem Tuning Wave 4 in finalem Plan auf ON.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost-Tracking pro LLM-Call | Eigenes Cost-Tracking | `CostLedger` aus `lib/wizard/pricing.ts` | Existiert, integriert mit `runPipeline()`-Output |
| Pipeline-Run-API | Eigene Pipeline-Variante fuer Eval | `runPipeline()` aus `lib/wizard/pipeline.ts` | Read-only Aufruf, kein neuer Code |
| Schema-Validation | Eigene FK-Check-Logik | `validateRichtlinieStrict` (oder analog) aus Phase 3 + zod | Phase 3 hat schon FK-Validation, wiederverwenden |
| `WizardFacts`-Extraktion | Eigenen Extractor schreiben | `facts-extractor.ts` (existiert) | Korpus speichert pre-extrahierte Facts gemaess D-06 |
| Finanzplan-Validity | Eigene Plan-Pruefung | `validateFinanzplan` aus `finanzplan-validator.ts` | Existiert, `ValidationResult.okFuerFreigabe` ist direkt nutzbar |
| LLM-Provider-Switch | Eigenen DeepSeek-Client | `generateJson`/`generateText` aus `lib/wizard/llm.ts` | 60s-Timeout, Cost-Logs, Provider-Switch eingebaut |
| Mean+Stddev-Berechnung | npm-Paket (`simple-statistics`) | Inline-Funktion (~5 Zeilen) | N=3 ist trivial, npm-Overhead |
| GitHub-Action-Skeleton | Workflow von Grund auf | `.github/workflows/weekly-auto-pflege.yml` als Sibling-Vorbild | Phase-4-Workflow-Haertungs-Pattern: `set -euo pipefail`, Secret-Pre-Flight, env-Mapping |

**Key insight:** Phase 5 ist primaer Glue-Code zwischen existierenden Modulen. Der wertvolle Code ist (a) Korpus-Daten (D-14 Hybrid-Kuration), (b) Score-Berechnungs-Funktionen pro WIZ-Achse, (c) Judge-Rubric-Definitionen. Alles andere wiederverwenden.

## Runtime State Inventory

Phase 5 ist eine Greenfield-Build-Phase (Eval-Apparat neu), keine Rename/Refactor/Migration. **Diese Sektion entfaellt** — keine bestehenden stored data, live config, OS-registered state, secrets oder build artifacts werden umbenannt oder migriert.

**Einzige neue Build-Artefakte:**
- `data/eval/pipeline-snapshots/<ISO>/` (auto-erzeugt vom Eval-Skript)
- `data/eval/pipeline-reports/<ISO>.json` + `.md`

Beide sind transient (analog Phase-1-Snapshots/Reports). Plan-Phase entscheidet ob sie in `.gitignore` kommen (Phase 1 Decision: Korpus versioniert, Snapshots+Reports `.gitignore`'d). **Empfehlung:** Same Pattern fuer Pipeline-Eval — `pipeline-snapshots/` + `pipeline-reports/` in `.gitignore`. Baseline-Snapshot wird force-committed (analog Phase 1 D-Threat-Model T-01-09).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20 | Eval-Skript, Tests, CI | ✓ | 20 (CI pinned, Linux/WSL lokal) | — |
| npm | Dependency Install | ✓ | aus Node 20 | — |
| DeepSeek API (DEEPSEEK_API_KEY) | Live-Modus, Baseline-Lauf, Judge-Call | (project-state-abhaengig) | — | Gemini via `LLM_PROVIDER=gemini` (existiert in llm.ts) |
| Gemini API (GEMINI_API_KEY) | Fallback wenn DeepSeek 0 Balance | (project-state-abhaengig) | — | Eval kann nur Replay bei kompletten LLM-Outage |
| Postgres | NICHT noetig (D-06: Korpus skipt DB) | n/a | n/a | n/a — Phase 5 nutzt KEINE DB-Lookups |
| GitHub Actions Runner | CI-Workflow `pipeline-eval.yml` | ✓ (existiert fuer weekly-auto-pflege) | ubuntu-latest | manual-dispatch |

**Hinweis aus STATE.md (2026-05-19):** DeepSeek hatte zwischenzeitlich Insufficient Balance — vor Phase-5-Start Top-Up oder Gemini-Fallback verifizieren. Phase 5 Baseline-Lauf braucht ~3-4 EUR Live-Budget (D-01). Plan-Phase eskaliert das in Wave 0.

**Keine blocking missing dependencies** — Gemini-Fallback existiert, falls DeepSeek-Balance-Issue auftritt.

## Common Pitfalls

### Pitfall 1: Markdown-Parsing zwischen Pipeline-Output und Marker-Detection

**What goes wrong:** `runPipeline()` liefert `artefacts.sections[]` (strukturiert) UND `artefacts.finalText` (Markdown von REVISION_SYSTEM mit `# Titel` + `## Abschnitt`). Marker-Detection muss BEIDE durchsuchen, sonst wird ein Marker im finalText (nach Revision) uebersehen.
**Why it happens:** REVISION-Stage rendert den Antrag neu zu Markdown — `sections[]` ist der pre-revision-State, `finalText` ist der post-revision-State.
**How to avoid:** WIZ-02-Detection nutzt `finalText` als primary haystack; `sections[]` als secondary (falls finalText leer wegen pipeline-Fail).
**Warning signs:** Test mit UAT-28.04.-Snapshot zeigt 8/8 Marker im sections-Layer aber nur 3/8 im finalText — heisst Revision hat sie geloescht, was sehr gut ist. Eval misst gegen finalText.

### Pitfall 2: Finanzplan-Marker werden bei reiner finalText-Suche uebersehen

**What goes wrong:** Finanzplan ist eine eigene Datenstruktur (`artefacts.finanzplan.posten[].bezeichnung + .begruendung`), nicht in finalText eingebettet. UAT-28.04. „TV-L E9", „180 EUR Honorar" waren im Finanzplan, nicht im finalText.
**Why it happens:** Pipeline-Output ist multimodal (Text + JSON-strukturiertes Finanzplan-Objekt).
**How to avoid:** Marker-Detection-Haystack baut explizit aus `finalText + sections[].text + finanzplan.posten[].bezeichnung + finanzplan.posten[].begruendung`.
**Warning signs:** Marker `TV-L` wird in Section-Test-Eintrag 0× gefunden, aber Mensch sieht ihn im UI. Pruefen: Code-Pfad scant alle drei Quellen.

### Pitfall 3: Snapshot-Format-Drift zwischen Phase 1 und Phase 5

**What goes wrong:** Wenn Snapshot-Schema sich aendert, brechen Replays alter Baselines. Phase-1-eval-matcher hat schon eine `migrateOldSnapshot()`-Shim (Z.283-320).
**Why it happens:** Schema-Evolution ist normal; aber Snapshots sind Audit-Trail (BASELINE.md verweist auf Snapshot-Ordner).
**How to avoid:** PipelineSnapshot-Schema versioniert: `meta.schemaVersion: 1`. Eval-Skript laedt Snapshot, prueft Version, weigert sich bei Mismatch (kein silent-migrate — sonst rutschen Daten-Probleme durch).
**Warning signs:** Plan-Phase bemerkt "alte Phase-5-Snapshots werden im Replay anders gescort" — versioned Snapshots verhindern das.

### Pitfall 4: Geber-Classification fehlt fuer Programm das nicht in den 11 Dossiers ist

**What goes wrong:** Korpus-Eintraege referenzieren ggf. `programmId` aus `data/foerderprogramme.json` (131 Programme), nicht nur die 11 Dossiers. WIZ-03 Judge-Call braucht `expected_geber_gruppe` aus `geber-classification.ts` — wenn das Programm nicht gemappt ist, fallback?
**Why it happens:** Korpus-Coverage (D-03) sagt 1 Eintrag pro Dossier + 5-7 Stress-Edge-Cases. Edge-Cases koennen Programm-Mismatch (D-05 #3) testen — dort ist die `programmId` evtl. ausserhalb der 11.
**How to avoid:** `lib/wizard/geber-classification.ts` mit `getGeberGruppe(programmId): GeberGruppe | "unknown"` — bei `unknown` (a) Eval-Eintrag explizit als Korpus-Konfiguration markieren `skipWiz03: true`, oder (b) Fallback auf `foerdergeberTyp`-basierte Default-Mapping (z.B. `bund/land → oeffentlich`, `stiftung → stiftung`, `eu → eu`, `verband → verband-uni`, `programm → wirtschaftspreis`).
**Warning signs:** Console-Warning beim Eval-Lauf „programmId ferry-porsche-challenge nicht in geber-classification.ts gemappt — Fallback auf foerdergeberTyp".

### Pitfall 5: LLM-Judge-Antwort ist nicht-deterministisch trotz `temperature: 0`

**What goes wrong:** DeepSeek-API `temperature: 0` reduziert Varianz, eliminiert sie nicht. Judge-Score 0-100 schwankt um ±5 Punkte zwischen Runs.
**Why it happens:** Tokenizer-Sampling ist nicht voll deterministisch (siehe DeepSeek docs).
**How to avoid:** D-16/-17 N=3-Mean mit 2σ-Toleranz faengt das genau ab. Plan-Phase nicht versuchen Determinismus zu „loesen" — das ist by design erwartet.
**Warning signs:** Phase-5-Baseline-Run zeigt `stddev > 15` fuer WIZ-03 — dann ist die Rubric zu vage formuliert, nicht der LLM zu rauschig. Rubric praezisieren (Beispiel-Belege im Prompt, Anchor-Scores „score=80 entspricht solidem Antrag, 90 herausragend").

### Pitfall 6: maxZeichen-Check schlaegt fehl weil Pipeline keine Section-IDs liefert

**What goes wrong:** `GenerationArtefacts.sections[]` hat `{ name: string, text: string }` — KEIN `id`-Feld. FK-Match auf `richtlinie.antragsstruktur.abschnitte[].id` muss ueber `name`-String-Vergleich gehen.
**Why it happens:** Pipeline rendert die Section-Namen aus der Outline, die wiederum `abschnitte.name` (nicht `abschnitte.id`) verwendet — siehe `pipeline.ts:194` `name: a.name`.
**How to avoid:** WIZ-01 FK-Match nutzt Name-Vergleich (case-insensitive, optional Levenshtein-Toleranz fuer Tippfehler). Plan-Phase: explizit dokumentieren dass Match auf `abschnitte[].name`, NICHT `.id` laeuft. Alternativ Wave-3-Patch: `sections[]` um optional `abschnittId` erweitern, in Pipeline beim Section-Bau gesetzt — kleiner Eingriff, aber sauberer.
**Warning signs:** WIZ-01-Score fluktuiert um 5-10 % zwischen Live-Runs trotz N=3, weil Pipeline manchmal `Abschnitt: Bedarfsanalyse` und manchmal `Abschnitt: Bedarfsanalyse und Ausgangslage` schreibt. Plan-Phase: stricter normalize-string-Vergleich.

### Pitfall 7: Dossier-Coverage-Asymmetrie (siehe `## Daten-Vorbedingungen-Befund`)

**What goes wrong:** WIZ-01 maxZeichen-Check ist nicht messbar (0/11 Dossiers). Hebel 3 vorbildFormulierungen-Injection wirkt nur fuer 2/11 Dossiers.
**Why it happens:** Phase 4 hat das Strict-Schema NICHT vollstaendig auf bestehende Dossiers durchgesetzt — wahrscheinlich weil Phase-4-Decision Migrations „on-touch" macht, nicht „batch".
**How to avoid:** Wave 0 hat einen expliziten `pre-flight-data-survey`-Plan: `npx tsx scripts/survey-richtlinien-felder.ts` → `data/eval/dossier-coverage-baseline.md`. Wenn Phase 5 maxZeichen-Wert in Baseline einbauen will, vorher dokumentieren in BASELINE.md-Methodik-Sektion: „Phase-5-Baseline ist Abschnitt-Coverage-only, maxZeichen war 0/11 zum Run-Zeitpunkt".
**Warning signs:** Plan 5-1 ROADMAP-Edit (D-34 Crit #2) muss explizit „Pflichtabschnitte-Coverage 80 %" sagen, NICHT „Pflichtabschnitte + Zeichenlimits 80 %" — sonst ist die Closure-Bedingung unerreichbar.

## Code Examples

### WIZ-01 FK-Match Score-Berechnung

```typescript
// Source: Eigen-Entwurf, basierend auf lib/wizard/richtlinien-schema.ts AntragsAbschnitt
import type { Richtlinie, AntragsAbschnitt } from "@/lib/wizard/richtlinien-schema";
import type { GenerationArtefacts } from "@/lib/wizard/types";

interface Wiz01Result {
  pflichtAbschnitteTotal: number;
  pflichtAbschnitteCovered: number;
  coveragePercent: number;                     // 0-100
  maxZeichenOK: boolean | null;                // null wenn keine maxZeichen im Dossier
  maxZeichenViolations: Array<{
    abschnittName: string;
    maxZeichen: number;
    actualZeichen: number;
  }>;
  missingAbschnitte: string[];                 // Namen der nicht-abgedeckten Pflicht-Abschnitte
}

function normalizeAbschnittName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreWiz01(
  artefacts: GenerationArtefacts,
  richtlinie: Richtlinie | null
): Wiz01Result {
  if (!richtlinie?.antragsstruktur?.abschnitte) {
    return {
      pflichtAbschnitteTotal: 0,
      pflichtAbschnitteCovered: 0,
      coveragePercent: 100,                    // kein Pflicht-Abschnitt = trivial 100 %
      maxZeichenOK: null,
      maxZeichenViolations: [],
      missingAbschnitte: [],
    };
  }

  const pflichtAbschnitte = richtlinie.antragsstruktur.abschnitte.filter(
    (a) => a.pflicht !== false
  );
  const sectionNames = new Set(
    (artefacts.sections ?? []).map((s) => normalizeAbschnittName(s.name))
  );

  const covered = pflichtAbschnitte.filter((a) =>
    sectionNames.has(normalizeAbschnittName(a.name))
  );

  const missing = pflichtAbschnitte
    .filter((a) => !sectionNames.has(normalizeAbschnittName(a.name)))
    .map((a) => a.name);

  // maxZeichen-Check: nur wenn Dossier es setzt
  const maxZeichenAbschnitte = pflichtAbschnitte.filter(
    (a) => typeof a.maxZeichen === "number" && a.maxZeichen > 0
  );
  const violations: Wiz01Result["maxZeichenViolations"] = [];
  if (maxZeichenAbschnitte.length > 0) {
    for (const ab of maxZeichenAbschnitte) {
      const section = (artefacts.sections ?? []).find(
        (s) => normalizeAbschnittName(s.name) === normalizeAbschnittName(ab.name)
      );
      if (section && section.text.length > ab.maxZeichen!) {
        violations.push({
          abschnittName: ab.name,
          maxZeichen: ab.maxZeichen!,
          actualZeichen: section.text.length,
        });
      }
    }
  }

  return {
    pflichtAbschnitteTotal: pflichtAbschnitte.length,
    pflichtAbschnitteCovered: covered.length,
    coveragePercent: pflichtAbschnitte.length === 0
      ? 100
      : (covered.length / pflichtAbschnitte.length) * 100,
    maxZeichenOK: maxZeichenAbschnitte.length === 0 ? null : violations.length === 0,
    maxZeichenViolations: violations,
    missingAbschnitte: missing,
  };
}
```

### WIZ-02 Score-Berechnung (3-Layer, ohne LLM-Layer-3)

```typescript
// Source: Eigen-Entwurf, basierend auf UAT-28.04.-Marker-Liste + Regex-Patterns oben
interface Wiz02Result {
  layer1MarkerHits: number;                    // Anzahl Marker-Hits aus expected_forbidden_markers
  layer1MarkerExpected: number;                // Korpus-Eintrag.expected_forbidden_markers.length
  layer2RegexHits: number;                     // Anzahl Regex-Hits NICHT in userAnswers+facts belegt
  layer1MarkerHitsDetail: Array<MarkerHit>;
  layer2RegexHitsDetail: Array<RegexHit>;
  /** Score 0-100, hoeher = besser (weniger Halluzinationen) */
  score: number;
}

function scoreWiz02(
  artefacts: GenerationArtefacts,
  expectedForbidden: KorpusEntry["expected_forbidden_markers"],
  userAnswers: string[],
  facts: WizardFacts
): Wiz02Result {
  // Haystack baut auf finalText + sections[] + finanzplan-Begruendungen
  const haystackParts = [
    artefacts.finalText ?? "",
    ...(artefacts.sections ?? []).map((s) => `[${s.name}] ${s.text}`),
    ...(artefacts.finanzplan?.posten.map(
      (p) => `${p.bezeichnung} | ${p.begruendung ?? ""}`
    ) ?? []),
  ];
  const haystack = haystackParts.join("\n\n");
  const userSrc = userAnswers.join("\n").toLowerCase();
  const factsSrc = JSON.stringify(facts).toLowerCase();

  // === Layer 1: Marker-Hits ===
  const layer1Hits: Array<MarkerHit> = [];
  for (const m of expectedForbidden) {
    if (haystack.toLowerCase().includes(m.marker.toLowerCase())) {
      layer1Hits.push({
        marker: m.marker,
        snippet: extractContext(haystack, m.marker, 60),
        foundIn: detectSource(haystack, m.marker, artefacts),
      });
    }
  }

  // === Layer 2: Regex mit User-Cross-Check ===
  const layer2Hits: Array<RegexHit> = [];
  for (const [name, pattern] of Object.entries(HALLU_REGEX_PATTERNS)) {
    const matches = Array.from(haystack.matchAll(pattern));
    for (const m of matches) {
      const matchStr = m[0];
      const inUser = userSrc.includes(matchStr.toLowerCase());
      const inFacts = factsSrc.includes(matchStr.toLowerCase());
      layer2Hits.push({
        pattern: name,
        match: matchStr,
        falsePositiveCheck: inUser ? "user-stated" : inFacts ? "facts-stated" : "neither",
        snippet: extractContext(haystack, matchStr, 60),
      });
    }
  }

  // Score: % Marker NICHT gefunden + % Regex-Hits NICHT in user/facts
  const layer1Avoided = expectedForbidden.length - layer1Hits.length;
  const layer1Score = expectedForbidden.length === 0
    ? 100
    : (layer1Avoided / expectedForbidden.length) * 100;
  const layer2EchteHallus = layer2Hits.filter((h) => h.falsePositiveCheck === "neither").length;
  // Score-Penalty: 10 Punkte pro echter Layer-2-Halluzination (max -100)
  const layer2Penalty = Math.min(layer2EchteHallus * 10, 100);
  const score = Math.max(0, layer1Score - layer2Penalty);

  return {
    layer1MarkerHits: layer1Hits.length,
    layer1MarkerExpected: expectedForbidden.length,
    layer1MarkerHitsDetail: layer1Hits,
    layer2RegexHits: layer2EchteHallus,
    layer2RegexHitsDetail: layer2Hits,
    score,
  };
}
```

### Finanzplan-Validity-Sub-Metrik

```typescript
// Source: Eigen-Entwurf, basierend auf lib/wizard/finanzplan-validator.ts ValidationResult
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import { autofixFinanzplan } from "@/lib/wizard/finanzplan-autofix";   // optional pseudocode

interface FinanzplanSubResult {
  vorAutofix: {
    okFuerFreigabe: boolean;
    errorCount: number;
    warningCount: number;
    gesamtEur: number;
  };
  nachAutofix?: {
    okFuerFreigabe: boolean;
    errorCount: number;
    autofixActionsApplied: number;
  };
  hallu_marker_in_finanzplan: number;          // Marker-Hits restricted auf Finanzplan-Quelle
  /** Sub-Metrik-Score 0-100. okFuerFreigabe → 100, else 100 - 20*errorCount, min 0. */
  score: number;
}

function scoreFinanzplan(
  finanzplan: Finanzplan | undefined,
  richtlinie: Richtlinie | null,
  hallu_marker_in_finanzplan: number
): FinanzplanSubResult {
  if (!finanzplan) {
    return {
      vorAutofix: { okFuerFreigabe: false, errorCount: 0, warningCount: 0, gesamtEur: 0 },
      hallu_marker_in_finanzplan,
      score: 0,
    };
  }
  const v = validateFinanzplan(finanzplan, richtlinie);
  const errors = v.warnungen.filter((w) => w.level === "error").length;
  const warnings = v.warnungen.filter((w) => w.level === "warning").length;
  // Penalty: -20 pro Error, -5 pro Hallu-Marker im Finanzplan-Bereich
  const score = Math.max(0, 100 - errors * 20 - hallu_marker_in_finanzplan * 5);
  return {
    vorAutofix: {
      okFuerFreigabe: v.okFuerFreigabe,
      errorCount: errors,
      warningCount: warnings,
      gesamtEur: v.gesamtEur,
    },
    hallu_marker_in_finanzplan,
    score,
  };
}
```

### N=3 Mean + Stddev (Inline, kein npm)

```typescript
// Source: Eigen-Entwurf, basierend auf D-16/-17 + BASELINE.md-Format
interface ScoreStat {
  mean: number;
  stddev: number;                              // population stddev (N), nicht sample (N-1)
  runs: number[];                              // einzel-Scores fuer Audit
}

function aggregateNRuns(runs: number[]): ScoreStat {
  if (runs.length === 0) return { mean: 0, stddev: 0, runs: [] };
  const mean = runs.reduce((s, x) => s + x, 0) / runs.length;
  const variance =
    runs.reduce((s, x) => s + (x - mean) ** 2, 0) / runs.length;
  const stddev = Math.sqrt(variance);
  return { mean, stddev, runs };
}

// 2σ-Threshold-Gate (D-17):
function passesThreshold(
  current: ScoreStat,
  baseline: ScoreStat,
  axis: "WIZ-01" | "WIZ-02" | "WIZ-03"
): { passed: boolean; reason: string } {
  // WIZ-01 hart, WIZ-02 mittel, WIZ-03 warning-only (D-25)
  const twoSigma = baseline.stddev * 2;
  const drop = baseline.mean - current.mean;
  switch (axis) {
    case "WIZ-01":
      return { passed: drop <= twoSigma, reason: `drop=${drop.toFixed(2)}, 2σ=${twoSigma.toFixed(2)}` };
    case "WIZ-02":
      // mittel: block bei > 10 % Regression UEBER baseline-2σ
      return { passed: drop <= twoSigma + baseline.mean * 0.10, reason: `drop=${drop.toFixed(2)}, threshold=${(twoSigma + baseline.mean*0.10).toFixed(2)}` };
    case "WIZ-03":
      // warning-only: immer pass, drop nur loggen
      return { passed: true, reason: `drop=${drop.toFixed(2)} (warning-only)` };
  }
}
```

### BASELINE.md-Format-Skeleton (Phase-5-Eintrag, append-only)

```markdown
## 2026-05-XX — Phase-5-Pipeline-Baseline (Korpus v1, n=22)

- **Pipeline-Commit:** `<sha>` (HEAD von `feature/wizard-adaptive` nach Phase-4-Closure)
- **Korpus-Version:** v1, 22 Eintraege (11 Standard pro Dossier + 7 Stress-Edge-Cases + 4 Reserve)
- **Run-Konfiguration:** N=3 pro Eintrag, judgeModel `deepseek-chat`, alle Feature-Flags OFF
- **Methodik-Hinweis:** WIZ-01 ist Pflichtabschnitt-Coverage-only — `maxZeichen` war zum
  Run-Zeitpunkt in 0/11 Dossiers gesetzt (siehe `dossier-coverage-baseline.md`).
  Hebel 3 (vorbildFormulierungen) wirkt nur fuer aktion-mensch + kultur-macht-stark.

### Haupt-Scores (mean ± stddev ueber N=3)

| Achse | Mean | Stddev | 2σ-Band | Schwellwert | Status |
|-------|------|--------|---------|-------------|--------|
| WIZ-01 (Pflichtabschnitte) | XX.X | X.X | XX.X – XX.X | ≥ 80 % | ✓/✗ |
| WIZ-02 (Halluzinations-Detection) | XX.X | X.X | XX.X – XX.X | ≥ 50 % Reduktion | ✓/✗ |
| WIZ-03 (Tonalitaets-Passung) | XX.X | X.X | XX.X – XX.X | Delta > 0 | n/a (Baseline) |
| Finanzplan-Validity (Sub) | XX.X | X.X | XX.X – XX.X | — | — |

### Per-Geber-Gruppe (WIZ-03)

| Gruppe | n Eintraege | Mean | Stddev |
|--------|-------------|------|--------|
| oeffentlich (bund+land) | X | XX.X | X.X |
| stiftung | X | XX.X | X.X |
| eu | X | XX.X | X.X |
| wirtschaftspreis | X | XX.X | X.X |
| verband-uni | X | XX.X | X.X |

### Per-Dossier (WIZ-01 + WIZ-02)

| Dossier | n | WIZ-01 mean | WIZ-02 mean | Notiz |
|---------|---|-------------|-------------|-------|
| aktion-mensch | X | XX | XX | Hebel-3-faehig |
| ... | | | | |

### Latenz / Kosten

- **Latenz/Eintrag (Voll-Pipeline):** XX.Xs avg (Spanne XX–XX s)
- **Voll-Lauf Kosten (N=3, 22 Eintraege):** X.XX EUR / XX LLM-Calls
- **Judge-Cost (deepseek-chat):** X.XX EUR

### Reports

- JSON: `data/eval/pipeline-reports/<ISO>.json` (alle 3 Runs + Aggregat)
- Markdown: `data/eval/pipeline-reports/<ISO>.md`
- Snapshots: `data/eval/pipeline-snapshots/<ISO>/`

### Run-Befehl

```bash
DEEPSEEK_API_KEY=... npx tsx --env-file=.env.local scripts/eval-pipeline.ts \
  --live --N=3 --snapshot --md-summary
```
```

### CI-Workflow `.github/workflows/pipeline-eval.yml`-Skeleton

```yaml
name: Pipeline-Eval (Threshold-Gate)

# Sibling zu weekly-auto-pflege.yml. PR-Trigger auf lib/wizard/** + data/richtlinien/**.
# Default --replay (kein LLM-Cost), --live nur via manual-dispatch.

on:
  pull_request:
    paths:
      - "lib/wizard/**"
      - "data/richtlinien/**"
      - "data/eval/pipeline-korpus.json"
      - "scripts/eval-pipeline.ts"
  workflow_dispatch:
    inputs:
      mode:
        description: "Modus: replay (default, kein LLM) oder live (Cost ~3-4 EUR)"
        required: false
        type: choice
        options: [replay, live]
        default: replay

jobs:
  eval:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm ci

      - name: Pre-Flight Secret-Check
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          MODE: ${{ github.event.inputs.mode || 'replay' }}
        run: |
          set -euo pipefail
          if [ "$MODE" = "live" ] && [ -z "${DEEPSEEK_API_KEY}" ]; then
            echo "::error::DEEPSEEK_API_KEY Secret fehlt fuer --live-Modus"
            exit 1
          fi

      - name: Run Pipeline-Eval
        id: eval
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          MODE: ${{ github.event.inputs.mode || 'replay' }}
        run: |
          set -euo pipefail
          ARGS=(--md-summary)
          if [ "$MODE" = "replay" ]; then
            # Default-CI-Modus: gegen letzten committed Snapshot
            ARGS+=(--replay data/eval/pipeline-snapshots/baseline)
          else
            ARGS+=(--live --N=3)
          fi
          npx tsx scripts/eval-pipeline.ts "${ARGS[@]}"

      - name: Upload Eval Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pipeline-eval-${{ github.run_id }}
          path: data/eval/pipeline-reports/*.json
          retention-days: 30

      - name: GitHub-Annotation pro Achse
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            const dir = 'data/eval/pipeline-reports';
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
            if (files.length === 0) return;
            const report = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
            for (const [axis, val] of Object.entries(report.aggregate.axes)) {
              const sign = val.status === 'pass' ? '✓' : '✗';
              core.notice(`${sign} ${axis}: mean=${val.mean.toFixed(1)} stddev=${val.stddev.toFixed(1)} (baseline: ${val.baselineMean.toFixed(1)})`);
            }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bauchgefuehl-Tuning der Pipeline | Eval-first Korpus + N=3 + 2σ-Gate | Phase 1 (Matcher), jetzt Phase 5 (Pipeline) | Phase-1-Klassifizierung: „Bauchgefuehl-Tuning skaliert nicht auf 82 Programme" |
| Single-Run Eval-Score | N=3 Mean + Stddev | Phase 5 D-16 (LLM-as-Judge ist rauschig) | 2σ-Band macht Threshold-Gate robust gegen LLM-Varianz |
| Halluzinations-Detection only via Critique-Stage | Eval-time 3-Layer-Hybrid (Marker + Regex + opt. Judge) | Phase 5 D-09 | Critique-Stage ist im Pipeline-Lauf, Eval misst SEPARAT — fuehrt Tuning der Critique-Stage selbst |
| LLM-as-Judge mit freier Skala (0-10) | LLM-as-Judge mit Rubric (Kriterien × Gewichtung) | Phase 5 D-10 | G-Eval / DeepEval Best-Practice — strukturierter Output reduziert Varianz |
| GeberTyp (8 Werte) als Tonalitaets-Anker | 4-5 strategische Cluster (oeffentlich/stiftung/eu/wirtschaftspreis/verband-uni) | Phase 5 D-29 | `verband` + `programm` semantisch zu heterogen, Aggregation klarere Signale |
| Eval-Skript ohne CI-Gate | PR-Pflicht-Threshold-Gate mit `process.exit(1)` | Phase 2 D-16/-17 (Matcher), jetzt Phase 5 D-24 | Verhindert silent-regression-Merges |

**Deprecated/outdated:**
- **WIZ-04 Reload-Resume in Phase 5** — vorgezogen nach Phase 02.1 (Plan 02.1-06 ✓ 2026-05-06), Phase 5 streicht es aus ROADMAP/REQUIREMENTS (D-34)
- **UI hint: yes fuer Phase 5** — Phase 5 ist Backend-only nach Decision D-34
- **Single-Run-Baseline** — Phase 5 macht N=3 fuer Baseline (D-16), Iteration kann Single-Run

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeepSeek-API unterstuetzt `temperature: 0` und `response_format: { type: "json_object" }` fuer Judge-Calls | `## WIZ-03 Judge-Rubric-Design` | LOW — wenn `temperature: 0` nicht funktioniert, faellt auf Default zurueck, N=3-Mean kompensiert. Plan-Phase verifiziert mit kurzem Smoke-Test. [ASSUMED] |
| A2 | Pipeline emittiert `compliance-check`-Stage an GeneratingProgress ohne Code-Aenderung am Frontend | `## Pattern 5: Compliance-Stage` | LOW — TypeScript-Type-Erweiterung erzwingt entweder Frontend-Anpassung oder Map-Fallback. Plan-Phase entscheidet. [ASSUMED] |
| A3 | `sections[].name`-String-Vergleich ist robust genug fuer FK-Match (kein `id`-Feld vorhanden) | `## Pitfall 6` + `## Code Examples WIZ-01` | MEDIUM — normalize+contains-check funktioniert in 95 % der Faelle. Falls Pipeline Section-Namen umformuliert, kann FK-Match fehlschlagen. Mitigation: `sections[]` um optional `abschnittId` erweitern (Wave-3-Patch). [ASSUMED] |
| A4 | Layer-2-Regex-Patterns reichen aus, um die UAT-28.04. Hallu-Marker zu fangen, die nicht in `expected_forbidden_markers[]` stehen | `## Pattern 2 + Pitfall` | MEDIUM — gegen UAT-Snapshot pruefen (Wave 0 Test-Skelette), Patterns iterieren. [VERIFIED partial via UAT-28.04. memo] |
| A5 | Phase-4-Closure hat die 11 Dossiers nicht vollstaendig auf Strict-Schema migriert (siehe Daten-Vorbedingungen-Befund) | `## Daten-Vorbedingungen-Befund` | HIGH — wenn Phase 4 das doch geschlossen hat, ist mein Survey falsch und Wave 0 Pre-Flight-Plan ueberfluessig. **Plan-Phase verifiziert das in Wave-0-Pre-Flight `survey-richtlinien-felder.ts`.** [VERIFIED via direct file inspection 2026-05-19] |
| A6 | `deepseek-chat` als Judge-LLM ist deterministisch genug fuer Score-Delta-Messung, wenn N=3-Mean + Rubric-Anchor verwendet wird | `## WIZ-03 Judge-Rubric-Design` | MEDIUM — wenn Stddev > 15 in N=3-Baseline, Plan-Phase ergaenzt entweder N=5 oder Pro-Judge-Default. [ASSUMED — verifiziere mit Baseline-Lauf] |
| A7 | `finanzplan-validator.ts` `validateFinanzplan()` kann direkt aufgerufen werden mit dem Pipeline-Output-Finanzplan ohne Konversion | `## Code Examples Finanzplan-Sub` | LOW — Output-Struktur ist identisch (`Finanzplan`-Type aus `types.ts`). [VERIFIED via code inspection] |
| A8 | `weekly-auto-pflege.yml` ist gutes Sibling-Vorbild — Workflow-Haertungs-Patterns (set -euo pipefail, Secret-Pre-Flight, env-Mapping) sind ueberfuehrbar auf `pipeline-eval.yml` | `## Code Examples CI-Workflow` | LOW — Pattern ist generisch. [VERIFIED via direct file inspection] |
| A9 | DeepSeek-Balance ist verfuegbar oder Gemini-Fallback geht — Baseline-Lauf braucht ~3-4 EUR (D-01) | `## Environment Availability` | MEDIUM — STATE.md Wave-2-Blocker-Notiz erwaehnt „DeepSeek 0 Balance" als juengstes Problem. Plan-Phase eskaliert in Wave 0. [ASSUMED — Status unklar, verifiziere vor Baseline] |

**Konsequenzen fuer Plan-Phase:**

- **A5** ist der wichtigste Befund — Wave 0 hat einen Pre-Flight-Plan, der das verifiziert und ggf. die WIZ-01-Methodik in BASELINE.md schaerft.
- **A1, A3, A6** sind Eval-Skript-interne Annahmen — Wave-2-Plan integriert kurze Verifikations-Smoke-Tests (`scripts/smoke-judge-determinism.ts`-Konzept) bevor Baseline gefahren wird.
- **A9** ist ein Block-Risiko — Wave 0 prueft DEEPSEEK_API_KEY-Balance, ggf. ist Plan ein Top-Up oder Gemini-Switch erforderlich.

## Open Questions

1. **Wie haendisch ist die Marker-Generierung pro Korpus-Eintrag wirklich?**
   - What we know: D-14 sagt Hybrid (Claude generiert, Kolja reviewt — wie Phase 1 D-08).
   - What's unclear: Wie lang braucht Kolja fuer 22 Eintraege Marker-Review? UAT-28.04. hatte 8 Marker pro Eintrag — bei 22 Eintraegen sind das ~176 Marker.
   - Recommendation: Wave-1-Plan budgetiert explizit ~2-3h Kolja-Checkpoint nur fuer Marker-Review nach Claude-Vorschlag.

2. **Welche Programm-IDs gehen ueber die 11 Dossiers hinaus in den Korpus?**
   - What we know: D-03 sagt „1 Standard pro Dossier (alle 11) + 5-7 Stress-Edge-Cases". Edge-Cases koennen `expected_top3=[]` haben (D-05 #3 Programm-Mismatch).
   - What's unclear: Welche programmId in einem Programm-Mismatch-Edge-Case? Sinnvollerweise ein nicht-Dossier-Programm (z.B. `niedersachsen-sport` oder ein Programm aus `data/foerderprogramme.json` ohne Dossier).
   - Recommendation: Korpus-Kurations-Plan (Wave 1) listet pro Edge-Case-Eintrag die programmId + Begruendung — Kolja-Checkpoint.

3. **Soll Hebel 3 (vorbildFormulierungen-Injection) nur fuer 2/11 Dossiers gemessen werden oder soll Wave 3 vorab 1-2 Vorbild-Formulierungen pro Dossier ergaenzen?**
   - What we know: 2/11 Dossiers (aktion-mensch + kultur-macht-stark) haben vorbildFormulierungen befuellt.
   - What's unclear: Wave-3-Hebel-3 misst Delta — wenn 9/11 Dossiers leere Liste haben, ist das Delta strukturell 0 auf diesen Eintraegen.
   - Recommendation: Plan-Phase setzt das als „Hebel-3-Scope = nur fuer Dossiers mit `vorbildFormulierungen.length > 0`" und dokumentiert in `BASELINE.md` Methodik-Sektion. Vorbild-Formulierungen-Ausbau ist out-of-scope fuer Phase 5 (kein Dossier-Editieren).

4. **Wie wird `lib/wizard/config.ts` strukturiert — typed Constants oder Environ-Var-Read?**
   - What we know: D-22 nennt 4 Env-Vars + „Defaults konfiguriert in `lib/wizard/config.ts` (oder analog)".
   - What's unclear: Modul-globaler Read at startup oder Funktion-basiert?
   - Recommendation: Modul-globaler `export const PIPELINE_CONFIG = Object.freeze({...})` mit Env-Read am Modul-Load. Jest-Tests koennen via `jest.replaceProperty` oder via `process.env.PIPELINE_* = ...` vor `require()` patchen. Plan-Phase finalisiert das Pattern.

5. **Snapshot-Dateinamen-Konvention: `<entry-id>.json` (1 Run pro Eintrag) oder `<entry-id>-run<N>.json` (N=3 Runs pro Eintrag)?**
   - What we know: Phase 1 hat `<entry-id>.json` (Single-Run-Snapshot pro Korpus-Eintrag).
   - What's unclear: D-16 N=3 — Phase 5 braucht 3 Snapshots pro Eintrag.
   - Recommendation: `<entry-id>-run<N>.json` (z.B. `pv-001-run1.json`, `pv-001-run2.json`, `pv-001-run3.json`). Replay-Modus akzeptiert beide Konventionen (auto-detect). Plan-Phase finalisiert.

6. **Wann genau wird ein eigener `--from-db`-Modus benoetigt (D-06: Korpus skipt Interview-Stage, also Interview-Daten aus DB lesen)?**
   - What we know: D-06 sagt Korpus-Eintrag traegt pre-extrahierte WizardFacts + ChatMessage-Array.
   - What's unclear: Wie kommen die initial in den Korpus? Manuell extrahiert oder von DB-Session?
   - Recommendation: Initial-Kuration aus `smoke-pipeline-with-extractor.ts`-Pattern (UAT-Session-Token-Lookup aus DB), danach ist Korpus self-contained. Plan-Phase macht Wave-1-Step „pro Korpus-Eintrag: facts + messages aus DB-Session ziehen ODER manuell schreiben".

7. **`PipelineStage`-Type-Erweiterung um `"compliance-check"` — GeneratingProgress kompiliert noch?**
   - What we know: D-20 Hebel 2 sagt „silent stage, kein GeneratingProgress-Update".
   - What's unclear: TypeScript-Strict-Mode (`tsconfig.json:strict=true`) erzwingt entweder Map-Erweiterung oder explizite Ignorierung in GeneratingProgress.tsx.
   - Recommendation: Plan-Phase macht in Wave-3-Hebel-2-Plan einen kleinen GeneratingProgress.tsx-Patch — `case "compliance-check": return null;` (Component returnt nichts, behaviorally silent). Kein User-facing-Change.

## Validation Architecture

> Nyquist Validation ist enabled (`workflow.nyquist_validation` ist nicht explizit `false` in `.planning/config.json`). Diese Sektion treibt VALIDATION.md in Step 5.5 des Workflows.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest ^29.7.0 mit `next/jest`-Preset + ts-jest ^29.4.9 |
| Config file | `jest.config.js` (Repo-Root, existiert) |
| Setup file | `test/setup.tsx` (existiert) |
| Quick run command | `npx jest __tests__/eval/ -x` (eval-only, fail-fast) |
| Full suite command | `npm test` (laeuft auch Pre-Existing-Failures der 5 Legacy-Suites — diese sind Out-of-Scope laut PROJECT.md) |
| Coverage-Schwelle | 50 % global (`jest.config.js`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **WIZ-01** | Strict FK-Match auf `richtlinie.antragsstruktur.abschnitte[].id|name`, alle Pflicht-Abschnitte aus 11 Dossiers im Output | unit | `npx jest __tests__/eval/pipeline-fk-match.test.ts` | ❌ Wave 0 |
| **WIZ-01** | maxZeichen-Check (wenn im Dossier gesetzt) — Section ueber Limit = Violation | unit | `npx jest __tests__/eval/pipeline-fk-match.test.ts -t maxZeichen` | ❌ Wave 0 |
| **WIZ-01** | Pflichtabschnitte-Coverage ≥ 80 % auf voller Korpus-Replay (Baseline-Gate) | integration | `npx tsx scripts/eval-pipeline.ts --replay data/eval/pipeline-snapshots/baseline` | ❌ Wave 2 |
| **WIZ-02** | Layer 1 Marker-Detection: positive (Marker im Output → Hit), negative (User-Antwort enthaelt Marker → kein Hit?) | unit | `npx jest __tests__/eval/pipeline-marker-detection.test.ts` | ❌ Wave 0 |
| **WIZ-02** | Layer 1 Marker-Detection: Marker-Suche durch `finalText + sections + finanzplan-Begruendungen` (alle 3 Quellen abdecken) | unit | `npx jest __tests__/eval/pipeline-marker-detection.test.ts -t multi-source-haystack` | ❌ Wave 0 |
| **WIZ-02** | Layer 2 Regex-Patterns: positive (`Az 123/2026` match, `TV-L E9` match, `12.12.2025` match) | unit | `npx jest __tests__/eval/pipeline-regex-detection.test.ts -t positive` | ❌ Wave 0 |
| **WIZ-02** | Layer 2 Regex False-Positive-Schutz: wenn User selbst „TV-L E9" sagt, ist Match kein Hit (false-positive-check = user-stated) | unit | `npx jest __tests__/eval/pipeline-regex-detection.test.ts -t false-positive` | ❌ Wave 0 |
| **WIZ-02** | Baseline-Marker-Reduktion ≥ 50 % gegen Phase-4-Closure-Commit | integration | Eval-Replay-Run vs. Baseline-Eintrag | ❌ Wave 2 |
| **WIZ-03** | LLM-as-Judge gibt valides JSON-Schema zurueck (kriterien[] + gesamt + summary) | unit (mit LLM-Stub) | `npx jest __tests__/eval/pipeline-judge-rubric.test.ts -t schema` | ❌ Wave 0 |
| **WIZ-03** | Geber-Classification mapping korrekt fuer 11 Dossiers: bmbf→oeffentlich, bosch→wirtschaftspreis, aktion-mensch→stiftung, erasmus→eu, kultur-macht-stark→verband-uni etc. | unit | `npx jest __tests__/eval/geber-classification.test.ts` | ❌ Wave 0 |
| **WIZ-03** | Score-Delta > 0 pro Geber-Gruppe gegen Baseline (PR-Gate warning-only laut D-25) | integration | Eval-Replay vs. Baseline | ❌ Wave 2 |
| **Finanzplan-Sub** | `validateFinanzplan()` Aufruf liefert error-Count, Sub-Score 100 wenn 0 errors | unit | `npx jest __tests__/eval/pipeline-finanzplan-sub.test.ts` | ❌ Wave 0 |
| **Determinismus** | N=3-Variabilitaet pro Eintrag: stddev / mean < 0.15 (15 % relativer Varianz-Cap) | integration | `npx jest __tests__/eval/pipeline-determinism.test.ts` (mit LLM-Stub fuer reproduzierbare Tests) | ❌ Wave 0 |
| **Snapshot/Replay** | Replay-Modus produziert identische Scores wie ein gespeicherter Live-Run (Score-Logik ist deterministisch bei gleichem Input) | unit | `npx jest __tests__/eval/pipeline-snapshot-replay.test.ts` | ❌ Wave 0 |
| **CI-Threshold-Gate** | WIZ-01 hart: drop > 2σ → exit 1. WIZ-02 mittel: drop > 2σ + 10 % → exit 1. WIZ-03 warning-only: nie exit 1 wegen WIZ-03 | unit | `npx jest __tests__/eval/pipeline-gate.test.ts` | ❌ Wave 0 |
| **Aggregation** | Per-Geber-Gruppe-Breakdown sammelt korrekt: aktion-mensch-Eintrag in `stiftung`-Cluster, bmbf-Eintrag in `oeffentlich` | unit | `npx jest __tests__/eval/pipeline-aggregation.test.ts` | ❌ Wave 0 |
| **Compliance-Stage (Wave 3)** | Stage emittiert `stage: "compliance-check"`-Event. Bei Violation 1x Revision-Trigger, danach Stop (Loop-Count). | integration (mit LLM-Stub) | `npx jest __tests__/lib/wizard/pipeline.compliance.test.ts` | ❌ Wave 0 + Wave 3 |
| **Feature-Flags (Wave 3)** | 4 Env-Vars in `lib/wizard/config.ts` werden korrekt geparst (boolean from "true"/"false"/"1"/"0"), Default OFF | unit | `npx jest __tests__/lib/wizard/config.test.ts` | ❌ Wave 0 |

### Determinismus-Tests im Detail

**Test 1: Score-Berechnung ist deterministisch bei identischem Input.**

```typescript
// __tests__/eval/pipeline-snapshot-replay.test.ts (Skeleton)
import { scoreWiz01, scoreWiz02, scoreFinanzplan } from "../../scripts/eval-pipeline-internals";
import fixtureSnapshot from "../fixtures/pipeline-snapshot-borsigwalder.json";

test("WIZ-01 Score identisch ueber 5 Aufrufe mit gleichem Snapshot", () => {
  const scores = Array.from({ length: 5 }, () =>
    scoreWiz01(fixtureSnapshot.result.artefacts, fixtureSnapshot.input.richtlinie)
  );
  const unique = new Set(scores.map((s) => JSON.stringify(s)));
  expect(unique.size).toBe(1);                 // ein einziger eindeutiger Score-Wert
});
```

**Test 2: N=3-Stddev bei LLM-Stub-Antworten.**

```typescript
// __tests__/eval/pipeline-determinism.test.ts (Skeleton)
import { aggregateNRuns } from "../../scripts/eval-pipeline-internals";

test("N=3 Stddev bei nahezu identischen Scores ist < 1", () => {
  const stat = aggregateNRuns([85.0, 85.5, 84.5]);
  expect(stat.stddev).toBeLessThan(1.0);
  expect(stat.mean).toBeCloseTo(85.0, 1);
});

test("N=3 Stddev bei stark verschiedenen Scores ist > 5", () => {
  const stat = aggregateNRuns([60, 75, 90]);
  expect(stat.stddev).toBeGreaterThan(10);
});
```

### Marker-Detection-Tests im Detail

**Positive: Marker-Hit zaehlt.**

```typescript
// __tests__/eval/pipeline-marker-detection.test.ts (Skeleton)
test("Layer 1: 'Az 123/2026' im finalText wird als Hit gezaehlt", () => {
  const artefacts = {
    finalText: "Mit Schreiben des Schultraegers Az 123/2026 wurde...",
    sections: [],
    finanzplan: { posten: [], generiertAm: "" },
  };
  const expected_forbidden = [{ marker: "Az 123/2026", description: "Erfundenes Aktenzeichen" }];
  const result = scoreWiz02(artefacts, expected_forbidden, [], {});
  expect(result.layer1MarkerHits).toBe(1);
});
```

**Negative (False-Positive-Schutz Layer 2): User-Antwort enthaelt Marker.**

```typescript
test("Layer 2: 'TV-L E9' im Output ist false-positive wenn User es selbst nennt", () => {
  const artefacts = {
    finalText: "Wir beschaeftigen IT-Personal nach TV-L E9.",
    sections: [],
    finanzplan: { posten: [], generiertAm: "" },
  };
  const userAnswers = ["Unsere IT-Stelle ist in TV-L E9 eingruppiert."];
  const result = scoreWiz02(artefacts, [], userAnswers, {});
  const echteHallu = result.layer2RegexHitsDetail.filter(
    (h) => h.pattern === "tv_l_code" && h.falsePositiveCheck === "neither"
  );
  expect(echteHallu).toHaveLength(0);          // kein Hit, weil User-stated
});
```

### CI-Threshold-Tests im Detail

```typescript
// __tests__/eval/pipeline-gate.test.ts (Skeleton)
import { passesThreshold } from "../../scripts/eval-pipeline-internals";

test("WIZ-01 hart: drop von baseline-2σ → fail", () => {
  const baseline = { mean: 80, stddev: 2, runs: [78, 80, 82] };
  const current = { mean: 75, stddev: 1, runs: [74, 75, 76] };  // drop 5, 2σ = 4
  const result = passesThreshold(current, baseline, "WIZ-01");
  expect(result.passed).toBe(false);
});

test("WIZ-03 warning-only: drop von 20 → pass mit warning", () => {
  const baseline = { mean: 70, stddev: 5, runs: [65, 70, 75] };
  const current = { mean: 50, stddev: 3, runs: [47, 50, 53] };
  const result = passesThreshold(current, baseline, "WIZ-03");
  expect(result.passed).toBe(true);
  expect(result.reason).toMatch(/warning/i);
});
```

### Sampling Rate

- **Per task commit:** `npx jest __tests__/eval/ -x` (eval-only Tests, ~< 30s mit LLM-Stubs, kein Live-Call)
- **Per wave merge:** `npm test -- --testPathIgnorePatterns=__tests__/legacy` (alle nicht-legacy Tests)
- **Phase gate:** `npx tsx scripts/eval-pipeline.ts --replay <baseline-dir>` muss exit 0 liefern (D-24 Threshold-Gate)
- **Pre-Closure:** 1 manueller Live-Run gegen frisches Anliegen (D-36)

### Wave 0 Gaps

Folgende Test-Files muessen in Wave 0 (D-32 Test-Skelette) angelegt werden:

- [ ] `__tests__/eval/pipeline-fk-match.test.ts` — WIZ-01 Score-Logik (deckt REQ-WIZ-01)
- [ ] `__tests__/eval/pipeline-marker-detection.test.ts` — WIZ-02 Layer 1 (deckt REQ-WIZ-02)
- [ ] `__tests__/eval/pipeline-regex-detection.test.ts` — WIZ-02 Layer 2 + False-Positive (deckt REQ-WIZ-02)
- [ ] `__tests__/eval/pipeline-judge-rubric.test.ts` — WIZ-03 Judge mit LLM-Stub (deckt REQ-WIZ-03)
- [ ] `__tests__/eval/pipeline-finanzplan-sub.test.ts` — Sub-Metrik (Finanzplan-Validity)
- [ ] `__tests__/eval/pipeline-determinism.test.ts` — N=3 Mean+Stddev (deckt D-16/-17)
- [ ] `__tests__/eval/pipeline-snapshot-replay.test.ts` — Snapshot/Replay-Konsistenz (deckt D-07)
- [ ] `__tests__/eval/pipeline-aggregation.test.ts` — Per-Geber-Gruppe-Breakdown (deckt D-12)
- [ ] `__tests__/eval/pipeline-gate.test.ts` — Threshold-Gate-Logik pro Achse (deckt D-25)
- [ ] `__tests__/eval/geber-classification.test.ts` — Mapping fuer 11 Dossiers (deckt D-28)
- [ ] `__tests__/lib/wizard/config.test.ts` — Feature-Flag-Parsing (deckt D-22)
- [ ] `__tests__/lib/wizard/pipeline.compliance.test.ts` — Compliance-Stage mit LLM-Stub (deckt D-20 Hebel 2)
- [ ] `__tests__/fixtures/pipeline-snapshot-borsigwalder.json` — UAT-28.04. Pipeline-Snapshot als Test-Fixture
- [ ] `__tests__/fixtures/judge-rubric-stub.json` — Judge-LLM-Stub-Antwort als Fixture

Framework install: Nicht noetig — Jest existiert im Repo.

## Security Domain

> `security_enforcement` ist in `.planning/config.json` nicht explizit auf `false` gesetzt; behandle als enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | Phase 5 ist Backend-Tooling, kein User-Auth-Pfad |
| V3 Session Management | nein | Keine Session-State-Erzeugung in Eval |
| V4 Access Control | nein | Skript wird nur lokal/CI ausgefuehrt |
| V5 Input Validation | yes | Korpus-JSON wird via zod-Validator gepruest (Programm-ID-FK, Eintrag-Schema) — analog Phase-1-Pattern in `eval-matcher.ts:loadKorpusAndValidate` |
| V6 Cryptography | nein | Keine Verschluesselung im Scope |
| V7 Error Handling | yes | Eval-Skript darf bei einzelnem Eintrag-Fehler nicht abbrechen (Soft-Fail Pattern aus eval-matcher.ts Z.554-563); Console-Warning, `errMsg` im Report-JSON |
| V8 Logging | yes | Cost-Ledger wird geloggt (CostLedger aus `lib/wizard/pricing.ts`); KEINE Secrets in Logs (DeepSeek-Key wird nie geloggt) |
| V12 File Handling | yes | Snapshot-Pfade aus User-Input (`--replay <dir>`) MUESSEN gegen Path-Traversal abgesichert sein — `path.resolve(REPO, replayDir, ...)` ohne weitere Sanitization ist erlaubt, weil CI-only Aufruf, kein externer Input. Plan-Phase dokumentiert das. |
| V14 Configuration | yes | Feature-Flags (D-22) muessen sauber Env-Var-Read sein; Default OFF zum Schutz vor versehentlicher Aktivierung |

### Known Threat Patterns for Backend / LLM-Tooling

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt-Injection im User-Anliegen (Korpus-Eintrag enthaelt boesartigen Prompt) | Tampering | LLM-Wrapper limitiert auf System+User-Prompt, kein Tool-Use. Korpus-Pflege durch Kolja (Trust-Anchor). Layer-2-Regex faengt typische Hijacking-Marker (`KMK-Zitat`, etc.) als Halluzinations-Marker. |
| LLM-Cost-Explosion durch endlose Compliance-Stage-Loop | DoS | Loop-Count auf 1 (D-20 Hebel 2). `lib/wizard/llm.ts` hat 60s-Timeout pro Call. |
| Secret-Leak im Eval-Report (DeepSeek-Key im Trace) | Information Disclosure | `process.env.DEEPSEEK_API_KEY` wird nie in Reports geschrieben. Cost-Ledger speichert nur Token-Counts, nie Keys. |
| Korpus-Mutation als Backdoor (Marker rausschneiden → Eval grueggn machen) | Tampering | Korpus + BASELINE.md sind versioniert. PR-Review erforderlich (D-26 Korpus-Updates erfordern Baseline-Recalc). CI laesst BASELINE-Aenderungen nur durch wenn Live-Run gemacht wurde (D-26 manuell sichergestellt). |
| Snapshot-Tampering (Replay gegen manipuliertes JSON) | Tampering | Snapshot-Schema-Version (`meta.schemaVersion: 1`) + git-versionierte Baseline-Snapshots. Nicht-Baseline-Snapshots sind `.gitignore`'d → nur lokal vertrauenswuerdig. |
| GitHub-Action Workflow-Injection (workflow_dispatch-Input ungeprueft in shell) | Tampering | env-Mapping verwenden (analog `weekly-auto-pflege.yml`), keine direkte `${{ inputs.X }}`-Interpolation in `run:`-Shells. |

## Sources

### Primary (HIGH confidence)

- **`/home/kolja/edufunds-app/lib/wizard/pipeline.ts`** — runPipeline()-API, Stage-Logik, GenerationArtefacts-Struktur (direct read 2026-05-19)
- **`/home/kolja/edufunds-app/lib/wizard/types.ts`** — PipelineStage, GenerationArtefacts, WizardFacts, WizardMessage (direct read)
- **`/home/kolja/edufunds-app/lib/wizard/richtlinien-schema.ts`** — Antragsstruktur.abschnitte schema, AntragsAbschnitt-Type (direct read)
- **`/home/kolja/edufunds-app/lib/wizard/llm.ts`** — DeepSeek + Gemini Provider-Wrapper, generateJson/generateText API, MODEL_PIPELINE constants (direct read)
- **`/home/kolja/edufunds-app/lib/wizard/geber-guidance.ts`** — 8 GeberTyp-Werte, critiqueFocus pro Typ (direct read)
- **`/home/kolja/edufunds-app/lib/wizard/finanzplan-validator.ts`** — validateFinanzplan(), ValidationResult, Warnung-Levels (direct read)
- **`/home/kolja/edufunds-app/lib/wizard/prompts.ts`** — SECTION_SYSTEM, CRITIQUE_SYSTEM, FINANZPLAN_SYSTEM mit aktuellen Halluzinations-Verbots-Listen (direct read)
- **`/home/kolja/edufunds-app/scripts/eval-matcher.ts`** — Direkt-Vorbild fuer eval-pipeline.ts: Flag-Parsing, Snapshot/Replay-Shim, Aggregation, Threshold-Gate-Pattern (direct read)
- **`/home/kolja/edufunds-app/data/eval/BASELINE.md`** — append-only-Format, mean+stddev-Konvention, Per-Kategorie-Breakdown (direct read)
- **`/home/kolja/edufunds-app/data/eval/matcher-korpus.json`** — Korpus-JSON-Schema-Vorbild (direct read)
- **`/home/kolja/edufunds-app/data/richtlinien/*.json`** — alle 11 Dossiers fuer Daten-Vorbedingungen-Survey (direct read via node script)
- **`/home/kolja/edufunds-app/.github/workflows/weekly-auto-pflege.yml`** — Sibling-Vorbild fuer pipeline-eval.yml CI-Workflow (direct read)
- **`/home/kolja/edufunds-app/CLAUDE.md`** — Projekt-Konvention deutsch, DeepSeek-Default, npx-tsx-Pattern (direct read)
- **`/home/kolja/edufunds-app/.planning/codebase/STACK.md` + CONVENTIONS.md** — Tech-Stack, Naming, kein-neuer-Dependency-Befund (direct read)
- **`/home/kolja/edufunds-app/.planning/phases/01-eval-korpus-matcher/01-CONTEXT.md`** — Phase-1-Pattern-Vorbild (direct read)
- **UAT-Memo `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md`** — 8 dokumentierte Halluzinations-Marker, Bug-Liste, Pipeline-Hebel-Status. **System-Reminder:** Memo ist 19 Tage alt, einzelne Behauptungen via direct-code-read 2026-05-19 verifiziert.

### Secondary (MEDIUM confidence)

- **`/home/kolja/edufunds-app/lib/wizard/programm-kriterien.ts`** — bestehende ExtraGuidance pro Programm (direct read, Hebel-4-Erweiterungspunkt)
- **`/home/kolja/edufunds-app/data/foerderprogramme.json`** — foerdergeberTyp-Verteilung fuer Geber-Classification (via node-script verifiziert: bmbf=bund, bosch=stiftung, erasmus=eu etc.)
- **`/home/kolja/edufunds-app/scripts/smoke-pipeline-with-extractor.ts`** — UAT-Reproducer-Pattern fuer Korpus-Initial-Generation (direct read)

### Tertiary (LOW confidence — Plan-Phase verifiziert)

- **LLM-as-Judge Best Practices (G-Eval, DeepEval, lighteval)** — aus Training-Knowledge, NICHT in dieser Session verifiziert. Rubric-mit-Gewichtung + JSON-structured-Output sind etablierte Patterns. Plan-Phase darf eigenes Rubric-Wortlaut-Tuning machen. [ASSUMED]
- **2σ-Band fuer LLM-Eval-Determinismus** — aus Training-Knowledge, statistisch Standard-Praxis (95 % Konfidenz-Intervall bei N=3 ist eigentlich knapp, aber pragmatisch). Plan-Phase: Baseline-Lauf zeigt empirisch ob N=3 reicht oder N=5 noetig wird. [ASSUMED]

## Metadata

**Confidence breakdown:**

- **Standard Stack:** HIGH — alle Pakete im Repo, keine neuen Dependencies; Versionen aus STACK.md (2026-04-30) noch aktuell
- **Architecture:** HIGH — 1-zu-1-Spiegel von Phase 1 (`eval-matcher.ts`-Pattern), Glue-Code zwischen existierenden Modulen
- **Pitfalls:** HIGH — Pitfall 1-7 sind alle direkt aus existierendem Code/UAT-Memo abgeleitet; Pitfall 7 (Dossier-Coverage-Asymmetrie) ist via direct file inspection verifiziert
- **WIZ-01 Code-Examples:** HIGH — basiert auf richtlinien-schema.ts + types.ts (direct read)
- **WIZ-02 Code-Examples:** MEDIUM — Layer-1/2-Logik ist trivial, Regex-Patterns aus UAT-Memo abgeleitet; Layer-3 ist deferred
- **WIZ-03 Code-Examples + Rubric-Vorschlaege:** MEDIUM — Rubric-Wortlaut ist Claude's Discretion (D-Open), basiert auf bestehender geber-guidance.ts; Plan-Phase kann editieren
- **Test-Architektur:** HIGH — folgt etablierter __tests__/-Struktur im Repo
- **CI-Workflow:** HIGH — Sibling weekly-auto-pflege.yml ist direkt uebertragbar
- **Daten-Vorbedingungen:** HIGH — via node-script direct-survey aller 11 Dossiers verifiziert
- **Judge-Determinismus-Annahmen:** MEDIUM — basiert auf Training-Knowledge zu G-Eval/DeepEval, Plan-Phase verifiziert mit Baseline-Lauf

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 Tage — Stack ist stabil, keine fast-moving Dependencies)

---

*Phase: 05-wizard-pipeline-tuning-ux-l-cke*
*Research compiled: 2026-05-19 durch gsd-researcher*
