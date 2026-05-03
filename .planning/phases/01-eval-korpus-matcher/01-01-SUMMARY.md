---
phase: 01-eval-korpus-matcher
plan: 01
subsystem: testing
tags: [eval, matcher, deepseek, tsx, cli-tooling, recall-at-3, off-target-rate]

# Dependency graph
requires: []
provides:
  - "Korpus-Schema fuer Matcher-Eval (data/eval/matcher-korpus.json) mit 3-Eintrag-Stub"
  - "CLI-Skript scripts/eval-matcher.ts mit Live/Snapshot/Replay/MD-Summary-Modus"
  - "JSON-Reportstruktur (meta + aggregate + perEntry) als Hand-off an Plan 02"
  - "npm-Skript-Alias eval:matcher"
  - "Validierungs-Hook gegen data/foerderprogramme.json (Exit 2 vor erstem LLM-Call)"
affects:
  - "01-02 (Korpus-Vollkuration durch Kolja + Baseline-Run + BASELINE.md)"
  - "Phase 2 (Matcher-Quality — Tuning-Schleife gegen Plan-02-Baseline)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CLI-Tooling-Skript via npx tsx mit relativen Imports (../lib/...)"
    - "Validierungs-Hook BEVOR erster LLM-Call (Exit 2 bei Drift)"
    - "Soft-Failure pro Korpus-Eintrag (try/catch + error-Feld im Report)"
    - "ISO-Timestamp-Filenames via toISOString().slice(0,19).replace(/[:T]/g,'-')"
    - "JSON+Markdown-Twin-Output (gleicher Stamp, .json fuer Maschinen, .md fuer Menschen)"

key-files:
  created:
    - "data/eval/matcher-korpus.json"
    - "scripts/eval-matcher.ts"
    - ".planning/phases/01-eval-korpus-matcher/01-01-SUMMARY.md"
  modified:
    - "package.json"
    - ".gitignore"

key-decisions:
  - "data/eval/reports/ und data/eval/snapshots/ via .gitignore als transient ausgeschlossen — Korpus selbst bleibt versioniert, Baselines kommen separat in Plan 01-02"
  - "Imports einzeln pro Modul-Aufrufstil aufgeloest (nicht zusammengefasst), damit das verify-Snippet 'import { runMatch } from' single-line greift"
  - "ASCII-Substitution NUR in JSON-Datenfeldern (Korpus + Reports + Snapshots) — Konsole, JSDoc und Markdown verwenden Umlaute"

patterns-established:
  - "Eval-Skript-Template: Live/Snapshot/Replay-Triple mit gemeinsamer Aggregations-Logik (replay liest Snapshot statt LLM-Call)"
  - "Per-Kategorie-Breakdown via results.filter(r => r.category === c) auf Non-Edge-Subset"
  - "Edge-Case-Handling: Eintraege mit expected_top3=[] aus Recall-Mittel ausgeschlossen, separate Edge-Case-Sektion mit edgeCaseEmptyTopK + edgeCaseLeakHits"

requirements-completed: []  # MATCH-01 wird erst von Plan 01-02 (Vollkuration) komplettiert — Plan 01-01 liefert Schema + Skript, nicht das vollkuratierte Korpus.

# Metrics
duration: ~25min
completed: 2026-05-03
---

# Phase 1 Plan 1: Eval-Korpus Matcher — Schema + Skript Summary

**Eval-CLI fuer den Programm-Matcher mit Live/Snapshot/Replay-Modus, validierungs-gehaerteter Korpus-Stub und npm-Alias `eval:matcher` — read-only gegen `lib/wizard/matcher.ts`, Hand-off-fertig fuer Plan 02.**

## Performance

- **Duration:** ca. 25 Minuten
- **Started:** 2026-05-03T07:46Z
- **Completed:** 2026-05-03T08:00Z
- **Tasks:** 3 / 3
- **Files modified:** 5 (3 neu, 2 geändert)

## Accomplishments

- **Korpus-Schema final** in `data/eval/matcher-korpus.json` als Top-Level-JSON-Array mit allen Pflichtfeldern (`id`, `category`, `anliegen`, `expected_top3`, `expected_off_target`, `notes`) und optionalen Schul-Profil-Feldern.
- **3-Eintrag-Stub** kuratiert: ev-001 (`ausfuehrlich`, Schulgarten Berlin), ev-002 (`kurz`, Tablets/WLAN Gymnasium), ev-003 (`vag`, Edge-Case mit `expected_top3=[]`).
- **CLI-Skript** `scripts/eval-matcher.ts` mit allen drei Run-Modi (Live, `--snapshot`, `--replay <dir>`) und `--md-summary`-Flag.
- **Validierungs-Hook** prueft alle programmId-Referenzen gegen `data/foerderprogramme.json` BEVOR der erste LLM-Call (Exit 2 mit Praefix `[eval-matcher] Eintrag ev-XXX: ...`).
- **Soft-Failure-Pattern**: einzelner `runMatch`-Throw bricht den Lauf nicht ab, wird als `error`-Feld pro Eintrag persistiert, aus der Aggregation ausgeschlossen.
- **Live-Smoke gruen**: Recall@3=1.000 fuer beide Non-Edge-Eintraege im ersten Run, Latenz ~2.7s/Eintrag, Kosten 0,1 Cent fuer 3 Eintraege, Total Tokens 7190.

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: Korpus-Stub mit 3 Beispiel-Eintraegen** — `bc3980e` (feat)
2. **Task 2: scripts/eval-matcher.ts implementieren mit Live/Snapshot/Replay-Modus** — `ec4ddca` (feat)
3. **Task 3: Hand-off-SUMMARY.md fuer Plan 02 schreiben** — wird mit Final-Metadaten-Commit versendet (docs)

## Files Created/Modified

- `data/eval/matcher-korpus.json` — JSON-Array mit 3 kuratierten Schul-Anliegen (ASCII-substituiert)
- `scripts/eval-matcher.ts` — Eval-CLI (Live/Snapshot/Replay/MD-Summary), 504 Zeilen
- `package.json` — neuer Skript-Alias `eval:matcher`
- `.gitignore` — `data/eval/reports/` + `data/eval/snapshots/` als transient ausgeschlossen
- `.planning/phases/01-eval-korpus-matcher/01-01-SUMMARY.md` — diese Datei

## Reportstruktur

Das Skript schreibt pro Lauf eine JSON-Datei nach `data/eval/reports/<ISO>.json` mit folgender Top-Level-Struktur (gemessen am Stub-Run vom 2026-05-03T07:50:24Z):

```json
{
  "meta": {
    "generatedAt": "2026-05-03T07:50:24.455Z",
    "korpusPath": "data/eval/matcher-korpus.json",
    "korpusSize": 3,
    "mode": "live",                    // "live" | "live+snapshot" | "replay"
    "replayDir": null,                 // bei --replay: relativer Pfad
    "matcherFile": "lib/wizard/matcher.ts"
  },
  "aggregate": {
    "n": 3,                            // Gesamtzahl Eintraege
    "nNonEdge": 2,                     // ohne expected_top3=[]-Eintraege
    "nEdge": 1,                        // Edge-Cases (expected_top3=[])
    "nErrored": 0,                     // Soft-Failures
    "recallAtThreeMean": 1,            // Mittelwert ueber Non-Edge
    "offTargetRate": 0,                // Anteil mit Off-Target im Top-3
    "perCategory": {
      "kurz":         { "n": 1, "recallMean": 1, "offTargetRate": 0 },
      "ausfuehrlich": { "n": 1, "recallMean": 1, "offTargetRate": 0 },
      "vag":          { "n": 0, "recallMean": 0, "offTargetRate": 0 }
    },
    "latencyMsMean": 2716,
    "totalEurCents": 0.1,
    "totalUsdCents": 0.1,
    "totalCalls": 3,
    "totalTokens": 7190,
    "edgeCaseEmptyTopK": 0,            // Edge-Cases mit leerer Matcher-Liste
    "edgeCaseLeakHits": 0              // Edge-Cases mit Off-Target-Leak
  },
  "perEntry": [
    {
      "id": "ev-001",
      "category": "ausfuehrlich",
      "expected_top3": ["aktion-mensch-schulkooperation", "kultur-macht-stark"],
      "expected_off_target": ["bmbf-digitalpakt-2"],
      "actual_top3": [
        { "id": "berlin-startchancen", "score": 85, "begruendung": "..." },
        { "id": "kultur-macht-stark", "score": 80, "begruendung": "..." },
        { "id": "aktion-mensch-schulkooperation", "score": 78, "begruendung": "..." }
      ],
      "recall": 1,                     // null bei Edge-Case oder Error
      "offTargetHit": false,           // null bei Edge-Case oder Error
      "latencyMs": 3158,
      "costs": { "eurCents": 0.04, "usdCents": 0.04, "calls": 1, "totalTokens": 2452 },
      "totalCandidates": 32,           // nach Prefilter
      "filteredOut": 99,               // wegen Bundesland / harter Kriterien
      "error": null                    // gesetzt nur bei Soft-Failure
    },
    { "id": "ev-002", "...": "..." },
    { "id": "ev-003", "...": "...", "recall": null, "offTargetHit": null }
  ]
}
```

Bei `--md-summary` wird zusätzlich eine `data/eval/reports/<ISO>.md` mit menschlesbarer Per-Kategorie-Tabelle und Edge-Case-Sektion geschrieben (gleicher Timestamp wie `.json`).

## Gemessene Latenz und Kosten (3-Eintrag-Stub)

Aus dem Live-Smoke vom 2026-05-03T07:50:24Z:

| Metrik           | Wert                                  |
|------------------|---------------------------------------|
| Wallclock-Total  | ~8 Sekunden (3 sequenzielle Calls)    |
| Latenz/Eintrag   | 2.72s avg (2.48s – 3.16s)             |
| Total Tokens     | 7.190 (Prompt + Completion)           |
| Total Calls      | 3                                     |
| Gesamtkosten     | 0,1 Cent (USD = EUR-Cent bei 92¢/$1)  |
| Pro Eintrag      | ~0,03 Cent                            |

Snapshot- und Replay-Lauf produzieren in der `aggregate`-Sektion identische Recall-/Off-Target-Zahlen (verifiziert), Replay-Latenz 0.00s pro Eintrag, Kosten-Anzeige `< 0,01 € (replay-modus, keine LLM-Calls)`.

**Wichtig — LLM-Varianz beobachtet:** Der zweite Run (mit `--snapshot`) liefert in der gleichen Stub-Umgebung andere actual_top3-Listen — z. B. ev-002 zog im zweiten Run `aktion-mensch-schulkooperation` ins Top-3 und triggerte damit einen Off-Target-Hit (Off-Target-Rate sprang von 0 % auf 50 %). Das ist normales DeepSeek-Stochastik-Verhalten und genau die Begründung dafür, warum die Eval-Infrastruktur existiert: ohne Korpus + Skript wäre diese Drift nicht messbar. Plan 02 sollte erwägen, mehrere Runs zu mitteln oder `seed`/`temperature=0` zu setzen (falls vom Provider unterstützt).

## Hinweise für Plan 02 (Korpus-Vollkuration + Baseline-Run + BASELINE.md)

1. **Skript verarbeitet erweiterte Korpora ohne Code-Änderung.** Iteration läuft generisch über das JSON-Array — neue Einträge einfach anhängen. Schema-Felder pro Eintrag: `id` (`ev-NNN`), `category` (`kurz`|`ausfuehrlich`|`vag`), `anliegen` (mind. 20 Zeichen), optionale `schulname`/`schultyp`/`bundesland`/`geschaetztesBudgetEur`, `expected_top3`, `expected_off_target`, `notes`.
2. **Validator bricht VOR dem ersten LLM-Call ab** — ungültige programmIds sind also zinsfrei, kein DeepSeek-Token wird verbraucht, wenn das Korpus inkonsistent ist. Beim Erweitern kann der Validator-Snippet aus `<verify>` von Task 1 dieses Plans als Pre-Commit-Check verwendet werden.
3. **Kosten-Hochrechnung von Stub auf Plan-02-Vollkorpus:**
   - 3 Stub-Einträge → 0,1 Cent / 7.190 Tokens
   - 22 Einträge ≈ 0,73 Cent / ~52.700 Tokens (linear extrapoliert)
   - 30 Einträge ≈ 1 Cent / ~71.900 Tokens
   - Vollkorpus läuft also locker unter den im PROJECT.md geplanten 3 Cent.
4. **Wallclock-Hochrechnung:**
   - 3 Einträge → 8 Sekunden sequenziell
   - 22 Einträge ≈ 60 Sekunden (1 Minute)
   - 30 Einträge ≈ 80 Sekunden
   - Sequenzielle Calls reichen für Phase 1 — Parallelität ggf. in Phase 2 wenn Korpus auf 100+ wächst.
5. **Bekannte Beispiel-IDs im Stub** (vom Planner verifiziert): `aktion-mensch-schulkooperation`, `kultur-macht-stark`, `bmbf-digitalpakt-2`, `berlin-startchancen`. Plan 02 darf diese 1:1 weiterverwenden. Achtung: `aktion-mensch` (ohne `-schulkooperation`) existiert NICHT im Katalog.
6. **BASELINE.md-Eintrag** für Plan 02 sollte enthalten: Datum, Korpus-Version (Anzahl Einträge), Matcher-Commit-SHA (aktuell `49a1102` auf `feature/wizard-adaptive`), die drei Hauptzahlen, Per-Kategorie-Breakdown, Latenz/Kosten, Pfad zum Report-JSON. Append-only, History sichtbar in `git log`.
7. **LLM-Varianz**: Bei der Vollkuration mehrere Runs gegen denselben Korpus laufen lassen, um zu prüfen, wie stabil die Recall@3-Zahlen sind. Falls Drift > 5–10 Prozentpunkte, Diskussion mit Kolja über `temperature=0`/Seed.
8. **Markdown-Twin** (`--md-summary`) ist menschenlesbar und eignet sich für PR-Bodies. Kein Auto-Update von BASELINE.md durch das Skript — bewusst manuell gepflegt (D-16).

## Decisions Made

- **Reports + Snapshots gitignored**: `data/eval/reports/` und `data/eval/snapshots/` sind transient (jede Live-Ausführung schreibt neue Zeitstempel-Files). Versionierte Baseline kommt separat in `data/eval/BASELINE.md` durch Plan 02. Das Korpus selbst (`data/eval/matcher-korpus.json`) bleibt versioniert.
- **Single-line-Imports** in `scripts/eval-matcher.ts`: bewusst pro Modul aufgesplittet (`import { runMatch } from "../lib/wizard/matcher"` als eigene Zeile), damit grep-basierte verify-Snippets greifen. Multi-line Destructuring wäre eleganter, würde aber die Acceptance-Criteria-Checks und das CONVENTIONS-Pattern aus PATTERNS.md verletzen.
- **Encoding-Trennung scharf umgesetzt**: ASCII (`ae`/`oe`/`ue`/`ss`) NUR in JSON-Datenfeldern (Korpus + Reports + Snapshots). Konsolen-Strings, JSDoc, Markdown verwenden vollständige Umlaute (gemäß globaler `~/.claude/CLAUDE.md`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Multi-line-Imports auf Single-Line umgestellt**
- **Found during:** Task 2 (statischer Check)
- **Issue:** Erste Implementierung verwendete Mehrzeilen-Imports für Lesbarkeit (`import {\n  type MatchInput,\n  ...,\n  runMatch,\n} from "../lib/wizard/matcher"`). Das `<verify>`-Snippet aus Task 2 prüft via `grep -q "import { runMatch } from"` und matcht nur Single-Line.
- **Fix:** Imports pro Modul auf separate Single-Line-Imports aufgeteilt — `import { runMatch } from "../lib/wizard/matcher"` als eigene Zeile.
- **Files modified:** `scripts/eval-matcher.ts` (Zeilen 19–25)
- **Verification:** `grep -q "import { runMatch } from" scripts/eval-matcher.ts` exit 0.
- **Committed in:** `ec4ddca` (Task 2 commit)

**2. [Rule 2 - Missing Critical] .gitignore um Eval-Lauf-Artefakte erweitert**
- **Found during:** Task 2 (Live-Smoke-Phase, nach erstem Lauf-Output)
- **Issue:** Plan spezifiziert keinen .gitignore-Eintrag für `data/eval/reports/` und `data/eval/snapshots/`. Beide werden bei jedem Live-Run mit ISO-Timestamp neu erzeugt — würden ohne Ignore das Repo bei jeder Iteration aufblähen. Per Threat-Model T-01-03 dürften Reports committed werden, aber das ist Plan 02's Job (BASELINE.md mit Commit-SHA), nicht Plan 01-01.
- **Fix:** `.gitignore` um beide Pfade erweitert mit klarem Kommentar, dass das Korpus selbst versioniert bleibt.
- **Files modified:** `.gitignore` (Block am Ende)
- **Verification:** `git status --short` zeigt Reports/Snapshots nicht mehr als untracked nach Live-Run.
- **Committed in:** `ec4ddca` (Task 2 commit, gemeinsam mit Skript)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing-critical)
**Impact on plan:** Beide Auto-Fixes sind notwendig für Plan-Hygiene und verify-Gate-Korrektheit. Kein Scope-Creep.

## Issues Encountered

- **LLM-Varianz beim wiederholten Live-Run** (siehe oben unter „Latenz und Kosten"). Erster Run lieferte Off-Target-Rate=0 %, zweiter Run 50 %. Nicht als Bug behandelt — das ist gerade der Befund, den die Eval-Infrastruktur sichtbar machen soll. Plan 02 sollte Run-Stabilität evaluieren.
- **Nichts Blockierendes**: Skript funktioniert in allen drei Modi (Live, Snapshot, Replay), Snapshot-Replay produziert deterministisch identische Aggregate.

## User Setup Required

None — keine externen Services, keine neuen Env-Variablen. `DEEPSEEK_API_KEY` aus bestehender `.env.local` wird durch `--env-file=.env.local` gelesen.

## Next Phase Readiness

- **Plan 01-02 ist startbereit**: Korpus-Schema steht, Skript läuft, Reportstruktur ist dokumentiert. Plan 02 muss nur kuratieren (3 → 22–30 Einträge) und einen Baseline-Run mit Matcher-Commit-SHA in `data/eval/BASELINE.md` festschreiben.
- **MATCH-01 wird in Plan 01-02 abgeschlossen** (nicht in 01-01) — das Vollkorpus von 20–30 Einträgen ist Teil von Plan 02. Plan 01-01 liefert nur Schema + Skript + Stub.
- **Phase 2 (Matcher-Quality) wartet auf Plan 02** für die versionierte Baseline, gegen die MATCH-02/-03-Tunings verglichen werden.

---
*Phase: 01-eval-korpus-matcher*
*Plan: 01-01 (Wave 1)*
*Completed: 2026-05-03*
