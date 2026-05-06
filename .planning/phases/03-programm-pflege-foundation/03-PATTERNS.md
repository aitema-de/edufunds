# Phase 03: programm-pflege-foundation — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 11 (5 modify + 6 create)
**Analogs found:** 11 / 11 (alle stark belegbar)

## File Classification

| Datei | Aktion | Rolle | Daten-Fluss | Closest Analog | Match Quality |
|-------|--------|-------|-------------|----------------|---------------|
| `lib/wizard/richtlinien-schema.ts` | MODIFY | Type-Definition (Library) | Compile-Time-Type | self (additive Erweiterung) | self / exact |
| `scripts/extract-richtlinie.ts` | MODIFY | CLI-Skript / Cron-Worker | request-response (LLM) + file-I/O | `lib/wizard/llm.ts` Wrapper-Pattern + self (alles drumherum bleibt) | exact (Patch-Stelle 1:1) |
| `scripts/scan-new-programs.ts` | MODIFY | CLI-Skript / Cron-Worker | request-response (LLM) + file-I/O | analog `extract-richtlinie.ts` Migration | exact |
| `.github/workflows/weekly-dossier-extraction.yml` | MODIFY | CI / GitHub-Actions | event-driven (cron + dispatch) | self (Pre-Flight + Body-Block bleibt strukturell, nur Secret-Switch + Checkliste-Erweiterung) | self / exact |
| `.github/workflows/weekly-program-scan.yml` | MODIFY | CI / GitHub-Actions | event-driven (cron) | analog `weekly-dossier-extraction.yml` | exact |
| `lib/wizard/richtlinien-validator.ts` | CREATE | Validator-Library (Zod) | transform (parse → validate) | `lib/contact-schema.ts` (Zod) + `scripts/validate-data.ts` (FK-/Cross-Field-Logik) | role-match (Zod-Pattern) + role-match (cross-field-Logik) |
| `scripts/validate-richtlinien.ts` | CREATE | CLI / Validator-Runner | batch / file-I/O + transform | `scripts/validate-data.ts` (CLI-Validator-Struktur, Output-Format, Exit-Code) | role-match (mit Discrepancies, siehe Mismatches) |
| `__tests__/lib/wizard/richtlinien-validator.test.ts` | CREATE | Jest Unit-Test | unit (in-process) | `__tests__/lib/foerderSchema.test.ts` (Schema-Tests, deutsche `describe`/`it`) | role-match |
| `__tests__/scripts/extract-richtlinie.test.ts` | CREATE | Jest Unit-Test mit Mock | unit + dependency-mock | `__tests__/lib/wizard/matcher.dispatch.test.ts` (`jest.mock("@/lib/wizard/llm", ...)` + `MockedFunction`) | exact |
| `__tests__/scripts/scan-new-programs.test.ts` | CREATE | Jest Unit-Test mit Mock | unit + dependency-mock | analog `matcher.dispatch.test.ts` | exact |
| `__tests__/lib/wizard/richtlinien-loader.test.ts` (falls fehlt) | CREATE | Jest Integration-Test | integration / file-I/O | `__tests__/lib/wizard/facts-extractor.test.ts` (kleiner Library-Test mit deutschen `describe`/`it`-Strings) | role-match |

## Pattern Assignments

### `lib/wizard/richtlinien-schema.ts` (MODIFY — Type-Definition / Compile-Time)

**Analog:** self — Erweiterung erfolgt additiv im bestehenden `Richtlinie`-Interface (Z.90-104). FK-Anker `AntragsAbschnitt.id` (Z.59-72) wird unverändert referenziert.

**Imports- / Style-Pattern** (file:`lib/wizard/richtlinien-schema.ts:12-19`):

```typescript
export type Kostenkategorie =
  | "personal"
  | "sachkosten"
  | "investitionen"
  | "honorare"
  | "reisekosten"
  | "overhead"
  | "sonstiges";
```

**Optional-Feld-Pattern** auf Top-Level (file:`lib/wizard/richtlinien-schema.ts:90-104`):

```typescript
export interface Richtlinie {
  /** Dossier-Version. Datum wie "2026-04-20". */
  version: string;
  quellen: string[];
  foerderhoehe: Foerderhoehe;
  kostenpositionen: Kostenposition[];
  eigenmittel: Eigenmittel;
  kumulierung: Kumulierung;
  antragsstruktur: Antragsstruktur;
  /** Freitext-Hinweise, die nicht ins Schema passen, aber fuer KI wichtig sind. */
  notizen?: string[];
  /** Liegt formal abgelaufen vor? */
  veraltet?: boolean;
}
```

**FK-Anker-Pattern** (file:`lib/wizard/richtlinien-schema.ts:59-72`):

```typescript
export interface AntragsAbschnitt {
  /** Interne Kurz-ID, wird vom Wizard fuer Mapping genutzt. */
  id: string;
  /** Menschenlesbarer Name / offizielle Ueberschrift im Antragsformular. */
  name: string;
  pflicht: boolean;
  maxZeichen?: number;
  leitfragen?: string[];
  stilhinweis?: string;
}
```

**Discriminated-Union-Pattern** für `fristLogik` — kein direkter Analog im Datei selbst, aber das gleiche Daten-Modellierungs-Idiom wird in `Eigenmittel.formenErlaubt` schon mit string-literal Union benutzt (file:`lib/wizard/richtlinien-schema.ts:43`):

```typescript
formenErlaubt?: Array<"finanziell" | "sachleistungen" | "eigenarbeit" | "drittmittel">;
```

**Kommentar-Stil:** alle Felder mit JSDoc-Kommentaren (`/** ... */`) auf Deutsch ohne Umlaute (Konvention im File). Neue Felder (`bestPractices`, `rejectGruende`, `vorbildFormulierungen`, `fristLogik`) müssen denselben Stil übernehmen.

**Mismatches:**
- File hat KEIN Discriminated-Union-Beispiel mit `discriminant`-Feld (`typ: 'rolling'` vs. `typ: 'fixe_stichtage'`) — neu zu konstruieren in idiomatischem TS:
  ```typescript
  export type FristLogik =
    | { typ: "rolling" }
    | { typ: "fixe_stichtage"; stichtage: string[]; jaehrlich_wiederkehrend?: boolean };
  ```
- Existing Kommentare nutzen Umlaute mit `ae/oe/ue/ss` (Code-Identifier-Konvention CLAUDE.md). Inhaltliche Strings in `notizen[]` etc. dürfen Umlaute haben, aber JSDoc bleibt ASCII (siehe `Foerderhoehe`-Kommentare).

---

### `scripts/extract-richtlinie.ts` (MODIFY — CLI-Skript / Cron-Worker)

**Analog:** `lib/wizard/llm.ts` exportiert `generateJson<T>` (file:`lib/wizard/llm.ts:204-208`) als 1:1-Replacement der direkten `GoogleGenerativeAI`-Calls. Plus self-Pattern für Imports + Substanz-Check + Queue-Update.

**Imports-Pattern (Ist-Stand zu ersetzen)** (file:`scripts/extract-richtlinie.ts:25-32`):

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";          // ← ENTFERNEN
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const MODEL = "gemini-2.5-pro";                                       // ← ENTFERNEN
const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");
```

**Imports-Pattern (Soll-Stand)** — neuer Wrapper-Import nach Style aus `lib/wizard/llm.ts:204`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import { validateRichtlinieStrict, validateForeignKeys } from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");
```

**LLM-Call-Replacement (Ist-Stand zu ersetzen)** (file:`scripts/extract-richtlinie.ts:235-242`):

```typescript
const client = new GoogleGenerativeAI(apiKey);
const gm = client.getGenerativeModel({
  model: MODEL,
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: { responseMimeType: "application/json" },
});
const res = await gm.generateContent(userPrompt);
const raw = res.response.text().trim();
```

**LLM-Call-Replacement (Soll-Stand)** — Wrapper-Pattern aus `lib/wizard/llm.ts:103-126` (nach DeepSeek-JSON-Mode + Parse + Usage):

```typescript
const result = await generateJson<Richtlinie>(
  MODEL_PIPELINE,
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 8000 }
);
const parsed = result.value;
```

**Usage-Logging-Replacement (Ist-Stand zu ersetzen)** (file:`scripts/extract-richtlinie.ts:303-309`):

```typescript
const usage = res.response.usageMetadata;
console.log(`==> Geschrieben: ${outPath}`);
if (usage) {
  console.log(`    Tokens: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out`);
}
```

**Usage-Logging-Replacement (Soll-Stand)** — `LlmResult<T>.usage`-Shape aus `lib/wizard/llm.ts:76-79` + `pricing.ts:Usage`:

```typescript
console.log(`==> Geschrieben: ${outPath}`);
console.log(`    Tokens: ${result.usage.promptTokens} in + ${result.usage.candidatesTokens} out`);
```

**API-Key-Check entfernen (Ist-Stand)** (file:`scripts/extract-richtlinie.ts:207-211`):

```typescript
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
```

→ ersatzlos streichen. Wrapper hat eigenen Boot-Warn (`lib/wizard/llm.ts:220-226`); harter Pre-Flight ist auf Workflow-Ebene (D-10).

**Substanz-Check (UNVERÄNDERT)** — sehr wichtig zu erhalten (file:`scripts/extract-richtlinie.ts:258-294`):

```typescript
const hatKosten = Array.isArray(parsed.kostenpositionen) && parsed.kostenpositionen.length > 0;
const hatAbschnitte =
  Array.isArray(parsed.antragsstruktur?.abschnitte) &&
  parsed.antragsstruktur.abschnitte.length > 0;
const hatFoerderhoehe =
  typeof parsed.foerderhoehe?.maxEur === "number" ||
  typeof parsed.foerderhoehe?.minEur === "number" ||
  typeof parsed.foerderhoehe?.maxProzentGesamtkosten === "number";
const substanzOk = hatKosten || hatAbschnitte || hatFoerderhoehe;
```

→ NICHT ergänzen um Substanz-Checks für die 4 neuen Felder. Sie sind optional und können legitim leer sein (z.B. wenn Richtlinie keine Best-Practices nennt).

**SYSTEM_PROMPT-Erweiterung (Ist-Stand)** (file:`scripts/extract-richtlinie.ts:53-83`) — Style-Anker für die Prompt-Erweiterung um die 4 neuen Felder:

```typescript
const SYSTEM_PROMPT = `Du extrahierst aus dem Volltext einer Foerderrichtlinie ein strukturiertes JSON-Dossier. Bleibe eng am Text, erfinde keine Zahlen oder Regeln. Wenn etwas nicht eindeutig ist, nutze "bemerkung" / "notizen"-Felder und lasse spezifische Felder weg statt zu raten.

Sprache: deutsch. Zahlen in EUR als number (ohne Punkte, ohne Komma). Prozente als number 0..100.

JSON-Schema (exakte Feldnamen):
{
  "version": "2026-04-21",
  "quellen": ["URL1", "URL2"],
  ...
}

Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;
```

→ Pattern bleibt: Block-Struktur „Einleitung → Sprache → JSON-Schema → Nur valides JSON". Erweiterung um vier neue Felder + Anti-Halluzinations-Block (siehe RESEARCH §G und §Pattern-1-Code-Beispiel) folgt diesem Idiom.

**DeepSeek-JSON-Mode-Constraint:** der existierende Prompt enthält "JSON-Schema" und "Nur valides JSON ausgeben" → DeepSeek `json_object`-Mode-Pflicht (RESEARCH §F-1) ist erfüllt. Beim Erweitern muss "JSON" im Prompt bleiben.

**Mismatches:**
- Validator-Call vor Persist ist NEU (heute keine Validierung im Skript). Das ist additiv, kein Replace. Pattern aus RESEARCH §Pattern-1-Code (Z.518-528) übernehmen.
- Cost-Hint im PR-Body ist Discretion (Open Question 1) — kein Repo-Analog vorhanden, weil PRs heute keine Cost-Zeilen haben.

---

### `scripts/scan-new-programs.ts` (MODIFY — CLI-Skript / Cron-Worker)

**Analog:** identisches Migrations-Pattern wie `extract-richtlinie.ts`, nur mit `MODEL_INTERVIEW` statt `MODEL_PIPELINE` (siehe RESEARCH Pitfall 6) und `maxTokens: 4000` statt `8000` (Listen-Output statt Vollschema).

**LLM-Call-Replacement (Ist-Stand)** (file:`scripts/scan-new-programs.ts:158-171`):

```typescript
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

**LLM-Call-Replacement (Soll-Stand)** — Pattern aus `lib/wizard/llm.ts:204-208`:

```typescript
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

**Funktion-Signatur-Anpassung (Ist-Stand)** (file:`scripts/scan-new-programs.ts:142-146`) — der `gemini`-Parameter fällt weg:

```typescript
async function scanSource(
  src: Source,
  gemini: GoogleGenerativeAI,    // ← ENTFERNEN (kein expliziter Client mehr)
  verbose: boolean
): Promise<ScanResult["programme"]> {
```

→ Soll-Stand: `async function scanSource(src: Source, verbose: boolean): Promise<...>`.

**API-Key-Check + Client-Konstruktion entfernen (Ist-Stand)** (file:`scripts/scan-new-programs.ts:180-193`):

```typescript
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
// ...
const gemini = new GoogleGenerativeAI(apiKey);
```

→ komplett streichen. Wrapper handhabt Provider intern.

**EXTRACT_SYSTEM (UNVERÄNDERT)** — keine Erweiterung um die 4 neuen Felder, weil Scanner nur Listen-Einträge extrahiert (RESEARCH §B-2).

**Mismatches:**
- Es gibt Genau EINE Call-Site pro Source-Iteration (RESEARCH §B-2, Z.886) — Migration ist trivial.

---

### `.github/workflows/weekly-dossier-extraction.yml` (MODIFY — CI / Cron-Workflow)

**Analog:** self — Pre-Flight-Block + Body-Block bleiben strukturell, nur Secret-Switch + Reviewer-Checkliste-Erweiterung.

**Pre-Flight-Pattern (Ist-Stand)** (file:`.github/workflows/weekly-dossier-extraction.yml:41-51`):

```yaml
env:
  PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
run: |
  set -euo pipefail
  if [ -z "${GEMINI_API_KEY}" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt. Im Repo-Settings als Secret hinterlegen."
    exit 1
  fi
```

**Pre-Flight-Pattern (Soll-Stand)** — analog, aber mit `DEEPSEEK_API_KEY` als Pflicht und `LLM_PROVIDER`-bewusstem Fallback (siehe RESEARCH §Code-Examples Z.535-553):

```yaml
env:
  PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}        # optional Fallback
  LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
run: |
  set -euo pipefail
  if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
    echo "::error::DEEPSEEK_API_KEY Secret fehlt. Im Repo-Settings hinterlegen oder LLM_PROVIDER=gemini nutzen."
    exit 1
  fi
  if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
    exit 1
  fi
```

**workflow_dispatch.inputs-Pattern (Ist-Stand)** (file:`.github/workflows/weekly-dossier-extraction.yml:12-17`):

```yaml
on:
  schedule:
    - cron: "0 4 * * 1" # Jeden Montag 04:00 UTC (06:00 Berlin)
  workflow_dispatch:
    inputs:
      program_id:
        description: "Optional: bestimmtes Programm aus der Queue extrahieren (sonst --next)"
        required: false
        type: string
```

→ Erweiterung um `llm_provider`-Input (Style-Anker; type:choice mit options bleibt YAML-Idiom):

```yaml
      llm_provider:
        description: "LLM-Provider override (deepseek default, gemini fuer Fallback)"
        required: false
        type: choice
        options:
          - deepseek
          - gemini
        default: deepseek
```

**Reviewer-Checkliste-Pattern (Ist-Stand)** (file:`.github/workflows/weekly-dossier-extraction.yml:93-109`):

```yaml
body: |
  Automatisch vom wöchentlichen Dossier-Cron extrahiert.

  **Programm:** `${{ steps.extract.outputs.programm_id }}`

  ### Reviewer-Checkliste
  - [ ] Förderhöhe / maxEur / mindestProzent stimmen mit Originalrichtlinie
  - [ ] Pflichtabschnitte abgedeckt, Leitfragen plausibel
  - [ ] Eigenanteil korrekt (Pflicht ja/nein, Mindest-Prozent)
  - [ ] Kumulierung (unvereinbarMit?) angemessen
  - [ ] Nicht-förderfähige Kosten nicht halluziniert
  - [ ] Quellen-URLs funktionieren
labels: |
  richtlinien-bot
  auto-generated
```

→ 4 neue Items mit identischem Stil (Markdown-Liste, Frage-Form). Entwurf (Open Question 2 + D-11):

```yaml
  - [ ] Best Practices: stehen wirklich in der Quelle (nicht halluziniert), max 5 Stueck
  - [ ] Reject-Gruende: aus Volltext belegbar, vermeidung-Feld konstruktiv
  - [ ] Vorbild-Formulierungen: abschnitt_id zeigt auf existierende Sektion (FK ok), Formulierung woertlich aus Quelle
  - [ ] Frist-Logik: typ korrekt (rolling vs fixe_stichtage), Daten im ISO-Format YYYY-MM-DD
```

**Hier verwendet die Workflow-Datei deutsche Sätze MIT Umlauten** (siehe `Förderhöhe`, `Pflichtabschnitte`) — folgt CLAUDE.md-Konvention für user-facing Markdown. Die neuen Items müssen ebenfalls Umlaute nutzen (oben sind nur ASCII gezeigt zur YAML-Kollisions-Vermeidung; final mit „Reject-Gründe", „Best Practices", „Frist-Logik").

**Mismatches:**
- `peter-evans/create-pull-request@v7` Block (file:Z.85-112) bleibt 100 % identisch — nur `body:` wird erweitert.
- Branch-Name `dossier-bot/<programm_id>` bleibt (D-11 explizit).

---

### `.github/workflows/weekly-program-scan.yml` (MODIFY — CI / Cron-Workflow)

**Analog:** identisches Pattern wie `weekly-dossier-extraction.yml`. Pre-Flight-Block schlanker (kein `program_id`-Input), aber Secret-Switch identisch.

**Pre-Flight-Pattern (Ist-Stand)** (file:`.github/workflows/weekly-program-scan.yml:36-46`):

```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
run: |
  set -euo pipefail
  if [ -z "${GEMINI_API_KEY}" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt."
    exit 1
  fi
  npx tsx scripts/scan-new-programs.ts
```

**Pre-Flight-Pattern (Soll-Stand)** — Style-Anker derselbe wie Dossier-Workflow, plus `LLM_PROVIDER`-Default:

```yaml
env:
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
run: |
  set -euo pipefail
  if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
    echo "::error::DEEPSEEK_API_KEY Secret fehlt."
    exit 1
  fi
  if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
    exit 1
  fi
  npx tsx scripts/scan-new-programs.ts
```

**Reviewer-Body-Pattern (UNVERÄNDERT)** (file:`.github/workflows/weekly-program-scan.yml:66-86`) — Scanner-PRs benötigen KEINE Erweiterung um die 4 neuen Felder, weil der Scanner nur Listen-Einträge extrahiert (Triage-Body).

**Mismatches:**
- File hat heute KEIN `workflow_dispatch.inputs`-Block (nur `workflow_dispatch:` als Trigger). Falls `llm_provider`-Override gewünscht, muss `inputs:`-Block neu eingeführt werden — Style-Anker aus Dossier-Workflow Z.12-17.

---

### `lib/wizard/richtlinien-validator.ts` (CREATE — Zod-Schema-Library + FK-Check)

**Analog 1 (Zod-Pattern):** `lib/contact-schema.ts` (file:`lib/contact-schema.ts:1-19`) — minimales Zod-Schema mit `z.object()`, deutschen Fehler-Strings (mit Umlauten in Werten, nicht Schlüsseln), `z.infer<typeof X>` für Type-Export.

**Imports + Top-Level-Schema-Pattern** (file:`lib/contact-schema.ts:1-19`):

```typescript
import { z } from 'zod';

// Zod Schema für Kontaktformular-Validierung
export const contactSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  subject: z.string().min(5, 'Betreff muss mindestens 5 Zeichen lang sein'),
  message: z.string().min(20, 'Nachricht muss mindestens 20 Zeichen lang sein'),
  datenschutz: z.literal(true, {
    errorMap: () => ({ message: 'Sie müssen der Datenschutzerklärung zustimmen' }),
  }),
  website: z.string().optional(),
  timestamp: z.number().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
```

→ Style-Anker für `richtlinien-validator.ts`:
- `import { z } from 'zod';`
- Schema-Konstanten in `PascalCase` mit `Schema`-Suffix (in Phase-3-Plan vorgegeben: `BestPracticeSchema`, `RejectGrundSchema`, `VorbildFormulierungSchema`, `FristLogikSchema`, `RichtlinieStrictSchema`, `RichtlinieLegacySchema`)
- Deutsche Fehler-Strings als 2. Argument von `.min()`, `.regex()` etc. — MIT Umlauten (Werte, nicht Schlüssel)
- Type-Re-Export via `z.infer<typeof RichtlinieStrictSchema>` am Ende

**Discriminated-Union-Pattern (Zod 3.x):** kein direkter Repo-Analog, aber Standard-Idiom (RESEARCH §Pattern-2):

```typescript
const FristLogikSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("rolling") }),
  z.object({
    typ: z.literal("fixe_stichtage"),
    stichtage: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    jaehrlich_wiederkehrend: z.boolean().optional(),
  }),
]);
```

**Analog 2 (FK-Cross-Field-Check):** `scripts/validate-data.ts:54-63` (file:`scripts/validate-data.ts:54-63`) zeigt das einzige bestehende Cross-Field-Constraint im Repo (ISO-3166-2-Code-Check):

```typescript
if (Array.isArray(item.bundeslaender)) {
  const nonIsoBundeslaender = item.bundeslaender.filter((b: string) => {
    if (b === 'alle') return false;
    return !/^DE-[A-Z]{2}$/.test(b);
  });
  if (nonIsoBundeslaender.length > 0) {
    problems.push(`Nicht-ISO bundeslaender: ${nonIsoBundeslaender.join(', ')}`);
  }
}
```

→ Style-Anker für `validateForeignKeys()`-Pattern:
- separate Funktion außerhalb des Zod-Schemas (Zod kann Cross-Field via `.refine()`, aber unleserlich; separate Funktion klarer — siehe „Don't Hand-Roll" RESEARCH-Tabelle)
- Set-basierter Lookup für O(1)-Member-Check
- Strukturiertes Issue-Result statt Plain-String (für greppable Output)

**Soll-Stand-Skizze** (Pattern aus RESEARCH §Pattern-2 Z.341-350):

```typescript
export interface FkIssue {
  programmId: string;
  abschnitt_id: string;
  reason: string;
}

export function validateForeignKeys(
  parsed: z.infer<typeof RichtlinieStrictSchema>,
  programmId: string
): FkIssue[] {
  const issues: FkIssue[] = [];
  const validIds = new Set(parsed.antragsstruktur.abschnitte.map((a) => a.id));
  for (const v of parsed.vorbildFormulierungen ?? []) {
    if (!validIds.has(v.abschnitt_id)) {
      issues.push({
        programmId,
        abschnitt_id: v.abschnitt_id,
        reason: `FK-Verletzung: abschnitt_id nicht in antragsstruktur.abschnitte[].id`,
      });
    }
  }
  return issues;
}
```

**Strict + Legacy-Schema-Pattern (Zod 3.x):** `RichtlinieLegacySchema` als `RichtlinieStrictSchema.partial({...})` — die 4 neuen Felder werden auf `optional` umgeschaltet. Repo hat kein direktes Analog für `partial(...)`-Override, aber `.optional()` ist breit etabliert (`contact-schema.ts:13-15`):

```typescript
website: z.string().optional(),
timestamp: z.number().optional(),
```

**Mismatches:**
- Repo-Konvention: `lib/contact-schema.ts` exportiert das Zod-Schema und den Type via `z.infer`. Das Phase-3-File MUSS hier vom Pattern abweichen, weil `Richtlinie` als `interface` aus `lib/wizard/richtlinien-schema.ts` von 14 Stellen importiert wird (RESEARCH §C-3) — kein Single-Source-of-Truth-Refactor in Phase 3 (RESEARCH §Architecture / Alternatives Considered).
- Empfehlung: validator-File **referenziert** das Interface über parallele Felder, exportiert das Zod-Schema und FK-Check-Funktionen, aber NICHT den Type. Type-Identität bleibt im `richtlinien-schema.ts`.
- Existing Validator (`scripts/validate-data.ts`) ist hand-rolled — neue File ist erstes Repo-Beispiel für Zod auf einer komplexen Struktur (außerhalb der trivialen Form-Schemas). Jest-Tests müssen besonders robust sein.

---

### `scripts/validate-richtlinien.ts` (CREATE — CLI-Validator)

**Analog:** `scripts/validate-data.ts` (file:`scripts/validate-data.ts:1-85`) — bestehender CLI-Validator. Stilistisch übertragbar: Bash-Aufruf via `npx tsx`, `process.exit(1)` bei Fehler, Aggregat-Output am Ende.

**Imports + File-Read-Pattern** (file:`scripts/validate-data.ts:1-5`):

```typescript
import { Foerderprogramm } from '../lib/foerderSchema';
import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/foerderprogramme.json'), 'utf-8'));
```

→ Style-Anker für `validate-richtlinien.ts`:
- direkter `fs`-Import (nicht `node:fs/promises` wie in `extract-richtlinie.ts`) — beide Patterns sind im Repo akzeptiert; `validate-data.ts` synchron weil CLI-Skript ohne Concurrency, das passt für Validator auch
- Pfad relativ zu `__dirname`
- `JSON.parse(fs.readFileSync(...))` als Single-Statement

**Aggregat + Exit-Pattern (Ist-Stand)** (file:`scripts/validate-data.ts:65-84`):

```typescript
const issues: { index: number; id: string; problems: string[] }[] = [];

data.forEach((item: any, index: number) => {
  const problems: string[] = [];
  // ... checks fill problems
  if (problems.length > 0) {
    issues.push({ index, id: item.id || `entry-${index}`, problems });
  }
});

console.log(`\n=== VALIDIERUNG ERGEBNIS ===`);
console.log(`Geprüfte Programme: ${data.length}`);
console.log(`Fehlerhafte Programme: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n=== DETAILLIERTE FEHLER ===');
  issues.forEach(({ index, id, problems }) => {
    console.log(`\n[${index}] ${id}:`);
    problems.forEach(p => console.log(`  - ${p}`));
  });
  process.exit(1);
} else {
  console.log('\n✅ Alle Programme sind valide!');
  process.exit(0);
}
```

→ Style-Anker:
- Header `=== VALIDIERUNG ERGEBNIS ===` als sektion-trennender Marker
- Per-Item-Diagnostik mit Index + ID-Header + bullet-prefixed problems
- `process.exit(1)` bei Fehler, `process.exit(0)` bei Erfolg
- Deutsche Console-Strings MIT Umlauten (CLAUDE.md-konform)
- Emoji-Marker (`✅`) ist im Repo etabliert für CLI-Outputs

**Mismatches:**
- **Wichtigster Mismatch:** `validate-data.ts` validiert `data/foerderprogramme.json` (SINGLE-Datei mit Array von Programmen). Phase-3-Validator validiert `data/richtlinien/*.json` (MEHRFACHE Dateien, eine pro Programm). Das ändert den File-Discovery-Loop:
  ```typescript
  const dossiers = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  for (const file of dossiers) {
    const programmId = file.replace(/\.json$/, '');
    const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    // schema-check + FK-check
  }
  ```
  Der `listRichtlinienIds`-Helper aus `lib/wizard/richtlinien-loader.ts:32-40` ist ein Style-Anker, aber async — für CLI ist sync `fs.readdirSync` OK.

- **`--legacy`-Flag NEU:** `validate-data.ts` hat keine CLI-Flags (D-08 verlangt `--legacy`). Pattern aus `scripts/scan-new-programs.ts:175-178` als Anker:
  ```typescript
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const sourceFilterIdx = args.indexOf("--source");
  ```
  → für `validate-richtlinien.ts`:
  ```typescript
  const args = process.argv.slice(2);
  const isLegacy = args.includes("--legacy");
  ```

- **Greppable-Output-Format (RESEARCH §Pattern-3):** Tab-separierte Zeilen `programmId\tfeld\tfehler` — ABWEICHEND von `validate-data.ts`'s freitext-Aggregat. Begründung in RESEARCH §Specifics (greppable für Phase-4-Migration). Der Plan kann beides kombinieren: greppable per-Issue-Lines im Detail-Block, plus `=== VALIDIERUNG ERGEBNIS ===`-Aggregat.

- **NICHT erweitern, sondern neu anlegen:** RESEARCH §H-3 hat das explizit korrigiert — `validate-data.ts` validiert ein anderes Datenmodell, NICHT erweitern. CONTEXT D-08 sagt zwar „bekommt einen `--legacy`-Flag", aber das ist eine Plan-Discretion-Korrektur (RESEARCH-Empfehlung).

---

### `__tests__/lib/wizard/richtlinien-validator.test.ts` (CREATE — Jest Unit-Tests)

**Analog:** `__tests__/lib/foerderSchema.test.ts` (file:`__tests__/lib/foerderSchema.test.ts:1-186`) — Schema-Tests mit deutschen `describe`/`it`-Strings, gruppiert nach Test-Aspekt.

**Imports + Test-Suite-Struktur-Pattern** (file:`__tests__/lib/foerderSchema.test.ts:1-13`):

```typescript
import { Foerderprogramm } from '@/lib/foerderSchema';
import testData from '@/mocks/test-programme.json';

describe('Foerderprogramm Schema', () => {
  describe('Validierung gültiger Programme', () => {
    it('sollte ein vollständiges gültiges Programm akzeptieren', () => {
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      expect(programm).toBeDefined();
      expect(programm.id).toBe('bkm-digital-2024');
    });
  });
});
```

→ Style-Anker:
- `@/`-Path-Alias für TS-Imports (jest-config konfiguriert via `next/jest`)
- Verschachtelte `describe`-Blöcke nach Aspekt (gültig / ungültig / Typ-Checks / spezielle-Felder)
- Deutsche Test-Beschreibungen MIT Umlauten (`'sollte ein vollständiges gültiges Programm akzeptieren'`)
- `it`-Strings beginnen mit „sollte" (Konvention aus repo)

**Erwartete Test-Suite-Struktur** (aus RESEARCH-Test-Map Z.658-672 + RESEARCH-Pattern-2):

```typescript
import { z } from 'zod';
import {
  RichtlinieStrictSchema,
  RichtlinieLegacySchema,
  validateForeignKeys,
} from '@/lib/wizard/richtlinien-validator';

describe('RichtlinieStrictSchema', () => {
  describe('strict mode', () => {
    it('sollte Dossier OHNE neue Felder ablehnen (legacy ist nicht strict-valide)', () => { /* ... */ });
    it('sollte Dossier MIT allen 4 neuen Feldern akzeptieren', () => { /* ... */ });
  });
  describe('fristLogik (Discriminated Union)', () => {
    it('sollte rolling akzeptieren ohne stichtage', () => { /* ... */ });
    it('sollte fixe_stichtage mit nicht-leerem stichtage[]-Array akzeptieren', () => { /* ... */ });
    it('sollte fixe_stichtage MIT leerem stichtage[] ablehnen', () => { /* ... */ });
    it('sollte stichtage in deutschem Format (10.04.2026) ablehnen', () => { /* ... */ });
    it('sollte stichtage in ISO-Format (2026-04-10) akzeptieren', () => { /* ... */ });
  });
});

describe('RichtlinieLegacySchema', () => {
  it('sollte Dossier ohne neue Felder akzeptieren', () => { /* ... */ });
  it('sollte Dossier mit teilweise gefüllten neuen Feldern akzeptieren', () => { /* ... */ });
});

describe('validateForeignKeys', () => {
  it('sollte FK-Verletzung erkennen wenn abschnitt_id nicht in antragsstruktur.abschnitte', () => { /* ... */ });
  it('sollte leere Issues-Liste zurückgeben bei vollständig konsistentem Dossier', () => { /* ... */ });
  it('sollte vorbildFormulierungen=undefined als „keine Issues" behandeln', () => { /* ... */ });
});
```

**Test-Daten-Pattern:** `foerderSchema.test.ts` lädt JSON-Fixtures aus `@/mocks/test-programme.json`. Für Zod-Tests sind in-line-Object-Literals OK (kein eigenes Fixture-File nötig), aber die 11 Legacy-Dossiers in `data/richtlinien/*.json` können als Integration-Fixtures geladen werden:

```typescript
import aktionMensch from '@/data/richtlinien/aktion-mensch-schulkooperation.json';
// ...
expect(RichtlinieLegacySchema.safeParse(aktionMensch).success).toBe(true);
```

**Mismatches:**
- `foerderSchema.test.ts` macht KEINE Zod-`safeParse`-Calls (test prüft nur Type-Konformität via TS, nicht Runtime). Für Phase-3-Validator-Tests braucht es `safeParse(...).success` und Inspektion von `.error.issues` — neues Idiom im Repo.
- Discriminated-Union-Tests sind neu — kein direkter Analog im Repo.

---

### `__tests__/scripts/extract-richtlinie.test.ts` (CREATE — Jest Unit-Test mit Mock)

**Analog:** `__tests__/lib/wizard/matcher.dispatch.test.ts` (file:`__tests__/lib/wizard/matcher.dispatch.test.ts:1-80`) — exemplarisches `jest.mock("@/lib/wizard/llm", ...)`-Pattern mit `MockedFunction`-Type.

**Imports + Mock-Setup-Pattern** (file:`__tests__/lib/wizard/matcher.dispatch.test.ts:10-29`):

```typescript
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
  generateText: jest.fn(),
  generateJson: jest.fn(),
}));

import { generateText } from "@/lib/wizard/llm";
import { runMatch } from "@/lib/wizard/matcher";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;
```

**Mock-Reset-Pattern** (file:`__tests__/lib/wizard/matcher.dispatch.test.ts:35-41`):

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateText.mockResolvedValue({
    value: "",
    usage: { promptTokens: 100, candidatesTokens: 50 },
  });
});
```

**Mock-Assertion-Pattern** (file:`__tests__/lib/wizard/matcher.dispatch.test.ts:45-67`):

```typescript
it("liefert kind=clarification wenn erste Zeile mit CLARIFY| beginnt — D-05/D-08", async () => {
  mockGenerateText.mockResolvedValueOnce({
    value: "CLARIFY|Fuer welches Bundesland sucht ihr?",
    usage: { promptTokens: 100, candidatesTokens: 50 },
  });
  const result = await runMatch(baseInput);
  expect(result.kind).toBe("clarification");
});
```

**Soll-Stand für `extract-richtlinie.test.ts`:** Da `extract-richtlinie.ts` aktuell ein Script-File mit `main()` ist und nicht aus Modulen exportiert, hat der Test 2 Optionen:

1. **Statisches Grep** — File einlesen und `import`-Patterns prüfen (kein Mock nötig):
   ```typescript
   import fs from 'fs';
   const src = fs.readFileSync('scripts/extract-richtlinie.ts', 'utf8');

   it('sollte generateJson aus lib/wizard/llm importieren', () => {
     expect(src).toMatch(/import \{[^}]*generateJson[^}]*\} from "\.\.\/lib\/wizard\/llm"/);
   });
   it('sollte NICHT GoogleGenerativeAI importieren', () => {
     expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
   });
   it('sollte MODEL_PIPELINE referenzieren (NICHT MODEL_INTERVIEW)', () => {
     expect(src).toMatch(/MODEL_PIPELINE/);
   });
   it('SYSTEM_PROMPT sollte alle 4 neuen Feldnamen enthalten', () => {
     expect(src).toMatch(/bestPractices/);
     expect(src).toMatch(/rejectGruende/);
     expect(src).toMatch(/vorbildFormulierungen/);
     expect(src).toMatch(/fristLogik/);
   });
   ```

2. **Mock + dynamisches Import** — wenn das Skript refactored wird, dass `runExtraction()` exportiert wird (aktuell ist es `async function runExtraction(...)` ohne Export, file:`scripts/extract-richtlinie.ts:206`). Discretion-Bereich; minimalinvasiv ist Option 1.

→ **Empfehlung für Plan:** Option 1 (statisches Grep) für FETCH-01-Konformitäts-Sanity-Check. Plus optional Option 2, wenn der Plan auch `runExtraction` exportiert.

**Mismatches:**
- `matcher.dispatch.test.ts` mockt eine **importierte Library-Funktion**, die der Test direkt aufruft. Phase-3-Test mockt eine importierte Library, die ein **Skript-File** aufruft, das selbst nicht exportierbar ist. Skripte sind im Repo nicht für Mock-Tests strukturiert (kein Repo-Analog) — Option 1 (Grep) ist konservativer.
- Skripte testen ist im Repo seltener als Lib-Testing — `__tests__/scripts/` Pfad existiert noch nicht, neu zu schaffen.

---

### `__tests__/scripts/scan-new-programs.test.ts` (CREATE — analog)

**Analog:** identisches Pattern wie `extract-richtlinie.test.ts`, nur mit `MODEL_INTERVIEW` statt `MODEL_PIPELINE` und ohne SYSTEM-Prompt-Erweiterungs-Check.

```typescript
import fs from 'fs';
const src = fs.readFileSync('scripts/scan-new-programs.ts', 'utf8');

it('sollte generateJson aus lib/wizard/llm importieren', () => {
  expect(src).toMatch(/import \{[^}]*generateJson[^}]*\} from "\.\.\/lib\/wizard\/llm"/);
});
it('sollte NICHT GoogleGenerativeAI importieren', () => {
  expect(src).not.toMatch(/from\s+["']@google\/generative-ai["']/);
});
it('sollte MODEL_INTERVIEW referenzieren (NICHT MODEL_PIPELINE)', () => {
  expect(src).toMatch(/MODEL_INTERVIEW/);
  expect(src).not.toMatch(/MODEL_PIPELINE/);
});
```

**Mismatches:** keine; struktur-identisch.

---

### `__tests__/lib/wizard/richtlinien-loader.test.ts` (CREATE falls fehlt — Integration-Test)

**Analog:** `__tests__/lib/wizard/facts-extractor.test.ts` (file:`__tests__/lib/wizard/facts-extractor.test.ts:1-89`) — kleiner Library-Test mit deutschen `it`-Strings (mischt deutsche Sätze mit Umlauten und reine ASCII-Beschreibungen).

**Imports + Pattern** (file:`__tests__/lib/wizard/facts-extractor.test.ts:1-9`):

```typescript
import { mergeFacts } from "@/lib/wizard/facts-extractor";
import type { WizardFacts } from "@/lib/wizard/types";

describe("mergeFacts", () => {
  it("gibt base zurueck, wenn Update undefined ist", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
    expect(mergeFacts(base, undefined)).toEqual(base);
  });
});
```

**Soll-Stand-Skizze:**

```typescript
import { loadRichtlinie, listRichtlinienIds } from "@/lib/wizard/richtlinien-loader";

describe("loadRichtlinie (mit erweitertem Schema)", () => {
  it("laedt ein Legacy-Dossier ohne 4 neue Felder ohne Crash", async () => {
    const r = await loadRichtlinie("aktion-mensch-schulkooperation");
    expect(r).not.toBeNull();
    expect(r!.bestPractices).toBeUndefined();
    expect(r!.fristLogik).toBeUndefined();
  });

  it("listet alle 11 Dossier-IDs", async () => {
    const ids = await listRichtlinienIds();
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});
```

**Mismatches:**
- `facts-extractor.test.ts` testet eine pure-Function ohne FS-IO. Loader-Test braucht echte Filesystem-Reads — keine Mocks für `fs`. Das ist im Repo akzeptiert (existierende Loader-Logik wird oft durch direkte FS-Calls getestet); kein neuer Style.
- Falls `__tests__/lib/wizard/richtlinien-loader.test.ts` schon existiert (RESEARCH-Test-Map Z.672 markiert es als „⚠ Wave 0 (existence to verify)"), nur erweitern statt neu schaffen.

**Verifikation existence:** Phase-3-Plan muss vor Schreiben kurz checken: `ls __tests__/lib/wizard/richtlinien-loader.test.ts` — falls existiert, NUR erweitern um Schema-Kompat-Cases.

---

## Shared Patterns

### A. LLM-Wrapper-Aufruf

**Source:** `lib/wizard/llm.ts:204-208` (`generateJson<T>`) + `lib/wizard/llm.ts:43-44` (`MODEL_INTERVIEW`, `MODEL_PIPELINE`)
**Apply to:** `scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`

```typescript
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";

const result = await generateJson<MyType>(
  MODEL_PIPELINE,           // oder MODEL_INTERVIEW (siehe Pitfall 6)
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 8000 }       // 4000 für Listen-Output, 8000 für Vollschema
);
const parsed = result.value;
console.log(`    Tokens: ${result.usage.promptTokens} in + ${result.usage.candidatesTokens} out`);
```

**Modell-Mapping (Pitfall 6):**
- `extract-richtlinie.ts` → `MODEL_PIPELINE` (Pro-Klasse, komplexe Schema-Extraktion)
- `scan-new-programs.ts` → `MODEL_INTERVIEW` (Flash-Klasse, einfache Listen-Extraktion)

### B. Pre-Flight Secret-Check (Workflow)

**Source:** `.github/workflows/weekly-dossier-extraction.yml:46-51` als Pattern, RESEARCH §Code-Examples Z.535-553 als Soll-Stand
**Apply to:** `weekly-dossier-extraction.yml`, `weekly-program-scan.yml`

```yaml
env:
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}        # optional
  LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
run: |
  set -euo pipefail
  if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
    echo "::error::DEEPSEEK_API_KEY Secret fehlt."
    exit 1
  fi
  if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
    exit 1
  fi
```

### C. Anti-Halluzinations-Block im SYSTEM_PROMPT

**Source:** RESEARCH §G (empirisch validiert via Bug-#2-Fix vom 30.04., 8/0/0-UAT-Halluzinations-Marker) + `scripts/extract-richtlinie.ts:53-83` (existing SYSTEM_PROMPT als Style-Anker)
**Apply to:** SYSTEM_PROMPT-Erweiterung in `scripts/extract-richtlinie.ts`

```
REGELN GEGEN HALLUZINATION:
- Wenn die Richtlinie KEINE Best-Practices, Reject-Gruende oder Vorbild-Formulierungen enthaelt, gib leere Arrays zurueck. Erfinde NICHTS.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus antragsstruktur.abschnitte[].id entsprechen.
- stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10".
- Wenn unsicher: lieber leeres Feld als Erfindung.
```

→ DeepSeek-JSON-Mode-Pflicht: das Wort "JSON" muss im Prompt bleiben (existing-Block enthält „JSON-Schema" + „Nur valides JSON" — beibehalten).

### D. Greppable Diagnostik-Output

**Source:** RESEARCH §Pattern-3 + `scripts/validate-data.ts:75-79` (Plain-Diagnostik als Format-Anker, NICHT 1:1 übernehmen — Phase-3-Plan nutzt Tab-separiert)
**Apply to:** `scripts/validate-richtlinien.ts` Detail-Block; auch in `scripts/extract-richtlinie.ts` für inline-Validator-Warnings

```typescript
// Tab-separiert: programmId<TAB>feld<TAB>fehler
function printIssue(programmId: string, field: string, msg: string): void {
  console.log(`${programmId}\t${field}\t${msg}`);
}
```

Output-Beispiel:
```
aktion-mensch-schulkooperation	bestPractices	missing required field
kultur-macht-stark	vorbildFormulierungen[2].abschnitt_id	FK violation: 'finanzplan-alt' not in [buendnis,zielgruppe,konzept,...]
```

### E. CLI-Args-Parsing (für `--legacy`-Flag)

**Source:** `scripts/scan-new-programs.ts:175-178`
**Apply to:** `scripts/validate-richtlinien.ts`

```typescript
const args = process.argv.slice(2);
const isLegacy = args.includes("--legacy");
```

→ kein yargs/commander — Repo-Konvention ist plain `process.argv`-Inspection.

### F. Conventional-Commit-Stil (für alle Commits)

**Source:** CLAUDE.md (`/home/kolja/edufunds-app/CLAUDE.md:21`) + projekt-existing `git log` Stil
**Apply to:** alle Phase-3-Commits

```
feat(richtlinien): Schema um Best-Practices/Reject-Gruende/Vorbild-Formulierungen/Frist-Logik erweitert
chore(cron): extract-richtlinie + scan-new-programs auf llm.ts-Wrapper migriert
chore(workflows): DEEPSEEK_API_KEY als Pflicht, GEMINI_API_KEY als optional Fallback
```

→ ASCII in Commit-Subject (Code-Identifier-Konvention, weil git-tooling), deutsche Wörter ohne Umlaute. Body kann Umlaute haben (begrenzt durch Repo-Konvention CLAUDE.md Z.21).

---

## No Analog Found

Alle 11 Files haben mind. einen Analog im Codebase. **Keine** „from-scratch"-Files in Phase 3.

Schwächste Analoga (Discretion-Bereich):
- **Cost-Hint im PR-Body** — kein Repo-Analog (heute kein PR mit Cost-Zeilen). Plan kann freier formulieren; Style-Anker ist Markdown-Block-Format des existing PR-Body in `weekly-dossier-extraction.yml:93-104`.
- **Discriminated Union mit `discriminant`-Feld** in TypeScript-Interface — kein direktes Repo-Analog (`Eigenmittel.formenErlaubt` ist nur string-literal-Union, kein DU). Standard TS-Idiom, RESEARCH §C ausreichend belegt.
- **Mocked-Module-Test für Skript-File** (`__tests__/scripts/X.test.ts`) — kein Repo-Analog, weil Skripte heute nicht testbar exportiert sind. Empfehlung: statisches Grep (Option 1 in `extract-richtlinie.test.ts`-Sektion).

---

## Metadata

**Analog search scope:**
- `lib/wizard/` (richtlinien-schema, richtlinien-loader, llm)
- `lib/contact-schema.ts`, `lib/foerderSchema.ts`
- `scripts/` (validate-data, extract-richtlinie, scan-new-programs)
- `.github/workflows/` (beide Cron-Workflows)
- `__tests__/lib/foerderSchema.test.ts`, `__tests__/lib/wizard/facts-extractor.test.ts`, `__tests__/lib/wizard/matcher.dispatch.test.ts`

**Files scanned:** 13 (Sources) + 4 (Tests-Existence-Check via `find __tests__`)

**Pattern extraction date:** 2026-05-06

**Project conventions confirmed:**
- ASCII in Code-Identifiern, JSON-Schlüsselnamen, JSDoc (CLAUDE.md, `richtlinien-schema.ts` durchgehend)
- Umlaute in user-facing Markdown / Console-Strings / PR-Body-Texten (CLAUDE.md, existing Workflow-Body)
- `@/`-Path-Alias in `__tests__/`, relativer `../`-Import in `scripts/`
- Conventional-Commits mit deutscher Subject-Line (CLAUDE.md)
- DeepSeek default mit `deepseek-chat` (NICHT `-v4-flash`/`-pro`) — RESEARCH §A-4 + CLAUDE.md
