---
phase: 03-programm-pflege-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/wizard/richtlinien-schema.ts
  - lib/wizard/richtlinien-validator.ts
  - __tests__/lib/wizard/richtlinien-validator.test.ts
  - __tests__/lib/wizard/richtlinien-loader.test.ts
autonomous: true
requirements:
  - FETCH-03

must_haves:
  truths:
    - "Top-Level-Interface Richtlinie hat 4 neue optionale Felder (bestPractices, rejectGruende, vorbildFormulierungen, fristLogik)"
    - "tsc --noEmit bleibt grün (alle 14 Konsumenten compilen)"
    - "Zod-Validator-Library validiert Strict-Modus + Legacy-Modus + FK-Check getrennt"
    - "Wave-0-Tests prüfen alle 11 Legacy-Dossiers laden weiterhin ohne Crash"
    - "Discriminated Union fristLogik akzeptiert rolling ohne stichtage und lehnt fixe_stichtage mit leerem Array ab"
  artifacts:
    - path: "lib/wizard/richtlinien-schema.ts"
      provides: "Compile-Time Type für Richtlinie + 4 neue optionale Felder + FristLogik DU + Sub-Interfaces"
      contains: "bestPractices?: BestPractice[]"
    - path: "lib/wizard/richtlinien-validator.ts"
      provides: "Runtime Zod-Schema (Strict+Legacy) + validateForeignKeys()-Funktion"
      exports: ["RichtlinieStrictSchema", "RichtlinieLegacySchema", "validateForeignKeys", "FkIssue"]
    - path: "__tests__/lib/wizard/richtlinien-validator.test.ts"
      provides: "Unit-Tests für Strict/Legacy/FK/DU"
      min_lines: 80
    - path: "__tests__/lib/wizard/richtlinien-loader.test.ts"
      provides: "Integrations-Test alle 11 Legacy-Dossiers laden ohne Crash"
      min_lines: 20
  key_links:
    - from: "lib/wizard/richtlinien-validator.ts"
      to: "lib/wizard/richtlinien-schema.ts"
      via: "Zod-Schema als Runtime-Mirror des Compile-Time-Interfaces"
      pattern: "import type \\{ Richtlinie \\} from.*richtlinien-schema"
    - from: "lib/wizard/richtlinien-validator.ts"
      to: "antragsstruktur.abschnitte[].id"
      via: "validateForeignKeys() prüft FK-Integrität"
      pattern: "validIds\\.has\\(v\\.abschnitt_id\\)"
---

<objective>
Schema-Erweiterung + Zod-Validator-Library für die vier neuen Top-Level-Felder von `Richtlinie` (D-01 bis D-06). Erste Wave: alles, was rein in `lib/` lebt und Wave-0-Tests, gegen die Plan 03-02 dann Cron-Skripte testet.

Purpose: Phase 4 (Pipeline-Tuning) und Plan 03-02 (Cron-Migration) brauchen ein erweitertes Type-Interface UND eine Runtime-Validierung. Die Trennung in zwei Files (schema = Compile-Time-Type, validator = Runtime-Zod) folgt RESEARCH §Architecture (Empfehlung), weil ein Single-Source-of-Truth-Refactor (interface → z.infer) 14 Importeure brechen könnte.
Output: Erweitertes Type-Interface + neue Validator-Library + Wave-0-Tests.
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md
@.planning/phases/03-programm-pflege-foundation/03-RESEARCH.md
@.planning/phases/03-programm-pflege-foundation/03-PATTERNS.md
@.planning/phases/03-programm-pflege-foundation/03-VALIDATION.md
@CLAUDE.md
@lib/wizard/richtlinien-schema.ts
@lib/wizard/richtlinien-loader.ts
@lib/contact-schema.ts
@__tests__/lib/foerderSchema.test.ts
@__tests__/lib/wizard/facts-extractor.test.ts

<interfaces>
<!-- Bestehende Schlüssel-Stellen, die wir erweitern oder referenzieren. -->

From lib/wizard/richtlinien-schema.ts (das was BLEIBT — wir erweitern Richtlinie additiv um 4 optionale Felder):

```typescript
export interface AntragsAbschnitt {
  id: string;        // ← FK-Anker für vorbildFormulierungen[].abschnitt_id
  name: string;
  pflicht: boolean;
  maxZeichen?: number;
  leitfragen?: string[];
  stilhinweis?: string;
}

export interface Antragsstruktur {
  abschnitte: AntragsAbschnitt[];
  // ...
}

export interface Richtlinie {
  version: string;
  quellen: string[];
  foerderhoehe: Foerderhoehe;
  kostenpositionen: Kostenposition[];
  eigenmittel: Eigenmittel;
  kumulierung: Kumulierung;
  antragsstruktur: Antragsstruktur;
  notizen?: string[];
  veraltet?: boolean;
  // ← HIER 4 neue OPTIONALE Felder einfügen, KEIN Field davor anfassen.
}
```

From lib/contact-schema.ts (Zod-Style-Anker):

```typescript
import { z } from 'zod';
export const contactSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  // ...
});
```

From __tests__/lib/foerderSchema.test.ts (Test-Style-Anker):

```typescript
describe('Foerderprogramm Schema', () => {
  describe('Validierung gültiger Programme', () => {
    it('sollte ein vollständiges gültiges Programm akzeptieren', () => { /* ... */ });
  });
});
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Schema um 4 neue optionale Top-Level-Felder erweitern (lib/wizard/richtlinien-schema.ts)</name>
  <files>lib/wizard/richtlinien-schema.ts</files>
  <read_first>
    - lib/wizard/richtlinien-schema.ts (gesamtes File — wir editieren am Ende des Richtlinie-Interfaces und fügen 4 neue Sub-Interfaces ein)
    - .planning/phases/03-programm-pflege-foundation/03-CONTEXT.md (D-01..D-06 sind die Spec)
    - .planning/phases/03-programm-pflege-foundation/03-PATTERNS.md (§lib/wizard/richtlinien-schema.ts — Style-Anker für JSDoc, Optional-Pattern, DU-Pattern)
  </read_first>
  <behavior>
    - Test 1: import { Richtlinie } from '@/lib/wizard/richtlinien-schema' compiles und Type erlaubt alle vier neuen Felder optional
    - Test 2: Type-only-Test: ein Objekt mit fristLogik={ typ: 'rolling' } und mit fristLogik={ typ: 'fixe_stichtage', stichtage: ['2026-04-10'] } sind beide gültig
    - Test 3: tsc --noEmit auf Repo bleibt grün
  </behavior>
  <action>
Erweitere `lib/wizard/richtlinien-schema.ts` ausschließlich additiv (keine bestehenden Felder anfassen). Füge folgende vier neue Sub-Interfaces VOR dem `export interface Richtlinie` ein, und ergänze danach die vier optionalen Felder am Ende des `Richtlinie`-Interfaces.

**Style-Konventionen (aus PATTERNS.md / existing File):**
- JSDoc-Kommentare in deutscher Sprache OHNE Umlaute (`Foerderhoehe`, NICHT `Förderhöhe`) — Konvention in dieser Datei.
- Identifier (Feldnamen) ASCII (D-01).
- String-Literal-Werte ASCII (D-02 — `'haeufig'`/`'gelegentlich'`, NICHT `'häufig'`).
- Optional-Postfix `?` für alle vier neuen Top-Level-Felder (D-06) und für die Sub-Felder, die in den D-01..D-04-Spec als optional markiert sind.

**Exakter Code, der nach `Foerderhoehe`-Interface (vor `Richtlinie`) einzufügen ist (D-01..D-04 verbatim):**

```typescript
export interface BestPractice {
  /** Themen-Kurzlabel, 3-60 Zeichen, z. B. "Zielgruppen-Schaerfe". */
  thema: string;
  /** Was funktionierte konkret im Antrag (mind. 10 Zeichen). */
  was_funktionierte: string;
  /** Optional: warum das funktionierte (Begruendung aus der Quelle). */
  warum?: string;
}

export interface RejectGrund {
  /** Klartext-Grund fuer Ablehnung, mind. 5 Zeichen. */
  grund: string;
  /** Wie haeufig dieser Grund auftritt (ASCII-only Diskriminator). */
  haeufigkeit?: "haeufig" | "gelegentlich";
  /** Optional: konstruktive Vermeidungs-Empfehlung. */
  vermeidung?: string;
}

export interface VorbildFormulierung {
  /**
   * FK gegen Antragsstruktur.abschnitte[].id. Validator prueft Integritaet.
   * Wenn die Section-Stage in Phase 5 fuer Abschnitt X arbeitet, holt sie
   * gezielt die Vorbild-Formulierungen mit abschnitt_id === X.
   */
  abschnitt_id: string;
  /** Woertliche Vorbild-Formulierung aus erfolgreichem Antrag, mind. 20 Zeichen. */
  formulierung: string;
  /** Optionaler Kontext, z. B. Ziel-Geber-Typ oder Antragsjahr. */
  kontext?: string;
}

/**
 * Diskriminierte Union fuer die Bewerbungs-Frist-Logik.
 *
 * - rolling: jederzeit einreichbar, keine Stichtage.
 * - fixe_stichtage: harte Termine, mind. einer noetig (ISO YYYY-MM-DD).
 *   `jaehrlich_wiederkehrend?` deckt den haeufigen Fall „immer bis 30.06."
 *   ab — ohne dieses Feld werden Dossiers durch Datums-Verstreichen
 *   kontinuierlich ungueltig.
 */
export type FristLogik =
  | { typ: "rolling" }
  | {
      typ: "fixe_stichtage";
      stichtage: string[];
      jaehrlich_wiederkehrend?: boolean;
    };
```

**Erweiterung des bestehenden `Richtlinie`-Interfaces** — die folgenden vier Zeilen am Ende vor der schliessenden `}` einfügen (NACH `veraltet?: boolean;`):

```typescript
  /**
   * Best Practices erfolgreicher Antraege fuer dieses Programm.
   * Optional, weil Phase 4 die 11 Legacy-Dossiers nicht type-blocking migrieren muss (D-06).
   * Strict-Validator (lib/wizard/richtlinien-validator.ts) erzwingt das Feld fuer neu extrahierte Dossiers.
   */
  bestPractices?: BestPractice[];
  /** Typische Reject-Gruende. Optional (D-06). */
  rejectGruende?: RejectGrund[];
  /** Programm-spezifische Vorbild-Formulierungen, FK auf antragsstruktur.abschnitte[].id. Optional (D-06). */
  vorbildFormulierungen?: VorbildFormulierung[];
  /** Discriminated Union: rolling | fixe_stichtage. Optional (D-06). */
  fristLogik?: FristLogik;
```

**Anti-Halluzinations-Verbote für diesen Task:**
- KEIN Bumpen von `version`-Feld (deferred D-12 / RESEARCH §Anti-Patterns).
- KEIN Refactor des bestehenden Interfaces (z. B. nicht zu `type Richtlinie = z.infer<...>` umbauen — RESEARCH §Alternatives Considered).
- KEIN neues `version`-Konstrukt (separates Schema-Versioning ist explizit deferred).
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && npx tsc --noEmit 2>&1 | head -50; test "${PIPESTATUS[0]}" -eq 0</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export interface BestPractice " lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "export interface RejectGrund " lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "export interface VorbildFormulierung " lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "export type FristLogik =" lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "bestPractices?: BestPractice\\[\\];" lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "rejectGruende?: RejectGrund\\[\\];" lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "vorbildFormulierungen?: VorbildFormulierung\\[\\];" lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q "fristLogik?: FristLogik;" lib/wizard/richtlinien-schema.ts` exit 0
    - `grep -q '"haeufig" | "gelegentlich"' lib/wizard/richtlinien-schema.ts` exit 0 (ASCII-Werte, KEINE Umlaute)
    - `grep -q '"rolling"' lib/wizard/richtlinien-schema.ts && grep -q '"fixe_stichtage"' lib/wizard/richtlinien-schema.ts` exit 0
    - Keine ASCII-Schlüssel mit Umlauten: `grep -E "(häufig|röll|stichtäg)" lib/wizard/richtlinien-schema.ts | wc -l` == 0
    - `npx tsc --noEmit` exit 0
  </acceptance_criteria>
  <done>Schema additiv erweitert, alle 4 Sub-Interfaces + 4 Top-Level-optionale-Felder vorhanden, tsc grün, keine bestehenden Felder verändert.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Zod-Validator-Library + Wave-0-Tests (lib/wizard/richtlinien-validator.ts + 2 Test-Dateien)</name>
  <files>lib/wizard/richtlinien-validator.ts, __tests__/lib/wizard/richtlinien-validator.test.ts, __tests__/lib/wizard/richtlinien-loader.test.ts</files>
  <read_first>
    - lib/wizard/richtlinien-schema.ts (nach Task 1 — die 4 neuen Sub-Interfaces müssen existieren)
    - lib/contact-schema.ts (Zod-Style-Anker, deutsche Fehler-Strings)
    - lib/wizard/richtlinien-loader.ts (für Integrations-Test der 11 Legacy-Dossiers)
    - __tests__/lib/foerderSchema.test.ts (deutsche describe/it-Strings, "sollte..."-Pattern)
    - __tests__/lib/wizard/facts-extractor.test.ts (kleiner Library-Test mit @-Pfad-Alias)
    - data/richtlinien/aktion-mensch-schulkooperation.json (representatives Legacy-Dossier als Fixture für FK-Test)
    - .planning/phases/03-programm-pflege-foundation/03-RESEARCH.md §Pattern-2 (Pattern für Discriminated Union + FK-Check)
  </read_first>
  <behavior>
    - Test 1: RichtlinieStrictSchema.safeParse({legacy-dossier-ohne-neue-felder}).success === false
    - Test 2: RichtlinieLegacySchema.safeParse({legacy-dossier}).success === true
    - Test 3: RichtlinieStrictSchema.safeParse({dossier mit allen 4 neuen Feldern korrekt befüllt}).success === true
    - Test 4: fristLogik = { typ: 'rolling' } akzeptiert
    - Test 5: fristLogik = { typ: 'fixe_stichtage', stichtage: [] } abgelehnt (.min(1))
    - Test 6: fristLogik = { typ: 'fixe_stichtage', stichtage: ['10.04.2026'] } abgelehnt (Format-Regex)
    - Test 7: fristLogik = { typ: 'fixe_stichtage', stichtage: ['2026-04-10'] } akzeptiert
    - Test 8: validateForeignKeys mit abschnitt_id 'finanzplan-alt' nicht in {finanzplan, ...} liefert Issue
    - Test 9: validateForeignKeys ohne vorbildFormulierungen liefert leere Issues-Liste
    - Test 10: loadRichtlinie laedt 'aktion-mensch-schulkooperation' und gibt Objekt mit bestPractices === undefined
    - Test 11: listRichtlinienIds liefert mind. 11 IDs
  </behavior>
  <action>
**Schritt A — `lib/wizard/richtlinien-validator.ts` neu erstellen** (Datei existiert nicht, KEIN Read nötig vor Write):

Imports + Schema-Konstanten + FK-Check-Funktion. Folge `lib/contact-schema.ts:1` als Style-Anker (`import { z } from 'zod';` direkt). Schema-Konstanten in PascalCase mit `Schema`-Suffix.

**Vollständiger Datei-Inhalt** (ein 1:1-File-Write, KEINE Edits — die Datei ist neu):

```typescript
/**
 * Runtime-Validator fuer Richtlinien-Dossiers (Zod).
 *
 * Strikt vs. Legacy:
 *   - RichtlinieStrictSchema: alle 4 neuen Felder REQUIRED. Fuer neu extrahierte
 *     Dossiers ab Phase 3.
 *   - RichtlinieLegacySchema: alle 4 neuen Felder optional. Fuer die 11
 *     bestehenden Dossiers in data/richtlinien/, bis Phase 4 sie migriert.
 *
 * Foreign-Key-Check (validateForeignKeys):
 *   Zod kann Cross-Field-Refines via .refine(), wird aber unleserlich. Daher
 *   separate Funktion. Pflicht-Aufruf in scripts/validate-richtlinien.ts und
 *   in scripts/extract-richtlinie.ts (vor Persist).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-Schemas fuer die 4 neuen Felder (D-01..D-04)
// ---------------------------------------------------------------------------

const BestPracticeSchema = z.object({
  thema: z.string().min(3, "thema muss mindestens 3 Zeichen lang sein"),
  was_funktionierte: z
    .string()
    .min(10, "was_funktionierte muss mindestens 10 Zeichen lang sein"),
  warum: z.string().optional(),
});

const RejectGrundSchema = z.object({
  grund: z.string().min(5, "grund muss mindestens 5 Zeichen lang sein"),
  haeufigkeit: z.enum(["haeufig", "gelegentlich"]).optional(),
  vermeidung: z.string().optional(),
});

const VorbildFormulierungSchema = z.object({
  abschnitt_id: z.string().min(1, "abschnitt_id darf nicht leer sein"),
  formulierung: z
    .string()
    .min(20, "formulierung muss mindestens 20 Zeichen lang sein"),
  kontext: z.string().optional(),
});

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const FristLogikSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("rolling") }),
  z.object({
    typ: z.literal("fixe_stichtage"),
    stichtage: z
      .array(
        z
          .string()
          .regex(
            ISO_DATE_REGEX,
            "stichtag muss ISO-Format YYYY-MM-DD haben (z. B. 2026-04-10)"
          )
      )
      .min(1, "fixe_stichtage benoetigt mindestens einen Stichtag"),
    jaehrlich_wiederkehrend: z.boolean().optional(),
  }),
]);

// ---------------------------------------------------------------------------
// Bestehende Pflichtfelder — minimaler Mirror der Compile-Time-Interfaces.
// Wir validieren nur die fuer FK + Strict-Mode relevanten Substrukturen
// streng; den Rest behalten wir als z.unknown()/passthrough, damit Phase
// 3 nicht versehentlich die Foerderhoehe-/Kostenpositionen-Modellierung
// duplizieren muss (das gehoert in Phase 4 wenn ueberhaupt).
// ---------------------------------------------------------------------------

const AntragsAbschnittSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pflicht: z.boolean(),
  maxZeichen: z.number().optional(),
  leitfragen: z.array(z.string()).optional(),
  stilhinweis: z.string().optional(),
});

const AntragsstrukturSchema = z
  .object({
    abschnitte: z.array(AntragsAbschnittSchema).min(1),
    anlagen: z.array(z.string()).optional(),
    einreichungsweg: z.string(),
    bearbeitungsdauer: z.string().optional(),
  })
  .passthrough();

// Basis-Felder, die fuer beide Modi gelten — Pflicht im Datenmodell, aber
// inhaltlich locker validiert (Phase 4 kann verschaerfen).
const BaseRichtlinieShape = {
  version: z.string().min(1),
  quellen: z.array(z.string()),
  foerderhoehe: z.unknown(), // Phase 4 verschaerft falls noetig
  kostenpositionen: z.array(z.unknown()),
  eigenmittel: z.unknown(),
  kumulierung: z.unknown(),
  antragsstruktur: AntragsstrukturSchema,
  notizen: z.array(z.string()).optional(),
  veraltet: z.boolean().optional(),
};

// ---------------------------------------------------------------------------
// Strict-Schema: alle 4 neuen Felder REQUIRED
// ---------------------------------------------------------------------------

export const RichtlinieStrictSchema = z
  .object({
    ...BaseRichtlinieShape,
    bestPractices: z.array(BestPracticeSchema).min(1),
    rejectGruende: z.array(RejectGrundSchema).min(1),
    vorbildFormulierungen: z.array(VorbildFormulierungSchema).min(1),
    fristLogik: FristLogikSchema,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Legacy-Schema: alle 4 neuen Felder OPTIONAL
// ---------------------------------------------------------------------------

export const RichtlinieLegacySchema = z
  .object({
    ...BaseRichtlinieShape,
    bestPractices: z.array(BestPracticeSchema).optional(),
    rejectGruende: z.array(RejectGrundSchema).optional(),
    vorbildFormulierungen: z.array(VorbildFormulierungSchema).optional(),
    fristLogik: FristLogikSchema.optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Foreign-Key-Check fuer vorbildFormulierungen[].abschnitt_id
// ---------------------------------------------------------------------------

export interface FkIssue {
  programmId: string;
  abschnitt_id: string;
  reason: string;
}

interface FkCheckable {
  antragsstruktur: { abschnitte: Array<{ id: string }> };
  vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
}

/**
 * Prueft, dass jedes vorbildFormulierungen[].abschnitt_id auf eine
 * existierende antragsstruktur.abschnitte[].id zeigt. Gibt eine flache
 * Issues-Liste zurueck (leer = OK).
 */
export function validateForeignKeys(
  parsed: FkCheckable,
  programmId: string
): FkIssue[] {
  const issues: FkIssue[] = [];
  const validIds = new Set(
    parsed.antragsstruktur.abschnitte.map((a) => a.id)
  );
  for (const v of parsed.vorbildFormulierungen ?? []) {
    if (!validIds.has(v.abschnitt_id)) {
      const valid = Array.from(validIds).join(", ");
      issues.push({
        programmId,
        abschnitt_id: v.abschnitt_id,
        reason: `FK-Verletzung: abschnitt_id '${v.abschnitt_id}' nicht in antragsstruktur.abschnitte[].id [${valid}]`,
      });
    }
  }
  return issues;
}
```

**Schritt B — `__tests__/lib/wizard/richtlinien-validator.test.ts` neu erstellen** (volles Test-File, ein File-Write):

```typescript
import {
  RichtlinieStrictSchema,
  RichtlinieLegacySchema,
  validateForeignKeys,
} from "@/lib/wizard/richtlinien-validator";
import aktionMensch from "@/data/richtlinien/aktion-mensch-schulkooperation.json";

// Minimaler valider Antragsstruktur-Block fuer in-line-Fixtures.
const MIN_ANTRAGSSTRUKTUR = {
  abschnitte: [
    { id: "buendnis", name: "Buendnis", pflicht: true },
    { id: "konzept", name: "Konzept", pflicht: true },
    { id: "finanzplan", name: "Finanzplan", pflicht: true },
  ],
  einreichungsweg: "online",
};

const MIN_BASE = {
  version: "2026-05-06-test",
  quellen: ["https://example.org"],
  foerderhoehe: { maxEur: 1000 },
  kostenpositionen: [],
  eigenmittel: { pflicht: false },
  kumulierung: { erlaubt: true },
  antragsstruktur: MIN_ANTRAGSSTRUKTUR,
};

const MIN_STRICT_NEW_FIELDS = {
  bestPractices: [
    {
      thema: "Zielgruppen-Schaerfe",
      was_funktionierte: "Klare Definition der Schueler-Zielgruppe nach Klassenstufe",
    },
  ],
  rejectGruende: [
    {
      grund: "Zielgruppe zu vage definiert",
      haeufigkeit: "haeufig" as const,
    },
  ],
  vorbildFormulierungen: [
    {
      abschnitt_id: "konzept",
      formulierung:
        "Das Projekt foerdert nachhaltig die digitale Souveraenitaet der Klassen 7-9.",
    },
  ],
  fristLogik: { typ: "rolling" as const },
};

describe("RichtlinieStrictSchema", () => {
  describe("strict mode", () => {
    it("sollte ein Legacy-Dossier ohne 4 neue Felder ablehnen", () => {
      const result = RichtlinieStrictSchema.safeParse(aktionMensch);
      expect(result.success).toBe(false);
    });

    it("sollte ein Dossier mit allen 4 neuen Feldern akzeptieren", () => {
      const dossier = { ...MIN_BASE, ...MIN_STRICT_NEW_FIELDS };
      const result = RichtlinieStrictSchema.safeParse(dossier);
      expect(result.success).toBe(true);
    });
  });

  describe("fristLogik (Discriminated Union)", () => {
    const baseValid = { ...MIN_BASE, ...MIN_STRICT_NEW_FIELDS };

    it("sollte rolling akzeptieren ohne stichtage", () => {
      const d = { ...baseValid, fristLogik: { typ: "rolling" } };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });

    it("sollte fixe_stichtage mit nicht-leerem stichtage[]-Array akzeptieren", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: ["2026-04-10"] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });

    it("sollte fixe_stichtage MIT leerem stichtage[] ablehnen", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: [] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(false);
    });

    it("sollte stichtage in deutschem Format (10.04.2026) ablehnen", () => {
      const d = {
        ...baseValid,
        fristLogik: { typ: "fixe_stichtage", stichtage: ["10.04.2026"] },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(false);
    });

    it("sollte stichtage in ISO-Format (2026-04-10) akzeptieren", () => {
      const d = {
        ...baseValid,
        fristLogik: {
          typ: "fixe_stichtage",
          stichtage: ["2026-04-10", "2026-09-30"],
          jaehrlich_wiederkehrend: true,
        },
      };
      expect(RichtlinieStrictSchema.safeParse(d).success).toBe(true);
    });
  });
});

describe("RichtlinieLegacySchema", () => {
  it("sollte ein Dossier ohne neue Felder akzeptieren", () => {
    const result = RichtlinieLegacySchema.safeParse(aktionMensch);
    expect(result.success).toBe(true);
  });

  it("sollte ein Dossier mit teilweise gefuellten neuen Feldern akzeptieren", () => {
    const d = {
      ...MIN_BASE,
      bestPractices: [
        { thema: "Test-Thema", was_funktionierte: "Funktionierende Massnahme A" },
      ],
      // rejectGruende, vorbildFormulierungen, fristLogik fehlen — Legacy erlaubt das
    };
    expect(RichtlinieLegacySchema.safeParse(d).success).toBe(true);
  });
});

describe("validateForeignKeys", () => {
  it("sollte FK-Verletzung erkennen wenn abschnitt_id nicht in antragsstruktur.abschnitte", () => {
    const dossier = {
      antragsstruktur: MIN_ANTRAGSSTRUKTUR,
      vorbildFormulierungen: [
        { abschnitt_id: "finanzplan-alt", formulierung: "x" },
      ],
    };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(1);
    expect(issues[0].abschnitt_id).toBe("finanzplan-alt");
    expect(issues[0].reason).toMatch(/FK-Verletzung/);
  });

  it("sollte leere Issues-Liste zurueckgeben bei vollstaendig konsistentem Dossier", () => {
    const dossier = {
      antragsstruktur: MIN_ANTRAGSSTRUKTUR,
      vorbildFormulierungen: [
        { abschnitt_id: "konzept", formulierung: "x" },
        { abschnitt_id: "finanzplan", formulierung: "y" },
      ],
    };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(0);
  });

  it("sollte vorbildFormulierungen=undefined als keine Issues behandeln", () => {
    const dossier = { antragsstruktur: MIN_ANTRAGSSTRUKTUR };
    const issues = validateForeignKeys(dossier, "test-programm");
    expect(issues).toHaveLength(0);
  });
});
```

**Schritt C — `__tests__/lib/wizard/richtlinien-loader.test.ts` neu erstellen** (verifies dass alle 11 Legacy-Dossiers nach Schema-Erweiterung weiterhin laden):

Vor dem Schreiben prüfen: existiert die Datei schon? `test -f __tests__/lib/wizard/richtlinien-loader.test.ts` — falls ja, NUR erweitern um neue Cases (in einem zusätzlichen describe-Block am Ende anhängen). Falls nein, neu schreiben:

```typescript
import { loadRichtlinie, listRichtlinienIds } from "@/lib/wizard/richtlinien-loader";

describe("richtlinien-loader (Schema-Erweiterung Phase 3)", () => {
  it("sollte Legacy-Dossier ohne 4 neue Felder ohne Crash laden", async () => {
    const r = await loadRichtlinie("aktion-mensch-schulkooperation");
    expect(r).not.toBeNull();
    expect(r!.bestPractices).toBeUndefined();
    expect(r!.rejectGruende).toBeUndefined();
    expect(r!.vorbildFormulierungen).toBeUndefined();
    expect(r!.fristLogik).toBeUndefined();
  });

  it("sollte alle 11 bestehenden Dossier-IDs auflisten", async () => {
    const ids = await listRichtlinienIds();
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});
```

**Anti-Halluzinations-Verbote für diesen Task:**
- KEIN `validate-data.ts` anfassen (RESEARCH §H-3 — anderes Datenmodell).
- KEIN Re-Export des `Richtlinie`-Typs aus dem Validator (Type-Identität bleibt im Schema-File, RESEARCH §C-3 + PATTERNS §Mismatches).
- KEINE Ajv/io-ts/yup — Zod-Konvention im Repo (RESEARCH §Standard Stack).
- Falls Test-File für Loader bereits existiert: NICHT überschreiben, NUR `describe(...)` anhängen.
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && npx tsc --noEmit 2>&1 | tail -5 && npm test -- --testPathPattern='richtlinien-(validator|loader)' --silent 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - `test -f lib/wizard/richtlinien-validator.ts` exit 0
    - `grep -q "export const RichtlinieStrictSchema" lib/wizard/richtlinien-validator.ts` exit 0
    - `grep -q "export const RichtlinieLegacySchema" lib/wizard/richtlinien-validator.ts` exit 0
    - `grep -q "export function validateForeignKeys" lib/wizard/richtlinien-validator.ts` exit 0
    - `grep -q "z.discriminatedUnion" lib/wizard/richtlinien-validator.ts` exit 0
    - `grep -q "import { z } from" lib/wizard/richtlinien-validator.ts` exit 0
    - `test -f __tests__/lib/wizard/richtlinien-validator.test.ts` exit 0
    - `test -f __tests__/lib/wizard/richtlinien-loader.test.ts` exit 0
    - `npx tsc --noEmit` exit 0
    - `npm test -- --testPathPattern=richtlinien-validator --silent` exit 0 mit STDOUT-Match `/Tests:.*passed/` (mind. 10 passed)
    - `npm test -- --testPathPattern=richtlinien-loader --silent` exit 0 mit STDOUT-Match `/Tests:.*passed/` (mind. 2 passed)
    - `scripts/validate-data.ts` UNVERÄNDERT: `git diff scripts/validate-data.ts | wc -l` == 0
  </acceptance_criteria>
  <done>Validator-Library + Wave-0-Tests vorhanden, alle Validator-Tests grün, alle Loader-Tests grün, 11 Legacy-Dossiers laden weiterhin via richtlinien-loader, tsc grün.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dossier file → loader | Dossier-JSON wird via JSON.parse geladen. Strict-Schema und Legacy-Schema sind die Validation-Layer. |
| LLM-Output → richtlinien-validator | Plan 03-02 wird Validator vor Persist aufrufen — die Library ist das Tor. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-Schema-Injection | T (Tampering) | richtlinien-validator.ts | mitigate | RichtlinieStrictSchema mit `.min()` auf string/array-Längen blockt offensichtliche Halluzinations-Patterns ({}, [], ""). Konsumiert wird in Plan 03-02 vor Persist. |
| T-FK-Drift | I (Information disclosure / Integrity) | validateForeignKeys() | mitigate | Pflicht-Aufruf in Plan 03-02 vor Persist. Set-basierter O(1)-Lookup, deterministisch. |
| T-Backward-Compat-Break | T (Tampering / regression) | richtlinien-schema.ts erweitert + RichtlinieLegacySchema | mitigate | Optional-Felder (D-06) + Legacy-Schema garantieren, dass alle 11 bestehenden Dossiers weiter laden + validierbar sind. Wave-0-Test (Loader-Test) verifiziert das. |
</threat_model>

<verification>
- `npx tsc --noEmit` grün (kein Compile-Bruch durch Schema-Erweiterung)
- `npm test -- --testPathPattern='richtlinien-(validator|loader)' --silent` grün (alle neuen Tests passed)
- `npm test --silent` Delta gegen 34 pre-existing-Failures: KEINE neuen Regressionen
- Manueller Smoke (optional): `node -e "const r = require('./data/richtlinien/aktion-mensch-schulkooperation.json'); console.log(Object.keys(r))"` listet die Felder ohne Fehler
</verification>

<success_criteria>
- Schema um 4 neue optionale Felder erweitert, FristLogik-DU korrekt typisiert
- Zod-Validator-Library mit Strict + Legacy + FK-Check vorhanden und getestet
- Wave-0-Tests grün; Loader-Smoke verifiziert dass 11 Legacy-Dossiers nicht brechen
- tsc grün; keine Regression in npm test gegen 34 pre-existing-Failures
- Plan 03-02 kann auf RichtlinieStrictSchema + validateForeignKeys aufbauen
</success_criteria>

<output>
After completion, create `.planning/phases/03-programm-pflege-foundation/03-01-SUMMARY.md` mit:
- Liste der 4 neuen Sub-Interfaces im Schema
- Liste der Validator-Exports
- Anzahl Tests grün
- Note ob `richtlinien-loader.test.ts` neu angelegt oder erweitert wurde
- Hinweis: Plan 03-02 importiert `RichtlinieStrictSchema` und `validateForeignKeys` aus `lib/wizard/richtlinien-validator`
</output>
