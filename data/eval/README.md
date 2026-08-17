# data/eval/ — Eval-Apparat

> Phase 1 Matcher-Eval + Phase 5 Pipeline-Eval. Versionierte Korpora als Regressions-Anker,
> Snapshot/Replay fuer kostenguenstige Score-Logik-Iteration, Threshold-Gate als PR-Pflicht.

## Strukturen

| Bereich | Pfad | Beschreibung |
|---------|------|--------------|
| Matcher-Korpus | `matcher-korpus.json` | Phase 1+2, Top-Level-Array, 29 Schul-Anliegen mit expected_top3 + expected_clarification |
| Matcher-Snapshots | `snapshots/<ISO>/<id>.json` | Phase 1+2, .gitignore'd ausser baseline |
| Matcher-Reports | `reports/<ISO>.json` + `.md` | Phase 1+2, .gitignore'd |
| Pipeline-Korpus | `pipeline-korpus.json` | Phase 5, Top-Level-Array, 25 Eintraege mit programmId + facts + expected_forbidden_markers + expected_geber_gruppe |
| Sim-Nutzer-Profile | `simuser-profile.json` | Eingefrorene Personenprofile fuer den simulierten Nutzer (WIZ-06) — versioniert, weil ein Profilwechsel jeden Vorher/Nachher-Vergleich entwertet |
| Sim-Nutzer-Laeufe | `simuser-runs/<label>/<id>.json` | Echte Interview-Sessions je Lauf + `korpus-<label>.json` im pipeline-korpus-Format |
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

### Simulierter Nutzer (WIZ-06) — fuer Aenderungen AM INTERVIEW

Der Pipeline-Korpus spielt **fixe** Frage-Antwort-Paare ab. Fuer alles nach dem Interview ist
das genau richtig. Fuer Aenderungen am Interviewer ist es wertlos: andere Fragen bekommen
dieselben vorkonservierten Antworten, die Messung danach zeigt dasselbe wie vorher — ein Gate,
das gruen luegt (BASELINE.md, Eintrag 30.07., Abschnitt „Messgrenze").

`scripts/eval-simuser.ts` schliesst die Luecke: ein Modell spielt die Schule, antwortet aus
einem **eingefrorenen** Personenprofil und laeuft gegen die echten Routen
`/api/wizard/start` + `/api/wizard/answer`.

```bash
# 0. Voraussetzung: laufende App + DB. Wegwerf-DB genuegt.
ssh -fN -L 5433:127.0.0.1:15432 -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=15 -o ServerAliveCountMax=3 root@49.13.15.44
node scripts/test-db-setup.mjs
npx next build && NODE_ENV=production DATABASE_URL=<edufunds_test> npx next start -p 3199

# 1. Profile bauen (einmalig; danach eingefroren und im Repo versioniert)
npx tsx --env-file=.env.local scripts/eval-simuser.ts profil

# 2. Vor der Aenderung messen
npx tsx --env-file=.env.local scripts/eval-simuser.ts lauf --label vorher \
    --base http://localhost:3199 --parallel=2   # NIE hoeher, s. unten

# 3. Aenderung an lib/wizard/prompts.ts, neu bauen, erneut messen
npx tsx --env-file=.env.local scripts/eval-simuser.ts lauf --label nachher --base http://localhost:3199

# 4. Diff
npx tsx --env-file=.env.local scripts/eval-simuser.ts bericht --label nachher --vergleich vorher

# 5. Wirkung auf den fertigen Antrag — auf DEN Sessions, nicht auf dem alten Korpus
npx tsx --env-file=.env.local scripts/eval-pipeline.ts --live --N=1 --snapshot \
    --korpus data/eval/simuser-runs/korpus-nachher.json
npx tsx --env-file=.env.local scripts/eval-gutachter.ts --snapshots <neues-snapshot-verzeichnis> --arms=ki
```

**Zwei eingebaute Schutzmechanismen** — beide brechen den Lauf ab, statt zu warnen:

- *Profil-Widerspruch*: Ein Hintergrundfakt, der dem Nichtwissen derselben Person widerspricht
  („weiss nicht, wie viele Tablets" + „etwa 30 Stueck"), macht aus der Testperson einen
  Automaten. Dann misst der Lauf Auskunftsfreude statt Fragenqualitaet. Geprueft beim
  Profilbau **und** erneut vor jedem Lauf, weil die Datei von Hand editierbar ist.
- *Zahlen-Leck*: Zahlangaben in den Antworten des Simulanten ohne Deckung im Profil.
  Eine Korrekturschleife benennt die ungedeckte Zahl und laesst neu formulieren (druckt sie
  von 17/25 auf ~3/25); ab 20 % betroffener Interviews bricht der Lauf ab.
- *Runden ohne Faktenzuwachs*: Bleibt die Faktentabelle nach einer Antwort unveraendert,
  ist entweder die Extraktion ausgefallen oder sie liefert nichts. Beides deckelt jede
  faktenbasierte Kennzahl; ab 40 % bricht der Lauf ab und nennt beide Ursachen.

⚠️ **`--parallel` nie ueber 2.** Darueber drosselt Mistral, und `extractFacts` faengt den 429
selbst ab und behaelt kommentarlos den alten Stand — ein gedrosselter Lauf sieht dann aus wie
einer mit schlechten Fragen (23 stille Ausfaelle im ersten Versuch).

⚠️ **Messgrenze der Ausbeute-Metrik:** Die Tiefen-Quote kommt aus `lib/wizard/facts-tiefe.ts` —
demselben Modul, das den Interviewer-Prompt speist. Sie belegt, dass mehr pruefbare Angaben ins
Interview kommen; sie belegt **nicht**, dass der Antrag dadurch besser wird. Das entscheiden
WIZ-01/02 und WIZ-05 auf den frisch erzeugten Sessions (Schritt 5).

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
| `WIZARD_FACTS_TIEFE=1` | 5: Tiefen-Abschnitt + zugehoerige Regeln im Interviewer-Prompt | **false** |

Hebel 5 ist bewusst ein Schalter und keine feste Aenderung: Der Vorher/Nachher-Vergleich mit
dem simulierten Nutzer braucht **beide Zustaende aus einem Build**. Sonst vergleicht man zwei
Uebersetzungen des Quelltextes miteinander statt zwei Interviewer — und misst Build-Rauschen
als Wirkung mit. Nebeneffekt, der ihn auch danach rechtfertigt: Ruecknahme ohne Deploy.

**Default OFF, weil der Nutzen nicht belegt ist** (BASELINE.md, Eintrag 31.07. (b)): Unter der
defekten Fakten-Extraktion sah der Hebel nach +4 Punkten Tiefe aus, nach ihrer Reparatur kehrt
sich das um. Der Schalter bewegt Block UND System-Regeln gemeinsam — waeren sie getrennt,
verwiese der System-Prompt auf einen Abschnitt, den es nicht gibt, und ein A/B misst nur die
Haelfte des Hebels.

### Fakten-Extraktion pruefen

```bash
npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts            # Korpus-Antworten
npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts --lauf <label>  # echte Sessions
```

Zwei Bedingungen, beide muessen halten: **ueber 50 % der Interviews liefern Slots** UND
**keine erfundenen Zahlen**. Abdeckung allein waere auch mit Halluzinationen zu erreichen.
Stand 31.07.2026 nach der Reparatur: 23/25 Slots, 0/25 Erfindungen (vorher 2/25 und ungeprueft).

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
