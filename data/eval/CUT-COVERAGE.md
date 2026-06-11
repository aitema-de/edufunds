# Matcher Cut-Coverage @ 40

> Deterministisch, kein LLM. Misst, ob das erwartete Programm in den 40er-Kandidaten-Cut kommt (= die Menge, die der Matcher dem LLM zum Ranken vorlegt). Fehlt es hier, kann kein Ranking-Schritt es mehr treffen — Fehler liegt in der Kandidaten-Auswahl, nicht im LLM.

Generiert: 2026-06-11T11:31:29.962Z · Korpus: `data/eval/matcher-korpus.json` (19 bewertbare Eintraege)

## Aggregat

**Cut-Coverage: 49/50 = 98.0%** (erwartete Programme, die im Katalog existieren und in den Cut kommen)

| Kategorie | Coverage |
|---|---|
| ausfuehrlich | 23/23 = 100.0% |
| kurz | 12/12 = 100.0% |
| vag | 14/15 = 93.3% |

| Status | Anzahl | Bedeutung |
|---|---|---|
| ✓ in_cut | 49 | erreicht den LLM |
| ↓ below_cut | 1 | prefilter ok, sortScore zu niedrig (C3/Queue-Hebel) |
| ✗ prefiltered_out | 0 | Status/Bundesland entfernt (Daten/C1) |
| ∅ not_in_catalog | 0 | Korpus-Daten-Drift |
| Off-Targets im Cut | 31 | breiter Cut, finaler Filter ist der LLM (informativ) |

## Verfehlte erwartete Programme (1)

| Eintrag | Programm | Status | Detail |
|---|---|---|---|
| ev-021 | `stiftung-bildung-foerderfonds` | ↓ below_cut | Rang 96/178, sortScore 57 (Queue 57+Theme 0), Cut-Grenze 78.8, fehlt 21.8 |
