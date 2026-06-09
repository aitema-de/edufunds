---
phase: 03-programm-pflege-foundation
fixed_at: 2026-05-19T00:00:00Z
review_path: .planning/phases/03-programm-pflege-foundation/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-05-19
**Source review:** `.planning/phases/03-programm-pflege-foundation/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 6
- Fixed: 6
- Skipped: 0
- Info-Findings (IN-01..IN-07): nicht im Scope dieses Fixer-Laufs — siehe Hinweis am Ende.

## Fixed Issues

### WR-01: `markBlockedInQueue` setzt `status="skip"` trotz Funktionsname und Kommentar "blocked"

**Files modified:** `scripts/extract-richtlinie.ts`
**Commit:** `b728ca8`
**Applied fix:** Funktion `markBlockedInQueue` umbenannt zu `markSkipInQueue`. JSDoc an
echten Status-Wert `"skip"` angeglichen, Hinweis ergaenzt, warum kein eigener
`"blocked"`-Status eingefuehrt wurde (cmdNext/cmdList filtern nur auf `status === "open"`,
`skipReason` reicht als Diagnose-Feld). `skipReason?: string` ins file-level
`QueueItem`-Interface aufgenommen, lokale Typ-Redeklaration mit nirgendwo gesetztem
`blockReason` entfernt. Folge: IN-04 (lokale `QueueItem`-Redeklaration) wurde als
Sub-Aspekt mit gefixt.

### WR-02: `parsed.version = parsed.version ?? ...` ist toter Code-Pfad nach Strict-Validation

**Files modified:** `scripts/extract-richtlinie.ts`
**Commit:** `2bd00b6`
**Applied fix:** Fallback-Operator `?? new Date()` durch direkte Zuweisung
`parsed.version = new Date().toISOString().slice(0, 10)` ersetzt. SYSTEM_PROMPT-Beispiel
`"version": "2026-04-21"` durch Platzhalter `"<wird vom Skript gesetzt …>"` ersetzt, damit
das LLM nicht versucht, das Datum selbst zu fuellen. Folge: `version`-Feld im Dossier
reflektiert immer den echten Extraktions-Tag, nicht den Tag der Prompt-Erstellung oder
ein vom LLM phantasiertes Datum.

### WR-03: `validate-richtlinien.ts` type-asserts mit Lie ueber `abschnitte`-Pflicht

**Files modified:** `lib/wizard/richtlinien-validator.ts`, `scripts/validate-richtlinien.ts`
**Commit:** `1b18edd`
**Applied fix:** `FkCheckable` als named export aus `lib/wizard/richtlinien-validator.ts`
exposed. `scripts/validate-richtlinien.ts` importiert den Typ via
`import { …, type FkCheckable } from "../lib/wizard/richtlinien-validator"` und castet auf
`FkCheckable` statt auf ein ad-hoc-Literal, das `abschnitte` faelschlich als non-optional
deklarierte. Cast-Typ und Funktions-Signatur decken sich jetzt; der TypeScript-Compiler
schuetzt die defensive `?? []`-Logik in `validateForeignKeys`, statt sie still zu
unterlaufen.

### WR-04: Scanner-User-Agent vs. Extract-User-Agent inkonsistent — Scanner kann 403 von Bundesseiten bekommen

**Files modified:** `scripts/scan-new-programs.ts`
**Commit:** `312cbc1`
**Applied fix:** Hardcoded `"EduFunds-Scanner/1.0"`-UA durch realistischen Chrome-UA
(`Mozilla/5.0 (X11; Linux x86_64) … Chrome/122.0.0.0 …`) ersetzt, plus `Accept` und
`Accept-Language`-Header. Analog zu `scripts/extract-richtlinie.ts:106-112`, das aus genau
diesem Grund schon einen Browser-UA verwendet. Kein DRY-Refactor in `lib/wizard/http.ts`
gemacht (der Reviewer schlug es als "besser" vor) — beide Skripte sind aktuell die einzigen
Konsumenten, eine separate Helper-Datei waere YAGNI. Wenn ein dritter Konsument dazukommt,
ist die Extraktion trivial.

### WR-05: scan-new-programs.ts schluckt LLM-Parse-Fehler ohne Aggregat

**Files modified:** `scripts/scan-new-programs.ts`
**Commit:** `a7e3248`
**Applied fix:** Zwei verschraenkte Aenderungen in einem Commit:
1. `scanSource` schluckt Parse-Fehler nicht mehr — wirft hoch zur main-Schleife. Die
   main-Schleife hat ohnehin ein eigenes try/catch um `scanSource`, der entscheidende
   Unterschied ist, dass sie den Fehler jetzt als Quellen-Ausfall sieht statt als
   "Quelle ok, 0 Eintraege gefunden".
2. `scannedOk`-Counter zaehlt nur Quellen, die OHNE Wurf durchgelaufen sind. Am Ende
   gilt: `scannedOk === 0 && sourcesToScan.length > 0` → `process.exit(2)`.

Vorher: Bei Total-Ausfall (403 von Bundesseiten, alle LLM-Calls scheitern) lief das Skript
still durch, schrieb unveraendertes `program-candidates.json`, Workflow erkannte „kein Diff"
und erstellte keinen PR. Jetzt: Workflow wird ROT, Kolja sieht den Ausfall sofort.

### WR-06: `weekly-program-scan.yml` deklariert `DEEPSEEK_API_KEY`-Pre-Flight, scant aber mit `MODEL_INTERVIEW`

**Files modified:** `.github/workflows/weekly-program-scan.yml`
**Commit:** `72b248f`
**Applied fix:** `workflow_dispatch.inputs.llm_provider.description` praezisiert, dass der
gemini-Fallback `gemini-2.0-flash` nutzt (NICHT `gemini-2.5-pro`), weil `scan-new-programs.ts`
auf `MODEL_INTERVIEW` hardcoded ist. Reine Doku-Aenderung, kein Verhaltens-Drift. Setzt
Erwartung im UI-Dropdown korrekt: „gemini" bedeutet hier Speed-Fallback, nicht Maximum-
Qualitaet.

## Skipped Issues

Keine. Alle 6 Warning-Findings wurden gefixt.

## Verifikation

- **Tier 1 (Re-read pro File):** alle gefixten Bereiche per `Read` nachgelesen, Aenderungen
  syntaktisch und semantisch intakt, kein Korruptions-Schaden im umliegenden Code.
- **Tier 2 (TypeScript-Check):** `npx tsc --noEmit -p .` ohne Fehler in den 4 betroffenen
  Files (`scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`,
  `scripts/validate-richtlinien.ts`, `lib/wizard/richtlinien-validator.ts`). Pre-existierende
  Tooling-Errors mit Einzel-File-Aufruf wurden ignoriert.
- **Tier 2 (Jest):** Phase-3-Tests (`__tests__/scripts/extract-richtlinie.test.ts`,
  `__tests__/scripts/scan-new-programs.test.ts`,
  `__tests__/lib/wizard/richtlinien-validator.test.ts`) alle gruen — 31/31 Tests.

## Hinweis: Info-Findings nicht adressiert

Scope dieses Fixer-Laufs war `critical_warning` (CR + WR). Die 7 Info-Findings
(IN-01..IN-07) wurden NICHT bearbeitet. Ausnahme: **IN-04** (lokale
`QueueItem`-Redeklaration in `markBlockedInQueue`) wurde als Sub-Aspekt von WR-01
mitgefixt. Verbleibende Info-Items fuer eine spaetere Iteration:

- IN-01: Pattern-Matcher-Tests vs. Behavior-Tests (groessere Architektur-Aenderung).
- IN-02: `--file <programmId>`-Option in `validate-richtlinien.ts`.
- IN-03: `loadCandidates`-ENOENT-Pfad rendert doppelt.
- IN-05: `normalizeUrl` lowercased Host nicht (no-op nach Spec, nur Awareness).
- IN-06: Vier kleine Strict-Schema-Tests fuer Einzelfeld-Pflicht-Bestaetigung.
- IN-07: Manueller `extra_urls`-Input im Dossier-Workflow.

Falls Kolja diese Iteration zusaetzlich gewuenscht hat: erneut mit
`fix_scope: all` aufrufen.

---

_Fixed: 2026-05-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
