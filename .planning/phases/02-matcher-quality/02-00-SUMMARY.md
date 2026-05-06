---
phase: 02-matcher-quality
plan: 00
subsystem: testing
tags: [jest, it-todo, test-skeleton, matcher, wave-0]

# Dependency graph
requires:
  - phase: 01-eval-korpus-matcher
    provides: Eval-Apparat (data/eval/matcher-korpus.json + scripts/eval-matcher.ts) als Mess-Apparat fuer Phase 2
provides:
  - Drei Pending-Test-Skelette mit it.todo-Markierungen, sodass Plans 02-01 und 02-02 die Test-Infrastruktur nicht selbst aufbauen muessen
  - Verify-Befehl `npm test -- --testPathPattern='wizard/matcher'` fuer Plans 02-01/02-02 sofort gruen (alle pending = exit 0)
  - D-XX-Referenzen pro Test-Skelett, damit nachfolgende Tasks den Decision-Anker direkt sehen
affects: [02-01-backend-matcher, 02-02-frontend-matchresultlist]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "it.todo-Skelette als Wave-0-Vorbereitung — Plan 02-01/02-02 ersetzen it.todo durch it und schreiben die Assertions"
    - "Deutsche describe/it-Strings mit ASCII (Footer.test.tsx-Konvention)"
    - "JSDoc-Header mit Phase- und D-XX-Referenzen pro Test-Datei"

key-files:
  created:
    - __tests__/lib/wizard/matcher.parser.test.ts
    - __tests__/lib/wizard/matcher.dispatch.test.ts
    - __tests__/components/MatchResultList.test.tsx
  modified: []

key-decisions:
  - "it.todo-Skelette anstelle leerer Test-Files: Jest erkennt sie als pending, blockiert keinen CI-Lauf, signalisiert aber Erwartungs-Inventar"
  - "Im Skelett zur Dispatch-Datei wurde der Codebase-Konventions-Hinweis 'costs (nicht cost)' aus 02-RESEARCH.md Pitfall 6 als it.todo verankert — D-08 in 02-CONTEXT.md schreibt 'cost', Plan 02-01 setzt 'costs' durch"

patterns-established:
  - "Wave-0-Test-Skelette koennen ohne Imports auskommen, solange jeder it-Eintrag spaeter die noetigen Imports einfuegt"
  - "JSDoc-Header pro Test-Datei mit Phase- und D-XX-Referenzen vereinfacht spaetere Befuellung"

requirements-completed: [MATCH-02, MATCH-03]

# Metrics
duration: 2min
completed: 2026-05-04
---

# Phase 2 Plan 00: Wave-0 Test-Skelette — Summary

**Drei Pending-Test-Skelette (matcher.parser, matcher.dispatch, MatchResultList) mit insgesamt 30 it.todo-Markierungen, jede mit D-XX-Anker, machen den Verify-Befehl `npm test -- --testPathPattern='matcher|MatchResultList'` fuer Plans 02-01 und 02-02 sofort gruen.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-04T06:33:51Z
- **Completed:** 2026-05-04T06:35:51Z
- **Tasks:** 3
- **Files modified:** 3 (alle neu erstellt)

## Accomplishments

- `__tests__/lib/wizard/matcher.parser.test.ts`: 8 it.todo-Markierungen zu D-01 (4-Spalten-Format), D-02 (Soft-Failure bei != 4 Spalten), D-05 (CLARIFY-Zeilen ignorieren) und Parser-Hygiene (Code-Fence, validIds-Filter, NaN-Filter).
- `__tests__/lib/wizard/matcher.dispatch.test.ts`: 10 it.todo-Markierungen, drei describe-Bloecke (CLARIFY-Dispatch / forceRanking-Override / costs-Feldname). Codebase-Konvention `costs` (nicht `cost`) ist als zwei it.todos und zusaetzlich im JSDoc verankert.
- `__tests__/components/MatchResultList.test.tsx`: 12 it.todo-Markierungen, zwei describe-Bloecke (Ranking-Branch + ClarificationCard). Lucide-Icons (CheckCircle / AlertTriangle / HelpCircle) sind explizit referenziert, damit Plan 02-02 nicht versehentlich Heroicons importiert.
- Gesamt-Suite `npm test -- --testPathPattern='matcher|MatchResultList'`: 3 Suites passed, 30 todos, exit 0.
- TypeScript-Check `npx tsc --noEmit` exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Test-Skelett matcher.parser.test.ts anlegen** — `30383d1` (test)
2. **Task 2: Test-Skelett matcher.dispatch.test.ts anlegen** — `4ec32e9` (test)
3. **Task 3: Test-Skelett MatchResultList.test.tsx anlegen** — `c6e9e6a` (test)

**Plan metadata:** wird durch Orchestrator commitet (Worktree-Modus)

## Files Created/Modified

- `__tests__/lib/wizard/matcher.parser.test.ts` (16 Zeilen, 8 it.todo) — Parser-Skelett fuer parsePipeMatches (D-01/D-02/D-05).
- `__tests__/lib/wizard/matcher.dispatch.test.ts` (24 Zeilen, 10 it.todo) — Dispatch-Skelett fuer runMatch CLARIFY-vs-Ranking + forceRanking + costs-Feldname (D-05/D-08/D-09).
- `__tests__/components/MatchResultList.test.tsx` (23 Zeilen, 12 it.todo) — UI-Smoke-Skelett fuer Ranking-Branch + ClarificationCard (D-10/D-11/D-12).

## Decisions Made

- Skelett-Dateien ohne Imports angelegt — jede `it.todo` wird in Plan 02-01/02-02 in `it` umgewandelt und holt sich die noetigen Imports. Vorteil: Wave 0 kann nicht durch Symbol-Auflösungs-Probleme blockieren (z.B. wenn `parsePipeMatches` heute noch nicht exportiert ist).
- `costs`-Konvention im Dispatch-Skelett verdoppelt verankert (zwei it.todos + JSDoc-Hinweis), weil 02-CONTEXT.md D-08 noch `cost` schreibt — Plan 02-01 muss bewusst von `cost` auf `costs` korrigieren.

## Deviations from Plan

None — Plan executed exactly as written. Alle drei Tasks haben den exakten Inhalt aus dem PLAN.md `<action>`-Block uebernommen, alle acceptance_criteria sind erfuellt (siehe Self-Check unten).

## Issues Encountered

- **Worktree-Bootstrap-Issue:** Der Worktree war auf Commit `7ac6c92` reset, der die Phase-2-PLAN-Dateien (`02-00-PLAN.md`, `02-01-PLAN.md`, `02-02-PLAN.md`, `02-03-PLAN.md`, `02-CONTEXT.md`, `02-PATTERNS.md`, `02-DISCUSSION-LOG.md`) noch nicht enthielt — sie lagen nur untracked im Parent-Repo. Loesung: Plan- und Context-Dateien aus dem Parent (`/home/kolja/edufunds-app/.planning/phases/02-matcher-quality/`) in den Worktree kopiert (untracked), Plan ausgefuehrt. Die kopierten Plan-Dateien werden NICHT in einem Commit landen — der Orchestrator merged spaeter den Worktree zurueck und committet die Plan-Dateien selbst im Hauptbaum. Kein Code-Impact.

## User Setup Required

None — Wave 0 ist reine Test-Infrastruktur, keine externen Services beruehrt.

## Hand-off-Hinweise fuer naechste Plans

**Plan 02-01 (Backend Matcher):**
- `__tests__/lib/wizard/matcher.parser.test.ts` und `__tests__/lib/wizard/matcher.dispatch.test.ts` uebernehmen.
- Pro `it.todo` daraus `it` machen und die Assertion implementieren (4-Spalten-Parse, CLARIFY-Dispatch, forceRanking-Override).
- Im Dispatch-Test mit `jest.mock('@/lib/wizard/llm')` arbeiten — Pattern siehe `__tests__/lib/wizard/facts-extractor.test.ts`.
- Codebase-Konvention `costs` durchsetzen, NICHT `cost` — siehe Pitfall im JSDoc.

**Plan 02-02 (Frontend MatchResultList):**
- `__tests__/components/MatchResultList.test.tsx` uebernehmen.
- Imports erst dann gruen, wenn `components/Wizard/MatchResultList.tsx` umgebaut und `components/Wizard/ClarificationCard.tsx` erstellt sind.
- `lucide-react` (NICHT Heroicons) fuer CheckCircle / AlertTriangle / HelpCircle.
- Pattern fuer @testing-library/react + jest.mock siehe `__tests__/components/Footer.test.tsx`.

## Next Phase Readiness

- Wave 0 abgeschlossen, Wave 1 (Plan 02-01 Backend) und Wave 2 (Plan 02-02 Frontend + Plan 02-03 Eval) koennen parallel starten.
- Verify-Befehl `npm test -- --testPathPattern='matcher|MatchResultList'` liefert exit 0 — Plans 02-01/02-02 koennen TDD-artig befuellen.

## Self-Check

```
FOUND: __tests__/lib/wizard/matcher.parser.test.ts
FOUND: __tests__/lib/wizard/matcher.dispatch.test.ts
FOUND: __tests__/components/MatchResultList.test.tsx
FOUND commit: 30383d1 (test(02-00): Wave-0 Skelett matcher.parser.test.ts)
FOUND commit: 4ec32e9 (test(02-00): Wave-0 Skelett matcher.dispatch.test.ts)
FOUND commit: c6e9e6a (test(02-00): Wave-0 Skelett MatchResultList.test.tsx)
Acceptance criteria Task 1: 1 phase-ref, 9 it.todo (>=8), 6 D-refs (>=4), Jest exit 0 — PASS
Acceptance criteria Task 2: 1 phase-ref, 3 describes (>=3), 11 it.todo (>=10), 3 costs (>=2), 8 D-refs (>=5), Jest exit 0 — PASS
Acceptance criteria Task 3: 1 phase-ref, 2 describes (>=2), 13 it.todo (>=12), 13 D-refs (>=8), Jest exit 0 — PASS
Overall verify: npm test -- --testPathPattern='matcher|MatchResultList' = 3 suites passed, 30 todos, exit 0 — PASS
TypeScript: npx tsc --noEmit exit 0 — PASS
```

## Self-Check: PASSED

---
*Phase: 02-matcher-quality*
*Plan: 00*
*Completed: 2026-05-04*
