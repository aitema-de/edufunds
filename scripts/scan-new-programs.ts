/**
 * Scanner fuer neue Foerderprogramme.
 *
 * Liest data/program-sources.json, laedt pro Quelle die Uebersichtsseite
 * und laesst Gemini Flash die Programm-Eintraege (Name + Detail-URL)
 * extrahieren. Der Scanner vergleicht gegen bestehende foerderprogramme.json
 * (auf Name und URL-Host) und schreibt neue Kandidaten in
 * data/program-candidates.json — NICHT direkt in foerderprogramme.json,
 * damit ein Mensch vor Aufnahme reviewen kann.
 *
 * Nutzung:
 *   npx tsx scripts/scan-new-programs.ts [--source <sourceId>] [--verbose]
 *
 * Der wöchentliche GitHub-Actions-Workflow ruft ohne Argumente auf und
 * eroeffnet bei neuen Kandidaten einen Pull Request mit der aktualisierten
 * program-candidates.json.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.0-flash";
const SOURCES_PATH = path.join(process.cwd(), "data", "program-sources.json");
const PROGRAMS_PATH = path.join(process.cwd(), "data", "foerderprogramme.json");
const CANDIDATES_PATH = path.join(process.cwd(), "data", "program-candidates.json");
const MAX_HTML_CHARS = 80000;

interface Source {
  id: string;
  name: string;
  url: string;
  fokus?: string;
}

interface SourcesFile {
  description?: string;
  sources: Source[];
}

interface Foerderprogramm {
  id: string;
  name: string;
  infoLink?: string;
}

interface CandidateEntry {
  name: string;
  detailUrl: string;
  sourceId: string;
  sourceName: string;
  firstSeen: string;
  status: "new" | "review" | "duplicate" | "skip";
  /** 1..5 Einschaetzung der Schul-Relevanz (Gemini-Ausgabe). */
  schulRelevanz?: number;
  kurznotiz?: string;
}

interface CandidatesFile {
  generatedAt: string;
  items: CandidateEntry[];
}

interface ScanResult {
  programme: Array<{ name: string; detailUrl: string; schulRelevanz?: number; kurznotiz?: string }>;
}

const EXTRACT_SYSTEM = `Du extrahierst aus einer HTML-Uebersichtsseite alle sichtbaren Eintraege zu einzelnen Foerderprogrammen. Fokus: Foerderungen, an denen Schulen, Lehrende oder Schuelerinnen und Schueler beteiligt sein koennen.

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

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "EduFunds-Scanner/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${url}`);
  return res.text();
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

function loadProgrammLookups(programme: Foerderprogramm[]): {
  names: Set<string>;
  urls: Set<string>;
} {
  const names = new Set<string>();
  const urls = new Set<string>();
  for (const p of programme) {
    if (p.name) names.add(p.name.trim().toLowerCase());
    if (p.infoLink) urls.add(normalizeUrl(p.infoLink));
  }
  return { names, urls };
}

async function loadCandidates(): Promise<CandidatesFile> {
  try {
    const raw = await fs.readFile(CANDIDATES_PATH, "utf8");
    return JSON.parse(raw) as CandidatesFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { generatedAt: new Date().toISOString().slice(0, 10), items: [] };
    }
    throw err;
  }
}

async function saveCandidates(c: CandidatesFile): Promise<void> {
  await fs.writeFile(CANDIDATES_PATH, JSON.stringify(c, null, 2) + "\n");
}

async function scanSource(
  src: Source,
  gemini: GoogleGenerativeAI,
  verbose: boolean
): Promise<ScanResult["programme"]> {
  if (verbose) console.log(`  Lade ${src.url}`);
  const html = await fetchHtml(src.url);
  const text = stripHtml(html).slice(0, MAX_HTML_CHARS);
  const userPrompt = `QUELLE: ${src.name}
BASIS-URL: ${src.url}

SEITENINHALT (HTML entfernt):
${text}

Liefere die Programm-Liste als JSON.`;

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
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const sourceFilterIdx = args.indexOf("--source");
  const sourceFilter = sourceFilterIdx >= 0 ? args[sourceFilterIdx + 1] : null;

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY fehlt in der Umgebung.");
    process.exit(1);
  }

  const sourcesFile = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8")) as SourcesFile;
  const programme = JSON.parse(await fs.readFile(PROGRAMS_PATH, "utf8")) as Foerderprogramm[];
  const { names: knownNames, urls: knownUrls } = loadProgrammLookups(programme);
  const candidates = await loadCandidates();
  const candidateUrls = new Set(candidates.items.map((c) => normalizeUrl(c.detailUrl)));
  const candidateNames = new Set(candidates.items.map((c) => c.name.trim().toLowerCase()));

  const gemini = new GoogleGenerativeAI(apiKey);

  const sourcesToScan = sourceFilter
    ? sourcesFile.sources.filter((s) => s.id === sourceFilter)
    : sourcesFile.sources;
  if (sourcesToScan.length === 0) {
    console.error("Keine Quellen zum Scannen gefunden.");
    process.exit(2);
  }

  console.log(`==> Scanne ${sourcesToScan.length} Quelle(n)`);
  let addedTotal = 0;
  let seenTotal = 0;

  for (const src of sourcesToScan) {
    console.log(`  - ${src.id} (${src.name})`);
    try {
      const found = await scanSource(src, gemini, verbose);
      seenTotal += found.length;
      if (verbose) console.log(`    gefunden: ${found.length}`);
      for (const entry of found) {
        const name = entry.name?.trim();
        const url = entry.detailUrl ? normalizeUrl(entry.detailUrl) : "";
        if (!name || !url) continue;
        const lcName = name.toLowerCase();
        if (knownNames.has(lcName) || knownUrls.has(url)) continue; // bereits in foerderprogramme.json
        if (candidateNames.has(lcName) || candidateUrls.has(url)) continue; // bereits Kandidat
        candidates.items.push({
          name,
          detailUrl: url,
          sourceId: src.id,
          sourceName: src.name,
          firstSeen: new Date().toISOString().slice(0, 10),
          status: "new",
          schulRelevanz: entry.schulRelevanz,
          kurznotiz: entry.kurznotiz,
        });
        candidateUrls.add(url);
        candidateNames.add(lcName);
        addedTotal++;
      }
    } catch (err) {
      console.error(`    Fehler: ${(err as Error).message}`);
    }
  }

  candidates.generatedAt = new Date().toISOString().slice(0, 10);
  candidates.items.sort((a, b) => (b.schulRelevanz ?? 0) - (a.schulRelevanz ?? 0));
  await saveCandidates(candidates);

  console.log(`==> Fertig. ${seenTotal} Eintraege gesehen, ${addedTotal} neue Kandidaten gespeichert.`);
  console.log(`    Datei: ${CANDIDATES_PATH}`);
  console.log(`    Total Kandidaten im Staging: ${candidates.items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
