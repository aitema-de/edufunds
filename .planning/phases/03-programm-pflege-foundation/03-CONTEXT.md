# Phase 3: Programm-Pflege Foundation - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Cron-Skripte (`scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`) auf den einheitlichen `lib/wizard/llm.ts`-Wrapper umstellen, GitHub-Workflows entsprechend auf DeepSeek-Secret aktualisieren, und das Dossier-Schema (`lib/wizard/richtlinien-schema.ts`) um vier qualitätskritische Felder erweitern, damit Phase 4 darauf aufbauen kann (FETCH-01, FETCH-03).

**Was 03 NICHT macht:**
- Vollautomatischer Scanner→Extractor→Queue-Loop ohne Human-In-The-Loop → Phase 4 (FETCH-02)
- Migration der bestehenden 11 Dossiers auf das erweiterte Schema → Phase 4 (FETCH-04)
- Pipeline-Tuning, das die neuen Felder konsumiert → Phase 5 (WIZ-01..04)
- Kein neues Modell-Tuning oder Prompt-Engineering der bestehenden Pipeline-Stages

</domain>

<decisions>
## Implementation Decisions

### Schema-Form der vier neuen Felder

- **D-01:** `bestPractices` ist semi-strukturiert: `{ thema: string; was_funktionierte: string; warum?: string }[]`. `warum` optional, weil oft aus Richtlinie nicht klar ableitbar. Identifier in ASCII (lowerCamelCase) — Inhalt der Strings auf Deutsch mit Umlauten erlaubt (Encoding-Konvention: ASCII nur für Schlüsselnamen, nicht für Werte).
- **D-02:** `rejectGruende` ist semi-strukturiert: `{ grund: string; haeufigkeit?: 'haeufig' | 'gelegentlich'; vermeidung?: string }[]`. `haeufigkeit` als string-literal-Union (NICHT als deutsches Enum mit Umlaut, ASCII-only). `vermeidung` macht das Feld für die Critique-Stage in Phase 5 aktionabel — Pipeline kann „vermeidung" direkt als Anti-Pattern-Regel laden.
- **D-03:** `vorbildFormulierungen` ist Foreign-Key-strukturiert auf bestehende `Antragsstruktur.abschnitte[]`: `{ abschnitt_id: string; formulierung: string; kontext?: string }[]`. `abschnitt_id` referenziert `antragsstruktur.abschnitte[].id` — der Section-Stage in der Pipeline holt gezielt die Vorbild-Texte für den gerade generierten Abschnitt. Validator prüft FK-Integrität (siehe D-08).
- **D-04:** `fristLogik` ist Discriminated Union: `{ typ: 'rolling' } | { typ: 'fixe_stichtage'; stichtage: string[]; jaehrlich_wiederkehrend?: boolean }`. `stichtage` als ISO-Datumsstrings (`YYYY-MM-DD`). `jaehrlich_wiederkehrend?: boolean` deckt den häufigen Realfall „Bewerbung jährlich bis 30.06." ab — ohne dieses Feld würden Dossiers durch Datums-Verstreichen kontinuierlich ungültig. Vorlauf-Wochen für interne Antrags-Planung sind explizit ausgeschlossen (Phase 5/6, falls überhaupt).
- **D-05:** Alle vier neuen Felder werden auf der Top-Level `Richtlinie`-Interface platziert (neben `kostenpositionen`, `eigenmittel` etc.) — sie sind programmweit, nicht abschnitts- oder kostenposition-spezifisch.
- **D-06:** TypeScript-Schema setzt die vier neuen Felder als **optional** (`?`-Postfix) — so muss Phase 4 die 11 Legacy-Dossiers nicht type-blocking migrieren. Runtime-Validator (D-08) erzwingt sie für neu extrahierte Dossiers separat.

### Provider-Default + Fallback-Strategie (Claude's Discretion, Standard-Defaults)

- **D-07:** Beide Cron-Skripte rufen den `lib/wizard/llm.ts`-Wrapper mit Default `LLM_PROVIDER=deepseek` und Modell `MODEL_PIPELINE` (= `deepseek-chat` per CLAUDE.md, NICHT `deepseek-v4-flash` aus dem ROADMAP-Wording — A/B-Test 28.04. hat das widerlegt). Gemini-Fallback bleibt verfügbar via `LLM_PROVIDER=gemini` als Env-Override im Workflow-Dispatch — kein automatischer Code-Pfad-Fallback (vermeidet Silent-Provider-Drift). Lokale Devs nutzen `DEEPSEEK_API_KEY` + optional `GEMINI_API_KEY`. **Folge:** Cron läuft etwas länger als bei Gemini (DeepSeek ist langsamer bei großen Prompts), aber Single-Source-of-Truth für LLM-Provider.

### Validator-Strategie für Legacy-Kompatibilität (Claude's Discretion, Standard-Defaults)

- **D-08:** `scripts/validate-data.ts` (bzw. `.js`) bekommt einen `--legacy`-Flag:
  - **Default (strict):** Alle vier neuen Felder sind required. Validator prüft zusätzlich FK-Integrität für `vorbildFormulierungen[].abschnitt_id` gegen `antragsstruktur.abschnitte[].id`.
  - **`--legacy`:** Akzeptiert Dossiers ohne neue Felder. Default-Modus für CI-Lint auf Master, `--legacy` als Übergangs-Mode für die 11 bestehenden Dossiers in `data/richtlinien/`.
  - **Fail-Modus pro Datei:** Validator druckt pro fehlerhaftem Dossier eine kurze Diagnostik-Liste (welches Feld fehlt, welche FK-Verletzung), Exit-Code 1 wenn mind. ein Dossier failt im aktiven Modus.
  - Phase 4 wird `--legacy` schrittweise durch die Migration entfernen, bis alle Dossiers strict-validiert werden können.

### Test-Run-Definition für Acceptance (Claude's Discretion, Standard-Defaults)

- **D-09:** „Mind. 1 Test-Run grün" (Roadmap Success-Criterion 2) wird konkret als:
  1. **Workflow-Dispatch-Run gegen `weekly-dossier-extraction.yml`** mit `program_id` = einem konkreten offenen Programm aus der Queue (Kolja wählt eines beim Test). Lauf muss erfolgreich beenden, PR muss korrekt erstellt werden.
  2. **Workflow-Dispatch-Run gegen `weekly-program-scan.yml`** ohne Argumente (Default: alle Sources). Lauf muss erfolgreich beenden — Kandidaten-PR ist OK auch wenn leer (= keine neuen Programme heute).
  3. **Lokaler Smoke**: `npx tsx scripts/extract-richtlinie.ts --next` produziert ein neues Dossier mit allen vier neuen Feldern; `npx tsx scripts/validate-data.ts` (strict mode) validiert es grün.
  4. Validator gegen die 11 Legacy-Dossiers im `--legacy`-Modus muss grün laufen — sonst hat die Schema-Erweiterung Backward-Compat gebrochen.

### GitHub-Workflows

- **D-10:** Beide Workflows (`weekly-dossier-extraction.yml`, `weekly-program-scan.yml`) ersetzen `secrets.GEMINI_API_KEY` durch `secrets.DEEPSEEK_API_KEY` als Pflicht-Secret + behalten `secrets.GEMINI_API_KEY` als optionales Fallback-Secret (für Workflow-Dispatch-Override mit `LLM_PROVIDER=gemini`). Pre-Flight-Check schlägt fehl, wenn `DEEPSEEK_API_KEY` fehlt.
- **D-11:** Existing PR-Pattern bleibt unverändert: `peter-evans/create-pull-request@v7`, Reviewer-Checkliste, Branch-Name `dossier-bot/<programm_id>`, Labels `richtlinien-bot` + `auto-generated`. Reviewer-Checkliste in `weekly-dossier-extraction.yml` wird um die vier neuen Felder erweitert (Best Practices plausibel? Reject-Gründe nicht halluziniert? Vorbild-Formulierungen passen zu den Abschnitten? Frist-Logik korrekt?).

### Claude's Discretion

- Konkrete Default-Werte für `MODEL_PIPELINE` in den Cron-Skripten (Wrapper liefert das ohnehin)
- Genaue Diagnostik-Format des Validator-Outputs
- Prompt-Anpassungen in `extract-richtlinie.ts`, damit der LLM die vier neuen Felder befüllt (Negativbeispiele gegen Halluzination, max-Anzahl pro Feld, etc.)
- Ob `version`-Feld im Dossier auf `2026-05-06` o.ä. gebumpt wird oder schema-version separat geführt wird

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema + LLM-Infrastruktur

- `lib/wizard/richtlinien-schema.ts` — bestehendes Dossier-Schema, das um vier Felder erweitert wird. Top-Level-Interface `Richtlinie` ist der Erweiterungspunkt; `Antragsstruktur.abschnitte[].id` ist FK-Anker für `vorbildFormulierungen`.
- `lib/wizard/llm.ts` — Provider-Wrapper, Single Source of Truth für LLM-Calls. Exports `generateJson<T>(model, system, user, opts)` + `generateText(...)` mit `withTimeout` (60s). `MODEL_INTERVIEW` / `MODEL_PIPELINE` sind die provider-bewussten Modell-IDs.
- `CLAUDE.md` (Projekt-Root) — Konvention `deepseek-chat` als Default (NICHT `deepseek-v4-flash`/`-pro`), Encoding-Regel ASCII in JSON-Datenfeldern, Branch-Workflow `feature/* → staging → main`.

### Cron-Skripte (Migrations-Targets)

- `scripts/extract-richtlinie.ts` — heute `GoogleGenerativeAI` direkt, MODEL `gemini-2.5-pro`. Drei CLI-Modi (`--list`, `--next`, manuell). Output: `data/richtlinien/<programmId>.json` + Queue-Status-Update.
- `scripts/scan-new-programs.ts` — heute `GoogleGenerativeAI` direkt, MODEL `gemini-2.0-flash`. Liest `data/program-sources.json`, schreibt `data/program-candidates.json`.
- `scripts/validate-data.ts` (+ `validate-data.js`) — bestehender Validator, wird um Schema-Check für die vier neuen Felder + `--legacy`-Flag erweitert.

### GitHub-Workflows

- `.github/workflows/weekly-dossier-extraction.yml` — Cron Mo 04:00 UTC, ruft `extract-richtlinie.ts --next`, eröffnet PR via `peter-evans/create-pull-request@v7`. Aktueller Secret-Name: `GEMINI_API_KEY` (zu ersetzen durch `DEEPSEEK_API_KEY`).
- `.github/workflows/weekly-program-scan.yml` — Cron Mo 04:30 UTC, ruft `scan-new-programs.ts`, eröffnet Kandidaten-PR.

### Anforderungen + Roadmap-Kontext

- `.planning/REQUIREMENTS.md` §FETCH-01, §FETCH-03 — Pflicht-Anforderungen dieser Phase. FETCH-02 + FETCH-04 sind explizit Phase 4 (Phase 3 darf sie nicht vorgreifen).
- `.planning/ROADMAP.md` Phase 3 + Phase 4 + Phase 5 — Phase 3 als Vorarbeit für 4 (Vollautomation + Migration) und 5 (Pipeline-Tuning konsumiert die neuen Felder).
- `.planning/phases/02-matcher-quality/02-CONTEXT.md` — vorherige Phase, hat Cron-Migration als Out-of-Scope explizit benannt; Eval-Driven-Pattern (PR-Gate) ist projekt-weit etabliert.

### Beispiel-Dossier (Form-Referenz)

- `data/richtlinien/aktion-mensch-schulkooperation.json` — repräsentatives Legacy-Dossier ohne die vier neuen Felder. Beispiel für Format und Struktur, das Validator im `--legacy`-Modus akzeptieren muss.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `lib/wizard/llm.ts` mit `generateJson<T>` + `generateText` — beide Cron-Skripte sollten Schema-Output über `generateJson<Richtlinie>` bzw. `generateJson<KandidatenListe>` einlesen. Wrapper macht Provider-Switch + Timeout + Usage-Tracking automatisch — Cron-Skripte müssen sich darum nicht kümmern.
- `Usage`-Logging über `LlmResult<T>.usage` (aus `lib/wizard/pricing.ts`) — Cron-Logs sollten Token-Costs pro Lauf rausschreiben (für Quota-Monitoring).
- `peter-evans/create-pull-request@v7` ist im Repo bewährt — wiederverwenden, NICHT durch eigene PR-Logik ersetzen.

### Established Patterns

- Cron-CLI-Tool-Pattern: `--list`, `--next`, manuell-Modus mit klaren Argumenten. Workflow ruft `npx tsx scripts/X.ts` mit Env-Vars für Secrets.
- Reviewer-Checkliste im PR-Body als Markdown-Liste — Pattern aus `weekly-dossier-extraction.yml` ist die Vorlage.
- ASCII in JSON-Schlüsseln (`bestPractices`, NICHT `bestPraktiken`; `rejectGruende`, NICHT `rejectGründe`) — folgt Repo-Konvention CLAUDE.md.
- DeepSeek `deepseek-chat` (NICHT die `-v4-flash`/`-pro`-Varianten, die Reasoning-Modelle sind) — Empirie aus 28.04. A/B-Test.

### Integration Points

- Schema-Erweiterung in `lib/wizard/richtlinien-schema.ts` zieht durch alles durch, was `Richtlinie` importiert (Pipeline-Loader, Validator, ggf. Pipeline-Stages für Phase 5). Phase 3 muss alle Compile-Errors fixen, die durch optionale Felder NICHT entstehen sollten — falls doch welche entstehen, ist das ein Hinweis auf strict-required-Konsumenten.
- `validate-data.ts` braucht JSON-Schema-Lib oder Hand-Roll-Check für Discriminated Union `fristLogik`. Existing-Pattern checken: nutzt der Validator heute `zod`/`ajv` oder Hand-Code?
- Cost-Tracking: Cron-Skripte sollten `result.usage` loggen (in `console.log` oder als zusätzlicher PR-Body-Hint), damit Kolja die monatlichen DeepSeek-Kosten im Blick hat.

</code_context>

<specifics>
## Specific Ideas

- Migrations-Pattern aus `lib/wizard/llm.ts` Pipeline-Stages ist Vorbild: Wrapper-Aufruf → `result.value` typed parsen → `result.usage` ins Log. Cron-Skripte sollten genau dieses Pattern übernehmen, statt eigene OpenAI/Gemini-Client-Konstruktion zu machen.
- Validator-Diagnose-Output sollte greppable sein (eine Zeile pro Verletzung mit Programmen-ID + Feld-Name) — erleichtert Phase-4-Migration der 11 Legacy-Dossiers (durchläuft Liste mit `validate-data.ts | grep <feld>`).
- `vorbildFormulierungen.abschnitt_id` als FK ist die wichtigste Strukturentscheidung — sie ermöglicht Phase 5, in der Section-Stage gezielt die für den aktuellen Abschnitt passenden Vorbild-Texte als Few-Shot-Anker zu nutzen.

</specifics>

<deferred>
## Deferred Ideas

- Vorlauf-Wochen für interne Antrags-Planung (`vorlauf_wochen?` auf `fristLogik`) — Phase 5 oder 6, falls überhaupt.
- Automatischer Provider-Fallback im Code-Pfad (DeepSeek down → Gemini retry) — bewusst nicht jetzt, vermeidet Silent-Drift. Bei Bedarf später als separater Phase.
- `quelle`-Feld auf `bestPractices`-Einträgen — meist nicht aus Richtlinien extrahierbar, Schein-Präzision. Falls externe Best-Practice-Sammlungen reinkommen (Phase 6+), revisitieren.
- `schluesselwoerter[]` und `vermeidet_halluzination_typ` auf `vorbildFormulierungen` — Phase-5-Tuning-Felder, jetzt Over-Engineering.
- Bumpen der `version`-String-Konvention in Dossiers (z.B. semver statt Datum) — separates Refactor.

</deferred>

---

*Phase: 03-programm-pflege-foundation*
*Context gathered: 2026-05-06*
