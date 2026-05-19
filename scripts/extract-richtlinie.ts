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
import { generateJson, MODEL_PIPELINE } from "../lib/wizard/llm";
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

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
  skipReason?: string;
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
  "version": "<wird vom Skript gesetzt — Feld weglassen oder leeren String liefern>",
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
  "notizen"?: string[],
  "bestPractices": [{ "thema": "...", "was_funktionierte": "...", "warum"?: "..." }],
  "rejectGruende": [{ "grund": "...", "haeufigkeit"?: "haeufig" | "gelegentlich", "vermeidung"?: "..." }],
  "vorbildFormulierungen": [{ "abschnitt_id": "id-aus-antragsstruktur.abschnitte", "formulierung": "...", "kontext"?: "..." }],
  "fristLogik": { "typ": "rolling" } | { "typ": "fixe_stichtage", "stichtage": ["YYYY-MM-DD", ...], "jaehrlich_wiederkehrend"?: true|false }
}

REGELN GEGEN HALLUZINATION (kritisch — befolge sie strikt):
- Wenn die Richtlinie KEINE Best-Practices, Reject-Gruende oder Vorbild-Formulierungen explizit nennt, gib leere Arrays zurueck. Erfinde NICHTS.
- bestPractices und vorbildFormulierungen MUESSEN aus dem gelieferten Volltext belegbar sein, NICHT aus Allgemeinwissen ueber Foerderverfahren.
- vorbildFormulierungen[].abschnitt_id MUSS exakt einer id aus antragsstruktur.abschnitte[].id im selben Output entsprechen.
- stichtage IMMER im Format YYYY-MM-DD. Wenn Richtlinie "10. April 2026" nennt, schreibe "2026-04-10". KEIN deutsches Format wie "10.04.2026".
- Maximal 5 Eintraege pro neuem Feld (bestPractices, rejectGruende, vorbildFormulierungen).
- Wenn unsicher: lieber leere Liste als Erfindung. Lieber kuerzer als halluziniert.

Nur valides JSON ausgeben, keine Markdown-Fences, keine Erklaerung davor/danach.`;

async function fetchOrRead(src: string): Promise<{ url: string; text: string }> {
  if (/^https?:\/\//.test(src)) {
    // Viele Bundesseiten (bmftr.bund.de, buendnisse-fuer-bildung.de) blocken
    // nicht-Browser-UA mit HTTP 403. Mit einem realistischen Browser-UA
    // funktionieren sie. Keine Umgehung einer Bot-Policy — die Seiten sind
    // oeffentlich, wir lesen nur Text.
    const res = await fetch(src, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de,en;q=0.8",
      },
    });
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

/**
 * Markiert Programme, bei denen die Extraktion wegen duenner Quelle leer blieb,
 * mit status="skip" + skipReason. Ohne das wuerde der naechste --next-Lauf
 * sofort wieder dasselbe Programm ziehen und endlos in einer Schleife stecken.
 *
 * Hinweis: Der Status-Union erlaubt nur "open"|"done"|"skip" — ein eigener
 * "blocked"-Status wurde bewusst nicht eingefuehrt, weil cmdNext/cmdList nur
 * `status === "open"` filtern und `skipReason` als Diagnose-Feld genuegt.
 */
async function markSkipInQueue(programmId: string, reason: string): Promise<void> {
  try {
    const q = await loadQueue();
    const item = q.items.find((i) => i.programmId === programmId);
    if (!item) return;
    item.status = "skip";
    item.skipReason = reason;
    await saveQueue(q);
    console.log(`    Queue: ${programmId} → status=skip (${reason.slice(0, 80)}…)`);
  } catch (err) {
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

  console.log("==> LLM-Extraktion laeuft (Provider: lib/wizard/llm.ts)");
  let parsed: Richtlinie;
  let llmUsage = { promptTokens: 0, candidatesTokens: 0 };
  try {
    const llmResult = await generateJson<Richtlinie>(
      MODEL_PIPELINE,
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 8000 }
    );
    parsed = llmResult.value;
    llmUsage = llmResult.usage;
  } catch (err) {
    console.error(
      `LLM-Aufruf fehlgeschlagen oder lieferte kein valides JSON: ${(err as Error).message}`
    );
    process.exit(3);
  }

  // Sanity-Check: Wenn die Quelle zu duenn war (Startseite, Fehler-Seite),
  // liefert Gemini ein leeres Schema zurueck. In dem Fall NICHT speichern
  // und NICHT als done markieren — sonst verschwindet das Programm aus der
  // Queue ohne verwertbares Dossier.
  const hatKosten = Array.isArray(parsed.kostenpositionen) && parsed.kostenpositionen.length > 0;
  const hatAbschnitte =
    Array.isArray(parsed.antragsstruktur?.abschnitte) &&
    parsed.antragsstruktur.abschnitte.length > 0;
  // Foerderhoehe nur als Substanz werten, wenn KONKRETE Zahl vorliegt.
  // Eine reine "bemerkung" reicht nicht — die kann Gemini selbst bei
  // Null-Content produzieren ("Im Text werden keine Angaben gemacht.").
  const hatFoerderhoehe =
    typeof parsed.foerderhoehe?.maxEur === "number" ||
    typeof parsed.foerderhoehe?.minEur === "number" ||
    typeof parsed.foerderhoehe?.maxProzentGesamtkosten === "number";
  const substanzOk = hatKosten || hatAbschnitte || hatFoerderhoehe;
  if (!substanzOk) {
    console.error(
      "FEHLER: Extrahiertes Dossier ist leer (keine Kostenpositionen, Antragsabschnitte, konkrete Foerderhoehe)."
    );
    console.error(
      `       Vermutlich zeigt der infoLink auf eine Startseite statt eine Richtlinie.`
    );
    const geminiNote =
      Array.isArray(parsed.notizen) && parsed.notizen.length
        ? String(parsed.notizen[0]).slice(0, 200)
        : "Quelle zu allgemein";
    console.error(`       Gemini-Notiz: ${geminiNote}`);
    const debugPath = path.join("/tmp", `edufunds-${programmId}.empty.debug.json`);
    await fs.writeFile(debugPath, JSON.stringify(parsed, null, 2) + "\n");
    console.error(`       Debug-Dump: ${debugPath}`);
    // Programm in der Queue auf skip, damit der naechste --next-Lauf nicht
    // in Endlosschleife dasselbe Programm zieht. Kolja kann es manuell auf
    // open zuruecksetzen, nachdem der infoLink in foerderprogramme.json
    // auf eine konkrete Richtlinie geaendert wurde.
    await markSkipInQueue(
      programmId,
      `Leere Extraktion: infoLink zu allgemein. Gemini-Note: ${geminiNote}`
    );
    process.exit(5);
  }

  parsed.quellen = quellen;
  // Version IMMER vom Skript setzen, nicht vom LLM. Verhindert, dass das
  // Beispiel-Datum aus dem SYSTEM_PROMPT in echten Dossiers landet.
  parsed.version = new Date().toISOString().slice(0, 10);

  // Runtime-Validierung gegen erweitertes Schema (Phase 3, FETCH-03).
  // Strict-Mode: alle 4 neuen Felder Pflicht. Bei Fehler: programmId-Status
  // nicht auf done setzen, Skript exit 1, Workflow-PR wird nicht erstellt
  // (CI-Step "Detect changes" findet kein Diff weil writeFile nicht passierte).
  const strictParse = RichtlinieStrictSchema.safeParse(parsed);
  if (!strictParse.success) {
    console.error(`==> Strict-Schema-Validierung fehlgeschlagen fuer ${programmId}:`);
    for (const issue of strictParse.error.issues) {
      console.error(`    ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  const fkIssues = validateForeignKeys(parsed as never, programmId);
  if (fkIssues.length > 0) {
    console.error(`==> FK-Verletzungen fuer ${programmId}:`);
    for (const issue of fkIssues) {
      console.error(`    ${issue.abschnitt_id}: ${issue.reason}`);
    }
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${programmId}.json`);
  await fs.writeFile(outPath, JSON.stringify(parsed, null, 2) + "\n");

  console.log(`==> Geschrieben: ${outPath}`);
  console.log(
    `    Tokens: ${llmUsage.promptTokens} in + ${llmUsage.candidatesTokens} out`
  );
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
