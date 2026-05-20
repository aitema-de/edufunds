---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: 04
subsystem: testing
tags: [eval, pipeline, baseline, gemini, llm-judge, snapshot, wiz-01, wiz-02, wiz-03, finanzplan]

# Dependency graph
requires:
  - phase: 05-wizard-pipeline-tuning-ux-l-cke-02
    provides: pipeline-korpus.json (22 Eintraege)
  - phase: 05-wizard-pipeline-tuning-ux-l-cke-03
    provides: geber-classification.ts + pipeline-config.ts

provides:
  - Eval-Pipeline-CLI (scripts/eval-pipeline.ts + scripts/eval-pipeline-internals.ts)
  - Phase-5-Baseline: WIZ-01=100.0, WIZ-02=98.3, WIZ-03=46.3 (gemini-2.0-flash, N=3, n=22)
  - 63 versionierte Baseline-Snapshots als Replay-Anker (data/eval/pipeline-snapshots/baseline/)
  - BASELINE.md Phase-5-Eintrag mit Per-Geber-Gruppe + Per-Dossier Breakdown
  - .gitignore korrekt konfiguriert (pipeline-snapshots/* ausser baseline/, pipeline-reports/)

affects: [05-05, 05-06, 05-07, 05-08, wave-3-tuning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eval-Pipeline-Pattern: eval-pipeline-internals (Pure-Functions) + eval-pipeline (CLI-Entry) analog eval-matcher"
    - "Snapshot-Schema-Version-1 mit Replay-Modus (Pitfall-3-Schutz)"
    - "Soft-Failure pro Eintrag (errMsg in Report, kein Skript-Abbruch)"
    - "Force-committed baseline/ als Replay-Anker trotz .gitignore"

key-files:
  created:
    - "scripts/eval-pipeline.ts — CLI-Entry mit --live/--replay/--N/--snapshot/--md-summary"
    - "scripts/eval-pipeline-internals.ts — Pure-Function-Library (scoreWiz01/02/03/Finanzplan)"
    - "data/eval/pipeline-snapshots/baseline/ — 63 force-committed Baseline-Snapshots"
    - "data/eval/pipeline-reports/2026-05-20T09-50-33.json — Aggregat-Report"
    - "__tests__/eval/pipeline-*.test.ts (9 Dateien) — lebende Score-Tests"
    - "__tests__/eval/fixtures/llm-stubs.ts — Judge-Stub-Antworten"
  modified:
    - "data/eval/BASELINE.md — Phase-5-Pipeline-Baseline-Eintrag angehaengt"
    - "lib/wizard/llm.ts — Timeout 60s→120s + gemini pipeline auf flash (503-Fallback)"
    - ".gitignore — pipeline-snapshots/* + Negativ-Ausnahme baseline/"

key-decisions:
  - "LLM_PROVIDER=gemini (Option B): DeepSeek Balance=0, gemini-2.5-pro 503-Blocker — Gemini-Flash fuer alle Calls ist stabiler als kein Run"
  - "gemini-2.0-flash auch fuer Pipeline-Calls (statt 2.5-pro): 503-Service-Unavailable bei 2.5-pro macht sequenziellen Run unmoglich; Flash stabil und vergleichbar bei gleicher Konfiguration in Wave 3"
  - "63 statt 66 Snapshots: 3 Soft-Fails (429 Rate-Limit pv-edge-002-run2/run3, Scoring-Fehler pv-011-run1) — akzeptabel, Score-Placeholder in Aggregation"
  - "WIZ-01=100% trivial: maxZeichen=0 Dossiers zum Run-Zeitpunkt — Metrik wird erst relevant wenn Constraints in Dossiers eingetragen"
  - "Wave-3-Trigger Reihenfolge: Hebel-3 zuerst (Tonalitaet bei aktion-mensch/kultur-macht-stark), dann oeffentlich-Cluster WIZ-03"

requirements-completed: [WIZ-01, WIZ-02, WIZ-03]

# Metrics
duration: 165min
completed: 2026-05-20
---

# Phase 5 Plan 04: Wave-2 Baseline Summary

**Eval-Pipeline-CLI (scripts/eval-pipeline.ts, 889 LOC) + Baseline-N=3-Run mit Gemini-Flash (WIZ-01=100%, WIZ-02=98.3%, WIZ-03=46.3%) + 63 Snapshots force-committed als Wave-3-Replay-Anker**

## Performance

- **Duration:** ~165 Minuten (inkl. 53 min Baseline-Run)
- **Started:** 2026-05-20 ca. 09:26 UTC
- **Completed:** 2026-05-20 ca. 12:44 UTC
- **Tasks:** 5 (1a + 1b + 1c bereits von vorherigem Agenten erledigt, 4 + 5 in dieser Session)
- **Files modified:** 5 (BASELINE.md, .gitignore, llm.ts + 63 neue Snapshot-Dateien + 1 Report)

## Accomplishments

- Baseline-N=3-Live-Run ueber alle 22 Korpus-Eintraege mit Gemini-Flash erfolgreich abgeschlossen (53 Minuten, 63/66 Snapshots — 3 Soft-Fails)
- Phase-5-Baseline in BASELINE.md eingetragen: WIZ-01=100.0/0.0, WIZ-02=98.3/4.5, WIZ-03=46.3/15.8, Finanzplan=92.0/10.8
- 63 Baseline-Snapshots force-committed als versionierter Replay-Anker fuer Wave-3-Tuning-Iterationen
- .gitignore korrekt konfiguriert: pipeline-snapshots/* gitignored, baseline/ Negativ-Ausnahme
- Gemini-2.5-Pro-Timeout-Problem geloest (503 Service Unavailable) durch Flash-Fallback + Timeout-Erhoehung auf 120s

## Task Commits

Vorherige Agent-Commits:
1. **Task 1a+1b: eval-pipeline-internals + CLI** - `ae958fb` (feat)
2. **Task 1c: Wave-0-Tests → lebend (40 Tests)** - `6d237f8` (test)

Diese Session:
3. **Deviation: gemini timeout + flash-fallback** - `9ea2032` (fix, Rule 1)
4. **Task 4a: .gitignore + 63 Baseline-Snapshots force-committed** - `93b0e71` (chore)
5. **Task 5: BASELINE.md Phase-5-Eintrag** - `45530a3` (docs)

## Files Created/Modified

- `/home/kolja/edufunds-app/scripts/eval-pipeline.ts` — CLI-Entry mit 7 Flags + main() + Threshold-Gate
- `/home/kolja/edufunds-app/scripts/eval-pipeline-internals.ts` — Pure-Function-Library (6 Score-Funktionen)
- `/home/kolja/edufunds-app/data/eval/BASELINE.md` — Phase-5-Baseline-Eintrag ergaenzt
- `/home/kolja/edufunds-app/.gitignore` — pipeline-snapshots/* + Negativ-Ausnahme baseline/
- `/home/kolja/edufunds-app/lib/wizard/llm.ts` — Timeout 60s→120s + gemini pipeline=flash
- `/home/kolja/edufunds-app/data/eval/pipeline-snapshots/baseline/` — 63 JSON-Snapshots
- `/home/kolja/edufunds-app/data/eval/pipeline-reports/2026-05-20T09-50-33.json+.md` — Aggregat-Report

## Decisions Made

- **Option B (Gemini-Flash statt DeepSeek):** DeepSeek Balance=0, Gemini-2.5-Pro lieferte am 2026-05-20 dauerhaft 503. Entscheidung: gemini-2.0-flash fuer alle Calls (Interview + Pipeline + Judge). Wave-3-Iterationen muessen dieselbe Konfiguration verwenden — Metriken sind nicht direkt mit DeepSeek-Runs vergleichbar.
- **63 statt 66 Snapshots akzeptiert:** 3 Soft-Fails (429 Rate-Limit + Scoring-Fehler) werden als 0-Score-Placeholder in der Aggregation behandelt. Der Run ist als Baseline nutzbar, da n=22 repraesentiert ist.
- **WIZ-01=100% als triviales Ergebnis dokumentiert:** maxZeichen=0 in allen Dossiers → kein Constraint messbar. Metrik wird erst in Wave 3 relevant wenn Dossiers erweitert werden.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] gemini-2.5-pro 503 Service Unavailable + Timeout zu eng**
- **Found during:** Task 4 (Live-Run)
- **Issue:** (a) gemini-2.5-pro gab dauerhaft 503 zurueck wegen hoher Nachfrage. (b) REQUEST_TIMEOUT_MS=60s war zu eng fuer komplexe Gemini-Calls (~90s bei grossen Prompts).
- **Fix:** (a) gemini.pipeline von "gemini-2.5-pro" auf "gemini-2.0-flash" herabgestuft. (b) Timeout auf 120s erhoet.
- **Files modified:** lib/wizard/llm.ts
- **Verification:** Smoke-Test `smoke-llm.ts` gruen, Baseline-Run erfolgreich abgeschlossen.
- **Committed in:** `9ea2032`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Service-Ausfall)
**Impact on plan:** Flash statt Pro-Model ist eine qualitative Einschraenkung (WIZ-03-Judge weniger kalibriert). Wave-3-Vergleichbarkeit bleibt gewaehrt wenn dieselbe Flash-Konfiguration verwendet wird. Provider-Switch ist in BASELINE.md dokumentiert gemaess D-26.

## Issues Encountered

- **DeepSeek Balance=0:** Wie in STATE.md dokumentiert, war dies ein bekannter Blocker. Option B (Gemini) wurde ausgewaehlt.
- **gemini-2.5-pro 503:** Zusaetzlicher Blocker waehrend des Runs. Flash-Fallback ermoeglichte dennoch einen vollstaendigen Run am selben Tag.
- **tee-Buffering:** Die `| tee`-Pipe buffert die stdout-Ausgabe des Node-Prozesses. Direkte Datei-Redirect (`> /tmp/log &`) war zuverlaessiger fuer Monitoring.
- **pv-edge-003 geber-classification=unknown:** `niedersachsen-sport` ist nicht in `geber-classification.ts` gemappt → WIZ-03=0. D-28-Backlog.

## Baseline-Run-Ergebnisse (Wave-3-Referenz)

| Achse | Mean | Stddev | 2σ-Band |
|-------|------|--------|---------|
| WIZ-01 (Pflichtabschnitte) | 100.0 | 0.0 | 100–100 |
| WIZ-02 (Hallu-Detection) | 98.3 | 4.5 | 89.3–107.3 |
| WIZ-03 (Tonalitaet) | 46.3 | 15.8 | 14.7–77.9 |
| Finanzplan (Sub) | 92.0 | 10.8 | 70.4–113.6 |

**WIZ-03 Per-Cluster:** stiftung=55.0, eu=58.1, wirtschaftspreis=51.5, oeffentlich=43.1, verband-uni=39.1

## Next Phase Readiness

- **Bereit:** Wave-3 kann starten. Baseline-Snapshots ermöglichen `--replay data/eval/pipeline-snapshots/baseline/` ohne LLM-Calls.
- **Erster Wave-3-Schritt:** Plan 05-05 (Hebel-3 vorbildFormulierungen) — Tonalitaet bei aktion-mensch + kultur-macht-stark, gemessen gegen WIZ-03-Delta.
- **Offen (D-28):** `niedersachsen-sport` in geber-classification.ts ergaenzen (pv-edge-003 WIZ-03=0).
- **Offen:** LLM-Provider-Entscheidung fuer Wave-3-Tuning-Iterationen dokumentieren (weiterhin gemini-flash oder DeepSeek nach Top-Up).

---

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| 05-04-SUMMARY.md vorhanden | FOUND |
| baseline/ mit 63 Snapshots vorhanden | FOUND |
| Commit ae958fb (Task 1a+1b) | FOUND |
| Commit 6d237f8 (Task 1c) | FOUND |
| Commit 9ea2032 (Deviation Fix) | FOUND |
| Commit 93b0e71 (Task 4a Snapshots) | FOUND |
| Commit 45530a3 (Task 5 BASELINE.md) | FOUND |

*Phase: 05-wizard-pipeline-tuning-ux-l-cke*
*Completed: 2026-05-20*
