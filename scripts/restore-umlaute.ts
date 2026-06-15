/**
 * restore-umlaute.ts — Stellt korrekte deutsche Umlaute/ß in ASCII-kodierten
 * Anzeige-Textfeldern wieder her (Foerderung -> Förderung, Hoehe -> Höhe, ...).
 *
 * Sicherheit: Die LLM darf AUSSCHLIESSLICH Umlaute/ß setzen. Jede Ausgabe wird
 * gegen das Original gefaltet (ä->ae, ö->oe, ü->ue, ß->ss). Nur wenn
 * fold(Ausgabe) === Original, wird sie uebernommen — sonst bleibt das Original
 * unveraendert. Damit kann kein Inhalt driften (keine Umformulierung, kein
 * Wegfall, keine Halluzination).
 *
 * Aufruf:
 *   npx tsx --env-file=.env.local scripts/restore-umlaute.ts            # foerderprogramme.json
 *   npx tsx --env-file=.env.local scripts/restore-umlaute.ts --dry-run  # nur anzeigen
 *   npx tsx --env-file=.env.local scripts/restore-umlaute.ts --richtlinien  # Dossiers
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const DRY = process.argv.includes("--dry-run");
const MODE_RL = process.argv.includes("--richtlinien");
const ROOT = process.cwd();

// Felder in foerderprogramme.json, die im UI sichtbar sind (freie Prosa/Labels).
const PROGRAMM_FIELDS = [
  "name",
  "foerdergeber",
  "foerdersummeText",
  "bewerbungsfristText",
  "kurzbeschreibung",
  "bemerkung",
];

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});
const MODEL = "deepseek-chat";

function fold(s: string): string {
  // Case-insensitiv, damit Grossschreibung von Umlauten (z.B. "GRÜN" vs
  // Original "GRUEN") nicht faelschlich als Drift gewertet wird.
  return s
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

/** Kann dieses Feld ueberhaupt einen Umlaut bekommen? (ae/oe/ue/ss-Sequenz vorhanden) */
function hasCandidate(s: string): boolean {
  return /ae|oe|ue|ss|Ae|Oe|Ue|Ss|AE|OE|UE|SS/.test(s);
}

const SYSTEM =
  "Du bist ein praeziser deutscher Korrektor. Du bekommst ein JSON-Objekt mit deutschen Texten, " +
  "in denen Umlaute als ae/oe/ue und das scharfe S als ss geschrieben sind. " +
  "Stelle die KORREKTE deutsche Schreibweise mit ä/ö/ü/ä/Ö/Ü/ß wieder her. " +
  "WICHTIG: Aendere AUSSCHLIESSLICH Umlaute und ß. Behalte JEDES andere Zeichen exakt bei " +
  "(Wortwahl, Reihenfolge, Satzzeichen, Zahlen, E-Mail-Adressen, URLs, Klammern, Anfuehrungszeichen). " +
  "Wandle NICHT um, wo Deutsch kein Umlaut/ß hat: z.B. Quelle, aktuelle, neue, individuelle, Steuer, " +
  "Abenteuer, Klasse, Adresse, Interesse, wissen, dass, muss, Kongress, Prozess, Adressaten bleiben unveraendert. " +
  "Fasse AUSSERDEM nichts anderes an: KEINE Tippfehler korrigieren, KEINE Leerzeichen einfuegen oder entfernen, " +
  "KEINE Akzente setzen (kein à/á/é), KEINE Woerter ersetzen. Nur ae/oe/ue/ss -> ä/ö/ü/ß, wo Deutsch es verlangt. " +
  'Antworte NUR mit dem JSON-Objekt gleicher Schluessel, z.B. {"0":"Förderung","1":"Höhe"}.';

async function restoreBatch(texts: Record<string, string>): Promise<Record<string, string>> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(texts) },
    ],
    response_format: { type: "json_object" },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Record<string, string>;
}

interface Job {
  setter: (val: string) => void;
  original: string;
}

async function processJobs(jobs: Job[]): Promise<{ changed: number; rejected: number }> {
  let changed = 0;
  let rejected = 0;
  const BATCH = 12;
  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH);
    const payload: Record<string, string> = {};
    slice.forEach((j, k) => (payload[String(k)] = j.original));
    let out: Record<string, string> = {};
    try {
      out = await restoreBatch(payload);
    } catch (e) {
      console.warn(`  Batch ${i}-${i + slice.length} fehlgeschlagen, ueberspringe:`, (e as Error).message);
      continue;
    }
    slice.forEach((j, k) => {
      const cand = out[String(k)];
      if (typeof cand !== "string") return;
      if (cand === j.original) return; // keine Aenderung
      // Invariante: beide muessen auf dasselbe ASCII-Skelett falten. So werden
      // bereits teil-umgelautete Originale korrekt behandelt und echte
      // Wort-/Inhaltsaenderungen (z.B. landes->laender) weiter abgelehnt.
      if (fold(cand) !== fold(j.original)) {
        rejected++;
        console.warn(`  ✗ ABGELEHNT (Drift): "${j.original.slice(0, 60)}..." -> "${cand.slice(0, 60)}..."`);
        return;
      }
      if (!DRY) j.setter(cand);
      changed++;
    });
    process.stdout.write(`\r  ${Math.min(i + BATCH, jobs.length)}/${jobs.length} Felder verarbeitet, ${changed} geändert, ${rejected} abgelehnt   `);
  }
  process.stdout.write("\n");
  return { changed, rejected };
}

async function runProgramme() {
  const file = path.join(ROOT, "data/foerderprogramme.json");
  const arr = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>[];
  const jobs: Job[] = [];
  for (const p of arr) {
    for (const f of PROGRAMM_FIELDS) {
      const v = p[f];
      if (typeof v === "string" && v && hasCandidate(v)) {
        jobs.push({ original: v, setter: (val) => (p[f] = val) });
      }
    }
  }
  console.log(`foerderprogramme.json: ${arr.length} Programme, ${jobs.length} Felder mit Umlaut-Kandidaten.`);
  const { changed, rejected } = await processJobs(jobs);
  if (!DRY) {
    await fs.writeFile(file, JSON.stringify(arr, null, 2) + "\n", "utf8");
    console.log(`✓ Geschrieben: ${changed} Felder geändert (${rejected} abgelehnt).`);
  } else {
    console.log(`[DRY] ${changed} Felder würden geändert (${rejected} abgelehnt).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function main() {
  if (MODE_RL) {
    await runRichtlinien();
  } else {
    await runProgramme();
  }
}

// --- Dossiers (data/richtlinien/*.json): rekursiv alle String-Werte ---
async function runRichtlinien() {
  const dir = path.join(ROOT, "data/richtlinien");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  console.log(`data/richtlinien: ${files.length} Dossiers.`);
  let totalChanged = 0;
  let totalRejected = 0;
  for (const fname of files) {
    const file = path.join(dir, fname);
    const obj = JSON.parse(await fs.readFile(file, "utf8"));
    const jobs: Job[] = [];
    collectStringJobs(obj, jobs);
    if (jobs.length === 0) continue;
    const { changed, rejected } = await processJobs(jobs);
    totalChanged += changed;
    totalRejected += rejected;
    if (!DRY && changed > 0) {
      await fs.writeFile(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
    }
    console.log(`  ${fname}: ${changed} geändert, ${rejected} abgelehnt`);
  }
  console.log(`✓ Dossiers gesamt: ${totalChanged} geändert, ${totalRejected} abgelehnt.`);
}

function collectStringJobs(node: unknown, jobs: Job[]): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string" && v && hasCandidate(v)) {
        jobs.push({ original: v, setter: (val) => (node[i] = val) });
      } else {
        collectStringJobs(v, jobs);
      }
    });
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === "string" && v && hasCandidate(v)) {
        jobs.push({ original: v, setter: (val) => (obj[key] = val) });
      } else {
        collectStringJobs(v, jobs);
      }
    }
  }
}
