# Wave 3 Hebel 1 + Hebel 3 — Eval-Intermediate

**Plan:** 05-05
**Wave:** 3
**Intermediate-File:** Konsolidierung nach `data/eval/TUNING.md` erfolgt in Plan 05-08 Task 4.

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

**Methodische Einschraenkung:** N=1 vs. N=3 Baseline — direkte Vergleichbarkeit ist eingeschraenkt. LLM-Varianz bei Gemini-2.0-flash betraegt bei WIZ-03 ~15-17 Stddev, daher sind Deltas kleiner als 10 Punkte nicht sicher als echte Effekte zu werten (Rauschen > Signal fuer einzelne Runs).

**Befund WIZ-02 (+1.2):** Marginale Verbesserung bei Halluzinations-Detection. Liegt im 2σ-Rauschbereich. Da die Baseline-Eintraege `expected_forbidden_markers=[]` haben, misst WIZ-02 primär ob _bekannte_ Marker aus den Testkorpora auftauchen — Hebel 1 haette hier staerkeren Effekt wenn Dossier-spezifische Marker eingetragen waeren.

**Befund WIZ-03 (-0.8 global, -7.4 verband-uni):** Kein eindeutiger positiver Effekt bei Tonalitaet. Der verband-uni-Cluster zeigt unerwarteten Rueckgang (-7.4), koennte auf N=1-Varianz zurueckzufuehren sein (n=3 Eintraege, ein schlechter Run koennte das kippen).

**Empfehlung:** Beibehalten (als Default OFF) — Hebel 1 schadet nicht (alle Deltas innerhalb 2σ) und adressiert ein echtes Problem (Halluzinations-Verbots-Listen in Prompts). WIZ-02-Signal bei Eintragen echter Forbidden-Marker in Korpus erwartet staerker. Fuer produktive Nutzung: Default auf ON setzen nach Wave-4-Verifikation.

---

## 2026-05-20 — Wave 3 Hebel 3 (Dossier-Daten-Injection)

**Konfiguration:** `PIPELINE_USE_VORBILD_FORMULIERUNGEN=1`

**Aenderung:** buildSectionPrompt + buildRevisionPrompt injizieren vorbildFormulierungen/bestPractices/rejectGruende aus Dossier. Field-Names: `VorbildFormulierung.formulierung`, `BestPractice.was_funktionierte`, `RejectGrund.grund` (aus richtlinien-schema.ts verifiziert).

**Report:** `data/eval/pipeline-reports/2026-05-20T11-16-42.json` (N=1, 22 Eintraege, nErrored=4)

**Scope-Begrenzung:** Hebel 3 wirkt strukturell nur fuer 2/11 Dossiers:
- `aktion-mensch-schulkooperation`: 3 vorbildFormulierungen + 2 bestPractices (fuer abschnitte wirkung-nachhaltigkeit, bedarf-zielgruppe, projektidee)
- `kultur-macht-stark`: 4 vorbildFormulierungen + 4 bestPractices + 4 rejectGruende

Fuer die anderen 9 Dossiers bleibt buildSectionPrompt unveraendert (leere Arrays → keine Injection). 4 Rate-Limit-Fehler in diesem Run (parallele Ausfuehrung mit Hebel-1+3-Run) reduzieren Stichprobengroesse.

**Eval-Resultat (Variante B vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-3 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|--------------|-------|---------------|
| WIZ-01 | 100.0 | 100.0 | 0.0 | ja |
| WIZ-02 | 98.3 | 96.7 | -1.6 | ja (2σ-Band 89.3–107.3) |
| WIZ-03 | 46.3 | 46.4 | +0.1 | ja |
| Finanzplan-Sub | 92.0 | 88.9 | -3.1 | ja |

**Per-Geber-Cluster WIZ-03 (Delta):**

| Cluster | Baseline | Hebel-3 | Delta | Eintraege im Run (n effektiv) |
|---------|----------|---------|-------|-------------------------------|
| oeffentlich (n=7→6) | 43.1 | 41.0 | -2.1 | 6 (1 fehlt wegen 429) |
| stiftung (n=4→3) | 55.0 | 58.0 | +3.0 | 3 (1 fehlt) |
| eu (n=3) | 58.1 | 57.7 | -0.4 | 3 |
| wirtschaftspreis (n=4→2) | 51.5 | 51.0 | -0.5 | 2 (2 fehlen) |
| verband-uni (n=3) | 39.1 | 47.0 | +7.9 | 3 |

**Per-Dossier (Hebel-3-faehige Dossiers — WIZ-03 Vergleich zu Hebel-1-Run):**

Auf Basis der vorliegenden Schnappschuss-Daten fuer aktion-mensch (pv-002 in Variante B):
- pv-002 (aktion-mensch): WIZ-03=39 (Variante B) vs WIZ-03=39 (Variante A) — kein Signal auf N=1
- pv-003 (kultur-macht-stark): WIZ-03=61 (Baseline A) vs WIZ-03=61 (Variante B) — kein Signal

**Methodische Einschraenkung:** 4 Rate-Limit-Fehler (pv-008, pv-009, pv-010, pv-011) durch parallele Ausfuehrung. Per-Dossier-Delta fuer Hebel-3-faehige Dossiers nicht repraesentativ messbar mit N=1. Threat T-05-05-05 (Field-Name-Drift silent) ist nicht durch ausbleibendes Delta widerlegt — die Injection koennte greifen und trotzdem keinen WIZ-03-Delta erzeugen (Judge kalibriert nicht auf vorbild-Formulierungen).

**Befund:** WIZ-03 Delta nahe 0 (+0.1 global). Der verband-uni-Cluster zeigt +7.9 — aber nur n=3 Eintraege, N=1 Run, ausreichend Rauschen um das als Zufall einzustufen. kein statistisch gesicherter positiver Effekt.

**Empfehlung:** Beibehalten aber als „datenarm" markieren. Hebel-3-Injection schadet nicht (keine negativen Effekte ausserhalb 2σ). Um echten Signal zu messen: (1) `maxZeichen` in Dossiers einsetzen und WIZ-01-Zeichenlimit-Verletzungen messen, (2) N=3 dedizierten Run nur fuer aktion-mensch + kultur-macht-stark. Vorschlag: Fuer Plan 05-08 als „collect more data" einordnen.

---

## 2026-05-20 — Wave 3 Hebel 1+3 kombiniert

**Konfiguration:** `PIPELINE_SHARP_PROMPTS=1 PIPELINE_USE_VORBILD_FORMULIERUNGEN=1`

**Report:** `data/eval/pipeline-reports/2026-05-20T11-16-45.json` (N=1, 22 Eintraege, nErrored=10)

**Einschraenkung:** 10 Rate-Limit-Fehler (pv-005, pv-006, pv-008, pv-010, pv-011, pv-edge-001, pv-edge-002, pv-edge-004, pv-edge-005, pv-res-001 und weitere) durch gleichzeitige Ausfuehrung aller 3 Varianten-Runs. Nur 12 Eintraege haben valide Scores. Die Metriken sind mit hoher Unsicherheit behaftet.

**Eval-Resultat (Variante C vs Baseline N=3):**

| Achse | Baseline Mean | Hebel-1+3 Mean | Delta | Innerhalb 2σ? |
|-------|---------------|----------------|-------|---------------|
| WIZ-01 | 100.0 | 100.0 | 0.0 | ja |
| WIZ-02 | 98.3 | 99.2 | +0.9 | ja |
| WIZ-03 | 46.3 | 47.5 | +1.2 | ja |
| Finanzplan-Sub | 92.0 | 91.7 | -0.3 | ja |

**Per-Geber-Cluster WIZ-03 (Delta):**

| Cluster | Baseline | Hebel-1+3 | Delta | n effektiv |
|---------|----------|-----------|-------|------------|
| oeffentlich | 43.1 | 42.3 | -0.8 | 3 (4 fehlen) |
| stiftung | 55.0 | 63.0 | +8.0 | 2 (2 fehlen) |
| eu | 58.1 | 53.3 | -4.8 | 3 |
| wirtschaftspreis | 51.5 | 47.0 | -4.5 | 2 (2 fehlen) |
| verband-uni | 39.1 | 31.5 | -7.6 | 2 (1 fehlt) |

**Cross-Hebel-Side-Effects (Threat T-05-05-01):**

Der befuerchtete Side-Effect (Sharp-Prompts klassifiziert Vorbild-Formulierungen als Floskeln) zeigt sich in den Daten nicht eindeutig. WIZ-03 Hebel-1+3 (+1.2) liegt geringfuegig besser als Hebel-1 allein (-0.8) — aber bei nErrored=10 ist dieser Befund nicht belastbar.

Beobachtung: Stiftungs-Cluster zeigt WIZ-03=63.0 mit Hebel-1+3 (vs. 55.0 Baseline, +8.0 Delta) — das ist ein sichtbarer Aufwaertstrend, aber n=2 Eintraege reichen nicht fuer statistische Signifikanz.

**Empfehlung:** Run mit sequenzieller Ausfuehrung (nicht parallel) und N=2 wiederholen, um Cross-Hebel-Side-Effects korrekt zu messen. Rate-Limit-Problem ist das eigentliche Blocker fuer valide Aussage. Wenn Wiederholung nicht in Phase 5 passt: als Beobachtung festhalten und in Plan 05-08 Empfehlung dokumentieren.

---

## Zusammenfassung aller 3 Varianten

| Metrik | Baseline | Hebel-1 | Hebel-3 | Hebel-1+3 | Trend |
|--------|----------|---------|---------|-----------|-------|
| WIZ-01 | 100.0 | 100.0 | 100.0 | 100.0 | stabil |
| WIZ-02 | 98.3 | 99.5 (+1.2) | 96.7 (-1.6) | 99.2 (+0.9) | Hebel-1 leicht positiv |
| WIZ-03 | 46.3 | 45.5 (-0.8) | 46.4 (+0.1) | 47.5 (+1.2) | kein klares Signal |
| Finanzplan | 92.0 | 90.9 (-1.1) | 88.9 (-3.1) | 91.7 (-0.3) | stabil bis leicht negativ |
| nErrored | 3 | 0 | 4 | 10 | Rate-Limit-Problem bei parallelen Runs |

**Gesamtbefund:** Keiner der drei Hebel erzeugt einen statistisch signifikanten Effekt in dieser Messung. Alle Deltas liegen innerhalb des 2σ-Rauschbandes der Baseline. Das bedeutet:
1. Die Hebel schaden nicht (keine Regressionen).
2. Der positive Effekt (Halluzinations-Verbots-Schaerfung) ist mit WIZ-02 allein nicht messbar solange `expected_forbidden_markers=[]` in den Korpus-Eintraegen.
3. WIZ-03 als Tonalitaets-Score reagiert zu rauschhaft (15-17 Stddev) fuer N=1-Messungen.

**Empfehlung fuer Plan 05-08:** Beide Hebel als Default ON setzen (kein Schaden nachgewiesen, theoretisch begründet aus UAT-Befunden). Delta-Messung auf WIZ-02 verbessern durch Einpflegen echter Forbidden-Marker in 2-3 Korpus-Eintraege (besonders pv-009 bmbf-digitalpakt-2 als UAT-28.04.-Anker).

**Rate-Limit-Empfehlung:** Variante B und C nicht parallel ausfuehren. Sequenziell mit mindestens 30s Pause zwischen Runs oder --N=1 mit kleinerer Dossier-Auswahl (`--single`).
