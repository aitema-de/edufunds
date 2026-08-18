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
 *   --quelle <id>           nur diese eine Quelle scannen (Pruefen einer neuen Quelle, mit --dry-run)
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
import { ladeRobots, istErlaubt, pfadMitQuery, type RobotsRegeln } from "../lib/scan/robots";
import { holeSeiteMitBrowser, bewerteSeite } from "../lib/scan/browser-scan";
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
  /**
   * "seite"   — HTML holen, Text an das LLM, Programme extrahieren (Urspruengliches Verfahren).
   * "sitemap" — XML holen, URLs nach `pfadFilter` sieben, Namen aus dem Slug bilden.
   *             Deterministisch, ohne LLM. Noetig, weil Uebersichtsseiten heute
   *             clientseitig gerendert werden: der Fetch liefert 200 und Navigation,
   *             die Liste selbst steht nicht im HTML (Befund 18.08.2026).
   */
  /**
   * "browser" — Seite im echten Browser rendern (Playwright), dann wie oben:
   *             mit `pfadFilter` deterministische Link-Ernte, ohne ihn Text an das LLM.
   *             Noetig fuer Portale, die ihre Liste erst clientseitig zusammenbauen —
   *             ein statischer Fetch sieht dort nur Navigation. Loest KEINEN Bot-Schutz,
   *             siehe lib/scan/browser-scan.ts.
   */
  typ?: "seite" | "sitemap" | "browser";
  /** Fuer typ="sitemap" und typ="browser": Pfad-Praefix der Angebotsseiten, z. B. "/foerderangebote/". */
  pfadFilter?: string;
  /** Nur typ="browser": Selektor, auf den vor dem Auslesen gewartet wird. */
  warteAufSelektor?: string;
  /** Nur typ="browser": Cookie-Hinweis, der die Liste verdeckt, wegklicken. */
  cookieBannerSelektor?: string;
  /**
   * Nur typ="browser": Mindestlaenge des gerenderten Textes (Default 500). Darunter gilt die
   * Quelle als defekt. Genau das hat 2026 sechs Wochen gefehlt: die Bildungsserver-Suche
   * lieferte 58 Zeichen ("Keine Datenbank gewaehlt!") und der Lauf meldete "0 gefunden".
   */
  mindestTextZeichen?: number;
  /** Optional deaktiviert, mit Begruendung im Feld `grund`. */
  aktiv?: boolean;
  grund?: string;
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
  /** Nur diese eine Quelle scannen — zum Pruefen einer neuen Quelle vor dem Aktivieren. */
  nurQuelle?: string;
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
    else if (a === "--quelle") o.nurQuelle = argv[++i];
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

interface ScanSourceResult {
  candidates: ScanCandidate[];
  /** Gesetzt, wenn die Quelle NICHT ausgewertet werden konnte (Fetch, HTTP, LLM). */
  fehler?: string;
}

/** Slug -> lesbarer Name: "finanz-doppelstunde" -> "Finanz Doppelstunde". */
function nameAusSlug(url: string): string {
  const slug = url.replace(/\/+$/, "").split("/").pop() ?? "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Sekunden warten — fuer die Crawl-delay-Angabe einer robots.txt. */
function warte(sekunden: number): Promise<void> {
  return new Promise((r) => setTimeout(r, sekunden * 1000));
}

/** Sitemap-Quelle: deterministisch, kein LLM. Folgt Sitemap-Index-Verweisen eine Ebene. */
async function scanSitemap(src: Source, crawlDelay: number | null): Promise<ScanSourceResult> {
  const filter = src.pfadFilter ?? "/";
  try {
    let xml = await fetchHtml(src.url);
    const kinder = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (kinder.length > 0) {
      // Sequenziell statt parallel, sobald die Quelle ein Crawl-delay angibt: zehn
      // gleichzeitige Abrufe sind genau das, was die Angabe verhindern soll.
      const teile: string[] = [];
      for (const u of kinder.slice(0, 10)) {
        teile.push(await fetchHtml(u).catch(() => ""));
        if (crawlDelay) await warte(crawlDelay);
      }
      xml = teile.join("\n");
    }
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const treffer = locs.filter((u) => u.includes(filter));
    return {
      candidates: treffer.map((u) => ({ name: nameAusSlug(u), detailUrl: u })),
    };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`  Source ${src.id} fehlgeschlagen: ${msg}`);
    return { candidates: [], fehler: msg };
  }
}

/**
 * Browser-Quelle: Seite mit Playwright rendern, dann Links ernten oder Text an das LLM.
 *
 * Jede Abbruchstelle liefert einen konkreten Grund statt einer leeren Liste. Der Befund
 * vom 18.08.2026 hing genau daran: "0 gefunden" sah bei einer kaputten Quelle exakt so
 * aus wie bei einer Quelle ohne Neuigkeiten.
 */
async function scanBrowser(src: Source): Promise<ScanSourceResult> {
  try {
    const seite = await holeSeiteMitBrowser({
      url: src.url,
      warteAufSelektor: src.warteAufSelektor,
      cookieBannerSelektor: src.cookieBannerSelektor,
      userAgent: BROWSER_HEADERS["User-Agent"],
    });
    const befund = bewerteSeite(seite, {
      quellUrl: src.url,
      pfadFilter: src.pfadFilter,
      mindestTextZeichen: src.mindestTextZeichen,
    });
    if (befund.fehler) return { candidates: [], fehler: befund.fehler };
    if (befund.candidates) {
      console.log(
        `    ${src.id}: gerendert ${seite.text.length} Zeichen, ` +
          `${befund.candidates.length} Links unter ${src.pfadFilter}`
      );
      return { candidates: befund.candidates };
    }

    const userPrompt = `QUELLE: ${src.name}
URL: ${src.url}
FOKUS: ${src.fokus ?? ""}

VOLLTEXT (im Browser gerendert, gekuerzt):
${(befund.textFuerLlm ?? "").slice(0, MAX_HTML_CHARS)}

Liefere die Liste neuer Programme als JSON-Objekt zurueck.`;
    const result = await generateJson<ScanResult>(MODEL_INTERVIEW, SCAN_SYSTEM, userPrompt, {
      maxTokens: 4000,
    });
    return { candidates: result.value.programme ?? [] };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`  Source ${src.id} fehlgeschlagen: ${msg}`);
    return { candidates: [], fehler: msg };
  }
}

/**
 * @param erzwungen Quelle wurde per --quelle ausdruecklich benannt. Dann wird sie auch
 *   geprueft, wenn sie deaktiviert ist — genau dafuer ist das Flag da: eine Quelle
 *   ansehen, BEVOR man sie aktiv schaltet, oder nachsehen, ob eine abgeschaltete
 *   inzwischen wieder erreichbar ist. Der Wochenlauf selbst fasst sie nicht an.
 */
async function scanSource(src: Source, erzwungen = false): Promise<ScanSourceResult> {
  console.log(`  Scan ${src.id} (${src.url})`);
  if (src.aktiv === false) {
    if (!erzwungen) {
      console.log(`    ${src.id}: deaktiviert — ${src.grund ?? "ohne Begruendung"}`);
      return { candidates: [] };
    }
    console.log(
      `    ${src.id}: deaktiviert, wird auf ausdrueckliche Anforderung (--quelle) trotzdem geprueft.`
    );
    console.log(`    Hinterlegter Grund: ${src.grund ?? "ohne Begruendung"}`);
  }

  // robots.txt zuerst — und zwar fuer jeden Quellentyp. Ein Crawler, der woechentlich
  // unbeaufsichtigt laeuft, muss die Hausordnung der Quelle im Code haben, nicht in der Doku.
  let regeln: RobotsRegeln;
  try {
    regeln = await ladeRobots(src.url);
  } catch (err) {
    return { candidates: [], fehler: `robots.txt-Pruefung fehlgeschlagen: ${(err as Error).message}` };
  }
  if (!istErlaubt(pfadMitQuery(src.url), regeln)) {
    const grund =
      regeln.herkunft === "unerreichbar"
        ? `${regeln.fehler} — ohne lesbare robots.txt wird nicht abgerufen (fail-closed).`
        : `robots.txt der Domain sperrt ${pfadMitQuery(src.url)}.`;
    return { candidates: [], fehler: `Nicht abgerufen: ${grund}` };
  }
  if (regeln.crawlDelaySekunden) {
    console.log(`    ${src.id}: robots.txt setzt Crawl-delay ${regeln.crawlDelaySekunden}s — wird eingehalten.`);
  }

  if (src.typ === "sitemap") return scanSitemap(src, regeln.crawlDelaySekunden);
  if (src.typ === "browser") return scanBrowser(src);
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
    return { candidates: result.value.programme ?? [] };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`  Source ${src.id} fehlgeschlagen: ${msg}`);
    return { candidates: [], fehler: msg };
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
  const zuScannen = opts.nurQuelle
    ? sources.sources.filter((q) => q.id === opts.nurQuelle)
    : sources.sources;
  if (opts.nurQuelle && zuScannen.length === 0) {
    console.error(`==> Quelle "${opts.nurQuelle}" steht nicht in data/program-sources.json.`);
    process.exitCode = 1;
    return;
  }
  if (opts.nurQuelle) {
    console.log(`==> Einzelquelle: ${opts.nurQuelle} (--quelle)`);
  }
  console.log(`==> Phase 1: Scan (${zuScannen.length} Quellen)`);
  const allCandidates: Array<{ candidate: ScanCandidate; sourceId: string }> = [];
  const quellenFehler: Array<{ id: string; fehler: string }> = [];
  let quellenMitTreffern = 0;
  for (const src of zuScannen) {
    const { candidates: found, fehler } = await scanSource(src, Boolean(opts.nurQuelle));
    if (fehler) quellenFehler.push({ id: src.id, fehler });
    if (found.length > 0) quellenMitTreffern++;
    const unknown = filterUnknown(found, knownNames, knownUrls);
    console.log(`    ${src.id}: ${found.length} gefunden, ${unknown.length} neu`);
    for (const c of unknown) allCandidates.push({ candidate: c, sourceId: src.id });
  }

  // Befund 18.08.2026: Der Wochenlauf meldete monatelang "0 gefunden, 0 neu" und
  // wurde gruen — dahinter steckten drei verschiedene Defekte (Fetch-Fehler,
  // toter LLM-Key, HTTP 404 nach Portal-Umbau). "Nichts gefunden" und "Quelle
  // kaputt" sahen im Log identisch aus. Ein Scanner, der auf KEINER Quelle etwas
  // findet, ist ein defektes Werkzeug und kein Beleg dafuer, dass es nichts gibt.
  const aktiveQuellen = opts.nurQuelle
    ? zuScannen.length
    : zuScannen.filter((q) => q.aktiv !== false).length;
  const alleQuellenLeer = quellenMitTreffern === 0 && aktiveQuellen > 0;
  // Ein Scanner ohne aktive Quelle laeuft woechentlich, tut nichts und meldet Erfolg —
  // genau die Stille, die diesen Befund sechs Wochen lang verdeckt hat. Deshalb laut.
  const keineQuelleAktiv = aktiveQuellen === 0;
  if (quellenFehler.length > 0 || alleQuellenLeer || keineQuelleAktiv) {
    console.error("");
    console.error("==> QUELLEN-SCAN DEFEKT");
    for (const q of quellenFehler) console.error(`    ✗ ${q.id}: ${q.fehler}`);
    if (keineQuelleAktiv) {
      console.error(
        `    ✗ KEINE aktive Quelle konfiguriert (${zuScannen.length} eingetragen, alle deaktiviert). ` +
          `Die Programm-Suche findet damit strukturell nichts — neue Quellen eintragen, ` +
          `Begruendungen je Quelle stehen in data/program-sources.json.`
      );
    }
    if (alleQuellenLeer) {
      console.error(
        `    ✗ Keine einzige der ${aktiveQuellen} aktiven Quellen lieferte einen Treffer — ` +
          `URLs gegen die Portale pruefen (Deep-Links werden umgebaut) und LLM-Key verifizieren.`
      );
    }
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `has_failures=true\nnew_count=0\nskip_count=0\nfailure_count=${Math.max(quellenFehler.length, 1)}\n`
      );
    }
    if (opts.failureReport && !opts.dryRun) {
      const zeilen = [
        "# Auto-Pflege: Quellen-Scan defekt",
        "",
        ...quellenFehler.map((q) => `- **${q.id}**: ${q.fehler}`),
        ...(alleQuellenLeer ? ["- **Alle Quellen ohne Treffer** — siehe Log."] : []),
      ];
      await fs.writeFile(opts.failureReport, zeilen.join("\n") + "\n", "utf-8");
    }
    process.exitCode = 1;
    return;
  }

  if (allCandidates.length === 0) {
    console.log("==> Keine neuen Programme. Done.");
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, "has_failures=false\nnew_count=0\n");
    }
    return;
  }

  if (opts.dryRun) {
    console.log(`==> Gefundene Kandidaten (${allCandidates.length}):`);
    for (const { candidate, sourceId } of allCandidates) {
      console.log(`    [${sourceId}] ${candidate.name}`);
      console.log(`        ${candidate.detailUrl}`);
    }
  }

  // Phase 2: Per-Programm-Loop (max N)
  const toProcess = allCandidates.slice(0, opts.maxPrograms);
  console.log(`==> Phase 2: ${toProcess.length} Programme verarbeiten (Limit ${opts.maxPrograms})`);
  if (!opts.dryRun) await fs.mkdir(opts.logsDir, { recursive: true });
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
