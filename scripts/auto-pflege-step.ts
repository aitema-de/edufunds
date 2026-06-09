/**
 * Auto-Pflege-Step (Plan 04-04 Task 2) — ein einzelner Workflow-Lauf-Schritt.
 *
 * Konsolidiert Scan + HEAD-Check + Extract + Queue-Push in einer Per-Programm-
 * Iteration mit Failure-Klassifizierung. Ersetzt scripts/scan-new-programs.ts
 * (mit data/program-candidates.json) im weekly-auto-pflege-Workflow.
 *
 * EINGABE (CLI-Flags):
 *   --dry-run               keine Schreiboperationen (kein writeFile, kein queue-update), nur Report
 *   --max-programs <N>      maximal N neue Programme pro Lauf extrahieren (Default 5)
 *   --logs-dir <dir>        Verzeichnis fuer Per-Programm-JSON-Logs (Default logs/auto-pflege-<datum>/)
 *   --failure-report <pfad> Pfad fuer das aggregierte Failure-Report-Markdown (Default failure-report.md)
 *
 * VORGEHEN:
 *   1. Scan: data/program-sources.json lesen, pro Source generateJson<ScanResult> auf
 *      MODEL_INTERVIEW. Flache Liste neuer Programme (gefiltert gegen foerderprogramme.json
 *      + queue + bekannte URLs). KEIN program-candidates.json mehr (D-01).
 *   2. Pro Programm sequenziell:
 *      a) HTTP-HEAD-Pre-Check auf detailUrl. Bei 404/410/403: skip mit Reason, kein LLM-Call.
 *      b) runExtraction(programmId, [detailUrl], { skipQueueUpdate: true }) — produziert
 *         data/richtlinien/<id>.json. skipQueueUpdate=true: runExtraction macht KEINEN
 *         markDoneInQueue-Call mehr — auto-pflege-step ist der EINZIGE Queue-Writer (D-11).
 *      c) Queue-Entry erstellen + Score berechnen + als QueueItem mit status='done' pushen
 *         via lib/wizard/queue.ts saveQueue. Atomar pro Programm.
 *   3. Jedes Programm in try/catch — bei Fehler: Failure-Klasse erfassen, weiter zum naechsten.
 *   4. Am Ende:
 *      - Per-Programm-JSON-Logs in --logs-dir
 *      - failure-report.md mit Liste der Skips/Failures (D-12)
 *      - exit 0 (Workflow bleibt gruen — Per-Programm-Resilience D-11)
 *      - HAS_FAILURES=true via GITHUB_OUTPUT setzen, damit Workflow das Issue eroeffnet
 *
 * RACE-AVOIDANCE (D-11): auto-pflege-step.ts ist der EINZIGE Queue-Writer im
 * Workflow-Pfad. runExtraction wird mit skipQueueUpdate=true gerufen. Wenn runExtraction
 * im Empty-Extraktions-Fall einen Error wirft (siehe scripts/extract-richtlinie.ts), fangen
 * wir ihn hier und klassifizieren als 'empty-extraction'-Failure (KEIN Queue-Write).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { generateJson, MODEL_INTERVIEW } from "../lib/wizard/llm";
import { runExtraction } from "./extract-richtlinie";
import { loadQueue, saveQueue, type QueueItem } from "../lib/wizard/queue";

// ---------------------------------------------------------------------------
// Pfade + Konstanten
// ---------------------------------------------------------------------------

const SOURCES_PATH = path.join(process.cwd(), "data", "program-sources.json");
const PROGRAMS_PATH = path.join(process.cwd(), "data", "foerderprogramme.json");
const MAX_HTML_CHARS = 80000;

const TYP_BONUS: Record<string, number> = {
  bund: 20,
  eu: 15,
  land: 10,
  stiftung: 10,
};

// ---------------------------------------------------------------------------
// Type-Mini-Mirrors (analog scan-new-programs.ts)
// ---------------------------------------------------------------------------

interface Source {
  id: string;
  name: string;
  url: string;
  fokus?: string;
}

interface Foerderprogramm {
  id: string;
  name?: string;
  infoLink?: string;
  foerdergeberTyp?: string;
  foerdersummeMax?: number;
  bundeslaender?: string[];
  kategorien?: string[];
  schulformen?: string[];
  kiAntragGeeignet?: boolean;
}

interface ScanCandidate {
  name: string;
  detailUrl: string;
  schulRelevanz?: number;
  kurznotiz?: string;
}

interface ScanResult {
  programme: ScanCandidate[];
}

type FailureKlasse =
  | "fetch-error"
  | "head-404"
  | "head-403"
  | "head-410"
  | "head-5xx"
  | "empty-extraction"
  | "strict-validator-fail"
  | "llm-error"
  | "queue-write-error"
  | "unknown";

interface ProgrammResult {
  programmId: string;
  name: string;
  detailUrl: string;
  source: string;
  status: "done" | "skip" | "failure";
  failureKlasse?: FailureKlasse;
  detail?: string;
}

// ---------------------------------------------------------------------------
// CLI-Argumente
// ---------------------------------------------------------------------------

interface CliOpts {
  dryRun: boolean;
  maxPrograms: number;
  logsDir: string;
  failureReport: string;
}

function parseArgs(argv: string[]): CliOpts {
  const o: CliOpts = {
    dryRun: false,
    maxPrograms: 5,
    logsDir: path.join("logs", `auto-pflege-${new Date().toISOString().slice(0, 10)}`),
    failureReport: "failure-report.md",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") o.dryRun = true;
    else if (a === "--max-programs") o.maxPrograms = parseInt(argv[++i] ?? "5", 10) || 5;
    else if (a === "--logs-dir") o.logsDir = argv[++i] ?? o.logsDir;
    else if (a === "--failure-report") o.failureReport = argv[++i] ?? o.failureReport;
  }
  return o;
}

// ---------------------------------------------------------------------------
// HTTP-Helpers
// ---------------------------------------------------------------------------

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de,en;q=0.8",
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${url}`);
  return res.text();
}

async function httpHead(url: string): Promise<{ status: number; klasse?: FailureKlasse }> {
  try {
    const res = await fetch(url, { method: "HEAD", headers: BROWSER_HEADERS });
    if (res.status === 404) return { status: 404, klasse: "head-404" };
    if (res.status === 403) return { status: 403, klasse: "head-403" };
    if (res.status === 410) return { status: 410, klasse: "head-410" };
    if (res.status >= 500) return { status: res.status, klasse: "head-5xx" };
    return { status: res.status };
  } catch (err) {
    return { status: 0, klasse: "fetch-error" };
  }
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

// ---------------------------------------------------------------------------
// ID-Slug-Generator (kebab-case aus Name)
// ---------------------------------------------------------------------------

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Scan-System-Prompt (uebernommen aus scan-new-programs.ts)
// ---------------------------------------------------------------------------

const SCAN_SYSTEM = `Du extrahierst aus einer HTML-Uebersichtsseite alle sichtbaren Eintraege zu einzelnen Foerderprogrammen. Fokus: Foerderungen, an denen Schulen, Lehrende oder Schuelerinnen und Schueler beteiligt sein koennen.

Ausgabe STRIKT als JSON, keine Markdown-Fences:
{
  "programme": [
    {
      "name": "offizieller Programmname",
      "detailUrl": "absolute URL der Detail-/Ausschreibungsseite",
      "schulRelevanz": 1..5 (1 = wahrscheinlich nicht fuer Schulen, 5 = explizit Schulfoerderung),
      "kurznotiz": "optional, 1 Satz worum es geht"
    }
  ]
}

Regeln
- Keine Allgemeinplaetze ("Foerdermoeglichkeiten im Ueberblick") aufnehmen.
- Keine Duplikate — wenn derselbe Name mehrfach auf der Seite steht, nur einmal.
- Wenn ein Link relativ ist, zu einer absoluten URL vervollstaendigen (Basis-URL siehe User-Prompt).
- Wenn keine Programme erkennbar: "programme": [].`;

// ---------------------------------------------------------------------------
// Scan: pro Source generateJson + Filter gegen bekannte
// ---------------------------------------------------------------------------

async function scanSource(src: Source): Promise<ScanCandidate[]> {
  console.log(`  Scan ${src.id} (${src.url})`);
  try {
    const html = await fetchHtml(src.url);
    const text = stripHtml(html).slice(0, MAX_HTML_CHARS);
    const userPrompt = `QUELLE: ${src.name}
URL: ${src.url}
FOKUS: ${src.fokus ?? ""}

VOLLTEXT (gekuerzt):
${text}

Liefere die Liste neuer Programme als JSON-Objekt zurueck.`;
    const result = await generateJson<ScanResult>(MODEL_INTERVIEW, SCAN_SYSTEM, userPrompt, {
      maxTokens: 4000,
    });
    return result.value.programme ?? [];
  } catch (err) {
    console.warn(`  Source ${src.id} fehlgeschlagen: ${(err as Error).message}`);
    return [];
  }
}

function filterUnknown(
  candidates: ScanCandidate[],
  knownNames: Set<string>,
  knownUrls: Set<string>
): ScanCandidate[] {
  const result: ScanCandidate[] = [];
  const seenInBatch = new Set<string>();
  for (const c of candidates) {
    if (!c.name || !c.detailUrl) continue;
    const nameLower = c.name.trim().toLowerCase();
    const urlNorm = normalizeUrl(c.detailUrl);
    if (knownNames.has(nameLower)) continue;
    if (knownUrls.has(urlNorm)) continue;
    if (seenInBatch.has(urlNorm)) continue;
    seenInBatch.add(urlNorm);
    result.push({ ...c, detailUrl: urlNorm });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Score-Heuristik fuer NEU geschaetzten QueueItem (analog rebuild-queue.ts)
// ---------------------------------------------------------------------------

function estimateScore(c: ScanCandidate): number {
  // Wir kennen Foerderbetrag/Kategorien/Bundeslaender erst NACH der Extraktion.
  // Fuer den Initial-Score nutzen wir nur schulRelevanz aus dem Scan + minimalem Baseline.
  // Echter Score wird beim naechsten rebuild-queue.ts-Lauf vom Programm-Eintrag in
  // foerderprogramme.json neu berechnet.
  const rel = c.schulRelevanz ?? 3;
  return Math.round((rel * 10) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Programm-Eintrag in foerderprogramme.json einfuegen (Minimal-Stub fuer Queue-Score)
// ---------------------------------------------------------------------------

async function appendProgrammIfMissing(
  programmId: string,
  c: ScanCandidate
): Promise<void> {
  const raw = await fs.readFile(PROGRAMS_PATH, "utf8");
  const all = JSON.parse(raw) as Foerderprogramm[];
  if (all.some((p) => p.id === programmId)) return;
  all.push({
    id: programmId,
    name: c.name,
    infoLink: c.detailUrl,
    foerdergeberTyp: "sonst",
    kiAntragGeeignet: true,
  } as Foerderprogramm);
  await fs.writeFile(PROGRAMS_PATH, JSON.stringify(all, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Per-Programm-Schritt: HEAD + Extract + Queue-Push
// ---------------------------------------------------------------------------

async function processProgramm(
  c: ScanCandidate,
  sourceId: string,
  dryRun: boolean
): Promise<ProgrammResult> {
  const programmId = slugifyName(c.name);
  const base: ProgrammResult = {
    programmId,
    name: c.name,
    detailUrl: c.detailUrl,
    source: sourceId,
    status: "failure",
  };

  // 1) HTTP-HEAD-Pre-Check
  const head = await httpHead(c.detailUrl);
  if (head.klasse) {
    console.warn(`    HEAD-Skip ${programmId}: ${head.klasse} (status ${head.status})`);
    return { ...base, status: "skip", failureKlasse: head.klasse, detail: `HEAD HTTP ${head.status}` };
  }

  if (dryRun) {
    console.log(`    [dry-run] Wuerde extrahieren: ${programmId}`);
    return { ...base, status: "done", detail: "dry-run skipped extract" };
  }

  // 2) Foerderprogramm-Stub anlegen, damit Queue-Score Logik einen Programm-Eintrag findet
  try {
    await appendProgrammIfMissing(programmId, c);
  } catch (err) {
    return { ...base, failureKlasse: "queue-write-error", detail: (err as Error).message };
  }

  // 3) runExtraction mit skipQueueUpdate=true (auto-pflege-step ist Single-Writer)
  try {
    await runExtraction(programmId, [c.detailUrl], { skipQueueUpdate: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("empty-extraction")) {
      return { ...base, status: "skip", failureKlasse: "empty-extraction", detail: msg };
    }
    return { ...base, failureKlasse: "llm-error", detail: msg };
  }

  // 4) Queue-Entry pushen (status=done) — wir sind der einzige Writer
  try {
    const q = await loadQueue();
    if (q.items.some((it) => it.programmId === programmId)) {
      // Schon in Queue (sollte nicht passieren bei Single-Writer, aber idempotent)
      return { ...base, status: "done", detail: "queue-entry-existed" };
    }
    const newItem: QueueItem = {
      programmId,
      name: c.name,
      foerdergeberTyp: "sonst",
      reichweite: "alle",
      infoLink: c.detailUrl,
      score: estimateScore(c),
      status: "done",
    };
    q.items.push(newItem);
    await saveQueue(q);
  } catch (err) {
    return { ...base, failureKlasse: "queue-write-error", detail: (err as Error).message };
  }

  return { ...base, status: "done" };
}

// ---------------------------------------------------------------------------
// Failure-Report-Markdown (D-12)
// ---------------------------------------------------------------------------

function renderFailureReport(results: ProgrammResult[]): string {
  const fails = results.filter((r) => r.status !== "done");
  if (fails.length === 0) return "# Auto-Pflege-Report\n\nKeine Failures oder Skips.\n";
  const lines: string[] = [];
  lines.push("# Auto-Pflege-Report — Failures + Skips");
  lines.push("");
  lines.push(`Laufzeit: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Programm | Source | Status | Klasse | Detail |");
  lines.push("|---|---|---|---|---|");
  for (const r of fails) {
    const detail = (r.detail ?? "").replace(/\|/g, "\\|").slice(0, 200);
    lines.push(`| ${r.programmId} | ${r.source} | ${r.status} | ${r.failureKlasse ?? "-"} | ${detail} |`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log("==> Auto-Pflege-Step");
  console.log(`    Dry-Run: ${opts.dryRun}`);
  console.log(`    Max-Programs: ${opts.maxPrograms}`);
  console.log(`    Logs-Dir: ${opts.logsDir}`);

  // Sources + Bestand laden
  const sources = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8")) as { sources: Source[] };
  const programme = (JSON.parse(await fs.readFile(PROGRAMS_PATH, "utf8")) as Foerderprogramm[]);
  const knownNames = new Set<string>();
  const knownUrls = new Set<string>();
  for (const p of programme) {
    if (p.name) knownNames.add(p.name.trim().toLowerCase());
    if (p.infoLink) knownUrls.add(normalizeUrl(p.infoLink));
  }

  // Phase 1: Scan
  console.log(`==> Phase 1: Scan (${sources.sources.length} Quellen)`);
  const allCandidates: Array<{ candidate: ScanCandidate; sourceId: string }> = [];
  for (const src of sources.sources) {
    const found = await scanSource(src);
    const unknown = filterUnknown(found, knownNames, knownUrls);
    console.log(`    ${src.id}: ${found.length} gefunden, ${unknown.length} neu`);
    for (const c of unknown) allCandidates.push({ candidate: c, sourceId: src.id });
  }
  if (allCandidates.length === 0) {
    console.log("==> Keine neuen Programme. Done.");
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, "has_failures=false\nnew_count=0\n");
    }
    return;
  }

  // Phase 2: Per-Programm-Loop (max N)
  const toProcess = allCandidates.slice(0, opts.maxPrograms);
  console.log(`==> Phase 2: ${toProcess.length} Programme verarbeiten (Limit ${opts.maxPrograms})`);
  await fs.mkdir(opts.logsDir, { recursive: true });
  const results: ProgrammResult[] = [];
  for (const { candidate, sourceId } of toProcess) {
    console.log(`  -> ${candidate.name}`);
    const r = await processProgramm(candidate, sourceId, opts.dryRun);
    results.push(r);
    if (!opts.dryRun) {
      await fs.writeFile(
        path.join(opts.logsDir, `${r.programmId}.json`),
        JSON.stringify(r, null, 2) + "\n"
      );
    }
  }

  // Phase 3: Report
  const report = renderFailureReport(results);
  if (!opts.dryRun) {
    await fs.writeFile(opts.failureReport, report);
  }
  const doneCount = results.filter((r) => r.status === "done").length;
  const skipCount = results.filter((r) => r.status === "skip").length;
  const failCount = results.filter((r) => r.status === "failure").length;
  console.log(`==> Done: ${doneCount}, Skips: ${skipCount}, Failures: ${failCount}`);

  if (process.env.GITHUB_OUTPUT) {
    const hasFailures = (skipCount + failCount) > 0;
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      `has_failures=${hasFailures}\nnew_count=${doneCount}\nskip_count=${skipCount}\nfailure_count=${failCount}\n`
    );
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
