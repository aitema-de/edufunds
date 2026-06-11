# Matcher Cut-Coverage @ 40

> Deterministisch, kein LLM. Misst, ob das erwartete Programm in den 40er-Kandidaten-Cut kommt (= die Menge, die der Matcher dem LLM zum Ranken vorlegt). Fehlt es hier, kann kein Ranking-Schritt es mehr treffen — Fehler liegt in der Kandidaten-Auswahl, nicht im LLM.

Generiert: 2026-06-11T12:05:37.203Z · Korpus: `data/eval/matcher-korpus.json` (19 bewertbare Eintraege)

## Aggregat

**Cut-Coverage: 47/50 = 94.0%** (erwartete Programme, die im Katalog existieren und in den Cut kommen)

| Kategorie | Coverage |
|---|---|
| ausfuehrlich | 23/23 = 100.0% |
| kurz | 10/12 = 83.3% |
| vag | 14/15 = 93.3% |

| Status | Anzahl | Bedeutung |
|---|---|---|
| ✓ in_cut | 47 | erreicht den LLM |
| ↓ below_cut | 3 | prefilter ok, sortScore zu niedrig (C3/Queue-Hebel) |
| ✗ prefiltered_out | 0 | Status/Bundesland entfernt (Daten/C1) |
| ∅ not_in_catalog | 0 | Korpus-Daten-Drift |
| Off-Targets im Cut | 31 | breiter Cut, finaler Filter ist der LLM (informativ) |

## Verfehlte erwartete Programme (3)

| Eintrag | Programm | Status | Detail |
|---|---|---|---|
| ev-012 | `ermoeglichungsbudget-fuer-innovative-schul-und` | ↓ below_cut | Rang 41/108, sortScore 63.8 (Queue 63.8+Theme 0), Cut-Grenze 64, fehlt 0.2 |
| ev-016 | `landesprogramm-kultur-und-schule-nrw` | ↓ below_cut | Rang 41/112, sortScore 61.2 (Queue 61.2+Theme 0), Cut-Grenze 61.8, fehlt 0.6 |
| ev-021 | `stiftung-bildung-foerderfonds` | ↓ below_cut | Rang 87/178, sortScore 57 (Queue 57+Theme 0), Cut-Grenze 77, fehlt 20 |
