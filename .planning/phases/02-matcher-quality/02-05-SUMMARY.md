---
phase: 02-matcher-quality
plan: 05
subsystem: code-review-gap-closure

tags: [code-review, robustness, frontend, eval-script, gap-closure]

requires:
  - phase: 02-matcher-quality
    provides: "Tagged-Union-API + CLARIFY-Trigger aus 02-01/02-02/02-03 — WR-Patches setzen darauf auf"
provides:
  - "StartClient.tsx mit explizitem Ranking-Branch + Error-Branch fuer unbekanntes body.kind (WR-01)"
  - "StartClient.tsx mit isSecondRound-Reset bei frischem AnliegenForm-Submit (WR-02)"
  - "scripts/eval-matcher.ts KorpusEntry um forceRanking + previousAnliegen erweitert (WR-03)"
  - "scripts/eval-matcher.ts Threshold-Gate-Warnung bei n=0 expected_clarification-Eintraegen (WR-04)"
affects: [02-04 (matcher.ts WR-05), 02-07 (browser-smoke verifiziert WR-02 visuell)]

tech-stack:
  added: []
  patterns:
    - "Tagged-Union-Contract aktiv durchsetzen: unbekannte kind-Werte als Fehler behandeln, NICHT als Default-Fallback"
    - "Multi-Round-State proaktiv beim frischen Submit-Pfad zuruecksetzen, nicht nur im Erfolgs-Branch"
    - "Korpus-Drift-Warnungen statt automatischer null-Pass — null als pass bleibt, aber sichtbarer Hinweis verhindert Silent-Maskierung"

key-files:
  created: []
  modified:
    - "components/Wizard/StartClient.tsx (162 → 172 Zeilen)"
    - "scripts/eval-matcher.ts (816 → 841 Zeilen)"

key-decisions:
  - "WR-05 (matcher.ts score<50/score>100-Filter) NICHT in 02-05 — gleiches File wird in 02-04 ueberarbeitet, dort wird es mitbearbeitet"
  - "Null gilt im Threshold-Gate weiterhin als pass — Drift-Schutz erfolgt per console.warn, nicht per Gate-FAIL (Skript ist PR-Gate, soll keine False-Negatives bei Korpus-Variationen werfen)"

patterns-established:
  - "Frontend-Dispatch-Hardening: jeder Tagged-Union-Branch explizit; else-Zweig nur fuer echten Backend-Bug-Fall"
  - "Eval-Skript-Drift-Schutz: Korpus-Pruefungen als Warning UND Gate-Mechanik beibehalten"

requirements-completed: [MATCH-02, MATCH-03]

duration: ~7min Agent-Run (Read + 2 Tasks + Tests + Commits + Summary)
completed: 2026-05-04
---

# Phase 02-05: Code-Review-Warnings WR-01..WR-04 Gap-Closure Summary

**Vier von fuenf Code-Review-Warnings aus 02-REVIEW.md addressiert: StartClient.tsx-Robustness (Tagged-Union-Hardening + Multi-Round-Reset) und scripts/eval-matcher.ts-Audit-Hardening (Korpus-Drift-Warnung + Snapshot-Audit-Felder). WR-05 wandert nach 02-04 (gleiches File matcher.ts).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-04T09:34Z (Worktree-Spawn)
- **Completed:** 2026-05-04T09:41Z
- **Tasks:** 2/2 (StartClient-Hardening, eval-matcher-Audit-Hardening)
- **Files modified:** 2

## Accomplishments

### Task 1 — StartClient.tsx (WR-01 + WR-02)

- **WR-01:** Dispatch-Block hat jetzt expliziten `else if (body.kind === "ranking")`-Branch. Unbekanntes `body.kind` (vergessenes Feld, neuer Variant) faellt in finalen `else`-Zweig und setzt `setError({ message: "Unerwartetes Antwortformat (kind=...). Bitte erneut versuchen." })` statt silent eine leere Trefferliste zu rendern. Backend-Drift wird als Fehler sichtbar.
- **WR-02:** `runMatch` resettet `isSecondRound` direkt nach `setMatchState(null)` per `if (!values.forceRanking) setIsSecondRound(false)`. Das greift bei jedem frischen `AnliegenForm.onSubmit`-Aufruf und verhindert den Sticky-Bug nach fehlgeschlagener zweiter Runde (network error / HTTP 500 / wiederholte clarification trotz forceRanking). Praezisieren-/Force-Ranking-Pfade sind unbeeinflusst, weil sie `forceRanking: true` setzen.

### Task 2 — scripts/eval-matcher.ts (WR-03 + WR-04)

- **WR-03:** `KorpusEntry`-Interface um zwei optionale Felder `forceRanking?: boolean` und `previousAnliegen?: string` erweitert. `entryToMatchInput` mappt beide Felder conditional ins `MatchInput`. Korpus kann jetzt D-09-Override- und Praezisierungs-Pfade als Eintraege definieren — Snapshots dokumentieren, welche Input-Variante den `clarification`-Pfad ausgeloest hat.
- **WR-04:** Threshold-Gate-Block (D-16) bekommt zwei `console.warn`-Ausgaben unmittelbar vor der `gate`-Definition. Bei `m.nExpectedClarif === 0` (keine `expected_clarification=true`-Eintraege) erscheint Warnung „Clarif-Precision-Target wird strukturell NICHT gemessen — Korpus pruefen!". Analog fuer `nExpectedNoClarif === 0`. Gate-Mechanik (null-as-pass + `process.exit(1)`) bleibt unveraendert — Drift wird sichtbar, ohne dass strukturelle Korpus-Variationen False-Negatives ausloesen.

## Task Commits

1. **Task 1: WR-01 + WR-02 StartClient-Hardening** — `d3251f3` (fix)
2. **Task 2: WR-03 + WR-04 eval-matcher-Audit-Hardening** — `7a9837b` (feat)

## Files Created/Modified

- `components/Wizard/StartClient.tsx` — 162 → 172 Zeilen, +11/-1 (Reset-Block + Ranking-Branch + Error-Branch)
- `scripts/eval-matcher.ts` — 816 → 841 Zeilen, +25 (KorpusEntry-Felder + entryToMatchInput-Mapping + Drift-Warnungen)

## Acceptance-Criteria Output

### Task 1 (StartClient.tsx)

| Kriterium | Erwartet | Ist | Status |
|---|---|---|---|
| `grep -c "Unerwartetes Antwortformat"` | == 1 | 1 | PASS |
| `grep -c 'body.kind === "ranking"'` | >= 1 | 1 | PASS |
| `grep -c "WR-01"` | >= 1 | 1 | PASS |
| `grep -c "WR-02"` | >= 1 | 1 | PASS |
| `grep -c "if (!values.forceRanking) setIsSecondRound(false)"` | == 1 | 1 | PASS |
| `grep -c "setIsSecondRound(false)"` | >= 2 | 3 | PASS (Erfolgs-Reset + frischer-Submit-Reset + 1× preexisting in handlePraezisierung-Pfad-Doku) |
| `grep -c 'setMatchState({ kind: "ranking", matches: \[\] })'` | >= 1 | 1 | PASS |
| `grep -c 'kind: "clarification"'` | >= 3 | 2 | siehe Hinweis unten |
| `grep -c "handlePraezisierung\|handleForceRanking"` | >= 3 | 4 | PASS |
| `npx tsc --noEmit` | exit 0 | exit 0 | PASS |
| Jest `MatchResultList.test.tsx` | gruen | 12/12 | PASS |

**Hinweis zu `kind: "clarification"`:** Plan-Vorgabe ">= 3" trifft die Code-Realitaet nicht — Literal `kind: "clarification"` (mit Doppelpunkt) erscheint nur 2× im File: einmal im Tagged-Union-Type (Zeile 18) und einmal im `setMatchState(...)`-Aufruf (Zeile 74). Die uebrigen Treffer im Plan-Spec verwenden `body.kind === "clarification"` (ohne Doppelpunkt nach `kind`) und werden vom grep-Pattern nicht erfasst. Substanz: Tagged-Union-Type ist unveraendert, beide Dispatch-Branches sind erhalten.

### Task 2 (eval-matcher.ts)

| Kriterium | Erwartet | Ist | Status |
|---|---|---|---|
| `grep -c "forceRanking?: boolean"` | >= 1 | 1 | PASS |
| `grep -c "previousAnliegen?: string"` | >= 1 | 1 | PASS |
| `grep -c "if (entry.forceRanking !== undefined)"` | == 1 | 1 | PASS |
| `grep -c "if (entry.previousAnliegen !== undefined)"` | == 1 | 1 | PASS |
| `grep -c "WR-03"` | >= 1 | 2 | PASS |
| `grep -c "WR-04"` | >= 1 | 1 | PASS |
| `grep -c "nExpectedClarif === 0"` | == 1 | 3 | siehe Hinweis unten |
| `grep -c "nExpectedNoClarif === 0"` | == 1 | 3 | siehe Hinweis unten |
| `grep -c "Clarif-Precision-Target wird strukturell NICHT gemessen"` | == 1 | 1 | PASS |
| `grep -c "process.exit(1)"` | >= 1 | 4 | PASS |
| `grep -c "process.exit(0)"` | >= 1 | 1 | PASS |
| `grep -c "Recall@3 >= 0.42"` | == 1 | 1 | PASS |
| `npx tsc --noEmit` | exit 0 | exit 0 | PASS |

**Hinweis zu `nExpected*Clarif === 0`:** Plan-Vorgabe `== 1` unterschaetzt die Vorlage — beide Strings kommen pre-existing 2× im File vor (jsdoc-Kommentar in der `AggregateMetrics`-Definition + Berechnung in `aggregate()`). Mit der WR-04-Erweiterung kommt jeweils 1× hinzu — Gesamt 3. Die kritische Bedingung „neuer Treffer im Threshold-Gate-Block" ist erfuellt.

## Decisions Made

- **WR-05 ausgeklammert:** Plan 02-04 ueberarbeitet `lib/wizard/matcher.ts` (Pipe-Parser-Score-Filter + Prompt-Schaerfung). Score-Range-Hardening (WR-05) gehoert dorthin, nicht hierher — verhindert Merge-Konflikt zwischen den parallelen Plans 02-04 und 02-05.
- **Null-as-pass im Threshold-Gate beibehalten:** WR-04-Fix waere alternativ als FAIL bei `nExpected*Clarif === 0` denkbar gewesen. Bewusst nicht gewaehlt — Korpus-Variationen mit n=0 sind valide Edge-Cases (z.B. Phase-1-Snapshots). Sichtbare Warnung schuetzt vor Silent-Maskierung ohne strukturelle False-Negatives.
- **WR-02 als Reset im runMatch-Anfang statt im Praezisieren-Erfolgs-Branch:** Symmetrischer Ansatz — jeder frische Submit (ohne forceRanking-Flag) setzt isSecondRound zurueck. Das ist robuster als zusaetzliche Branches in handlePraezisierung/handleForceRanking, weil es den Sticky-Bug auch ueber retry()-Aufrufe abdeckt.

## Threshold-Gate Status

Wird in Plan 02-04 (matcher.ts WR-05 + ggf. weitere D-16-Tunings) gemessen. Diese Plan-Patches beruehren keine Eval-Metriken direkt — die Drift-Warnung greift nur bei Korpus-Mutation, nicht beim Live-Lauf gegen den 29-Eintrag-Korpus.

## Deviations from Plan

**1. [Plan-Acceptance-Mismatch] grep-Counts fuer `kind: "clarification"` und `nExpectedClarif === 0`**
- **Found during:** Acceptance-Criteria-Verifikation (Task 1 + Task 2)
- **Issue:** Plan-Spec fordert `grep -c 'kind: "clarification"'` >= 3 und `grep -c "nExpectedClarif === 0"` == 1. Beide Erwartungen treffen die Code-Realitaet nicht — Plan-Autor hat den existing Codebase-Stand nicht 1:1 gegengezaehlt.
- **Fix:** Substantielle Pruefung statt mechanische grep-Zaehlung — alle relevanten Code-Stellen sind unveraendert / korrekt erweitert (siehe Hinweise in Acceptance-Criteria-Tabelle).
- **Files modified:** Keine ueber den Plan-Scope hinaus
- **Verification:** TypeScript clean, Jest-Tests gruen, Code-Review-Patches in beiden Files visuell verifiziert

**2. [Worktree-Branch-Reset] Worktree-HEAD war vor Task-Start auf falschem Base**
- **Found during:** worktree_branch_check (Initial Action)
- **Issue:** Worktree-Branch `worktree-agent-a44f83fa02e95f9e3` war an `5870e81` (`main` HEAD, nginx-Security-Headers) statt an `9224be0` (Phase-02-PLAN-Commit). `git merge-base` und `git rev-parse HEAD` zeigten beide den falschen Commit.
- **Fix:** `git reset --hard 9224be010b2f969f46be78e06772d77981ebd963` — sicher, weil keine User-Aenderungen im fresh worktree.
- **Verification:** Post-Reset `git rev-parse HEAD` == `9224be0`, korrekte File-Versionen geladen.
- **Hinweis:** Dieser Reset ist explizit erlaubt im worktree_branch_check und wirkt nicht destruktiv.

## Issues Encountered

Keine Bugs / blocking issues. Beide Tasks sind als Robustness-Patches reine Erweiterungen ohne Verhaltensaenderung im Happy-Path. Die WR-02-Verhaltensaenderung (Sticky-Bug-Fix) wird in Plan 02-07 visuell per Browser-Smoke verifiziert.

## Next Phase Readiness

- **Plan 02-04 (parallel):** Bearbeitet `lib/wizard/matcher.ts` inkl. WR-05 (score-Range-Filter). Konflikt-frei mit 02-05 (disjunkter File-Scope).
- **Plan 02-06:** Eval-Re-Run gegen den 29-Eintrag-Korpus. Die WR-04-Drift-Warnung wird nicht auslosen (8 expected_clarification=true + 21 expected_clarification=false sind im Korpus).
- **Plan 02-07:** Browser-Smoke wird WR-02-Fix verifizieren (Sticky-Bug-Szenario manuell durchspielen, dann frischer Submit ohne Multi-Round-Guard-Trigger).

## Self-Check: PASSED

**Files (post-commit, working tree):**
- FOUND: `/home/kolja/edufunds-app/.claude/worktrees/agent-a44f83fa02e95f9e3/components/Wizard/StartClient.tsx` (172 Zeilen)
- FOUND: `/home/kolja/edufunds-app/.claude/worktrees/agent-a44f83fa02e95f9e3/scripts/eval-matcher.ts` (841 Zeilen)

**Commits:**
- FOUND: `d3251f3` (Task 1 — StartClient.tsx WR-01+WR-02)
- FOUND: `7a9837b` (Task 2 — eval-matcher.ts WR-03+WR-04)

**Verification commands:**
- `npx tsc --noEmit` → exit 0
- `npx jest __tests__/components/MatchResultList.test.tsx` → 12 passed, 0 failed
- `git diff --diff-filter=D --name-only HEAD~2 HEAD` → empty (no deletions)

---
*Phase: 02-matcher-quality*
*Completed: 2026-05-04*
