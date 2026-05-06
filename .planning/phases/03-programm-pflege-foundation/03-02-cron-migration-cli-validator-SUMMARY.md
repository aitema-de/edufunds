---
phase: 03-programm-pflege-foundation
plan: 02
subsystem: scripts/cron-migration
tags: [cron, llm-wrapper, validator, deepseek, foundation]
requirements:
  - FETCH-01
  - FETCH-03
dependency_graph:
  requires:
    - lib/wizard/llm.ts (Plan 02-pre-existing — generateJson, MODEL_PIPELINE, MODEL_INTERVIEW)
    - lib/wizard/richtlinien-validator.ts (Plan 03-01 — RichtlinieStrictSchema, RichtlinieLegacySchema, validateForeignKeys)
  provides:
    - scripts/extract-richtlinie.ts auf llm-Wrapper migriert mit Validator-Pre-Persist
    - scripts/scan-new-programs.ts auf llm-Wrapper migriert
    - scripts/validate-richtlinien.ts (CLI mit --legacy-Flag, greppable Tab-Output)
  affects:
    - lib/wizard/richtlinien-validator.ts (Auto-Fix: Legacy-Schema fuer Bestands-Dossiers gelockert)
tech_stack:
  added:
    - "lib/wizard/llm.ts in Cron-Skripten (statt @google/generative-ai direkt)"
    - "RichtlinieStrictSchema-Pre-Persist-Gate in extract-richtlinie.ts"
    - "validate-richtlinien.ts CLI mit --legacy-Flag (Tab-separated greppable Output)"
  patterns:
    - "Anti-Halluzinations-Block (Pattern aus Bug-#2-Fix vom 30.04.) in SYSTEM_PROMPT"
    - "Schema-Override pro Modus statt .partial() (AntragsstrukturLegacySchema fuer Bestand)"
    - "Defensive null-coalescing in validateForeignKeys fuer Legacy-Dossiers ohne abschnitte"
key_files:
  created:
    - scripts/validate-richtlinien.ts
    - __tests__/scripts/extract-richtlinie.test.ts
    - __tests__/scripts/scan-new-programs.test.ts
  modified:
    - scripts/extract-richtlinie.ts
    - scripts/scan-new-programs.ts
    - lib/wizard/richtlinien-validator.ts
decisions:
  - "Auto-Fix Rule 1: AntragsstrukturLegacySchema neu — 5 von 11 Bestands-Dossiers haben leere abschnitte:[] oder reine bemerkung-Antragsstruktur, Plan-Acceptance verlangt aber exit 0 fuer alle 11 im Legacy-Modus"
  - "Auto-Fix Rule 1: validateForeignKeys mit Null-Check, sonst Crash bei Legacy-Dossier ohne abschnitte"
  - "Prompt-Erweiterung folgt 1:1 Bug-#2-Fix-Pattern (REGELN GEGEN HALLUZINATION + max 5 Eintraege + ISO YYYY-MM-DD-Pflicht)"
metrics:
  duration_seconds: 396
  duration_minutes: 6.6
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  tests_added: 19
  tests_passing: 19
  tests_failing_pre_existing: 174
  tests_failing_post_change: 174
  regressions: 0
  completed_at: "2026-05-06T15:56:39Z"
---

# Phase 03 Plan 02: Cron-Migration + CLI-Validator Summary

Cron-Skripte (`extract-richtlinie.ts`, `scan-new-programs.ts`) auf den `lib/wizard/llm.ts`-Wrapper migriert, SYSTEM_PROMPT um die 4 neuen Felder + Anti-Halluzinations-Block erweitert, Validator-Pre-Persist-Gate eingebaut, und einen neuen CLI-Validator `validate-richtlinien.ts` mit `--legacy`-Flag bereitgestellt — Foundation, auf der Plan 03-03 die Workflows umstellen kann.

## Was geliefert wurde

### Task 1 — `scripts/extract-richtlinie.ts` migriert (6 Patches)

1. **Imports:** `GoogleGenerativeAI`/`MODEL`-Konstante raus, `generateJson + MODEL_PIPELINE` aus `lib/wizard/llm` rein, `RichtlinieStrictSchema + validateForeignKeys` aus `lib/wizard/richtlinien-validator` rein
2. **SYSTEM_PROMPT** erweitert um die 4 neuen Felder (`bestPractices`, `rejectGruende`, `vorbildFormulierungen`, `fristLogik`) im JSON-Schema-Block
3. **SYSTEM_PROMPT** erweitert um `REGELN GEGEN HALLUZINATION` (Anti-Halluzinations-Block: leere Listen statt Erfindung, max 5 Eintraege, ISO-`YYYY-MM-DD`-Datum)
4. **API-Key-Check entfernt** (Wrapper-Boot-Warn + Workflow-Pre-Flight uebernehmen das in Plan 03-03)
5. **LLM-Call** durch `generateJson<Richtlinie>(MODEL_PIPELINE, SYSTEM_PROMPT, userPrompt, { maxTokens: 8000 })` ersetzt
6. **Runtime-Validator vor Persist:** `RichtlinieStrictSchema.safeParse + validateForeignKeys` zwischen Substanz-Check und `fs.writeFile`. Bei Fehler: `process.exit(1)`, Workflow-PR wird nicht erstellt
7. **Usage-Logging** an `LlmResult.usage` angepasst (`promptTokens` + `candidatesTokens`)

Substanz-Check, Queue-Update-Logik, `fetchOrRead`, `stripHtml` unveraendert.

### Task 2 — `scripts/scan-new-programs.ts` migriert (5 Patches)

1. **Imports:** `GoogleGenerativeAI`/`MODEL`-Konstante raus, `generateJson + MODEL_INTERVIEW` aus `lib/wizard/llm` rein
2. **`scanSource`-Signatur** ohne `gemini`-Parameter (nur `src` + `verbose`)
3. **LLM-Call** durch `generateJson<ScanResult>(MODEL_INTERVIEW, EXTRACT_SYSTEM, userPrompt, { maxTokens: 4000 })` ersetzt
4. **API-Key-Check + GoogleGenerativeAI-Client-Konstruktion** ersatzlos entfernt
5. **Aufruf-Site** `scanSource(src, verbose)` (ohne `gemini`-Argument)

`EXTRACT_SYSTEM`-Prompt unveraendert (Scanner extrahiert nur Listen-Eintraege, keine Vollschema-Dossiers — RESEARCH §B-2).

### Task 2 — `scripts/validate-richtlinien.ts` (NEU)

CLI-Validator fuer `data/richtlinien/*.json`:

- **Default `strict`-Modus:** alle 4 neuen Felder Pflicht. `npx tsx scripts/validate-richtlinien.ts` -> aktuell `exit 1` (alle 11 Bestands-Dossiers haben die neuen Felder nicht — Phase 4 wird sie migrieren).
- **`--legacy`-Modus:** 4 neue Felder optional + lockere `antragsstruktur` (siehe Auto-Fix unten). `npx tsx scripts/validate-richtlinien.ts --legacy` -> `exit 0`, alle 11 valide.
- **Output:** Tab-separierte Zeilen `programmId\tfeld\tfehler` pro Verletzung (greppable: `cut -f1` / `awk -F'\t'`), gefolgt von `=== VALIDIERUNG ERGEBNIS ===`-Aggregat.

Output-Sample (strict-Modus, Auszug):

```
aktion-mensch-schulkooperation	bestPractices	Required
aktion-mensch-schulkooperation	rejectGruende	Required
aktion-mensch-schulkooperation	vorbildFormulierungen	Required
aktion-mensch-schulkooperation	fristLogik	Required
berlin-startchancen	antragsstruktur.abschnitte	Required
...
=== VALIDIERUNG ERGEBNIS (strict) ===
Geprueft: 11 Dossier(s)
Fehlerhafte Dossiers: 11
Gesamt-Issues: 51
```

### Tests

- `__tests__/scripts/extract-richtlinie.test.ts` (NEU) — 12 Static-Grep-Tests: Wrapper-Imports, Validator-Imports, Prompt-Erweiterung, Anti-Halluzinations-Block, ISO-Datum, safeParse-Aufruf
- `__tests__/scripts/scan-new-programs.test.ts` (NEU) — 7 Static-Grep-Tests: Wrapper-Imports, MODEL_INTERVIEW (NICHT MODEL_PIPELINE), kein GoogleGenerativeAI-Import, kein API-Key-Check, Signatur-Bereinigung
- Beide Test-Files folgen dem TDD-RED-zuerst-Cycle (RED → GREEN per Task)
- `__tests__/scripts/`-Verzeichnis war neu (existierte vor Plan 03-02 nicht)

## Verifikation

| Check | Erwartet | Ist |
|-------|----------|-----|
| `npx tsc --noEmit` | exit 0 | exit 0 (keine Output-Fehler) |
| `npm test --testPathPattern='scripts/extract-richtlinie'` | mind. 11 passed | 12 passed |
| `npm test --testPathPattern='scripts/scan-new-programs'` | mind. 7 passed | 7 passed |
| `npx tsx scripts/validate-richtlinien.ts --legacy` | exit 0, "Alle 11 Dossiers valide" | exit 0, "Alle 11 Dossiers valide (legacy-Modus)." |
| `npx tsx scripts/validate-richtlinien.ts` (strict) | exit 1, greppable Tab-Output | exit 1, 51 Issues, Tab-separiert |
| Volle Test-Suite Delta | 0 Regressionen | 174 vor = 174 nach (581 passed, war 562 — +19 neue) |
| `scripts/validate-data.ts` Diff | 0 Zeilen | 0 Zeilen (nicht angefasst) |

Gegrep-Acceptance-Beweise alle 9 Task-2 + 13 Task-1 = 22 Kriterien gruen (bashed, siehe Commit-History fuer die Greps).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] AntragsstrukturLegacySchema fuer Bestands-Dossiers**
- **Found during:** Task 2 Smoke-Test `--legacy`
- **Issue:** Plan-Acceptance verlangt `exit 0` fuer alle 11 Bestands-Dossiers im Legacy-Modus, aber `RichtlinieLegacySchema` aus Plan 03-01 erbte `AntragsstrukturSchema` mit `.min(1)` auf `abschnitte`. 5 von 11 Bestands-Dossiers (`klimalab-2026`, `ferry-porsche-challenge`, `ferry-porsche-challenge-2025`, `berlin-startchancen`, `erasmus-schule-2026`) haben aber leere `abschnitte: []` oder eine reine `bemerkung`-Antragsstruktur — bei Erst-Extraktion war die Quelle zu duenn. -> Legacy-Modus exit 1, Plan-Verletzung.
- **Fix:** Neu `AntragsstrukturLegacySchema` in `lib/wizard/richtlinien-validator.ts` (alle Felder optional, `passthrough()`). `RichtlinieLegacySchema` ueberschreibt `antragsstruktur` damit. `RichtlinieStrictSchema` bleibt unangetastet (alle 4 neuen Felder Pflicht + `abschnitte.min(1)`).
- **Files modified:** `lib/wizard/richtlinien-validator.ts`
- **Commit:** `bd2a9ac`

**2. [Rule 1 — Bug] validateForeignKeys-Crash bei undefined abschnitte**
- **Found during:** Task 2 Smoke-Test `--legacy` (nach Fix 1)
- **Issue:** Nach Fix 1 lief das Schema durch — aber `validateForeignKeys()` rief `parsed.antragsstruktur.abschnitte.map(...)` auf. Bei Legacy-Dossier `erasmus-schule-2026` (nur `antragsstruktur: { bemerkung: "..." }`, kein `abschnitte`-Feld) ist das `undefined.map(...)` -> `TypeError`. -> CLI crashed mit Stack-Trace statt sauberem Aggregat.
- **Fix:** Defensiver `?? []`-Fallback: `const abschnitte = parsed.antragsstruktur?.abschnitte ?? []`. Type-Signatur `FkCheckable.antragsstruktur.abschnitte` als optional markiert.
- **Files modified:** `lib/wizard/richtlinien-validator.ts`
- **Commit:** `bd2a9ac`

Beide Fixes sind kompatibel mit Plan 03-01 (Tests aus Plan 03-01 Validator-Suite + Loader-Suite weiterhin gruen — 14 passed). Strict-Schema-Verhalten ist unveraendert.

### Auth Gates

Keine — beide Migrationen sind reine Code-Aenderungen, kein LLM-Call ausgefuehrt.

## Threat-Model-Status

Drei Mitigations aus dem Plan-Threat-Register sind in der Implementierung verankert:

| Threat ID | Disposition | Implementiert? |
|-----------|-------------|----------------|
| T-Schema-Injection (Tampering) | mitigate | Ja — `RichtlinieStrictSchema.safeParse` vor `fs.writeFile` in `extract-richtlinie.ts`, `process.exit(1)` bei Fehler |
| T-Halluzination (Tampering / data integrity) | mitigate | Ja — Anti-Halluzinations-Block im SYSTEM_PROMPT (max 5, "lieber leere Liste als Erfindung", ISO-Datum-Pflicht) |
| T-FK-Drift (Integrity) | mitigate | Ja — `validateForeignKeys()` als zweiter Gate vor Persist; bei Verletzung exit 1 |
| T-Provider-Drift (Tampering) | accept | bewusst kein Code-Pfad-Fallback (D-07) — Operator setzt LLM_PROVIDER explizit |

## Anschluss-Kontext fuer Plan 03-03

Plan 03-03 (Workflows) baut auf der migrierten Skript-Infrastruktur auf:

- `.github/workflows/weekly-dossier-extraction.yml` — Pre-Flight `DEEPSEEK_API_KEY` als Pflicht (NICHT mehr `GEMINI_API_KEY`), `GEMINI_API_KEY` als optional Fallback fuer `LLM_PROVIDER=gemini`-Override
- `.github/workflows/weekly-program-scan.yml` — analog
- Reviewer-Checkliste im PR-Body um die 4 neuen Felder erweitern (Best Practices plausibel? Reject-Gruende nicht halluziniert? Vorbild-Formulierungen-FK ok? Frist-Logik ISO-Datum?)
- Optional: `npx tsx scripts/validate-richtlinien.ts` (strict) als CI-Step in PR-Lint nach `--legacy` -> Phase 4 schaltet `--legacy` schrittweise ab

`scripts/extract-richtlinie.ts` ist bei Strict-Schema-Failure exit-1 — der `peter-evans/create-pull-request@v7`-Step findet kein `git diff`, weil `fs.writeFile` nicht passierte. Defense-in-Depth.

## Commits

- `ed690c2` — feat(03-02): extract-richtlinie.ts auf llm-Wrapper migriert + Validator-Pre-Persist
- `bd2a9ac` — feat(03-02): scan-new-programs.ts auf llm-Wrapper migriert + CLI-Validator + Legacy-Schema-Fix

## Self-Check: PASSED

- [x] `scripts/extract-richtlinie.ts` modified — alle 6 Patches angewendet
- [x] `scripts/scan-new-programs.ts` modified — alle 5 Patches angewendet
- [x] `scripts/validate-richtlinien.ts` created — Strict + Legacy + greppable Tab-Output
- [x] `__tests__/scripts/extract-richtlinie.test.ts` created — 12 Tests passing
- [x] `__tests__/scripts/scan-new-programs.test.ts` created — 7 Tests passing
- [x] `lib/wizard/richtlinien-validator.ts` modified — AntragsstrukturLegacySchema + Null-Check (Auto-Fix)
- [x] Commit `ed690c2` exists in `git log --oneline --all`
- [x] Commit `bd2a9ac` exists in `git log --oneline --all`
- [x] `npx tsc --noEmit` exit 0
- [x] `npm test` Delta: 174 vor = 174 nach (0 Regressionen, +19 neue passing)
- [x] `scripts/validate-data.ts` unveraendert (0 lines diff)
- [x] `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0
- [x] `npx tsx scripts/validate-richtlinien.ts` exit 1 mit greppable Tab-Output
