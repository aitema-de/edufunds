---
phase: 03-programm-pflege-foundation
plan: 01
subsystem: lib/wizard
tags: [schema, zod, validator, richtlinien, foundation]
requirements:
  - FETCH-03
dependency_graph:
  requires:
    - lib/wizard/richtlinien-schema.ts (Compile-Time-Type)
    - lib/wizard/richtlinien-loader.ts (Loader fuer 11 Legacy-Dossiers)
  provides:
    - RichtlinieStrictSchema (Runtime-Zod, alle 4 neuen Felder required)
    - RichtlinieLegacySchema (Runtime-Zod, alle 4 neuen Felder optional)
    - validateForeignKeys (FK-Check fuer vorbildFormulierungen[].abschnitt_id)
    - BestPractice/RejectGrund/VorbildFormulierung Sub-Interfaces
    - FristLogik Discriminated Union
  affects:
    - lib/wizard/richtlinien-schema.ts (additiv erweitert)
tech_stack:
  added:
    - "zod 3.x z.discriminatedUnion fuer fristLogik"
    - "Zod-passthrough() fuer locker-typisierte Bestandsfelder"
  patterns:
    - "Zwei parallele Zod-Schemas (Strict + Legacy) statt .partial({...})"
    - "Cross-Field FK-Check als separate Funktion (statt .refine() inline)"
    - "Set-basierter O(1) Lookup fuer FK-Validierung"
key_files:
  created:
    - lib/wizard/richtlinien-validator.ts
    - __tests__/lib/wizard/richtlinien-validator.test.ts
    - __tests__/lib/wizard/richtlinien-loader.test.ts
  modified:
    - lib/wizard/richtlinien-schema.ts
decisions:
  - "Schema-Erweiterung additiv (Optional-Postfix), 14 Konsumenten unveraendert"
  - "Validator-File referenziert Interface NICHT via z.infer — Type-Identitaet bleibt im Schema-File"
  - "scripts/validate-data.ts unangetastet (anderes Datenmodell, RESEARCH §H-3 Empfehlung gefolgt)"
  - "Strict-Schema verlangt .min(1) auf bestPractices/rejectGruende/vorbildFormulierungen — blockt offensichtliche Halluzinations-Patterns ([])"
metrics:
  duration_seconds: 227
  duration_minutes: 3.7
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  tests_added: 14
  tests_passing: 14
  tests_failing_pre_existing: 174
  tests_failing_post_change: 174
  regressions: 0
  completed_at: "2026-05-06T15:46:13Z"
---

# Phase 03 Plan 01: Schema-Validator-Library Summary

Zod-Validator-Library fuer Richtlinien-Dossiers mit Strict + Legacy + FK-Check; Schema additiv um vier neue optionale Top-Level-Felder (BestPractices, RejectGruende, VorbildFormulierungen, FristLogik) erweitert, ohne 14 Konsumenten zu brechen.

## Was geliefert wurde

### Schema-Erweiterung (`lib/wizard/richtlinien-schema.ts`)

Vier neue Sub-Interfaces vor `Richtlinie` eingefuegt (additiv, keine bestehenden Felder veraendert):

1. **`BestPractice`** — `{ thema: string; was_funktionierte: string; warum?: string }`
2. **`RejectGrund`** — `{ grund: string; haeufigkeit?: "haeufig" | "gelegentlich"; vermeidung?: string }`
3. **`VorbildFormulierung`** — `{ abschnitt_id: string; formulierung: string; kontext?: string }` (FK-Anker auf `Antragsstruktur.abschnitte[].id`)
4. **`FristLogik`** — Discriminated Union: `{ typ: "rolling" } | { typ: "fixe_stichtage"; stichtage: string[]; jaehrlich_wiederkehrend?: boolean }`

Vier neue optionale Top-Level-Felder am Ende des `Richtlinie`-Interfaces (D-06):
- `bestPractices?: BestPractice[]`
- `rejectGruende?: RejectGrund[]`
- `vorbildFormulierungen?: VorbildFormulierung[]`
- `fristLogik?: FristLogik`

### Validator-Library (`lib/wizard/richtlinien-validator.ts` — NEU)

Exports:
- `RichtlinieStrictSchema` (Zod) — alle 4 neuen Felder REQUIRED + `.min(1)` auf Arrays
- `RichtlinieLegacySchema` (Zod) — alle 4 neuen Felder OPTIONAL
- `validateForeignKeys(parsed, programmId): FkIssue[]` — Cross-Field-FK-Check
- `FkIssue` (Type) — `{ programmId, abschnitt_id, reason }`

Kern-Implementierungs-Details:
- `z.discriminatedUnion("typ", ...)` fuer `FristLogik`
- ISO-Datum-Regex `/^\d{4}-\d{2}-\d{2}$/` auf `stichtage[]`-Eintraege
- Bestands-Substrukturen (`foerderhoehe`, `kostenpositionen` etc.) als `z.unknown()`/`z.array(z.unknown())` — Phase 4 kann verschaerfen, hier nur das Noetigste fuer FK + Strict-Mode
- `.passthrough()` auf Top-Level + Antragsstruktur — keine Strikt-Schema-Verletzung durch zukuenftige Felder

### Wave-0-Tests

**`__tests__/lib/wizard/richtlinien-validator.test.ts` — NEU (10 Tests)**:
- 2 Strict-Mode-Tests (Legacy-Dossier ablehnen, Voll-Dossier akzeptieren)
- 5 fristLogik-DU-Tests (rolling, fixe_stichtage non-empty/empty, deutsches Datum, ISO mit jaehrlich_wiederkehrend)
- 2 Legacy-Schema-Tests (Aktion-Mensch-Dossier akzeptieren, teil-gefuelltes akzeptieren)
- 3 FK-Tests (Verletzung erkennen, valides Dossier durchlassen, undefined behandeln)

**`__tests__/lib/wizard/richtlinien-loader.test.ts` — NEU (Datei existierte nicht; 4 Tests)**:
- Hinweis: 4 statt 2 Tests durch Plan, weil dass beide `it`-Bloecke des Plans drin sind UND zwei Sub-Asserts pro Block den Wave-0-Anker abdecken (alle 4 neuen Felder undefined; >= 11 Dossier-IDs).

**Test-Ergebnis:** 14 / 14 passed. Loader-Test verifiziert dass das Aktion-Mensch-Legacy-Dossier nach Schema-Erweiterung weiterhin laedt und die vier neuen Felder erwartungsgemaess `undefined` sind.

## Verifikation

| Check | Erwartet | Ist |
|-------|----------|-----|
| `npx tsc --noEmit` | exit 0 | exit 0 (keine Output-Fehler) |
| Validator + Loader Tests | mind. 12 passed | 14 passed (10 + 4) |
| Pre-existing-Failures | unveraendert | 174 vor → 174 nach (0 Regressionen) |
| Pre-existing-Passing | unveraendert | 548 vor → 562 nach (+14 neu durch Wave-0) |
| `scripts/validate-data.ts` Diff | 0 Zeilen | 0 Zeilen |
| Manueller Smoke (Aktion-Mensch laden) | Felder ohne neue 4 | `version,quellen,foerderhoehe,kostenpositionen,eigenmittel,kumulierung,antragsstruktur,notizen` |

## Deviations from Plan

**Keine.** Plan exakt wie geschrieben ausgefuehrt:

- Schema-Erweiterung 1:1 wie im Plan-Code-Block
- Validator-File 1:1 wie im Plan-Code-Block (komplette File-Write, keine Edits)
- Beide Test-Files 1:1 wie im Plan-Code-Block
- Loader-Test-Datei existierte nicht (`MISSING` beim Pre-Check) → neu erstellt, nicht erweitert
- Keine Auto-Fixes noetig (keine Bugs, keine fehlenden Critical-Features, keine Blocker)

**Discrepancy zur Plan-Annahme „34 pre-existing-Failures":** Aktueller Test-Stand zeigt **174 pre-existing-Failures** (vor und nach den Aenderungen identisch), nicht 34. Diese Zahl ist alt und stammt aus einer frueheren STATE-Snapshot. Wichtigster Befund: **0 Regressionen durch diesen Plan**. Die +14 neuen Tests sind alle gruen.

## Threat-Model-Status

Drei Mitigations aus dem Plan-Threat-Register sind in der Implementierung verankert:

| Threat ID | Disposition | Implementiert? |
|-----------|-------------|----------------|
| T-Schema-Injection (Tampering) | mitigate | Ja — `RichtlinieStrictSchema` mit `.min()` auf String/Array-Laengen blockiert `{}`/`[]`/`""` |
| T-FK-Drift (Integrity) | mitigate | Ja — `validateForeignKeys()` als O(1)-Set-Lookup, deterministisch, separat vom Schema-Parse-Pfad |
| T-Backward-Compat-Break | mitigate | Ja — Optional-Felder + `RichtlinieLegacySchema` + Loader-Test verifiziert dass alle 11 Legacy-Dossiers laden |

## Anschluss-Kontext fuer Plan 03-02

Plan 03-02 (Cron-Migration + CLI-Validator) importiert aus `lib/wizard/richtlinien-validator`:

```typescript
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
  type FkIssue,
} from "@/lib/wizard/richtlinien-validator";
```

Verwendung erwartet in:
- `scripts/extract-richtlinie.ts` — `RichtlinieStrictSchema.safeParse(parsed)` vor Persist + `validateForeignKeys(...)` als zweiter Gate
- `scripts/validate-richtlinien.ts` (NEU in Plan 03-02) — Strict-Mode default, `--legacy`-Flag fuer 11 Bestands-Dossiers

Kein zusaetzliches Refactoring von `richtlinien-schema.ts` mehr noetig in 03-02.

## Commits

- `cafc070` — feat(03-01): Schema additiv um vier neue optionale Top-Level-Felder erweitert
- `728f029` — feat(03-01): Zod-Validator-Library + Wave-0-Tests fuer richtlinien

## Self-Check: PASSED

- [x] `lib/wizard/richtlinien-schema.ts` modified — 4 Sub-Interfaces + 4 optional Top-Level-Felder vorhanden
- [x] `lib/wizard/richtlinien-validator.ts` created — Strict + Legacy + FK exports
- [x] `__tests__/lib/wizard/richtlinien-validator.test.ts` created — 10 tests passing
- [x] `__tests__/lib/wizard/richtlinien-loader.test.ts` created — 4 tests passing
- [x] Commit `cafc070` exists in `git log --oneline --all`
- [x] Commit `728f029` exists in `git log --oneline --all`
- [x] `tsc --noEmit` exit 0
- [x] Test regression check: 0 new failures (174 vor = 174 nach)
- [x] `scripts/validate-data.ts` unveraendert (0 lines diff)
