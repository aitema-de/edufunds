---
phase: 5
slug: wizard-pipeline-tuning-ux-l-cke
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existierend, `__tests__/`-Struktur) |
| **Config file** | `jest.config.{ts,js}` (Repo-Root, prüfen) |
| **Quick run command** | `npx jest __tests__/eval/ --bail` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30s (Eval-Unit-Tests mit LLM-Stubs); ~60-75 min (Full-Live-Baseline, separat) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest __tests__/eval/ --bail` (Quick Eval-Tests)
- **After every plan wave:** Run `npx jest` (Full Suite)
- **Before `/gsd-verify-work`:** Full suite green + 1× `npx tsx scripts/eval-pipeline.ts --replay` grün (Baseline-Replay)
- **Max feedback latency:** 30s (unit) / 60s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {wird vom Planner ausgefüllt} | | | | | | | | | |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Hinweis:** Planner befüllt diese Tabelle aus den `<automated>`-Blöcken jedes Tasks beim PLAN.md-Erzeugen. Wave 0 muss Test-Skelette für `eval-pipeline.ts`, `geber-classification.ts`, `finanzplan-validator-wrapper.ts` enthalten (CONTEXT.md D-32).

---

## Wave 0 Requirements

- [ ] `__tests__/eval/eval-pipeline-scoring.test.ts` — Unit-Tests für FK-Match (WIZ-01), Marker-Regex (WIZ-02), Rubric-Aggregation (WIZ-03)
- [ ] `__tests__/eval/eval-pipeline-snapshot.test.ts` — Snapshot/Replay-Determinismus (replay produziert identische Scores)
- [ ] `__tests__/eval/geber-classification.test.ts` — Mapping 11 Dossiers → 4-5 strategische Cluster
- [ ] `__tests__/eval/finanzplan-sub-metric.test.ts` — Validator-Pass-Rate + Autofix-Erfolg-Quote
- [ ] `__tests__/eval/determinism.test.ts` — N=3-Variabilität, stddev-Plausibilität
- [ ] `__tests__/eval/marker-false-positive.test.ts` — Cross-Check User-Antwort enthält Marker → kein FP
- [ ] `__tests__/eval/fixtures/llm-stubs.ts` — Deterministische LLM-Stubs für Snapshot-Tests
- [ ] Pre-Flight: `npx tsx scripts/check-dossier-coverage.ts` — Daten-Survey (Befund A5 aus RESEARCH.md: maxZeichen + vorbildFormulierungen-Coverage)

*Begründung: 36 CONTEXT-Decisions + 6 Pitfalls aus RESEARCH.md erzwingen explizite Stubs, da LLM-Calls in CI nicht laufen können (`--replay`-Default).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-Closure-Live-Smoke (1× Live-Pipeline-Run mit nicht-Korpus-Anliegen) | WIZ-01/-02/-03 Anti-Overfitting | Live-LLM-Call mit frischem Test-Input; visueller Check auf UI-Side-Effects | `npx tsx scripts/eval-pipeline.ts --live --single <fresh-entry>` + manuelle Sichtung Output (D-36) |
| Marker-Liste-Kuration (Kolja-Review von ~176 Markern für 22 Einträge) | WIZ-02 Layer 1 | Kuratorische Qualität nicht automatisierbar, Claude generiert Entwürfe (D-14) | Wave 1 Checkpoint nach Marker-Generierung: Kolja-Review pro Eintrag |
| Korpus-Lock | Eval-Reproducibility | Inhaltliche Eignung der 20-25 Einträge | Wave 1 Checkpoint nach Korpus-Generierung: Kolja-Approval |
| BASELINE.md-Eintrag-Begründung bei Korpus-Updates | D-26 | Semantische Plausibilität („Korpus erweitert um X") | PR-Review |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Pre-Flight Daten-Survey + 7 Test-Files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
