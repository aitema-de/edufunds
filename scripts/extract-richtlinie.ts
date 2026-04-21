/**
 * CLI-Tool zum Extrahieren einer Foerderrichtlinie in unser JSON-Schema.
 *
 * Drei Modi:
 *   npx tsx scripts/extract-richtlinie.ts --list [N]
 *       Zeigt die naechsten N offenen Programme aus der Prio-Queue
 *       data/richtlinien-prioritaeten.json (Default 10).
 *
 *   npx tsx scripts/extract-richtlinie.ts --next [zusaetzliche-urls...]
 *       Nimmt das naechste offene Programm aus der Queue, verwendet dessen
 *       infoLink als Quelle (plus optional weitere URLs), extrahiert und
 *       setzt in der Queue status=done. Nach jedem --next also wieder --next.
 *
 *   npx tsx scripts/extract-richtlinie.ts <programmId> <url-oder-datei> [weitere...]
 *       Manueller Einzel-Lauf. Setzt den Status in der Queue ebenfalls auf done.
 *
 * Output: data/richtlinien/<programmId>.json (+ Status-Update in der Queue)
 *
 * WICHTIG: Das Ergebnis ist IMMER zu reviewen. KI-Extraktion hat
 * Halluzinations-Risiko, vor allem bei Zahlen (maxEur, Prozent).
 * Nach dem Lauf: JSON oeffnen, mit Original-Richtlinie abgleichen,
 * offensichtliche Fehler korrigieren, dann committen.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const MODEL = "gemini-2.5-pro";
const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");
const QUEUE_PATH = path.join(process.cwd(), "data", "richtlinien-prioritaeten.json");

interface QueueItem {
  programmId: string;
  name: string;
  foerdergeberTyp?: string;
  foerdersummeMax?: number | null;
  reichweite?: string;
  infoLink?: string;
  score: number;
  status: "open" | "done" | "skip";
}

interface Queue {
  generatedAt: string;
  description: string;
  criteria: string;
  total: number;
  items: QueueItem[];
}

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
  "notizen"?: string[]
}

Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;

async function fetchOrRead(src: string): Promise<{ url: string; text: string }> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src, { headers: { "User-Agent": "EduFunds-Extractor/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${src}`);
    const ct = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = ct.includes("html") ? stripHtml(body) : body;
    return { url: src, text };
  }
  const text = await fs.readFile(src, "utf8");
  return { url: `file://${path.resolve(src)}`, text };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadQueue(): Promise<Queue> {
  const raw = await fs.readFile(QUEUE_PATH, "utf8");
  return JSON.parse(raw) as Queue;
}

async function saveQueue(q: Queue): Promise<void> {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2) + "\n");
}

async function markDoneInQueue(programmId: string): Promise<void> {
  try {
    const q = await loadQueue();
    const item = q.items.find((i) => i.programmId === programmId);
    if (item && item.status !== "done") {
      item.status = "done";
      await saveQueue(q);
      console.log(`    Queue: ${programmId} → status=done`);
    }
  } catch (err) {
    // Queue nicht vorhanden — stiller Fehler, nicht kritisch fuer den Extract-Lauf.
    console.warn(`    Queue-Update übersprungen: ${(err as Error).message}`);
  }
}

async function cmdList(n: number): Promise<void> {
  const q = await loadQueue();
  const open = q.items.filter((i) => i.status === "open").slice(0, n);
  if (open.length === 0) {
    console.log("Keine offenen Programme in der Queue.");
    return;
  }
  console.log(`Naechste ${open.length} offene Programme (von ${q.items.filter((i) => i.status === "open").length} offenen total):\n`);
  console.log("#  Score  programmId                              Typ        Reichweite   maxEur     Name");
  console.log("-".repeat(120));
  open.forEach((it, i) => {
    const score = it.score.toFixed(1).padStart(5);
    const id = it.programmId.padEnd(40);
    const typ = (it.foerdergeberTyp ?? "?").padEnd(10);
    const reich = (it.reichweite ?? "?").padEnd(12);
    const max = (it.foerdersummeMax ?? 0).toString().padStart(10);
    const name = it.name.slice(0, 60);
    console.log(`${String(i + 1).padStart(2)}. ${score}  ${id}  ${typ} ${reich} ${max}  ${name}`);
  });
  console.log();
  console.log(`Fortfahren mit: npx tsx scripts/extract-richtlinie.ts --next`);
}

async function cmdNext(extraUrls: string[]): Promise<void> {
  const q = await loadQueue();
  const next = q.items.find((i) => i.status === "open");
  if (!next) {
    console.log("Keine offenen Programme in der Queue. Queue ist komplett abgearbeitet.");
    return;
  }
  if (!next.infoLink) {
    console.error(
      `Programm ${next.programmId} hat keinen infoLink in der Queue. Manuell mit URLs aufrufen:`
    );
    console.error(`  npx tsx scripts/extract-richtlinie.ts ${next.programmId} <url> [weitere-urls]`);
    process.exit(4);
  }
  console.log(
    `==> Naechstes offenes Programm: ${next.programmId} (Score ${next.score}) — ${next.name}`
  );
  console.log(`    Quelle: ${next.infoLink}`);
  await runExtraction(next.programmId, [next.infoLink, ...extraUrls]);
}

async function runExtraction(programmId: string, srcs: string[]): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY fehlt in der Umgebung.");
    process.exit(1);
  }

  console.log(`==> Sammle Quellen (${srcs.length})`);
  const quellen: string[] = [];
  const texte: string[] = [];
  for (const s of srcs) {
    console.log("    - " + s);
    const { url, text } = await fetchOrRead(s);
    quellen.push(url);
    texte.push(`### Quelle: ${url}\n\n${text.slice(0, 60000)}`);
  }

  const userPrompt = `PROGRAMM-ID: ${programmId}
VERSION: ${new Date().toISOString().slice(0, 10)}

QUELLEN:
${quellen.map((q) => "- " + q).join("\n")}

VOLLTEXT (ggf. gekuerzt):
${texte.join("\n\n---\n\n")}

Erstelle das Richtlinien-Dossier als JSON.`;

  console.log("==> Gemini Pro Extraktion laeuft");
  const client = new GoogleGenerativeAI(apiKey);
  const gm = client.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });
  const res = await gm.generateContent(userPrompt);
  const raw = res.response.text().trim();

  let parsed: Richtlinie;
  try {
    parsed = JSON.parse(raw) as Richtlinie;
  } catch {
    console.error("Antwort war kein valides JSON, speichere als .raw.txt fuer Debug.");
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, `${programmId}.raw.txt`), raw);
    process.exit(3);
  }

  parsed.quellen = quellen;
  parsed.version = parsed.version ?? new Date().toISOString().slice(0, 10);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${programmId}.json`);
  await fs.writeFile(outPath, JSON.stringify(parsed, null, 2) + "\n");

  const usage = res.response.usageMetadata;
  console.log(`==> Geschrieben: ${outPath}`);
  if (usage) {
    console.log(
      `    Tokens: ${usage.promptTokenCount} in + ${usage.candidatesTokenCount} out`
    );
  }
  await markDoneInQueue(programmId);
  console.log("\nBITTE REVIEW: Dossier mit Originalrichtlinie abgleichen bevor commit.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Nutzung:\n" +
        "  npx tsx scripts/extract-richtlinie.ts --list [N]\n" +
        "  npx tsx scripts/extract-richtlinie.ts --next [zusaetzliche-urls...]\n" +
        "  npx tsx scripts/extract-richtlinie.ts <programmId> <url-oder-datei> [weitere...]\n"
    );
    process.exit(2);
  }

  if (args[0] === "--list") {
    const n = args[1] ? parseInt(args[1], 10) : 10;
    await cmdList(Number.isFinite(n) && n > 0 ? n : 10);
    return;
  }
  if (args[0] === "--next") {
    await cmdNext(args.slice(1));
    return;
  }

  const [programmId, ...srcs] = args;
  if (!programmId || srcs.length === 0) {
    console.error("Fehlende Argumente. --list oder --next oder <programmId> <url>.");
    process.exit(2);
  }
  await runExtraction(programmId, srcs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
