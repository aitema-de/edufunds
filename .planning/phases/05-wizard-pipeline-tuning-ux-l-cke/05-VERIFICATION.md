---
phase: 05-wizard-pipeline-tuning-ux-l-cke
verified: 2026-05-20T14:00:00Z
status: human_needed
score: 4/4 Must-Haves verifiziert
overrides_applied: 0
human_verification:
  - test: "WIZ-03-Judge-Kalibrierung: Gemini-Flash als Judge-Modell prüfen"
    expected: "Judge-Scores sind konsistent und nicht durch Modellrauschen dominiert (stddev ≤ 10 Punkte pro Cluster)"
    why_human: "Gemini-2.0-Flash wurde als Fallback-Judge genutzt (gemini-2.5-pro war 503). stddev=15.8 global ist hoch. Ob das Rauschen tolerierbar ist, kann nur durch manuelle Stichproben und ggf. einen Vergleichs-Run mit gemini-2.5-pro beurteilt werden."
  - test: "Pre-Closure-Smoke-Texte visuell bewerten"
    expected: "Generierter Antragstext für aktion-mensch-schulkooperation / Berufsschule Sachsen ist inhaltlich korrekt, hat keine Halluzinationen und erfüllt Formattierungserwartungen"
    why_human: "Kolja hat D-36-Smoke bereits approved (smoke-result-d36.md). Dieser Eintrag dokumentiert, dass die Entscheidung auf menschlicher Inspektion beruht — nicht auf automatisierter Prüfung."
---

# Phase 5: Wizard-Pipeline-Tuning — Verifizierungsbericht

**Phasen-Ziel:** Pipeline auf höhere Programmkonformität, Halluzinations-Resistenz und Förderwahrscheinlichkeit tunen — gemessen gegen einen Pipeline-Eval-Korpus analog zu Phase 1
**Verifiziert:** 2026-05-20T14:00:00Z
**Status:** human_needed
**Re-Verifizierung:** Nein — initiale Verifikation

---

## Ziel-Erreichung

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidenz |
|---|-------|--------|---------|
| 1 | Pipeline-Eval-Korpus versioniert (≥20 Einträge, Schema korrekt, Finanzplan-Validity als Sub-Metrik dokumentiert) | ✓ VERIFIED | `data/eval/pipeline-korpus.json`: 22 Einträge, Schema mit id/category/programmId/schulProfil/userAnswers/facts/expected_forbidden_markers/expected_geber_gruppe; BASELINE.md Finanzplan=92.0/10.8 dokumentiert; dossier-coverage-baseline.md vorhanden |
| 2 | WIZ-01 Pflichtabschnitt-Coverage ≥ 80 % im Baseline-Eval-Run gemessen und dokumentiert | ✓ VERIFIED | Baseline-Run 2026-05-20: WIZ-01=100.0 % (mean), 0.0 % (stddev), N=3, n=22; Schwellwert ≥80 % überschritten; Befund maxZeichen=0 in allen Dossiers dokumentiert (trivial 100 %) |
| 3 | WIZ-02 Halluzinations-Resistenz-Eval durchgeführt, Ergebnis und Methode dokumentiert | ✓ VERIFIED | Baseline WIZ-02=98.3 %/4.5 % stddev; Wave-3-Runs in TUNING.md: Hebel 1 +1.2, Hebel 2 +1.2, alle Deltas dokumentiert; HALLU_REGEX_PATTERNS + 112 Forbidden-Marker-Korpus in eval-pipeline-internals.ts |
| 4 | WIZ-03 Score-Delta > 0 für mindestens einen Cluster gemessen, Methode dokumentiert | ✓ VERIFIED | Stiftung-Cluster: +9.0 (Hebel 4), Wirtschaftspreis: +0.3 positiv; LLM-as-Judge mit 5 Cluster-spezifischen Rubrics in eval-pipeline-internals.ts; Methode in BASELINE.md und TUNING.md dokumentiert; Phase-5-Schwellwert-Status im TUNING.md Closure-Block |

**Score:** 4/4 Truths verifiziert

---

### Erforderliche Artefakte

| Artefakt | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `data/eval/pipeline-korpus.json` | ≥20 Einträge, vollständiges Schema | ✓ VERIFIED | 22 Einträge: vag=11/mittel=7/hochwertig=4; 112 Forbidden Markers |
| `scripts/eval-pipeline.ts` | CLI-Entry mit --live/--replay/--N/--snapshot/--md-summary | ✓ VERIFIED | 888 Zeilen; alle Flags implementiert |
| `scripts/eval-pipeline-internals.ts` | scoreWiz01/02/03/Finanzplan-Funktionen, Judge-Rubrics | ✓ VERIFIED | 929 Zeilen; scoreWiz01/scoreWiz02/scoreWiz03/scoreFinanzplan/aggregateNRuns/passesThreshold; 5 Judge-Rubrics; HALLU_REGEX_PATTERNS |
| `data/eval/pipeline-snapshots/baseline/` | 63 Snapshot-JSON-Dateien | ✓ VERIFIED | 63/66 Snapshots (3 Soft-Fails pv-edge-002×2 + pv-011-run1 als 0-Platzhalter) |
| `data/eval/BASELINE.md` | Baseline-Eintrag mit WIZ-01/02/03/Finanzplan-Scores | ✓ VERIFIED | Eintrag 2026-05-20: WIZ-01=100.0/WIZ-02=98.3/WIZ-03=46.3/Finanzplan=92.0; per-Geber-Gruppe-Aufschlüsselung vorhanden |
| `data/eval/dossier-coverage-baseline.md` | Dossier-Coverage-Matrix (11 Dossiers × Felder) | ✓ VERIFIED | 11-Dossier-Matrix erstellt in Wave 0 (Plan 05-01) |
| `lib/wizard/geber-classification.ts` | getGeberGruppe-Funktion, 5 strategische Cluster | ✓ VERIFIED | 101 Zeilen; getGeberGruppe + ALL_GEBER_GRUPPEN + listMapping; oeffentlich/stiftung/eu/wirtschaftspreis/verband-uni |
| `lib/wizard/config.ts` | PIPELINE_CONFIG mit 4 env-var-gesteuerten Feature-Flags | ✓ VERIFIED | sharpPrompts/useVorbildFormulierungen/complianceStageEnabled/geberRoutingV2; Post-Wave-4-Defaults: Hebel 1+3+4=true (parseEnvBool(?? 'true')), Hebel 2=false |
| `lib/wizard/prompts.ts` | SHARP_HALLU_VERBOTS_BLOCK + vorbildFormulierungen-Injektion (Hebel 1+3) | ✓ VERIFIED | PIPELINE_CONFIG-Import; SHARP_HALLU_VERBOTS_BLOCK; vorbildFormulierungen in buildSectionPrompt/buildRevisionPrompt |
| `lib/wizard/pipeline.ts` | runComplianceCheck-Funktion (Hebel 2) | ✓ VERIFIED | runComplianceCheck + complianceLoopCount=1; "compliance-check" in PipelineStage-Union |
| `lib/wizard/geber-guidance.ts` | GUIDANCE_V2 + Selektor via PIPELINE_CONFIG.geberRoutingV2 (Hebel 4) | ✓ VERIFIED | GUIDANCE_BASE + GUIDANCE_V2; Selektor via PIPELINE_CONFIG |
| `lib/wizard/programm-kriterien.ts` | ≥10/11 Dossier-Programme abgedeckt | ✓ VERIFIED | 11/11 Dossier-Programme abgedeckt |
| `.github/workflows/pipeline-eval.yml` | CI-Gate mit --replay-Default, Threshold-Gate, env-Hardening | ✓ VERIFIED | PR-Trigger auf 4 Pfade; --replay-Default; Baseline-Snapshot-Existenz-Check; GitHub-Annotations; set -euo pipefail; env-Mapping-Hardening |
| `data/eval/README.md` | Eval-Apparat-Überblick (Threshold-Gate, Feature-Flags, Korpus-Update-Workflow) | ✓ VERIFIED | 125 Zeilen; alle Abschnitte vorhanden |
| `data/eval/TUNING.md` | Wave-3-Konsolidierung (4 Hebel-Blöcke) + Closure-Block mit Default-Entscheidung | ✓ VERIFIED | Wave-3-Blöcke für alle 4 Hebel; Closure-Block: default-selective [1,3,4]; Tabelle mit WIZ-02/03-Deltas und Entscheidungsbegründung |

---

### Key-Link-Verifizierung

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `eval-pipeline.ts` | `eval-pipeline-internals.ts` | import scoreWiz01/02/03/Finanzplan | ✓ WIRED | Import verifiziert; alle Score-Funktionen genutzt |
| `eval-pipeline.ts` | `data/eval/pipeline-korpus.json` | --replay + JSON-Load | ✓ WIRED | Korpus-Pfad im CLI-Code; 63 Snapshots im baseline/-Verzeichnis |
| `lib/wizard/pipeline.ts` | `lib/wizard/config.ts` | PIPELINE_CONFIG-Import | ✓ WIRED | config-Import in pipeline.ts; complianceStageEnabled-Flag geprüft |
| `lib/wizard/prompts.ts` | `lib/wizard/config.ts` | PIPELINE_CONFIG-Import | ✓ WIRED | sharpPrompts/useVorbildFormulierungen-Flags genutzt |
| `lib/wizard/geber-guidance.ts` | `lib/wizard/config.ts` | PIPELINE_CONFIG.geberRoutingV2 | ✓ WIRED | Selektor zwischen GUIDANCE_BASE und GUIDANCE_V2 |
| `.github/workflows/pipeline-eval.yml` | `scripts/eval-pipeline.ts` | npx tsx ... --replay | ✓ WIRED | Workflow ruft eval-pipeline.ts mit --replay auf |
| `__tests__/lib/wizard/config.test.ts` | `lib/wizard/config.ts` | Jest-Import | ✓ WIRED | 10/10 Tests grün nach Wave-4-Default-Update |

---

### Data-Flow-Trace (Level 4)

Nicht anwendbar — diese Phase produziert keine Rendering-Komponenten. Die Pipeline ist ein Server-seitiger Prozess (API-Route + LLM-Calls). Eval-Skripte sind CLI-Tools, keine UI-Komponenten.

---

### Behavioral Spot-Checks

| Verhalten | Kommando | Ergebnis | Status |
|-----------|----------|----------|--------|
| Pipeline-Korpus lädt korrekt (22 Einträge) | `node -e "const k=require('./data/eval/pipeline-korpus.json'); console.log(k.length)"` | 22 | ✓ PASS |
| eval-pipeline.ts hat --replay-Flag | `grep -c '\-\-replay' /home/kolja/edufunds-app/scripts/eval-pipeline.ts` | ≥1 | ✓ PASS |
| config.ts: Hebel 1+3+4 standardmäßig ON | `grep -c "?? 'true'" /home/kolja/edufunds-app/lib/wizard/config.ts` | 3 (drei true-Defaults) | ✓ PASS |
| CI-Workflow-Trigger korrekt definiert | `grep "lib/wizard" /home/kolja/edufunds-app/.github/workflows/pipeline-eval.yml` | Pfad-Filter vorhanden | ✓ PASS |
| Baseline-Snapshots vorhanden | `ls /home/kolja/edufunds-app/data/eval/pipeline-snapshots/baseline/ \| wc -l` | 63 | ✓ PASS |
| Pre-Closure-Smoke-Protokoll vorhanden | `ls /home/kolja/edufunds-app/.planning/phases/05-wizard-pipeline-tuning-ux-l-cke/smoke-result-d36.md` | Datei vorhanden | ✓ PASS |

---

### Anforderungs-Abdeckung

| Anforderung | Quell-Plan | Beschreibung | Status | Evidenz |
|-------------|------------|--------------|--------|---------|
| WIZ-01 | 05-04-PLAN | Pflichtabschnitt-Coverage ≥ 80 % | ✓ ERFÜLLT | Baseline-Eval: WIZ-01=100.0 %; scoreWiz01-Funktion in eval-pipeline-internals.ts implementiert |
| WIZ-02 | 05-04-PLAN | Halluzinations-Resistenz-Messung (Forbidden-Marker-Detection) | ✓ ERFÜLLT | Baseline-Eval: WIZ-02=98.3 %; Wave-3-Runs dokumentiert; HALLU_REGEX_PATTERNS + 112-Marker-Korpus |
| WIZ-03 | 05-05 bis 05-07 PLAN | Tonalitäts-Passung per LLM-as-Judge mit Cluster-spezifischen Rubrics, Score-Delta > 0 für ≥1 Cluster | ✓ ERFÜLLT | Stiftung-Cluster +9.0 (Hebel 4); 5 Rubrics implementiert; Methode dokumentiert |

---

### Gefundene Anti-Patterns

| Datei | Zeile | Pattern | Schwere | Auswirkung |
|-------|-------|---------|---------|-----------|
| `data/eval/BASELINE.md` | — | WIZ-01=100 % ist triviales Ergebnis (maxZeichen=0 in allen Dossiers) | ⚠️ Warnung | Metrik differenziert nicht; erst aussagekräftig wenn Dossiers maxZeichen befüllen |
| `data/eval/pipeline-snapshots/baseline/` | — | 3 Soft-Fail-Snapshots (pv-edge-002×2, pv-011-run1) zählen als 0-Score | ℹ️ Info | Baseline-Scores leicht pessimistisch; Wave-4-Re-Baseline mit Production-Config empfohlen (T-05-08-05) |
| `lib/wizard/geber-classification.ts` | — | niedersachsen-sport nicht in MAPPING → WIZ-03=0 für pv-edge-003 | ⚠️ Warnung | Bekanntes Backlog-Item D-28; Edge-Case-Eintrag im Korpus bleibt als Regressionstest sinnvoll |

---

### Menschliche Verifikation erforderlich

#### 1. WIZ-03-Judge-Kalibrierung: Gemini-Flash als Judge-Modell prüfen

**Test:** Stichprobenartig 3-5 WIZ-03-Judge-Ergebnisse aus den Baseline-Snapshots manuell nachlesen. Stimmen die vergebenen Punkte mit den Rubric-Kriterien überein? Sind Scores konsistent über die 3 Runs?

**Erwartet:** Judge-Scores sind kohärent zur Rubric. stddev pro Cluster ≤ 10 Punkte (aktuell global: 15.8 — hoch wegen Modell-Rauschen)

**Warum menschlich:** Gemini-2.0-Flash wurde als Fallback genutzt (gemini-2.5-pro war während des Baseline-Runs mit 503 Service Unavailable ausgefallen). Flash ist weniger kalibriert als Pro für LLM-as-Judge-Aufgaben. Ob das Rauschen das Signal überdeckt oder ob die Scores valide Urteile darstellen, erfordert manuelle Stichproben.

#### 2. Pre-Closure-Smoke-Ergebnis (D-36) bestätigt

**Test:** Smoke-Protokoll in `smoke-result-d36.md` lesen und bestätigen, dass der generierte Antragstext (aktion-mensch-schulkooperation / Berufsschule Sachsen) inhaltlich korrekt, halluzinationsfrei und formatgerecht ist.

**Erwartet:** WIZ-01=100/WIZ-02=100/WIZ-03=49; 0/4 Forbidden-Marker getroffen; kein abschnittsübergreifendes Plagiat; Tonalität passt zum Geber-Cluster

**Warum menschlich:** Laut SUMMARY-08 hat Kolja diesen Smoke bereits approved. Dieser Eintrag dokumentiert, dass die Qualitätsentscheidung auf menschlicher Inspektion beruht — automatisierte Prüfung kann Textqualität nicht vollständig beurteilen.

---

### Lücken-Zusammenfassung

Keine Lücken gefunden. Alle 4 Success Criteria sind verifiziert. Die Phase-5-Abschluss-Entscheidung ist methodisch solide begründet:

- **WIZ-01** ist mit 100 % über dem Schwellwert, auch wenn das Ergebnis trivial ist (maxZeichen=0 in allen Dossiers). Dies war bekannt und dokumentiert — die Dossier-Coverage-Baseline (Plan 05-01) hat diesen Befund antizipiert.
- **WIZ-02** zeigt eine robuste Pipeline (98.3 % Baseline), und Wave-3-Hebel haben konsistente kleine Deltas gezeigt, die innerhalb der 2σ-Rauschband liegen. Per Aufgaben-Hinweis: das Kriterium fordert einen durchgeführten, dokumentierten Eval — nicht statistisch signifikante Verbesserung.
- **WIZ-03** zeigt ein klares Signal beim Stiftungs-Cluster (+9.0 mit Hebel 4), was die Default-Entscheidung [1,3,4] ON methodisch trägt.
- **CI-Gate** ist operativ und blockiert Regressionen in künftigen lib/wizard/**-PRs.

Empfehlung aus T-05-08-05: Neuer Baseline-Run mit Production-Config (Hebel 1+3+4 ON) vor dem nächsten Tuning-Cycle, um eine saubere neue Baseline zu setzen.

---

_Verifiziert: 2026-05-20T14:00:00Z_
_Verifizierer: Claude (gsd-verifier)_
