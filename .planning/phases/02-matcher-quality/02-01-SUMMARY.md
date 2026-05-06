---
phase: 02-matcher-quality
plan: 01
subsystem: backend
tags: [matcher, backend, llm, parser, tagged-union, deepseek, clarify-dispatch]

# Dependency graph
requires:
  - phase: 02-matcher-quality
    plan: 00
    provides: Drei Pending-Test-Skelette (matcher.parser, matcher.dispatch, MatchResultList) mit it.todo-Markierungen — Plan 02-01 fuellt zwei der drei (parser + dispatch).
  - phase: 01-eval-korpus-matcher
    provides: Eval-Apparat (matcher-korpus + eval-matcher.ts) — wird in Plan 02-03 um Tagged-Union-Konsumption erweitert.
provides:
  - Tagged-Union MatchResult `{ kind: "ranking" | "clarification" }` als Backend-Quelle fuer Plans 02-02 (Frontend-Dispatch) und 02-03 (Eval-Metriken).
  - 4-Spalten-Pipe-Parser parsePipeMatches (id|score|passt_weil|achtung_bei) mit Soft-Failure bei != 4 Spalten — exportiert fuer Unit-Tests.
  - CLARIFY-Dispatch in runMatch (erste Zeile, forceRanking-Override) fuer vage Anliegen.
  - MATCHER_SYSTEM-Prompt mit Form-A/Form-B-Output, Slot-Heuristik, Negativbeispielen.
  - API-Response mit `kind`-Discriminator + `passt_weil`/`achtung_bei` (statt `begruendung`).
  - Verify-Befehl `npm test -- --testPathPattern='wizard/matcher\\.(parser|dispatch)'` exit 0 mit 18 gruenen Tests.
affects: [02-02-frontend-matchresultlist, 02-03-korpus-eval]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TypeScript Discriminated Union mit `kind`-Diskriminator als Tagged-Union — Pattern aus Phase-1 nicht vorhanden, hier neu eingefuehrt fuer MatchResult."
    - "Pipe-Format-Parser mit Soft-Failure (continue statt throw) bei strukturwidrigen Zeilen — robuste Strategie gegen LLM-Output-Varianz."
    - "CLARIFY-Dispatch-Pattern: erste Zeile entscheidet zwischen Klaerungsfrage und Ranking — vermeidet Pre-Stage-Klassifier-Call."
    - "buildUserPrompt-Conditional-Bloecke fuer optionale Modi (forceRanking, previousAnliegen) — analog zu facts-extractor.ts-Mustern."
    - "jest.mock(\"@/lib/wizard/llm\") fuer Dispatch-Tests — Mock-Pattern aus facts-extractor.test.ts uebernommen."

key-files:
  created:
    - .planning/phases/02-matcher-quality/deferred-items.md
  modified:
    - lib/wizard/matcher.ts (354 Zeilen — Tagged-Union, MatchHit, parsePipeMatches export, runMatch CLARIFY-Dispatch, MATCHER_SYSTEM-Prompt-Erweiterung, MATCHER_MAX_TOKENS 400→600)
    - app/api/match/route.ts (63 Zeilen — Tagged-Union-Dispatch, forceRanking + previousAnliegen durchgereicht, passt_weil/achtung_bei in Response)
    - __tests__/lib/wizard/matcher.parser.test.ts (80 Zeilen — 8 it() statt it.todo, alle gruen)
    - __tests__/lib/wizard/matcher.dispatch.test.ts (170 Zeilen — 10 it() statt it.todo, jest.mock auf llm.ts, alle gruen)
    - scripts/eval-matcher.ts (506 Zeilen — Rule-3-Shim: Tagged-Union-Narrowing, m.begruendung → m.passt_weil; Plan 02-03 erweitert um Clarif-Metriken)

key-decisions:
  - "Feldname `costs` statt `cost` (entgegen 02-CONTEXT D-08-Wortlaut): Codebase-Konvention durchgesetzt — pricing.ts + Phase-1-Code nutzen `costs`. Im JSDoc von matcher.ts und in 2 dispatch.test-Cases verankert."
  - "MATCHER_MAX_TOKENS von 400 auf 600 angehoben: 4 Spalten + ggf. CLARIFY-Variante brauchen mehr Output-Puffer als die alte 3-Spalten-Pauschale. Kosteneffekt vernachlaessigbar."
  - "Pipe-Parser-Logik komplett umgestellt von indexOf-basiert (alt: 3 Spalten via idx1+idx2) auf split-basiert (neu: parts.length === 4). Bewahrt Trailing-Pipe-Erkennung (split liefert 4 Elemente bei Trailing-Pipe)."
  - "Slot-Heuristik im Prompt namentlich aufgelistet (Bundesland / Zielgruppe / Thema) statt nur abstrakt. DeepSeek braucht expliziten Anker laut Phase-1-Erfahrung."
  - "Negativbeispiel mit FEHLENDER Trailing-Pipe explizit im Prompt — Pitfall-1-Mitigation aus 02-RESEARCH.md."
  - "scripts/eval-matcher.ts bekommt Rule-3-Shim (Tagged-Union-Narrowing) statt vollstaendiger Migration — Plan 02-03 ist owner. Minimal-Aenderung: clarification → leeres Ranking als Edge-Case."

patterns-established:
  - "Tagged-Union als Backend-Response-Shape fuer multi-modale API-Responses — Frontend-Dispatch via `body.kind`. Wiederverwendbar fuer kuenftige Multi-Modus-Endpoints."
  - "TDD-Workflow im Worktree: Test-Skelette aus Wave-0 als Vorbedingung, Plan-Tasks fuellen sie und greifen auf bewaehrte Mock-Patterns zurueck."
  - "Soft-Failure-Pipe-Parser-Pattern dokumentiert als wiederverwendbares Muster fuer LLM-Output-Format-Migration."

requirements-completed: [MATCH-02, MATCH-03]

# Metrics
duration: 6min
completed: 2026-05-04
---

# Phase 2 Plan 01: Backend-Migration Matcher (Tagged-Union + 4-Spalten-Parser + CLARIFY-Dispatch) — Summary

**Backend liefert jetzt strukturierte Treffer (`passt_weil` + `achtung_bei`) ODER eine Klaerungsfrage — Tagged-Union mit `kind`-Discriminator. 4-Spalten-Pipe-Parser exportiert. MATCHER_SYSTEM-Prompt mit Form-A (CLARIFY) / Form-B (Ranking) + Slot-Heuristik. 18/18 Tests gruen, TypeScript clean. begruendung-Feld hart entfernt (D-04).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-04T06:40:59Z
- **Completed:** 2026-05-04T06:47:23Z
- **Tasks:** 2
- **Files modified:** 4 + 1 created (deferred-items.md)
- **LOC change:** +385 / -63 (Task 1) + +36 / -2 (Task 2) = netto +356 Zeilen

## Accomplishments

### Task 1 — matcher.ts + Tests (Commit `559e16a`)

- `lib/wizard/matcher.ts`:
  - **MatchInput** erweitert um `forceRanking?: boolean` + `previousAnliegen?: string` (D-09).
  - **MatchedProgramm** komplett entfernt, durch **MatchHit** ersetzt — `begruendung` weg, `passt_weil: string` + `achtung_bei: string` neu (D-04 hart-entfernt).
  - **MatchResult** als `type` (statt interface) — Tagged-Union `{ kind: "ranking"; matches; costs; totalCandidates; filteredOut } | { kind: "clarification"; question; costs }` (D-08).
  - **parsePipeMatches** komplett neu (split-basiert statt indexOf), exportiert. 4-Spalten-exakt mit Soft-Failure (`parts.length !== 4` → continue). CLARIFY|-Zeilen werden uebersprungen (Dispatch in runMatch).
  - **runMatch** dispatched: `firstLine.startsWith("CLARIFY|")` UND `!input.forceRanking` → `{ kind: "clarification", question, costs }`. Sonst Standard-Ranking mit `kind: "ranking"`.
  - **buildUserPrompt** Conditional-Bloecke: `[HINWEIS] ... KEIN CLARIFY` bei `forceRanking=true`, `URSPRUENGLICHES ANLIEGEN` bei `previousAnliegen`.
  - **MATCHER_SYSTEM-Prompt** komplett umgebaut: Form A (CLARIFY mit Slot-Heuristik 2-von-3-fehlen + konkrete Optionen) + Form B (4 Spalten + Trailing-Pipe-Pflicht) + 4 Negativbeispiele (zu vage CLARIFY, zu kurze passt_weil, fehlende Trailing-Pipe, Pipe-im-Text).
  - **MATCHER_MAX_TOKENS** 400 → 600 (Puffer fuer 4 Spalten + CLARIFY-Variante).
- `__tests__/lib/wizard/matcher.parser.test.ts`: 8 it.todo zu echten Tests befuellt (4-Spalten-Parse, 3/5-Spalten-Soft-Failure, Trailing-Pipe, CLARIFY-Skip, Code-Fence, unbekannte ID, NaN-Score).
- `__tests__/lib/wizard/matcher.dispatch.test.ts`: 10 it.todo zu echten Tests befuellt mit `jest.mock("@/lib/wizard/llm")` (CLARIFY-Dispatch, question-Extraktion, ranking-Pfad, Multi-Line-Erst-Zeile, forceRanking-Override 2x, buildUserPrompt-Argument-Inspektion 2x, costs-Konvention 2x).
- `scripts/eval-matcher.ts`: **Rule-3-Auto-Fix** (blocking issue). MatchResult-Tagged-Union zwingt Narrowing — Minimal-Shim: `result.kind === "ranking" ? result.matches : []` + `m.begruendung` → `m.passt_weil`. Vollstaendige Eval-Migration ist Plan 02-03's Job.

### Task 2 — app/api/match/route.ts (Commit `fb8c3fc`)

- runMatch-Aufruf um `forceRanking: body.forceRanking` + `previousAnliegen: body.previousAnliegen` erweitert (D-09 durchgereicht aus Body).
- Response-Body dispatched auf `result.kind`:
  - `clarification` → `{ kind: "clarification", question, costs }`
  - `ranking` → `{ kind: "ranking", matches: [...], totalCandidates, filteredOut, costs }` mit `passt_weil` + `achtung_bei` pro Match. Alle 7 Programm-Felder (id, name, foerdergeber, foerdergeberTyp, foerdersummeText, foerdersummeMax, bewerbungsfristText, kategorien, kurzbeschreibung) unveraendert durchgereicht.
- `begruendung` hart entfernt aus Response (D-04).
- Error-Handler unveraendert (`console.error` + 500-Response).
- `lib/wizard/matcher.ts`: Doc-Comment-Cleanup (Wort 'begruendung' aus Kommentar entfernt, damit Plan-grep-Acceptance == 0 erfuellt ist).
- `deferred-items.md`: 5 vorbestehende Test-Suite-Failures (Header/Footer/ki-antrag-generator/backend-utils/contact — alle ESM/Setup-Bugs) dokumentiert. Per `git stash`-Vergleich verifiziert: identische Failures vor und nach Plan-02-01-Aenderungen → Scope-Boundary, nicht in Plan 02-01 zu fixen.

## Task Commits

1. **Task 1: matcher.ts — Tagged Union, MatchHit, parsePipeMatches, MATCHER_SYSTEM-Prompt** — `559e16a` (feat)
2. **Task 2: app/api/match/route.ts — Tagged-Union-Dispatch im JSON-Response** — `fb8c3fc` (feat)

**Plan metadata:** wird durch Orchestrator commitet (Worktree-Modus)

## Files Created/Modified

| Pfad | Status | LOC | Zweck |
|------|--------|-----|-------|
| `lib/wizard/matcher.ts` | modified | 354 (+218 / -98) | Tagged-Union, MatchHit, 4-Spalten-Parser-Export, CLARIFY-Dispatch, neuer Prompt |
| `app/api/match/route.ts` | modified | 63 (+22 / -7) | Union-Dispatch, forceRanking + previousAnliegen, passt_weil/achtung_bei |
| `__tests__/lib/wizard/matcher.parser.test.ts` | modified | 80 (+72 / -8) | 8 it() statt it.todo, alle gruen |
| `__tests__/lib/wizard/matcher.dispatch.test.ts` | modified | 170 (+158 / -16) | 10 it() statt it.todo, jest.mock auf llm.ts |
| `scripts/eval-matcher.ts` | modified | 506 (+12 / -4) | Rule-3-Shim: Tagged-Union-Narrowing |
| `.planning/phases/02-matcher-quality/deferred-items.md` | created | 23 | Pre-existing Test-Suite-Failures dokumentiert |

## Symbol-Migration

### Hart entfernt (D-04)
- `MatchedProgramm` Interface aus `lib/wizard/matcher.ts` (war oeffentlich exportiert)
- `begruendung: string` Feld aus Match-Datenmodell (matcher.ts + route.ts Response)
- Alte 3-Spalten-Pipe-Logik (`idx1`/`idx2`-indexOf-basiert) in `parsePipeMatches`

### Neu eingefuehrt
- `MatchHit` Interface (`passt_weil` + `achtung_bei` + bestehende Felder)
- `MatchResult` Tagged-Union (war Interface)
- `parsePipeMatches` als `export function` (war private Helper)
- `forceRanking?: boolean` + `previousAnliegen?: string` in `MatchInput`
- `MATCHER_SYSTEM` Form-A / Form-B-Block + 4 Negativbeispiele

### Externe Caller
- **Eingedeckt in dieser PR:** `app/api/match/route.ts` (Task 2), `scripts/eval-matcher.ts` (Rule-3-Shim).
- **Ausgenommen (Scope Plan 02-02/03):** `components/Wizard/MatchResultList.tsx` + `StartClient.tsx` konsumieren API-JSON, nicht den Matcher-Typ direkt — ihre lokale `MatchEntry`-Interface mit `begruendung` kompiliert weiterhin (TypeScript-seitig). Runtime ab jetzt `undefined` fuer `begruendung` — Plan 02-02 migriert das UI sofort danach. `scripts/smoke-llm-large.ts` nutzt eigene lokale `Match`-Interface (kein Bezug zu MatcherTypen) — bleibt unangetastet.

## Decisions Made

- **Feldname `costs` (entgegen D-08-Text in 02-CONTEXT.md):** Codebase-Konvention gewinnt. Pricing.ts und alle Phase-1-Komponenten nutzen `costs`. Verankert in 2 dispatch.test-Cases ('costs-Feldname'-describe-Block) plus expliziter JSDoc-Kommentar in MatchResult.
- **MATCHER_MAX_TOKENS 400 → 600:** 4 Spalten brauchen mehr Output-Puffer als 3 Spalten. CLARIFY-Variante kommt obendrauf. Kosteneffekt vernachlaessigbar (DeepSeek $0.28 / 1M Output-Tokens).
- **Pipe-Parser komplett umgestellt (indexOf → split):** alte Logik tolerierte Pipes in `begruendung` durch Zusammenfuehrung. Mit 4 Spalten und Pipe-Verbot im Inhalt ist split-basiert sauberer und enforced D-02 strikt.
- **Slot-Heuristik im Prompt explizit benannt:** „Bundesland / Zielgruppe / Thema" — DeepSeek braucht namentliche Anker, abstrakte Beschreibung ist zu fuzzy (Phase-1-Lehre).
- **Negativbeispiel mit FEHLENDER Trailing-Pipe:** Pitfall-1-Mitigation. Erfahrungsgemaess das LLM-haeufigste Format-Fehler.
- **scripts/eval-matcher.ts: Rule-3-Auto-Fix statt vollstaendige Migration:** Tagged-Union zwingt TypeScript-Narrowing. Minimal-Shim haelt Skript kompilierbar; Plan 02-03 ist Owner der vollstaendigen Eval-Erweiterung (Clarif-Metriken D-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] scripts/eval-matcher.ts MatchResult-Narrowing**
- **Found during:** Task 1 (TDD-GREEN, nach matcher.ts-Migration)
- **Issue:** scripts/eval-matcher.ts greift in Zeilen 362, 382, 396, 397 direkt auf `result.matches` / `result.totalCandidates` / `result.filteredOut` zu — diese Properties existieren nach Tagged-Union-Migration nur noch im `kind: "ranking"`-Branch. TypeScript-Compilation faellt aus (`error TS2339`).
- **Fix:** Minimal-Narrowing-Shim eingebaut (`result.kind === "ranking" ? result.matches : []` analog fuer totalCandidates/filteredOut). Plus `m.begruendung` → `m.passt_weil`. Ausfuehrlicher JSDoc-Kommentar verweist auf Plan 02-03 als Owner der vollstaendigen Eval-Erweiterung (Clarif-Metriken).
- **Files modified:** scripts/eval-matcher.ts (12 Zeilen +, 4 -)
- **Commit:** 559e16a (Task 1)
- **Begruendung:** Plan 02-01 darf nicht TS-broken hinterlassen. Vollstaendige Eval-Migration (D-15-Metriken) bleibt Plan 02-03 vorbehalten.

### Out-of-Scope Befunde

**1. 5 vorbestehende Test-Suite-Failures (alle ESM/Setup-Bugs)**
- **Suites:** `__tests__/components/Header.test.tsx`, `__tests__/components/Footer.test.tsx`, `__tests__/lib/ki-antrag-generator.test.ts`, `__tests__/lib/backend-utils.test.ts`, `app/api/contact/test.ts`
- **Verifikation:** `git stash` + `npm test` zeigt identische 28 failures vor und nach Plan-02-01-Aenderungen → Scope-Boundary, nicht durch diesen Plan verursacht.
- **Dokumentiert:** `.planning/phases/02-matcher-quality/deferred-items.md` mit Empfehlung „Phase 3+ Jest-Config-Cleanup".

## Issues Encountered

- **Worktree-Bootstrap-Issue (gleich wie Plan 02-00):** Plan-Dateien (`02-01-PLAN.md`, `02-CONTEXT.md`, `02-PATTERNS.md`, `02-DISCUSSION-LOG.md`) lagen nicht im Worktree-Branch (Reset auf 3623908 umfasste sie nicht). Loesung: aus Parent-Workspace `/home/kolja/edufunds-app/.planning/phases/02-matcher-quality/` kopiert (untracked, kein Code-Impact). Orchestrator committet Plan-Dateien beim Worktree-Merge selbst.

## User Setup Required

None — reine Backend-Code-Aenderung, keine externen Services beruehrt, keine DB-Migration noetig.

## Hand-off-Hinweise fuer naechste Plans

### Plan 02-02 (Frontend MatchResultList + ClarificationCard)
- **API-Response konsumiert:** `body.kind` ist jetzt `"ranking"` ODER `"clarification"`. Switch in StartClient.tsx noetig.
- **MatchEntry-Interface in MatchResultList.tsx** (lokal) muss `begruendung` raus, `passt_weil` + `achtung_bei` rein. Konsistent mit API-Response von Task 2.
- **forceRanking-State in StartClient.tsx:** beim zweiten /api/match-Aufruf nach Klaerungsfrage `forceRanking: true` mitsenden, plus `previousAnliegen` mit dem urspruenglichen Anliegen-Text.
- **lucide-react Icons:** `CheckCircle` (passt_weil-Block, gruen), `AlertTriangle` (achtung_bei-Block, orange), `HelpCircle` (ClarificationCard-Header). NICHT Heroicons.
- **Test-Skelett `__tests__/components/MatchResultList.test.tsx`** (12 it.todo) wartet auf Befuellung — Plan 02-00 hat es vorbereitet.
- **Achtung:** runtime-seitig liefert API ab jetzt `undefined` fuer `begruendung` (im alten MatchEntry-Feld). Plan 02-02 muss sofort danach mergen, sonst zeigt UI „undefined".

### Plan 02-03 (Korpus + Eval-Skript-Erweiterung + Baseline-Update)
- **MatchResult-Konsumption:** Tagged-Union ist jetzt da. eval-matcher.ts hat Rule-3-Shim — vollstaendige Migration auf D-15-Metriken (Clarif-Precision/Falsch-Pos/Recall, Slot-Coverage) ist Plan 02-03's Job.
- **EntryResult-Interface erweitern:** `clarifResult: "hit" | "miss" | "false_pos" | "not_applicable"` + `slotCoverage: number | null` neu — siehe 02-RESEARCH.md Abschnitt 5.
- **KorpusEntry-Interface erweitern:** `expected_clarification?: boolean` + `expected_missing_slots?: ('bundesland'|'zielgruppe'|'thema')[]` — D-13/D-14.
- **actual_top3.begruendung-Feld:** wird vom Shim aktuell mit `m.passt_weil` gefuellt. Plan 02-03 sollte das Interface auf `passt_weil` + `achtung_bei` umbauen (Snapshot-Format aendert sich → Pitfall 3 aus 02-RESEARCH.md beachten).
- **Snapshots-Shim:** alte Snapshots in `data/eval/snapshots/` haben `matches[].begruendung` und KEIN `kind`-Feld. Empfehlung: alte Snapshots verwerfen + Baseline neu run (Phase-2-BASELINE.md neu schreiben), oder loadReplayResult einen Compat-Shim einbauen.
- **Threshold-Gate:** D-16 (Recall@3 ≥ 0.42, Off-Target < 5%, Clarif-Precision ≥ 80%, Clarif-Falsch-Pos ≤ 10%) als `process.exit(1)` codieren.
- **Korpus-Erweiterung:** 5-7 neue Vague-Eintraege (Typ 1: Slot-fehlt-Kombo, Typ 2: Multi-Thema, Typ 3: Anti-Beispiele) — Kolja-Kuratierungs-Checkpoint laut Phase-2-Roadmap.

## Next Phase Readiness

- Plan 02-01 abgeschlossen, **Wave 2** (Plan 02-02 Frontend + Plan 02-03 Eval) kann parallel starten.
- Verify-Befehle:
  - `npm test -- --testPathPattern='wizard/matcher\\.(parser|dispatch)'` exit 0 (18 Tests gruen)
  - `npx tsc --noEmit` exit 0
  - `grep -c 'begruendung' lib/wizard/matcher.ts app/api/match/route.ts` == 0+0 (D-04 erfuellt)
  - `grep -c 'kind: \"ranking\"\\|kind: \"clarification\"' lib/wizard/matcher.ts` == 6 (3 ranking + 3 clarification)

## Self-Check

```
FOUND: lib/wizard/matcher.ts (354 Zeilen)
FOUND: app/api/match/route.ts (63 Zeilen)
FOUND: __tests__/lib/wizard/matcher.parser.test.ts (80 Zeilen, 8 it())
FOUND: __tests__/lib/wizard/matcher.dispatch.test.ts (170 Zeilen, 10 it())
FOUND: scripts/eval-matcher.ts (506 Zeilen, Rule-3-Shim eingebaut)
FOUND: .planning/phases/02-matcher-quality/deferred-items.md (23 Zeilen)
FOUND commit: 559e16a (feat(02-01): Tagged-Union MatchResult + 4-Spalten-Parser + CLARIFY-Dispatch)
FOUND commit: fb8c3fc (feat(02-01): API-Route dispatched Tagged-Union (kind: ranking|clarification))

Acceptance criteria Task 1:
  - export type MatchResult = ✓ (1)
  - kind: "clarification" ✓ (3)
  - kind: "ranking" ✓ (3)
  - export interface MatchHit ✓ (1)
  - passt_weil ✓ (12 — >= 5)
  - achtung_bei ✓ (13 — >= 5)
  - forceRanking ✓ (5 — >= 3)
  - previousAnliegen ✓ (4 — >= 2)
  - CLARIFY| ✓ (9 — >= 4)
  - Slot-Heuristik (mind. 2 von 3) ✓ (1)
  - export function parsePipeMatches ✓ (1)
  - parts.length !== 4 ✓ (1)
  - begruendung in matcher.ts ✓ (0 — D-04 hart entfernt)
  - MatchedProgramm in matcher.ts ✓ (0 — D-04 hart entfernt)
  - cost: CostLedger (Wortlaut) ✓ (0); costs: ✓ (2)
  - matcher.parser.test it.todo ✓ (0); it() ✓ (8 — >= 8)
  - matcher.dispatch.test it.todo ✓ (0); it() ✓ (10 — >= 10)
  - matcher.dispatch.test jest.mock auf llm ✓ (1)
  - npm test (matcher) ✓ (18 passed, 0 failed, exit 0)
  - npx tsc --noEmit ✓ (exit 0)

Acceptance criteria Task 2:
  - result.kind === "clarification" ✓ (1)
  - kind: "clarification" ✓ (1)
  - kind: "ranking" ✓ (1)
  - passt_weil: m.passt_weil ✓ (1)
  - achtung_bei: m.achtung_bei ✓ (1)
  - forceRanking ✓ (1)
  - previousAnliegen ✓ (1)
  - begruendung ✓ (0 — D-04 hart entfernt)
  - console.error ✓ (1, Error-Handler unveraendert)
  - Programm-Felder (foerdersummeText|bewerbungsfristText|kategorien) ✓ (3 — >= 2)
  - npx tsc --noEmit ✓ (exit 0)
  - npm test (5 vorbestehende Failures, identisch zu pre-Plan-Stand → Scope-Boundary)

Overall verify:
  - npm test --testPathPattern='wizard/matcher\\.(parser|dispatch)' = 2 suites passed, 18 passed, exit 0 ✓
  - npx tsc --noEmit exit 0 ✓
  - MatchedProgramm-Treffer im Repo (ausser .planning/): 0 ✓
  - matcher-bezogene begruendung-Treffer (ausser eval-matcher.ts EntryResult-Feld + smoke-llm-large.ts lokale Match-Interface): 0 in matcher.ts + route.ts ✓
```

## Self-Check: PASSED

---
*Phase: 02-matcher-quality*
*Plan: 01*
*Completed: 2026-05-04*
