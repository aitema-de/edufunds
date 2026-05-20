# data/eval/ — Eval-Apparat

> Phase 1 Matcher-Eval + Phase 5 Pipeline-Eval. Versionierte Korpora als Regressions-Anker,
> Snapshot/Replay fuer kostenguenstige Score-Logik-Iteration, Threshold-Gate als PR-Pflicht.

## Strukturen

| Bereich | Pfad | Beschreibung |
|---------|------|--------------|
| Matcher-Korpus | `matcher-korpus.json` | Phase 1+2, Top-Level-Array, 29 Schul-Anliegen mit expected_top3 + expected_clarification |
| Matcher-Snapshots | `snapshots/<ISO>/<id>.json` | Phase 1+2, .gitignore'd ausser baseline |
| Matcher-Reports | `reports/<ISO>.json` + `.md` | Phase 1+2, .gitignore'd |
| Pipeline-Korpus | `pipeline-korpus.json` | Phase 5, Top-Level-Array, 22 Eintraege mit programmId + facts + expected_forbidden_markers + expected_geber_gruppe |
| Pipeline-Snapshots | `pipeline-snapshots/<ISO>/<id>-run<N>.json` | Phase 5, .gitignore'd ausser baseline |
| Pipeline-Reports | `pipeline-reports/<ISO>.json` + `.md` | Phase 5, .gitignore'd |
| BASELINE | `BASELINE.md` | Append-only History, beide Phasen, manuelle Pflege (Skripte schreiben NICHT in diese Datei) |
| TUNING | `TUNING.md` | Phase 5 Append-only Playbook pro Tuning-Iteration + Final-Decision-Block |
| Dossier-Coverage | `dossier-coverage-baseline.md` | Phase 5 Pre-Flight-Survey: welche Phase-3-Felder pro Dossier befuellt sind |

## Aufruf-Konventionen

### Matcher-Eval (Phase 1+2)

```bash
# Live-Run (DeepSeek-Call pro Eintrag, ~0,07 ct/Match)
npx tsx scripts/eval-matcher.ts --md-summary

# Replay gegen Baseline (kein LLM-Cost)
npx tsx scripts/eval-matcher.ts --replay data/eval/snapshots/baseline
```

### Pipeline-Eval (Phase 5)

```bash
# Default: Replay gegen Baseline-Snapshots (kein LLM-Cost, empfohlen fuer lokale Checks)
npx tsx scripts/eval-pipeline.ts --replay data/eval/pipeline-snapshots/baseline --md-summary

# Live-Run mit N=3 (~3-4 EUR Cost, ~60-75 min Wallclock)
npx tsx scripts/eval-pipeline.ts --live --N=3 --snapshot --md-summary

# Single-Entry-Live-Smoke (Pre-Closure-Test, ~0.15 EUR)
npx tsx scripts/eval-pipeline.ts --live --N=1 --single pv-001 --snapshot

# Mit deep WIZ-02 LLM-Judge (Layer 3, optional, hoehere Cost)
npx tsx scripts/eval-pipeline.ts --live --deep --N=3 --snapshot

# Mit env-File (empfohlen lokal):
npx tsx --env-file=.env.local scripts/eval-pipeline.ts --replay data/eval/pipeline-snapshots/baseline --md-summary
```

## Threshold-Gate (PR-Pflicht)

Pipeline-Eval ist PR-Pflicht-Vorabcheck fuer Aenderungen an `lib/wizard/**` oder
`data/richtlinien/**` (D-24). CI-Workflow: `.github/workflows/pipeline-eval.yml`.

| Achse | Block-Status (D-25) | Schwellwert (D-19) |
|-------|---------------------|---------------------|
| WIZ-01 (Pflichtabschnitte) | hart — exit 1 bei drop > 2σ unter Baseline | >= 80 % Coverage |
| WIZ-02 (Halluzinations-Detection) | mittel — exit 1 bei drop > 2σ + 10 % baseline | >= 50 % Marker-Reduktion |
| WIZ-03 (Tonalitaets-Passung) | warning-only — nie exit 1, nur Annotation | Score-Delta > 0 pro Cluster |
| Finanzplan-Sub (Validity) | warning-only | dokumentiert in BASELINE |

Der CI-Workflow laeuft **standardmaessig im replay-Modus** (kein LLM-Cost). Live-Runs
sind via `workflow_dispatch` mit `mode=live` moeglich (~3-4 EUR Cost pro Run).

## Korpus-Update-Workflow (D-26)

Korpus-Aenderung erfordert Baseline-Recalc im selben PR:

1. `data/eval/pipeline-korpus.json` editieren
2. `npx tsx --env-file=.env.local scripts/eval-pipeline.ts --live --N=3 --snapshot --md-summary`
3. Snapshot-Verzeichnis nach `pipeline-snapshots/baseline/` kopieren und force-committen
4. `BASELINE.md` neuer Eintrag mit Begruendung ("Korpus erweitert um X")
5. PR einreichen — Reviewer prueft Begruendung

Hintergrund: Baseline-Snapshots sind via `.gitignore` normalerweise ausgeschlossen,
aber der `baseline/`-Unterordner wird force-committed (`!data/eval/pipeline-snapshots/baseline`
in `.gitignore`). Threat-Modell T-01-09 (SHA-Zuordnung bei force-commit).

## Feature-Flags (Wave 3 Hebel)

Phase-5-Tuning-Hebel sind Env-Var-gesteuert (D-22). Defaults in `lib/wizard/config.ts`:

| Flag | Hebel | Default (Production) |
|------|-------|----------------------|
| `PIPELINE_SHARP_PROMPTS=1` | 1: Geschaerfte Verbots-Listen in CRITIQUE/SECTION/REVISION/RECHECK | true |
| `PIPELINE_COMPLIANCE_STAGE=1` | 2: Compliance-Check-Stage zwischen recheck und finanzplan | false |
| `PIPELINE_USE_VORBILD_FORMULIERUNGEN=1` | 3: Dossier-Daten-Injection in SECTION/REVISION | true |
| `PIPELINE_GEBER_ROUTING_V2=1` | 4: GUIDANCE_V2 in geber-guidance.ts | true |

Aktuelle Production-Defaults: siehe `lib/wizard/config.ts`.
Default-Entscheidungs-Begruendung: siehe `data/eval/TUNING.md` (letzter Block).

## Snapshot-Schema-Version

Pipeline-Snapshots haben `meta.schemaVersion: 1` (Phase 5).
Schema-Migration: bei breaking change Version inkrementieren.
Eval-Skript verweigert Replay bei Mismatch (kein silent-migrate).

Matcher-Snapshots (Phase 1+2) verwenden einen eigenen Schema-Stand —
nicht mit Pipeline-Snapshots mischen.

## Threats / Caveats

- LLM-Judge (WIZ-03) hat ~15-17 Score-Varianz trotz `temperature: 0` —
  Baseline-N=3 + 2σ-Toleranz faengt das ab. WIZ-03 ist deshalb warning-only.
- 0/11 Dossiers haben aktuell `maxZeichen` gesetzt → WIZ-01 ist Pflichtabschnitt-
  Coverage-only (kein Zeichenlimit-Check). WIZ-01=100% ist Deckeneffekt, keine echte Messung.
- 2/11 Dossiers haben `vorbildFormulierungen` → Hebel 3 wirkt nur fuer
  `aktion-mensch-schulkooperation` + `kultur-macht-stark`.
- Die meisten Korpus-Eintraege haben `expected_forbidden_markers=[]` →
  WIZ-02 misst nur ob bekannte Patterns aus HALLU_REGEX_PATTERNS auftauchen,
  nicht ob Dossier-spezifische Marker halluziniert werden. Echtes Signal kommt
  erst wenn Forbidden-Marker in Eintraege eingetragen werden.
- Soft-Fails (429 Rate-Limit, Scoring-Fehler) zaehlen als 0-Score-Placeholder —
  vermeiden durch sequenzielle Ausfuehrung statt paralleler Runs.

## Verwandte Dateien

- `data/eval/BASELINE.md` — aktuell gueltiger Baseline-Schwellwert-Stand
- `data/eval/TUNING.md` — Tuning-Iterations-Playbook + Default-Decision-Block
- `data/eval/dossier-coverage-baseline.md` — Pre-Flight-Survey Phase-3-Felder
- `.github/workflows/pipeline-eval.yml` — CI-Threshold-Gate
- `scripts/eval-pipeline.ts` — Eval-Skript mit vollstaendiger CLI-Doku im Datei-Header
- `lib/wizard/config.ts` — Feature-Flag-Defaults (PIPELINE_CONFIG)
