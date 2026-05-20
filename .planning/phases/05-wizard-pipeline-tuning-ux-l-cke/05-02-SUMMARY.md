---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "02"
subsystem: eval-korpus
tags: [phase-5, wave-1, eval, korpus, pipeline-korpus, marker-kuration, hybrid-kuration]
dependency_graph:
  requires: [05-01]
  provides: [pipeline-eval-korpus-22-eintraege]
  affects: [05-03, 05-04, 05-05, 05-06]
tech_stack:
  added: []
  patterns: [hybrid-kuration-claude-kolja, expected_forbidden_markers, goldstandard-pv-001]
key_files:
  created:
    - data/eval/pipeline-korpus.json
  modified: []
decisions:
  - "pv-001-Marker-Praezisierung: '64 Schuelerinnen in Willkommensklassen' statt 'Willkommensklassen' (Kolja-Checkpoint #1 Approval)"
  - "pv-edge-004+005 auf mittel angehoben fuer 11/7/4-Verteilung (widerspruechlich und bl-konflikt haben partiell konkrete Inhalte)"
  - "pv-edge-006 (antworten-zu-lang) und pv-res-003 auf hochwertig gesetzt (reichhaltigste Edge/Reserve-Inhalte)"
  - "pv-edge-003 nutzt programmId=niedersachsen-sport (kein Dossier) fuer programm-mismatch-Eval"
metrics:
  duration_minutes: 80
  completed_date: "2026-05-20"
  tasks_completed: 3
  files_modified: 1
---

# Phase 05 Plan 02: Pipeline-Eval-Korpus Wave-1 Summary

**One-liner:** 22-Eintrags-Pipeline-Eval-Korpus mit 112 Forbidden-Markern — 11 Standard-Dossiers + 7 Edge-Cases + 4 Reserve, UAT-28.04.-Anker als Goldstandard.

## Was gebaut wurde

`data/eval/pipeline-korpus.json` mit 22 Eintraegen nach `PipelineKorpusEntry`-Schema (Interfaces-Block PLAN.md), aufgebaut in drei Tasks:

**Task 1 (Checkpoint #1, CLEARED):** `pv-001` Borsigwalder-UAT-Anker — 8 dokumentierte UAT-28.04.-Halluzinations-Marker, Goldstandard-Pattern fuer alle Folge-Eintraege. Kolja-Approval: Marker-Praezisierung "64 Schuelerinnen in Willkommensklassen" uebernommen.

**Task 2 (pv-002..pv-011):** 10 Standard-Eintraege, je 1 pro Dossier:
- pv-002 kultur-macht-stark (mittel, Buendnis-Fehler)
- pv-003 aktion-mensch-schulkooperation (vag, Foerderschule)
- pv-004 bosch-schulpreis (hochwertig, Gesamtschule mit Kennzahlen)
- pv-005 erasmus-schule-2026 (mittel, Brieffreundschaft)
- pv-006 erasmus-schulentwicklung (vag, Berufsschule)
- pv-007 ensam-bmz (mittel, Kenia-Reise, Zeitraum-Problem)
- pv-008 ferry-porsche-challenge-2025 (vag, MINT-Mismatch)
- pv-009 ferry-porsche-challenge (vag, Digitalkurs Senioren)
- pv-010 klimalab-2026 (mittel, NABU, Frist abgelaufen)
- pv-011 berlin-startchancen (hochwertig, Brennpunktschule)

**Task 3 (Edge-Cases + Reserve + Finalisierung):**
- pv-edge-001 vag-extrem (totaler Informationsmangel)
- pv-edge-002 profil-fehlt (User verweigert Profilangaben)
- pv-edge-003 programm-mismatch (programmId=niedersachsen-sport, kein Dossier)
- pv-edge-004 widerspruechlich (Schuelerzahl + Partner korrigiert im Gespraech)
- pv-edge-005 bl-konflikt (NRW-Schule + berlin-startchancen)
- pv-edge-006 antworten-zu-lang (Europaschule, Antworten 400+ Woerter)
- pv-edge-007 antrag-spruenge (Hauptprofil rueckwirkend geaendert)
- pv-res-001..004 (Reserve: Dortmund Kultur, Gelsenkirchen Digital, Hamburg ENSA, Muenchen Aktion-Mensch)

## Korpus-Uebersicht

| Kategorie | Anzahl | Anteil |
|-----------|--------|--------|
| vag | 11 | 50% |
| mittel | 7 | 32% |
| hochwertig | 4 | 18% |
| **Total** | **22** | 100% |

| Segment | Anzahl |
|---------|--------|
| Standard (pv-001..011) | 11 |
| Edge-Cases (pv-edge-001..007) | 7 |
| Reserve (pv-res-001..004) | 4 |

| Geber-Gruppe | Anzahl |
|-------------|--------|
| oeffentlich | 6 |
| stiftung | 4 |
| eu | 5 |
| wirtschaftspreis | 4 |
| verband-uni | 3 |

## Marker-Statistik

| Kennzahl | Wert |
|----------|------|
| Total Marker | 112 |
| Durchschnitt/Eintrag | 5.1 |
| pv-001 (Goldstandard) | 8 |
| Minimum | 4 |
| Maximum | 8 |
| Eintraege mit <3 Markern | 0 |
| False-Positive-Konflikte (3 Stichproben) | 0 |

## Stichprobenliste markante Marker-Sets

**pv-001 (UAT-Anker, 8 Marker):**
- "Az 123/2026" — erfundenes Aktenzeichen
- "64 Schuelerinnen in Willkommensklassen" — UAT-Halluzination mit Zahl (Kolja-Praezisierung)
- "TV-L E9" — erfundene Tarif-Eingruppierung
- "Bezirk Berlin-Mitte" — falscher Bezirk (Reinickendorf)
- "Beschluss vom 12.12.2025" — User: kein Beschluss
- "KMK-Kompetenzen aktiv adressiert" — User: KMK unbekannt

**pv-edge-005 (bl-konflikt, 5 Marker):**
- "Senatsverwaltung fuer Bildung Berlin" — NRW-Schule kann nicht ueber Berlin beantragen
- "startchancen@senbjf.berlin.de" — Berliner Kontakt fuer NRW-Schule falsch
- "Berlin-Wedding Sozialindex" — Schule ist in Koeln-Ehrenfeld
- "Berliner Schulsozialarbeitsgesetz" — NRW-Landesrecht gilt nicht

**pv-004 (hochwertig, Stiftung/Preis, 5 Marker):**
- "Preis des Bundespraesident" — Bosch-Schulpreis hat keinen Bundespraesident-Bezug
- "Juryprotokoll vom" — kein Juryprotokoll-Datum erwaehnt
- "Auszeichnung 2019" — kein historischer Preis erwaehnt

## Deviationen vom Plan

### Auto-fix — Kategorie-Anpassung fuer 50/30/20-Mix

**[Rule 1 - Adjustment] Kategorie-Verteilung nach Batch-3 korrigiert**
- **Gefunden in:** Task 3 nach Fertigstellung
- **Problem:** Batch 3 erzeugte 13 vag / 5 mittel / 4 hochwertig statt 11/7/4
- **Fix:** pv-edge-004 + pv-edge-005 von vag auf mittel (partiell konkreter Inhalt); pv-edge-006 + pv-res-003 von mittel/vag auf hochwertig (reichhaltigste Inhalte)
- **Ergebnis:** 11/7/4 = 50/32/18% — innerhalb Plan-Toleranz

### Auto-fix — Marker-Formulierung (pv-001)

**[Rule 1 - Kolja-Decision] Marker "64 Schuelerinnen in Willkommensklassen" statt "Willkommensklassen"**
- **Checkpoint #1:** Kolja-Approval: Praezisierter Marker uebernommen
- **Wirkung:** Marker ist jetzt FP-geschuetzt (kein Overlap mit User-Antwort die "Willkommensklassen" im negativen Kontext erwaehnt)

## Folge-Plan-Hinweise

- **Plan 05-04 (Eval-Skript + Baseline-Run):** Braucht diesen Korpus als primaere Input-Quelle. `data/eval/pipeline-korpus.json` ist die Source-of-Truth fuer alle Phase-5-Eval-Runs.
- **Korpus-Aenderungen kuenftig:** D-26 verlangt bei jeder Korpus-Mutation einen expliziten Baseline-Recalc-Commit im selben PR.
- **Threat T-05-02-02 (False-Positive):** 3 Stichproben clean. Vollstaendiger Cross-Check aller 22 Eintraege in Plan 05-04 empfohlen via eval-Skript.

## Known Stubs

Keine. Alle Marker sind konkrete Substrings, alle facts-Felder sind intentional leer wo User keine Angaben machte (kein Stub, sondern korrekte Extraktion aus vagen Inputs).

## Self-Check: PASSED

- data/eval/pipeline-korpus.json: FOUND (2686 Zeilen)
- Commit f5fb8e4 (Task 1): FOUND
- Commit 5b4751c (Task 2): FOUND
- Commit d12f748 (Task 3): FOUND
- Entries: 22, Markers: 112
