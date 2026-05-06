---
phase: 02-matcher-quality
verified: 2026-05-04T11:00:00Z
status: gaps_found
score: 3/4 must-haves verified (2 of 4 D-16 Threshold-Gate targets failed; 1 manual UI checkpoint deferred)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "Eval-Skript misst messbare Verbesserung gegenüber Baseline (Top3-Trefferrate steigt, Off-Target-Rate sinkt) und ist bei jeder PR Pflicht-Vorabcheck (D-16/D-17 Threshold-Gate ist hartes Pflicht-Vorabcheck)"
    status: partial
    reason: "Eval-Skript MISST korrekt (alle 4 D-16-Werte werden ausgegeben, Threshold-Gate funktioniert via process.exit(1)) und ist mechanisch als PR-Gate nutzbar (D-17 erfüllt). ABER: 2 von 4 D-16-Targets sind im Live-Run vom 2026-05-04-08-07-48 nicht erfüllt — Recall@3=0.342 vs SOLL ≥0.42, Clarif-Precision=62.5% vs SOLL ≥80%. Off-Target-Rate=0.0% (PASS, übererfüllt) und Clarif-FalschPos=9.5% (PASS, knapp). D.h. der Apparat steht, aber der Inhaltsteil 'messbare Verbesserung gegen Baseline' ist nur teilweise erreicht: Recall +0.026 marginal verbessert, Off-Target von 10.5% auf 0% klar verbessert — aber das Recall-Target verfehlt."
    artifacts:
      - path: "data/eval/reports/2026-05-04-08-07-48.json"
        issue: "Live-Eval-Report dokumentiert Threshold-Gate FAIL: 2 von 4 Targets verfehlt (Recall@3=0.342, Clarif-Precision=62.5%)"
      - path: "scripts/eval-matcher.ts"
        issue: "Funktioniert korrekt, aber WR-04 (REVIEW): Threshold-Gate wertet null als Pass — Korpus-Drift könnte Targets stillschweigend maskieren"
    missing:
      - "Recall@3-Tuning erforderlich: 0.342 → ≥0.42 (D-16-Hauptzahl). Hypothesen aus BASELINE.md: Prefilter-Tuning, MATCHER_SYSTEM-Prompt-Verschärfung, oder Korpus-Kalibrierung (manche Phase-1-Gold-Standards möglicherweise zu eng definiert)"
      - "Clarif-Precision-Tuning: 5/8 hits — 3 erwartete Klärungen werden gemisst. Hypothesen: Slot-Heuristik im Prompt zu strikt (Trigger zu selten), oder Korpus-Annotation der 3 Misses prüfen"
      - "Phase 2.1 Gap-Closure-Plan-Auftrag (siehe 02-03-SUMMARY 'Next Phase Readiness')"

  - truth: "UI in app/antrag/start/ zeigt strukturierte Begründung im Trefferblock korrekt an (passt-weil-Block + achtung-bei-Block visuell getrennt) UND ClarificationCard rendert vollständig im Browser"
    status: partial
    reason: "Code- und Test-seitig vollständig verifiziert (12/12 UI-Tests grün, MatchResultList rendert grünen passt_weil-Block mit CheckCircle + orangen achtung_bei-Block mit AlertTriangle conditional, ClarificationCard rendert HelpCircle + Klärungsfrage als h2 + textarea mit aria-label + Praezisieren-Button + Override-Link). ABER: Browser-Smoke-Checkpoint (Plan 02-02 Task 3, gate=blocking) wurde per User-Entscheidung deferred — 4 manuelle UI-Pfade (Ranking, Clarification, Praezisieren-Pfad, Override-Pfad) auf localhost:3101/antrag/start sind NICHT durchgeklickt worden. Visuelle Befunde (Farben, Mobile, Layout, Live-Network-Tab-Inspektion) stehen damit aus. Plan-Spec sagt explizit: 'Live-Browser-Smoke alle 4 Pfade gruen' als success criterion."
    artifacts:
      - path: "components/Wizard/MatchResultList.tsx"
        issue: "Code korrekt — passt_weil/achtung_bei mit lucide-react Icons, Empty-State unverändert. Kein Browser-Test"
      - path: "components/Wizard/ClarificationCard.tsx"
        issue: "Code korrekt — HelpCircle, textarea aria-label, Praezisieren disabled-State. Kein Browser-Test"
      - path: "components/Wizard/StartClient.tsx"
        issue: "Tagged-Union-State + isSecondRound-Guard implementiert, aber WR-01/WR-02 (REVIEW) nicht behoben — silent dispatch fallback bei unbekanntem body.kind und sticky isSecondRound-Bug bei fehlgeschlagener zweiter Runde"
    missing:
      - "4 manuelle Browser-Smoke-Pfade auf localhost:3101/antrag/start durchklicken: (1) Ranking 'Schulgarten Berlin Grundschule' → 3 Cards mit grünem/orangem Block, (2) Clarification 'Wir wollen was im Bereich Bildung' → ClarificationCard, (3) Praezisieren-Submit → forceRanking-Call → Ranking-Cards, (4) Override-Link 'Trotzdem ranken' → forceRanking-Call ohne Praezisierung"
      - "Mobile-Smoke (375px DevTools): grüner/oranger Block stacken vertikal, ClarificationCard-Buttons nicht abgeschnitten"
      - "Network-Tab-Inspektion: POST /api/match Body enthält forceRanking:true und previousAnliegen bei zweitem Aufruf"

human_verification:
  - test: "Browser-Smoke Pfad 1 — Ranking-Branch (D-10)"
    expected: "Auf localhost:3101/antrag/start: Anliegen 'Schulgarten Berlin Grundschule' → Programme finden → 3 Treffer-Cards. Pro Card: Score-Badge (emerald/orange/grau), Programm-Name + foerdergeber, GRÜNER Block mit CheckCircle-Icon und 'Passt, weil: [Text]', conditional ORANGER Block mit AlertTriangle-Icon und 'Achtung: [Text]', dann Antrag-starten-Button. Beide farbigen Blöcke stehen VOR dem Antrag-Button."
    why_human: "Visuelle Verifikation der Tailwind-Farb-Klassen (grün/orange/blau) + Layout + Icon-Rendering ist programmatisch nicht prüfbar. Tests prüfen Existenz der DOM-Knoten, nicht das visuelle Resultat."
  - test: "Browser-Smoke Pfad 2 — Clarification-Branch (D-11)"
    expected: "Anliegen 'Wir wollen was im Bereich Bildung machen' → Programme finden → KEINE Trefferliste, sondern Card mit blauem HelpCircle-Icon, Klärungsfrage als h2, textarea mit Placeholder 'Praezisiere dein Anliegen hier...', Praezisieren-Button initial DISABLED, Override-Link 'Trotzdem mit aktueller Eingabe ranken' unten links."
    why_human: "Live-LLM-Trigger erforderlich (DeepSeek API-Call). Tests mocken den LLM-Call, validieren also nicht End-to-End. Plus visuelle Layout-Checks."
  - test: "Browser-Smoke Pfad 3 — Praezisierungs-Submit (D-09 + D-11)"
    expected: "Im Clarification-Modus: textarea fülen mit konkreterem Text, Praezisieren-Button klicken. Network-Tab: POST /api/match mit Body {forceRanking: true, previousAnliegen: '<original>', anliegen: '<praezisierung>'}. Anschließend Trefferliste oder isSecondRound-Hinweis-Banner."
    why_human: "Network-Tab-Inspektion + Live-LLM-Sequenz nicht automatisierbar."
  - test: "Browser-Smoke Pfad 4 — Override-Link (D-11)"
    expected: "Im Clarification-Modus ohne textarea-Eingabe: Klick auf 'Trotzdem mit aktueller Eingabe ranken'. Network-Tab: POST /api/match mit forceRanking:true ohne praezisierung. Trefferliste mit ggf. niedrigen Scores erscheint."
    why_human: "Live-API-Sequenz mit Override-Verhalten nicht ohne Browser testbar."
  - test: "Mobile-Smoke (375px DevTools-Viewport)"
    expected: "Sowohl die farbigen passt_weil/achtung_bei-Blöcke als auch die ClarificationCard stacken vertikal. Praezisieren-Button und Override-Link sind klickbar und nicht abgeschnitten."
    why_human: "Layout-Verhalten unter Viewport-Constraints kann nur visuell beurteilt werden."
---

# Phase 2: Matcher-Quality Verification Report

**Phase Goal (ROADMAP.md):** Matcher liefert strukturierte Begründungen statt 15-Wort-Pauschale und erkennt vage Anliegen mit Klärungsfrage statt blindem Ranking.

**Verified:** 2026-05-04T11:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth (Success Criterion aus ROADMAP.md)                                                                                                                                                | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Matcher-API-Response enthält pro Treffer ein strukturiertes `passt_weil` + `achtung_bei` (statt `begruendung`-String)                                                                   | ✓ VERIFIED | `app/api/match/route.ts:38-39` setzt `passt_weil: m.passt_weil, achtung_bei: m.achtung_bei` im Response. `lib/wizard/matcher.ts:40-67` definiert `MatchHit` mit beiden Feldern. `grep -c begruendung lib/wizard/matcher.ts app/api/match/route.ts == 0` (D-04 hart entfernt). Eval-Report `2026-05-04-08-07-48.json` zeigt `actual_top3[].passt_weil` + `.achtung_bei` |
| 2   | Bei vagem Anliegen gibt der Matcher eine Klärungsfrage zurück und unterdrückt das Ranking — Frontend rendert Klärungsfrage statt Trefferliste                                           | ✓ VERIFIED | `lib/wizard/matcher.ts:70-83` Tagged-Union mit `kind: "clarification"`. `lib/wizard/matcher.ts:322-324` dispatched bei `firstLine.startsWith("CLARIFY|")` und `!input.forceRanking`. `MATCHER_SYSTEM`-Prompt enthält Form-A/Form-B mit Slot-Heuristik (`mind. 2 von 3 Pflicht-Slots fehlen`, Zeile 179). Eval-Report bestätigt 5/8 Clarif-Hits + 90% Slot-Coverage     |
| 3   | Eval-Skript aus Phase 1 misst messbare Verbesserung gegenüber Baseline (Top3-Trefferrate steigt, Off-Target-Rate sinkt) und ist bei jeder PR Pflicht-Vorabcheck                         | ✗ FAILED   | Eval-Skript misst korrekt (4 D-16-Werte ausgegeben, Threshold-Gate via `process.exit(1)`). ABER 2/4 Targets verfehlt: **Recall@3=0.342 < 0.42 SOLL** (+0.026 marginal vs Phase-1-Baseline 0.316), **Clarif-Precision=62.5% < 80% SOLL** (3 Misses). Off-Target und Clarif-FalschPos PASS. „Messbare Verbesserung" nur partiell — Recall-Target nicht erreicht          |
| 4   | UI in `app/antrag/start/` zeigt strukturierte Begründung im Trefferblock korrekt an (passt-weil-Block + achtung-bei-Block visuell getrennt)                                             | ? UNCERTAIN | Code-Tests: 12/12 UI-Tests grün, MatchResultList rendert grünen + orangen Block mit lucide-react Icons + Labels. ABER **Browser-Smoke-Checkpoint deferred** per User-Entscheidung — 4 manuelle UI-Pfade auf localhost:3101 nicht durchgeklickt. Visuelle Verifikation steht aus                                                                                       |

**Score:** 2/4 fully verified, 1/4 partial (eval mechanism funktioniert aber Tuning-Targets verfehlt), 1/4 uncertain (Code grün, Browser nicht getestet)

### Required Artifacts

| Artifact                                          | Expected                                                                                                                                            | Status     | Details                                                                                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/wizard/matcher.ts`                           | Tagged-Union, MatchHit (passt_weil/achtung_bei), parsePipeMatches 4-Spalten, runMatch CLARIFY-Dispatch, MATCHER_SYSTEM mit Form-A/B + Slot-Heuristik | ✓ VERIFIED | 354 Zeilen. Tagged-Union (Zeile 70-83), MatchHit (40-54), parsePipeMatches (264-289 mit `parts.length !== 4`-Soft-Failure), runMatch-Dispatch (322-324), MATCHER_SYSTEM mit `mind. 2 von 3` Slot-Heuristik (179) + Negativbeispielen |
| `app/api/match/route.ts`                          | Tagged-Union-Dispatch, passt_weil/achtung_bei in Response, forceRanking + previousAnliegen durchgereicht                                            | ✓ VERIFIED | 63 Zeilen. `if (result.kind === "clarification")` (24), `kind: "ranking"` Response-Body (33), Programm-Felder unverändert durchgereicht (40-50). `grep begruendung == 0`                                                          |
| `components/Wizard/MatchResultList.tsx`           | passt_weil-Block (CheckCircle, grün) + achtung_bei-Block (AlertTriangle, orange, conditional)                                                       | ✓ VERIFIED | 135 Zeilen. lucide-react Imports (4: CheckCircle, AlertTriangle), grüner Block (97-103), oranger Block conditional (104-112). `Passt, weil:`-Label + `Achtung:`-Label vorhanden                                                  |
| `components/Wizard/ClarificationCard.tsx`        | Standalone-Komponente: HelpCircle + h2-Frage + textarea mit aria-label + Praezisieren-Button + Override-Link                                       | ✓ VERIFIED | 61 Zeilen. HelpCircle-Icon (30), h2-Frage (31), textarea mit aria-label `Anliegen praezisieren` (34), Praezisieren disabled-State (51), Override-Button `Trotzdem mit aktueller Eingabe ranken` (47)                              |
| `components/Wizard/StartClient.tsx`               | Tagged-Union-State, JSX-Dispatch, isSecondRound-Guard, Praezisierungs+Override-Handler                                                              | ⚠️ PARTIAL | Vollständig implementiert (matchState, isSecondRound, handlePraezisierung, handleForceRanking) — aber 2 REVIEW-Warnings nicht behoben: WR-01 silent dispatch fallback bei unbekanntem body.kind, WR-02 sticky isSecondRound-Bug    |
| `scripts/eval-matcher.ts`                         | Phase-2-Schema, Clarif-Metriken, Threshold-Gate via process.exit(1), Snapshot-Shim                                                                  | ✓ VERIFIED | 816 Zeilen (von 506 erweitert). 22 Vorkommen `clarifPrecision/clarifFalschPosRate/slotCoverageMean`. 5× `process.exit(0/1)`. 4× `GATE PASSED/GATE FAILED`. Gate-Definition (788-794) mit allen 4 D-16-Targets                       |
| `data/eval/matcher-korpus.json`                   | 27-29 Einträge, 8+ mit `expected_clarification=true`, 2+ Anti-Beispiele                                                                              | ✓ VERIFIED | `jq length == 29`, 8 mit `expected_clarification=true`, 2 Anti-Beispiele (vag + expected_clarification=false)                                                                                                                     |
| `data/eval/BASELINE.md`                           | Phase-2-Eintrag oben, alle 4 D-16-Zahlen, Phase-1 unverändert darunter                                                                              | ✓ VERIFIED | Header `## 2026-05-04 — Phase-2-Baseline (Korpus v2, n=29)`. Threshold-Gate-Tabelle mit allen 4 Werten + Phase-1-Vergleich. Phase-1-Block darunter unverändert (`## 2026-05-03 — Phase-1-Baseline`)                              |
| `data/eval/reports/2026-05-04-08-07-48.json/.md` | Live-Eval-Report mit clarifPrecision/clarifFalschPosRate/perEntry mit passt_weil                                                                    | ✓ VERIFIED | Beide Files existieren (36801 / 582 Bytes). `jq .aggregate` liefert `clarifPrecision: 0.625`, `clarifFalschPosRate: 0.095`, `recallAtThreeMean: 0.342`, `slotCoverageMean: 0.9`. perEntry zeigt passt_weil + achtung_bei            |

### Key Link Verification

| From                                | To                                                  | Via                                                                                                          | Status   | Details                                                                                                                                                |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/wizard/matcher.ts`             | `lib/wizard/llm.ts` (generateText)                  | `import { MODEL_FLASH, generateText }` + Aufruf in runMatch                                                  | ✓ WIRED  | Import bestätigt, runMatch ruft `await generateText(MODEL_FLASH, MATCHER_SYSTEM, buildUserPrompt(...))`                                                |
| `app/api/match/route.ts`            | `lib/wizard/matcher.ts` (runMatch + MatchInput)     | `import { runMatch, type MatchInput }` + `result.kind === "clarification"`-Dispatch                          | ✓ WIRED  | Import + Tagged-Union-Dispatch in route.ts:24                                                                                                          |
| `components/Wizard/StartClient.tsx` | `components/Wizard/MatchResultList.tsx + ClarificationCard.tsx` | `switch on matchState.kind` in JSX (Zeile 147-157)                                                            | ✓ WIRED  | Beide Komponenten importiert + JSX-Switch dispatched korrekt                                                                                           |
| `components/Wizard/StartClient.tsx` | `/api/match` POST                                   | `fetch("/api/match", { method: "POST", body: JSON.stringify(values) })` mit forceRanking + previousAnliegen | ✓ WIRED  | Fetch-Call (56-60), `body.kind`-Dispatch (69), forceRanking-Übergabe in handlePraezisierung+handleForceRanking (107, 118)                              |
| `components/Wizard/MatchResultList.tsx` | `lucide-react`                                  | `import { AlertTriangle, ArrowRight, CheckCircle, ExternalLink, Star }`                                      | ✓ WIRED  | Alphabetisch sortiert importiert (4)                                                                                                                   |
| `components/Wizard/ClarificationCard.tsx` | `lucide-react`                                | `import { ArrowRight, HelpCircle }`                                                                          | ✓ WIRED  | Importiert (4)                                                                                                                                         |
| `scripts/eval-matcher.ts`           | `lib/wizard/matcher.ts` (MatchResult Tagged Union)  | `result.kind === "ranking" / "clarification"`-Narrowing                                                      | ✓ WIRED  | Phase-2-Migration vollständig: dispatched korrekt + befüllt clarifResult/slotCoverage                                                                  |
| `data/eval/BASELINE.md`             | `data/eval/reports/2026-05-04-08-07-48.json`        | Pfad-Referenz im Reports-Block                                                                                | ✓ WIRED  | BASELINE.md Zeile 39-40 verweist auf JSON + MD-Twin                                                                                                    |

### Data-Flow Trace (Level 4)

| Artifact                                           | Data Variable                              | Source                                                                  | Produces Real Data | Status     |
| -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- | ------------------ | ---------- |
| `MatchResultList.tsx` (matches[].passt_weil etc.)  | `matches: MatchEntry[]` Prop               | StartClient `matchState.matches` ← API-Response `body.matches` ← runMatch | Yes                | ✓ FLOWING  |
| `ClarificationCard.tsx` (question)                 | `question: string` Prop                    | StartClient `matchState.question` ← API-Response `body.question` ← runMatch | Yes                | ✓ FLOWING  |
| `app/api/match/route.ts` Response                  | `result: MatchResult`                      | `runMatch()` ← `generateText(MODEL_FLASH, ...)` ← DeepSeek-API           | Yes                | ✓ FLOWING  |
| `data/eval/reports/.json`                          | `aggregate.clarifPrecision/etc.`           | `aggregate(results)` ← runMatch-Loop über 29 Korpus-Einträge             | Yes                | ✓ FLOWING  |

Alle Daten-Pfade enden in echten Live-LLM-Calls (DeepSeek). Eval-Report enthält 29 perEntry-Snapshots mit echten passt_weil/achtung_bei-Strings.

### Behavioral Spot-Checks

| Behavior                                                                         | Command                                                                              | Result                                              | Status |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- | ------ |
| Matcher- + UI-Tests grün                                                          | `npm test -- --testPathPattern='wizard/matcher.(parser\|dispatch)\|components/MatchResultList'` | 30/30 passed (3 suites)                             | ✓ PASS |
| TypeScript kompiliert                                                            | `npx tsc --noEmit`                                                                   | exit 0, keine Errors                                | ✓ PASS |
| Korpus hat 29 Einträge                                                           | `jq 'length' data/eval/matcher-korpus.json`                                          | 29                                                  | ✓ PASS |
| 8 Einträge mit expected_clarification=true                                        | `jq '[.[]\|select(.expected_clarification==true)]\|length' …`                       | 8                                                   | ✓ PASS |
| 2 Anti-Beispiele (vag + expected_clarification=false)                             | `jq '[.[]\|select(.category=="vag" and .expected_clarification==false)]\|length' …` | 2                                                   | ✓ PASS |
| Eval-Report enthält die 4 D-16-Metriken                                          | `jq '.aggregate.clarifPrecision, .clarifFalschPosRate, .recallAtThreeMean, .offTargetRate' …` | 0.625, 0.0952, 0.342, 0                           | ✓ PASS |
| begruendung-Feld hart entfernt aus Production-Code                                | `grep -c begruendung lib/wizard/matcher.ts app/api/match/route.ts components/Wizard/*.tsx` | alle 0                                              | ✓ PASS |
| Threshold-Gate funktioniert (würde exit 1 bei FAIL)                              | Live-Eval-Run dokumentiert `[GATE FAILED] 2 Target(s) nicht erfuellt` (2026-05-04 abend)  | exit 1 (Gate-FAIL korrekt detektiert)              | ✓ PASS (Mechanik) / ✗ FAIL (Inhalt) |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                                       | Status     | Evidence                                                                                                                                                                                                                              |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MATCH-02    | 02-00, 02-01, 02-02, 02-03 | Matcher liefert strukturierte Begründung pro Treffer (passt-weil + Achtung-bei) statt 15-Wort-Pauschale                       | ✓ SATISFIED | Tagged-Union + MatchHit + Frontend-Rendering vollständig implementiert. Alle 30 Tests grün. Eval-Report bestätigt strukturierte Outputs in 29 perEntry-Snapshots. ABER: visuelle UI-Verifikation deferred (siehe SC#4)                |
| MATCH-03    | 02-00, 02-01, 02-02, 02-03 | Matcher erkennt vages Anliegen und stellt Klärungsfrage, bevor er rankt                                                          | ⚠️ PARTIAL  | Mechanik vollständig implementiert (CLARIFY-Dispatch in runMatch + ClarificationCard + isSecondRound-Guard). ABER: Clarif-Precision 62.5% verfehlt SOLL ≥80% — 3 von 8 erwarteten Klärungen werden nicht getriggert. Tuning erforderlich |

Keine ORPHANED Requirements: REQUIREMENTS.md mappt MATCH-02 und MATCH-03 ausschließlich auf Phase 2, beide in allen 4 Plans deklariert.

### Anti-Patterns Found

Aus `02-REVIEW.md` (gsd-code-reviewer, 2026-05-04T10:30): 0 Critical, 5 Warnings, 7 Info. Hier nur die für die Goal-Verifikation relevanten Warnings:

| File                                | Line     | Pattern                                                       | Severity      | Impact                                                                                                                                                                       |
| ----------------------------------- | -------- | ------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/Wizard/StartClient.tsx` | 67-84    | WR-01: Silent dispatch fallback bei unbekanntem `body.kind`   | ⚠️ Warning    | Backend-Bugs (vergessenes kind-Feld) verschleiert sich als „keine Treffer" — User sieht leere Liste statt Fehler. Goal-relevant: SC#2 + SC#4 brüchig bei API-Drift           |
| `components/Wizard/StartClient.tsx` | 78-83    | WR-02: `isSecondRound`-Sticky-Bug bei fehlgeschlagener zweiter Runde | ⚠️ Warning | User sieht „Anliegen vage geblieben" obwohl er gerade neues Anliegen eingab — UX-Bug. Goal-relevant: SC#2 (Multi-Round-Guard funktioniert teilweise falsch)                  |
| `scripts/eval-matcher.ts`           | 577-580  | WR-03: Eval-Snapshot dokumentiert forceRanking/previousAnliegen nicht | ⚠️ Warning | Audit-Drift, kein akutes Problem. Goal-relevant: SC#3 Replay-Reproduzierbarkeit eingeschränkt für künftige forceRanking-Korpus-Einträge                                       |
| `scripts/eval-matcher.ts`           | 787-794  | WR-04: Threshold-Gate-Logik wertet `null` als Pass            | ⚠️ Warning    | Korpus-Drift (versehentliches Löschen aller expected_clarification=true Einträge) würde Gate stillschweigend passen lassen. Goal-relevant: SC#3 Pflicht-Vorabcheck-Robustheit |
| `lib/wizard/matcher.ts`             | 174, 280, 333 | WR-05: Score-Filter-Drift (`< 50` in runMatch, nicht in parsePipeMatches; kein `> 100`-Cap) | ⚠️ Warning | Pathologische LLM-Outputs (score=999) rutschen durch. Aktuell harmlos, aber Robustness-Loch                                                                                  |

7 Info-Findings (siehe 02-REVIEW.md): `as any`-Casts, doppelte Programm-Whitelist in route.ts vs MatchResultList, Magic-Numbers ohne Tests, ungenutzte Imports im Eval-Skript, inkonsistentes clarifQuestion-Field, Magic-Number im Prompt, fehlende Type-Validation für previousAnliegen/forceRanking in route.ts. Alle nicht goal-blockierend.

### Human Verification Required

5 Items — siehe `human_verification:` in YAML-Frontmatter. Zusammenfassung:

1. **Browser-Smoke Pfad 1 (Ranking)** — visuelle Prüfung der grünen passt_weil + orangen achtung_bei Blöcke
2. **Browser-Smoke Pfad 2 (Clarification)** — Live-LLM-Trigger + ClarificationCard-Layout
3. **Browser-Smoke Pfad 3 (Praezisierung)** — Network-Tab-Inspektion forceRanking-Body
4. **Browser-Smoke Pfad 4 (Override-Link)** — Override ohne Praezisierung
5. **Mobile-Smoke 375px** — Layout-Stacking

### Gaps Summary

**Phase 2 ist in zwei Aspekten nicht vollständig zielerreicht:**

**Gap 1 — Threshold-Gate FAIL (Inhalt, nicht Mechanik):** Der Eval-Apparat steht und funktioniert (SC#3 Pflicht-Vorabcheck via process.exit(1) wirkt mechanisch korrekt — das ist hervorragend gelöst). Aber zwei der vier inhaltlichen D-16-Targets sind im Live-Run vom 2026-05-04 verfehlt:
- **Recall@3 = 0.342** (SOLL ≥ 0.42) — nur marginal über Phase-1-Baseline (0.316), Tuning-Lücke
- **Clarif-Precision = 62.5%** (SOLL ≥ 80%) — 3 von 8 erwarteten Klärungen werden gemisst

Off-Target-Rate (0% vs <5% SOLL, übererfüllt) und Clarif-FalschPos (9.5% vs ≤10% SOLL, knapp PASS) sind in Ordnung. Das Phase-1-Hauptziel „Off-Target eliminieren" ist von 10.5% auf 0% klar erreicht — also gibt es echte Verbesserung, nur nicht auf der Recall-Achse.

Der Plan 02-03 hat das ehrlich als Sub-Step B („Initial-Phase-2-Lauf, Tuning-Bedarf") dokumentiert und Phase 2.1 als Gap-Closure-Auftrag angelegt.

**Gap 2 — Browser-Smoke deferred (nicht durchgeführt):** Plan 02-02 Task 3 war explizit als `gate=blocking` Checkpoint definiert mit 4 manuellen UI-Pfaden. Per User-Entscheidung wurde der Browser-Smoke offline-deferred. Damit ist SC#4 („UI zeigt strukturierte Begründung im Trefferblock korrekt an") nur Code- und Test-seitig verifiziert (12/12 UI-Tests grün), aber visuell nicht abgenommen. Ohne Browser-Test sind reale Befunde wie Farb-Drift, Mobile-Layout-Probleme, Network-Tab-Verhalten oder Live-LLM-Edge-Cases (z.B. Klärungsfrage mit besonders langem Text) nicht ausgeschlossen.

**Empfehlung — zwei separate Folge-Aktionen:**
- **Phase 2.1 Gap-Closure-Plan** (bereits angekündigt in 02-03-SUMMARY): Recall-Tuning + Clarif-Precision-Tuning. Nicht im Scope dieser Verifikation, aber Voraussetzung für vollständigen Phase-2-Abschluss.
- **Manuelle Browser-Smoke** durch Kolja vor Phase-2-Abschluss: 4 UI-Pfade auf localhost:3101/antrag/start (Anweisungen in 02-02-SUMMARY und in `human_verification:`-Block oben). Nach Smoke entweder VERIFICATION.md-Override eintragen ODER Phase 2.1 um UI-Bugs erweitern.

**Code-Review-Findings (5 Warnings, 0 Critical) sind nicht goal-blockierend** — sie sind Robustness-Lücken, die in einem späteren Tech-Debt-Sweep oder als Teil von Phase 2.1 mit-adressiert werden können. Insbesondere WR-02 (sticky isSecondRound-Bug) könnte bei manuellem Browser-Smoke als sichtbarer UX-Bug auffallen — frühe Auffindbarkeit dort spricht für Browser-Smoke vor Phase 2.1.

---

_Verified: 2026-05-04T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
