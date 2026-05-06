---
phase: 03-programm-pflege-foundation
plan: 02
type: execute
wave: 2
depends_on: ["03-01"]
files_modified:
  - scripts/extract-richtlinie.ts
  - scripts/scan-new-programs.ts
  - scripts/validate-richtlinien.ts
  - __tests__/scripts/extract-richtlinie.test.ts
  - __tests__/scripts/scan-new-programs.test.ts
autonomous: true
requirements:
  - FETCH-01
  - FETCH-03

must_haves:
  truths:
    - "scripts/extract-richtlinie.ts ruft generateJson aus lib/wizard/llm.ts (kein @google/generative-ai-Import mehr)"
    - "scripts/scan-new-programs.ts ruft generateJson analog (MODEL_INTERVIEW)"
    - "SYSTEM_PROMPT in extract-richtlinie.ts erweitert um die 4 neuen Felder + Anti-Halluzinations-Block (Pattern aus Bug-#2-Fix)"
    - "Validator-Aufruf VOR Persist im extract-Skript blockt malformed Dossiers"
    - "scripts/validate-richtlinien.ts existiert mit --legacy-Flag, exit 0 fuer 11 Legacy-Dossiers im --legacy-Modus, greppable Output"
    - "Static-Grep-Tests verifizieren beide Skripte korrekt migriert sind"
  artifacts:
    - path: "scripts/extract-richtlinie.ts"
      provides: "Cron-Skript fuer Dossier-Extraktion via Wrapper, mit erweitertem Prompt + Validator-Pre-Persist"
      contains: "generateJson"
    - path: "scripts/scan-new-programs.ts"
      provides: "Cron-Skript fuer Programm-Scanner via Wrapper"
      contains: "generateJson"
    - path: "scripts/validate-richtlinien.ts"
      provides: "CLI-Validator mit --legacy-Flag, greppable Output, Exit-Code 1 bei Verletzung"
      exports: []
    - path: "__tests__/scripts/extract-richtlinie.test.ts"
      provides: "Static-Grep-Tests fuer Migrations-Konformitaet"
      min_lines: 30
    - path: "__tests__/scripts/scan-new-programs.test.ts"
      provides: "Static-Grep-Tests analog scan-Skript"
      min_lines: 25
  key_links:
    - from: "scripts/extract-richtlinie.ts"
      to: "lib/wizard/llm.ts"
      via: "import generateJson, MODEL_PIPELINE from ../lib/wizard/llm"
      pattern: "generateJson<Richtlinie>"
    - from: "scripts/extract-richtlinie.ts"
      to: "lib/wizard/richtlinien-validator.ts"
      via: "RichtlinieStrictSchema.safeParse + validateForeignKeys"
      pattern: "RichtlinieStrictSchema\\.safeParse"
    - from: "scripts/validate-richtlinien.ts"
      to: "data/richtlinien/*.json"
      via: "fs.readdirSync glob + JSON.parse + Schema-Check pro File"
      pattern: "fs\\.readdirSync"
---

<objective>
Cron-Skripte auf den `lib/wizard/llm.ts`-Wrapper migrieren, SYSTEM_PROMPT fuer die 4 neuen Felder erweitern (Anti-Halluzinations-Block uebernommen aus dem Bug-#2-Fix-Pattern), Validator-Aufruf vor Persist einbauen, und einen neuen CLI-Validator fuer `data/richtlinien/*.json` mit `--legacy`-Flag bereitstellen. Static-Grep-Tests garantieren die Migrations-Konformitaet.

Purpose: FETCH-01 (Wrapper-Migration) + FETCH-03 (Prompt-Erweiterung + Runtime-Check vor Persist + CLI-Validator). Das ist die mechanisch dichteste Plan-Stufe — nach Abschluss kann Plan 03-03 die Workflows umstellen.
Output: 2 migrierte Cron-Skripte + 1 neuer CLI-Validator + 2 statische Test-Files.
</objective>

<execution_context>
@/home/kolja/.claude/get-shit-done/workflows/execute-plan.md
@/home/kolja/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-programm-pflege-foundation/03-CONTEXT.md
@.planning/phases/03-programm-pflege-foundation/03-RESEARCH.md
@.planning/phases/03-programm-pflege-foundation/03-PATTERNS.md
@.planning/phases/03-programm-pflege-foundation/03-VALIDATION.md
@.planning/phases/03-programm-pflege-foundation/03-01-SUMMARY.md
@CLAUDE.md
@lib/wizard/llm.ts
@lib/wizard/richtlinien-schema.ts
@lib/wizard/richtlinien-validator.ts
@scripts/extract-richtlinie.ts
@scripts/scan-new-programs.ts
@scripts/validate-data.ts
@__tests__/lib/wizard/matcher.dispatch.test.ts

<interfaces>
<!-- Schluessel-Exports aus lib/wizard/llm.ts und lib/wizard/richtlinien-validator.ts, die wir konsumieren. -->

From lib/wizard/llm.ts:

```
export const MODEL_INTERVIEW: string;
export const MODEL_PIPELINE: string;
export interface LlmResult<T> { value: T; usage: { promptTokens: number; candidatesTokens: number }; }
export interface LlmOptions { maxTokens?: number; }
export async function generateJson<T>(model: string, system: string, user: string, opts?: LlmOptions): Promise<LlmResult<T>>;
```

From lib/wizard/richtlinien-validator.ts (Plan 03-01):

```
export const RichtlinieStrictSchema: z.ZodTypeAny;
export const RichtlinieLegacySchema: z.ZodTypeAny;
export interface FkIssue { programmId: string; abschnitt_id: string; reason: string; }
export function validateForeignKeys(parsed: { antragsstruktur: { abschnitte: Array<{ id: string }> }; vorbildFormulierungen?: Array<{ abschnitt_id: string }> }, programmId: string): FkIssue[];
```

From scripts/extract-richtlinie.ts (aktueller Stand — relevante Stellen, die migriert werden):

- Z.27: `import { GoogleGenerativeAI } from "@google/generative-ai";` -> ENTFERNEN
- Z.30: `const MODEL = "gemini-2.5-pro";` -> ENTFERNEN
- Z.207-211: API-Key-Check `process.env.GEMINI_API_KEY` -> ENTFERNEN
- Z.235-242: `getGenerativeModel(...).generateContent(userPrompt)` -> ERSETZEN durch `generateJson<Richtlinie>(MODEL_PIPELINE, ...)`
- Z.303-309: usageMetadata-Logging -> ERSETZEN durch `result.usage.promptTokens / candidatesTokens`
- Z.53-83: SYSTEM_PROMPT -> ERWEITERN um 4 neue Felder + Anti-Halluzinations-Block

</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: extract-richtlinie.ts auf llm.ts-Wrapper migrieren + SYSTEM_PROMPT erweitern + Validator-Pre-Persist</name>
  <files>scripts/extract-richtlinie.ts, __tests__/scripts/extract-richtlinie.test.ts</files>
  <read_first>
    - scripts/extract-richtlinie.ts (gesamtes File — wir editieren mehrere Stellen: Imports, MODEL-Konstante entfernen, SYSTEM_PROMPT erweitern, API-Key-Check entfernen, LLM-Call ersetzen, Validator-Aufruf einfuegen, Usage-Logging anpassen)
    - lib/wizard/llm.ts (Wrapper-API, insb. generateJson Signatur und LlmResult)
    - lib/wizard/richtlinien-validator.ts (RichtlinieStrictSchema + validateForeignKeys konsumieren)
    - .planning/phases/03-programm-pflege-foundation/03-RESEARCH.md (insb. Anti-Halluzinations-Pattern aus Bug-#2-Fix Pitfall 1, 2, 3, 5)
    - .planning/phases/03-programm-pflege-foundation/03-PATTERNS.md (Section scripts/extract-richtlinie.ts mit Vorher/Nachher pro Patch)
  </read_first>
  <behavior>
    - Test 1: Static-Grep — Datei importiert generateJson + MODEL_PIPELINE aus ../lib/wizard/llm
    - Test 2: Static-Grep — Datei importiert NICHT @google/generative-ai
    - Test 3: Static-Grep — Datei nutzt MODEL_PIPELINE (NICHT MODEL_INTERVIEW, NICHT hardcoded gemini-2.5-pro)
    - Test 4: Static-Grep — Datei importiert RichtlinieStrictSchema + validateForeignKeys aus ../lib/wizard/richtlinien-validator
    - Test 5: Static-Grep — SYSTEM_PROMPT enthaelt bestPractices, rejectGruende, vorbildFormulierungen, fristLogik
    - Test 6: Static-Grep — SYSTEM_PROMPT enthaelt das Wort JSON (DeepSeek-Mode-Pflicht)
    - Test 7: Static-Grep — SYSTEM_PROMPT enthaelt Anti-Halluzinations-Phrase (Erfinde NICHTS oder REGELN GEGEN HALLUZINATION)
    - Test 8: Static-Grep — KEIN process.env.GEMINI_API_KEY-Check mehr im Skript
    - Test 9: Static-Grep — RichtlinieStrictSchema.safeParse wird aufgerufen (vor writeFile)
    - Test 10: tsc --noEmit gruen
  </behavior>
  <action>
Wir editieren `scripts/extract-richtlinie.ts` an 6 Stellen (alle anderen Code-Bereiche bleiben UNVERAENDERT — insbesondere `fetchOrRead`, `stripHtml`, der `substanzOk`-Check und die Queue-Update-Logik).

PATCH 1 — Imports (Z.25-32 ersetzen):

Aktuell:
```
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const MODEL = "gemini-2.5-pro";
const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");
```

Soll:
```
import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");
```

PATCH 2 — SYSTEM_PROMPT erweitern (Z.53-83 ersetzen):

Der bestehende Prompt bleibt strukturell. Wir erweitern das JSON-Schema-Beispiel um die 4 neuen Felder UND fuegen einen Anti-Halluzinations-Block AM ENDE des Prompts vor `Nur valides JSON ausgeben` ein.

Soll (vollstaendiger neuer Prompt — bewusst die alten Teile beibehalten, neu sind die 4 Schema-Zeilen + der REGELN-Block):

```
const SYSTEM_PROMPT = `Du extrahierst aus dem Volltext einer Foerderrichtlinie ein strukturiertes JSON-Dossier. Bleibe eng am Text, erfinde keine Zahlen oder Regeln. Wenn etwas nicht eindeutig ist, nutze "bemerkung" / "notizen"-Felder und lasse spezifische Felder weg statt zu raten.

Sprache: deutsch. Zahlen in EUR als number (ohne Punkte, ohne Komma). Prozente als number 0..100.

JSON-Schema (exakte Feldnamen):
{
  "version": "2026-04-21",
  "quellen": ["URL1", "URL2"],
  "foerderhoehe": { "minEur"?, "maxEur"?, "maxProzentGesamtkosten"?, "bemerkung"? },
  "kostenpositionen": [
    {
      "kategorie": "personal" | "sachkosten" | "investitionen" | "honorare" | "reisekosten" | "overhead" | "sonstiges",
      "foerderfaehig": true|false,
      "maxEur"?, "maxProzent"?,
      "bedingungen"?: string[],
      "beispielePasst"?: string[],
      "beispielePasstNicht"?: string[]
    }
  ],
  "eigenmittel": { "pflicht": true|false, "mindestProzent"?, "formenErlaubt"?: ("finanziell"|"sachleistungen"|"eigenarbeit"|"drittmittel")[], "bemerkung"? },
  "kumulierung": { "erlaubt": true|false|"bedingt", "bedingungen"?: string[], "unvereinbarMit"?: string[], "kombinationMoeglichMit"?: string[] },
  "antragsstruktur": {
    "abschnitte": [{ "id", "name", "pflicht": true|false, "maxZeichen"?, "leitfragen"?: string[], "stilhinweis"? }],
    "anlagen"?: string[],
    "einreichungsweg": "...",
    "bearbeitungsdauer"?: "..."
  },
  "notizen"?: string[],
  "bestPractices": [{ "thema": "...", "was_funktionierte": "...", "warum"?: "..." }],
  "rejectGruende": [{ "grund": "...", "haeufigkeit"?: "haeufig" | "gelegentlich", "vermeidung"?: "..." }],
  "vorbildFormulierungen": [{ "abschnitt_id": "id-aus-antragsstruktur.abschnitte", "formulierung": "...", "kontext"?: "..." }],
  "fristLogik": { "typ": "rolling" } | { "typ": "fixe_stichtage", "stichtage": ["YYYY-MM-DD", ...], "jaehrlich_wiederkehrend"?: true|false }
}

REGELN GEGEN HALLUZINATION (kritisch — befolge sie strikt):
- Wenn die Richtlinie KEINE Best-Practices, Reject-Gruende oder Vorbild-Formulierungen explizit nennt, gib leere Arrays zurueck. Erfinde NICHTS.
- bestPractices und vorbildFormulierungen MUESSEN aus dem gelieferten Volltext belegbar sein, NICHT aus Allgemeinwissen ueber Foerderverfahren.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus antragsstruktur.abschnitte[].id im selben Output entsprechen.
- stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10". KEIN deutsches Format wie "10.04.2026".
- Maximal 5 Eintraege pro neuem Feld (bestPractices, rejectGruende, vorbildFormulierungen).
- Wenn unsicher: lieber leere Liste als Erfindung. Lieber kuerzer als halluziniert.

Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;
```

PATCH 3 — API-Key-Check entfernen (Z.207-211 streichen):

Aktuell:
```
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
```

Soll: ersatzlos entfernen. Der Wrapper warnt schon im Boot (`lib/wizard/llm.ts:220-226`), und der Workflow-Pre-Flight-Check (Plan 03-03) prueft das auf CI-Ebene.

PATCH 4 — LLM-Call ersetzen (Z.235-242):

Aktuell:
```
const client = new GoogleGenerativeAI(apiKey);
const gm = client.getGenerativeModel({
  model: MODEL,
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: { responseMimeType: "application/json" },
});
const res = await gm.generateContent(userPrompt);
const raw = res.response.text().trim();
```

Soll:
```
const llmResult = await generateJson<Richtlinie>(
  MODEL_PIPELINE,
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 8000 }
);
const parsed = llmResult.value;
```

WICHTIG: Falls der bestehende Code direkt nach Z.242 ein `JSON.parse(raw) as Richtlinie` o. ae. macht, dieses ersatzlos streichen — `llmResult.value` ist bereits geparst typisiert.

PATCH 5 — Validator-Aufruf VOR Persist (zwischen `substanzOk`-Check und `fs.writeFile` einfuegen — der Substanz-Check Z.258-294 bleibt):

Direkt VOR der `fs.writeFile`-Stelle, die das Dossier persistiert (suche im File nach `fs.writeFile.*outPath` o. ae.), folgenden Block einfuegen:

```
// Runtime-Validierung gegen erweitertes Schema (Phase 3, FETCH-03).
// Strict-Mode: alle 4 neuen Felder Pflicht. Bei Fehler: programmId-Status
// nicht auf done setzen, Skript exit 1, Workflow-PR wird nicht erstellt
// (CI-Step "Detect changes" findet kein Diff weil writeFile nicht passierte).
const strictParse = RichtlinieStrictSchema.safeParse(parsed);
if (!strictParse.success) {
  console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
  for (const issue of strictParse.error.issues) {
    console.error(`    ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}
const fkIssues = validateForeignKeys(parsed as never, programmId);
if (fkIssues.length > 0) {
  console.error(`==> FK-Verletzungen fuer ${programmId}:`);
  for (const issue of fkIssues) {
    console.error(`    ${issue.abschnitt_id}: ${issue.reason}`);
  }
  process.exit(1);
}
```

`programmId` ist im umliegenden Scope verfuegbar (aus dem CLI-Modus oder Queue-Lookup) — falls die lokale Variable einen anderen Namen hat, an den existierenden Bezeichner anpassen.

PATCH 6 — Usage-Logging anpassen (Z.303-309):

Aktuell:
```
const usage = res.response.usageMetadata;
console.log(`==> Geschrieben: ${outPath}`);
if (usage) {
  console.log(`    Tokens: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out`);
}
```

Soll:
```
console.log(`==> Geschrieben: ${outPath}`);
console.log(
  `    Tokens: ${llmResult.usage.promptTokens} in + ${llmResult.usage.candidatesTokens} out`
);
```

TEST-FILE `__tests__/scripts/extract-richtlinie.test.ts` neu erstellen:

(Vor Schreiben pruefen: `ls __tests__/scripts/ 2>/dev/null` — falls Verzeichnis fehlt, wird durch File-Write automatisch erstellt.)

```
import fs from "fs";
import path from "path";

const SRC_PATH = path.join(__dirname, "..", "..", "scripts", "extract-richtlinie.ts");
const src = fs.readFileSync(SRC_PATH, "utf8");

describe("scripts/extract-richtlinie.ts (FETCH-01 + FETCH-03 Migrations-Konformitaet)", () => {
  describe("Wrapper-Migration (FETCH-01)", () => {
    it("sollte generateJson aus lib/wizard/llm importieren", () => {
      expect(src).toMatch(/import\s*\{[^}]*generateJson[^}]*\}\s*from\s+["']\.\.\/lib\/wizard\/llm["']/);
    });

    it("sollte MODEL_PIPELINE importieren (NICHT MODEL_INTERVIEW)", () => {
      expect(src).toMatch(/MODEL_PIPELINE/);
    });

    it("sollte NICHT GoogleGenerativeAI importieren", () => {
      expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
    });

    it("sollte KEIN hardcoded gemini-2.5-pro Modell mehr setzen", () => {
      expect(src).not.toMatch(/MODEL\s*=\s*["']gemini-2\.5-pro["']/);
    });

    it("sollte KEINEN process.env.GEMINI_API_KEY-Check mehr enthalten", () => {
      expect(src).not.toMatch(/process\.env\.GEMINI_API_KEY/);
    });
  });

  describe("SYSTEM_PROMPT-Erweiterung (FETCH-03)", () => {
    it("SYSTEM_PROMPT sollte alle 4 neuen Feldnamen enthalten", () => {
      expect(src).toMatch(/bestPractices/);
      expect(src).toMatch(/rejectGruende/);
      expect(src).toMatch(/vorbildFormulierungen/);
      expect(src).toMatch(/fristLogik/);
    });

    it("SYSTEM_PROMPT sollte das Wort JSON enthalten (DeepSeek json_object Pflicht)", () => {
      expect(src).toMatch(/JSON/);
    });

    it("SYSTEM_PROMPT sollte einen Anti-Halluzinations-Block enthalten", () => {
      expect(src).toMatch(/Erfinde NICHTS|lieber leere Liste als Erfindung|REGELN GEGEN HALLUZINATION/);
    });

    it("SYSTEM_PROMPT sollte ISO-Datum-Format YYYY-MM-DD anweisen", () => {
      expect(src).toMatch(/YYYY-MM-DD/);
    });
  });

  describe("Validator-Pre-Persist (FETCH-03)", () => {
    it("sollte RichtlinieStrictSchema importieren", () => {
      expect(src).toMatch(/RichtlinieStrictSchema/);
    });

    it("sollte validateForeignKeys importieren", () => {
      expect(src).toMatch(/validateForeignKeys/);
    });

    it("sollte safeParse vor Persist aufrufen", () => {
      expect(src).toMatch(/RichtlinieStrictSchema\.safeParse/);
    });
  });
});
```

ANTI-HALLUZINATIONS-VERBOTE fuer diesen Task:
- KEIN Refactor von `fetchOrRead`, `stripHtml`, `substanzOk`-Check, Queue-Update — diese Logik bleibt 1:1 erhalten.
- KEIN `MODEL`-Konstanten-Re-Define — Wrapper liefert `MODEL_PIPELINE`.
- KEIN `JSON.parse(raw)` mehr im Skript — `llmResult.value` ist bereits typed-geparst.
- KEIN automatischer Provider-Fallback im Skript (D-07 — bewusst kein Code-Pfad-Fallback).
- KEIN Bumpen der `version`-String-Konvention (deferred).
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && npx tsc --noEmit 2>&1 | tail -10 && npm test -- --testPathPattern='scripts/extract-richtlinie' --silent 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q 'from "../lib/wizard/llm"' scripts/extract-richtlinie.ts` exit 0
    - `grep -q 'from "../lib/wizard/richtlinien-validator"' scripts/extract-richtlinie.ts` exit 0
    - `grep -q "generateJson<Richtlinie>" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "MODEL_PIPELINE" scripts/extract-richtlinie.ts` exit 0
    - `! grep -q "@google/generative-ai" scripts/extract-richtlinie.ts` exit 0
    - `! grep -q 'MODEL = "gemini-2.5-pro"' scripts/extract-richtlinie.ts` exit 0
    - `! grep -q "process.env.GEMINI_API_KEY" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "bestPractices" scripts/extract-richtlinie.ts && grep -q "rejectGruende" scripts/extract-richtlinie.ts && grep -q "vorbildFormulierungen" scripts/extract-richtlinie.ts && grep -q "fristLogik" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "REGELN GEGEN HALLUZINATION" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "YYYY-MM-DD" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "RichtlinieStrictSchema.safeParse" scripts/extract-richtlinie.ts` exit 0
    - `grep -q "validateForeignKeys" scripts/extract-richtlinie.ts` exit 0
    - `test -f __tests__/scripts/extract-richtlinie.test.ts` exit 0
    - `npx tsc --noEmit` exit 0
    - `npm test -- --testPathPattern='scripts/extract-richtlinie' --silent` exit 0 mit STDOUT-Match `/Tests:.*passed/` (mind. 11 passed)
  </acceptance_criteria>
  <done>extract-richtlinie.ts vollstaendig migriert (Wrapper, Prompt, Validator-Pre-Persist), Test-File gruen mit 11 statischen Grep-Tests.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: scan-new-programs.ts auf llm.ts-Wrapper migrieren + scripts/validate-richtlinien.ts neu anlegen</name>
  <files>scripts/scan-new-programs.ts, scripts/validate-richtlinien.ts, __tests__/scripts/scan-new-programs.test.ts</files>
  <read_first>
    - scripts/scan-new-programs.ts (gesamtes File — wir editieren Imports, MODEL-Konstante, API-Key-Check, scanSource-Signatur, LLM-Call)
    - scripts/validate-data.ts (Style-Anker fuer CLI-Validator-Struktur, Aggregat-Output, Exit-Code-Pattern)
    - lib/wizard/richtlinien-loader.ts (fuer listRichtlinienIds/loadRichtlinie wenn nuetzlich — wir nutzen aber direktes fs.readdirSync)
    - lib/wizard/richtlinien-validator.ts (RichtlinieStrictSchema + RichtlinieLegacySchema + validateForeignKeys)
    - .planning/phases/03-programm-pflege-foundation/03-PATTERNS.md (Sections scripts/scan-new-programs.ts und scripts/validate-richtlinien.ts)
    - .planning/phases/03-programm-pflege-foundation/03-RESEARCH.md (Pattern-3 greppable Output Tab-separiert; Pitfall 6 MODEL_INTERVIEW vs MODEL_PIPELINE)
  </read_first>
  <behavior>
    - Test 1: Static-Grep — scan-new-programs.ts importiert generateJson + MODEL_INTERVIEW
    - Test 2: Static-Grep — scan-new-programs.ts importiert NICHT @google/generative-ai
    - Test 3: Static-Grep — scan-new-programs.ts referenziert MODEL_INTERVIEW (NICHT MODEL_PIPELINE)
    - Test 4: Static-Grep — scan-new-programs.ts hat keinen GEMINI_API_KEY-Check mehr
    - Test 5: validate-richtlinien.ts existiert und ist ausfuehrbar via tsx
    - Test 6: validate-richtlinien.ts mit --legacy gegen alle 11 Legacy-Dossiers liefert exit 0
    - Test 7: validate-richtlinien.ts ohne Flag (strict) gegen die 11 Legacy-Dossiers liefert exit 1
    - Test 8: validate-richtlinien.ts gibt greppable Tab-separierte Zeilen aus (programmId TAB feld TAB fehler)
    - Test 9: tsc gruen
  </behavior>
  <action>
SCHRITT A — `scripts/scan-new-programs.ts` migrieren (5 Patches, alle anderen Code-Bereiche bleiben — insbesondere `stripHtml`, `loadSourcesFile`, dedup-Logik, `EXTRACT_SYSTEM`-Prompt):

PATCH 1 — Imports (Z.19-23 ersetzen):

Aktuell:
```
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.0-flash";
```

Soll:
```
import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_INTERVIEW } from "../lib/wizard/llm";
```

PATCH 2 — `scanSource`-Signatur (Z.142-146):

Aktuell:
```
async function scanSource(
  src: Source,
  gemini: GoogleGenerativeAI,
  verbose: boolean
): Promise<ScanResult["programme"]> {
```

Soll:
```
async function scanSource(
  src: Source,
  verbose: boolean
): Promise<ScanResult["programme"]> {
```

PATCH 3 — LLM-Call ersetzen (Z.158-171):

Aktuell:
```
const gm = gemini.getGenerativeModel({
  model: MODEL,
  systemInstruction: EXTRACT_SYSTEM,
  generationConfig: { responseMimeType: "application/json" },
});
const res = await gm.generateContent(userPrompt);
const raw = res.response.text().trim();
try {
  const parsed = JSON.parse(raw) as ScanResult;
  return Array.isArray(parsed.programme) ? parsed.programme : [];
} catch {
  console.error(`  Parse-Fehler bei ${src.id}:`, raw.slice(0, 200));
  return [];
}
```

Soll:
```
try {
  const result = await generateJson<ScanResult>(
    MODEL_INTERVIEW,
    EXTRACT_SYSTEM,
    userPrompt,
    { maxTokens: 4000 }
  );
  return Array.isArray(result.value.programme) ? result.value.programme : [];
} catch (err) {
  console.error(`  Parse-Fehler bei ${src.id}:`, (err as Error).message);
  return [];
}
```

PATCH 4 — API-Key-Check + Client-Konstruktion entfernen:

Aktuell (suche das Pattern `process.env.GEMINI_API_KEY` im File, ca. Z.180-193):
```
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
// ...
const gemini = new GoogleGenerativeAI(apiKey);
```

Soll: Beide Bloecke ersatzlos entfernen.

PATCH 5 — Aufruf-Site `scanSource(...)` anpassen (such die Stelle, wo `scanSource(src, gemini, verbose)` aufgerufen wird):

Soll: `scanSource(src, verbose)` (ohne `gemini`-Argument).

SCHRITT B — `scripts/validate-richtlinien.ts` neu erstellen (komplettes File, ein Write):

```
/**
 * CLI-Validator fuer alle Dossiers in data/richtlinien/*.json.
 *
 * Modi:
 *   npx tsx scripts/validate-richtlinien.ts          -> strict (Pflicht-Modus auf master)
 *   npx tsx scripts/validate-richtlinien.ts --legacy  -> legacy (4 neue Felder optional)
 *
 * Output: Tab-separierte Zeilen "programmId\tfeld\tfehler" pro Verletzung
 *         + Aggregat am Ende. Exit-Code 1 bei mind. einer Verletzung.
 *
 * Phase 4 (FETCH-04) wird --legacy schrittweise entfernen, bis alle 11
 * Dossiers strict-validiert werden koennen.
 */

import * as fs from "fs";
import * as path from "path";
import {
  RichtlinieStrictSchema,
  RichtlinieLegacySchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";

const DIR = path.join(process.cwd(), "data", "richtlinien");

interface IssueLine {
  programmId: string;
  feld: string;
  fehler: string;
}

function printIssue(issue: IssueLine): void {
  // Tab-separiert fuer trivialen `cut -f1` / `awk -F'\t'`.
  console.log(`${issue.programmId}\t${issue.feld}\t${issue.fehler}`);
}

function validateOne(
  programmId: string,
  parsed: unknown,
  isLegacy: boolean
): IssueLine[] {
  const issues: IssueLine[] = [];
  const schema = isLegacy ? RichtlinieLegacySchema : RichtlinieStrictSchema;
  const result = schema.safeParse(parsed);
  if (!result.success) {
    for (const z of result.error.issues) {
      issues.push({
        programmId,
        feld: z.path.join("."),
        fehler: z.message,
      });
    }
    return issues;
  }
  const fkData = result.data as {
    antragsstruktur: { abschnitte: Array<{ id: string }> };
    vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
  };
  for (const fk of validateForeignKeys(fkData, programmId)) {
    issues.push({
      programmId,
      feld: "vorbildFormulierungen[].abschnitt_id",
      fehler: fk.reason,
    });
  }
  return issues;
}

function main(): void {
  const args = process.argv.slice(2);
  const isLegacy = args.includes("--legacy");
  const mode = isLegacy ? "legacy" : "strict";

  if (!fs.existsSync(DIR)) {
    console.error(`Verzeichnis fehlt: ${DIR}`);
    process.exit(2);
  }

  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error(`Keine Dossiers in ${DIR} gefunden.`);
    process.exit(2);
  }

  const allIssues: IssueLine[] = [];
  for (const file of files) {
    const programmId = file.replace(/\.json$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
    } catch (err) {
      allIssues.push({
        programmId,
        feld: "<file>",
        fehler: `JSON-Parse-Fehler: ${(err as Error).message}`,
      });
      continue;
    }
    const issues = validateOne(programmId, parsed, isLegacy);
    for (const issue of issues) {
      printIssue(issue);
      allIssues.push(issue);
    }
  }

  console.log("");
  console.log(`=== VALIDIERUNG ERGEBNIS (${mode}) ===`);
  console.log(`Geprueft: ${files.length} Dossier(s)`);
  const failedIds = new Set(allIssues.map((i) => i.programmId));
  console.log(`Fehlerhafte Dossiers: ${failedIds.size}`);
  console.log(`Gesamt-Issues: ${allIssues.length}`);

  if (allIssues.length > 0) {
    process.exit(1);
  }
  console.log(`Alle ${files.length} Dossiers valide (${mode}-Modus).`);
  process.exit(0);
}

main();
```

SCHRITT C — `__tests__/scripts/scan-new-programs.test.ts` neu erstellen:

```
import fs from "fs";
import path from "path";

const SRC_PATH = path.join(__dirname, "..", "..", "scripts", "scan-new-programs.ts");
const src = fs.readFileSync(SRC_PATH, "utf8");

describe("scripts/scan-new-programs.ts (FETCH-01 Migrations-Konformitaet)", () => {
  it("sollte generateJson aus lib/wizard/llm importieren", () => {
    expect(src).toMatch(/import\s*\{[^}]*generateJson[^}]*\}\s*from\s+["']\.\.\/lib\/wizard\/llm["']/);
  });

  it("sollte MODEL_INTERVIEW importieren und referenzieren", () => {
    expect(src).toMatch(/MODEL_INTERVIEW/);
  });

  it("sollte NICHT MODEL_PIPELINE referenzieren (Pitfall 6)", () => {
    expect(src).not.toMatch(/MODEL_PIPELINE/);
  });

  it("sollte NICHT GoogleGenerativeAI importieren", () => {
    expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
  });

  it("sollte KEIN hardcoded gemini-2.0-flash Modell mehr setzen", () => {
    expect(src).not.toMatch(/MODEL\s*=\s*["']gemini-2\.0-flash["']/);
  });

  it("sollte KEINEN process.env.GEMINI_API_KEY-Check mehr enthalten", () => {
    expect(src).not.toMatch(/process\.env\.GEMINI_API_KEY/);
  });

  it("scanSource-Signatur sollte gemini-Parameter NICHT mehr haben", () => {
    expect(src).not.toMatch(/scanSource\s*\([^)]*GoogleGenerativeAI/);
  });
});
```

ANTI-HALLUZINATIONS-VERBOTE fuer diesen Task:
- KEINE Erweiterung des `EXTRACT_SYSTEM`-Prompts um die 4 neuen Felder — der Scanner extrahiert nur Listen-Eintraege, keine Vollschema-Dossiers (RESEARCH §B-2).
- KEIN Validator-Aufruf im Scanner — Scanner schreibt `program-candidates.json`, NICHT Dossiers.
- KEIN Erweitern von `scripts/validate-data.ts` — RESEARCH §H-3 Korrektur gegen CONTEXT D-08-Wording: anderes Datenmodell, neue Datei `validate-richtlinien.ts`.
- KEIN yargs/commander fuer CLI-Parsing — Repo-Konvention ist plain `process.argv.slice(2).includes("--flag")`.
  </action>
  <verify>
    <automated>cd /home/kolja/edufunds-app && npx tsc --noEmit 2>&1 | tail -10 && npm test -- --testPathPattern='scripts/scan-new-programs' --silent 2>&1 | tail -15 && (npx tsx scripts/validate-richtlinien.ts --legacy >/tmp/legacy.log 2>&1; echo "legacy_exit=$?") && (npx tsx scripts/validate-richtlinien.ts >/tmp/strict.log 2>&1; echo "strict_exit=$?") && tail -5 /tmp/legacy.log && tail -5 /tmp/strict.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q 'from "../lib/wizard/llm"' scripts/scan-new-programs.ts` exit 0
    - `grep -q "MODEL_INTERVIEW" scripts/scan-new-programs.ts` exit 0
    - `! grep -q "MODEL_PIPELINE" scripts/scan-new-programs.ts` exit 0
    - `! grep -q "@google/generative-ai" scripts/scan-new-programs.ts` exit 0
    - `! grep -q 'MODEL = "gemini-2.0-flash"' scripts/scan-new-programs.ts` exit 0
    - `! grep -q "process.env.GEMINI_API_KEY" scripts/scan-new-programs.ts` exit 0
    - `test -f scripts/validate-richtlinien.ts` exit 0
    - `grep -q "RichtlinieStrictSchema" scripts/validate-richtlinien.ts && grep -q "RichtlinieLegacySchema" scripts/validate-richtlinien.ts && grep -q "validateForeignKeys" scripts/validate-richtlinien.ts` exit 0
    - `grep -q '\\\\t' scripts/validate-richtlinien.ts` exit 0 (Tab-separierter Output)
    - `npx tsc --noEmit` exit 0
    - `npm test -- --testPathPattern='scripts/scan-new-programs' --silent` exit 0 mit STDOUT-Match `/Tests:.*passed/` (mind. 7 passed)
    - Lokaler Smoke 1: `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0 mit STDOUT-Match `/Alle 11 Dossiers valide.*legacy/`
    - Lokaler Smoke 2: `npx tsx scripts/validate-richtlinien.ts` exit 1 mit STDOUT-Tab-Pattern `/^[a-z][^\\t]+\\t[^\\t]+\\t[^\\t]+/` (mind. eine greppable Zeile)
    - `scripts/validate-data.ts` UNVERAENDERT: `git diff scripts/validate-data.ts | wc -l` == 0
  </acceptance_criteria>
  <done>scan-new-programs.ts migriert, validate-richtlinien.ts neu mit --legacy-Flag und greppable Output, alle Static-Grep-Tests gruen, lokaler Smoke gegen Legacy-Modus exit 0 und Strict-Modus exit 1.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| LLM-Output -> file system | extract-richtlinie.ts persistiert geparstes Dossier nach data/richtlinien/. Vor Persist Pflicht-Validation. |
| Dossier file -> CI-Workflow | validate-richtlinien.ts in CI-Lint blockt malformed Dossiers vor Merge (Phase-4-Vorbereitung). |
| process.argv -> CLI-Skript | --legacy-Flag steuert Validator-Strenge — unkritisch (lokale Operator-Eingabe), kein Trust-Boundary-Issue. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-Schema-Injection | T (Tampering) | extract-richtlinie.ts persist-step | mitigate | RichtlinieStrictSchema.safeParse + validateForeignKeys werden VOR fs.writeFile aufgerufen. Bei Fehler: process.exit(1), Workflow-PR wird nicht erstellt (CI-Diff-Step findet kein Diff). |
| T-Halluzination | T (Tampering / data integrity) | SYSTEM_PROMPT in extract-richtlinie.ts | mitigate | Anti-Halluzinations-Block aus Bug-#2-Fix-Pattern: harte Verbots-Liste, "lieber leere Liste als Erfindung", max-5-Eintraege-Hinweis, ISO-Datum-Format-Anweisung. Empirisch validiert (8/0/0-Halluzinations-Marker im Wizard). |
| T-FK-Drift | I (Integrity) | extract-richtlinie.ts validator-step | mitigate | validateForeignKeys() prueft vorbildFormulierungen[].abschnitt_id gegen antragsstruktur.abschnitte[].id. Bei Verletzung: Skript-Exit 1. |
| T-Provider-Drift | T (Tampering) | LLM-Wrapper-Aufruf | accept | D-07: kein automatischer Code-Pfad-Fallback. Operator setzt LLM_PROVIDER explizit via Workflow-Dispatch. Akzeptierbar, weil Single-Source-of-Truth-Beobachtbarkeit ueber stille Drift gewinnt. |
</threat_model>

<verification>
- `npx tsc --noEmit` gruen
- `npm test -- --testPathPattern='scripts/' --silent` gruen
- `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0 (alle 11 Legacy-Dossiers passieren Legacy-Schema)
- `npx tsx scripts/validate-richtlinien.ts` exit 1 (Strict-Modus markiert Legacy-Dossiers korrekt als unvollstaendig)
- npm test full suite Delta gegen 34 pre-existing-Failures: KEINE neuen Regressionen
</verification>

<success_criteria>
- extract-richtlinie.ts und scan-new-programs.ts nutzen llm.ts-Wrapper, kein direkter @google/generative-ai-Import
- SYSTEM_PROMPT erweitert, Anti-Halluzinations-Block + ISO-Datum-Anweisung + 4 neue Schema-Zeilen
- Validator-Library wird vor Persist konsumiert
- validate-richtlinien.ts existiert mit --legacy + greppable Output + Exit-Codes
- 18+ static-grep + Smoke-Tests gruen
- Plan 03-03 kann auf den migrierten Skripten + dem CLI-Validator aufbauen
</success_criteria>

<output>
After completion, create `.planning/phases/03-programm-pflege-foundation/03-02-SUMMARY.md` mit:
- Liste der 6 Patches in extract-richtlinie.ts (kurz)
- Liste der 5 Patches in scan-new-programs.ts (kurz)
- validate-richtlinien.ts: --legacy-Modus liefert exit 0, strict-Modus liefert exit 1 gegen 11 Legacy-Dossiers (Output-Sample 1 Zeile)
- Anzahl Tests gruen pro Test-Datei
- Hinweis: Plan 03-03 erweitert die Workflows mit DEEPSEEK_API_KEY-Pflicht und Reviewer-Checkliste
</output>
