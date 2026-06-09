---
phase: 04-programm-pflege-vollautomation-dossier-migration
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/migrate-legacy-dossier.ts
  - scripts/validate-single-dossier.ts
autonomous: true
requirements:
  - FETCH-04
must_haves:
  truths:
    - "scripts/migrate-legacy-dossier.ts existiert und akzeptiert einen Pflicht-CLI-Parameter <programmId>"
    - "Skript laedt das Bestands-Dossier aus data/richtlinien/<id>.json und gibt es dem LLM als Anti-Halluzinations-Anker mit"
    - "Skript ruft generateJson<T> aus lib/wizard/llm.ts (kein direkter @google/generative-ai oder openai Import)"
    - "Skript validiert das gemergte Dossier strict (RichtlinieStrictSchema + validateForeignKeys), exit-1 bei Verletzung, KEIN writeFile"
    - "Bestands-Felder bleiben byte-identisch — das LLM darf nur bestPractices, rejectGruende, vorbildFormulierungen, fristLogik liefern"
    - "scripts/validate-single-dossier.ts existiert als Helper-CLI, validiert genau ein Dossier per Pfad-Argument, ruft RichtlinieStrictSchema + validateForeignKeys auf, exit 0/1"
  artifacts:
    - path: "scripts/migrate-legacy-dossier.ts"
      provides: "CLI Targeted-Fill-Migrationsskript fuer einzelnes Legacy-Dossier"
      exports: []
      min_lines: 160
    - path: "scripts/validate-single-dossier.ts"
      provides: "Helper-CLI fuer Einzeldossier-Strict-Validierung (Wave-2-Konsum durch Plan 04-03 Migrations-Schleifen)"
      exports: []
      min_lines: 35
  key_links:
    - from: "scripts/migrate-legacy-dossier.ts"
      to: "lib/wizard/llm.ts"
      via: "generateJson + MODEL_PIPELINE Import"
      pattern: "from \"../lib/wizard/llm\""
    - from: "scripts/migrate-legacy-dossier.ts"
      to: "lib/wizard/richtlinien-validator.ts"
      via: "RichtlinieStrictSchema + validateForeignKeys Import"
      pattern: "from \"../lib/wizard/richtlinien-validator\""
    - from: "scripts/validate-single-dossier.ts"
      to: "lib/wizard/richtlinien-validator.ts"
      via: "RichtlinieStrictSchema + validateForeignKeys Import"
      pattern: "from \"../lib/wizard/richtlinien-validator\""
---

<objective>
Standalone-CLI fuer die Migration eines einzelnen Legacy-Dossiers. Targeted-Fill statt komplettes Re-Extract — das LLM bekommt das Bestands-Dossier als Anti-Halluzinations-Kontext UND einen frischen Volltext der Quelle(n), liefert NUR die vier Phase-3-Felder, das Skript merged byte-identisch und validiert strict vor dem Schreiben.

Plan 04-02 produziert ausserdem ein Helper-CLI `scripts/validate-single-dossier.ts`, das in der Wave-2-Migrations-Schleife in Plan 04-03 als Pre-Commit-Gate fuer EIN Dossier verwendet wird. Hintergrund: das bestehende `scripts/validate-richtlinien.ts` validiert ueber alle 11 Dossiers gleichzeitig und unterstuetzt keinen Einzeldatei-Filter; Plan 04-03 braucht aber pro Migrations-Iteration einen schnellen Single-Dossier-Check, der mit dem Projekt-Standard `npx tsx --env-file=.env.local` laeuft (NICHT `node -e require(...)` — TypeScript-Files koennen so nicht geladen werden).

Purpose: D-07 aus CONTEXT.md umsetzen. Das Migrations-Skript ist die einzige technische Voraussetzung fuer Plan 04-03 (FETCH-04: Sample-First-Migration der 11 Dossiers). In dieser Plan-Stufe wird NUR das Skript gebaut + ein einzelner trockener TypeScript-Sanity-Check gemacht — die Live-Migration der Sample-Dossiers passiert in Plan 04-03. Der Helper `validate-single-dossier.ts` wird in derselben Plan-Stufe gebaut, damit Plan 04-03 ohne weiteren Build-Schritt startklar ist (vermeidet eine kuenstliche Wave-Verschiebung).

Output:
- `scripts/migrate-legacy-dossier.ts` (~160-200 Zeilen): CLI mit Pflicht-Argument `<programmId>` und optionalem `--reuse-cached-volltext`-Flag. Liest `data/richtlinien/<id>.json`, fetcht Quellen-Volltext aus `quellen[]`, baut Targeted-Fill-Prompt, ruft `generateJson<TargetedFill>`, merged Bestands + Fill, validiert Strict + FK, schreibt zurueck wenn alles gruen.
- `scripts/validate-single-dossier.ts` (~35-60 Zeilen): CLI mit Pflicht-Argument `<pfad-zum-dossier.json>`. Laedt JSON-Datei, ruft `RichtlinieStrictSchema.safeParse` + `validateForeignKeys`, druckt strukturierte Issues und exit 0 (valide) bzw. exit 1 (ungueltig).
- TypeScript-Compile beider Skripte ist sauber
- KEIN Live-LLM-Lauf in diesem Plan — nur die Tools sind gebaut. Live-Migrationen sind Plan 04-03.
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-CONTEXT.md
@.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md
@.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md
@scripts/extract-richtlinie.ts
@scripts/validate-richtlinien.ts
@lib/wizard/richtlinien-validator.ts
@lib/wizard/richtlinien-schema.ts
@lib/wizard/llm.ts
@data/richtlinien/bmbf-digitalpakt-2.json
@data/richtlinien/ferry-porsche-challenge-2025.json

<interfaces>
<!-- Aus lib/wizard/llm.ts (Z.21-43 + ~Z.80 Export-Liste) -->
```typescript
export type LlmProvider = "deepseek" | "gemini";
export const MODEL_PIPELINE: string;
export const MODEL_INTERVIEW: string;

export interface LlmResult<T> {
  value: T;
  usage: { promptTokens: number; candidatesTokens: number };
}

export function generateJson<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number }
): Promise<LlmResult<T>>;

export function generateText(/* ... */): Promise<LlmResult<string>>;
```

<!-- Aus lib/wizard/richtlinien-validator.ts -->
```typescript
export const RichtlinieStrictSchema: z.ZodObject<...>;
export const RichtlinieLegacySchema: z.ZodObject<...>;

export interface FkIssue {
  programmId: string;
  abschnitt_id: string;
  reason: string;
}

export interface FkCheckable {
  antragsstruktur: { abschnitte?: Array<{ id: string }> };
  vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
}

export function validateForeignKeys(parsed: FkCheckable, programmId: string): FkIssue[];
```

<!-- Aus lib/wizard/richtlinien-schema.ts (Z.90-136) -->
```typescript
export interface BestPractice {
  thema: string;          // min 3 chars per Strict-Schema
  was_funktionierte: string; // min 10 chars per Strict-Schema
  warum?: string;
}
export interface RejectGrund {
  grund: string;             // min 5 chars
  haeufigkeit?: "haeufig" | "gelegentlich";
  vermeidung?: string;
}
export interface VorbildFormulierung {
  abschnitt_id: string;      // FK auf antragsstruktur.abschnitte[].id
  formulierung: string;      // min 20 chars
  kontext?: string;
}
export type FristLogik =
  | { typ: "rolling" }
  | { typ: "fixe_stichtage"; stichtage: string[]; jaehrlich_wiederkehrend?: boolean };

export interface Richtlinie {
  version: string;
  quellen: string[];
  foerderhoehe: Foerderhoehe;
  // ... bestehende Felder ...
  bestPractices?: BestPractice[];
  rejectGruende?: RejectGrund[];
  vorbildFormulierungen?: VorbildFormulierung[];
  fristLogik?: FristLogik;
}
```

<!-- Aus scripts/extract-richtlinie.ts:57-99 (SYSTEM_PROMPT-Vorlage mit Anti-Halluzinations-Block) -->
Der Targeted-Fill-Prompt uebernimmt die REGELN-GEGEN-HALLUZINATION-Bloecke 1:1 und ergaenzt sie um:
"Bestands-Daten in Kontext-Block sind unangreifbar. NICHT widersprechen, NICHT ueberschreiben, NICHTS ausserhalb der vier Zielfelder zurueckgeben."

<!-- Aus scripts/extract-richtlinie.ts:101-123 (fetchOrRead) -->
Wird in migrate-legacy-dossier.ts vereinfacht: nur HTTP-Quellen, gleicher Browser-UA, gleiche stripHtml-Funktion, gleicher 60_000-chars-Slice pro Quelle.

<!-- Aus scripts/validate-richtlinien.ts (Z.37-69 — Pattern fuer das neue Helper-Skript) -->
Das bestehende `validate-richtlinien.ts` laeuft ueber das gesamte Verzeichnis `data/richtlinien/`. Das neue `validate-single-dossier.ts` ist eine schlanke Variante: nimmt EINEN Pfad als Argument und laeuft das gleiche Strict-Schema + FK-Check-Paar genau ein Mal. Beide importieren denselben Validator aus `lib/wizard/richtlinien-validator.ts`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: scripts/migrate-legacy-dossier.ts mit Targeted-Fill-Prompt + Validator-Gate + CLI-Entry anlegen</name>
  <files>scripts/migrate-legacy-dossier.ts (new)</files>
  <read_first>
    - scripts/extract-richtlinie.ts (KOMPLETT, alle 379 Zeilen — das ist die direkte Vorlage. Insbesondere Z.25-32 Imports, Z.57-99 SYSTEM_PROMPT, Z.101-132 fetchOrRead + stripHtml, Z.225-344 runExtraction, Z.317-332 Validator-Gate)
    - lib/wizard/llm.ts (Z.21-43 + Export-Liste — generateJson-Signatur und MODEL_PIPELINE-Konstante)
    - lib/wizard/richtlinien-validator.ts (RichtlinieStrictSchema + validateForeignKeys-Signatur)
    - lib/wizard/richtlinien-schema.ts (Richtlinie-Interface + 4 neue Sub-Interfaces BestPractice/RejectGrund/VorbildFormulierung/FristLogik)
    - data/richtlinien/bmbf-digitalpakt-2.json (Beispiel-Legacy-Dossier — schauen welche Felder fehlen, welche `antragsstruktur.abschnitte[].id`-Werte existieren fuer den FK-Anker)
    - data/richtlinien/ferry-porsche-challenge-2025.json (zweites Beispiel-Legacy-Dossier mit anderem Stil)
    - .planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-PATTERNS.md (Block "scripts/migrate-legacy-dossier.ts" Z.140-238 mit fertigen Code-Bausteinen)
    - CLAUDE.md (Konvention: Sprache deutsch in Logs, Conventional-Commit-Prefix, ASCII in JSON-Datenfeldnamen)
  </read_first>
  <action>
    Datei `scripts/migrate-legacy-dossier.ts` anlegen (Write-Tool, kein heredoc). Inhalt — die Struktur folgt extract-richtlinie.ts, aber vereinfacht: ein Modus, ein CLI-Argument.

    **Pflicht-Struktur (Reihenfolge im File ist verbindlich):**

    1. **Header-Kommentar** (8-15 Zeilen, deutsch):
    ```
    /**
     * Targeted-Fill-Migration eines einzelnen Legacy-Dossiers auf das
     * Phase-3-Strict-Schema (FETCH-04 / D-07).
     *
     * Nutzung:
     *   npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>
     *
     * Vorgehen:
     *   1. data/richtlinien/<id>.json laden (Bestands-Dossier)
     *   2. quellen[] aus dem Dossier fetchen (gleicher UA wie extract-richtlinie.ts)
     *   3. LLM-Aufruf mit Bestands-Daten als Anti-Halluzinations-Kontext
     *      und Anweisung: NUR bestPractices, rejectGruende, vorbildFormulierungen,
     *      fristLogik als JSON zurueckgeben
     *   4. Merge: Bestands-Felder bleiben byte-identisch, vier neue Felder werden
     *      hinzugefuegt, version wird auf today (YYYY-MM-DD) gebumpt
     *   5. Strict-Validator (RichtlinieStrictSchema + validateForeignKeys) als
     *      Pre-Persist-Gate. Bei Verletzung: exit 1, KEIN writeFile.
     *   6. data/richtlinien/<id>.json zurueckschreiben.
     *
     * KEINE Schleife ueber mehrere Dossiers — Sample-First-Pattern (D-09) verlangt
     * dass Plan 04-03 jedes Dossier in einem eigenen Commit migriert.
     */
    ```

    2. **Imports** (exakt diese Liste, in dieser Reihenfolge):
    ```typescript
    import fs from "node:fs/promises";
    import path from "node:path";
    import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
    import {
      RichtlinieStrictSchema,
      validateForeignKeys,
    } from "../lib/wizard/richtlinien-validator";
    import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

    const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
    const MAX_TEXT_CHARS_PER_SOURCE = 60_000;
    ```

    3. **`fetchOrRead`** — 1:1 von `extract-richtlinie.ts:101-123` kopieren (gleicher Browser-UA, gleiche stripHtml-Funktion). Kein Import aus extract-richtlinie.ts — bewusste Duplikation, weil Plan 04 die Refaktorierung in `scripts/auto-pflege-step.ts` macht und Plan 02 davon entkoppelt sein soll.

    4. **`stripHtml`** — 1:1 von `extract-richtlinie.ts:125-132`.

    5. **`SYSTEM_PROMPT`** — neu, aber strukturell parallel zu extract-richtlinie.ts:57-99. Pflicht-Inhalt:
    ```typescript
    const SYSTEM_PROMPT = `Du erweiterst ein bestehendes Foerderrichtlinien-Dossier um VIER neue Felder. Alle BESTEHENDEN Felder bleiben unveraendert — du widersprichst NICHT, ueberschreibst NICHT, ergaenzt NICHTS ausserhalb der vier Zielfelder.

    Sprache: deutsch. Identifier-Konvention: ASCII in JSON-Schluesseln, Umlaute (ae/oe/ue/ss) in Werten erlaubt.

    ZIELFELDER (alle vier MUESSEN geliefert werden, leeres Array ist erlaubt wenn die Quelle nichts hergibt):

    {
      "bestPractices": [
        { "thema": "...", "was_funktionierte": "...", "warum"?: "..." }
      ],
      "rejectGruende": [
        { "grund": "...", "haeufigkeit"?: "haeufig" | "gelegentlich", "vermeidung"?: "..." }
      ],
      "vorbildFormulierungen": [
        { "abschnitt_id": "id-aus-antragsstruktur.abschnitte", "formulierung": "...", "kontext"?: "..." }
      ],
      "fristLogik": { "typ": "rolling" } | { "typ": "fixe_stichtage", "stichtage": ["YYYY-MM-DD", ...], "jaehrlich_wiederkehrend"?: true|false }
    }

    KONTEXT-DATEN sind unangreifbar:
    - Das Bestands-Dossier kommt im User-Prompt unter "BESTAND". NICHT widersprechen, NICHT ueberschreiben, NICHT in dein Output uebernehmen.
    - Die Volltexte unter "VOLLTEXT" sind die einzige zulaessige Quelle fuer Werte in den vier Zielfeldern.

    REGELN GEGEN HALLUZINATION (kritisch — befolge sie strikt):
    - Wenn die Richtlinie keine Best-Practices, Reject-Gruende oder Vorbild-Formulierungen explizit nennt: leeres Array. Erfinde NICHTS.
    - bestPractices und vorbildFormulierungen MUESSEN aus dem gelieferten Volltext belegbar sein, NICHT aus Allgemeinwissen ueber Foerderverfahren.
    - vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus dem BESTAND-Block antragsstruktur.abschnitte[].id entsprechen. Validator prueft das hart.
    - thema mindestens 3 Zeichen, was_funktionierte mindestens 10, grund mindestens 5, formulierung mindestens 20 — sonst lass den Eintrag weg.
    - stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10".
    - Maximal 5 Eintraege pro bestPractices/rejectGruende/vorbildFormulierungen.
    - Wenn die Quelle eine Frist erwaehnt aber kein konkretes Datum (z. B. "jedes Jahr im Sommer"): fristLogik.typ = "rolling".
    - Wenn unsicher: lieber leere Liste als Erfindung.

    Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;
    ```

    6. **`migrate(programmId)`-Funktion** — Pflicht-Schritte in dieser Reihenfolge:
       1. Bestands-Dossier laden: `const existing: Richtlinie = JSON.parse(await fs.readFile(path.join(OUT_DIR, programmId + ".json"), "utf8"));`
       2. Falls schon strict-konform (alle vier neue Felder vorhanden mit Mindest-Laenge): exit 0 mit Log "bereits migriert, skip". Diese Idempotenz-Pruefung verhindert versehentliche Re-Migration im Plan 04-03 Vollmigrationslauf.
       3. Quellen fetchen: `for (const q of existing.quellen) { const { text } = await fetchOrRead(q); ... }`. Wenn `existing.quellen.length === 0`: Fehler `process.exit(4)` "Programm hat keine quellen[] im Bestands-Dossier — manuell ergaenzen vor Migration".
       4. User-Prompt bauen:
       ```typescript
       const userPrompt = `PROGRAMM-ID: ${programmId}
       HEUTE: ${new Date().toISOString().slice(0, 10)}

       BESTAND (Anti-Halluzinations-Anker — NICHT widersprechen, NICHT ueberschreiben):
       ${JSON.stringify(existing, null, 2)}

       VOLLTEXT der Quellen (ggf. gekuerzt):
       ${texte.join("\n\n---\n\n")}

       Liefere die vier Zielfelder als JSON-Objekt zurueck.`;
       ```
       5. LLM-Call mit `maxTokens: 4000` (kleiner als extract weil nur 4 Felder):
       ```typescript
       let fill: { bestPractices: unknown; rejectGruende: unknown; vorbildFormulierungen: unknown; fristLogik: unknown };
       let llmUsage = { promptTokens: 0, candidatesTokens: 0 };
       try {
         const llmResult = await generateJson<typeof fill>(
           MODEL_PIPELINE,
           SYSTEM_PROMPT,
           userPrompt,
           { maxTokens: 4000 }
         );
         fill = llmResult.value;
         llmUsage = llmResult.usage;
       } catch (err) {
         console.error(`LLM-Aufruf fehlgeschlagen: ${(err as Error).message}`);
         process.exit(3);
       }
       ```
       6. Merge: `const merged: Richtlinie = { ...existing, ...fill, version: new Date().toISOString().slice(0, 10) };`
          (das `...fill`-Spread ueberschreibt nur die vier Zielfelder, alle anderen Felder bleiben byte-identisch zum Bestand. Plus version-Bump auf heute.)
       7. Strict-Validator + FK-Check (1:1 aus extract-richtlinie.ts:317-332 kopieren):
       ```typescript
       const strictParse = RichtlinieStrictSchema.safeParse(merged);
       if (!strictParse.success) {
         console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
         for (const issue of strictParse.error.issues) {
           console.error(`    ${issue.path.join(".")}: ${issue.message}`);
         }
         process.exit(1);
       }
       const fkIssues = validateForeignKeys(merged as never, programmId);
       if (fkIssues.length > 0) {
         console.error(`==> FK-Verletzungen fuer ${programmId}:`);
         for (const issue of fkIssues) {
           console.error(`    ${issue.abschnitt_id}: ${issue.reason}`);
         }
         process.exit(1);
       }
       ```
       8. Schreiben:
       ```typescript
       await fs.writeFile(
         path.join(OUT_DIR, `${programmId}.json`),
         JSON.stringify(merged, null, 2) + "\n"
       );
       console.log(`==> Migriert: data/richtlinien/${programmId}.json`);
       console.log(`    Tokens: ${llmUsage.promptTokens} in + ${llmUsage.candidatesTokens} out`);
       console.log(`    Felder: bestPractices=${(merged.bestPractices ?? []).length}, rejectGruende=${(merged.rejectGruende ?? []).length}, vorbildFormulierungen=${(merged.vorbildFormulierungen ?? []).length}, fristLogik=${merged.fristLogik?.typ}`);
       console.log(`\nBITTE REVIEW: Dossier mit Originalrichtlinie abgleichen bevor commit.\n`);
       ```

    7. **`main()`**:
    ```typescript
    async function main() {
      const args = process.argv.slice(2);
      const [programmId] = args;
      if (!programmId) {
        console.error("Nutzung: npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts <programmId>");
        console.error("Beispiel: npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts bmbf-digitalpakt-2");
        process.exit(2);
      }
      await migrate(programmId);
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
    ```

    8. **Idempotenz-Check** (Detail zu Schritt 2 oben). Bevor LLM-Call: check ob `existing.bestPractices && existing.bestPractices.length > 0 && existing.rejectGruende && existing.rejectGruende.length > 0 && existing.vorbildFormulierungen && existing.vorbildFormulierungen.length > 0 && existing.fristLogik` — wenn ja: `console.log("Bereits migriert, skip."); return;`. Damit verhindern wir, dass Plan 04-03 ein bereits migriertes Dossier nochmal mit einem LLM-Call ueberschreibt.

    Schritt 8 — KEIN Live-Lauf in diesem Plan. Plan 02 baut nur das Tool. Plan 03 ruft es auf.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsc --noEmit scripts/migrate-legacy-dossier.ts &amp;&amp; grep -c 'generateJson' scripts/migrate-legacy-dossier.ts &amp;&amp; grep -c 'RichtlinieStrictSchema' scripts/migrate-legacy-dossier.ts &amp;&amp; grep -c 'validateForeignKeys' scripts/migrate-legacy-dossier.ts &amp;&amp; grep -c 'BESTAND' scripts/migrate-legacy-dossier.ts &amp;&amp; grep -c 'Bereits migriert' scripts/migrate-legacy-dossier.ts &amp;&amp; ! grep -E '@google/generative-ai|^import OpenAI' scripts/migrate-legacy-dossier.ts &amp;&amp; npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts; test $? -eq 2
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `scripts/migrate-legacy-dossier.ts` existiert mit mindestens 160 Zeilen (`wc -l` mindestens 160)
    - `grep -c "import.*lib/wizard/llm" scripts/migrate-legacy-dossier.ts` liefert genau 1
    - `grep -c "import.*lib/wizard/richtlinien-validator" scripts/migrate-legacy-dossier.ts` liefert genau 1
    - `grep -E "^import.*@google/generative-ai|^import OpenAI" scripts/migrate-legacy-dossier.ts` matched NICHTS (kein direkter SDK-Import)
    - `grep -c "MODEL_PIPELINE" scripts/migrate-legacy-dossier.ts` liefert mindestens 1
    - `grep -c "generateJson" scripts/migrate-legacy-dossier.ts` liefert mindestens 1
    - `grep -c "RichtlinieStrictSchema.safeParse" scripts/migrate-legacy-dossier.ts` liefert mindestens 1
    - `grep -c "validateForeignKeys" scripts/migrate-legacy-dossier.ts` liefert mindestens 1
    - `grep -c "BESTAND" scripts/migrate-legacy-dossier.ts` liefert mindestens 2 (im SYSTEM_PROMPT und im userPrompt-Template)
    - `grep -c "Bereits migriert" scripts/migrate-legacy-dossier.ts` liefert mindestens 1 (Idempotenz-Schutz)
    - `grep -c "process.exit" scripts/migrate-legacy-dossier.ts` liefert mindestens 4 (Exit-Codes 1, 2, 3, 4 fuer Schema/Nutzungsfehler/LLM/Quellen-Fehler)
    - `grep -c 'maxTokens: 4000' scripts/migrate-legacy-dossier.ts` liefert genau 1 (kleinerer Budget als extract-richtlinie weil nur 4 Felder)
    - `npx tsc --noEmit scripts/migrate-legacy-dossier.ts` exit 0
    - Aufruf ohne Argument: `npx tsx --env-file=.env.local scripts/migrate-legacy-dossier.ts` exit 2 (Nutzungs-Fehler) und druckt eine Zeile beginnend mit "Nutzung:"
    - `git status data/richtlinien/` zeigt KEINE Mods (Plan 02 macht keinen Live-Lauf, keine Dossier-Aenderungen)
  </acceptance_criteria>
  <done>
    Das Migrationsskript ist gebaut, TypeScript-sauber, importiert nur ueber die llm.ts-Wrapper-Schicht, hat das Validator-Gate vor dem writeFile, und hat einen Idempotenz-Schutz fuer bereits migrierte Dossiers. Es macht KEINEN Live-Migrationslauf — Plan 03 ruft es fuer Sample-First (bmbf-digitalpakt-2 + ferry-porsche-challenge-2025) und danach die restlichen 9 auf.
  </done>
</task>

<task type="auto">
  <name>Task 2: scripts/validate-single-dossier.ts neu — Helper-CLI fuer Strict-Validierung eines einzelnen Dossier-Pfads</name>
  <files>scripts/validate-single-dossier.ts (new)</files>
  <read_first>
    - scripts/validate-richtlinien.ts (KOMPLETT — Verzeichnis-Scan-Variante, Vorlage fuer das Single-File-Pattern)
    - lib/wizard/richtlinien-validator.ts (RichtlinieStrictSchema + validateForeignKeys + FkCheckable)
    - CLAUDE.md (Konvention: Sprache deutsch, ASCII in Identifiers)
  </read_first>
  <action>
    Hintergrund: Plan 04-03 ruft pro Migrations-Iteration (11x) einen Single-Dossier-Validator-Check auf. `validate-richtlinien.ts` ist auf den gesamten `data/richtlinien/`-Ordner hardcoded und kennt keinen Pfad-Filter — fuer 11 Sequential-Checks waere das zu teuer (jeder Lauf laedt das gesamte Verzeichnis). Ausserdem MUESSEN die Migrations-Schleifen in Plan 04-03 mit `npx tsx --env-file=.env.local` arbeiten (Projekt-Konvention aus CLAUDE.md). Ein Inline-`node -e "require(...)"` waere ein Bruch der Konvention UND wuerde wegen TypeScript-Files crashen.

    Loesung: Schlankes Helper-CLI, das genau ein Dossier per Pfad-Argument validiert.

    Datei `scripts/validate-single-dossier.ts` neu anlegen (Write-Tool). Inhalt:

    ```typescript
    /**
     * Helper-CLI: validiert genau ein Richtlinien-Dossier (Strict-Modus + FK-Check).
     *
     * Nutzung:
     *   npx tsx scripts/validate-single-dossier.ts <pfad/zum/dossier.json>
     *
     * Exit-Codes:
     *   0  -> Dossier valide (Strict-Schema + FK gruen)
     *   1  -> Mindestens eine Verletzung (Output: Tab-separierte Zeilen + Aggregat)
     *   2  -> Nutzungs-Fehler (kein Argument / Datei nicht gefunden)
     *
     * Wiederverwendung: Plan 04-03 ruft dieses Skript in der Migrations-Schleife
     * pro Dossier auf, statt das langsamere validate-richtlinien.ts mit
     * Verzeichnis-Scan zu nutzen. KEIN `node -e "require(...)"` mit
     * TypeScript-Files — der Projekt-Standard ist `npx tsx --env-file=.env.local`
     * (CLAUDE.md, scripts-Konvention).
     */

    import * as fs from "fs";
    import * as path from "path";
    import {
      RichtlinieStrictSchema,
      validateForeignKeys,
      type FkCheckable,
    } from "../lib/wizard/richtlinien-validator";

    function printIssue(programmId: string, feld: string, fehler: string): void {
      console.log(`${programmId}\t${feld}\t${fehler}`);
    }

    async function main() {
      const args = process.argv.slice(2);
      const [filePath] = args;
      if (!filePath) {
        console.error("Nutzung: npx tsx scripts/validate-single-dossier.ts <pfad/zum/dossier.json>");
        console.error("Beispiel: npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json");
        process.exit(2);
      }

      const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      if (!fs.existsSync(absPath)) {
        console.error(`Datei nicht gefunden: ${absPath}`);
        process.exit(2);
      }

      const programmId = path.basename(absPath, ".json");
      let parsed: unknown;
      try {
        parsed = JSON.parse(fs.readFileSync(absPath, "utf8"));
      } catch (err) {
        printIssue(programmId, "<json>", `JSON-Parse-Fehler: ${(err as Error).message}`);
        process.exit(1);
      }

      let issueCount = 0;

      const strict = RichtlinieStrictSchema.safeParse(parsed);
      if (!strict.success) {
        for (const z of strict.error.issues) {
          printIssue(programmId, z.path.join("."), z.message);
          issueCount++;
        }
      }

      // FK-Check nur sinnvoll, wenn das Objekt grundsaetzlich die richtige Struktur hat.
      // Bei Strict-Fehlern ist parsed ggf. nicht FkCheckable — `as never` analog zu
      // extract-richtlinie.ts:325 und validate-richtlinien.ts:60.
      if (parsed && typeof parsed === "object") {
        for (const fk of validateForeignKeys(parsed as never as FkCheckable, programmId)) {
          printIssue(programmId, `vorbildFormulierungen[abschnitt_id=${fk.abschnitt_id}]`, fk.reason);
          issueCount++;
        }
      }

      if (issueCount === 0) {
        console.log(`OK\t${programmId}\tStrict-Schema + FK gruen`);
        process.exit(0);
      } else {
        console.error(`==> ${issueCount} Verletzung(en) in ${programmId}`);
        process.exit(1);
      }
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
    ```

    Verifikations-Plan:
    - TypeScript compiliert sauber.
    - Aufruf ohne Argument → exit 2 mit "Nutzung:"-Hilfe.
    - Aufruf mit nicht-existierendem Pfad → exit 2 mit "Datei nicht gefunden".
    - Aufruf gegen ein Legacy-Dossier (z.B. `data/richtlinien/bmbf-digitalpakt-2.json`) VOR der Phase-4-Migration → exit 1 mit Tab-separierten Issue-Zeilen (mind. 4 fehlende neue Felder).
    - Aufruf gegen ein Dossier, das `validate-richtlinien.ts --legacy` passiert, wird in dieser Plan-Stufe NICHT live ausgefuehrt — der Test passiert in Plan 04-03 nach jeder Migrations-Iteration.

    KEIN Aufruf des Helpers in dieser Plan-Stufe gegen ein noch-migriertes Dossier — der Smoke-Test ist Teil von Plan 04-03 Task 2.
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; npx tsc --noEmit scripts/validate-single-dossier.ts &amp;&amp; grep -c "RichtlinieStrictSchema" scripts/validate-single-dossier.ts &amp;&amp; grep -c "validateForeignKeys" scripts/validate-single-dossier.ts &amp;&amp; grep -c "process.exit" scripts/validate-single-dossier.ts &amp;&amp; npx tsx scripts/validate-single-dossier.ts; test $? -eq 2 &amp;&amp; npx tsx scripts/validate-single-dossier.ts /tmp/nichtexistierende-datei.json; test $? -eq 2 &amp;&amp; npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json; test $? -eq 1
    </automated>
  </verify>
  <acceptance_criteria>
    - Datei `scripts/validate-single-dossier.ts` existiert mit mindestens 35 Zeilen
    - `grep -c "import.*lib/wizard/richtlinien-validator" scripts/validate-single-dossier.ts` liefert genau 1
    - `grep -c "RichtlinieStrictSchema" scripts/validate-single-dossier.ts` liefert mindestens 1
    - `grep -c "validateForeignKeys" scripts/validate-single-dossier.ts` liefert mindestens 1
    - `grep -c "process.exit(0)" scripts/validate-single-dossier.ts` liefert mindestens 1 (Erfolgs-Exit)
    - `grep -c "process.exit(1)" scripts/validate-single-dossier.ts` liefert mindestens 1 (Verletzungs-Exit)
    - `grep -c "process.exit(2)" scripts/validate-single-dossier.ts` liefert mindestens 1 (Nutzungs-Fehler-Exit)
    - `npx tsc --noEmit scripts/validate-single-dossier.ts` exit 0
    - Aufruf ohne Argument: exit 2 + "Nutzung:" auf stderr
    - Aufruf mit nicht-existierendem Pfad: exit 2 + "Datei nicht gefunden" auf stderr
    - Aufruf gegen ein unmigriertes Dossier (z.B. `data/richtlinien/bmbf-digitalpakt-2.json`): exit 1 (Strict-Fehler werden gemeldet, weil die vier neuen Felder noch nicht da sind)
    - `git status data/richtlinien/` zeigt KEINE Mods (Helper liest nur, schreibt nichts)
  </acceptance_criteria>
  <done>
    Helper-Validator-Skript ist gebaut, TypeScript-sauber, importiert ueber die richtlinien-validator.ts-Schicht, hat saubere Exit-Codes 0/1/2 und ist von Plan 04-03 nutzbar via `npx tsx --env-file=.env.local scripts/validate-single-dossier.ts <pfad>`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Commit der zwei Plan-04-02-Skripte (atomare Zwischenstufe)</name>
  <files>scripts/migrate-legacy-dossier.ts, scripts/validate-single-dossier.ts (committed)</files>
  <read_first>
    - scripts/migrate-legacy-dossier.ts (gerade angelegt)
    - scripts/validate-single-dossier.ts (gerade angelegt)
    - CLAUDE.md (Commit-Konvention: Conventional-Prefix, deutscher Body)
  </read_first>
  <action>
    Schritt 1 — git status sanity-check:
    ```bash
    cd /home/kolja/edufunds-app
    git status --short scripts/migrate-legacy-dossier.ts scripts/validate-single-dossier.ts
    # Erwartung: "?? scripts/migrate-legacy-dossier.ts" und "?? scripts/validate-single-dossier.ts"
    ```

    Schritt 2 — Atomar adden + committen (BEIDE Skripte in einem Commit — sie gehoeren zu Plan 04-02 zusammen, validate-single-dossier.ts ist Voraussetzung fuer Plan 04-03 Migrations-Schleifen):
    ```bash
    cd /home/kolja/edufunds-app
    git add scripts/migrate-legacy-dossier.ts scripts/validate-single-dossier.ts
    git commit -m "$(cat <<'EOF'
    feat(scripts): migrate-legacy-dossier + validate-single-dossier Helper

    Plan 04-02 (D-07): Neues CLI fuer Migration eines einzelnen Legacy-Dossiers
    auf das Phase-3-Strict-Schema (4 neue Felder bestPractices / rejectGruende /
    vorbildFormulierungen / fristLogik).

    Bestands-Daten als Anti-Halluzinations-Kontext, LLM darf nur die 4 Zielfelder
    liefern, Merge ist byte-identisch fuer alle anderen Felder. Strict-Validator
    + FK-Check als Pre-Persist-Gate (Phase-3-Pattern aus extract-richtlinie.ts).

    Idempotenz-Schutz: bereits migrierte Dossiers werden ohne LLM-Call uebersprungen.

    Zusaetzlich: scripts/validate-single-dossier.ts als schlankes Helper-CLI fuer
    Einzeldossier-Strict-Validierung (Pfad-Argument, exit 0/1/2). Wird von Plan
    04-03 Migrations-Schleifen via `npx tsx --env-file=.env.local` aufgerufen
    (Projekt-Konvention) — vermeidet das fehlerhafte `node -e require(...)`-Pattern
    aus dem urspruenglichen Plan-04-03-Entwurf, das mit TypeScript-Files crashen
    wuerde.

    Live-Migration der 11 Dossiers folgt in Plan 04-03 (Sample-First mit
    bmbf-digitalpakt-2 + ferry-porsche-challenge-2025, dann Rest).
    EOF
    )"
    ```

    Schritt 3 — Post-Commit-Verifikation:
    ```bash
    cd /home/kolja/edufunds-app
    git log -1 --stat
    git diff --quiet  # exit 0 erwartet
    ```
  </action>
  <verify>
    <automated>
      cd /home/kolja/edufunds-app &amp;&amp; git log -1 --pretty=%s | grep -E '^feat\(scripts\)' &amp;&amp; git log -1 --pretty=%b | grep -q "Plan 04-02" &amp;&amp; git log -1 --pretty=%b | grep -q "D-07" &amp;&amp; git log -1 --name-only | grep -q "scripts/migrate-legacy-dossier.ts" &amp;&amp; git log -1 --name-only | grep -q "scripts/validate-single-dossier.ts" &amp;&amp; git diff --quiet
    </automated>
  </verify>
  <acceptance_criteria>
    - `git log -1 --pretty=%s` matched Regex `^feat\(scripts\)`
    - `git log -1 --pretty=%b` enthaelt "Plan 04-02" UND "D-07"
    - `git log -1 --name-only` enthaelt sowohl `scripts/migrate-legacy-dossier.ts` als auch `scripts/validate-single-dossier.ts`
    - `git log -1 --name-only` enthaelt KEINE anderen Files (kein scope-creep, kein Mit-Commit fremder Aenderungen)
    - `git diff --quiet` exit 0 (working-tree clean)
    - `git diff HEAD~1 HEAD --stat` zeigt 2 files changed
  </acceptance_criteria>
  <done>
    Plan 04-02 ist in einem atomaren Commit dokumentiert. Plan 03 kann ohne weiteren Build-Schritt sowohl das Migrations-Skript als auch den Validator-Helper live aufrufen.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Lokales Skript → DeepSeek/Gemini API | LLM-Call mit DEEPSEEK_API_KEY aus .env.local — Token ist sensibel, niemals in Logs persistiert |
| LLM-Output → data/richtlinien/<id>.json | LLM liefert JSON, das ohne menschliche Pruefung in den Repo geschrieben wird — strict-Validator-Gate ist die Pflicht-Defense |
| Helper-CLI → File-System | validate-single-dossier.ts liest beliebige Pfade — Pfad-Argument ist Operator-Input, kein User-Input ueber Netz |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-06 | T (Tampering) | LLM-Output landet in JSON-Datei | mitigate | Strict-Validator + FK-Check als Pre-Persist-Gate. exit 1 bei Verletzung, kein writeFile. Phase-3-Pattern. |
| T-04-07 | I (Information Disclosure) | DEEPSEEK_API_KEY-Leakage im Log | mitigate | Skript loggt nur llmResult.usage (Token-Counts), nie API-Key. lib/wizard/llm.ts ist die Wrapper-Schicht, Skript hat keinen direkten SDK-Zugriff. Acceptance-Check `! grep -E '@google/generative-ai|^import OpenAI'`. |
| T-04-08 | T (Tampering) | LLM ueberschreibt Bestands-Felder | mitigate | SYSTEM_PROMPT-Block "BESTAND ist unangreifbar". Output-Type ist auf {bestPractices, rejectGruende, vorbildFormulierungen, fristLogik} eingegrenzt. Merge mit `{ ...existing, ...fill }` schuetzt vor Cross-Field-Drift (fill kann nur die vier Schluessel haben — andere Schluessel im fill-Output werden vom Type-System sichtbar als Fehler, im Strict-Schema ggf. von passthrough akzeptiert aber nicht ausgenutzt). |
| T-04-09 | E (Elevation) | LLM kann beliebigen JSON-Output liefern | mitigate | maxTokens: 4000 begrenzt Output. Wenn LLM falsches Format liefert: generateJson<T> wirft (entweder JSON-Parse-Error oder Type-Mismatch) → exit 3, kein writeFile. |
| T-04-10 | R (Repudiation) | Migration ohne Audit-Trail | accept | Git-Commit pro Dossier in Plan 04-03 ist der Audit-Trail. Plus version-Bump auf YYYY-MM-DD im Dossier dokumentiert den Migrations-Zeitpunkt. |
| T-04-25 | I (Information Disclosure) | validate-single-dossier.ts liest beliebige Pfade | accept | Helper laeuft nur lokal, Pfad-Argument ist Operator-Input. Kein Netz-Endpoint, kein User-Input. Read-only Operation, kein writeFile. |
</threat_model>

<verification>
1. **Type-Sanity:** `npx tsc --noEmit scripts/migrate-legacy-dossier.ts scripts/validate-single-dossier.ts` exit 0
2. **No-SDK-Direct-Import:** `grep -E '@google/generative-ai|^import OpenAI' scripts/migrate-legacy-dossier.ts` matched nichts
3. **Library-Use:** `grep -c "from \"../lib/wizard/llm\"" scripts/migrate-legacy-dossier.ts` >= 1
4. **Validator-Gate:** `grep -c "RichtlinieStrictSchema.safeParse" scripts/migrate-legacy-dossier.ts` >= 1 UND erscheint VOR `fs.writeFile` (Code-Order-Pruefung)
5. **Idempotenz-Schutz:** Skript bricht ohne LLM-Call ab, wenn Dossier bereits alle vier neuen Felder hat
6. **CLI-Verhalten Migration:** ohne Argument exit 2 mit "Nutzung:"-Output
7. **CLI-Verhalten Helper:** ohne Argument exit 2 + nicht-existierender Pfad exit 2 + unmigriertes Dossier exit 1
8. **Atomarer Commit:** beide Files in einem commit, keine fremden Files, Conventional-Prefix, Plan-04-02 + D-07 in der Body
</verification>

<success_criteria>
Plan 04-02 ist erfolgreich abgeschlossen, wenn:

- [ ] `scripts/migrate-legacy-dossier.ts` existiert mit den oben definierten Code-Bloecken
- [ ] `scripts/validate-single-dossier.ts` existiert mit den oben definierten Code-Bloecken
- [ ] TypeScript-Compile beider Skripte gruen
- [ ] Migrations-Skript importiert KEINEN direkten LLM-SDK (nur ueber lib/wizard/llm.ts-Wrapper)
- [ ] Migrations-Skript hat Strict-Validator + FK-Check als Pre-Persist-Gate
- [ ] Migrations-Skript hat Idempotenz-Schutz fuer bereits-migrierte Dossiers
- [ ] Migrations-Skript hat CLI-Pflicht-Argument <programmId> und exit 2 ohne Argument
- [ ] Helper-Skript validate-single-dossier.ts hat saubere Exit-Codes 0/1/2 und kann von Plan 04-03 als Pre-Commit-Gate aufgerufen werden
- [ ] Atomar committed mit Conventional-Prefix, Plan-04-02 + D-07 im Body, beide Files im selben Commit
- [ ] `git diff --quiet` exit 0
- [ ] KEIN data/richtlinien/-File ist modifiziert (Plan 03 macht die Live-Migration)
</success_criteria>

<output>
Nach Abschluss: `.planning/phases/04-programm-pflege-vollautomation-dossier-migration/04-02-migrate-legacy-dossier-script-SUMMARY.md` schreiben mit:
- Pfade zu beiden Skripten + Zeilenanzahlen
- Welche Code-Bloecke 1:1 aus extract-richtlinie.ts dupliziert wurden (mit Begruendung warum kein Refactor — Plan 04 macht den Konsumenten-Switch in auto-pflege-step.ts)
- Begruendung warum `scripts/validate-single-dossier.ts` als Helper-CLI angelegt wurde (statt Inline-`node -e require(...)` in Plan 04-03 — TypeScript-Files koennen so nicht geladen werden, und Projekt-Standard ist `npx tsx`)
- Pflicht-Hinweis fuer Plan 04-03: Sample-First mit `bmbf-digitalpakt-2` + `ferry-porsche-challenge-2025` BEVOR die anderen 9 Dossiers laufen — Review-Gate
- Erwartete LLM-Kosten pro Aufruf (4000 Output-Tokens × DeepSeek-Preis = ~0.04¢) × 11 = ~0.5¢ gesamt fuer FETCH-04
</output>
