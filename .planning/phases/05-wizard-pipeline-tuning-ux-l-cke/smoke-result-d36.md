# Pre-Closure-Smoke Ergebnis (D-36)

**Datum:** 2026-05-20
**Typ:** Anti-Overfitting-Test mit nicht-Korpus-Eintrag
**Entscheid:** Option B (echter Anti-Overfitting-Test)

## Smoke-Konfiguration

| Parameter | Wert |
|-----------|------|
| Korpus-ID (temporaer) | `pv-smoke-2026-05-20` |
| ProgrammId | `aktion-mensch-schulkooperation` |
| Schultyp | Berufsschule (nicht im Korpus vertreten) |
| Bundesland | Sachsen (nicht im Korpus vertreten) |
| Hebel | SHARP_PROMPTS=1, USE_VORBILD_FORMULIERUNGEN=1, GEBER_ROUTING_V2=1, COMPLIANCE_STAGE=0 |
| LLM_PROVIDER | gemini (gemini-2.0-flash) |
| N | 1 |
| Wallclock | 52s |

## Scores

| Achse | Score | Baseline-Mean | Status |
|-------|-------|---------------|--------|
| WIZ-01 (Pflichtabschnitte) | 100% | 100.0 | PASSED |
| WIZ-02 (Halluzinations-Detection) | 100 | 98.3 | PASSED (+1.7 vs Baseline) |
| WIZ-03 (Tonalitaet, stiftung) | 49 | 46.3 (gesamt) | OK (plausibel) |
| Finanzplan-Sub | 80 | 92.0 | OK (vager Input, kein Budget erwaehnt) |

Threshold-Gate: **GATE PASSED** (alle WIZ-01/WIZ-02-Checks bestanden)

## Halluzinations-Check

Alle 4 expected_forbidden_markers geprueft:

- `Inklusionsbeauftragter Herr Schmidt` — NICHT gefunden
- `Lebenshilfe Chemnitz e.V.` — NICHT gefunden
- `VdK Sachsen Kooperationsvertrag` — NICHT gefunden
- `Foerdersumme 18.500 Euro` — NICHT gefunden

Keine erfundenen Aktenzeichen, TV-L-Codes oder Beschlussdaten im finalText entdeckt.

## Snapshot

`data/eval/pipeline-snapshots/2026-05-20T12-49-01/pv-smoke-2026-05-20-run1.json`
(gitignored, lokal verfuegbar zum Zeitpunkt der Erstellung)

## Befund

Die Pipeline generierte einen qualitativ akzeptablen Antragstext fuer ein neuartiges Schulprofil (Berufsschule Sachsen), das im Tuning-Korpus nicht vertreten ist. Lücken wurden korrekt mit [TODO]-Markierungen versehen statt erfunden. Foerderbarkeit-Vorbehalt fuer Berufsschulen wurde explizit im Text angemerkt. Kein Overfitting-Signal.

## Kolja-Approval

`approved` — Phase-5-Closure moeglich.

Korpus wurde nach dem Test wieder auf 22 Eintraege zurueckgesetzt (pv-smoke-2026-05-20 entfernt).
