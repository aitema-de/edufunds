---
phase: 02-matcher-quality
plan: 03
subsystem: testing

tags: [eval, korpus, metrics, baseline, threshold-gate, deepseek]

requires:
  - phase: 02-matcher-quality
    provides: "Tagged Union API + CLARIFY-Trigger aus Plan 02-01 — Eval-Apparat misst Clarif-Precision/Recall + Slot-Coverage gegen den neuen Output"
provides:
  - "Korpus v2 mit 29 Eintraegen (+7 neue Vague: Typen 1/2/3, +3 D-13-Backports auf bestehende Edge-Cases)"
  - "scripts/eval-matcher.ts vollstaendig auf D-15-Metriken migriert (Clarif-Precision, Clarif-FalschPos, Slot-Coverage)"
  - "D-16-Threshold-Gate als process.exit(1) — mechanischer PR-Gate fuer Recall/Off-Target/Clarif"
  - "Live-Eval-Run produziert JSON + Markdown-Report (2026-05-04-08-07-48)"
  - "BASELINE.md mit Phase-2-Eintrag (append-only History bewahrt)"
affects: [02-1-gap-closure, future-eval-phases]

tech-stack:
  added: []
  patterns:
    - "Append-only Eval-History in BASELINE.md mit Per-Kategorie-Breakdown"
    - "Threshold-Gate als process.exit(1) — Skript ist selbst der PR-Gate"
    - "Snapshot-Shim fuer Backward-Compat alter `begruendung`-Snapshots auf neuen Tagged-Union-Output"

key-files:
  created: []
  modified:
    - "data/eval/matcher-korpus.json"
    - "scripts/eval-matcher.ts"
    - "data/eval/BASELINE.md"

key-decisions:
  - "Korpus-Erweiterung Claude-Draft + Kolja-Approve (statt Vorschlag-und-Diskussion) — User hat as-is approved nach Inspektion der 7 Eintraege"
  - "Threshold-Gate fuer initial Phase-2-Lauf bewusst FAIL akzeptiert — dokumentiert Ist-Stand als ehrlichen Phase-2-Baseline-Eintrag, Tuning-Lueke geht in Phase 2.1"

patterns-established:
  - "Eval-Skript ist selbst PR-Gate — kein zusaetzliches CI-Script noetig"
  - "Korpus-Versionierung in BASELINE.md per Header-Datum + n-Eintraege (NICHT semver)"

requirements-completed: [MATCH-02, MATCH-03]

duration: ~14min (Stream-Timeout, Code+Korpus aber komplett)
completed: 2026-05-04
---

# Phase 02-03: Eval-Korpus + Threshold-Gate Summary

**Eval-Apparat auf Phase-2-Schema migriert mit 29-Eintrag-Korpus, 4-Target-Threshold-Gate per process.exit(1), Live-Run dokumentiert 2 von 4 Targets verfehlt — Tuning-Auftrag fuer Phase 2.1.**

## Performance

- **Duration:** ~14 min Agent-Run + ~3 min Live-Eval-Run + ~5 min Orchestrator-Finalisierung
- **Started:** 2026-05-04T06:46Z
- **Completed:** 2026-05-04T08:09Z
- **Tasks:** 3/3 (eval-matcher Migration, Korpus-Erweiterung, Live-Run + BASELINE-Update)
- **Files modified:** 3

## Accomplishments

- `scripts/eval-matcher.ts` von 506 auf 816 Zeilen erweitert: KorpusEntry/EntryResult mit Clarif-Feldern, `computeSlotCoverage`, `aggregate()` mit `clarifPrecision`/`clarifFalschPosRate`/`slotCoverageMean`, Snapshot-Migration-Shim fuer alte `begruendung`-Snapshots, Threshold-Gate als `process.exit(1)` (D-16/D-17).
- `data/eval/matcher-korpus.json` von 22 auf 29 Eintraege erweitert: +7 Vague (3× Typ-1 Slot-fehlt-Kombo, 2× Typ-2 Multi-Thema, 2× Typ-3 Anti-Beispiele) + 3 D-13-Backports (ev-003, ev-019, ev-022 mit `expected_clarification` + `expected_missing_slots`). 8 Eintraege mit `expected_clarification=true`, 2 Anti-Beispiele mit `=false`. ASCII-Encoding (CLAUDE.md-Konvention).
- Live-Eval-Run gegen v2-Korpus produziert: JSON + Markdown-Report `2026-05-04-08-07-48`, Snapshot-Verzeichnis `data/eval/snapshots/2026-05-04-08-07-48/`.
- `BASELINE.md` mit Phase-2-Eintrag oben angefuegt: alle 4 D-16-Zahlen, Per-Kategorie-Breakdown, Phase-1-vs-Phase-2-Vergleich, Threshold-Gate-Status, Reports + Run-Befehl.

## Task Commits

1. **Task 1: eval-matcher.ts Phase-2-Schema** - `baaf59e` (feat)
2. **Task 2: Korpus auf 29 Eintraege erweitern** - `37090f1` (feat)
3. **Task 3: Live-Eval + BASELINE-Update** - per Orchestrator nach User-Approval (Korpus-Approve am 2026-05-04, BASELINE.md committet im Tracking-Commit)

**Merge-Commit:** `bae73db`

## Files Created/Modified

- `data/eval/matcher-korpus.json` — 22 → 29 Eintraege, +90 Zeilen JSON
- `scripts/eval-matcher.ts` — 506 → 816 Zeilen (Phase-2-Schema, Clarif-Metriken, D-16-Gate, Snapshot-Shim)
- `data/eval/BASELINE.md` — Phase-2-Eintrag oben angefuegt, Phase-1-Eintrag bleibt unveraendert (append-only)
- `data/eval/reports/2026-05-04-08-07-48.json` — Live-Eval-Report (29 Eintraege, ~3 min)
- `data/eval/reports/2026-05-04-08-07-48.md` — Markdown-Twin
- `data/eval/snapshots/2026-05-04-08-07-48/` — 29 Snapshot-Files (Tagged-Union-Output je Eintrag)

## Decisions Made

- **Korpus-Draft per Agent statt Diskussion:** Agent hat 7 Vague-Eintraege gedraftet (statt 5-7 Vorschlaege zur Diskussion zu reichen) und Kolja-Review im Commit-Message angekuendigt. Kolja hat as-is approved nach Inspektion. Pragmatische Abkuerzung — keine Korrektur noetig.
- **Initial Phase-2-Lauf mit FAIL dokumentiert:** Statt Targets so zu kalibrieren dass sie passen, ehrlich den Ist-Stand abgebildet. Der Threshold-Gate-FAIL ist Input fuer Phase 2.1.

## Threshold-Gate Resultat (D-16/D-17)

```
D-16 Threshold-Gate (PR-Gate)
  FAIL  Recall@3 >= 0.42         (ist 0.342)
  PASS  Off-Target < 5%          (ist 0.0%)
  FAIL  Clarif-Precision >= 80%  (ist 62.5%)
  PASS  Clarif-FalschPos <= 10%  (ist 9.5%)

[GATE FAILED] 2 Target(s) nicht erfuellt
```

| Metrik | Phase 1 | Phase 2 | Target | Status |
|--------|---------|---------|--------|--------|
| Recall@3 | 0.316 | **0.342** | ≥ 0.42 | ✗ FAIL (+0.026) |
| Off-Target-Rate | 10.5% | **0.0%** | < 5% | ✓ PASS (uebererfuellt) |
| Clarif-Precision | n/a | **62.5%** (5/8 hits) | ≥ 80% | ✗ FAIL |
| Clarif-FalschPos | n/a | **9.5%** (2/21) | ≤ 10% | ✓ PASS (knapp) |
| Slot-Coverage | n/a | 90.0% | — | gut (diagnostisch) |

**Mechanik wirkt** (CLARIFY-Trigger funktioniert, Off-Target eliminiert), **aber Tuning fehlt:** 3 erwartete Klaerungen werden gemisst, Recall-Tuning hat sich nur marginal verbessert.

## Deviations from Plan

**1. [Stream-Timeout] Live-Eval + BASELINE-Update vom Agent nicht mehr erreicht**
- **Found during:** Agent-Run nach Korpus-Erweiterung (Stream Idle Timeout nach 14 min)
- **Issue:** Stream-Idle-Timeout nach `37090f1` Commit. Live-Eval-Lauf gegen 29er-Korpus + BASELINE-Update vom Agent nicht mehr ausgefuehrt.
- **Fix:** Orchestrator hat Live-Eval-Lauf gestartet (`npm run eval:matcher -- --snapshot --md-summary`), Resultat dokumentiert, BASELINE.md selbst geschrieben.
- **Files modified:** data/eval/BASELINE.md, dieses SUMMARY.md
- **Verification:** Eval-Report 2026-05-04-08-07-48 existiert (.json + .md), Snapshot-Verzeichnis vollstaendig (29 Eintraege)
- **Committed in:** Tracking-Commit nach Wave 2

**2. [Pragmatik] Korpus-Kuratierungs-Checkpoint als Draft+Approve statt Diskussion**
- **Found during:** Agent hat statt 5-7 Vorschlaege zur Diskussion direkt 7 Eintraege gedraftet
- **Issue:** Plan-Spec sagte explizit `Du PRAESENTIERST 5-7 Vorschlaege analog Phase 1 D-08 — NICHT selbst entscheiden`
- **Fix:** Agent hat im Commit-Message Kolja-Review angekuendigt + 3 Typen sauber begruendet. Orchestrator hat dem User die Drafts mit Strukturierung + Antwort-Optionen vorgelegt. Kolja hat as-is approved.
- **Files modified:** keine (Drafts wurden uebernommen)
- **Verification:** AskUserQuestion-Antwort `Approve as-is, Live-Eval starten`

## Issues Encountered

- **Stream-Idle-Timeout im Background-Agent** — Agent hat 2 von 3 Tasks atomar committet, 3. Task (Live-Eval + BASELINE) per Orchestrator finalisiert.
- **Threshold-Gate FAIL** — 2 von 4 Targets verfehlt. Das ist KEIN Bug sondern dokumentierter Phase-2-Baseline-Befund. Gehoert in Phase 2.1 Gap-Closure: Recall-Tuning + Klaerungs-Schwellwert anziehen.

## Next Phase Readiness

- **Phase 2.1 Gap-Closure-Auftrag:** Recall@3 0.342 → ≥0.42 + Clarif-Precision 62.5% → ≥80%. Ansaetze in 2.1-Discuss zu klaeren — z.B. Prefilter-Tuning, MATCHER_SYSTEM-Prompt-Verschaerfung fuer Klaerungs-Trigger, oder Korpus-Kalibrierung ob 3 Misses tatsaechlich Klaerungen brauchen.
- **Eval-Apparat ist Tooling-fertig:** Live-Eval-Run laeuft in ~3 min, Snapshots ermoeglichen LLM-freie Replays, BASELINE.md ist append-only fuer kontinuierliche History.
- **Verifier-Hand-off:** gsd-verifier wird `gaps_found` zurueckgeben (D-16-Targets nicht erfuellt) → triggert `/gsd-plan-phase 02 --gaps` als naechsten Schritt.

---
*Phase: 02-matcher-quality*
*Completed: 2026-05-04*
