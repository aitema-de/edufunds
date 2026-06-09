---
phase: 05-wizard-pipeline-tuning-ux-l-cke
plan: "03"
subsystem: lib/wizard
tags: [phase-5, wave-1, geber-classification, feature-flags, tdd]
dependency_graph:
  requires: [05-01]
  provides: [lib/wizard/geber-classification.ts, lib/wizard/config.ts]
  affects: [scripts/eval-pipeline.ts (Wave 2), lib/wizard/pipeline.ts (Wave 3)]
tech_stack:
  added: []
  patterns: [TDD RED/GREEN, Record-Mapping mit Object.freeze, Env-Var-Read am Modul-Load]
key_files:
  created:
    - lib/wizard/geber-classification.ts
    - lib/wizard/config.ts
  modified:
    - __tests__/eval/geber-classification.test.ts
    - __tests__/lib/wizard/config.test.ts
decisions:
  - "klimalab-2026 → stiftung (foerderprogramme.json foerdergeberTyp='stiftung' recherchiert)"
  - "Alle 4 Feature-Flag-Defaults bleiben OFF (Threat T-05-03-01, Eval-Delta-Messung Wave 3)"
metrics:
  duration_seconds: 420
  completed_date: "2026-05-20"
  tasks_completed: 2
  files_changed: 4
---

# Phase 5 Plan 03: Geber-Classification + Pipeline-Config Summary

**One-liner:** Programm-ID-zu-Cluster-Mapping (11 Dossiers, 5 strategische Geber-Gruppen) + 4 Env-Var-gesteuerte Feature-Flag-Toggles für Wave-3-Hebel-A/B-Eval, alle Defaults OFF.

## Module-Snapshot

### lib/wizard/geber-classification.ts (101 LOC)

| Export | Beschreibung |
|--------|-------------|
| `type GeberGruppe` | Union: "oeffentlich" \| "stiftung" \| "eu" \| "wirtschaftspreis" \| "verband-uni" |
| `getGeberGruppe(programmId)` | Gibt Cluster zurück, "unknown" + console.warn bei fehlendem Mapping |
| `ALL_GEBER_GRUPPEN` | Frozen readonly Array aller 5 Cluster-Namen (für Eval-Aggregation D-12) |
| `listMapping()` | Gibt gesamtes Mapping zurück (für Tests + Wave-3-Hebel-4) |

### lib/wizard/config.ts (72 LOC)

| Export | Beschreibung |
|--------|-------------|
| `parseEnvBool(value)` | "true"/"1"/"TRUE" → true; "false"/"0"/""/undefined → false |
| `PIPELINE_CONFIG` | Frozen Object mit 4 Flags (alle default false) |
| `type PipelineConfig` | Typed alias für PIPELINE_CONFIG |

## 11-Dossier-Mapping (D-28)

| Programm-ID | Cluster | Begründung |
|-------------|---------|------------|
| bmbf-digitalpakt-2 | oeffentlich | foerdergeberTyp=bund |
| berlin-startchancen | oeffentlich | foerdergeberTyp=land |
| ensam-bmz | oeffentlich | BMZ = Bundesförderung (trotz globalem Lernen-Fokus) |
| aktion-mensch-schulkooperation | stiftung | foerdergeberTyp=stiftung |
| klimalab-2026 | stiftung | foerdergeberTyp=stiftung (recherchiert in foerderprogramme.json) |
| erasmus-schule-2026 | eu | foerdergeberTyp=eu |
| erasmus-schulentwicklung | eu | foerdergeberTyp=eu |
| bosch-schulpreis | wirtschaftspreis | nominal verband, praktisch Wirtschaftspreis-Logik |
| ferry-porsche-challenge-2025 | wirtschaftspreis | foerdergeberTyp=wirtschaftspreis |
| ferry-porsche-challenge | wirtschaftspreis | Legacy-Version, identischer Cluster |
| kultur-macht-stark | verband-uni | foerdergeberTyp=verband |

## 4 Feature-Flag-Defaults bestätigt OFF

| Env-Var | Flag-Name | Default | Hebel (D-20) |
|---------|-----------|---------|--------------|
| PIPELINE_USE_VORBILD_FORMULIERUNGEN | useVorbildFormulierungen | false | Hebel 3: Dossier-Daten stärker nutzen |
| PIPELINE_COMPLIANCE_STAGE | complianceStageEnabled | false | Hebel 2: neue Compliance-Check-Stage |
| PIPELINE_SHARP_PROMPTS | sharpPrompts | false | Hebel 1: System-Prompts schärfen |
| PIPELINE_GEBER_ROUTING_V2 | geberRoutingV2 | false | Hebel 4: Geber-Typ-Routing ausbauen |

Threat T-05-03-01 (Default-Drift) ist durch Test "Default-PIPELINE_CONFIG ohne Env-Vars: alle 4 Flags = false" strukturell enforced.

## Tests

| Datei | Tests | Status |
|-------|-------|--------|
| `__tests__/eval/geber-classification.test.ts` | 8 (von it.todo umgestellt) | PASS |
| `__tests__/lib/wizard/config.test.ts` | 9 (von it.todo umgestellt) | PASS |
| **Gesamt** | **17** | **17/17 grün** |

## TDD Gate Compliance

- RED geber-classification: `ba192d8` (test: failing tests, Modul fehlt → exit 1)
- GREEN geber-classification: `9f5c6ce` (feat: Implementierung → 8 Tests grün)
- RED config: `40a97bb` (test: failing tests, Modul fehlt → exit 1)
- GREEN config: `0d81306` (feat: Implementierung → 9 Tests grün)

Alle vier Gates vorhanden und in korrekter Reihenfolge.

## Commits

| Hash | Typ | Beschreibung |
|------|-----|-------------|
| ba192d8 | test | TDD RED: geber-classification Tests (8 Stück) |
| 9f5c6ce | feat | geber-classification Modul + 11-Dossier-Mapping (D-28/-29) |
| 40a97bb | test | TDD RED: config Feature-Flag Tests (9 Stück) |
| 0d81306 | feat | pipeline-config Feature-Flags (4 Hebel-Toggles, D-22) |

## Deviations from Plan

None - Plan wurde exakt wie geschrieben ausgeführt.

## Nächste Schritte

- **Wave 2 (Plan 05-04):** `scripts/eval-pipeline.ts` importiert `getGeberGruppe()` für Per-Geber-Gruppe-Aggregation (D-12)
- **Wave 3 (Plans 05-05..05-07):** `lib/wizard/pipeline.ts` importiert `PIPELINE_CONFIG` für 4 Hebel-Toggles (D-20/-22)

## Self-Check: PASSED

- lib/wizard/geber-classification.ts: FOUND
- lib/wizard/config.ts: FOUND
- Commit ba192d8: FOUND
- Commit 9f5c6ce: FOUND
- Commit 40a97bb: FOUND
- Commit 0d81306: FOUND
- 17/17 Tests: PASS
