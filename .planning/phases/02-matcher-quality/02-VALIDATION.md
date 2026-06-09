---
phase: 02
slug: matcher-quality
status: ready
nyquist_compliant: true
wave_0_complete: false  # Plan 02-00 covers
created: 2026-05-03
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Filled by gsd-planner during planning phase. Stub created by orchestrator from RESEARCH.md Validation Architecture section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (Unit-Tests) + tsx scripts (Smoke + Eval) |
| **Config file** | `jest.config.cjs` (root) |
| **Quick run command** | `npm test -- --testPathPattern='wizard/(matcher\|facts-extractor\|title-fallback)'` |
| **Full suite command** | `npm test && npm run eval:matcher -- --replay <last-snapshot>` |
| **Estimated runtime** | ~30 sec (Unit-Tests) + ~60 sec (Eval-Replay) |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}` for the modified module
- **After every plan wave:** Run `{full suite command}` (Unit + Eval-Replay)
- **Before `/gsd:verify-work`:** Full suite green AND `npm run eval:matcher` (live) meets D-16 thresholds
- **Max feedback latency:** ~90 sec (Unit + Eval-Replay)

---

## Per-Task Verification Map

> Filled by gsd-planner. Each task in PLAN.md must map to a verifiable test or be flagged as Wave-0-pending or manual.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-00-T1 | 02-00 | 0 | MATCH-02 | — | Skelett-Sentinel | unit (skeleton) | `npm test -- --testPathPattern='wizard/matcher\.parser' --listTests` | NO — dieser Task erstellt sie | ⬜ pending |
| 02-00-T2 | 02-00 | 0 | MATCH-03 | — | Skelett-Sentinel | unit (skeleton) | `npm test -- --testPathPattern='wizard/matcher\.dispatch' --listTests` | NO — dieser Task erstellt sie | ⬜ pending |
| 02-00-T3 | 02-00 | 0 | MATCH-02 / -03 | — | Skelett-Sentinel | unit (skeleton, jsdom) | `npm test -- --testPathPattern='components/MatchResultList' --listTests` | NO — dieser Task erstellt sie | ⬜ pending |
| 02-01-T1 | 02-01 | 1 | MATCH-02 / -03 | T-02-01-04, -05, -06 | Soft-Failure-Parser, validIds-Filter, CLARIFY-First-Line-only | unit | `npm test -- --testPathPattern='wizard/matcher\.(parser\|dispatch)'` | YES (nach Plan 02-00) | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | MATCH-02 / -03 | T-02-01-01, -02 | Tagged-Union-Dispatch in API | tsc + grep | `npx tsc --noEmit` | YES | ⬜ pending |
| 02-02-T1 | 02-02 | 2 | MATCH-02 / -03 | T-02-02-06 | Text-Render-Only fuer LLM-Output (kein dangerouslySetInnerHTML) | tsc + grep | `npx tsc --noEmit` | YES | ⬜ pending |
| 02-02-T2 | 02-02 | 2 | MATCH-02 / -03 | T-02-02-02 | ClarificationCard + MatchResultList Rendering (kind=ranking/clarification) — isSecondRound-Loop-Guard wird via Browser-Smoke 02-02-T3 verifiziert | unit (jsdom) + manual smoke for guard | `npm test -- --testPathPattern='components/MatchResultList\|wizard/matcher'` (Unit-Coverage), Browser-Smoke 02-02-T3 (Guard-Pfad) | YES (nach Plan 02-00) | ⬜ pending |
| 02-02-T3 | 02-02 | 2 | MATCH-02 / -03 | — | UI-Smoke alle 4 Pfade | manual (browser) | http://localhost:3101/antrag/start | n/a (manual) | ⬜ pending |
| 02-03-T1 | 02-03 | 2 | MATCH-02 / -03 | T-02-03-04, -06 | Korpus-ID-Validation, Snapshot-Shim | tsc + replay-smoke | `npx tsc --noEmit && npm run eval:matcher -- --replay <latest>` | YES | ⬜ pending |
| 02-03-T2 | 02-03 | 2 | MATCH-03 | — | Hybrid-Curation (Claude entwirft, Kolja kuratiert) | manual checkpoint | jq-Validation in checkpoint instructions | n/a (manual) | ⬜ pending |
| 02-03-T3 | 02-03 | 2 | MATCH-02 / -03 | T-02-03-01, -03 | D-16 Threshold-Gate (process.exit 1 bei fail), keine API-Keys in Reports | eval (live) | `npm run eval:matcher` | YES | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Filled by gsd-planner from RESEARCH.md Validation Architecture section.

- [ ] `__tests__/lib/wizard/matcher.parser.test.ts` — Pipe-Format-Parser-Edge-Cases (4 Spalten / weniger / mehr / leeres `achtung_bei`)
- [ ] `__tests__/lib/wizard/matcher.dispatch.test.ts` — Tagged-Union-Dispatch (CLARIFY|... vs id|score|... als erste Zeile)
- [ ] `__tests__/components/MatchResultList.test.tsx` — UI-Smoke (kind=ranking + kind=clarification rendering)
- [ ] `data/eval/matcher-korpus.json` Schema-Erweiterung mit `expected_clarification` + `expected_missing_slots`

*If none: "Existing infrastructure covers all phase requirements." — N/A für Phase 2 (neue Tests nötig).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-LLM-CLARIFY-Trigger-Konsistenz über mehrere Runs | MATCH-03 | LLM-Output ist nicht-deterministisch — automatisierter Test wäre flaky | `npm run eval:matcher` 3x hintereinander → Clarification-Precision zwischen Runs darf ±5 Prozentpunkte schwanken, sonst Prompt-Tuning nötig |
| Visuelle Inspektion `passt_weil`/`achtung_bei`-Card auf Mobile (375px) und Desktop (1280px) | MATCH-02 | Visual regression — kein Snapshot-Tool im Repo | Browser-DevTools: `/antrag/start` → Anliegen eingeben → Trefferliste prüfen, beide Blöcke sichtbar, achtung_bei-Block fehlt wenn LLM Empty-String liefert |
| Override-Link „Trotzdem ranken" funktioniert nach Clarification-Block | MATCH-03 | UX-Flow E2E im Browser nötig | `/antrag/start` mit vagem Anliegen → Klärungsfrage erscheint → Klick auf Override-Link → Top-3-Ranking erscheint mit `forceRanking: true` im POST-Body |

---

## Eval-Gate-Thresholds (D-16)

Phase 2 ist nur dann verifiziert, wenn `npm run eval:matcher` (Live-Run) ALLE 4 Schwellen erfüllt:

| Metrik | Schwelle | Quelle |
|--------|----------|--------|
| Recall@3 (Mittelwert über Non-Edge + Non-Vague) | ≥ 0.42 | D-16 |
| Off-Target-Rate | < 5 % | D-16 |
| Clarification-Precision | ≥ 80 % | D-16 |
| Clarification-Recall (Falsch-Positiv) | ≤ 10 % | D-16 |

PR-Gate (D-17): `npm run eval:matcher` MUSS in PRs durchlaufen, die `lib/wizard/matcher.ts` ODER `data/eval/matcher-korpus.json` ODER `scripts/eval-matcher.ts` modifizieren.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter
- [ ] Eval-Gate-Thresholds aus D-16 in `scripts/eval-matcher.ts` als Exit-Code-Gate codiert

**Approval:** ready (planner pass complete, awaiting executor)
