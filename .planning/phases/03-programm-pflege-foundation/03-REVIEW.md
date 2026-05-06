---
phase: 03-programm-pflege-foundation
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .github/workflows/weekly-dossier-extraction.yml
  - .github/workflows/weekly-program-scan.yml
  - __tests__/lib/wizard/richtlinien-loader.test.ts
  - __tests__/lib/wizard/richtlinien-validator.test.ts
  - __tests__/scripts/extract-richtlinie.test.ts
  - __tests__/scripts/scan-new-programs.test.ts
  - lib/wizard/richtlinien-schema.ts
  - lib/wizard/richtlinien-validator.ts
  - scripts/extract-richtlinie.ts
  - scripts/scan-new-programs.ts
  - scripts/validate-richtlinien.ts
findings:
  critical: 0
  warning: 6
  info: 7
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-06
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 3 (Programm-Pflege-Foundation) liefert eine solide Foundation: Zod-Validator mit
Strict/Legacy-Split, FK-Check als separate Funktion, LLM-Wrapper-Migration, CLI-Validator
und zwei GitHub-Actions-Workflows. Die Migration auf den `lib/wizard/llm.ts`-Wrapper
(FETCH-01) ist sauber umgesetzt — beide Skripte importieren `generateJson` korrekt mit
passender Modell-Konstante (Pipeline fuer Extraction, Interview fuer Scanner).

Die Anti-Halluzinations-Regeln im SYSTEM_PROMPT von `extract-richtlinie.ts` sind explizit
und decken die kritischen Punkte ab (leere Listen statt Erfindung, ISO-Format-Pflicht,
FK-Hinweis, Max-5-Eintraege). Validator-Pre-Persist-Gate funktioniert: `safeParse` plus
`validateForeignKeys` vor `fs.writeFile` mit hartem `process.exit(1)` bei Verletzung.

GitHub-Actions sind defensiv gehaertet (Secret-Pre-Flight-Check, `set -euo pipefail`,
keine direkte Nutzereingabe-Interpolation in Shell). PR-Erstellung mit `peter-evans/create-pull-request@v7`
und `delete-branch: true` ist Standard.

Hauptbefunde sind **Warnings** rund um Code/Kommentar-Drift, defensive Casts in Validator-Pfaden,
Test-Coverage-Luecken (Pattern-Matching statt Behavior-Tests in den Script-Tests), und kleinere
Hygiene-Issues. **Keine Critical-Findings** — keine Secrets, kein Injection-Risk, keine
unbehandelten Failure-Pfade die Datenverlust verursachen koennen.

## Warnings

### WR-01: `markBlockedInQueue` setzt `status="skip"` trotz Funktionsname und Kommentar "blocked"

**File:** `scripts/extract-richtlinie.ts:160-175`
**Issue:** Funktion heisst `markBlockedInQueue`, JSDoc sagt "Markiert Programme … mit
status=blocked + skipReason", tatsaechlich wird aber `item.status = "skip"` gesetzt.
Der `QueueItem`-Typ (Zeile 46) erlaubt nur `"open" | "done" | "skip"` — `"blocked"`
ist nicht im Union. Der lokal redeklarierte Typ in Zeile 165 (`Queue["items"][number] & { skipReason?: string; blockReason?: string }`)
verwirrt zusaetzlich, weil `blockReason` nirgendwo gesetzt wird. Folge: Kolja sucht in der
Queue nach `status: "blocked"`, findet aber `"skip"` — die Diagnose-Pipeline ist verstoert.
**Fix:** Entweder Funktion und Kommentar an `"skip"` angleichen oder den Status-Union um
`"blocked"` erweitern und auch in `data/richtlinien-prioritaeten.json` und `cmdNext`/`cmdList`-Filtern
(`status === "open"`) konsistent durchziehen. Empfohlen: Variante A (Status bleibt `"skip"`):
```ts
async function markSkipInQueue(programmId: string, reason: string): Promise<void> {
  // Setzt Status auf "skip" mit skipReason, damit der naechste --next-Lauf
  // nicht in Endlosschleife dasselbe Programm zieht.
  ...
  item.status = "skip";
  item.skipReason = reason;
  ...
}
```
Plus: lokalen Cast-Typ entfernen — `skipReason` direkt im File-level `QueueItem`-Interface
ergaenzen (passt zum bereits existierenden Feld in `richtlinien-prioritaeten.json`, z. B.
`kfw-erp-digitalisierung`).

### WR-02: `parsed.version = parsed.version ?? ...` ist toter Code-Pfad nach Strict-Validation

**File:** `scripts/extract-richtlinie.ts:305`
**Issue:** Reihenfolge ist (1) `parsed = llmResult.value`, (2) `parsed.version = parsed.version ?? new Date().toISOString().slice(0, 10)`, (3) `RichtlinieStrictSchema.safeParse(parsed)`. Die Strict-Validation prueft `version: z.string().min(1)` — wuerde `parsed.version` `undefined` sein, kaeme die Validation als Fehler durch, **bevor** der `??`-Fallback Wirkung haette … Moment: nein, der Fallback steht VOR der Validation, also ueberschreibt er ein leeres/undefined-Feld. ABER: `??` greift NUR bei `undefined`/`null`, nicht bei `""`. LLM koennte also `"version": ""` zurueckgeben, der Fallback greift nicht, und Strict-Validation wirft. Das ist defensiv ok, nur der Kommentar/Defaultwert ist irrefuehrend — Phase-3-SYSTEM_PROMPT hardcoded `"version": "2026-04-21"` als Beispiel. Wenn LLM stur den 2026-04-21-Wert zurueckgibt statt das aktuelle Datum, ist die Versions-Datierung des Dossiers falsch.
**Fix:** Version IMMER vom Skript setzen, nicht vom LLM. Direkt nach `parsed = llmResult.value`:
```ts
parsed.version = new Date().toISOString().slice(0, 10);
```
Plus: `version` aus dem SYSTEM_PROMPT-Beispiel-JSON entfernen (oder als `<wird vom Skript gesetzt>` markieren), damit das LLM nicht versucht, das Feld zu fuellen.

### WR-03: `validate-richtlinien.ts` type-asserts mit Lie ueber `abschnitte`-Pflicht

**File:** `scripts/validate-richtlinien.ts:54-57`
**Issue:** Cast deklariert `antragsstruktur.abschnitte` als `Array<{ id: string }>` (non-optional).
In legacy mode laesst `AntragsstrukturLegacySchema` `abschnitte` aber explizit `optional`.
Der Cast luegt also ueber den Typ — nur weil `validateForeignKeys` defensiv `?? []` schreibt
(Zeile 180 in validator.ts), gibt es keinen Runtime-Crash.
**Fix:** Cast an die echte Typrealitaet anpassen, damit der TypeScript-Compiler die
defensive Logik in `validateForeignKeys` schuetzt:
```ts
const fkData = result.data as {
  antragsstruktur: { abschnitte?: Array<{ id: string }> };
  vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
};
```
Oder besser: `validateForeignKeys` akzeptiert bereits `FkCheckable` mit `abschnitte?: …` —
einfach den Cast loeschen und `result.data as never` verwenden (wie in `extract-richtlinie.ts:319`),
oder noch sauberer: `FkCheckable` aus `richtlinien-validator.ts` exportieren und hier importieren.

### WR-04: Scanner-User-Agent vs. Extract-User-Agent inkonsistent — Scanner kann 403 von Bundesseiten bekommen

**File:** `scripts/scan-new-programs.ts:97`
**Issue:** Scanner nutzt `User-Agent: "EduFunds-Scanner/1.0"`, waehrend `extract-richtlinie.ts`
extra einen realistischen Browser-UA verwendet, weil viele Bundesseiten (bmftr.bund.de,
buendnisse-fuer-bildung.de) Bot-UAs blocken (Kommentar Zeile 103-105 dort). Wenn der Scanner
neue Quellen aus diesen Domains zieht, wirft `fetchHtml` `HTTP 403`, der Catch in `main()` (Zeile 222)
loggt nur, und die Quelle stillschweigend leer — **kein Alert**, der naechste Cron-Lauf
bemerkt nichts.
**Fix:** Browser-UA aus extract-richtlinie.ts wiederverwenden, oder besser: in `lib/wizard/http.ts`
einen gemeinsamen `fetchAsBrowser()`-Helper auslagern und in beiden Skripten konsumieren (DRY).
Snippet:
```ts
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${url}`);
  return res.text();
}
```

### WR-05: scan-new-programs.ts schluckt LLM-Parse-Fehler ohne Aggregat

**File:** `scripts/scan-new-programs.ts:164-167`
**Issue:** Bei `generateJson`-Fehler loggt das Skript `console.error(...)` und gibt `[]`
zurueck. Wenn ALLE Quellen scheitern, exitet das Skript mit `0`, der Workflow erkennt
`steps.diff.outputs.changed == 'false'` (kein Diff), und kein PR wird erstellt — **silent
failure**. Kolja erfaehrt ueber drei Wochen nichts, Programm-Pipeline staut sich.
**Fix:** Failure-Counter einfuehren, am Ende `process.exit(2)`, wenn keine Quelle erfolgreich
war:
```ts
let scannedOk = 0;
for (const src of sourcesToScan) {
  try {
    const found = await scanSource(src, verbose);
    scannedOk++;
    ...
  } catch (err) { ... }
}
...
if (scannedOk === 0 && sourcesToScan.length > 0) {
  console.error("Alle Quellen scheiterten — PR wird NICHT erstellt, aber Workflow exitet failed.");
  process.exit(2);
}
```
Plus: Workflow-Schritt `Detect changes` so anpassen, dass ein non-zero Exit von `Scan sources`
den Job rot faerbt (aktuell: `set -euo pipefail` macht das bereits, sofern das Script wirklich
exitet — der jetzige Code-Pfad in main() schluckt aber alle Source-Errors).

### WR-06: `weekly-program-scan.yml` deklariert `DEEPSEEK_API_KEY`-Pre-Flight, scant aber mit `MODEL_INTERVIEW`

**File:** `.github/workflows/weekly-program-scan.yml:47-60` und `scripts/scan-new-programs.ts:21,158`
**Issue:** Workflow prueft DEEPSEEK_API_KEY/GEMINI_API_KEY abhaengig von `LLM_PROVIDER`,
das ist korrekt. Aber `scan-new-programs.ts` ist hardcoded auf `MODEL_INTERVIEW` (Zeile 21,
158). Der `LLM_PROVIDER`-Override im Workflow (gemini default als Fallback) wirkt also nur
ueber den Wrapper — wenn Kolja `gemini` waehlt, geht der Scanner via `gemini-2.0-flash`,
NICHT `gemini-2.5-pro`. Das ist gewollt und in Ordnung, sollte aber im Workflow-Hilfetext
expliziter gemacht werden, damit Kolja nicht erwartet, dass `gemini` automatisch das
staerkere Pro-Modell nutzt.
**Fix:** Beschreibung im `workflow_dispatch.inputs.llm_provider`-Block schaerfen:
```yaml
description: "LLM-Provider override (deepseek default mit deepseek-chat; gemini fuer Fallback nutzt gemini-2.0-flash, NICHT gemini-2.5-pro)"
```

## Info

### IN-01: Tests in `__tests__/scripts/*.test.ts` sind reine Pattern-Matcher, keine Behavior-Tests

**File:** `__tests__/scripts/extract-richtlinie.test.ts`, `__tests__/scripts/scan-new-programs.test.ts`
**Issue:** Beide Test-Files lesen den Quelltext als String und matchen Regex-Patterns
(`expect(src).toMatch(/MODEL_PIPELINE/)`). Damit wird nur die statische Code-Form gegen
Regression geschuetzt — z. B. dass kein hardcoded `gemini-2.5-pro` zurueckkommt, dass
`generateJson` importiert ist usw. Echte Verhaltens-Tests (z. B. mock-LLM-Response → korrekter
exit code; FK-Verletzung → exit 1; substanz-Check → markBlocked) fehlen. Das ist eine
bewusste Architekturentscheidung gegen LLM-Mocking, aber Coverage der Persist-Gate-Logik
ist null.
**Fix:** Optional: `runExtraction` als pure-ish Funktion ohne `process.exit` umbauen
(Returntyp `Result<{outPath}, {kind: "empty"|"strict"|"fk"; ...}>`), main() macht den
Exit. Dann sind Unit-Tests gegen `runExtraction` mit injizierter Mock-LLM moeglich. Nicht
akut — Phase 5 oder spaeter.

### IN-02: `validate-richtlinien.ts` hat keine `--file`-Option fuer Einzelpruefung

**File:** `scripts/validate-richtlinien.ts:78-86`
**Issue:** Skript scannt immer `data/richtlinien/*.json`. Nach einem `--next`-Lauf will man
oft nur das eine neue Dossier validieren, nicht alle 11 Bestands-Dossiers. Aktuell muss
man entweder das Tab-Output `grep`en oder das Bestands-Dossier-Rauschen ignorieren.
**Fix:** `--file <programmId>`-Flag hinzufuegen:
```ts
const fileFilterIdx = args.indexOf("--file");
const fileFilter = fileFilterIdx >= 0 ? args[fileFilterIdx + 1] : null;
const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !fileFilter || f === `${fileFilter}.json`)
  .sort();
```

### IN-03: `loadCandidates` ENOENT-Pfad rendert tagesgenaues `generatedAt`, nachtraeglich ueberschrieben

**File:** `scripts/scan-new-programs.ts:130-132,227`
**Issue:** Bei fehlender Datei initialisiert `loadCandidates` mit `generatedAt: today-iso-date`,
und nach dem Scan-Lauf wird `candidates.generatedAt = new Date().toISOString().slice(0, 10)`
nochmal gesetzt. Doppelte Arbeit, kein Bug — kosmetisch.
**Fix:** Init mit `generatedAt: ""`; Update nur am Ende.

### IN-04: `extract-richtlinie.ts` redeklariert `QueueItem` lokal in `markBlockedInQueue`

**File:** `scripts/extract-richtlinie.ts:165`
**Issue:** Lokale Typ-Redeklaration `type QueueItem = Queue["items"][number] & { skipReason?: string; blockReason?: string }`
shadowt das file-level `QueueItem`-Interface. `blockReason` wird nirgends gesetzt; `skipReason`
gehoert ins file-level Interface (taucht auch in `data/richtlinien-prioritaeten.json` auf,
z. B. `kfw-erp-digitalisierung`).
**Fix:** `skipReason?: string` direkt ins file-level `QueueItem` (Zeile 37-46) ergaenzen,
lokale Redeklaration loeschen.

### IN-05: `normalizeUrl` differenziert Host-Case nicht

**File:** `scripts/scan-new-programs.ts:102-110`
**Issue:** Zwei URLs `https://Example.org/x` und `https://example.org/x` werden als
unterschiedlich gehasht. `URL.host` ist by-spec lowercased, aber `URL.pathname` nicht. Falls
Quellen Path-Case-Variationen liefern, koennten Duplikate durchrutschen. In der Praxis
selten, weil Bundesseiten konsistent sind.
**Fix:** Optional `url.host = url.host.toLowerCase()` (no-op laut spec) und Path-Case
unangetastet lassen — Path ist case-sensitive. Lass es so. Reine Awareness.

### IN-06: `richtlinien-validator.test.ts` testet keinen `RichtlinieStrictSchema`-Fail bei nur-3-von-4-neuen-Feldern

**File:** `__tests__/lib/wizard/richtlinien-validator.test.ts:52-110`
**Issue:** Coverage hat: legacy ohne neue Felder = strict failed (gut), legacy mit allen 4 Feldern = strict ok (gut),
fristLogik-Discriminator-Edges. Was fehlt: Strict mit z. B. nur 3 von 4 neuen Feldern (ohne
`fristLogik`) — explizite Bestaetigung, dass JEDES der 4 Felder einzeln Pflicht ist.
**Fix:** Vier kleine Tests:
```ts
it("strict ohne bestPractices ablehnen", () => {
  const { bestPractices, ...rest } = MIN_STRICT_NEW_FIELDS;
  expect(RichtlinieStrictSchema.safeParse({ ...MIN_BASE, ...rest }).success).toBe(false);
});
// ... analog fuer rejectGruende, vorbildFormulierungen, fristLogik
```

### IN-07: Workflow `weekly-dossier-extraction.yml` `LINK`-Variable wird nur im PROGRAM_ID_INPUT-Pfad gefuellt

**File:** `.github/workflows/weekly-dossier-extraction.yml:66-86`
**Issue:** Im `--next`-Pfad (else-branch) ist `LINK` ungesetzt, das ist ok, weil das Skript
selbst aus der Queue zieht. Im if-branch wird `LINK` ueber `node -e` gefuellt und als
zweites Argument an `npx tsx scripts/extract-richtlinie.ts "${PID}" "${LINK}"` uebergeben.
Was wenn der Queue-Eintrag mehrere `infoLink` haette (Mehrere Quellen pro Programm — laut
Schema-Doku ein Soll-Fall)? Das aktuelle Format unterstuetzt das nicht. Das Manual-Branch
nimmt nur einen Link, was die Workflow-Bedienung kuenstlich beschraenkt vs. die CLI-Syntax,
die `<programmId> <url1> <url2> ...` erlaubt.
**Fix:** Optional fuer eine spaetere Iteration: `program_id`-Input plus ein zweiter
`extra_urls`-Input (komma-separiert), der dann als Shell-Array gesplittet wird. Nicht akut,
weil `--next` der primaere Pfad ist und der manual-dispatch heute nur fuer Debug genutzt wird.

---

_Reviewed: 2026-05-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
