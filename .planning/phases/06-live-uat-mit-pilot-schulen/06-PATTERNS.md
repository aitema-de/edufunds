# Phase 6: Live-UAT mit Pilot-Schulen - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 8 (3 neue Skripte + 2 UAT-Artefakt-Typen + 2 Eval-Korpus-Erweiterungen + 1 Retro-Datei)
**Analogs found:** 7 / 8

---

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `scripts/uat-db-snapshot.ts` | utility/script | file-I/O + CRUD (PostgreSQL read) | `scripts/smoke-pipeline-rerun.ts` | exact |
| `scripts/uat-session-token.ts` | utility/script | CRUD (PostgreSQL read) | `scripts/smoke-pipeline-rerun.ts` | exact |
| `scripts/uat-pre-session-check.ts` | utility/script | request-response (Checklist-Runner) | `scripts/smoke-llm.ts` | role-match |
| `.planning/uat/UAT-BEFUNDE-{datum}-{pilot}.md` | config/artifact | file-I/O | `.planning/uat/UAT-BEFUNDE-TEMPLATE.md` | exact |
| `.planning/uat/PILOT-UAT-RETRO.md` | config/artifact | file-I/O | `data/eval/BASELINE.md` (append-only Struktur) | role-match |
| `data/eval/pipeline-korpus.json` (neue Einträge) | config/data | file-I/O + transform | bestehende `pv-001`..`pv-022`-Einträge in `pipeline-korpus.json` | exact |
| `data/eval/matcher-korpus.json` (neue Einträge) | config/data | file-I/O + transform | bestehende `ev-001`..`ev-029`-Einträge in `matcher-korpus.json` | exact |
| `data/eval/BASELINE.md` (Phase-6-Eintrag) | config/artifact | file-I/O | bestehende Phase-1/Phase-5-Einträge in `BASELINE.md` | exact |

---

## Pattern Assignments

### `scripts/uat-db-snapshot.ts` (utility, CRUD + file-I/O)

**Analog:** `scripts/smoke-pipeline-rerun.ts` (Zeilen 1-204) und `scripts/smoke-pipeline-with-extractor.ts` (Zeilen 1-221)

**Header-Kommentar-Pattern** (nach Analog lines 1-13):
```typescript
/**
 * UAT-DB-Snapshot: Exportiert alle ki_antraege-Rows, die seit einem
 * Session-Start-Zeitstempel aktualisiert wurden, als JSON.
 *
 * Zweck: Reproduzierbare Post-Session-Analyse (D-12, D-13, D-23).
 *
 * Run: `npx tsx --env-file=.env.local scripts/uat-db-snapshot.ts --since "2026-06-01 14:00"`
 */
```

**Imports-Pattern** (analog smoke-pipeline-rerun.ts lines 14-21):
```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
```

**DATABASE_URL aus .env.local lesen** (smoke-pipeline-rerun.ts lines 51-58):
```typescript
async function loadSession(): Promise<DbAntragData> {
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt");
  const client = new pg.Client(url);
  await client.connect();
  const res = await client.query(
    "SELECT antrag_data FROM ki_antraege WHERE session_token = $1",
    [SESSION_TOKEN]
  );
  await client.end();
  if (!res.rows[0]) throw new Error(`Session ${SESSION_TOKEN} nicht gefunden`);
  return res.rows[0].antrag_data as DbAntragData;
}
```

**Snapshot-Ziel-Query für Phase 6** (neues Pattern, basiert auf ki_antraege-Schema):
```typescript
// Abweichung vom Analog: WHERE updated_at > session_start statt session_token
const res = await client.query(
  `SELECT session_token, created_at, updated_at, antrag_data
   FROM ki_antraege
   WHERE updated_at > $1
   ORDER BY updated_at ASC`,
  [sessionStart]  // ISO-Timestamp aus CLI-Flag
);
```

**Ausgabe nach tmp/ schreiben** (smoke-pipeline-with-extractor.ts lines 200-214):
```typescript
const outDir = resolve(REPO, "tmp");
const { mkdir, writeFile } = await import("node:fs/promises");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "pipeline-extractor-finaltext.md"), result.artefacts.finalText ?? "");
await writeFile(resolve(outDir, "pipeline-extractor-facts.json"), JSON.stringify(richFacts, null, 2));
console.log(`\nOutputs in ${outDir}/pipeline-extractor-*.{md,json}`);
```

**Error-Handling / main-Pattern** (smoke-pipeline-rerun.ts lines 200-204):
```typescript
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**CLI-Invokation** (CLAUDE.md Konvention):
```bash
npx tsx --env-file=.env.local scripts/uat-db-snapshot.ts --since "2026-06-01 14:00"
# Output: tmp/uat-snapshot-{ISO-datum}.json
```

---

### `scripts/uat-session-token.ts` (utility, CRUD)

**Analog:** `scripts/smoke-pipeline-rerun.ts` (lines 50-59) — identische DB-Zugriffs-Mechanik, aber statt Token-Lookup ein ORDER-BY-updated_at-LIMIT-Query.

**Imports-Pattern** (identisch zu smoke-pipeline-rerun.ts lines 14-16):
```typescript
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
```

**Core-Query-Pattern** (abgeleitet aus dem `loadSession`-Pattern, lines 50-58):
```typescript
async function getLatestSessionToken(): Promise<void> {
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt");
  const client = new pg.Client(url);
  await client.connect();
  // Letzte N Rows — typische Abfrage nach UAT-Session
  const res = await client.query(
    `SELECT session_token, created_at, updated_at,
            (antrag_data->>'programmId') AS programm_id
     FROM ki_antraege
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit]
  );
  await client.end();
  // Ausgabe direkt auf stdout — für Pipe in andere Skripte
  for (const row of res.rows) {
    console.log(`${row.session_token}  ${row.updated_at.toISOString()}  ${row.programm_id ?? "-"}`);
  }
}
```

**UAT-BEFUNDE-Template-Referenz** (aus `.planning/uat/UAT-BEFUNDE-TEMPLATE.md` line 4):
```
**Session-Token:** {UUID aus DB — `SELECT session_token FROM ki_antraege ORDER BY updated_at DESC LIMIT 1`}
```
Das Skript automatisiert genau diesen manuellen SQL-Hint aus dem Template.

---

### `scripts/uat-pre-session-check.ts` (utility, request-response)

**Analog:** `scripts/smoke-llm.ts` (Checklist-Runner-Struktur) und UAT-PLAN-TEMPLATE.md (Vor-Session-Checklist)

**Struktur-Pattern aus smoke-llm.ts** (lines 1-48):
```typescript
/**
 * Pre-Session-Check fuer UAT-Sessions (D-12).
 * Prueft automatisch die Vor-Session-Checkliste aus UAT-PLAN-TEMPLATE.md.
 *
 * Run: `npx tsx --env-file=.env.local scripts/uat-pre-session-check.ts`
 */

async function main() {
  const provider = process.env.LLM_PROVIDER ?? "deepseek";
  console.log(`[pre-session-check] Provider: ${provider}`);
  console.log("");

  // Schritt-basiertes Muster wie smoke-llm.ts [1/N] [2/N]...
  console.log("[1/5] DB-Verbindung prüfen ...");
  // ...
  console.log("[2/5] Dev-Server (Port 3101) erreichbar ...");
  // ...
  console.log("[3/5] NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 gesetzt ...");
  // ...
  console.log("[4/5] Letzte DB-Row-Zeitstempel notieren ...");
  // ...
  console.log("[5/5] Checkliste-Summary ...");
}

main().catch((err) => {
  console.error("PRE-SESSION-CHECK FAIL:", err);
  process.exit(1);
});
```

**Checklist-Items** (aus UAT-PLAN-TEMPLATE.md lines 12-19):
```
- Dev-Mock aktiv (NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 in .env.local)
- Lokale Dev-Umgebung läuft (npm run dev auf Port 3101)
- Test-DB-Stand notiert (SELECT MAX(updated_at) FROM ki_antraege)
- Browser-Setup geklärt
- Datenschutz-Hinweis-Block bereit
```

**DB-Verbindungs-Pattern** (wie in allen Smoke-Skripten — pg.Client, env-Regex):
```typescript
const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
if (!url) throw new Error("DATABASE_URL fehlt");
const client = new pg.Client(url);
await client.connect();
const { rows } = await client.query("SELECT MAX(updated_at) AS last FROM ki_antraege");
await client.end();
console.log(`  -> Letzte DB-Aktivität: ${rows[0]?.last ?? "keine Einträge"}`);
```

---

### `.planning/uat/UAT-BEFUNDE-{datum}-{pilot}.md` (artifact, file-I/O)

**Analog:** `.planning/uat/UAT-BEFUNDE-TEMPLATE.md` (vollständig, lines 1-87)

Dies sind Instanziierungen des Templates. Planner muss beim Befüllen (D-11) das Template-Schema exakt einhalten.

**Header-Block-Pattern** (UAT-BEFUNDE-TEMPLATE.md lines 1-9):
```markdown
# UAT-Befunde: {Schul-Name} — {Datum}

**Pilotperson:** {Name, Funktion}
**Programm:** {z. B. DigitalPakt 2.0}
**Session-Token:** {UUID aus DB — `SELECT session_token FROM ki_antraege ORDER BY updated_at DESC LIMIT 1`}
**Recording:** {Pfad, z. B. ~/edufunds-uat/2026-06-01-pilot-a.mp4}
**Session-Start:** {YYYY-MM-DD HH:MM}
**Session-Ende:** {YYYY-MM-DD HH:MM}
```

**Bug-Eintrag-Schema** (UAT-BEFUNDE-TEMPLATE.md lines 14-24):
```markdown
### Bug #1 — {kurze Beschreibung} 🔴 offen

- **Vorher (UAT-Stand):** {konkretes Symptom mit Zahlen, Zeitstempel oder Screenshots}
- **Strukturelle Ursache:** {Hypothese — Pipeline-Stage / Frontend-State / DB-Write / Eingabe-Profil}
- **Pipeline-Stage:** {outline | section | critique | revision | recheck | finanzplan | consistency | none/UI}
- **Severity:** {hoch | mittel | niedrig}
- **Fix-Richtung:** {konkrete Codeänderung}
- **Reproducer:** {z. B. `npx tsx scripts/smoke-pipeline-with-extractor.ts --token {session_token}`}
- **Verifikation:** {wie nachweisen nach Fix}
```

**Datenschutz-Konvention** (D-13): Dateiname verwendet Pilot-Code statt Klarname.
Namensmuster: `UAT-BEFUNDE-2026-06-01-PILOT-A.md` (Datei in `.planning/uat/`)

---

### `.planning/uat/PILOT-UAT-RETRO.md` (artifact, file-I/O)

**Analog:** `data/eval/BASELINE.md` (append-only strukturiertes Markdown, Phasen-Einträge)

Das Retro-Dokument folgt der gleichen Sektion-Logik wie BASELINE.md: datiert, inhaltlich strukturiert, von `gsd-verifier` prüfbar.

**Grob-Struktur** (analog BASELINE.md Phase-5-Eintrag lines 8-99):
```markdown
# Pilot-UAT Retro — Phase 6

**Abgeschlossen:** {YYYY-MM-DD}
**Sessions:** {N} von {Ziel}
**Branch:** feature/wizard-adaptive @ {commit}

---

## Readiness-Einstufung pro Pilot (D-20)

| Pilot-Code | Critical-Path ohne Hilfe | Antrag halluzinations-frei | Einreichungs-Interesse | Status |
|------------|--------------------------|---------------------------|------------------------|--------|
| PILOT-A    | ✅ / ❌                  | ✅ / ❌                   | ✅ / ❌                | bereit / nicht bereit |

## Befunde-Zusammenfassung

| Bug-ID | Severity | Fix-Status | Eval-Anker |
|--------|----------|------------|------------|

## Verbleibende Lücken (v2-Liste)

- {Bug-ID}: {Beschreibung} — {Begründung für Defer}

## Eval-Korpus-Delta

- pipeline-korpus.json: {N} neue UAT-Einträge (pv-uat-001..N)
- matcher-korpus.json: {N} neue UAT-Einträge (ev-uat-001..N)
- BASELINE.md: Phase-6-Eintrag hinzugefügt

## Programm × Schul-Typ-Abdeckung (D-24)

| Programm-Typ | Schul-Typ | Pilot-Code | Abgedeckt |
|--------------|-----------|------------|-----------|
```

---

### `data/eval/pipeline-korpus.json` — neue UAT-Einträge (config/data, file-I/O)

**Analog:** Bestehende Einträge `pv-001`..`pv-022` in `data/eval/pipeline-korpus.json`

**Vollständiges Entry-Schema** (pipeline-korpus.json lines 1-169, pv-001):
```json
{
  "id": "pv-uat-001",
  "category": "vag",
  "programmId": "{programm-id aus data/foerderprogramme.json}",
  "schulProfil": {
    "name": "{Schul-Code — NICHT Klarname, D-13}",
    "typ": "grundschule | gymnasium | gesamtschule | ...",
    "bundesland": "{Bundesland}",
    "schuelerzahl": 0,
    "besonderheiten": "{Kurztext ASCII}"
  },
  "userAnswers": [
    {
      "role": "ai",
      "kind": "question",
      "content": "{Frage-Text}"
    },
    {
      "role": "user",
      "kind": "answer",
      "content": "{Antwort aus UAT-Session — anonymisiert}"
    }
  ],
  "facts": {
    "schule": { "name": "...", "typ": "...", "bundesland": "...", "schuelerzahl": 0, "besonderheiten": "..." },
    "projekt": { "titel": null, "kurzbeschreibung": null, "ziele": [], "zielgruppe": null, "aktivitaeten": [], "zeitraum": null },
    "wirkung": { "erwartete_ergebnisse": [], "messbare_indikatoren": [], "nachhaltigkeit": null },
    "budget": { "beantragt_eur": null, "eigenmittel_eur": null, "hauptposten": [] },
    "programmpassung": { "kriterien_adressiert": [], "offene_luecken": [] }
  },
  "expected_forbidden_markers": [
    {
      "marker": "{Marker-String — z.B. erfundenes Aktenzeichen}",
      "description": "{Warum dieser Marker eine Halluzination ist}"
    }
  ],
  "expected_geber_gruppe": "oeffentlich | stiftung | eu | wirtschaftspreis | verband-uni",
  "notes": "UAT-{datum}-Pilot-{code} Reproducer. Bug #N aus Befunde-Tracker."
}
```

**Namenskonvention für neue Einträge** (D-17, D-18):
- IDs: `pv-uat-001`, `pv-uat-002`, ... (eigenes Präfix, klar von Baseline `pv-001..022` getrennt)
- Eintrag **vor** Fix schreiben (ergibt roten Lauf), dann Fix, dann grüner Lauf (D-18)
- Nur Pipeline-/Halluzinations-/Finanzplan-Bugs landen hier; reine UI-Bugs → Playwright

---

### `data/eval/matcher-korpus.json` — neue UAT-Einträge (config/data, file-I/O)

**Analog:** Bestehende Einträge `ev-001`..`ev-029` in `data/eval/matcher-korpus.json`

**Entry-Schema** (matcher-korpus.json lines 1-50, ev-001 und ev-003):
```json
{
  "id": "ev-uat-001",
  "category": "ausfuehrlich | kurz | vag",
  "anliegen": "{Freitext-Anliegen aus UAT-Session — anonymisiert, ASCII bevorzugt}",
  "schultyp": "grundschule | gymnasium | ...",
  "bundesland": "{Bundesland}",
  "geschaetztesBudgetEur": 0,
  "expected_top3": [
    "programm-id-1",
    "programm-id-2"
  ],
  "expected_off_target": [
    "programm-id-off"
  ],
  "expected_clarification": false,
  "expected_missing_slots": [],
  "notes": "UAT-{datum} Bug #{N}: {kurze Beschreibung}. Eintrag vor Fix geschrieben (rot→grün D-18)."
}
```

**Namenskonvention:** `ev-uat-001`, `ev-uat-002`, ... (eigenes Präfix, getrennt von Baseline `ev-001..029`)

---

### `data/eval/BASELINE.md` — Phase-6-Eintrag (artifact, file-I/O)

**Analog:** Bestehende Phase-5- und Phase-1-Einträge in `data/eval/BASELINE.md` (Zeilen 8-99 für Phase-5-Struktur)

**Entry-Format** (Phase-5-Eintrag lines 15-99 als Vorlage):
```markdown
## {YYYY-MM-DD} — Phase-6-UAT-Baseline (Korpus v2, n={Gesamt-Count})

- **Pipeline-Commit:** `{commit-hash}` (HEAD von `feature/wizard-adaptive` nach letzter Fix-Welle)
- **Korpus-Version:** v2, {N} Eintraege ({N} Phase-5-Eintraege + {N} neue UAT-Eintraege pv-uat-001..N)
- **Run-Konfiguration:** N=3 pro Eintrag, judgeModel `{model}`, alle Feature-Flags {ON/OFF}
- **Provider:** `LLM_PROVIDER={provider}`, Pipeline-Modell `{model}`
- **UAT-Context:** nach Phase-6-Fix-Welle, {N} dokumentierte UAT-Sessions

### Haupt-Scores (mean ± stddev ueber N=3 Runs × {N} Eintraege)

| Achse | Mean | Stddev | 2σ-Band | Schwellwert | Status |
|-------|------|--------|---------|-------------|--------|
| WIZ-01 (Pflichtabschnitte) | | | | ≥ 80 % | |
| WIZ-02 (Halluzinations-Detection) | | | | ≥ Baseline-Phase-5 - 2σ | |
| WIZ-03 (Tonalitaets-Passung) | | | | Score-Delta > 0 | |
| Finanzplan-Validity (Sub) | | | | — | — |

### Reports

- JSON: `data/eval/pipeline-reports/{ISO-Timestamp}.json`
- Markdown: `data/eval/pipeline-reports/{ISO-Timestamp}.md`
- Snapshots: `data/eval/pipeline-snapshots/{ISO-Timestamp}/`

### Run-Befehl

\`\`\`bash
LLM_PROVIDER={provider} npx tsx --env-file=.env.local scripts/eval-pipeline.ts --live --N=3 --snapshot --md-summary
\`\`\`
```

**Append-only-Konvention** (BASELINE.md line 3): Neueste Einträge oben, nie bestehende Einträge editieren.

---

## Shared Patterns

### DB-Verbindung (pg.Client, .env.local Regex)
**Quelle:** `scripts/smoke-pipeline-rerun.ts` lines 50-59, identisch in `smoke-pipeline-with-extractor.ts`
**Anwenden auf:** alle drei neuen Helper-Skripte (`uat-db-snapshot.ts`, `uat-session-token.ts`, `uat-pre-session-check.ts`)

```typescript
const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
if (!url) throw new Error("DATABASE_URL fehlt");
const client = new pg.Client(url);
await client.connect();
// ... query ...
await client.end();
```

### REPO-Pfad-Konstante
**Quelle:** `scripts/smoke-pipeline-rerun.ts` line 23, `scripts/smoke-pipeline-with-extractor.ts` line 23
**Anwenden auf:** alle neuen Skripte

```typescript
const REPO = resolve(__dirname, "..");
```

### main()-Wrapper mit process.exit(1)
**Quelle:** `scripts/smoke-pipeline-rerun.ts` lines 200-204
**Anwenden auf:** alle neuen Skripte

```typescript
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Invokations-Konvention
**Quelle:** CLAUDE.md Pipeline-Eval-Block + alle Smoke-Skripte
**Anwenden auf:** alle neuen Skripte

```bash
npx tsx --env-file=.env.local scripts/{skript-name}.ts [flags]
```

### Commit-Message-Format (D-06)
**Quelle:** CLAUDE.md Konventionen + D-06
**Anwenden auf:** alle Bug-Fix-Commits in Phase 6

```
fix(uat): Bug #N {kurze Beschreibung}

Befunde-Tracker: .planning/uat/UAT-BEFUNDE-{datum}-{pilot}.md
Eval-Anker: {pv-uat-N | ev-uat-N | Playwright-Smoke}
```

### Eval-Datei-Pfad-Konventionen
**Quelle:** `scripts/eval-pipeline.ts` lines 112-118
**Anwenden auf:** eval-bezogene Ausgaben aus Helper-Skripten

```typescript
const REPO = resolve(__dirname, "..");
const KORPUS_PATH   = resolve(REPO, "data/eval/pipeline-korpus.json");
const REPORTS_DIR   = resolve(REPO, "data/eval/pipeline-reports");
const SNAPSHOTS_DIR_BASE = resolve(REPO, "data/eval/pipeline-snapshots");
```

---

## Bug-Fix-Integrationspunkte (D-05/D-06)

Die konkreten Fix-Dateien sind erst nach UAT-Befunden bekannt. Bekannte Kandidaten laut CONTEXT.md:

| Datei | Rolle | Data Flow | Nächster Analog | Hinweis |
|-------|-------|-----------|-----------------|---------|
| `lib/wizard/pipeline.ts` | service | event-driven (Stage-Callbacks) | `lib/wizard/pipeline.ts` selbst (Zeilen 1-50 gelesen) | Imports: `runPipeline` aus `./pipeline`, Stages: outline/section/critique/revision/recheck/finanzplan/consistency |
| `lib/wizard/matcher.ts` | service | request-response | `lib/wizard/matcher.ts` selbst (Zeilen 1-50 gelesen) | DeepSeek via `generateText`, Pipe-Format-Ausgabe, Tagged-Union-Return |
| `lib/wizard/prompts.ts` | utility/config | transform | `lib/wizard/prompts.ts` selbst (Zeilen 1-50 gelesen) | System-Prompt-Konstanten `OUTLINE_SYSTEM`, `SECTION_SYSTEM` usw. + Builder-Funktionen |
| `app/antrag/[programmId]/wizard/page.tsx` | component | request-response | `app/antrag/start/page.tsx` (gelesen) | Next.js App Router, Server Component, delegiert an Client-Komponente |
| `app/antrag/start/page.tsx` | component | request-response | `app/antrag/meine/page.tsx` (gelesen) | Standard Next.js page.tsx mit Header/Footer-Wrapper |

**Wichtig:** Für Bug-Fix-Commits in diesen Dateien gilt das rot→grün-Eval-Pattern (D-18): erst Korpus-Eintrag schreiben, dann Fix, dann Gate-Lauf.

---

## Kein Analog gefunden

| Datei | Rolle | Data Flow | Grund |
|-------|-------|-----------|-------|
| `scripts/uat-pre-session-check.ts` — HTTP-Teil | utility | request-response | Kein Skript im Repo prüft localhost:3101 auf Erreichbarkeit via HTTP. Muss mit Node.js `fetch` oder `http` neu implementiert werden. |

---

## Metadata

**Analog-Suchbereich:** `scripts/`, `lib/wizard/`, `app/antrag/`, `data/eval/`, `.planning/uat/`
**Gelesene Dateien:** 14
**Pattern-Extraktion:** 2026-05-20
