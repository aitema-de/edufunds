/**
 * CLI-Tool zum Extrahieren einer Foerderrichtlinie in unser JSON-Schema.
 *
 * Nutzung:
 *   npx tsx scripts/extract-richtlinie.ts <programmId> <url-oder-datei> [weitere-urls...]
 *
 * Beispiel:
 *   npx tsx scripts/extract-richtlinie.ts bmbf-digitalpakt-2 \
 *     https://www.digitalpaktschule.de/de/richtlinie.html \
 *     https://www.digitalpaktschule.de/de/faq.html
 *
 * Output: data/richtlinien/<programmId>.json
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

const API_KEY = process.env.GEMINI_API_KEY ?? "";
if (!API_KEY) {
  console.error("GEMINI_API_KEY fehlt in der Umgebung.");
  process.exit(1);
}

const MODEL = "gemini-2.5-pro";
const OUT_DIR = path.join(process.cwd(), "data", "richtlinien");

const SYSTEM_PROMPT = `Du extrahierst aus dem Volltext einer Foerderrichtlinie ein strukturiertes JSON-Dossier. Bleibe eng am Text, erfinde keine Zahlen oder Regeln. Wenn etwas nicht eindeutig ist, nutze "bemerkung" / "notizen"-Felder und lasse spezifische Felder weg statt zu raten.

Sprache: deutsch. Zahlen in EUR als number (ohne Punkte, ohne Komma). Prozente als number 0..100.

JSON-Schema (exakte Feldnamen):
{
  "version": "2026-04-20",
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

async function main() {
  const [, , programmId, ...srcs] = process.argv;
  if (!programmId || srcs.length === 0) {
    console.error(
      "Nutzung: npx tsx scripts/extract-richtlinie.ts <programmId> <url-oder-datei> [weitere-urls...]"
    );
    process.exit(2);
  }

  console.log(`==> Sammle Quellen (${srcs.length})`);
  const quellen: string[] = [];
  const texte: string[] = [];
  for (const s of srcs) {
    console.log("    - " + s);
    const { url, text } = await fetchOrRead(s);
    quellen.push(url);
    texte.push(`### Quelle: ${url}\n\n${text.slice(0, 60000)}`); // pro Quelle max 60k Zeichen
  }

  const userPrompt = `PROGRAMM-ID: ${programmId}
VERSION: ${new Date().toISOString().slice(0, 10)}

QUELLEN:
${quellen.map((q) => "- " + q).join("\n")}

VOLLTEXT (ggf. gekuerzt):
${texte.join("\n\n---\n\n")}

Erstelle das Richtlinien-Dossier als JSON.`;

  console.log("==> Gemini Pro Extraktion laeuft");
  const client = new GoogleGenerativeAI(API_KEY);
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
  } catch (err) {
    console.error("Antwort war kein valides JSON, speichere als .raw.txt fuer Debug.");
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, `${programmId}.raw.txt`), raw);
    process.exit(3);
  }

  // quellen setzen/ersetzen (vertraue nicht der KI bei URLs)
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
  console.log("\nBITTE REVIEW: Dossier mit Originalrichtlinie abgleichen bevor commit.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
