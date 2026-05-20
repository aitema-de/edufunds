# Dossier-Coverage Baseline (Phase 5 Pre-Flight)

**Generated:** 2026-05-20
**Source:** scripts/check-dossier-coverage.ts
**Purpose:** RESEARCH §Daten-Vorbedingungen-Befund (A5) — vor Eval-Skript-Bau dokumentieren welche Phase-3-Felder pro Dossier befuellt sind.
| Dossier | Pflicht-Abschnitte | maxZeichen-set | vorbildFormul. | bestPractices | rejectGruende |
|---------|-------------------|----------------|----------------|---------------|---------------|
| aktion-mensch-schulkooperation | 7 | 0 | 3 | 2 | 0 |
| berlin-startchancen | 0 | 0 | 0 | 1 | 0 |
| bmbf-digitalpakt-2 | 6 | 0 | 0 | 2 | 0 |
| bosch-schulpreis | 6 | 0 | 0 | 3 | 0 |
| ensam-bmz | 8 | 0 | 0 | 5 | 5 |
| erasmus-schule-2026 | 0 | 0 | 0 | 0 | 0 |
| erasmus-schulentwicklung | 4 | 0 | 0 | 2 | 4 |
| ferry-porsche-challenge-2025 | 0 | 0 | 0 | 0 | 4 |
| ferry-porsche-challenge | 0 | 0 | 0 | 0 | 3 |
| klimalab-2026 | 0 | 0 | 0 | 0 | 0 |
| kultur-macht-stark | 7 | 0 | 4 | 4 | 4 |
## Implikationen fuer Phase 5

- **WIZ-01 maxZeichen-Check:** 0/11 Dossiers haben maxZeichen gesetzt — Eval-Methodik dokumentiert Pflichtabschnitt-Coverage als Primary, maxZeichen optional (D-19, RESEARCH Pitfall 7)
- **Hebel 3 (vorbildFormulierungen-Injection) wirkt nur fuer 2/11 Dossiers** — Wave 3 Plan 05-06 misst Delta nur fuer Dossiers mit `vorbildFormulierungen.length > 0`
