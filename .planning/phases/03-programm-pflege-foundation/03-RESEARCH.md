# Phase 3: Programm-Pflege Foundation - Research

**Researched:** 2026-05-06
**Domain:** TypeScript-Cron-Skripte + LLM-Provider-Migration + Schema-Erweiterung mit Runtime-Validierung
**Confidence:** HIGH (alle Befunde direkt aus Quelltext belegt; ein Schlüssel-Befund weicht von CONTEXT-Annahme ab — siehe §B-1)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema-Form der vier neuen Felder:**
- **D-01:** `bestPractices` ist semi-strukturiert: `{ thema: string; was_funktionierte: string; warum?: string }[]`. `warum` optional. Identifier in ASCII (lowerCamelCase) — Inhalt der Strings auf Deutsch mit Umlauten erlaubt (Encoding-Konvention: ASCII nur für Schlüsselnamen, nicht für Werte).
- **D-02:** `rejectGruende` ist semi-strukturiert: `{ grund: string; haeufigkeit?: 'haeufig' | 'gelegentlich'; vermeidung?: string }[]`. `haeufigkeit` als string-literal-Union (NICHT als deutsches Enum mit Umlaut, ASCII-only).
- **D-03:** `vorbildFormulierungen` ist Foreign-Key-strukturiert: `{ abschnitt_id: string; formulierung: string; kontext?: string }[]`. `abschnitt_id` referenziert `antragsstruktur.abschnitte[].id`. Validator prüft FK-Integrität (D-08).
- **D-04:** `fristLogik` ist Discriminated Union: `{ typ: 'rolling' } | { typ: 'fixe_stichtage'; stichtage: string[]; jaehrlich_wiederkehrend?: boolean }`. `stichtage` als ISO-Datumsstrings (`YYYY-MM-DD`).
- **D-05:** Alle vier neuen Felder werden auf der Top-Level `Richtlinie`-Interface platziert (neben `kostenpositionen`, `eigenmittel` etc.).
- **D-06:** TypeScript-Schema setzt die vier neuen Felder als **optional** (`?`-Postfix) — Phase 4 muss die 11 Legacy-Dossiers nicht type-blocking migrieren. Runtime-Validator (D-08) erzwingt sie für neu extrahierte Dossiers separat.

**Provider-Default + Fallback:**
- **D-07:** Beide Cron-Skripte rufen den `lib/wizard/llm.ts`-Wrapper mit Default `LLM_PROVIDER=deepseek` und Modell `MODEL_PIPELINE` (= `deepseek-chat`). Gemini-Fallback bleibt verfügbar via `LLM_PROVIDER=gemini` als Env-Override im Workflow-Dispatch — kein automatischer Code-Pfad-Fallback.

**Validator-Strategie:**
- **D-08:** `scripts/validate-data.ts` (bzw. `.js`) bekommt einen `--legacy`-Flag: Default (strict) = alle vier neuen Felder sind required + FK-Integrität für `vorbildFormulierungen[].abschnitt_id`. `--legacy`-Modus akzeptiert Dossiers ohne neue Felder. Pro fehlerhaftem Dossier eine Diagnostik-Liste, Exit-Code 1 wenn mind. ein Dossier failt.

**Test-Run-Definition für Acceptance:**
- **D-09:** „Mind. 1 Test-Run grün" (Roadmap Success-Criterion 2):
  1. Workflow-Dispatch-Run gegen `weekly-dossier-extraction.yml` mit konkretem `program_id`.
  2. Workflow-Dispatch-Run gegen `weekly-program-scan.yml` ohne Argumente.
  3. Lokaler Smoke: `npx tsx scripts/extract-richtlinie.ts --next` produziert Dossier mit allen vier neuen Feldern; `npx tsx scripts/validate-data.ts` (strict) validiert grün.
  4. Validator gegen die 11 Legacy-Dossiers im `--legacy`-Modus muss grün laufen.

**GitHub-Workflows:**
- **D-10:** Beide Workflows ersetzen `secrets.GEMINI_API_KEY` durch `secrets.DEEPSEEK_API_KEY` als Pflicht-Secret + behalten `secrets.GEMINI_API_KEY` als optionales Fallback-Secret. Pre-Flight-Check schlägt fehl, wenn `DEEPSEEK_API_KEY` fehlt.
- **D-11:** Existing PR-Pattern bleibt: `peter-evans/create-pull-request@v7`, Branch `dossier-bot/<programm_id>`, Labels `richtlinien-bot` + `auto-generated`. Reviewer-Checkliste in `weekly-dossier-extraction.yml` wird um die vier neuen Felder erweitert.

### Claude's Discretion

- Konkrete Default-Werte für `MODEL_PIPELINE` in den Cron-Skripten (Wrapper liefert das ohnehin)
- Genaue Diagnostik-Format des Validator-Outputs
- Prompt-Anpassungen in `extract-richtlinie.ts`, damit der LLM die vier neuen Felder befüllt (Negativbeispiele gegen Halluzination, max-Anzahl pro Feld, etc.)
- Ob `version`-Feld im Dossier auf `2026-05-06` o.ä. gebumpt wird oder schema-version separat geführt wird

### Deferred Ideas (OUT OF SCOPE)

- Vorlauf-Wochen für interne Antrags-Planung (`vorlauf_wochen?` auf `fristLogik`) — Phase 5 oder 6, falls überhaupt.
- Automatischer Provider-Fallback im Code-Pfad (DeepSeek down → Gemini retry) — bewusst nicht jetzt.
- `quelle`-Feld auf `bestPractices`-Einträgen — Phase 6+, falls überhaupt.
- `schluesselwoerter[]` und `vermeidet_halluzination_typ` auf `vorbildFormulierungen` — Phase-5-Tuning-Felder, jetzt Over-Engineering.
- Bumpen der `version`-String-Konvention in Dossiers (z.B. semver statt Datum) — separates Refactor.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **FETCH-01** | Cron-Skripte `extract-richtlinie.ts` + `scan-new-programs.ts` von Gemini-direkt auf `lib/wizard/llm.ts`-Wrapper umstellen, Default DeepSeek `deepseek-chat` | §A (LLM-Wrapper-API), §B (Cron-Skript-Call-Sites), §F (DeepSeek JSON-Mode-Pflichten) |
| **FETCH-03** | Dossier-Schema-Erweiterung um (a) Best Practices, (b) Reject-Gründe, (c) Vorbild-Formulierungen, (d) Frist-Logik | §C (aktuelles Schema), §D (FK-Anker `abschnitt_id`), §E (Frist-Inventar Legacy-Dossiers), §G (Prompt-Engineering Anti-Halluzination) |

FETCH-02 + FETCH-04 sind explizit Phase 4 — Phase 3 darf sie nicht vorgreifen.
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Direktive | Auswirkung auf Phase 3 |
|-----------|------------------------|
| Deutsche Rechtschreibung mit Umlauten in Texten / UI / Markdown / Commit-Messages | Reviewer-Checklisten-Markdown im Workflow + Console-Logs der Skripte: Umlaute aktiv. **Aber:** im JSON-Datenfeld-Output (z.B. `bestPractices[].thema`) bleibt ASCII konsistent zur Repo-Konvention (D-01 + Repo-CLAUDE.md §Konventionen Z.19) — Inhalt von Strings darf Umlaute haben, Schlüssel nicht. |
| ASCII in Code-Identifiern und JSON-Schlüsselnamen | `bestPractices`, `rejectGruende`, `vorbildFormulierungen`, `fristLogik` — alle ASCII (D-01). String-Literal-Unions wie `'haeufig'`/`'gelegentlich'` sind Werte, müssen aber laut D-02 ebenfalls ASCII sein (sie sind Diskriminator-Strings, kein User-Text). |
| `deepseek-chat` als Default, NICHT `deepseek-v4-flash`/`-pro` (Reasoning-Modelle) | `MODEL_PIPELINE` in `lib/wizard/llm.ts:36` zeigt aktuell auf `deepseek-chat`. **Roadmap-Wording „Default DeepSeek `deepseek-v4-flash`" ist veraltet** — der Wrapper liefert ohnehin `deepseek-chat`, und CONTEXT D-07 hat das bereits korrigiert. |
| `feature/* → staging → main`, nie direkt auf `main` | Feature-Branch `feature/wizard-adaptive` ist aktuell HEAD. Phase 3 entweder in eigenen Sub-Branch `feature/programm-pflege-foundation` oder direkt drauf. |
| Conventional-Commits (`feat`, `fix`, `chore`, `docs`) mit kurzer deutscher Subject-Line | Plan-Commits z.B. `feat(richtlinien): Schema um Best-Practices/Reject-Gruende/Vorbild-Formulierungen/Frist-Logik erweitert` |

## Summary

Phase 3 zerfällt in **drei mechanisch trennbare Teilarbeiten** mit klar identifizierter Komplexität:

1. **Wrapper-Migration der zwei Cron-Skripte** (FETCH-01, niedriges Risiko): `scripts/extract-richtlinie.ts:206-242` und `scripts/scan-new-programs.ts:142-172` haben jeweils **genau einen LLM-Call** (`generateContent`) mit Identical Pattern (`getGenerativeModel({model, systemInstruction, generationConfig: {responseMimeType: 'application/json'}})` → `gm.generateContent(userPrompt)` → `res.response.text().trim()` → `JSON.parse`). Beide werden 1:1 ersetzt durch `generateJson<T>(model, system, user)` aus `lib/wizard/llm.ts:204-208`. Der Wrapper hat exakt die benötigte Signatur, Provider-Switch via `LLM_PROVIDER`, Timeout und Usage-Tracking.

2. **Schema-Erweiterung um vier Top-Level-Felder** (FETCH-03 Schema-Teil, niedriges Risiko): `lib/wizard/richtlinien-schema.ts:90-104` ist eine reine TypeScript-`interface`-Datei (KEIN Zod-Schema). Die vier optionalen Felder werden additiv ergänzt — `lib/wizard/richtlinien-loader.ts:16-29` lädt Dossiers via Runtime-`fs.readFile` + `JSON.parse as Richtlinie`, also bricht das Hinzufügen optionaler Felder strukturell **nichts**. 14 Konsumenten importieren `Richtlinie` (`grep` in §C-3) — alle nutzen es als Type-Hint, kein einziger zerlegt structurell, der TypeScript-Compiler bleibt grün.

3. **Validator-Erstellung** (FETCH-03 Validator-Teil, **mittleres Risiko, weil Annahme-Korrektur**): **Achtung**: Das CONTEXT D-08 + Roadmap formulieren „`scripts/validate-data.ts` wird erweitert". Der existierende `scripts/validate-data.ts` (85 Zeilen, §H) validiert aber `data/foerderprogramme.json` — **NICHT die Dossiers in `data/richtlinien/`**. Der Validator ist also de facto **neu zu erstellen** (z.B. als `scripts/validate-richtlinien.ts`), oder der bestehende muss grundlegend umgestaltet werden. Empfehlung: **neue Datei**, um die existierende Foerderprogramme-Validierung nicht zu brechen (bestehender npm-Workflow / CI-Lint?).

**Primary recommendation:** Drei-Plan-Struktur, sequenziell, jeder Plan einzeln testbar:
- **Plan 03-01:** Schema-Erweiterung in `lib/wizard/richtlinien-schema.ts` + Zod-Runtime-Schema neu in `lib/wizard/richtlinien-validator.ts` (Single Source of Truth für Type + Runtime-Check), `tsc --noEmit` grün, alle 11 Legacy-Dossiers laden weiterhin via `loadRichtlinie()` ohne Crash.
- **Plan 03-02:** Cron-Skript-Migration auf `lib/wizard/llm.ts`-Wrapper + Prompt-Erweiterung um die vier neuen Felder mit Anti-Halluzinations-Negativbeispielen + neuer `scripts/validate-richtlinien.ts` mit `--legacy`-Flag (greppable Diagnostik-Output, Exit-Code 1 bei Verletzung). Lokaler Smoke `npx tsx scripts/validate-richtlinien.ts --legacy` muss alle 11 Legacy-Dossiers grün durchlassen.
- **Plan 03-03:** Workflow-Migration auf `DEEPSEEK_API_KEY`-Pflicht + Pre-Flight-Check + Reviewer-Checkliste um vier Felder ergänzt + Workflow-Dispatch-Test-Run gegen 1 echtes offenes Programm (Kolja-Checkpoint zur Auswahl).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LLM-Provider-Dispatch | Backend / Library (`lib/wizard/llm.ts`) | — | Wrapper ist projekt-weit single source of truth, beide Cron-Skripte konsumieren |
| Cron-Trigger | CI / GitHub-Actions (`.github/workflows/*.yml`) | Backend (Skript-Logik in `scripts/`) | Workflow steuert Schedule + Secrets, Skript macht die Arbeit |
| Dossier-Extraktion | Backend / Skript (`scripts/extract-richtlinie.ts`) | LLM (DeepSeek) | Skript orchestriert Fetch → Prompt → Parse → Persist |
| Programm-Scan | Backend / Skript (`scripts/scan-new-programs.ts`) | LLM (DeepSeek) | Identisches Pattern wie Extract |
| Schema-Definition (Type) | Backend / Library (`lib/wizard/richtlinien-schema.ts`) | — | Compile-Time-Garantie für alle 14 Importeure |
| Schema-Validierung (Runtime) | Backend / Skript (`scripts/validate-richtlinien.ts` NEU) | Backend / Library (`lib/wizard/richtlinien-validator.ts` NEU mit Zod) | CLI-Tool ruft Library, Library ist auch im Skript wiederverwendbar |
| PR-Erstellung | CI / GitHub-Actions (`peter-evans/create-pull-request@v7`) | — | Bewährtes Pattern, nicht ersetzen |

## Standard Stack

### Core (bereits installiert, wiederverwenden)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | `^6.34.0` | DeepSeek API via OpenAI-kompatibler Schnittstelle | Bereits in `lib/wizard/llm.ts:91-101` integriert |
| `@google/generative-ai` | `^0.24.1` | Gemini-Fallback | Bleibt für `LLM_PROVIDER=gemini`-Override (D-07, D-10) |
| `zod` | `^3.24.1` | Runtime-Schema-Validierung | **Bereits installiert** (`package.json:57`), in `lib/contact-schema.ts`, `lib/newsletter-schema.ts`, `app/api/contact/route.ts` etabliertes Pattern. NICHT ajv/io-ts wählen, weil Zod-Konvention im Repo. |
| `tsx` | `^4.21.0` (devDep) | TypeScript direkt ausführen | Bereits Pattern in allen Skripten (`npx tsx scripts/X.ts`) |
| `peter-evans/create-pull-request` | `@v7` | PR-Erstellung in GitHub-Actions | Beide Workflows nutzen das schon, NICHT ersetzen |

### Supporting (kein Neuinstall nötig)

| Library | Verfügbar | Purpose |
|---------|-----------|---------|
| `node:fs/promises`, `node:path` | Built-in | File I/O in Skripten — bereits Pattern in beiden Cron-Skripten |
| `jest` + `ts-jest` | `^29.7.0` / `^29.4.9` | Unit-Tests für Validator-Logik (Discriminated-Union-Edge-Cases, FK-Integrität) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Hand-Rolled-Validator (wie `scripts/validate-data.js:14-68`) | Hand-rolled ist im Repo bereits Anti-Pattern: 70 Zeilen `if (!item.X)`-Boilerplate, keine TypeScript-Inferenz, Fehlermeldungen müssen manuell formatiert werden. Zod liefert Type-Inferenz UND Runtime-Check aus einer Quelle. |
| Zod | ajv (JSON-Schema) | ajv hat keine TypeScript-Inferenz, doppelte Wartung Schema + Type. Zod ist im Repo etabliert. |
| Zod-Schema in `richtlinien-schema.ts` | TypeScript-Interface beibehalten + parallele Zod-Datei | Empfehlung: Zod-Schema in **neuer** Datei `lib/wizard/richtlinien-validator.ts` + Re-Export der Typen via `z.infer<typeof RichtlinieSchema>`. Begründung: das bestehende `richtlinien-schema.ts` wird von 14 Stellen importiert, kompletter Umbau auf Zod + `infer` ist ein größerer Refactor (aus `interface Richtlinie` wird `type Richtlinie = z.infer<...>`) — funktioniert, ist aber Phase-überschreitendes Risiko. **Empfehlung für Phase 3:** Interface BLEIBT (mit den vier neuen Feldern als optional erweitert), Zod-Schema in NEUER Datei daneben — der Validator nutzt das Zod-Schema, alle anderen 14 Konsumenten nutzen weiter das Interface. |

**Installation:** Keine. Alle Dependencies bereits in `package.json:25-70` vorhanden.

**Version verification:**
```bash
npm view zod version       # erwartet ≥ 3.24.1, package.json hat ^3.24.1
npm view openai version    # erwartet ≥ 6.34.0
```
*(Nicht ausgeführt — wir installieren nichts Neues, also keine Drift-Gefahr.)*

## Architecture Patterns

### System Architecture Diagram

```
                          .github/workflows/
                          ┌──────────────────┐
                          │  weekly-dossier  │  cron Mo 04:00 UTC
                          │   -extraction    │  workflow_dispatch
                          │      .yml        │
                          └────────┬─────────┘
                                   │ Pre-Flight: DEEPSEEK_API_KEY?
                                   │ env: DEEPSEEK_API_KEY ←secrets
                                   │ env: GEMINI_API_KEY ←secrets (opt)
                                   │ env: LLM_PROVIDER=deepseek (default)
                                   ▼
                          npx tsx scripts/extract-richtlinie.ts --next
                          ┌──────────────────────────────────────────┐
                          │ 1. loadQueue() ← richtlinien-prio…json  │
                          │ 2. fetchOrRead(infoLink) → HTML→Text     │
                          │ 3. ── REPLACE ──                         │
                          │    new GoogleGenerativeAI(...)            │  ← entfernen
                          │    gm.generateContent(prompt)             │  ← entfernen
                          │ ── BY ──                                  │
                          │    generateJson<Richtlinie>(              │  ← einsetzen
                          │      MODEL_PIPELINE, SYSTEM, user)        │
                          │ 4. validateRichtlinie(parsed)             │  ← NEU (Zod)
                          │ 5. write data/richtlinien/<id>.json       │
                          │ 6. markDoneInQueue(id)                    │
                          └──────────────────────────────────────────┘
                                   │
                                   ▼
                          peter-evans/create-pull-request@v7
                          Branch: dossier-bot/<programm_id>
                          Body: Reviewer-Checkliste + 4 neue Felder



                          .github/workflows/
                          ┌──────────────────┐
                          │ weekly-program-  │  cron Mo 04:30 UTC
                          │     scan.yml     │
                          └────────┬─────────┘
                                   ▼
                          npx tsx scripts/scan-new-programs.ts
                          ┌──────────────────────────────────────────┐
                          │ 1. loadSourcesFile()                     │
                          │ 2. for each source: fetchHtml + stripHtml│
                          │ 3. ── REPLACE Gemini-Direct ──           │
                          │    generateJson<ScanResult>(             │  ← einsetzen
                          │      MODEL_INTERVIEW, EXTRACT_SYSTEM, …) │
                          │ 4. dedupe gegen knownNames + knownUrls   │
                          │ 5. append to data/program-candidates.json│
                          └──────────────────────────────────────────┘
                                   │
                                   ▼
                          PR (gleiches Pattern)


                          Schema (additiv, optional):
                          ┌──────────────────────────────────────────┐
                          │ lib/wizard/richtlinien-schema.ts         │
                          │   interface Richtlinie {                  │
                          │     version, quellen, foerderhoehe, …    │
                          │     bestPractices?: BestPractice[];       │ ← NEU
                          │     rejectGruende?: RejectGrund[];        │ ← NEU
                          │     vorbildFormulierungen?: Vorbild[];    │ ← NEU
                          │     fristLogik?: FristLogik;              │ ← NEU (DU)
                          │   }                                       │
                          │                                            │
                          │   FK-Anker: vorbildFormulierungen[].abschnitt_id │
                          │   ──────FK──────► antragsstruktur.abschnitte[].id │
                          └──────────────────────────────────────────┘
                                   │
                                   ▼
                          lib/wizard/richtlinien-validator.ts (NEU)
                          ┌──────────────────────────────────────────┐
                          │ z.object({…}) RichtlinieSchema (Zod)     │
                          │ z.object({…}) RichtlinieLegacySchema      │
                          │ validateRichtlinieFK(parsed): Issue[]    │ ← FK-Check
                          └──────────────────────────────────────────┘
                                   │
                                   ▼
                          scripts/validate-richtlinien.ts (NEU)
                          ┌──────────────────────────────────────────┐
                          │ glob data/richtlinien/*.json             │
                          │ for each: parse → Schema (strict|legacy) │
                          │ aggregate Issues, print greppable Lines  │
                          │ exit(0) if all pass else exit(1)         │
                          └──────────────────────────────────────────┘
```

### Recommended Project Structure

```
edufunds-app/
├── lib/wizard/
│   ├── richtlinien-schema.ts         # Bestand: interface Richtlinie + 4 neue optionale Felder
│   ├── richtlinien-validator.ts      # NEU: Zod-Schema + FK-Check-Funktion
│   ├── richtlinien-loader.ts         # Bestand: kein Change nötig
│   └── llm.ts                         # Bestand: kein Change nötig
├── scripts/
│   ├── extract-richtlinie.ts         # MIGRATE: LLM-Call ersetzen + Prompt erweitern + Validator-Call vor Persist
│   ├── scan-new-programs.ts          # MIGRATE: LLM-Call ersetzen
│   ├── validate-richtlinien.ts       # NEU: CLI-Validator mit --legacy-Flag
│   └── validate-data.ts              # Bestand: validiert weiterhin foerderprogramme.json (nicht anfassen)
├── .github/workflows/
│   ├── weekly-dossier-extraction.yml # MIGRATE: Pre-Flight + Secret-Switch + Reviewer-Checkliste
│   └── weekly-program-scan.yml       # MIGRATE: Pre-Flight + Secret-Switch
└── __tests__/lib/wizard/
    └── richtlinien-validator.test.ts # NEU: Unit-Tests für Discriminated Union + FK + Legacy-Modus
```

### Pattern 1: LLM-Wrapper-Aufruf (1:1-Replace im Cron)

**What:** Wrapper macht Provider-Switch, Timeout, Usage-Logging — Cron-Skript muss sich um nichts kümmern.

**Source:** `lib/wizard/llm.ts:204-208`

**Vorher (`scripts/extract-richtlinie.ts:235-242`):**
```typescript
const client = new GoogleGenerativeAI(apiKey);
const gm = client.getGenerativeModel({
  model: MODEL,                        // "gemini-2.5-pro" hardcoded
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: { responseMimeType: "application/json" },
});
const res = await gm.generateContent(userPrompt);
const raw = res.response.text().trim();
```

**Nachher:**
```typescript
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";

const result = await generateJson<Richtlinie>(
  MODEL_PIPELINE,                       // provider-bewusst, deepseek-chat im Default
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 8000 }                   // optional cap; SYSTEM_PROMPT wird mit "json"-Erwähnung ergänzt (§F)
);
const parsed = result.value;
console.log(`    Tokens: ${result.usage.promptTokens} in + ${result.usage.candidatesTokens} out`);
```

**Vorteile:** Kein eigener API-Key-Check (Wrapper warnt schon, `lib/wizard/llm.ts:220-226`), kein eigener Timeout, automatischer Provider-Switch via `LLM_PROVIDER`-Env-Var, automatisches Usage-Tracking.

### Pattern 2: Zod-Schema mit Discriminated Union

**What:** Strukturierte Runtime-Validierung mit Type-Inferenz für die `fristLogik`-DU.

**Source:** Zod 3.x docs (https://zod.dev/?id=discriminated-unions) — etabliert in repo via `lib/contact-schema.ts:1`

```typescript
// lib/wizard/richtlinien-validator.ts (NEU)
import { z } from "zod";

const BestPracticeSchema = z.object({
  thema: z.string().min(3),
  was_funktionierte: z.string().min(10),
  warum: z.string().optional(),
});

const RejectGrundSchema = z.object({
  grund: z.string().min(5),
  haeufigkeit: z.enum(["haeufig", "gelegentlich"]).optional(),
  vermeidung: z.string().optional(),
});

const VorbildFormulierungSchema = z.object({
  abschnitt_id: z.string().min(1),       // FK gegen antragsstruktur.abschnitte[].id
  formulierung: z.string().min(20),
  kontext: z.string().optional(),
});

const FristLogikSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("rolling") }),
  z.object({
    typ: z.literal("fixe_stichtage"),
    stichtage: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    jaehrlich_wiederkehrend: z.boolean().optional(),
  }),
]);

export const RichtlinieStrictSchema = z.object({
  version: z.string(),
  quellen: z.array(z.string()),
  foerderhoehe: z.object({ /* ... */ }),
  // ... bestehende Pflichtfelder
  bestPractices: z.array(BestPracticeSchema).min(1),    // strict: required
  rejectGruende: z.array(RejectGrundSchema).min(1),
  vorbildFormulierungen: z.array(VorbildFormulierungSchema).min(1),
  fristLogik: FristLogikSchema,
});

export const RichtlinieLegacySchema = RichtlinieStrictSchema.partial({
  bestPractices: true,
  rejectGruende: true,
  vorbildFormulierungen: true,
  fristLogik: true,
});

// FK-Check (Zod kann das nicht in einem Pass — separate Funktion)
export interface FkIssue { programmId: string; abschnitt_id: string; reason: string; }
export function validateForeignKeys(parsed: z.infer<typeof RichtlinieStrictSchema>, programmId: string): FkIssue[] {
  const issues: FkIssue[] = [];
  const validIds = new Set((parsed as any).antragsstruktur.abschnitte.map((a: any) => a.id));
  for (const v of parsed.vorbildFormulierungen ?? []) {
    if (!validIds.has(v.abschnitt_id)) {
      issues.push({ programmId, abschnitt_id: v.abschnitt_id, reason: `FK-Verletzung: abschnitt_id nicht in antragsstruktur.abschnitte[].id` });
    }
  }
  return issues;
}
```

### Pattern 3: Greppable Validator-Output

**What:** Eine Zeile pro Verletzung mit `programmId\t feld\t fehler` — `grep` + `awk` erlauben Phase-4-Migration der Legacy-Dossiers.

```typescript
// scripts/validate-richtlinien.ts (NEU)
function printIssue(programmId: string, field: string, msg: string): void {
  // Tab-separiert für trivialen `cut -f1` / `awk -F'\t'`
  console.log(`${programmId}\t${field}\t${msg}`);
}
```

Output bei Fehler:
```
aktion-mensch-schulkooperation	bestPractices	missing required field
aktion-mensch-schulkooperation	rejectGruende	missing required field
kultur-macht-stark	vorbildFormulierungen[2].abschnitt_id	FK violation: 'finanzplan-alt' not in [buendnis,zielgruppe,konzept,…]
```

### Anti-Patterns to Avoid

- **Hand-rolled-Validator wie `scripts/validate-data.js:14-68`** — 70 Zeilen `if (!item.X)`-Boilerplate, keine Discriminated-Union-Logik, Fehlermeldungen via `push()` in plain Array. Zod ist im Repo etabliert (`lib/contact-schema.ts`, `app/api/contact/route.ts`), nutze das.
- **Ersetze NICHT `scripts/validate-data.ts`/`.js`** — die validieren `data/foerderprogramme.json`, ein anderes Datenmodell. Neuer Validator als separate Datei `scripts/validate-richtlinien.ts`.
- **Bumpe NICHT die `version`-Konvention der Dossiers** — D-12-deferred. Die elf bestehenden Dossiers haben gemischte Strings (`"2026-04-20"`, `"2026-04-21-stub"`, `"2026-04-21-manuell"`); konsistent machen ist eigene Aufgabe.
- **Setze KEIN `MODEL` als String-Konstante** in den migrierten Skripten — der Wrapper exportiert `MODEL_PIPELINE` und `MODEL_INTERVIEW` provider-abhängig (`lib/wizard/llm.ts:43-44`); Cron-Skripte müssen sich um Provider nicht kümmern.
- **Vergiss NICHT, das Wort "json" im SYSTEM_PROMPT zu lassen** — DeepSeek `json_object`-Mode verlangt explizit den String "json" im Prompt (§F-1, https://api-docs.deepseek.com/guides/json_mode). Der bestehende SYSTEM_PROMPT in `extract-richtlinie.ts:53-83` enthält "JSON-Schema" und "Nur valides JSON ausgeben" — passt. Im neuen Scanner-Prompt darauf achten.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM-Provider-Switch | Custom `if (process.env.LLM_PROVIDER === 'deepseek') { … } else { … }` | `lib/wizard/llm.ts:204-208` (`generateJson`) | Wrapper macht Switch + Timeout + Usage in 60 Zeilen, repo-weit getestet |
| JSON-Schema-Validierung | Hand-Rolled-`if`-Cascade wie `validate-data.js:14-68` | Zod `^3.24.1` (already installed) | Discriminated Union / Optional / Refined-Constraints / Type-Inference aus einer Quelle |
| FK-Check zwischen `vorbildFormulierungen[].abschnitt_id` und `antragsstruktur.abschnitte[].id` | Hand-Rolled-Map-Build + Loop in jedem Validator-Aufruf | Eine `validateForeignKeys()`-Funktion in `richtlinien-validator.ts` (Pattern 2 oben), getestet via Unit-Test | Zod kann Cross-Field-Refinement via `.refine()` — geht aber unleserlich; separate Funktion klarer |
| GitHub-PR-Erstellung mit Branch + Body + Labels | Custom `gh pr create`-Aufruf | `peter-evans/create-pull-request@v7` (existing in beiden Workflows) | Idempotent, handles existing-branch-update, PR-Status-Tracking |
| HTTP-Fetch von Bundesseiten mit User-Agent-Header | Eigene `node-fetch`-Wrapper | Bestehender `fetchOrRead()` in `extract-richtlinie.ts:85-107` | Erkennt 403-Bot-Block-Pattern, Browser-UA bereits konfiguriert |
| HTML→Text-Stripping | Eigene Regex-Implementation | Bestehender `stripHtml()` in beiden Skripten (`extract-richtlinie.ts:109-116`, `scan-new-programs.ts:88-95`) | Bewährt, identisch zwischen beiden Skripten — beim Migrieren NICHT umschreiben |
| Anti-Halluzinations-Negativbeispiele in Prompts | Vom Scratch ausdenken | Pattern aus `lib/wizard/prompts.ts` (Bug-#2-Fix vom 30.04., siehe Memory) — Verbots-Liste mit konkreten Negativbeispielen, "lieber Lücke als Erfindung" | Empirisch bewährt: 8/0/0-UAT-Halluzinations-Marker bei strukturierten LLM-Outputs |

**Key insight:** Dieses Phase ist 80 % „Code zusammenklicken aus existierenden Bausteinen", 20 % neuer Validator-Code. Hauptrisiko: man baut den Validator aus Versehen auf das falsche Datenmodell (Foerderprogramme statt Richtlinien) — explizit umgehen durch separate Datei.

## Runtime State Inventory

> Phase 3 ist überwiegend Code/Schema-Erweiterung, aber sie ändert (a) die Schema-Erwartung an extrahierte Dossiers und (b) die GitHub-Secret-Anforderung. Daher Inventar pflichtig:

| Kategorie | Items Found | Action Required |
|-----------|-------------|------------------|
| **Stored data** | 11 Dossiers in `data/richtlinien/*.json` (siehe `ls data/richtlinien` §C-2) — alle ohne die vier neuen Felder. Queue-Datei `data/richtlinien-prioritaeten.json` mit 70 open / 11 done / 1 skip. | Keine Migration in Phase 3 — explizit Phase 4 (FETCH-04). Phase 3 stellt sicher, dass `--legacy`-Validator-Modus die 11 weiterhin grün durchlässt. |
| **Live service config** | GitHub-Repo-Secrets: `GEMINI_API_KEY` ist heute aktiv (beide Workflows lesen `secrets.GEMINI_API_KEY`). `DEEPSEEK_API_KEY` Status unbekannt — möglicherweise schon vorhanden für Live-API in `app/`, möglicherweise Repo-Secret muss neu gesetzt werden. | **Vor Workflow-Test-Run:** Kolja prüft im Repo-Settings → Actions → Secrets, ob `DEEPSEEK_API_KEY` schon existiert. Falls nein: setzen (gleicher Key wie in `.env.local`, der für Live-App genutzt wird). Plan 03-03-Action enthält explizit diesen Pre-Check. |
| **OS-registered state** | Nichts. Cron läuft in GitHub-Actions, nicht auf Hetzner-Server (anders als Scout-Cron für `scout-daily.js`). | Keine. |
| **Secrets/env vars** | `process.env.GEMINI_API_KEY` referenziert in `extract-richtlinie.ts:207`, `scan-new-programs.ts:180`. Nach Migration entfernt — Wrapper liest `DEEPSEEK_API_KEY` (`llm.ts:91`) bzw. `GEMINI_API_KEY` (`llm.ts:152`) automatisch je nach `LLM_PROVIDER`. Lokal: `.env.local` für Dev. | Keine Code-Änderung außer Entfernen der direkten `process.env.GEMINI_API_KEY`-Reads aus den Skripten. |
| **Build artifacts / installed packages** | `node_modules/@google/generative-ai` — bleibt für Gemini-Fallback, NICHT entfernen. `node_modules/openai` — wird ohnehin schon vom Wrapper genutzt. | Keine. |

**Kritischste Frage:** Ist `DEEPSEEK_API_KEY` als Repo-Secret in GitHub gesetzt? Wenn nicht, schlägt der allererste Workflow-Run fehl. Plan 03-03 muss das im Pre-Flight prüfen + dokumentieren.

## Common Pitfalls

### Pitfall 1: DeepSeek `json_object`-Mode ohne "json" im Prompt → leerer Content
**What goes wrong:** DeepSeek API verlangt explizit den Literal-String "json" im System- ODER User-Prompt, wenn `response_format: { type: 'json_object' }` gesetzt ist. Fehlt "json", liefert die API entweder Free-Form-Text oder gelegentlich leeren `content`.
**Why it happens:** Constraint laut https://api-docs.deepseek.com/guides/json_mode + bestätigt durch Issue https://github.com/browserbase/stagehand/issues/1204.
**How to avoid:** Existing `SYSTEM_PROMPT` in `extract-richtlinie.ts:53-83` enthält "JSON-Schema" und "Nur valides JSON ausgeben" — bleibt OK. Beim Erweitern um die vier neuen Felder die "JSON"-Erwähnungen behalten + im neuen Scanner-Prompt (`EXTRACT_SYSTEM` in `scan-new-programs.ts:68-86`) ist "JSON" auch enthalten.
**Warning signs:** `result.value` ist `{}` oder Parse-Fehler `DeepSeek lieferte kein valides JSON` (Wrapper-Error in `llm.ts:124`).

### Pitfall 2: Halluzinierte `rejectGruende` und `vorbildFormulierungen`
**What goes wrong:** Bei Richtlinien, die selbst keine Reject-Statistiken oder Vorbild-Formulierungen enthalten (das ist der Normalfall — Reject-Gründe stehen in BMBF-FAQ-PDFs oder Verbands-Mailings, nicht in der Richtlinie selbst), erfindet das LLM plausible-klingende-aber-falsche Gründe. Genau wie der Bug-#2-Fix vom 30.04. (Memory) bei `Section`/`Finanzplan`-Stages.
**Why it happens:** LLMs füllen Lücken mit plausiblen Annahmen, wenn das Schema sie als required/typischerweise-vorhanden markiert.
**How to avoid:** Im erweiterten `SYSTEM_PROMPT` explizit:
  - "Wenn die Richtlinie KEINE Best-Practices, Reject-Gründe oder Vorbild-Formulierungen enthält, gib für diese Felder leere Arrays `[]` zurück. Erfinde NICHTS."
  - "Wenn unsicher: lieber Lücke als Erfindung."
  - Negativ-Beispiele direkt in den Prompt einfügen (Pattern aus 30.04.-Bug-#2-Fix in `lib/wizard/prompts.ts`).
  - Quellen-Anker: `bestPractices` und `vorbildFormulierungen` MÜSSEN aus dem gelieferten Volltext extrahierbar sein, NICHT aus „Allgemeinwissen über Förderverfahren".
**Warning signs:** Reviewer-PR-Review entdeckt z.B. „Reject-Grund: Antrag enthielt keinen Genderdoppelpunkt" — Modell-typisches Halluzinations-Signal.

### Pitfall 3: FK-Verletzung `vorbildFormulierungen[].abschnitt_id`
**What goes wrong:** LLM extrahiert eine Vorbild-Formulierung und setzt `abschnitt_id: 'finanzplan-section'`, aber die `antragsstruktur.abschnitte[]`-IDs heißen `finanzplan` (wie in `kultur-macht-stark.json:152`). Pipeline-Stage 5 lädt dann nichts.
**Why it happens:** LLM kennt die `id`-Konvention nicht; ohne expliziten Hinweis im Prompt rät er.
**How to avoid:** SYSTEM_PROMPT muss enthalten: "vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus antragsstruktur.abschnitte[].id entsprechen, die du im selben Aufruf erzeugst." + Few-Shot mit korrektem Beispiel. Validator-FK-Check fängt es als Sicherheitsnetz.
**Warning signs:** `validateForeignKeys()` returns Issues — Plan 03-02-Validator muss das als Test-Case haben (siehe Validation Architecture §Test-Map).

### Pitfall 4: `fristLogik`-Discriminated-Union mit `'fixe_stichtage'` aber leerem `stichtage`-Array
**What goes wrong:** LLM liefert `{ typ: 'fixe_stichtage', stichtage: [] }` weil es weiß "es gibt fixe Termine" aber im Volltext keine konkreten Daten findet. Validator akzeptiert das ohne `.min(1)`-Constraint.
**Why it happens:** Fehlender Lower-Bound im Zod-Schema.
**How to avoid:** `z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1)` (siehe Pattern 2). Plus Test-Case "Liefert leeres `stichtage`-Array → muss failen".
**Warning signs:** Strict-Validator akzeptiert Dossier, das keinen Stichtag enthält.

### Pitfall 5: ISO-Datum-Drift `YYYY-MM-DD` vs. `DD.MM.YYYY`
**What goes wrong:** LLM extrahiert "10. April 2026" aus deutscher Richtlinie und schreibt `'10.04.2026'` statt `'2026-04-10'`. Beispiel sichtbar in `ferry-porsche-challenge.json:7` (Frist als deutsche Form im Text).
**Why it happens:** Deutsche Richtlinien nutzen `DD.MM.YYYY`, LLM kopiert das Format.
**How to avoid:** SYSTEM_PROMPT explizit: "stichtage MÜSSEN im Format YYYY-MM-DD geliefert werden — wenn Richtlinie '10. April 2026' nennt, schreibe '2026-04-10'." + Zod-Regex `^\d{4}-\d{2}-\d{2}$`.
**Warning signs:** Validator-Output `stichtage[0]\tString does not match pattern`.

### Pitfall 6: Cron-Skript nutzt `MODEL_INTERVIEW` statt `MODEL_PIPELINE` (oder umgekehrt)
**What goes wrong:** Wrapper exportiert beide. `MODEL_INTERVIEW` (= `deepseek-chat` bzw. `gemini-2.0-flash`) ist günstig + schnell, `MODEL_PIPELINE` (= `deepseek-chat` bzw. `gemini-2.5-pro`) ist hochwertiger. Bei DeepSeek aktuell beide gleich (`llm.ts:33-36`), bei Gemini-Fallback aber unterschiedlich (`llm.ts:37-40`).
**Why it happens:** Existing `extract-richtlinie.ts:30` setzt `gemini-2.5-pro` hardcoded — semantisch entspricht das `MODEL_PIPELINE`. Existing `scan-new-programs.ts:23` setzt `gemini-2.0-flash` — entspricht `MODEL_INTERVIEW`.
**How to avoid:** **Migrations-Mapping:**
  - `extract-richtlinie.ts` → `MODEL_PIPELINE` (Pro-Klasse, weil komplexe Schema-Extraktion)
  - `scan-new-programs.ts` → `MODEL_INTERVIEW` (Flash-Klasse, weil einfache Listen-Extraktion)
**Warning signs:** Bei Gemini-Fallback unerwartete Kosten oder Latenz-Drift gegen Vor-Migrations-Baseline.

## Code Examples

### Vollständige Migration `extract-richtlinie.ts` (Skizze für Plan 03-02)

```typescript
// Source: lib/wizard/llm.ts:204-208 (generateJson) + Pattern 1 oben
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import { validateRichtlinieStrict, validateForeignKeys } from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

// SYSTEM_PROMPT erweitert um die vier neuen Felder + Anti-Halluzinations-Regeln:
const SYSTEM_PROMPT = `Du extrahierst aus dem Volltext einer Foerderrichtlinie ein strukturiertes JSON-Dossier. Bleibe eng am Text, erfinde keine Zahlen oder Regeln. Wenn etwas nicht eindeutig ist, nutze "bemerkung" / "notizen"-Felder und lasse spezifische Felder weg statt zu raten.

Sprache: deutsch. Zahlen in EUR als number (ohne Punkte, ohne Komma). Prozente als number 0..100.

JSON-Schema (exakte Feldnamen):
{
  "version": "...",
  "quellen": [...],
  "foerderhoehe": {...},
  "kostenpositionen": [...],
  "eigenmittel": {...},
  "kumulierung": {...},
  "antragsstruktur": {
    "abschnitte": [{ "id", "name", "pflicht", ...}],
    ...
  },
  "bestPractices": [{
    "thema": "Titel der Best Practice",
    "was_funktionierte": "Konkrete Beobachtung — was hat im Antrag funktioniert",
    "warum"?: "optional, falls aus Richtlinie ableitbar"
  }],
  "rejectGruende": [{
    "grund": "konkreter Reject-Grund",
    "haeufigkeit"?: "haeufig" | "gelegentlich",
    "vermeidung"?: "wie vermeiden"
  }],
  "vorbildFormulierungen": [{
    "abschnitt_id": "MUSS exakt einer id aus antragsstruktur.abschnitte[].id entsprechen",
    "formulierung": "konkrete Vorbild-Formulierung",
    "kontext"?: "optional"
  }],
  "fristLogik": { "typ": "rolling" }
                 | { "typ": "fixe_stichtage", "stichtage": ["YYYY-MM-DD", ...], "jaehrlich_wiederkehrend"?: boolean },
  "notizen"?: [...]
}

REGELN GEGEN HALLUZINATION:
- Wenn die Richtlinie KEINE Best-Practices, Reject-Gruende oder Vorbild-Formulierungen enthaelt, gib leere Arrays zurueck. Erfinde NICHTS.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus antragsstruktur.abschnitte[].id entsprechen.
- stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10".
- Wenn unsicher: lieber leeres Feld als Erfindung.

Nur valides JSON ausgeben, keine Markdown-Fences.`;

// Im runExtraction-Body:
console.log("==> KI-Extraktion laeuft (Provider via LLM_PROVIDER, Default deepseek)");
const result = await generateJson<Richtlinie>(
  MODEL_PIPELINE,
  SYSTEM_PROMPT,
  userPrompt,
  { maxTokens: 8000 }
);
const parsed = result.value;

// Validator-Call vor Persist
const strictResult = validateRichtlinieStrict(parsed);
if (!strictResult.success) {
  console.warn("    Validator: strict-mode fail — Dossier wird trotzdem persistiert (Reviewer fixt im PR)");
  for (const issue of strictResult.error.issues) {
    console.warn(`      ${programmId}\t${issue.path.join(".")}\t${issue.message}`);
  }
}
const fkIssues = validateForeignKeys(parsed, programmId);
for (const fkIssue of fkIssues) {
  console.warn(`    FK-Verletzung: ${fkIssue.programmId}\t${fkIssue.abschnitt_id}\t${fkIssue.reason}`);
}

console.log(`    Tokens: ${result.usage.promptTokens} in + ${result.usage.candidatesTokens} out`);
```

### Workflow-Pre-Flight-Check (für Plan 03-03)

```yaml
# Source: D-10 + Pattern aus existing weekly-dossier-extraction.yml:42-51
env:
  PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}        # optional Fallback
  LLM_PROVIDER: ${{ github.event.inputs.llm_provider || 'deepseek' }}
run: |
  set -euo pipefail
  if [ -z "${DEEPSEEK_API_KEY}" ] && [ "${LLM_PROVIDER}" = "deepseek" ]; then
    echo "::error::DEEPSEEK_API_KEY Secret fehlt. Im Repo-Settings als Secret hinterlegen oder LLM_PROVIDER=gemini setzen."
    exit 1
  fi
  if [ -z "${GEMINI_API_KEY}" ] && [ "${LLM_PROVIDER}" = "gemini" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt fuer LLM_PROVIDER=gemini-Override."
    exit 1
  fi
  # ... rest wie bisher
```

Plus `workflow_dispatch.inputs.llm_provider`-Input für manuellen Override (CONTEXT D-10):

```yaml
on:
  workflow_dispatch:
    inputs:
      program_id:
        description: "Optional: bestimmtes Programm aus der Queue extrahieren"
        required: false
        type: string
      llm_provider:
        description: "LLM-Provider override (deepseek default, gemini fuer Fallback)"
        required: false
        type: choice
        options:
          - deepseek
          - gemini
        default: deepseek
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direkter `new GoogleGenerativeAI()`-Client in jedem Skript | Wrapper `lib/wizard/llm.ts` mit Provider-Switch | 28.04.2026 (DeepSeek-Migration) | Cron-Skripte sind die letzten direkten Gemini-Konsumenten — Phase 3 schließt die Lücke |
| Pflicht-`GEMINI_API_KEY` als alleiniges Secret | `DEEPSEEK_API_KEY` Pflicht + `GEMINI_API_KEY` optional Fallback | Phase 3 (jetzt) | Kein Single-Provider-Risiko mehr; ergibt Sense seit Provider-Wrapper exists |
| Hand-Rolled Validator (`validate-data.js:14-68`) | Zod-Schema `^3.24.1` (already used in `lib/contact-schema.ts`) | seit 02.1 (Stripe-Webhook-Härtung nutzte Zod) | Konsistenz im Repo, weniger Boilerplate |
| TypeScript-`interface` als Single-Source für Schema | TypeScript-`interface` + paralleles Zod-Schema (next-best Phase 3) ODER Zod als Single Source mit `z.infer` (Phase-überschreitend) | Phase 3 (parallel), eventuell Phase 4+ (single source) | Phase 3 wählt parallel-Modell, weil 14 Importeure das Interface nutzen |

**Deprecated/outdated:**
- `MODEL_FLASH` und `MODEL_PRO` Re-Exports in `llm.ts:46-48` — als `@deprecated` markiert, neue Skripte nutzen `MODEL_INTERVIEW` / `MODEL_PIPELINE`.
- Roadmap-Wording „Default DeepSeek `deepseek-v4-flash`" (`ROADMAP.md:88`) ist faktisch falsch (Reasoning-Modell, ungewollt). CONTEXT D-07 hat das korrigiert auf `deepseek-chat`. Phase 3 implementiert CONTEXT.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeepSeek-API hat Quota die für 2 Cron-Runs/Woche reicht (Extract + Scan) [ASSUMED — A/B-Test 28.04. lief im Live-Pipeline-Kontext, Cron-spezifischer Volumen-Test nicht durchgeführt] | §F | Cron schlägt mit 429 fehl — Workflow muss exponential-backoff handhaben. Wrapper hat das nicht eingebaut. **Mitigation:** im Plan 03-02-Verification ein einzelner manueller Cron-Run und Token-Verbrauch loggen. |
| A2 | `DEEPSEEK_API_KEY` ist als GitHub-Repo-Secret bereits gesetzt [ASSUMED — App nutzt es lokal/in production via Hetzner-Container, GitHub-Secret-Status nicht verifiziert] | §Runtime State Inventory | Erster Workflow-Run schlägt fehl mit „Secret missing". **Mitigation:** Plan 03-03 hat explizite Pre-Flight-Action „Kolja prüft Secret-Status im Repo-Settings". |
| A3 | DeepSeek `deepseek-chat` liefert für 60-80k-Char-User-Prompts (Extract-Skript pumpt bis zu 60000 chars × N Quellen, `extract-richtlinie.ts:220`) verlässlich JSON [ASSUMED — Wrapper hat 60s-Timeout, aber DeepSeek hat 64k Input-Token-Limit] | §F + Pitfall 1 | Truncation oder JSON-Parse-Fehler. **Mitigation:** `maxTokens: 8000` als Hard-Cap auf Output, plus gelegentlicher Fallback auf `LLM_PROVIDER=gemini` im Workflow-Dispatch wenn DeepSeek bei großen Quellen scheitert (D-07 erlaubt das). |
| A4 | Phase 4 wird die 11 Legacy-Dossiers via Migrations-Skript um die vier neuen Felder erweitern [CITED — ROADMAP.md:99-103 Phase 4 Success-Criterion 3] | §Validator-Strategie | Falls Phase 4 verschoben wird, bleibt `--legacy`-Modus permanent — kein technisches Risiko, nur Tech-Debt. |
| A5 | Reviewer-Checkliste in PR-Body als Markdown wird vom GitHub-PR-Reviewer (Kolja) als wirksam wahrgenommen [ASSUMED] | §D-11 | Falls die Checkliste mehr Lärm als Signal bringt, wird sie ignoriert. **Mitigation:** Phase 4 hat „Bug-Fix-Welle" für Cron-PRs, da kann nachjustiert werden. |
| A6 | Das Wort "json" muss im SYSTEM-Prompt für DeepSeek `json_object`-Mode präsent sein [VERIFIED: https://api-docs.deepseek.com/guides/json_mode + Issue browserbase/stagehand#1204] | §F + Pitfall 1 | Wenn vergessen → API-Returns leeren content oder Free-Form-Text. Verified, kein Risiko. |

## Open Questions

1. **DeepSeek-Cost pro Cron-Run unbekannt**
   - What we know: A/B-Test 28.04. zeigte `deepseek-chat` ist 30× günstiger und 5-25× schneller als `deepseek-v4-pro` (Reasoning). Live-Pipeline-Stages laufen seit 28.04. zufrieden auf `deepseek-chat`.
   - What's unclear: Cron-Extract verarbeitet einen einzelnen großen Prompt (60k+ Chars Volltext). Token-Cost pro Cron-Run nicht gemessen.
   - Recommendation: Plan 03-02 protokolliert `result.usage` ins Console-Log + als zusätzliche Zeile im PR-Body — Kolja sieht Cost pro PR und kann monatlich aggregieren. Falls > 1 € pro Cron-Run, hat Phase 4 einen Cost-Optimierungs-Auftrag.

2. **Reviewer-Checkliste-Format für 4 neue Felder**
   - What we know: D-11 verlangt die Erweiterung. Existing Checkliste in `weekly-dossier-extraction.yml:98-105` ist Markdown-Liste mit 6 Items.
   - What's unclear: Optimaler Detail-Level. „Best Practices plausibel?" als 1 Item oder als Liste mit Sub-Items pro Best-Practice?
   - Recommendation: Plan 03-03-Discretion. Empfehlung: 4 neue Top-Level-Items, jeweils mit konkreter Frage:
     - [ ] Best Practices: stehen wirklich in der Quelle (nicht halluziniert), max 5 Stück
     - [ ] Reject-Gründe: aus Volltext belegbar, `vermeidung`-Feld konstruktiv
     - [ ] Vorbild-Formulierungen: `abschnitt_id` zeigt auf existierende Sektion (FK ok), Formulierung wörtlich aus Quelle
     - [ ] Frist-Logik: `typ` korrekt (rolling vs fixe_stichtage), Daten im ISO-Format

3. **Test-Run-Programm-Wahl (D-09 #1)**
   - What we know: 70 offene Programme in Queue, einige mit dünner `infoLink` (`extract-richtlinie.ts:255-294` hat `markBlockedInQueue()` für leere Extraktionen).
   - What's unclear: Welches Programm wählt Kolja als Test-Programm? Sollte (a) ein guter `infoLink` sein (substanzieller Volltext) und (b) repräsentativ für die zu erwartenden 4 neuen Felder.
   - Recommendation: Plan 03-03-Checkpoint mit Vorauswahl-Liste 3 Kandidaten:
     - `bundesweit-ganztag` (Bund, BMBF, Score 89, langer Volltext erwartbar)
     - `nrwbank-moderne-schule` (Land, Bundesland-spezifisch, mittlere Komplexität)
     - Ein Stiftungs-Programm aus der Queue mit `score > 80`
     Kolja wählt am Tag des Test-Runs.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20.x | GitHub-Actions runner + lokale Cron-Smokes | ✓ (workflow `actions/setup-node@v4` mit `node-version: "20"`) | 20.x | — |
| `tsx` | `npx tsx scripts/X.ts` | ✓ (devDep `^4.21.0`) | 4.21.0 | `ts-node` (auch installiert) |
| `zod` | Validator-Library | ✓ (dep `^3.24.1`) | 3.24.1 | — |
| `openai` | DeepSeek-Calls via Wrapper | ✓ (dep `^6.34.0`) | 6.34.0 | — |
| `@google/generative-ai` | Gemini-Fallback via Wrapper | ✓ (dep `^0.24.1`) | 0.24.1 | — |
| `peter-evans/create-pull-request@v7` | Cron-PR-Erstellung | ✓ (used in beiden Workflows) | v7 | — |
| `DEEPSEEK_API_KEY` Repo-Secret | Workflow-Pre-Flight + Wrapper | ⚠ unverifiziert | — | `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (existing) |
| `GEMINI_API_KEY` Repo-Secret | Workflow-Pre-Flight (optional Fallback) | ✓ (heute Pflicht in beiden Workflows) | — | — |

**Missing dependencies with no fallback:** Keine — alle technischen Dependencies sind verfügbar.

**Missing dependencies with fallback:** `DEEPSEEK_API_KEY` als GitHub-Secret (siehe A2). Plan 03-03 enthält Pre-Flight-Action, die das aktiv prüft (nicht nur dokumentiert). Falls Secret fehlt, kann Workflow mit `LLM_PROVIDER=gemini` als Override gestartet werden — funktioniert weiter, aber Phase-3-Goal „Default DeepSeek" ist nicht in CI nachgewiesen.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest `^29.7.0` + ts-jest `^29.4.9` (config in `jest.config.js`) |
| Config file | `/home/kolja/edufunds-app/jest.config.js` (uses `next/jest` async wrapper) |
| Quick run command | `npm test -- --testPathPattern=richtlinien-validator` |
| Full suite command | `npm test` |
| Lint/Type-Check | `npx tsc --noEmit` (kein npm-script aber Standard) |
| CLI-Smoke (Validator) | `npx tsx scripts/validate-richtlinien.ts --legacy` (alle 11 Dossiers grün) |
| CLI-Smoke (Extract) | `LLM_PROVIDER=deepseek npx tsx scripts/extract-richtlinie.ts <programm-id> <url>` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FETCH-01 | `extract-richtlinie.ts` ruft `generateJson` aus `lib/wizard/llm.ts` (kein direkter `GoogleGenerativeAI`-Import mehr) | unit (grep-based static check, plus integration via Mock) | `npm test -- __tests__/scripts/extract-richtlinie.test.ts` | ❌ Wave 0 |
| FETCH-01 | `scan-new-programs.ts` ruft `generateJson` aus `lib/wizard/llm.ts` | unit (analog) | `npm test -- __tests__/scripts/scan-new-programs.test.ts` | ❌ Wave 0 |
| FETCH-01 | Pre-Flight-Check schlägt fehl ohne `DEEPSEEK_API_KEY` (bei `LLM_PROVIDER=deepseek`) | manual / workflow_dispatch | Workflow-Dispatch-Run mit Secret entfernt — checkliste-Punkt | — (manual) |
| FETCH-01 | Workflow `weekly-dossier-extraction.yml` läuft erfolgreich gegen 1 Test-Programm-ID via workflow_dispatch | manual / workflow_dispatch | GitHub-Actions UI-Klick (D-09 #1) | — (manual) |
| FETCH-01 | Workflow `weekly-program-scan.yml` läuft erfolgreich ohne Argumente | manual / workflow_dispatch | GitHub-Actions UI-Klick (D-09 #2) | — (manual) |
| FETCH-03 | Schema enthält 4 neue optionale Felder mit korrekten Typen | unit (Type-Check) | `npx tsc --noEmit` grün | ✅ (existing tsc) |
| FETCH-03 | Zod-Strict-Schema lehnt Dossier ohne neue Felder ab | unit | `npm test -- __tests__/lib/wizard/richtlinien-validator.test.ts -t "strict mode rejects legacy"` | ❌ Wave 0 |
| FETCH-03 | Zod-Legacy-Schema akzeptiert Dossier ohne neue Felder | unit | `npm test -- … -t "legacy mode accepts legacy"` | ❌ Wave 0 |
| FETCH-03 | Discriminated-Union `fristLogik` rejects `{typ:'fixe_stichtage', stichtage:[]}` | unit | `npm test -- … -t "fristLogik requires non-empty stichtage"` | ❌ Wave 0 |
| FETCH-03 | Discriminated-Union `fristLogik` rejects `stichtage: ['10.04.2026']` (deutsche Form) | unit | `npm test -- … -t "fristLogik stichtage must be ISO YYYY-MM-DD"` | ❌ Wave 0 |
| FETCH-03 | FK-Check fängt `vorbildFormulierungen[].abschnitt_id`, das nicht in `antragsstruktur.abschnitte[].id` existiert | unit | `npm test -- … -t "FK violation detected"` | ❌ Wave 0 |
| FETCH-03 | Validator-CLI mit `--legacy`-Flag akzeptiert alle 11 Legacy-Dossiers in `data/richtlinien/` | integration / smoke | `npx tsx scripts/validate-richtlinien.ts --legacy` exit 0 | ❌ Wave 0 |
| FETCH-03 | Validator-CLI ohne Flag (strict) lehnt alle 11 Legacy-Dossiers ab | integration / smoke | `npx tsx scripts/validate-richtlinien.ts` exit 1 + 11 Issues | ❌ Wave 0 |
| FETCH-03 | Lokaler Smoke `--next` produziert Dossier mit allen 4 neuen Feldern, das strict-validiert | integration / smoke | `LLM_PROVIDER=deepseek npx tsx scripts/extract-richtlinie.ts --next` (D-09 #3) | — (manual) |
| FETCH-03 | Bestehende `loadRichtlinie()` lädt 11 Legacy-Dossiers ohne Crash | integration | `npm test -- __tests__/lib/wizard/richtlinien-loader.test.ts` (existing? siehe Wave 0) | ⚠ Wave 0 (existence to verify) |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npm test -- --testPathPattern=richtlinien-validator` (~5-10s)
- **Per wave merge:** `npm test` (full suite, ~30-60s, beobachtet 34 pre-existing-Failures laut Memory)
- **Phase gate (`/gsd-verify-work`):** Full suite green delta (keine NEUE Regression über die 34 pre-existing) + 2 Workflow-Dispatch-Runs (D-09 #1+#2) + lokaler Smoke (D-09 #3) + Validator-CLI gegen Legacy (D-09 #4)

### Wave 0 Gaps

- [ ] `__tests__/lib/wizard/richtlinien-validator.test.ts` — Unit-Tests für Zod-Schema (strict + legacy + DU-Edge-Cases) + FK-Check
- [ ] `__tests__/scripts/extract-richtlinie.test.ts` — Mock `generateJson`, prüft dass Skript `MODEL_PIPELINE` und neuen SYSTEM_PROMPT verwendet (statisches grep + per Mock-Spy)
- [ ] `__tests__/scripts/scan-new-programs.test.ts` — analog für `MODEL_INTERVIEW`
- [ ] `__tests__/lib/wizard/richtlinien-loader.test.ts` — falls noch nicht existiert: existing Loader bricht nicht durch optionale Felder (Smoke-Test mit allen 11 Dossier-Fixtures aus `data/richtlinien/`)

*(Falls einer dieser Test-Dateien-Pfade durch Phase-02-Wave-0-Pattern-Konflikt schon angefasst wurde — siehe Memory „Workflow-Bug GSD execute-phase Step 5.5 Resurrected-Files-Schutz" — Cherry-Pick-Pattern verwenden.)*

---

# Detail-Befunde — Datei + Zeile-Belege

## §A — `lib/wizard/llm.ts`-Wrapper-API (HIGH confidence)

**Datei:** `lib/wizard/llm.ts` (227 Zeilen total) — bereits gelesen.

### A-1. Public Exports (Z.43-48 + Z.204-214)
```typescript
// Z.43-48
export const MODEL_INTERVIEW = MODELS[PROVIDER].interview;   // 'deepseek-chat' | 'gemini-2.0-flash'
export const MODEL_PIPELINE = MODELS[PROVIDER].pipeline;     // 'deepseek-chat' | 'gemini-2.5-pro'
/** @deprecated kompat-Re-Export */
export const MODEL_FLASH = MODEL_INTERVIEW;
export const MODEL_PRO = MODEL_PIPELINE;

// Z.204-214
export async function generateJson<T>(
  model: string, system: string, user: string, opts: LlmOptions = {}
): Promise<LlmResult<T>> { /* ... */ }

export async function generateText(
  model: string, system: string, user: string, opts: LlmOptions = {}
): Promise<LlmResult<string>> { /* ... */ }
```

### A-2. `LlmResult<T>` (Z.76-79)
```typescript
export interface LlmResult<T> {
  value: T;
  usage: Usage;   // { promptTokens, candidatesTokens } aus pricing.ts
}
```

### A-3. `LlmOptions` (Z.81-85)
```typescript
export interface LlmOptions {
  maxTokens?: number;   // einziger Option-Slot — Cron-Skripte können das setzen
}
```

### A-4. Provider-Routing (Z.25-26 + 32-41)
```typescript
const PROVIDER: LlmProvider =
  (process.env.LLM_PROVIDER as LlmProvider) === "gemini" ? "gemini" : "deepseek";

const MODELS: Record<LlmProvider, { interview: string; pipeline: string }> = {
  deepseek: {
    interview: "deepseek-chat",
    pipeline: "deepseek-chat",   // bewusst gleich
  },
  gemini: {
    interview: "gemini-2.0-flash",
    pipeline: "gemini-2.5-pro",
  },
};
```

**Befund:** Wrapper hat `LLM_PROVIDER`-Routing nativ. CONTEXT D-07 setzt das voraus — verifiziert.

### A-5. JSON-Mode bereits abgewickelt (Z.103-126)
```typescript
async function deepseekGenerateJson<T>(model, system, user, opts) {
  const res = await withTimeout(
    getDeepseek().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },         // ← DeepSeek-JSON-Mode
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    }),
    model
  );
  // ... parsen
  try { return { value: JSON.parse(text) as T, usage }; }
  catch { throw new Error(`DeepSeek lieferte kein valides JSON (${model}): ${text.slice(0, 300)}`); }
}
```

**Befund:** Cron-Skripte müssen NUR `generateJson<Richtlinie>(MODEL_PIPELINE, system, user, { maxTokens: 8000 })` aufrufen. Wrapper macht JSON-Mode + Parse + Error-Wrapping.

### A-6. Boot-Sanity-Check (Z.220-226)
```typescript
if (process.env.NODE_ENV !== "test") {
  if (PROVIDER === "deepseek" && !DEEPSEEK_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=deepseek aktiv, aber DEEPSEEK_API_KEY ist leer ...");
  } else if (PROVIDER === "gemini" && !GEMINI_API_KEY) {
    console.warn("[wizard/llm] LLM_PROVIDER=gemini aktiv, aber GEMINI_API_KEY ist leer ...");
  }
}
```

**Befund:** Sanity-Check nur als `console.warn`, nicht als hartes Exit. Cron-Workflow braucht eigenen Pre-Flight (D-10).

## §B — Cron-Skript-Call-Sites

### B-1. `scripts/extract-richtlinie.ts` (Z.207-242 + Z.30) — HIGH confidence

**Hardcoded MODEL (Z.30):**
```typescript
const MODEL = "gemini-2.5-pro";        // → ersetzen durch MODEL_PIPELINE-Import
```

**Direkter API-Key-Check (Z.207-211):**
```typescript
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
```
→ entfernen; Wrapper hat eigenen Boot-Warn (A-6); echter Pre-Flight ist auf Workflow-Ebene (D-10).

**Direkter Gemini-Call (Z.235-242):**
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
→ ersetzen durch `generateJson<Richtlinie>(MODEL_PIPELINE, SYSTEM_PROMPT, userPrompt, { maxTokens: 8000 })`.

**Gemini-spezifische Usage-Extraktion (Z.303-309):**
```typescript
const usage = res.response.usageMetadata;
console.log(`==> Geschrieben: ${outPath}`);
if (usage) {
  console.log(`    Tokens: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out`);
}
```
→ ersetzen durch `result.usage.promptTokens` + `result.usage.candidatesTokens` (Wrapper-LlmResult, A-2).

**SYSTEM_PROMPT (Z.53-83) bleibt 95 % identisch** — wird nur erweitert um die 4 neuen Felder (siehe Pattern Pattern-1-Code-Beispiel). Der existierende Prompt enthält bereits "JSON-Schema" und "Nur valides JSON ausgeben" → DeepSeek-JSON-Mode-Constraint (§F-1) erfüllt.

**Substanz-Check (Z.258-294)** — bleibt unverändert. Schlägt zu, wenn `kostenpositionen`, `antragsstruktur.abschnitte`, `foerderhoehe` alle leer sind. Bei den 4 neuen Feldern KEINE Substanz-Erweiterung — sie sind optional, ihre Abwesenheit triggert kein `markBlockedInQueue()`.

**Anzahl LLM-Call-Sites:** EXAKT EINE (`gm.generateContent(userPrompt)` in Z.241).

### B-2. `scripts/scan-new-programs.ts` (Z.142-172 + Z.23) — HIGH confidence

**Hardcoded MODEL (Z.23):**
```typescript
const MODEL = "gemini-2.0-flash";       // → ersetzen durch MODEL_INTERVIEW-Import
```

**Direkter API-Key-Check (Z.180-184) + Gemini-Client-Konstruktion (Z.193):**
```typescript
const apiKey = process.env.GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}
// ...
const gemini = new GoogleGenerativeAI(apiKey);
```
→ entfernen; Skript ruft direkt `generateJson<ScanResult>(...)`.

**Direkter LLM-Call (Z.158-164):**
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
→ ersetzen durch:
```typescript
try {
  const result = await generateJson<ScanResult>(
    MODEL_INTERVIEW, EXTRACT_SYSTEM, userPrompt, { maxTokens: 4000 }
  );
  return Array.isArray(result.value.programme) ? result.value.programme : [];
} catch (err) {
  console.error(`  Parse-Fehler bei ${src.id}:`, (err as Error).message);
  return [];
}
```

**EXTRACT_SYSTEM (Z.68-86)** enthält "JSON" → DeepSeek-Constraint OK. Keine Erweiterung nötig (Scanner extrahiert nur Listen-Einträge, nicht die 4 neuen Dossier-Felder).

**Anzahl LLM-Call-Sites:** EXAKT EINE pro Source-Iteration (`gemini.getGenerativeModel(...).generateContent(...)`).

## §C — Aktuelles Schema `lib/wizard/richtlinien-schema.ts` (HIGH confidence)

### C-1. Top-Level-Interface `Richtlinie` (Z.90-104)
```typescript
export interface Richtlinie {
  version: string;                     // Datum-String "2026-04-20"
  quellen: string[];
  foerderhoehe: Foerderhoehe;
  kostenpositionen: Kostenposition[];
  eigenmittel: Eigenmittel;
  kumulierung: Kumulierung;
  antragsstruktur: Antragsstruktur;
  notizen?: string[];
  veraltet?: boolean;
}
```

**KEIN Frist-Top-Level-Feld vorhanden.** Erweiterung um `bestPractices?`, `rejectGruende?`, `vorbildFormulierungen?`, `fristLogik?` ist konfliktfrei.

### C-2. `Antragsstruktur` und `AntragsAbschnitt` (Z.59-80) — FK-Anker
```typescript
export interface AntragsAbschnitt {
  id: string;                          // ← FK-Target für vorbildFormulierungen[].abschnitt_id
  name: string;
  pflicht: boolean;
  maxZeichen?: number;
  leitfragen?: string[];
  stilhinweis?: string;
}

export interface Antragsstruktur {
  abschnitte: AntragsAbschnitt[];      // ← Set für FK-Validation
  anlagen?: string[];
  einreichungsweg: string;
  bearbeitungsdauer?: string;          // ← Frist-naher Freitext, NICHT zu verwechseln mit fristLogik
}
```

**`einreichungsweg` ist Pflicht-Feld** — heute kein Konflikt mit `fristLogik`. Beachten: `bearbeitungsdauer` ist über die Bearbeitungs-Zeitspanne nach Einreichung — nicht mit Bewerbungs-Stichtag verwechseln.

### C-3. `Richtlinie`-Importeure (14 Stellen, alle als Type-Import) — HIGH confidence
```
app/api/wizard/start/route.ts:14:               import type { Richtlinie }
app/api/wizard/kumulierungs-check/route.ts:6:   import type { Kumulierung }
lib/wizard/interviewer.ts:12:                   import type { Richtlinie }
lib/wizard/finanzplan-autofix.ts:15:            import type { Richtlinie }
lib/wizard/facts-readiness.ts:10:               import type { Richtlinie }
lib/wizard/finanzplan-validator.ts:2:           import type { Richtlinie, Kostenposition }
lib/wizard/richtlinien-loader.ts:10:            import type { Richtlinie }
lib/wizard/finanzplan-generator.ts:4:           import type { Richtlinie }
lib/wizard/pipeline.ts:33:                      import type { Richtlinie }
lib/wizard/prompts.ts:5:                        import type { Richtlinie, AntragsAbschnitt }
scripts/smoke-pipeline-models.ts:20:            import type { Richtlinie }
scripts/smoke-pipeline-with-extractor.ts:19:    import type { Richtlinie }
scripts/extract-richtlinie.ts:28:               import type { Richtlinie }
scripts/smoke-critique-rerun.ts:19:             import type { Richtlinie }
scripts/smoke-pipeline-rerun.ts:20:             import type { Richtlinie }
```

**Alle als `import type`.** Optionale Felder hinzufügen bricht keinen einzigen Konsumenten — TypeScript erlaubt zusätzliche optionale Felder. Verifiziert durch Stichprobe `lib/wizard/pipeline.ts:33` (nur als Parameter-Typ benutzt).

## §D — `richtlinien-loader.ts` Loading-Pattern (HIGH confidence)

`lib/wizard/richtlinien-loader.ts` (40 Zeilen total):
```typescript
// Z.16-29
export async function loadRichtlinie(programmId: string): Promise<Richtlinie | null> {
  if (cache.has(programmId)) return cache.get(programmId)!;
  try {
    const raw = await fs.readFile(path.join(DIR, `${programmId}.json`), "utf8");
    const parsed = JSON.parse(raw) as Richtlinie;        // ← Runtime parse, kein TS-Compile-Time-Import
    cache.set(programmId, parsed);
    return parsed;
  } catch (err) { /* ... */ }
}
```

**Befund:** Loader nutzt **Runtime-`fs.readFile` + `JSON.parse as Richtlinie`** — KEIN `import dossier from "../data/richtlinien/X.json"` Build-Time-Pattern. **Folge:** Optionale neue Felder ändern weder Build noch Bundle-Größe; Legacy-Dossiers ohne Felder geben einfach `undefined` für die neuen Properties. Type-Cast `as Richtlinie` ist unsafe in beiden Richtungen, aber das ist Status quo.

## §E — Frist-Inventar in den 11 Legacy-Dossiers (HIGH confidence)

**Top-Level-Keys aller 11 Dossiers (identisch):**
```
['version', 'quellen', 'foerderhoehe', 'kostenpositionen', 'eigenmittel',
 'kumulierung', 'antragsstruktur', 'notizen']
```

**KEIN Top-Level `frist`, `deadline`, `bewerbungsfrist`, `stichtag`, `einreichungsfrist` in irgendeinem der 11 Dossiers.**

Frist-Hinweise heute als Freitext in:
- `antragsstruktur.bearbeitungsdauer` (5 von 11 Dossiers, z.B. `bmbf-digitalpakt-2.json`, `kultur-macht-stark.json`)
- `antragsstruktur.einreichungsweg` (z.B. `ferry-porsche-challenge.json:7`: "Bewerbungsfrist ist vom 09. Februar bis zum 10. April 2026.")
- `notizen[]` Freitext

**Konsequenz:** Neues Top-Level-Feld `fristLogik?` ist **konfliktfrei** — kollidiert mit nichts Bestehendem. Phase 4 (FETCH-04) kann beim Migrations-Lauf die Frist-Hinweise aus `bearbeitungsdauer`/`einreichungsweg`/`notizen` nach `fristLogik` lifting (Phase-3-Out-of-Scope).

## §F — DeepSeek `json_object`-Mode-Constraints (HIGH confidence)

### F-1. "json"-Wort im Prompt Pflicht
**Source:** https://api-docs.deepseek.com/guides/json_mode (offizielle DeepSeek-Docs) + bestätigt in https://github.com/browserbase/stagehand/issues/1204

**Constraint:** Bei `response_format: { type: 'json_object' }` MUSS der String "json" (case-insensitive) im SYSTEM- ODER USER-Prompt vorkommen. Sonst kann API empty `content` zurückgeben.

**Status in den existing Prompts:**
- `extract-richtlinie.ts:53-83` SYSTEM_PROMPT: enthält "JSON-Schema", "Nur valides JSON ausgeben" → ✓
- `scan-new-programs.ts:68-86` EXTRACT_SYSTEM: enthält "Ausgabe STRIKT als JSON" → ✓
- Erweiterung um die 4 neuen Felder muss "JSON" weiterhin enthalten (z.B. weiterhin "JSON-Schema:" als Header) → ✓ in Beispiel-Code in §Pattern-1.

### F-2. `max_tokens` empfohlen, sonst Truncation
**Source:** Same Docs.

**Constraint:** Setze `max_tokens` ausreichend hoch um JSON-Truncation zu verhindern. Wrapper hat `LlmOptions.maxTokens` (A-3).

**Empfehlung:** `extract-richtlinie.ts` Output ist ein vollständiges Dossier (multi-KB JSON) → `maxTokens: 8000`. `scan-new-programs.ts` Output ist Liste von Einträgen → `maxTokens: 4000`.

### F-3. DeepSeek Hallucination-Prevention (LOW confidence — Best-Practice-Ratschläge ohne empirische Phase-3-Validation)
**Source:** https://www.datastudios.org/post/deepseek-prompting-techniques-strategies-limits-best-practices-etc + https://deepseekai.guide/tutorials/deepseek-prompt-engineering/

**Tipps:**
1. **Role + Task vor langem Context-Block** — "DeepSeek weighs early tokens more heavily". `extract-richtlinie.ts:53` startet mit "Du extrahierst aus dem Volltext..." → ✓ Role + Task am Anfang.
2. **"I don't know"-Permission** — explizit erlauben: "Wenn unsicher → leer lassen". → in CONTEXT D-08 + neuer SYSTEM_PROMPT (Pattern-1-Beispiel).
3. **Few-Shot-Beispiele für die 4 neuen Felder** — minimum 1 Beispiel pro Feld. **Empfehlung:** Plan 03-02 ergänzt im SYSTEM_PROMPT eine konkrete Few-Shot-Sektion mit fiktivem Beispiel-Dossier-Auszug.
4. **Negativ-Beispiele gegen Halluzination** — Pattern aus 30.04.-Bug-#2-Fix in `lib/wizard/prompts.ts` (Memory). Verbots-Liste: "Erfinde keine Reject-Gründe, die nicht im Volltext stehen. Beispiele für FALSCHE Reject-Gründe (NICHT verwenden): 'Antrag enthielt Genderdoppelpunkt', 'Antrag wurde vor 12 Uhr eingereicht'".

## §G — Anti-Halluzinations-Patterns aus Repo-Eigenleistung (HIGH confidence — empirisch validiert)

**Source:** `~/.claude/projects/-home-kolja/memory/edufunds-project.md` Bug-#2-Fix vom 30.04.2026 (Section + Finanzplan mit Halluzinations-Verbots-Liste).

**Pattern:**
```
SECTION_SYSTEM + FINANZPLAN_SYSTEM mit harter Verbots-Liste:
  - Aktenzeichen,
  - Tarif-Stufen (TVöD-Stufen),
  - Phasen-Quartale,
  - MDM/Rahmenvertraege,
  - Strategie-Zitate,
  - Marken-/Modellnamen,
  - erfundene Honorarsaetze
+ Anweisung: "lieber Pauschale + 'in hinweise erlaeutert' als erfundene Splittung"
+ "lieber kuerzer als erfunden"
+ ehrliche Luecken-Anweisung: "eine schriftliche Zusage liegt bislang nicht vor"
```

**Empirisches Ergebnis:** End-to-End-Smoke `scripts/smoke-pipeline-with-extractor.ts` zeigt 8/0/0-UAT-Halluzinations-Marker (vorher 8 Marker positive).

**Übertragung auf Phase 3 (`extract-richtlinie.ts` SYSTEM_PROMPT):**
- "Erfinde KEINE Reject-Gründe — wenn die Quelle keine nennt, gib `[]`."
- "Erfinde KEINE Best-Practices — wenn die Quelle keine nennt, gib `[]`."
- "Vorbild-Formulierungen MÜSSEN wörtlich aus dem Volltext stammen — paraphrasiere NICHT."
- "Frist-Logik: wenn unklar ob rolling oder fixe_stichtage — Feld weglassen."

## §H — Existing Validator-Skripte (`scripts/validate-data.{ts,js}`) (HIGH confidence)

### H-1. Beide Versionen validieren `data/foerderprogramme.json`, NICHT die Dossiers
**Source:** `scripts/validate-data.ts:1-5`:
```typescript
import { Foerderprogramm } from '../lib/foerderSchema';
import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../data/foerderprogramme.json'),  // ← NICHT richtlinien!
  'utf-8'
));
```

`scripts/validate-data.js:1-5` analog.

### H-2. Beide sind Hand-Rolled, kein Zod
**Source:** `validate-data.ts:14-68`:
```typescript
data.forEach((item: any, index: number) => {
  const problems: string[] = [];
  if (!item.id) problems.push('Fehlend: id');
  if (!item.name) problems.push('Fehlend: name');
  // ... 40 Zeilen if-Cascade
});
```

### H-3. Konsequenz für Phase 3
**CONTEXT-D-08 sagt:** "`scripts/validate-data.ts` (bzw. `.js`) bekommt einen `--legacy`-Flag" — implizit: erweitere die existing Datei.

**Fakt:** Die existing Datei validiert ein **anderes Datenmodell** (`Foerderprogramm` aus `lib/foerderSchema`, nicht `Richtlinie` aus `lib/wizard/richtlinien-schema`). Sie um Dossier-Validierung zu erweitern wäre semantisch falsch und würde 2 Themen in einer Datei mischen.

**Empfehlung (Discretion-Bereich):** **Neue Datei** `scripts/validate-richtlinien.ts` für Dossier-Validierung. `scripts/validate-data.ts/.js` bleibt unverändert für `foerderprogramme.json`. Das macht den `--legacy`-Flag (D-08) auf `validate-richtlinien.ts` setzen, nicht auf `validate-data.ts`. Der Plan-Discretion-Spielraum erlaubt diese Korrektur.

## §I — GitHub-Workflows (HIGH confidence)

### I-1. `weekly-dossier-extraction.yml` (113 Zeilen total) Pre-Flight + Secret-Pattern (Z.41-72)
```yaml
env:
  PROGRAM_ID_INPUT: ${{ github.event.inputs.program_id }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}        # ← zu ersetzen durch DEEPSEEK_API_KEY-Pflicht
run: |
  set -euo pipefail
  if [ -z "${GEMINI_API_KEY}" ]; then
    echo "::error::GEMINI_API_KEY Secret fehlt. Im Repo-Settings als Secret hinterlegen."
    exit 1
  fi
  # ... Logik
```

### I-2. `weekly-program-scan.yml` (87 Zeilen total) — analoges Pattern (Z.36-46)

### I-3. PR-Pattern Reviewer-Checkliste (`weekly-dossier-extraction.yml:93-109`)
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

**Phase-3-Erweiterung (D-11):** 4 weitere Checkliste-Items (siehe §Open-Question-2-Empfehlung).

### I-4. `peter-evans/create-pull-request@v7` Konfig
- `commit-message`, `branch`, `delete-branch: true`, `title`, `body`, `labels` — Standard-Pattern.
- KEIN `reviewers`, kein `assignees` — Kolja erhält Notifications via Repo-Watch.

## §J — Programm-Queue + Sources (HIGH confidence)

### J-1. `data/richtlinien-prioritaeten.json` Status-Verteilung (Stand 2026-05-06)
- 70 `open`
- 11 `done`
- 1 `skip`
- Total 82 Items mit `kiAntragGeeignet=true`

### J-2. Source-Konfiguration `data/program-sources.json`
3 Sources konfiguriert:
- `bildungsserver-foerderung` (Deutscher Bildungsserver)
- `foerderdatenbank-schule` (Foerderdatenbank des Bundes)
- `begabungslotse` (Begabungslotse)

Format: `{ id, name, url, fokus? }` per Source. Kein Konflikt mit Phase 3.

### J-3. Test-Run-Programm-Kandidaten (für D-09 #1)
Top 5 offene Programme nach Score (aus J-1):
- `bundesweit-ganztag` (Score 89, BMBF, infoLink intakt)
- `nrwbank-moderne-schule` (Land NRW)
- weitere 68 mit Score < 89

(Kolja wählt am Test-Tag selbst, siehe Open Question 3.)

## Sources

### Primary (HIGH confidence)
- `lib/wizard/llm.ts` (gelesen Z.1-227) — Wrapper-API
- `scripts/extract-richtlinie.ts` (gelesen Z.1-348) — Cron-Extract
- `scripts/scan-new-programs.ts` (gelesen Z.1-252) — Cron-Scan
- `lib/wizard/richtlinien-schema.ts` (gelesen Z.1-104) — Schema
- `lib/wizard/richtlinien-loader.ts` (gelesen Z.1-40) — Loader
- `scripts/validate-data.ts` (gelesen Z.1-85) — Existing-Validator
- `scripts/validate-data.js` (gelesen Z.1-85) — JS-Pendant
- `.github/workflows/weekly-dossier-extraction.yml` (gelesen Z.1-113) — Cron-Workflow Extract
- `.github/workflows/weekly-program-scan.yml` (gelesen Z.1-87) — Cron-Workflow Scan
- `data/richtlinien/aktion-mensch-schulkooperation.json` (gelesen) — Repräsentatives Dossier
- `data/richtlinien/erasmus-schule-2026.json` (gelesen) — Sparse Legacy-Dossier
- `data/richtlinien/kultur-macht-stark.json` (gelesen) — Komplexes Dossier mit `bearbeitungsdauer`-Hinweis
- `package.json` (gelesen Z.1-71) — `zod ^3.24.1` bestätigt vorhanden
- `jest.config.js` (gelesen) — Test-Framework
- `data/richtlinien-prioritaeten.json` (gelesen Top 10 + Status-Counts)
- `data/program-sources.json` (gelesen)
- `tsconfig.json` (gelesen Top 30) — `strict: true`, `moduleResolution: bundler`, `target: ES2017`
- `CLAUDE.md` (Projekt-Root, gelesen) — Konventionen

### Secondary (MEDIUM confidence — verified via official docs)
- DeepSeek API Docs JSON-Mode: https://api-docs.deepseek.com/guides/json_mode (gelesen via WebSearch + zitiertes Verhalten)
- DeepSeek Compatibility Issue: https://github.com/browserbase/stagehand/issues/1204 (Issue belegt empty-content-Risiko ohne "json"-Wort)
- Zod 3.x Discriminated Unions: https://zod.dev/?id=discriminated-unions (Pattern bekannt aus repo-existing `lib/contact-schema.ts`)

### Tertiary (LOW confidence — single source, training data only)
- DeepSeek Prompting Best-Practices: https://www.datastudios.org/post/deepseek-prompting-techniques-strategies-limits-best-practices-etc — generelle Tipps, NICHT projekt-empirisch validiert
- DeepSeek V4 Practitioner Guide: https://deepseekai.guide/tutorials/deepseek-prompt-engineering/ — generell

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Dependencies in `package.json` verifiziert, Versionen exakt
- Architektur (3-Plan-Cut): HIGH — Zerlegung folgt sauber den Datei-Boundaries
- Cron-Skript-Migration-Pattern: HIGH — beide Skripte haben EXAKT EINE Call-Site, Wrapper-API matcht 1:1
- Schema-Erweiterung (Konfliktfreiheit): HIGH — verifiziert über alle 11 Legacy-Dossiers + 14 Type-Importeure
- FK-Pattern (`abschnitt_id`): HIGH — `id`-Feld auf `AntragsAbschnitt` ist `string`, in jedem der 11 Legacy-Dossiers gepflegt
- Validator-Strategy (neue Datei statt Erweiterung): HIGH — existing Datei validiert anderes Datenmodell, Begründung wasserdicht
- Workflow-Migration: HIGH — Pre-Flight-Pattern + Secret-Switch sind triviale YAML-Edits
- Anti-Halluzinations-Prompt-Erweiterung: MEDIUM — Pattern aus 30.04.-Bug-Fix empirisch validiert, aber Übertragung auf Cron-Extract nicht direkt getestet (zu testen in Plan-03-02-Smoke)
- DeepSeek Quota für Cron-Volume: LOW — A1 als Assumption, nicht volumen-getestet

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 Tage; falls DeepSeek-Modell-IDs sich ändern oder `lib/wizard/llm.ts` umfangreich refactored wird, Re-Verify)
