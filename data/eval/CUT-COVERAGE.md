# Matcher Cut-Coverage @ 40

> Deterministisch, kein LLM. Misst, ob das erwartete Programm in den 40er-Kandidaten-Cut kommt (= die Menge, die der Matcher dem LLM zum Ranken vorlegt). Fehlt es hier, kann kein Ranking-Schritt es mehr treffen — Fehler liegt in der Kandidaten-Auswahl, nicht im LLM.

Generiert: 2026-06-11T11:09:56.920Z · Korpus: `data/eval/matcher-korpus.json` (19 bewertbare Eintraege)

## Aggregat

**Cut-Coverage: 46/55 = 83.6%** (erwartete Programme, die im Katalog existieren und in den Cut kommen)

| Kategorie | Coverage |
|---|---|
| ausfuehrlich | 23/26 = 88.5% |
| kurz | 11/13 = 84.6% |
| vag | 12/16 = 75.0% |

| Status | Anzahl | Bedeutung |
|---|---|---|
| ✓ in_cut | 46 | erreicht den LLM |
| ↓ below_cut | 8 | prefilter ok, sortScore zu niedrig (C3/Queue-Hebel) |
| ✗ prefiltered_out | 1 | Status/Bundesland entfernt (Daten/C1) |
| ∅ not_in_catalog | 0 | Korpus-Daten-Drift |
| Off-Targets im Cut | 32 | breiter Cut, finaler Filter ist der LLM (informativ) |

## Verfehlte erwartete Programme (9)

| Eintrag | Programm | Status | Detail |
|---|---|---|---|
| ev-008 | `fritz-henkel-inklusion-2026` | ↓ below_cut | Rang 68/116, sortScore 50 (Queue 0+Theme 50), Cut-Grenze 75, fehlt 25 |
| ev-009 | `heinrich-boell-bildung` | ↓ below_cut | Rang 60/111, sortScore 50 (Queue 0+Theme 50), Cut-Grenze 69, fehlt 19 |
| ev-010 | `heinrich-boell-bildung` | ↓ below_cut | Rang 57/106, sortScore 25 (Queue 0+Theme 25), Cut-Grenze 68, fehlt 43 |
| ev-014 | `bayern-kulturfonds` | ✗ prefiltered_out | bundesland (Programm: DE-BY ≠ Hamburg) |
| ev-015 | `berdelle-naturwissenschaft` | ↓ below_cut | Rang 112/178, sortScore 24 (Queue 24+Theme 0), Cut-Grenze 80, fehlt 56 |
| ev-020 | `heinrich-boell-bildung` | ↓ below_cut | Rang 56/107, sortScore 50 (Queue 0+Theme 50), Cut-Grenze 68, fehlt 18 |
| ev-021 | `stiftung-bildung-foerderfonds` | ↓ below_cut | Rang 96/178, sortScore 57 (Queue 57+Theme 0), Cut-Grenze 77.8, fehlt 20.8 |
| ev-021 | `dkjs-sport` | ↓ below_cut | Rang 46/178, sortScore 75 (Queue 0+Theme 75), Cut-Grenze 77.8, fehlt 2.8 |
| ev-027 | `hamburg-kultur-schule` | ↓ below_cut | Rang 50/107, sortScore 55.8 (Queue 55.8+Theme 0), Cut-Grenze 61.8, fehlt 6 |
