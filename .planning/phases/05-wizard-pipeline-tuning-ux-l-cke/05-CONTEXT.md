# Phase 5: Wizard-Pipeline-Tuning + UX-Lücke - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Messbare Eval-Basis für die Wizard-Pipeline (`lib/wizard/pipeline.ts`, 7 Stages) etablieren UND Pipeline auf 3 Qualitäts-Achsen tunen bis konservative Schwellwerte messbar erreicht sind:

- **WIZ-01** Programmkonformität — Pflichtabschnitte aus `antragsstruktur.abschnitte[]` + `maxZeichen`-Limits aller 11 Dossiers einhalten
- **WIZ-02** Halluzinations-Resistenz — bei niedrig-qualitativen Inputs keine erfundenen Rahmenverträge / Tarifsysteme / Aktenzeichen / Beschluss-Daten (UAT-28.04.-Pattern)
- **WIZ-03** „Passt-zum-Geber"-Tonalität — pro strategischer Geber-Gruppe (4-5 Cluster) messbares Score-Delta gegen Baseline

**Explizit NICHT in dieser Phase:**

- WIZ-04 Reload-Resume — bereits in Phase 02.1 (Plan 02.1-06 ✓ 2026-05-06) implementiert; ROADMAP-Crit #5 wird als Closure-Step in dieser Phase aus ROADMAP.md entfernt.
- UI-Polish — Phase 5 ist Backend/Eval/Tooling-only; `UI hint: yes` aus ROADMAP wird ebenfalls gestrichen (ggf. minimale GeneratingProgress-Erweiterung wenn neue Pipeline-Stage kommt, aber kein User-facing-Polish).
- Echte UAT-Sessions — Phase 6.
- Tuning ohne Eval-Anker / Bauchgefühl-Tuning — Eval-first ist nicht verhandelbar.

**Phase-2-Verhältnis:** Phase 5 wartet auf Phase-2-Closure (Plans 02-04..02-07) aus Konsistenz-Gründen, obwohl Code-Pfade disjunkt sind (matcher.ts vs pipeline.ts). Phase-Reihenfolge linear halten.

</domain>

<decisions>
## Implementation Decisions

### Eval-Korpus-Strategie

- **D-01:** Korpus-Größe 20-25 Einträge (analog Phase 1 Matcher-Korpus). Wallclock ~60-75 min, Kosten ~3-4 EUR pro Voll-Lauf. Pfad: `data/eval/pipeline-korpus.json` (Sibling zu `matcher-korpus.json`).
- **D-02:** Quellen-Mix Hybrid 60/40: 60 % UAT-Real-Pattern (analog 28.04.-Borsigwalder-Reproducer im UAT-Memo, anonymisiert), 40 % synthetisch+Kolja-kuratiert. UAT-Real für WIZ-02-Stress (Halluzinations-Detection), synthetisch für breite Programm-Coverage (WIZ-01) und Geber-Typ-Coverage (WIZ-03).
- **D-03:** Programm-Coverage: 1 Standard-Eintrag pro Dossier (alle 11) + 5-7 Stress-Edge-Cases. Sichert WIZ-01 messbar pro Programm.
- **D-04:** Antwort-Qualitäts-Mix vag-dominant 50 % vag / 30 % mittel / 20 % hochwertig. Begründung: WIZ-02 (Halluzinations-Resistenz) braucht Härte-Tests, UAT-28.04. zeigte dass vage Inputs der Bruchpunkt sind.
- **D-05:** Edge-Cases (5-7 Stück, UAT-realistische Stress-Fälle): (1) vag-extrem (alle Antworten „glaub ich"/„weiss nicht so genau"), (2) Schul-Profil fehlt vollständig (kein `bundesland`, kein `schultyp`), (3) Programm-Mismatch (Anliegen passt zu KEINEM der 11 Dossiers — Pipeline darf nicht halluzinieren), (4) widersprüchliche Antworten (z.B. „200 Schüler" / „400 Schüler"), (5) Bundesland-Konflikt (NRW-Anliegen für `berlin-startchancen`), (6) extrem lange Antworten die `maxZeichen` sprengen, (7) Antrag-Schritt-Rücksprünge im Antwort-Verlauf.
- **D-06:** Eintrag-Struktur: pro Eintrag `programmId` + `schul-profil` + `user-antworten[]` (`ChatMessage`-Array analog UAT-Reproducer) + pre-extrahierte `WizardFacts`. Eval ruft `runPipeline()` direkt mit diesem Input — überspringt die Interview-Stage. Schnell + reproduzierbar. Voll-Wizard-Sitzungs-Simulation NICHT default (würde Eval ~30 % teurer machen).
- **D-07:** Snapshot/Replay-Modus: **Pflicht-Snapshot, Replay-Default**. Default-Aufruf läuft im `--replay`-Modus gegen letzten Snapshot. `--live`-Flag erzwingt neuen LLM-Lauf. Snapshots in `data/eval/pipeline-snapshots/<ISO>/<entry-id>.json`. Score-Logik-Iteration kostet 0 EUR, nur Voll-Refresh ist teuer.

### Metriken pro WIZ-Achse

- **D-08:** **WIZ-01 Programmkonformität** = strict FK-Match auf `antragsstruktur.abschnitte[].id` + harter `maxZeichen`-Check. Pipeline-Output muss exakt die Abschnitt-IDs treffen. Über max Zeichen = FAIL. Pflicht-Abschnitt fehlt = FAIL. Score: prozentuale Abdeckung pro Dossier-Eintrag.
- **D-09:** **WIZ-02 Halluzinations-Detection** = 3-Layer-Hybrid:
  - Layer 1 (Pflicht, deterministisch): kuratierte Marker-Liste pro Eintrag (`expected_forbidden_markers[]`, z.B. „Az 123/2026", „TV-L E9", „Bezirk Berlin-Mitte"). Eval greppt den Output, jeder Treffer = Halluzination.
  - Layer 2 (Pflicht, deterministisch): strukturelle Regex (Aktenzeichen-Pattern, präzise Daten `DD.MM.YYYY`, TV-L-Codes, Bezirks-Namen).
  - Layer 3 (optional via `--deep`-Flag): LLM-as-Judge mit Quellen-Anker (Judge sieht User-Antworten + Output + Dossier, klassifiziert Aussagen als „belegt"/„unbelegt-aber-plausibel"/„erfunden").
- **D-10:** **WIZ-03 Tonalität** = LLM-as-Judge mit Rubric, ausgewertet auf **4-5 strategischen Geber-Gruppen** (NICHT die 8 `GeberTyp`-Werte aus `geber-guidance.ts`):
  - `bundesfoerderung+landesfoerderung` zusammen = „öffentlich" (sachlich-strategiebezogen)
  - `stiftung` (stärker emotional, Vision, Wirkungs-Narrativ)
  - `eu` (formalisiert, ENSA-Forms)
  - `wirtschaftspreis` (knapp + story-driven, z.B. bosch-schulpreis, ferry-porsche-challenge)
  - `verband+uni` zusammen = „fachlich" (sachlich, evidenzbasiert)

  Jede Gruppe hat eigene Rubric (sachlich vs pathetisch, Fachterminologie, Strategiebezug etc.). Judge-LLM bewertet Pipeline-Output gegen Rubric (Score 0-100). Score-Delta gegen Baseline pro Gruppe.
- **D-11:** **Finanzplan als WIZ-Sub-Metrik** = neuer Score „Finanzplan-Validity" aus `lib/wizard/finanzplan-validator.ts`. Eval misst: % Einträge mit valid Finanzplan (vor Autofix), Autofix-Erfolg-Quote, # Halluzinationen im Finanzplan (z.B. erfundene TV-L-Honorar-Sätze wie UAT-28.04.). Validator-Hook: direkt nach `finanzplan`-Stage in der Pipeline — Eval liest `GenerationArtefacts`-Output. Finanzplan ist NICHT eigene Top-Level-Achse, sondern Sub-Metrik die in Report sichtbar wird; Pflichtabschnitt-Coverage des Finanzplans zählt in WIZ-01, Halluzinations-Marker im Finanzplan in WIZ-02.
- **D-12:** **Aggregat-Reports** = 3 Haupt-Scores (WIZ-01/-02/-03) + Sub-Metrik Finanzplan-Validity + Per-Dossier-Breakdown + Per-Geber-Gruppe-Breakdown (analog Phase 1 D-12). JSON-Report in `data/eval/pipeline-reports/<ISO>.json`, Konsolen-Tabelle, optional `--md-summary` für PR-lesbares Markdown. Latenz-Mittelwert + Kosten in Cent pro Eintrag.
- **D-13:** **Baseline** = aktueller HEAD von `feature/wizard-adaptive` (Phase-4-Closure-Commit). 1× Baseline-Run als Phase-5-Start, Commit-SHA + Datum in `data/eval/BASELINE.md` (append-only). Future-Tunings messen Delta gegen diesen Anker.
- **D-14:** **Marker-Listen-Kuration** = Claude generiert Entwürfe pro Eintrag (sieht Dossier + User-Antworten), Kolja reviewt + editiert manuell vor Korpus-Lock (Phase 1 D-08 Pattern). Hybrid-Geschwindigkeit + Kuratoren-Qualität.
- **D-15:** **Judge-LLM-Modell** = Hybrid: `deepseek-chat` default (~2-3s, ~0.1 ct pro Call), `--pro-judge`-Flag schaltet auf `deepseek-v4-pro` (Reasoning) für deep audits / strittige Pre-PR-Final-Checks.

### Reproducibility / LLM-Determinismus

- **D-16:** **Baseline-Lauf = Mean of N=3 Runs pro Eintrag**, danach Single-Run für Iteration. Baseline berechnet auch Std-Abweichung pro Score in `BASELINE.md`. Bei Threshold-Gate-FAIL: automatischer N=3-Re-Run zur Verifikation (Rauschen-Robustheit).
- **D-17:** **Threshold-Gate-Toleranz** = Std-Abweichung aus Baseline-N=3 × 2 (2σ-Band, ~95 % Konfidenz). Score-Drops bis 2σ unter Baseline gelten als Rauschen, nicht als Regression. Setzt voraus dass Baseline mit N=3 lief.
- **D-18:** **Baseline-Format** = `BASELINE.md` hat Eintrag mit `mean` + `stddev` pro Score; `reports/<ISO>.json` hat alle 3 Einzelresultate (Audit-Trail + reproduzierbare 2σ-Berechnung).

### Phase-Scope + Tuning-Hebel

- **D-19:** **Phase-Scope** = Korpus + Baseline + erste Tuning-Welle bis Schwellwert. Definition-of-Done: messbares Delta pro Achse — **WIZ-01 ≥ 80 % Pflichtabschnitte-Coverage, WIZ-02 ≥ 50 % Marker-Reduktion, WIZ-03 Score-Delta > 0 pro Geber-Gruppe**. ROADMAP-Original-Crit (100 %/0/Delta dokumentiert) bleibt langfristiges Ziel — Phase 5 macht den ersten großen Sprung.
- **D-20:** **Tuning-Hebel = ALLE 4** parallel im Scope:
  1. **System-Prompts schärfen** (CRITIQUE/SECTION/REVISION/RECHECK) — Verbots-Listen erweitern, Few-Shot-Negativbeispiele aus UAT-Marker-Liste, Pflicht-Erstprüfung „Halluzinations-Audit" auch in RECHECK
  2. **Pipeline-Stage erweitern** — neue Stage `compliance-check` zwischen `recheck` und `done`: prüft strict gegen `antragsstruktur.abschnitte[].id` + `maxZeichen`, triggert Revision wenn Verletzung. Backend-only, KEINE GeneratingProgress-UI-Anzeige (silent Stage).
  3. **Dossier-Daten stärker nutzen** — `vorbildFormulierungen[]` + `bestPractices[]` + `rejectGruende[]` aus dem Dossier in SECTION_SYSTEM / REVISION_SYSTEM injizieren. Nutzt Phase-3/4-Schema-Investitionen ein.
  4. **Geber-Typ-Routing ausbauen** — `geber-guidance.ts` Rubrics schärfen, zusätzliche `programm-kriterien.ts`-`ExtraGuidance`-Einträge für die 11 Dossiers ergänzen.
- **D-21:** **Hebel-Reihenfolge** = Eval-first datengetrieben. Phase 5 etabliert erst Korpus+Baseline (Wave 1-2). Dann werden Hebel in der Reihenfolge angefasst, in der die Eval-Aggregate die größten Defizite zeigen (Wave 3). Kein Bauchgefühl-Tuning. Im Hebel-Tuning sind die 4 Hebel parallelisierbar (Wave 3 = 4 Plans gleichzeitig), da disjunkte Code-Pfade.
- **D-22:** **Feature-Flags** = alle 4 Hebel sind Env-Var-gesteuert (`PIPELINE_USE_VORBILD_FORMULIERUNGEN`, `PIPELINE_COMPLIANCE_STAGE`, `PIPELINE_SHARP_PROMPTS`, `PIPELINE_GEBER_ROUTING_V2`) für A/B-Eval. Defaults konfiguriert in `lib/wizard/config.ts` (oder analog). Eval-Skript kann Hebel einzeln ein/aus schalten und misst Delta pro Hebel — zeigt ROI pro Hebel.
- **D-23:** **Eskalation bei FAIL** = Wenn 1. Tuning-Welle die Schwellwerte nicht erreicht, kommt eine 2. Welle in derselben Phase (Phase 5 bleibt offen, weitere Tuning-Plans werden ergänzt). NICHT eine separate Phase 5.1.

### Threshold-Gate + PR-Discipline

- **D-24:** **Eval-Skript als Pflicht-Vorabcheck** bei PRs die `lib/wizard/**` oder `data/richtlinien/**` ändern. Hartes Block-Verhalten: CI-Workflow blockt Merge wenn Eval-Aggregat unter Baseline fällt (achsen-spezifisch, siehe D-25). Default-Aufruf ist `--replay` (kein LLM-Cost in CI).
- **D-25:** **Block-Status achsen-spezifisch:**
  - WIZ-01 = **hart** (block bei jeder Regression unter Baseline-2σ — Pflichtabschnitte sind deterministisch messbar)
  - WIZ-02 = **mittel** (block bei > 10 % Regression über Baseline-2σ — Marker-Detection hat geringe LLM-Variabilität)
  - WIZ-03 = **warning only** (LLM-Judge ist rauschig, kein Block — Reviewer entscheidet)
- **D-26:** **Korpus-Updates** erfordern Baseline-Recalc im selben PR: bei Änderung an `data/eval/pipeline-korpus.json` muss derselbe PR auch eine neue Baseline-Berechnung (1× `--live`-Run) + `BASELINE.md`-Eintrag mit Begründung („Korpus erweitert um X") enthalten. Verhindert dass Korpus-Tweaks die Baseline weg-shiften.
- **D-27:** **CI-Workflow** = neuer `.github/workflows/pipeline-eval.yml` (PR-Trigger auf `lib/wizard/**` + `data/richtlinien/**`, manual-dispatch verfügbar). Sibling zum `weekly-auto-pflege.yml`. Workflow ruft `npx tsx scripts/eval-pipeline.ts --replay` + parsed Report-JSON für GitHub-Annotation pro Achse.

### Geber-Typ-Klassifikation

- **D-28:** **Neues Modul `lib/wizard/geber-classification.ts`** als explizite Mapping-Tabelle Programm-ID → strategische Geber-Gruppe. Initial befüllt für die 11 Dossiers (z.B. `bmbf-digitalpakt-2` → `bundesfoerderung`, `bosch-schulpreis` → `wirtschaftspreis`, `ferry-porsche-challenge-2025` → `wirtschaftspreis`, `aktion-mensch-schulkooperation` → `stiftung`, `erasmus-schule-2026` → `eu`, `kultur-macht-stark` → `verband`). Kein Schema-Change am Dossier (kein neues Pflichtfeld). Spätere Programme werden ad-hoc gepflegt — Phase-5-Scope deckt nur die 11 Dossiers ab.
- **D-29:** **WIZ-03-Auswertungs-Gruppen finalisiert auf 4-5 strategische Cluster** (siehe D-10). Überschreibt eine Zwischen-Decision (8 GeberTypen) — Begründung: `verband` und `programm` sind semantisch heterogen, Aggregation auf strategische Cluster liefert klarere Tonalitäts-Signale.

### Wave-Struktur + Test-Disziplin

- **D-30:** **Plan-Anzahl-Schätzung** = 6-8 Plans in 4 Wellen (analog Phase 4-Größe). Final-Plan-Count wird vom Planner bestimmt.
- **D-31:** **Wave-Layout (Planner darf anpassen):**
  - **Wave 0:** ROADMAP.md-Update (WIZ-04 raus, Crits angepasst, UI-hint raus) + REQUIREMENTS.md Traceability-Update + Test-Skelette für `eval-pipeline.ts`, `geber-classification.ts`, `finanzplan-validator-wrapper.ts`
  - **Wave 1:** Korpus-Kuration (`pipeline-korpus.json` mit 20-25 Einträgen, Kolja-Checkpoint) + `geber-classification.ts`-Mapping (11 Dossiers gemappt) — parallel
  - **Wave 2:** `scripts/eval-pipeline.ts` Implementierung (WIZ-01 strict FK + WIZ-02 3-Layer-Hybrid + WIZ-03 LLM-Judge-Rubric + Finanzplan-Sub-Metrik + Snapshot/Replay) + Baseline-N=3-Run + `BASELINE.md` Phase-5-Eintrag
  - **Wave 3:** Tuning-Welle (alle 4 Hebel parallel, je 1 Plan, Eval-Diff nach jedem Merge)
  - **Wave 4:** `.github/workflows/pipeline-eval.yml` CI-Threshold-Gate + Pre-Closure-Live-Smoke + `data/eval/README.md` + CLAUDE.md-Update + `.planning/codebase/STACK.md`-Update + `data/eval/TUNING.md`-Playbook
- **D-32:** **Wave-0-Test-Skelette** (analog Phase 2 D-skel): Jest-Tests in `__tests__/eval/` (Sibling zu existierender `__tests__`-Struktur). Pflicht-Test-Typen: Unit-Tests für Eval-Score-Berechnung (FK-Match-Logik, Marker-Regex, Rubric-Aggregation), Integration-Tests gegen Snapshot-Korpus mit gemockten LLM-Stubs, Live-Smoke-Test (`--live`-Flag, optional), Determinismus-Test (N=3-Variabilität messen, Std-Abweichung-Plausibilität).
- **D-33:** **Phase-5-Phase-2-Dep** = Phase 5 wartet auf Phase-2-Closure (Plans 02-04..02-07) aus Konsistenz-Gründen. Code-Pfade sind disjunkt (matcher.ts vs pipeline.ts), aber Phase-Reihenfolge linear halten für klare Story.

### Dokumentation + ROADMAP-Edit

- **D-34:** **ROADMAP.md-Update im 1. Plan der Phase 5** (Wave 0, expliziter Plan-Step). Konkrete Änderungen:
  - **Phase-5 Crit #5 gestrichen** (Reload-Resume → Phase 02.1)
  - **`UI hint: yes` gestrichen** (Phase 5 ist Backend-only)
  - **Crits #1-4 angepasst auf konservative Schwellwerte:** Crit #2 → „WIZ-01: ≥ 80 % der Pflichtabschnitte..."; Crit #3 → „WIZ-02: ≥ 50 % Reduktion der kuratierten Halluzinations-Marker..."; Crit #4 → „WIZ-03: Score-Delta > 0 pro strategischer Geber-Gruppe (öffentlich/Stiftung/EU/Wirtschaftspreis/Verband+Uni) — Methode dokumentiert"
  - **Crit #1 erweitert** um Sub-Metrik Finanzplan-Validity
  - **REQUIREMENTS.md Traceability-Tabelle** entsprechend angepasst (WIZ-04 → Phase 02.1, WIZ-01/-02/-03 → Phase 5 mit angepassten Bezugswörtern).
- **D-35:** **Dokumentations-Output:**
  - `data/eval/README.md` — Überblick Eval-Apparat (Korpus, Skript, Reports, Snapshot/Replay, Aufruf-Konvention)
  - `CLAUDE.md` (Repo-Root) — Eval-Sektion (npx tsx scripts/eval-pipeline.ts, Threshold-Gate als PR-Pflicht)
  - `.planning/codebase/STACK.md` — Eval-Apparat als Komponente
  - `data/eval/TUNING.md` — Append-only Playbook (pro Tuning-Iteration: welcher Hebel, welche Änderung, welcher Score-Delta)

### Pre-Closure-Live-Smoke

- **D-36:** Vor Phase-5-Closure läuft 1 Live-Pipeline-Run mit nicht-Korpus-Anliegen (frisches Test-Input, manueller Visueller-Check). Verhindert Korpus-Overfitting. Findet Regressionen die das Eval-Skript nicht trifft (z.B. UI-Side-Effects). Aufwand <30 min, Kolja-checkpoint.

### Claude's Discretion

- Konkrete Konsolen-Tabellen-Formatierung im Eval-Skript (ASCII vs `cli-table3` vs `console.table`)
- Snapshot-Dateinamenschema-Details (Sub-Ordner pro Run-Datum vs flach mit Hash)
- Parallelität der Pipeline-Calls im Eval-Skript (sequenziell ist OK, DeepSeek-Quota erlaubt aber moderate Parallelität)
- LLM-Judge-Rubric-Wortlaut pro strategischer Geber-Gruppe (Researcher schlägt vor, Kolja kann editieren)
- Konkrete `expected_forbidden_markers[]` pro Korpus-Eintrag (Claude generiert, Kolja reviewt — D-14)
- Score-Range-Normalisierung pro WIZ-Achse (alle auf 0-100? Per-Achse-Range? — Discretion)
- Feature-Flag-Default-Werte (alle 4 Hebel default ON nach Tuning-Welle, vs ON im Test/Eval und OFF in Prod-Default? — Researcher schlägt vor)
- `data/eval/TUNING.md`-Format (tabellarisch vs Markdown-Section-pro-Iteration)
- ROADMAP-Wortlaut-Feintuning der angepassten Crits (Bedeutung muss D-34 entsprechen)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Scope + Requirements (LOCKED)

- `.planning/ROADMAP.md` §`Phase 5: Wizard-Pipeline-Tuning + UX-Lücke` — Goal-Statement, WIZ-01/-02/-03/-04-Mapping (WIZ-04 ist NACH Phase 02.1 verschoben, siehe D-34 für ROADMAP-Edit-Plan)
- `.planning/REQUIREMENTS.md` §`Antragswizard-Qualität` — WIZ-01/-02/-03 Acceptance-Wording, WIZ-04-Verschiebung in §`Frontend-UI-Polish`
- `.planning/phases/01-eval-korpus-matcher/01-CONTEXT.md` — Eval-Korpus-Vorbild (D-04 Pfad-Konvention, D-08 Hybrid-Generation, D-13 Skript-Pattern, D-14 Snapshot/Replay, D-15 JSON+Konsole-Output, D-16 append-only BASELINE.md). **Pflicht-Read für Konsistenz mit Matcher-Eval-Pattern.**
- `.planning/phases/02.1-frontend-polish-stripe-vorbereitung/02.1-CONTEXT.md` D-11/-12/-13 + Plan `02.1-06-PLAN.md` — WIZ-04 ist hier vollständig adressiert; Phase 5 referenziert nur, dass es geschlossen ist
- `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md` — FETCH-04-Closure (alle 11 Dossiers haben jetzt Strict-Schema mit den 4 Phase-3-Feldern); Phase 5 baut darauf

### Pipeline-Code (zu evaluierender + zu tunender Code)

- `lib/wizard/pipeline.ts` — 7 Stages (outline → section → critique → revision → recheck → finanzplan → consistency → done), `runPipeline()` ist die Eval-API. **NEU in Wave 3:** ggf. 8. Stage `compliance-check` (D-20 Hebel 2).
- `lib/wizard/prompts.ts` — OUTLINE_SYSTEM, SECTION_SYSTEM, CRITIQUE_SYSTEM, REVISION_SYSTEM, RECHECK_SYSTEM, CONSISTENCY_SYSTEM. **Tuning-Target Wave 3 Hebel 1** — schärfere Verbots-Listen + Few-Shot-Negativbeispiele aus UAT-Marker-Liste.
- `lib/wizard/llm.ts` — Provider-Wrapper. Eval läuft via `runPipeline()` durch diesen Wrapper, erbt DeepSeek-`deepseek-chat`-Default + 60s-Timeout. `--pro-judge`-Flag schaltet Judge-LLM auf `deepseek-v4-pro`.
- `lib/wizard/pricing.ts` — `CostLedger` wird vom Pipeline-Run zurückgegeben; Eval-Skript aggregiert über alle Einträge für Gesamtkosten (analog Phase 1).
- `lib/wizard/types.ts` — `PipelineStage`, `GenerationArtefacts`, `WizardFacts`, `WizardMessage` — die Eval-API-Datentypen.
- `lib/wizard/facts-extractor.ts` — Liefert pre-extrahierte `WizardFacts` für Korpus-Einträge (D-06 Eintrag-Struktur). Reduziert Eval-Variabilität.
- `lib/wizard/finanzplan-validator.ts` + `lib/wizard/finanzplan-autofix.ts` — D-11 Finanzplan-Sub-Metrik kommt direkt aus diesen Validator-Outputs.
- `lib/wizard/geber-guidance.ts` — `GeberTyp` (8 Werte) + `GeberGuidance` (Rubrics pro Typ). **Tuning-Target Wave 3 Hebel 4** — Rubrics schärfen.
- `lib/wizard/programm-kriterien.ts` — `ExtraGuidance` pro Programm (handverlesen). Erweiterungspunkt für Wave 3 Hebel 4.
- `lib/wizard/richtlinien-schema.ts` — `Richtlinie.antragsstruktur.abschnitte[].id|name|pflicht|maxZeichen` ist die WIZ-01-FK-Quelle. `vorbildFormulierungen[].abschnitt_id` ist die FK auf `abschnitte[].id` (Wave 3 Hebel 3 Prompt-Injection).
- `lib/wizard/richtlinien-loader.ts` — Lädt Dossiers für Pipeline-Calls. Eval-Skript nutzt denselben Loader.

### Daten

- `data/richtlinien/*.json` — alle 11 Dossiers (Strict-Schema-konform nach Phase 4). Jedes Dossier liefert die Pflicht-Abschnitt-IDs für WIZ-01-Scoring.
- `data/foerderprogramme.json` — 131 Programme. `programmId`s in Korpus-Einträgen müssen aus diesem Katalog stammen. `foerdergeberTyp`-Feld (`bund`/`land`/`eu`/`stiftung`/`sonstige`) ist Eingang für Geber-Classification (D-28).
- `data/eval/matcher-korpus.json` — Phase-1-Pattern-Vorbild für `data/eval/pipeline-korpus.json` (Top-Level-JSON-Array, kein Wrapper).
- `data/eval/BASELINE.md` — append-only History, Phase 5 ergänzt Phase-5-Eintrag (D-13 Baseline-Run, D-16 N=3-mean+stddev, D-18 Format).
- `data/eval/reports/` + `data/eval/snapshots/` — bestehende Konvention von Phase 1; Phase 5 ergänzt parallel `data/eval/pipeline-reports/` + `data/eval/pipeline-snapshots/`.

### Smoke-Skript-Vorbilder (Pattern für `scripts/eval-pipeline.ts`)

- `scripts/smoke-pipeline-with-extractor.ts` — Vorbild für Live-Pipeline-Smoke-Skript-Aufbau (Aufruf-Konvention, Kosten-Aggregation, Konsolen-Output).
- `scripts/smoke-pipeline-models.ts` — A/B-Vergleichs-Pattern für deepseek-chat vs deepseek-v4-pro.
- `scripts/smoke-pipeline-rerun.ts` — Rerun-Pattern für gespeicherte Sessions.
- `scripts/eval-matcher.ts` (sollte existieren analog Phase 1 D-13) — direktes Pattern-Vorbild für `scripts/eval-pipeline.ts`.

### UAT-Kontext (Quelle für Korpus-Inhalt + Marker-Listen)

- `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md` — Borsigwalder-UAT-Reproducer mit 12 vag-Antworten + 8 dokumentierten Halluzinations-Markern + Test-Setup. **Pflicht-Read als UAT-Real-Pattern-Anker (D-02 60 % UAT-Quelle).**

### Projekt-Konventionen

- `CLAUDE.md` (Repo-Root) — DeepSeek-Default, deutsche Sprache in Doku/Commits/Logs, Conventional-Commit-Präfixe, Branch-Workflow `feature/* → staging → main`. **Wird in Wave 4 um Eval-Sektion erweitert (D-35).**
- `.planning/codebase/STACK.md` + `.planning/codebase/CONVENTIONS.md` + `.planning/codebase/STRUCTURE.md` — Tech-Stack, Skript-Konventionen, Verzeichnisstruktur.
- `.planning/PROJECT.md` — Performance-Constraints (Matcher < 3s, Cost pro Antrag < 1 ct), Out-of-Scope.

### CI / GitHub-Workflows

- `.github/workflows/weekly-auto-pflege.yml` (Phase 4) — Sibling-Vorbild für `.github/workflows/pipeline-eval.yml` (Workflow-Härtung-Pattern: `set -euo pipefail`, Secret-Pre-Flight-Check, Pull-Request-Trigger-Patterns).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`runPipeline()` aus `lib/wizard/pipeline.ts`** — Eval-Skript ruft diese Funktion direkt mit jedem Korpus-Eintrag (`WizardFacts` + `user-answers[]` + `Richtlinie`), erhält `GenerationArtefacts` zurück. Keine Wrapper-Layer nötig.
- **`GenerationArtefacts.stage` + `sections` + `finanzplan` + `consistency`** — natürliche Datenquelle für WIZ-01 (Sections-Coverage), Finanzplan-Sub-Metrik und WIZ-02 (Marker-Suche in `sections[].text`).
- **`CostLedger` aus `lib/wizard/pricing.ts`** — Pro Eintrag wird ein Ledger geführt; Aggregation über alle Einträge ergibt Gesamt-Tokenkosten in Cent (Phase 1 D-12 Pattern).
- **`facts-extractor.ts`** — Pre-extrahiert `WizardFacts` aus User-Antworten; Eval-Korpus-Einträge nutzen diesen Output statt eines Interview-Stage-Replays (D-06).
- **`richtlinien-loader.ts`** — Dossier-Lookup-Helper, derselbe Loader für Pipeline-Run und Eval-FK-Match.
- **`finanzplan-validator.ts`** — Validator-Pass-Rate ist direkter Input für Finanzplan-Sub-Metrik (D-11).
- **`geber-guidance.ts` + `programm-kriterien.ts`** — Bestehende Tuning-Targets (Wave 3 Hebel 4), nichts wird neu gebaut.
- **Phase-1-Pattern (`scripts/eval-matcher.ts`)** — Direktes Vorbild für `scripts/eval-pipeline.ts`: Top-Level-Async, `process.exit()`-Disziplin, JSON+Konsole-Output, Snapshot/Replay-Flag-Logik.
- **Smoke-Skript-Pattern** — `scripts/smoke-pipeline-with-extractor.ts` zeigt etabliertes Pattern für `npx tsx`-CLI-Skripte mit Live-LLM-Calls.

### Established Patterns

- **`npx tsx scripts/<name>.ts`-Aufruf** — kein Build-Schritt, direkter TS-Run. Eval-Skript folgt diesem Pattern.
- **JSON-First-Output für Daten, Markdown für Doku** — bestehende Smoke-Skripte schreiben strukturierte JSON-Berichte mit menschen-lesbaren Konsolen-Tabellen daneben.
- **DeepSeek-`deepseek-chat`-Default** — kein Reasoning, ~2s Latenz, ~0.1 ct pro Call. 25 Einträge × 7 Stages = ~175 Calls pro Eintrag-Run, aber Pipeline interne Stages sind teilweise gebündelt — gesamt-Voll-Lauf ~3-4 EUR.
- **`peter-evans/create-pull-request@v7`-Workflow-Pattern** (Phase 3+4) — wird NICHT in Phase 5 verwendet (kein Auto-PR), aber Workflow-Härtung-Konventionen werden übernommen.
- **`PipelineStage`-Type als Source-of-Truth** — neue `compliance-check`-Stage (D-20 Hebel 2) muss in `lib/wizard/types.ts` ergänzt werden, GeneratingProgress bleibt unverändert (silent stage).
- **Conventional-Commits Deutsch** mit `feat`/`fix`/`chore`/`docs`-Prefixes.

### Integration Points

- **Eval-Skript** ist read-only gegen `lib/wizard/pipeline.ts` für Baseline-Run und Eval-Runs. Tuning-Wellen modifizieren Pipeline-Code mit Feature-Flag-Schutz (D-22).
- **`data/eval/pipeline-korpus.json`** — neue Datei, Sibling zu `matcher-korpus.json`. Reports + Snapshots in parallelen Sub-Ordnern.
- **`lib/wizard/geber-classification.ts`** — neues Modul (D-28), Mapping-Tabelle Programm-ID → strategische Geber-Gruppe. Wird vom Eval-Skript importiert für Per-Geber-Gruppe-Aggregation.
- **`__tests__/eval/`** — neuer Test-Sub-Ordner. Unit + Integration + Determinismus-Tests für Eval-Apparat.
- **`.github/workflows/pipeline-eval.yml`** — neuer CI-Workflow, PR-Trigger auf `lib/wizard/**` + `data/richtlinien/**`.
- **Keine DB-Änderungen, keine Migrationen.** Pipeline-Tuning ist code-only.
- **Frontend: keine User-facing-Änderung.** Wenn `compliance-check`-Stage kommt, bleibt sie silent (kein GeneratingProgress-Update); UI-hint aus ROADMAP wird gestrichen (D-34).

</code_context>

<specifics>
## Specific Ideas

- **UAT-28.04.-Borsigwalder-Reproducer als Korpus-Anker:** Die 8 dokumentierten Halluzinations-Marker („Az 123/2026", „TV-L E9", „Bezirk Berlin-Mitte", „380 Schüler", „Willkommensklassen", „Beschluss vom 12.12.2025", „Haushaltsstelle 1234/56789", „KMK-Kompetenzen aktiv adressiert obwohl User ‚kenne nicht'") sind das Vorbild für `expected_forbidden_markers[]` pro Korpus-Eintrag. UAT-Memo ist Pflicht-Read für Korpus-Kuratoren.
- **„Lieber kürzer als erfunden":** Pipeline-Härtung 30.04. hat das als Prinzip etabliert (siehe `SECTION_SYSTEM` + `FINANZPLAN_SYSTEM`). Phase 5 schärft dieses Prinzip in der Marker-Detection — Eval-Korpus muss „Pipeline schreibt ehrliche Lücken-Marker" als Soll-Verhalten testen können.
- **Eval-first, kein Bauchgefühl-Tuning:** Wiederholung des Phase-1-Mantras („Bauchgefühl-Optimierung skaliert nicht"). Phase 5 verwendet exakt dasselbe Pattern wie Phase 1 für die Pipeline-Achse.
- **Wave-3-Hebel-Parallelisierung:** Eval-Korpus dient als Regressions-Detector wenn die 4 Hebel parallel laufen — disjunkte Code-Bereiche, aber Eval-Run nach jeder Merge zeigt Cross-Hebel-Side-Effects.
- **WIZ-03-Heterogenität:** `verband` und `programm` als `GeberTyp` sind zu heterogen (bosch-schulpreis ist nominal Verband aber semantisch Wirtschaftspreis; ENSA-BMZ ist nominal Programm aber semantisch EU-formalisiert). Deshalb 4-5 strategische Gruppen statt 8 Original-Typen (D-10 + D-29).

</specifics>

<deferred>
## Deferred Ideas

### Aus WIZ-Achsen ausgeklammert (v2 oder spätere Phase)

- **WIZ-02-Layer-3 LLM-Judge als CI-Default** — `--deep`-Flag bleibt optional in Phase 5, nicht im PR-Threshold-Gate. LLM-Judge ist teurer + rauschiger, wird erst Default wenn Marker+Regex-Layer ausgereizt ist (v2).
- **Eval-Result-Admin-Dashboard** (`/admin/eval`-UI) — Scope-Creep, BASELINE.md + Reports reichen für Phase 5.
- **NDCG-light / Position-aware Tonalitäts-Metrik** — verworfen für Phase 5 (zu schwer interpretierbar), v2-Material.
- **Score-Erwartungen pro Pflichtabschnitt** (z.B. „Abschnitt X muss ≥ 500 Zeichen haben") — Phase 5 prüft nur Vorhanden + `maxZeichen`-Limit, nicht Mindest-Länge. v2.
- **Real-User-Anliegen-Sammlung mit Anonymisierungs-Workflow** — out-of-scope, UAT-Hybrid reicht. Phase 6 (Live-UAT) liefert echte User-Inputs für v2-Korpus-Erweiterung.

### Aus Tuning-Hebeln ausgeklammert

- **Pipeline-Stage-Reorder (z.B. compliance-check vor Critique statt nach Recheck)** — Phase 5 fügt compliance-check nur am Ende ein. Stage-Reorder wäre größere Architektur-Änderung.
- **Multi-Provider-A/B** (OpenAI/Anthropic vs DeepSeek) — Out-of-Scope per REQUIREMENTS (DeepSeek+Gemini-Fallback reichen).
- **Auto-Tuning-Pipeline (z.B. RLHF gegen Eval-Korpus)** — sehr v2 / Forschungs-Phase.

### Aus UI-Touchpoints ausgeklammert

- **GeneratingProgress.tsx-Erweiterung auf 8 Stages** — compliance-check ist silent (D-20 Hebel 2). Falls Live-UAT zeigt dass User compliance-check sehen will, in Phase 6 nachziehen.
- **`/admin/eval`-Dashboard** — siehe oben.

### Aus Phase-2-Verhältnis abgeleitet

- **Phase-5-Parallel-Start zu Phase 2** — explizit verworfen (D-33), Phase-Reihenfolge linear halten.

### Aus Reproducibility ausgeklammert

- **Per-Eintrag-N=10-Stability-Tests** — N=3 reicht für 2σ-Toleranz, höhere N machen Voll-Lauf unbezahlbar.
- **Seed-basierte Determinismus** — DeepSeek-API hat Seed-Param nur teilweise implementiert, Phase 5 setzt nicht darauf.

### Aus Geber-Classification ausgeklammert

- **Auto-Klassifikation neuer Programme im Phase-4-Workflow** — Phase 5 mappt nur die 11 Dossiers. Spätere Programme werden ad-hoc gepflegt. Wenn Katalog wächst, Auto-Klassifikation-Phase als Erweiterung von `weekly-auto-pflege.yml`.

</deferred>

---

*Phase: 05-wizard-pipeline-tuning-ux-l-cke*
*Context gathered: 2026-05-19*
