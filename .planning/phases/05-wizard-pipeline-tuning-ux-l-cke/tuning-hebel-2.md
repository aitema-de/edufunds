# Wave 3 Hebel 2 — Eval-Intermediate

**Plan:** 05-06
**Wave:** 3
**Intermediate-File:** Konsolidierung nach `data/eval/TUNING.md` erfolgt in Plan 05-08 Task 4.

---

## 2026-05-20 — Wave 3 Hebel 2 (Compliance-Check-Stage)

**Konfiguration:** `PIPELINE_COMPLIANCE_STAGE=1`

**Aenderung:** Neue PipelineStage `compliance-check` zwischen `recheck` und `finanzplan`. Deterministischer FK-Check gegen `richtlinie.antragsstruktur.abschnitte[].id` + maxZeichen + Mindest-Laenge (50 Zeichen fuer Pflicht-Abschnitte). Bei Violations: 1× zusaetzlicher REVISION_SYSTEM-LLM-Call mit `buildComplianceRevisionPrompt`. Loop-Count-Schutz: max 1 Iteration (T-05-06-01 DoS-Mitigation).

**Sub-Befund:** Stage ist silent gegenueber GeneratingProgress.tsx — kein UI-Stage-Update (D-20 'silent stage'). `compliance-check` fehlt bewusst in ORDER/STAGES-Array der Komponente.

**Report:** `data/eval/pipeline-reports/2026-05-20T11-44-29.json` (N=1, 22 Eintraege, nErrored=2)

**Provider:** `LLM_PROVIDER=gemini`, alle Calls `gemini-2.0-flash` (konsistent mit Baseline).

**Eval-Resultat (Variante D — Hebel 2 vs Baseline N=3):**

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

**Compliance-Stats (N=1, 20 erfolgreiche Snapshots):**

- 16 von 20 Eintraegen hatten Richtlinie mit Pflichtabschnitten → Compliance-Check wurde ausgefuehrt.
- 4 Eintraege ohne Richtlinie → Stage komplett uebersprungen (kein Crash, kein Event).
- Loop-Count-Schutz greift: kein Eintrag hatte mehr als 1 Compliance-Revision-Iteration.
- 2 Eintraege errored (nErrored=2) — nicht compliance-spezifisch.

**Methodische Einschraenkung:** N=1 vs. N=3 Baseline — direkte Vergleichbarkeit eingeschraenkt. LLM-Varianz bei Gemini-2.0-flash betraegt bei WIZ-03 ~15-18 Stddev, daher sind Deltas unter 10 Punkten nicht sicher als echte Effekte einzustufen (Rauschen > Signal fuer einzelne Runs). WIZ-01 zeigt weiterhin Deckeneffekt (100% wegen maxZeichen=0 in Dossiers).

**Befund WIZ-01 (0.0 Delta):** Compliance-Check erkennt fehlende Abschnitte per String-Match. Da alle Pflicht-Abschnitte von der Pipeline immer erzeugt werden (Coverage = 100% schon in Baseline), triggert der Check keine Violations fuer Art="fehlt". Realer Wert von Hebel 2 entfaltet sich erst wenn `maxZeichen`-Constraints in Dossiers gepflegt werden.

**Befund WIZ-02 (+1.2):** Marginale Verbesserung. Liegt im 2σ-Rauschbereich. Compliance-Revision kann Halluzinationen einfuehren wenn LLM Fehlende-Abschnitt-Plaetze mit erfundenen Inhalten fuellt — nicht gemessen wegen `expected_forbidden_markers=[]` in Eintraegen.

**Befund WIZ-03 (+2.8 global, +19.4 verband-uni):** Kleines globales Plus. verband-uni-Delta ist Ausreisser (n=2, N=1 → einzelner Run-Effekt). Nicht sicher als Hebel-2-Wirkung zu werten.

**Empfehlung:** Hebel 2 verfeinern — Wert entfaltet sich erst wenn:
1. `maxZeichen`-Constraints in Dossier-Eintraegen gepflegt sind (dann wird Ueberlaenge detektiert).
2. Korpus-Eintraege `expected_forbidden_markers` erhalten (dann ist Compliance-Revision-Impact auf WIZ-02 messbar).
3. Isolation via N=3 Hebel-2-Run (statt N=1) fuer statistische Trennung.

Im aktuellen Stand: Hebel beibehalten, Default bleibt OFF, kein negativer Effekt nachgewiesen. Finaler Default-Beschluss in Plan 05-08 Wave 4.

**Plan-Phase Cross-Reference:** Hebel 1 (Plan 05-05) und Hebel 2 zeigen vergleichbares Delta-Niveau (+1.2 WIZ-02 identisch, WIZ-03 +2.8 vs -0.8). Beide Hebel tunen unterschiedliche Schwaechen:
- Hebel 1 (Sharp Prompts): Halluzinations-Verbotsblock wirkt praeventiv in Section/Revision-Stage.
- Hebel 2 (Compliance): Deterministischer Post-Check mit Repair-Loop wirkt kurativ nach Revision.
Kombination beider Hebel koennte kumulativen Effekt zeigen (Plan 05-08 Decision: welche Kombination wird Default).
