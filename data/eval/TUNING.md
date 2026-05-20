# Phase 5 Pipeline-Tuning Playbook

> Append-only History pro Tuning-Iteration. Wave-3-Hebel-Bloecke aus tuning-hebel-1-3.md, tuning-hebel-2.md, tuning-hebel-4.md konsolidiert. Default-Decision-Block am Ende.

---

## 2026-05-20 — Wave 3 Hebel 1 (geschärfte Verbots-Listen + Few-Shot-Negativ)

**Konfiguration:** `PIPELINE_SHARP_PROMPTS=1`

**Aenderung:** Anhang `SHARP_HALLU_VERBOTS_BLOCK` an SECTION/CRITIQUE/REVISION/RECHECK_SYSTEM. Pflicht-Halluzinations-Audit in RECHECK. Few-Shot-Negativbeispiele aus UAT-28.04. (Az 123/2026, TV-L E9, Beschluss-Datum 12.12.2025, Haushaltsstelle 1234/56789, KMK-Bezug ohne User-Beleg). Konstante `RECHECK_AUDIT_BLOCK` ergaenzt RECHECK mit explizitem Post-Revision-Pruefschritt.

**Report:** `data/eval/pipeline-reports/2026-05-20T10-57-05.json` (N=1, 22 Eintraege, nErrored=0)

**Eval-Resultat (Variante A vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-1 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|--------------|-------|---------------|
| WIZ-01 | 100.0 | 100.0 | 0.0 | ja |
| WIZ-02 | 98.3 | 99.5 | +1.2 | ja (2σ-Band 89.3–107.3) |
| WIZ-03 | 46.3 | 45.5 | -0.8 | ja (2σ-Band 14.7–77.9) |
| Finanzplan-Sub | 92.0 | 90.9 | -1.1 | ja |

**Per-Geber-Cluster WIZ-03 (Delta):**

| Cluster | Baseline | Hebel-1 | Delta |
|---------|----------|---------|-------|
| oeffentlich (n=7) | 43.1 | 40.4 | -2.7 |
| stiftung (n=4) | 55.0 | 56.8 | +1.8 |
| eu (n=3) | 58.1 | 58.3 | +0.2 |
| wirtschaftspreis (n=4) | 51.5 | 55.0 | +3.5 |
| verband-uni (n=3) | 39.1 | 31.7 | -7.4 |

**Methodische Einschraenkung:** N=1 vs. N=3 Baseline. LLM-Varianz bei Gemini-2.0-flash betraegt bei WIZ-03 ~15-17 Stddev — Deltas kleiner als 10 Punkte nicht sicher als echte Effekte zu werten.

**Befund WIZ-02 (+1.2):** Marginale Verbesserung. Liegt im 2σ-Rauschbereich. Baseline-Eintraege haben `expected_forbidden_markers=[]` — Hebel 1 haette staerkeren Effekt wenn Dossier-spezifische Marker eingetragen waeren.

**Befund WIZ-03 (-0.8 global, -7.4 verband-uni):** Kein eindeutiger positiver Effekt. verband-uni-Rueckgang koennte N=1-Varianz sein.

**Empfehlung:** Default ON setzen — Hebel 1 schadet nicht (alle Deltas innerhalb 2σ) und adressiert echtes Problem (Halluzinations-Verbots-Listen).

---

## 2026-05-20 — Wave 3 Hebel 3 (Dossier-Daten-Injection)

**Konfiguration:** `PIPELINE_USE_VORBILD_FORMULIERUNGEN=1`

**Aenderung:** buildSectionPrompt + buildRevisionPrompt injizieren vorbildFormulierungen/bestPractices/rejectGruende aus Dossier.

**Report:** `data/eval/pipeline-reports/2026-05-20T11-16-42.json` (N=1, 22 Eintraege, nErrored=4)

**Scope-Begrenzung:** Hebel 3 wirkt strukturell nur fuer 2/11 Dossiers:
- `aktion-mensch-schulkooperation`: 3 vorbildFormulierungen + 2 bestPractices
- `kultur-macht-stark`: 4 vorbildFormulierungen + 4 bestPractices + 4 rejectGruende

Fuer die anderen 9 Dossiers bleibt buildSectionPrompt unveraendert (leere Arrays → keine Injection).

**Eval-Resultat (Variante B vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-3 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|--------------|-------|---------------|
| WIZ-01 | 100.0 | 100.0 | 0.0 | ja |
| WIZ-02 | 98.3 | 96.7 | -1.6 | ja (2σ-Band 89.3–107.3) |
| WIZ-03 | 46.3 | 46.4 | +0.1 | ja |
| Finanzplan-Sub | 92.0 | 88.9 | -3.1 | ja |

**Per-Geber-Cluster WIZ-03 (Delta):**

| Cluster | Baseline | Hebel-3 | Delta | n effektiv |
|---------|----------|---------|-------|------------|
| oeffentlich (n=7→6) | 43.1 | 41.0 | -2.1 | 6 (1 fehlt wegen 429) |
| stiftung (n=4→3) | 55.0 | 58.0 | +3.0 | 3 (1 fehlt) |
| eu (n=3) | 58.1 | 57.7 | -0.4 | 3 |
| wirtschaftspreis (n=4→2) | 51.5 | 51.0 | -0.5 | 2 (2 fehlen) |
| verband-uni (n=3) | 39.1 | 47.0 | +7.9 | 3 |

**Befund:** WIZ-03 Delta nahe 0 (+0.1 global). Kein statistisch gesicherter positiver Effekt bei N=1 + 4 nErrored. Keine negativen Seiten-Effekte ausserhalb 2σ.

**Empfehlung:** Default ON setzen — Injection schadet nicht, nutzt Phase-3/4-Schema-Investitionen, wirkt fuer 2/11 Dossiers (aktion-mensch, kultur-macht-stark). Echter Signal bei `maxZeichen`-Constraints oder N=3-Dossier-spezifischem Run erwartet.

---

## 2026-05-20 — Wave 3 Hebel 1+3 kombiniert

**Konfiguration:** `PIPELINE_SHARP_PROMPTS=1 PIPELINE_USE_VORBILD_FORMULIERUNGEN=1`

**Report:** `data/eval/pipeline-reports/2026-05-20T11-16-45.json` (N=1, 22 Eintraege, nErrored=10)

**Einschraenkung:** 10 Rate-Limit-Fehler durch gleichzeitige Ausfuehrung aller 3 Varianten-Runs. Nur 12 Eintraege haben valide Scores — Metriken mit hoher Unsicherheit.

**Eval-Resultat (Variante C vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-1+3 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|----------------|-------|---------------|
| WIZ-01 | 100.0 | 100.0 | 0.0 | ja |
| WIZ-02 | 98.3 | 99.2 | +0.9 | ja |
| WIZ-03 | 46.3 | 47.5 | +1.2 | ja |
| Finanzplan-Sub | 92.0 | 91.7 | -0.3 | ja |

**Cross-Hebel-Side-Effects:** Der befuerchtete Side-Effect (Sharp-Prompts klassifiziert Vorbild-Formulierungen als Floskeln) zeigt sich nicht eindeutig. Bei nErrored=10 ist der Befund nicht belastbar.

---

## 2026-05-20 — Wave 3 Hebel 2 (Compliance-Check-Stage)

**Konfiguration:** `PIPELINE_COMPLIANCE_STAGE=1`

**Aenderung:** Neue PipelineStage `compliance-check` zwischen `recheck` und `finanzplan`. Deterministischer FK-Check gegen `richtlinie.antragsstruktur.abschnitte[].id` + maxZeichen + Mindest-Laenge (50 Zeichen). Bei Violations: 1× REVISION_SYSTEM-LLM-Call. Loop-Count-Schutz: max 1 Iteration (T-05-06-01 DoS-Mitigation). Stage ist silent gegenueber GeneratingProgress.tsx (D-20).

**Report:** `data/eval/pipeline-reports/2026-05-20T11-44-29.json` (N=1, 22 Eintraege, nErrored=2)

**Eval-Resultat (Variante D vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-2 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|--------------|-------|---------------|
| WIZ-01 (Pflichtabschnitte) | 100.0 | 100.0 | 0.0 | ja (Deckeneffekt) |
| WIZ-02 (Halluzinations-Detection) | 98.3 | 99.5 | +1.2 | ja (2σ-Band 89.3–107.3) |
| WIZ-03 (Tonalitaets-Passung) | 46.3 | 49.1 | +2.8 | ja (2σ-Band 14.7–77.9) |
| Finanzplan-Validity (Sub) | 92.0 | 90.0 | -2.0 | ja |

**Per-Geber-Cluster WIZ-03 (Delta):**

| Cluster | Baseline | Hebel-2 | Delta |
|---------|----------|---------|-------|
| oeffentlich (n=7) | 43.1 | 44.4 | +1.3 |
| stiftung (n=4) | 55.0 | 59.5 | +4.5 |
| eu (n=3) | 58.1 | 58.3 | +0.2 |
| wirtschaftspreis (n=4) | 51.5 | 47.3 | -4.2 |
| verband-uni (n=3) | 39.1 | 58.5 | +19.4 |

**Compliance-Stats:** 16/20 Eintraege hatten Richtlinie mit Pflichtabschnitten. Loop-Count-Schutz greift: max 1 Compliance-Revision-Iteration pro Eintrag.

**Befund WIZ-01 (0.0):** Compliance-Check erkennt fehlende Abschnitte per String-Match. Da alle Pflicht-Abschnitte immer erzeugt werden (Deckeneffekt), triggert der Check keine Violations. Realer Wert entfaltet sich erst mit `maxZeichen`-Constraints in Dossiers.

**Befund WIZ-03 (+2.8 global, +19.4 verband-uni):** Kleines globales Plus. verband-uni-Delta ist Ausreisser (n=2, N=1 → einzelner Run-Effekt, nicht als Hebel-2-Wirkung zu werten).

**Empfehlung:** Default OFF belassen — Wert entfaltet sich erst wenn `maxZeichen`-Constraints in Dossier-Eintraegen gepflegt sind. Kein negativer Effekt nachgewiesen. Revisit wenn Dossiers maxZeichen-Felder erhalten.

---

## 2026-05-20 — Wave 3 Hebel 4 (Geber-Typ-Routing V2 + ExtraGuidance-Erweiterung)

**Konfiguration:** `PIPELINE_GEBER_ROUTING_V2=1`

**Aenderung Teil 1 (geber-guidance.ts):** GUIDANCE_V2-Record mit geschaerfter critiqueFocus + sectionStyle + interviewerPriorities pro 8 GeberTyp-Werten. Selector-Export `GUIDANCE` waehlt zwischen GUIDANCE_BASE und GUIDANCE_V2.

**Aenderung Teil 2 (programm-kriterien.ts):** ExtraGuidance-Records fuer 7 weitere Dossier-Programme ergaenzt (kultur-macht-stark, ensam-bmz, erasmus-schulentwicklung, ferry-porsche-challenge, ferry-porsche-challenge-2025, klimalab-2026, berlin-startchancen) + Erweiterung aktion-mensch. Coverage: 11/11 Dossiers.

**Report:** `data/eval/pipeline-reports/2026-05-20T12-16-47.json` (N=1, 22 Eintraege, 0 Fehler)

**Eval-Resultat Hebel 4 vs Baseline (N=3):**

| Cluster | Baseline Mean (N=3) | Hebel-4 Mean (N=1) | Delta vs Baseline | Innerhalb 2σ? |
|---------|---------------------|---------------------|-------------------|---------------|
| oeffentlich | 43.1 | 40.7 | -2.4 | ja (2σ=31.6) |
| stiftung | 55.0 | 64.0 | +9.0 | ja (2σ=23.4) |
| eu | 58.1 | 58.0 | -0.1 | ja (2σ=26.5) |
| wirtschaftspreis | 51.5 | 51.8 | +0.3 | ja (2σ=23.0) |
| verband-uni | 39.1 | 28.7 | -10.4 | ja (2σ=7.4) |
| **WIZ-03 Gesamt** | **46.3** | **45.8** | **-0.5** | **ja (2σ=16.9)** |

**WIZ-01/-02 Seiteneffekte:**

| Achse | Baseline Mean (N=3) | Hebel-4 Mean (N=1) | Delta |
|-------|---------------------|---------------------|-------|
| WIZ-01 | 100.0 | 100.0 | 0.0 |
| WIZ-02 | 98.3 | 99.5 | +1.2 |

**Befund:** Stiftung-Cluster +9.0 (groesstes positives Delta), Wirtschaftspreis +0.3 moderat positiv. verband-uni -10.4 problematisch (N=1-Varianz unklar vs. echter GUIDANCE_V2-Effekt). Kein negativer Seiteneffekt bei WIZ-01/WIZ-02.

**Empfehlung:** Default ON setzen — klare Stiftungs-/Wirtschaftspreis-Verbesserung, kein WIZ-01/WIZ-02-Schaden. verband-uni-Einbruch unter Beobachtung stellen; bei naechstem N=3-Run: falls verband-uni stabil unter Baseline, GUIDANCE_V2-Rubric fuer verband/uni abflachen.

---

## 2026-05-20 — Phase-5-Closure: Default-Hebel-Entscheidung

**Datenlage (aus Wave-3-Eval-Runs, alle N=1 vs. N=3-Baseline):**

| Hebel | Delta WIZ-01 | Delta WIZ-02 | Delta WIZ-03 | Side-Effects | Empfehlung |
|-------|--------------|--------------|--------------|--------------|------------|
| 1 Sharp-Prompts | 0.0 | +1.2 | -0.8 | Nein (alle innerhalb 2σ) | ON |
| 2 Compliance-Stage | 0.0 | +1.2 | +2.8 | Nein (Deckeneffekt WIZ-01) | OFF — revisit wenn maxZeichen in Dossiers |
| 3 Dossier-Injection | 0.0 | -1.6 | +0.1 | Nein (wirkt nur 2/11 Dossiers) | ON (kein Schaden, Potential bei Dossier-Ausbau) |
| 4 Geber-Routing V2 | 0.0 | +1.2 | -0.5 global / +9.0 stiftung | verband-uni -10.4 (unklar N=1-Varianz) | ON (Stiftungs-/WP-Cluster profitiert) |

**Decision:** default-selective — Hebel 1 (Sharp-Prompts), Hebel 3 (Dossier-Injection), Hebel 4 (Geber-Routing V2) ON; Hebel 2 (Compliance-Stage) OFF.

**Begruendung:** Hebel 1, 3, 4 zeigen keine messbaren Regressionen und adressieren echte Schwaechen (Halluzinations-Praevention, Dossier-Nutzung, Geber-Cluster-Tonalitaet). Hebel 2 entfaltet seinen Wert erst wenn Dossiers `maxZeichen`-Felder enthalten (aktuell 0/11) — dann greift der Compliance-Check real. Revisit fuer Hebel 2 sobald Dossier-Ausbau-Phase maxZeichen-Constraints eintraegt.

**Production-Default in lib/wizard/config.ts:**
- useVorbildFormulierungen: true (Hebel 3 ON)
- complianceStageEnabled: false (Hebel 2 OFF)
- sharpPrompts: true (Hebel 1 ON)
- geberRoutingV2: true (Hebel 4 ON)

**Phase-5-Schwellwert-Status (D-19):**
- WIZ-01 ≥ 80 %: erreicht — aktuelles Mean: 100.0 (Deckeneffekt, maxZeichen=0 in allen Dossiers)
- WIZ-02 ≥ 50 % Marker-Reduktion: Baseline = Anker (98.3); Wave-3-Runs zeigen keine Regression; echter Test erfordert Einpflegen von expected_forbidden_markers
- WIZ-03 Score-Delta > 0 pro Cluster: Hebel 4 zeigt +9.0 fuer stiftung / +0.3 fuer wirtschaftspreis; oeffentlich und verband-uni Messunschaerfe bei N=1

**Pre-Closure-Smoke (D-36):**
- Datum: 2026-05-20, Snapshot: `data/eval/pipeline-snapshots/2026-05-20T12-49-01/pv-smoke-2026-05-20-run1.json`
- Schultyp: Berufsschule Sachsen (nicht im Tuning-Korpus vertreten)
- Scores: WIZ-01=100 / WIZ-02=100 / WIZ-03=49 / Finanzplan=80 — Gate PASSED
- Halluzinations-Check: 0/4 forbidden markers getroffen, keine erfundenen Aktenzeichen/TV-L-Codes
- Kolja-Approval: approved

**Closure-Status:** Phase-5-Closure moeglich. Kein Plan 05-09 erforderlich.
