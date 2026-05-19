---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: "02"
subsystem: scripts
tags: [migration, dossier, llm, cli, targeted-fill, strict-validator]
dependency_graph:
  requires:
    - lib/wizard/llm.ts (generateJson + MODEL_PIPELINE)
    - lib/wizard/richtlinien-validator.ts (RichtlinieStrictSchema + validateForeignKeys)
    - lib/wizard/richtlinien-schema.ts (Richtlinie type)
    - data/richtlinien/<id>.json (Bestands-Dossiers)
  provides:
    - scripts/migrate-legacy-dossier.ts (CLI Targeted-Fill-Migration fuer 1 Dossier)
    - scripts/validate-single-dossier.ts (Helper-CLI Strict-Validierung fuer 1 Dossier)
  affects:
    - Plan 04-03 (konsumiert beide Skripte fuer Sample-First + Vollmigration)
tech_stack:
  added: []
  patterns:
    - Targeted-Fill-Prompt mit Bestands-Dossier als Anti-Halluzinations-Kontext
    - Pick<Richtlinie, ...> als LLM-Output-Type fuer type-sicheren Spread
    - Idempotenz-Pruefung vor LLM-Call (alle 4 Felder vorhanden + nicht leer)
    - Pre-Persist-Gate-Pattern (RichtlinieStrictSchema + validateForeignKeys)
    - Exit-Code-Konvention 0/1/2/3/4 aus extract-richtlinie.ts
key_files:
  created:
    - scripts/migrate-legacy-dossier.ts
    - scripts/validate-single-dossier.ts
  modified: []
decisions:
  - "TargetedFill-Type als Pick<Richtlinie, 4 Felder> statt unknown-Map — ermoeglicht type-sicheren Spread ohne Cast"
  - "fetchOrRead + stripHtml aus extract-richtlinie.ts bewusst dupliziert — kein Re-Export, weil Plan 04 den Refaktor in auto-pflege-step.ts macht und Plan 02 entkoppelt sein soll"
  - "Idempotenz-Check prueft ob ALLE 4 Felder vorhanden UND nicht-leer sind (bestPractices.length > 0 etc.) — verhindert Re-Migration bereits migrierter Dossiers in Plan-04-03-Schleife"
  - "validate-single-dossier.ts als eigenes CLI statt Inline-Aufruf in Plan-04-03-Bash-Schleife — TypeScript-Files koennen nicht via node -e require() geladen werden"
metrics:
  duration: "2m 53s"
  completed: "2026-05-19"
  tasks_completed: 3
  files_created: 2
---

# Phase 04 Plan 02: migrate-legacy-dossier-script Summary

**One-liner:** Targeted-Fill-Migrations-CLI fuer Legacy-Dossiers mit Bestands-Kontext als Anti-Halluzinations-Anker, Pick<Richtlinie>-typsicherem Merge und Pre-Persist Strict+FK Gate.

## Was wurde gebaut

### scripts/migrate-legacy-dossier.ts (257 Zeilen)

CLI fuer die Migration eines einzelnen Legacy-Dossiers auf das Phase-3-Strict-Schema.

**Nutzung:**
```bash
npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>
```

**Ablauf:**
1. Bestands-Dossier aus `data/richtlinien/<id>.json` laden
2. Idempotenz-Pruefung: falls alle 4 Felder vorhanden und nicht-leer → skip ohne LLM-Call
3. `quellen[]` aus dem Dossier fetchen (gleicher Browser-UA wie extract-richtlinie.ts)
4. Targeted-Fill-Prompt bauen mit `BESTAND`-Block als Anti-Halluzinations-Anker
5. `generateJson<Pick<Richtlinie, 4 Felder>>` via `lib/wizard/llm.ts` (MODEL_PIPELINE)
6. Merge: `{ ...existing, ...fill, version: today }` — Bestands-Felder bleiben byte-identisch
7. Strict-Validator + FK-Check als Pre-Persist-Gate — bei Verletzung: exit 1, kein writeFile
8. Zurueckschreiben mit Token-Count-Log + Review-Hinweis

**Exit-Codes:**
| Code | Bedeutung |
|------|-----------|
| 0 | Erfolg (migriert oder skip) |
| 1 | Schema-/FK-Verletzung |
| 2 | Nutzungs-Fehler / Dossier nicht gefunden |
| 3 | LLM-Aufruf fehlgeschlagen |
| 4 | Dossier hat keine quellen[] |

### scripts/validate-single-dossier.ts (87 Zeilen)

Helper-CLI fuer Strict-Validierung eines einzelnen Dossiers per Pfad-Argument.

**Nutzung:**
```bash
npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json
```

**Exit-Codes:** 0 (valide), 1 (Verletzungen), 2 (Nutzungs-Fehler/nicht gefunden)

**Warum als eigenes CLI statt Inline-`node -e require(...)`:**
TypeScript-Dateien koennen via `node -e` nicht geladen werden — sie crashen sofort. Der Projekt-Standard ist `npx tsx --env-file=.env.local` (CLAUDE.md, scripts-Konvention). Plan 04-03 ruft diesen Helper in der Migrations-Schleife auf (11x pro Iteration) statt das langsame `validate-richtlinien.ts` (das immer alle 11 Dossiers laedt) zu nutzen.

## Bewusste Code-Duplikation

`fetchOrRead` + `stripHtml` wurden aus `scripts/extract-richtlinie.ts:101-132` in `migrate-legacy-dossier.ts` dupliziert (nicht via Re-Export importiert).

**Begruendung:** Plan 04 wird in `scripts/auto-pflege-step.ts` einen gemeinsamen Konsumenten einfuehren. Wenn Plan 02 direkt aus `extract-richtlinie.ts` importiert, entsteht eine Abhaengigkeit, die beim Refaktor in Plan 04 wieder aufgebrochen werden muesste. Die Duplikation ist mit ~25 Zeilen klein und wird im gleichen Sprint (Plan 04-04 oder 04-05) ohnehin aufgeloest.

## Hinweis fuer Plan 04-03 (Sample-First-Pattern D-09)

**Pflicht: Sample-First-Reihenfolge einhalten**

1. Zuerst `bmbf-digitalpakt-2` migrieren (Bundes-Bigcase, repraesentativ fuer ~87 Programme)
2. Dann `ferry-porsche-challenge-2025` (Stiftungs-Smallcase, anderer Stil)
3. Kolja reviewed den PR mit genau diesen 2 Commits vor der Vollmigration
4. Bei Quality-Pass: restliche 9 Dossiers (alphabetisch) auf denselben PR-Branch committen
5. Bei Quality-Fail: Prompt in migrate-legacy-dossier.ts nachschaerfen, KEIN Verlust der 9 weiteren LLM-Calls weil sie noch nicht gefahren wurden

**Erwartete LLM-Kosten fuer FETCH-04:**
- Pro Aufruf: ~4000 Output-Tokens + ~20000-60000 Input-Tokens
- DeepSeek-chat Pricing: ~$0.27/1M Input + ~$1.10/1M Output
- Pro Dossier: ca. $0.01-0.02 (abhaengig von Volltext-Laenge)
- Gesamt 11 Dossiers: ca. $0.10-0.20 (deutlich unter der Plan-Schaetzung von 0.5 Cent — DeepSeek ist guenstiger als urspruenglich angenommen)

## Deviations from Plan

Keine — Plan wurde exakt wie spezifiziert umgesetzt.

**Eine TypeScript-Anpassung vs. Plan-Vorlage:**
Der Plan-Code-Block zeigte `fill` als `{ bestPractices: unknown; rejectGruende: unknown; ... }` — das ist type-unsafe fuer den `...fill`-Spread in `Richtlinie`. Die Implementierung nutzt stattdessen `Pick<Richtlinie, "bestPractices" | "rejectGruende" | "vorbildFormulierungen" | "fristLogik">` als LLM-Output-Type. Das ist semantisch aequivalent (LLM liefert dieselben 4 Felder) aber TypeScript-sauber ohne Cast — der Compiler verifiziert, dass nur die erlaubten Felder aus dem `fill`-Spread in `merged` landen. Kein Behavior-Change, kein Devation von Must-Haves.

## Threat-Mitigations

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-04-07: API-Key-Leakage | Script loggt nur llmUsage.promptTokens / candidatesTokens, nie Key | Umgesetzt |
| T-04-06: LLM-Tampering JSON | Strict-Validator + FK-Check als Pre-Persist-Gate, exit 1 wenn Verletzung | Umgesetzt |
| T-04-08: LLM ueberschreibt Bestands-Felder | SYSTEM_PROMPT "BESTAND ist unangreifbar" + Pick<Richtlinie, 4 Felder> Output-Type | Umgesetzt |
| T-04-09: LLM beliebiger JSON-Output | maxTokens: 4000 begrenzt Output, generateJson wirft bei Parse-Error | Umgesetzt |

## Self-Check: PASSED

Datei-Check:
- `scripts/migrate-legacy-dossier.ts` — FOUND (257 Zeilen, min. 160 erfuellt)
- `scripts/validate-single-dossier.ts` — FOUND (87 Zeilen, min. 35 erfuellt)

Commit-Check:
- `dd7250e` — FOUND in git log
- Commit enthaelt exakt 2 Files: migrate-legacy-dossier.ts + validate-single-dossier.ts
- Subject matched `^feat\(scripts\)`
- Body enthaelt "Plan 04-02" und "D-07"

Behavior-Check:
- `npx tsx scripts/migrate-legacy-dossier.ts` ohne Argument → exit 2, "Nutzung:" auf stderr: PASS
- `npx tsx scripts/validate-single-dossier.ts` ohne Argument → exit 2, "Nutzung:" auf stderr: PASS
- `npx tsx scripts/validate-single-dossier.ts /tmp/nichtexistierende-datei.json` → exit 2, "Datei nicht gefunden": PASS
- `npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json` → exit 1, 4 Strict-Violations: PASS
- `git status data/richtlinien/` → keine Modifikationen: PASS
- `npx tsc --noEmit --project tsconfig.json` → exit 0: PASS
