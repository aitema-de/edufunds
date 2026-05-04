---
phase: 02-matcher-quality
plan: 02
subsystem: ui

tags: [frontend, react, lucide-react, tagged-union, ui]

requires:
  - phase: 02-matcher-quality
    provides: "Tagged Union API-Response (kind: ranking | clarification) aus Plan 02-01 — MatchResultList und ClarificationCard dispatchen darauf"
provides:
  - "MatchResultList rendert passt_weil/achtung_bei mit lucide-react Icons (CheckCircle / AlertTriangle)"
  - "ClarificationCard als eigene Komponente fuer vage Anliegen mit Praezisierungs-Textarea + Trotzdem-Override"
  - "StartClient haelt Tagged-Union-State und dispatched in JSX zwischen MatchResultList | ClarificationCard"
  - "isSecondRound-Guard verhindert Endlos-Klaerungs-Loop"
  - "12 UI-Tests befuellt (von it.todo zu echten passing assertions)"
affects: [03-*-wizard-flows, future-ui-phases]

tech-stack:
  added: []
  patterns:
    - "Tagged-Union-State in Client-Components: JSX dispatched per state.kind"
    - "lucide-react Icons (NICHT Heroicons) als Repo-Konvention"
    - "isSecondRound-Guard als Cycle-Breaker fuer LLM-Schleifen"

key-files:
  created:
    - "components/Wizard/ClarificationCard.tsx"
  modified:
    - "components/Wizard/MatchResultList.tsx"
    - "components/Wizard/StartClient.tsx"
    - "__tests__/components/MatchResultList.test.tsx"
    - "jest.config.js"

key-decisions:
  - "ClarificationCard als eigene Komponente statt inline in StartClient — bessere Test-Isolation"
  - "Override-Link statt Button fuer Trotzdem-Ranking — visuell sekundaer, aber leicht erreichbar"

patterns-established:
  - "Tagged Union dispatch in StartClient — Pattern fuer kuenftige Multi-Branch-States"
  - "lucide-react Icons mit Tailwind-Farb-Klassen (emerald, orange) statt Inline-SVG"

requirements-completed: [MATCH-02, MATCH-03]

duration: ~14min (Stream-Timeout, Code aber komplett)
completed: 2026-05-04
---

# Phase 02-02: Frontend ClarificationCard + MatchResultList Summary

**Tagged-Union-Frontend mit lucide-react-Icons fuer passt_weil/achtung_bei und Klaerungsfrage-Card mit Override-Link, plus 12 grueneTests.**

## Performance

- **Duration:** ~14 min (Agent-Stream-Timeout nach Code-Commit, vor Browser-Smoke + SUMMARY)
- **Started:** 2026-05-04T06:46Z
- **Completed:** 2026-05-04T08:09Z (orchestrator-finalisiert)
- **Tasks:** 3/3 Code-Tasks (Browser-Smoke per User-Entscheidung deferred)
- **Files modified:** 4 (3 Components + 1 Test + jest.config)

## Accomplishments

- `MatchResultList.tsx` migriert: `MatchEntry`-Interface haelt `passt_weil` + `achtung_bei` (NICHT mehr `begruendung`). Pro Treffer rendert ein gruener Block mit `CheckCircle` (label `Passt, weil:`) und ein oranger Block mit `AlertTriangle` (label `Achtung:`, nur wenn String nicht leer). Empty-State + Score-Badges + Antrag-starten-Flow unveraendert.
- `ClarificationCard.tsx` neu: rendert die LLM-Klaerungsfrage als h2, ein textarea mit aria-label, einen `Praezisieren`-Button (disabled wenn textarea leer) und einen Override-Link `Trotzdem mit aktueller Eingabe ranken`. `HelpCircle`-Icon im Header.
- `StartClient.tsx` umgestellt: haelt jetzt `MatchState = { kind: 'ranking', matches } | { kind: 'clarification', question } | null` und dispatched in JSX entweder MatchResultList ODER ClarificationCard. Beim Praezisieren-Submit wird `/api/match` mit `forceRanking: true` und neuem `anliegen` (alter + Praezisierungstext) aufgerufen. `isSecondRound`-Guard rendert MatchResultList mit Hinweis-Banner statt erneuter Card, falls API trotz forceRanking nochmals clarification liefert.
- 12 UI-Tests in `__tests__/components/MatchResultList.test.tsx` von `it.todo` zu echten passing assertions umgesetzt — alle gruen.

## Task Commits

1. **Task 1: ClarificationCard + MatchResultList migrieren** - `33ff711` (feat)
2. **Task 2: StartClient Tagged-Union-State + Multi-Round-Guard + 12 UI-Tests** - `1ec8efd` (feat)
3. **Task 3: Browser-Smoke** - per User-Entscheidung am 2026-05-04 als offline-deferred markiert (Code + Tests sind gruen, Browser-Smoke erfolgt manuell durch Kolja gegen `localhost:3101/antrag/start`)

**Merge-Commit:** `753e9ed`

## Files Created/Modified

- `components/Wizard/ClarificationCard.tsx` — neu, 61 Zeilen, lucide-react HelpCircle Icon, textarea + Praezisieren-Button + Override-Link
- `components/Wizard/MatchResultList.tsx` — `MatchEntry` jetzt mit `passt_weil`/`achtung_bei`, lucide-react CheckCircle/AlertTriangle Icons, Empty-State unveraendert
- `components/Wizard/StartClient.tsx` — Tagged-Union-State `MatchState`, JSX-Dispatch, isSecondRound-Guard, Praezisieren-Submit-Handler
- `__tests__/components/MatchResultList.test.tsx` — 12 it.todo → 12 passing it() (Rendering, Icon-Klassen, Empty-State, Score-Badges)
- `jest.config.js` — Konfiguration fuer @testing-library/react Setup

## Decisions Made

- **ClarificationCard als eigene Komponente** statt inline in StartClient: bessere Test-Isolation, klarere Verantwortlichkeit. Hat das Design-Contract aus 02-PATTERNS.md eingehalten.
- **Override-Link statt Button** fuer Trotzdem-Ranking: visuell sekundaer (verhindert Vorpreschen), aber leicht erreichbar (D-11).

## Deviations from Plan

**1. [Stream-Timeout] Browser-Smoke + SUMMARY.md vom Agent nicht mehr erreicht**
- **Found during:** Agent-Run nach Task 3-Commit (Stream Idle Timeout nach 14 min)
- **Issue:** Stream-Idle-Timeout nach `1ec8efd` Commit. SUMMARY.md und Browser-Smoke-Checkpoint nicht mehr ausgefuehrt.
- **Fix:** Orchestrator hat den Code-State verifiziert (3/3 Code-Tasks committed, alle 12 UI-Tests gruen, tsc gruen), SUMMARY.md selbst geschrieben. Browser-Smoke per User-Entscheidung deferred (siehe Browser-Smoke-Hinweis unten).
- **Files modified:** dieses SUMMARY.md
- **Verification:** `npm test -- --testPathPattern='MatchResultList'` gruen (12/12), `npx tsc --noEmit` exit 0
- **Committed in:** Tracking-Commit nach Wave 2

## Issues Encountered

- **Stream-Idle-Timeout im Background-Agent** — Agent hat alle 3 Code-Tasks atomar committet, aber den finalen Self-Check + SUMMARY.md + Browser-Smoke-Aufruf nicht mehr erreicht. Ursache: WSL2-Latenz oder LLM-Provider-Pause. Workaround: Orchestrator hat den State direkt verifiziert.

## Browser-Smoke (deferred)

Per User-Entscheidung am 2026-05-04 wird der Browser-Smoke offline durchgefuehrt:

```bash
npm run dev   # http://localhost:3101
```

**4 UI-Pfade zu testen** in `localhost:3101/antrag/start`:

1. **Ranking-Pfad (klar formuliert):** Anliegen `Schulgarten Berlin Grundschule`. Erwartung: 3 Treffer-Cards mit gruenem `passt_weil`-Block (CheckCircle) und orangem `achtung_bei`-Block (AlertTriangle).
2. **Clarification-Pfad (vag):** Anliegen `Wir wollen was im Bereich Bildung machen`. Erwartung: ClarificationCard mit HelpCircle-Header, Klaerungsfrage als h2, leeres textarea + disabled Praezisieren-Button.
3. **Praezisierung:** im Pfad 2 textarea fuellen mit `Lesefoerderung Klasse 1-2 in Berlin`, Praezisieren-Button klicken. Erwartung: API-Call mit `forceRanking: true`, dann Ranking-Cards.
4. **Override (Trotzdem ranken):** im Pfad 2 ohne Praezisierung den Link `Trotzdem mit aktueller Eingabe ranken` klicken. Erwartung: API-Call ohne neuen Text, Ranking-Cards (ggf. mit isSecondRound-Hinweis-Banner).

Findings → ggf. `/gsd-debug` oder `/gsd-plan-phase 02 --gaps`.

## Next Phase Readiness

- Code + Tests vollstaendig committed und auf `feature/wizard-adaptive` (HEAD `bae73db`)
- Tagged-Union-Frontend ist konsistent mit Tagged-Union-Backend (Plan 02-01)
- Browser-Smoke offen — wird vom Verifier (gsd-verifier) als `human_needed` aufgegriffen, falls Phase 2 ueberhaupt verifizierbar gilt (siehe 02-03 Threshold-Gate-FAIL)

---
*Phase: 02-matcher-quality*
*Completed: 2026-05-04*
