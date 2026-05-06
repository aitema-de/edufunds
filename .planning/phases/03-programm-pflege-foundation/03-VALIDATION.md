---
phase: 3
slug: programm-pflege-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest `^29.7.0` + ts-jest `^29.4.9` (config in `jest.config.js`, `next/jest`-async-Wrapper) |
| **Config file** | `/home/kolja/edufunds-app/jest.config.js` |
| **Quick run command** | `npm test -- --testPathPattern=richtlinien-validator` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5-10s quick, ~30-60s full |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npm test -- --testPathPattern=richtlinien-validator` (~5-10s)
- **After every plan wave:** Run `npm test` (full suite, ~30-60s — Delta gegen 34 pre-existing-Failures aus Memory tracken, KEINE neuen Regressions)
- **Before `/gsd-verify-work`:** Full suite green delta + Workflow-Dispatch-Runs (D-09 #1+#2) + lokaler Smoke (D-09 #3) + Validator-CLI gegen Legacy (D-09 #4)
- **Max feedback latency:** 60 Sekunden

---

## Per-Task Verification Map

> Wird vom gsd-planner während Plan-Erstellung gefüllt — eine Zeile pro Task. Quelle: 03-RESEARCH.md §Phase Requirements → Test Map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/wizard/richtlinien-validator.test.ts` — Unit-Tests für Zod-Schema (strict + legacy + Discriminated-Union-Edge-Cases) + FK-Check für `vorbildFormulierungen[].abschnitt_id`
- [ ] `__tests__/scripts/extract-richtlinie.test.ts` — Mock `generateJson`, prüft dass Skript `MODEL_PIPELINE` und erweiterten SYSTEM-Prompt verwendet (Mock-Spy + statisches grep)
- [ ] `__tests__/scripts/scan-new-programs.test.ts` — analog für `MODEL_INTERVIEW`
- [ ] `__tests__/lib/wizard/richtlinien-loader.test.ts` — falls noch nicht existiert: bestehender Loader bricht nicht durch optionale Felder (Smoke mit allen 11 Dossier-Fixtures aus `data/richtlinien/`)

> Hinweis: Falls einer dieser Test-Dateien-Pfade durch Phase-02-Wave-0-Pattern-Konflikt schon angefasst wurde (Memory „Workflow-Bug GSD execute-phase Step 5.5 Resurrected-Files-Schutz"), Cherry-Pick-Pattern verwenden statt direktem Add.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-Flight-Check schlägt fehl ohne `DEEPSEEK_API_KEY` | FETCH-01 | GitHub-Workflow-Verhalten erfordert Secret-Manipulation auf Repo-Ebene | Workflow-Dispatch-Run mit Secret entfernt; Pre-Check-Step muss exit-1 |
| Workflow `weekly-dossier-extraction.yml` läuft erfolgreich gegen 1 Test-Programm-ID | FETCH-01 | GitHub-Actions-UI-Klick (D-09 #1) | UI workflow_dispatch mit `program_id` aus Vorauswahl-Liste; PR muss korrekt erstellt werden |
| Workflow `weekly-program-scan.yml` läuft erfolgreich ohne Argumente | FETCH-01 | GitHub-Actions-UI-Klick (D-09 #2) | UI workflow_dispatch ohne Args; Default-Sources; Lauf grün; leeres Ergebnis OK |
| Lokaler Smoke `--next` produziert Dossier mit allen 4 neuen Feldern | FETCH-03 | benötigt Live-LLM-Call gegen DeepSeek (D-09 #3) | `LLM_PROVIDER=deepseek npx tsx scripts/extract-richtlinie.ts --next` + anschließend `npx tsx scripts/validate-richtlinien.ts <output>` strict grün |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 neue Test-Dateien)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
