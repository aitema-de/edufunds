---
phase: 02
slug: matcher-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD     | 02-NN | N | MATCH-02 / -03 | — | — | unit / integration / eval | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Filled by gsd-planner from RESEARCH.md Validation Architecture section.

- [ ] `tests/wizard/matcher.parser.test.ts` — Pipe-Format-Parser-Edge-Cases (4 Spalten / weniger / mehr / leeres `achtung_bei`)
- [ ] `tests/wizard/matcher.dispatch.test.ts` — Tagged-Union-Dispatch (CLARIFY|... vs id|score|... als erste Zeile)
- [ ] `tests/wizard/match-result-list.test.tsx` — UI-Smoke (kind=ranking + kind=clarification rendering)
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

**Approval:** pending
