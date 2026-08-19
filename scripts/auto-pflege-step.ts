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
 *   --erstbestand-als-kandidaten  Bestand einer NEUEN Quelle einlesen statt stumm aufnehmen (Onboarding)
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
import {
  holeSeiteMitBrowser,
  bewerteSeite,
  pfadPasst,
  nameAusLink,
  extrahiereLinksAusHtml,
  filtereProgrammLinks,
  titelAusHtml,
} from "../lib/scan/browser-scan";
import { ladeBestand, speichereBestand, vergleicheBestand } from "../lib/scan/bestand";
import { bewerteText, type TriageUrteil } from "../lib/scan/triage";
import { runExtraction } from "./extract-richtlinie";
import { loadQueue, saveQueue, type QueueItem } from "../lib/wizard/queue";

// ---------------------------------------------------------------------------
// Pfade + Konstanten
// ---------------------------------------------------------------------------

const SOURCES_PATH = path.join(process.cwd(), "data", "program-sources.json");
const PROGRAMS_PATH = path.join(process.cwd(), "data", "foerderprogramme.json");
const BESTAND_DIR = path.join(process.cwd(), "data", "scan-state");
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
  /**
   * Bestandsvergleich abschalten (Default: an). Mit Vergleich liefert die Quelle nur, was seit
   * dem letzten Lauf NEU ist — das ist der Regelfall und der Grund, warum grosse Sitemaps
   * ueberhaupt handhabbar sind. Ohne ihn kaeme jede Woche der volle Bestand.
   */
  ohneBestandsvergleich?: boolean;
  /**
   * Triage ueberspringen. Nur fuer Quellen, bei denen JEDE Seite unter dem pfadFilter
   * per Definition ein Foerderangebot ist (z. B. Aktion Mensch) — dort wuerde die Pruefung
   * nur Abrufe kosten.
   */
  ohneTriage?: boolean;
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
  /**
   * Erstbestand einer neuen Quelle als Kandidaten behandeln, statt ihn stumm aufzunehmen.
   * Zum Onboarding: der vorhandene Bestand einer frisch eingetragenen Quelle IST das, was in
   * den Katalog soll. Der Bestand wird dabei bewusst NICHT geschrieben — die Buchfuehrung
   * uebernimmt der Abgleich gegen foerderprogramme.json, sodass mehrere Laeufe mit
   * --max-programs die Quelle stueckweise einlesen koennen.
   */
  erstbestandAlsKandidaten?: boolean;
}

export function parseArgs(argv: string[]): CliOpts {
  const o: CliOpts = {
    dryRun: false,
    maxPrograms: 5,
    logsDir: path.join("logs", `auto-pflege-${new Date().toISOString().slice(0, 10)}`),
    failureReport: "failure-report.md",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") o.dryRun = true;
    else if (a === "--max-programs") {
      // NICHT `|| 5`: --max-programs 0 ist ein legitimer Wert ("nur scannen, nichts extrahieren")
      // und wurde davon still zu 5 gemacht — der Lauf extrahierte dann Programme, obwohl er
      // ausdruecklich keine extrahieren sollte, und schrieb Stubs in den Katalog.
      const wert = parseInt(argv[++i] ?? "", 10);
      o.maxPrograms = Number.isFinite(wert) && wert >= 0 ? wert : 5;
    }
    else if (a === "--logs-dir") o.logsDir = argv[++i] ?? o.logsDir;
    else if (a === "--failure-report") o.failureReport = argv[++i] ?? o.failureReport;
    else if (a === "--quelle") o.nurQuelle = argv[++i];
    else if (a === "--erstbestand-als-kandidaten") o.erstbestandAlsKandidaten = true;
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

/**
 * Eine Programm-ID vergeben, die kein fremdes Programm ueberschreibt.
 *
 * GEMESSENER SCHADEN 18.08.2026: Der Onboarding-Lauf fuer Stiftung Bildung erzeugte aus
 * "Förderfonds Demokratie" die ID "foerderfonds-demokratie". Die war bereits vergeben — an ein
 * gleichnamiges, aber voellig anderes Programm unter foerderfonds-demokratie.de. Der Katalog
 * blieb unveraendert (die ID war belegt), aber die Extraktion schrieb
 * data/richtlinien/foerderfonds-demokratie.json NEU: aus "fixe_stichtage 2019-09-30,
 * nicht wiederkehrend" wurde "rolling".
 *
 * Genau dieser Stichtag ist der Grund, warum es __tests__/data/katalog-fristen.test.ts gibt:
 * am 17.07.2026 wurde fuer dieses tote Programm ein Antrag verkauft. Der Lauf haette die
 * Schranke dagegen lautlos entfernt.
 *
 * Regel: Gleiche ID ist nur dann dasselbe Programm, wenn auch der Host gleich ist. Sonst
 * bekommt der Neuling einen eigenen, lesbaren Namensraum.
 */
export function eindeutigeProgrammId(
  name: string,
  detailUrl: string,
  vergeben: Map<string, string | undefined>
): string {
  const basis = slugifyName(name);
  const belegtVon = vergeben.get(basis);
  if (!vergeben.has(basis)) return basis;
  if (belegtVon && hostVon(belegtVon) === hostVon(detailUrl)) return basis;

  // Host als lesbares Unterscheidungsmerkmal: "foerderfonds-demokratie-stiftungbildung".
  const marke = hostVon(detailUrl).split(".")[0] ?? "";
  const kandidat = slugifyName(`${basis} ${marke}`);
  if (kandidat && !vergeben.has(kandidat)) return kandidat;
  for (let n = 2; n < 50; n++) {
    const weiterer = `${kandidat || basis}-${n}`;
    if (!vergeben.has(weiterer)) return weiterer;
  }
  return `${basis}-${Math.abs(hashCode(detailUrl))}`;
}

/** Kleiner stabiler Hash — nur als allerletzter Ausweg fuer die ID-Vergabe. */
function hashCode(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return h;
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
    const treffer = locs.filter((u) => pfadPasst(u, filter));
    return {
      // nameAusLink statt der frueheren Slug-Formel: strippt Dateiendungen (".html" stand sonst
      // im Programmnamen) und stellt eindeutige Umlaute wieder her.
      candidates: treffer.map((u) => ({ name: nameAusLink("", u), detailUrl: u })),
    };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`  Source ${src.id} fehlgeschlagen: ${msg}`);
    return { candidates: [], fehler: msg };
  }
}

/**
 * robots.txt je Host nur einmal pro Lauf holen.
 *
 * Die Triage ruft anschliessend Dutzende Detailseiten derselben Domain ab — ohne Cache waere
 * das je Seite ein zusaetzlicher robots.txt-Abruf, also genau die Last, die die Hausordnung
 * begrenzen soll.
 */
const robotsCache = new Map<string, RobotsRegeln>();

async function robotsFuer(url: string): Promise<RobotsRegeln> {
  const host = new URL(url).host;
  const bekannt = robotsCache.get(host);
  if (bekannt) return bekannt;
  const regeln = await ladeRobots(url);
  robotsCache.set(host, regeln);
  return regeln;
}

/**
 * Triage eines einzelnen Kandidaten: Detailseite holen, Signale messen.
 *
 * Faellt bewusst nach OBEN durch: Wenn die Seite nicht abrufbar oder die robots.txt unklar
 * ist, wird der Kandidat weitergereicht statt verworfen. Ein verworfenes echtes Programm
 * waere unsichtbar verloren; ein durchgewinkter Blindgaenger kostet eine Extraktion und
 * faellt im PR-Review auf.
 */
async function triagiereKandidat(
  c: ScanCandidate
): Promise<{ urteil: TriageUrteil; titel?: string }> {
  const leer = { geld: [], zielgruppe: [], antrag: [], ausschluss: [] };
  try {
    const regeln = await robotsFuer(c.detailUrl);
    if (!istErlaubt(pfadMitQuery(c.detailUrl), regeln)) {
      return {
        urteil: {
          weiter: false,
          begruendung: "robots.txt der Domain sperrt diese Detailseite — nicht abgerufen.",
          signale: leer,
        },
      };
    }
    if (regeln.crawlDelaySekunden) await warte(regeln.crawlDelaySekunden);
    const html = await fetchHtml(c.detailUrl);
    const text = stripHtml(html).slice(0, MAX_HTML_CHARS);
    return { urteil: bewerteText(text, c.name), titel: titelAusHtml(html) ?? undefined };
  } catch (err) {
    return {
      urteil: {
        weiter: true,
        begruendung: `Seite nicht pruefbar (${(err as Error).message}) — im Zweifel weitergereicht.`,
        signale: leer,
      },
    };
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
      const kurz = (src.grund ?? "ohne Begruendung").replace(/\s+/g, " ");
      console.log(
        `    ${src.id}: deaktiviert — ${kurz.length > 140 ? kurz.slice(0, 140) + " […]" : kurz}`
      );
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
    regeln = await robotsFuer(src.url);
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

    // Statische Uebersicht MIT pfadFilter: Links deterministisch ernten, kein LLM, kein Browser.
    if (src.pfadFilter) {
      const treffer = filtereProgrammLinks(extrahiereLinksAusHtml(html, src.url), src.pfadFilter);
      if (treffer.length === 0) {
        return {
          candidates: [],
          fehler:
            `Seite geladen (${html.length} Zeichen HTML), aber kein Link unter "${src.pfadFilter}" — ` +
            `Seitenstruktur vermutlich geaendert. pfadFilter in data/program-sources.json pruefen.`,
        };
      }
      console.log(`    ${src.id}: ${treffer.length} Links unter ${src.pfadFilter} (statisch, ohne LLM)`);
      return { candidates: treffer };
    }

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

/** Host einer URL, klein geschrieben und ohne www. — fuer den Namensabgleich. */
function hostVon(url: string): string {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Kandidaten gegen den Bestand sieben.
 *
 * Die URL entscheidet immer. Der NAME entscheidet nur bei gleichem Host — sonst loescht eine
 * zufaellige Namensgleichheit ein fremdes Programm aus.
 *
 * Gemessen 18.08.2026: Der Katalog kennt einen "Förderfonds Demokratie" unter
 * foerderfonds-demokratie.de. Der gleichnamige Fonds der Stiftung Bildung ist ein voellig
 * anderes Programm mit eigenen Bedingungen — beim reinen Namensvergleich waere er dauerhaft
 * unsichtbar geblieben, ohne dass irgendwo etwas aufgefallen waere.
 *
 * Die Richtung des Restrisikos ist bewusst gewaehlt: ein Programm, das auf eine neue DOMAIN
 * umzieht, taucht jetzt als Dublette auf und faellt im PR-Review auf. Das ist der billigere
 * Fehler als ein still verschwundenes Programm.
 */
export function filterUnknown(
  candidates: ScanCandidate[],
  knownNames: Map<string, Set<string>>,
  knownUrls: Set<string>
): ScanCandidate[] {
  const result: ScanCandidate[] = [];
  const seenInBatch = new Set<string>();
  for (const c of candidates) {
    if (!c.name || !c.detailUrl) continue;
    const nameLower = c.name.trim().toLowerCase();
    const urlNorm = normalizeUrl(c.detailUrl);
    if (knownUrls.has(urlNorm)) continue;
    const hosts = knownNames.get(nameLower);
    if (hosts && hosts.has(hostVon(urlNorm))) continue;
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

/**
 * @param geber Klartextname des Foerdergebers, aus der Quelle abgeleitet.
 *
 * Der Stub trug bis 18.08.2026 nur fuenf Felder. app/page.tsx leitet seinen Typ per
 * `(typeof foerderprogramme)[number]` direkt aus dem Katalog ab — sobald ein Eintrag
 * `foerdergeber` nicht kennt, wird die Eigenschaft im ganzen Union-Typ optional und der
 * Typecheck bricht. Jeder Auto-Pflege-PR waere damit rot gewesen; gemerkt hat es nie jemand,
 * weil der Scanner nie einen Kandidaten geliefert hat.
 *
 * Die Felder bleiben inhaltlich leer, wo wir nichts wissen — der Stub ist ein Platzhalter fuer
 * den Review, kein Datensatz. Aber er ist ein vollstaendig geformter Platzhalter.
 */
async function appendProgrammIfMissing(
  programmId: string,
  c: ScanCandidate,
  geber: string
): Promise<void> {
  const raw = await fs.readFile(PROGRAMS_PATH, "utf8");
  const all = JSON.parse(raw) as Foerderprogramm[];
  if (all.some((p) => p.id === programmId)) return;
  all.push({
    id: programmId,
    name: c.name,
    foerdergeber: geber,
    foerdergeberTyp: "sonst",
    kurzbeschreibung: c.kurznotiz ?? "",
    foerdersummeText: "",
    // Kein leerer String: der Katalog garantiert, dass JEDES Programm einen menschenlesbaren
    // Fristtext traegt (__tests__/data/katalog-fristen.test.ts). Der Platzhalter behauptet
    // bewusst keine Frist, sondern benennt, dass sie fehlt.
    bewerbungsfristText: "Noch nicht geprüft — Frist im Review aus der Primärquelle eintragen.",
    bewerbungsart: "",
    kategorien: [],
    bundeslaender: [],
    infoLink: c.detailUrl,
    bemerkung: "Automatisch angelegter Platzhalter — im PR-Review pruefen und ausfuellen.",
    // BEWUSST false. Ein automatisch angelegter Platzhalter ohne verifizierte Frist darf nicht
    // verkaeuflich sein: genau daran wurde am 17.07.2026 ein Antrag fuer ein seit 2019 totes
    // Programm verkauft (siehe __tests__/data/katalog-fristen.test.ts). Der PR-Review schaltet
    // frei, nicht der Scanner.
    kiAntragGeeignet: false,
  } as unknown as Foerderprogramm);
  await fs.writeFile(PROGRAMS_PATH, JSON.stringify(all, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Per-Programm-Schritt: HEAD + Extract + Queue-Push
// ---------------------------------------------------------------------------

async function processProgramm(
  c: ScanCandidate,
  sourceId: string,
  dryRun: boolean,
  vergeben: Map<string, string | undefined>,
  geber: string
): Promise<ProgrammResult> {
  const programmId = eindeutigeProgrammId(c.name, c.detailUrl, vergeben);
  if (programmId !== slugifyName(c.name)) {
    console.warn(
      `    ID-Kollision: "${slugifyName(c.name)}" ist an ein anderes Programm vergeben — ` +
        `dieses laeuft als "${programmId}".`
    );
  }
  vergeben.set(programmId, c.detailUrl);
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
    await appendProgrammIfMissing(programmId, c, geber);
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

/**
 * Laufbericht — dorthin, wo er ohne Klicken gesehen wird.
 *
 * Die Triage verwirft Kandidaten im Normalbetrieb, das ist kein Fehler und darf deshalb kein
 * Failure-Issue ausloesen. Unsichtbar darf es trotzdem nicht sein: sonst entsteht genau wieder
 * ein stilles Sieb. GITHUB_STEP_SUMMARY landet direkt auf der Seite des Workflow-Laufs.
 */
async function schreibeLaufBericht(
  opts: CliOpts,
  quellen: Source[],
  quellenBericht: Array<{ id: string; aktiv: boolean; gefunden: number; neu: number; fehler?: string }>,
  vorTriage: number,
  nachTriage: number,
  verworfen: Array<{ name: string; url: string; quelle: string; grund: string }>
): Promise<void> {
  const zeilen: string[] = [];
  zeilen.push("## Auto-Pflege — Quellen-Lauf");
  zeilen.push("");
  const aktive = quellen.filter((q) => q.aktiv !== false);
  const gesamtUrls = quellenBericht.reduce((n, q) => n + q.gefunden, 0);
  zeilen.push(
    `**${aktive.length}** aktive Quellen von ${quellen.length} eingetragenen · ` +
      `**${gesamtUrls}** Seiten abgerufen · **${vorTriage}** neu seit letztem Lauf · ` +
      `**${nachTriage}** nach Triage`
  );
  zeilen.push("");
  // Die Zahl je Quelle ist der Lebensnachweis: eine Quelle, die 144 bekannte Programme zeigt,
  // arbeitet — auch wenn nichts Neues dabei war. Ohne diese Spalte sieht "nichts gefunden"
  // wieder genauso aus wie "kaputt", und genau das war der Befund vom 18.08.2026.
  const aktiveZeilen = quellenBericht.filter((q) => q.aktiv);
  if (aktiveZeilen.length > 0) {
    zeilen.push("| Quelle | Seiten in der Quelle | davon neu | Zustand |");
    zeilen.push("|---|---:|---:|---|");
    for (const q of aktiveZeilen) {
      const zustand = q.fehler ? `⚠️ ${q.fehler.slice(0, 90)}` : q.gefunden > 0 ? "ok" : "⚠️ leer";
      zeilen.push(`| ${q.id} | ${q.gefunden} | ${q.neu} | ${zustand} |`);
    }
  }
  if (verworfen.length > 0) {
    zeilen.push("");
    zeilen.push(`### Von der Triage verworfen (${verworfen.length})`);
    zeilen.push("");
    zeilen.push("Steht hier ein echtes Foerderprogramm, fehlt ein Signalwort in `lib/scan/triage.ts`.");
    zeilen.push("");
    zeilen.push("| Programm | Quelle | Grund |");
    zeilen.push("|---|---|---|");
    for (const v of verworfen) {
      const name = v.name.replace(/\|/g, "\\|").slice(0, 80);
      zeilen.push(`| [${name}](${v.url}) | ${v.quelle} | ${v.grund.replace(/\|/g, "\\|")} |`);
    }
  }
  zeilen.push("");
  const text = zeilen.join("\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n");
  }
  if (!opts.dryRun && opts.failureReport) {
    await fs.writeFile(opts.failureReport, text + "\n", "utf-8");
  }
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
  const knownNames = new Map<string, Set<string>>();
  const knownUrls = new Set<string>();
  // Belegte IDs: Katalogeintraege UND bereits vorhandene Dossiers. Letztere zaehlen mit,
  // weil ein Dossier ohne Katalogeintrag sonst ueberschrieben wuerde, ohne dass es auffaellt.
  const vergebeneIds = new Map<string, string | undefined>();
  for (const p of programme) vergebeneIds.set(p.id, p.infoLink);
  try {
    for (const datei of await fs.readdir(path.join(process.cwd(), "data", "richtlinien"))) {
      if (!datei.endsWith(".json")) continue;
      const id = datei.slice(0, -5);
      if (!vergebeneIds.has(id)) vergebeneIds.set(id, undefined);
    }
  } catch {
    /* kein Richtlinien-Verzeichnis — dann gibt es auch nichts zu ueberschreiben */
  }
  for (const p of programme) {
    if (p.infoLink) knownUrls.add(normalizeUrl(p.infoLink));
    if (!p.name) continue;
    const schluessel = p.name.trim().toLowerCase();
    const hosts = knownNames.get(schluessel) ?? new Set<string>();
    hosts.add(hostVon(p.infoLink ?? ""));
    knownNames.set(schluessel, hosts);
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
  const jetzt = new Date().toISOString();
  const bestandsBerichte: string[] = [];
  const quellenBericht: Array<{
    id: string;
    aktiv: boolean;
    gefunden: number;
    neu: number;
    fehler?: string;
  }> = [];
  for (const src of zuScannen) {
    const { candidates: found, fehler } = await scanSource(src, Boolean(opts.nurQuelle));
    if (fehler) quellenFehler.push({ id: src.id, fehler });
    // WICHTIG: Diese Zaehlung passiert VOR dem Bestandsvergleich und muss das auch bleiben.
    // Die Schranke fragt „liefert die Quelle noch?", nicht „gab es diese Woche etwas Neues".
    // Eine Quelle, die brav ihre 144 bekannten Programme zeigt, ist gesund — wuerde man erst
    // nach dem Vergleich zaehlen, meldete der Wochenlauf ab dem zweiten Mal „alle Quellen leer".
    if (found.length > 0) quellenMitTreffern++;

    let seitLetztemLauf = found;
    if (found.length > 0 && !src.ohneBestandsvergleich) {
      const alt = await ladeBestand(BESTAND_DIR, src.id);
      const diff = vergleicheBestand(
        alt,
        found.map((c) => c.detailUrl)
      );
      if (diff.fehler) {
        quellenFehler.push({ id: src.id, fehler: diff.fehler });
        seitLetztemLauf = [];
      } else if (diff.erstlauf && opts.erstbestandAlsKandidaten) {
        console.log(
          `    ${src.id}: Erstlauf im Onboarding-Modus — ${found.length} URLs werden als ` +
            `Kandidaten eingelesen, Bestand wird bewusst NICHT geschrieben.`
        );
        bestandsBerichte.push(`${src.id}: Onboarding, ${found.length} eingelesen`);
        seitLetztemLauf = found;
      } else if (diff.erstlauf) {
        console.log(
          `    ${src.id}: Erstlauf — ${found.length} URLs als Bestand aufgenommen, keine Kandidaten.`
        );
        bestandsBerichte.push(`${src.id}: Erstlauf, Bestand ${found.length}`);
        seitLetztemLauf = [];
      } else {
        const neuMenge = new Set(diff.neu);
        seitLetztemLauf = found.filter((c) => neuMenge.has(c.detailUrl));
        if (diff.entfallen.length > 0) {
          console.log(`    ${src.id}: ${diff.entfallen.length} URLs entfallen (Seite entfernt?).`);
          bestandsBerichte.push(`${src.id}: ${diff.entfallen.length} entfallen`);
        }
      }
      // Bestand auch dann fortschreiben, wenn nichts Neues dabei war — sonst gilt naechste
      // Woche wieder alles als neu.
      if (!opts.dryRun && !diff.fehler && !(diff.erstlauf && opts.erstbestandAlsKandidaten)) {
        await speichereBestand(
          BESTAND_DIR,
          src.id,
          found.map((c) => c.detailUrl),
          jetzt
        );
      }
    }

    const unknown = filterUnknown(seitLetztemLauf, knownNames, knownUrls);
    console.log(
      `    ${src.id}: ${found.length} in der Quelle, ${seitLetztemLauf.length} seit letztem Lauf neu, ` +
        `${unknown.length} noch nicht im Katalog`
    );
    for (const c of unknown) allCandidates.push({ candidate: c, sourceId: src.id });
    quellenBericht.push({
      id: src.id,
      aktiv: src.aktiv !== false,
      gefunden: found.length,
      neu: seitLetztemLauf.length,
      fehler,
    });
  }
  if (bestandsBerichte.length > 0) {
    console.log(`==> Bestand: ${bestandsBerichte.join(" · ")}`);
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

  // Frueher stand hier ein Ausstieg fuer "keine neuen Kandidaten". Der lag VOR dem
  // Laufbericht — die ruhige Woche, also der Normalfall, hinterliess damit keine
  // Zusammenfassung: gruener Haken, kein Wort darueber, ob die Quellen ueberhaupt geantwortet
  // haben. Genau diese Stille hat den Ausfall sechs Wochen verdeckt. Der Ausstieg passiert
  // jetzt nach dem Bericht (siehe unten, geprueft.length === 0).

  // Phase 1b: Triage — was lohnt ueberhaupt eine Dossier-Extraktion?
  const quelleNach = new Map(zuScannen.map((q) => [q.id, q]));
  const triageVerworfen: Array<{ name: string; url: string; quelle: string; grund: string }> = [];
  const geprueft: typeof allCandidates = [];
  if (allCandidates.length > 0) {
    console.log(`==> Phase 1b: Triage (${allCandidates.length} Kandidaten)`);
  }
  for (const eintrag of allCandidates) {
    if (quelleNach.get(eintrag.sourceId)?.ohneTriage) {
      geprueft.push(eintrag);
      continue;
    }
    const { urteil, titel } = await triagiereKandidat(eintrag.candidate);
    // Der Seitentitel schlaegt den aus dem Slug abgeleiteten Namen: er traegt die echten
    // Umlaute ("Förderfonds Ernährung" statt "Foerderfonds Ernaehrung") und die richtige
    // Schreibweise. Katalognamen sind sichtbarer Text.
    if (titel) eintrag.candidate.name = titel;
    if (urteil.weiter) {
      console.log(`    ✓ ${eintrag.candidate.name} — ${urteil.begruendung}`);
      geprueft.push(eintrag);
    } else {
      console.log(`    ✗ ${eintrag.candidate.name} — ${urteil.begruendung}`);
      triageVerworfen.push({
        name: eintrag.candidate.name,
        url: eintrag.candidate.detailUrl,
        quelle: eintrag.sourceId,
        grund: urteil.begruendung,
      });
    }
  }
  if (triageVerworfen.length > 0) {
    console.log(
      `==> Triage: ${geprueft.length} weiter, ${triageVerworfen.length} verworfen. ` +
        `Die Verworfenen stehen vollstaendig im Report — wer dort ein echtes Programm findet, ` +
        `muss ein Signalwort in lib/scan/triage.ts ergaenzen.`
    );
  }

  if (opts.dryRun) {
    console.log(`==> Kandidaten nach Triage (${geprueft.length}):`);
    for (const { candidate, sourceId } of geprueft) {
      console.log(`    [${sourceId}] ${candidate.name}`);
      console.log(`        ${candidate.detailUrl}`);
    }
  }

  await schreibeLaufBericht(
    opts,
    zuScannen,
    quellenBericht,
    allCandidates.length,
    geprueft.length,
    triageVerworfen
  );

  if (geprueft.length === 0) {
    console.log(
      allCandidates.length === 0
        ? "==> Keine neuen Programme bei den aktiven Quellen. Done."
        : "==> Nach der Triage bleibt nichts zu extrahieren. Done."
    );
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, "has_failures=false\nnew_count=0\n");
    }
    return;
  }

  // Phase 2: Per-Programm-Loop (max N)
  const toProcess = geprueft.slice(0, opts.maxPrograms);
  console.log(`==> Phase 2: ${toProcess.length} Programme verarbeiten (Limit ${opts.maxPrograms})`);
  if (!opts.dryRun) await fs.mkdir(opts.logsDir, { recursive: true });
  const results: ProgrammResult[] = [];
  for (const { candidate, sourceId } of toProcess) {
    console.log(`  -> ${candidate.name}`);
    // Foerdergeber aus dem Quellennamen: "Stiftung Bildung — Förderfonds" -> "Stiftung Bildung".
    const geber = (quelleNach.get(sourceId)?.name ?? sourceId).split(/\s+[—–-]\s+/)[0].trim();
    const r = await processProgramm(candidate, sourceId, opts.dryRun, vergebeneIds, geber);
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
    // Anhaengen statt ueberschreiben: der Laufbericht (inkl. der von der Triage verworfenen
    // Kandidaten) steht schon in der Datei und ist der eigentliche Beleg des Laufs.
    await fs.appendFile(opts.failureReport, "\n" + report);
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

// Entry-Point-Guard nach dem Muster von scripts/extract-richtlinie.ts: nur ausfuehren, wenn
// dieses Skript direkt aufgerufen wurde. Ohne den Guard startet schon ein `import` aus einem
// Test den kompletten Wochenlauf samt Netzabrufen.
const isEntryPoint = (() => {
  const arg1 = process.argv[1] ?? "";
  return arg1.endsWith("auto-pflege-step.ts") || arg1.endsWith("auto-pflege-step.js");
})();
if (isEntryPoint) {
  main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
}
