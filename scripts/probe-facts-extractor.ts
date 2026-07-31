/**
 * Probe: Was holt `extractFacts` aus einem fertigen Interview heraus?
 *
 * ANLASS (31.07.2026)
 * -------------------
 * Der simulierte Nutzer (scripts/eval-simuser.ts) hat als Erstes eine Luecke
 * sichtbar gemacht, die jahrelang keine Messung beruehrt hat: `data/eval/pipeline-korpus.json`
 * uebergibt der Pipeline **handgeschriebene** Fakten. Die Extraktions-Stage lag damit
 * ausserhalb jeder Eval — gemessen wurde immer nur, was die Pipeline aus bereits
 * sauberen Fakten macht.
 *
 * Der erste Lauf gegen die echten Routen zeigte: 12 von 25 Interviews endeten mit einer
 * Faktentabelle, die ausser dem eingespeisten Schulprofil NICHTS enthielt — nach zehn
 * und mehr beantworteten Fragen. Diese Probe pruefte daraufhin die Gegenrichtung und
 * nahm dem Verdacht die letzte Ausrede: sie laesft `extractFacts` ueber die
 * HANDAUTORISIERTEN Korpus-Antworten, also ueber genau die Texte, aus denen die
 * Korpus-Fakten von Hand geschrieben wurden.
 *
 * Ergebnis: **23 von 25 Interviews ergaben null Slots** (nur `schule`, und das war der
 * Seed). Auch alle fuenf `hochwertig`-Faelle mit konkreten Zahlen, Namen und Zeitangaben.
 * Es war also kein Vagheits-, sondern ein Extraktionsproblem.
 *
 * WARUM DAS SO SCHWER WOG
 * -----------------------
 * `facts` speist alles Weitere: den Themencluster- und Tiefen-Block des Interviewers
 * (prompts.ts), die Bezahl-Schranke (facts-readiness.ts) und die gesamte Generierung
 * (pipeline.ts). Eine leere Tabelle heisst: der Interviewer fragt blind und wiederholt
 * sich, die Schranke meldet Luecken, die der Nutzer laengst gefuellt hat, und der Antrag
 * entsteht aus dem Rohverlauf statt aus geordneten Fakten.
 *
 * URSACHE UND STAND NACH DER REPARATUR (31.07.2026)
 * ------------------------------------------------
 * Zwei Fehler im Prompt, beide in `FACTS_EXTRACTOR_SYSTEM`:
 *   1. Die Regel "Wenn ein Slot bereits gefuellt ist ... lasse den Slot weg" widersprach der
 *      Merge-Semantik, deren Kommentar die Liste des Extraktors ausdruecklich als autoritativ
 *      bezeichnet. Da die Stage nach JEDER Antwort erneut laeuft, las das Modell "nichts
 *      Neues" und gab `{}` zurueck.
 *   2. Der Prompt bestand ueberwiegend aus Verboten (sieben Halluzinations-Regeln, zwei
 *      Negativbeispiele, "Im Zweifel: Slot leer lassen", "Bei NICHTS gefunden: {}") ohne ein
 *      einziges Positivbeispiel. Ein kleines Modell loest das zur sichersten Handlung auf.
 * Dazu lief die Stage auf der Default-Temperatur des Anbieters und lieferte fuer denselben
 * Verlauf mal Fakten, mal nichts.
 *
 *   | | vorher | nachher |
 *   |---|---|---|
 *   | Interviews mit mindestens einem Slot | 2/25 | **23/25** |
 *   | davon `hochwertig` | 0/5 | **5/5** |
 *   | Interviews mit erfundenen Zahlen | — | **0/25** |
 *
 * Die Spalte "Erf" ist die Gegenprobe: ein Prompt, der zum Extrahieren ermutigt, koennte in
 * die andere Richtung kippen. Abdeckung ohne Treue waere wertlos, deshalb faellt die Probe
 * auch bei einer einzigen erfundenen Zahl durch.
 *
 * Diese Datei stellt fest, sie repariert nicht — wer die Extraktion anfasst, hat damit ein
 * Vorher/Nachher in einer Minute.
 *
 * LAUF
 * ----
 *   npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts
 *   npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts --only=pv-004,pv-011
 *   npx tsx --env-file=.env.local scripts/probe-facts-extractor.ts --lauf vorher
 *
 * Flags:
 *   --only=id,id   nur diese Korpus-IDs
 *   --limit=<n>    nur die ersten n
 *   --lauf <label> statt der Korpus-Antworten die Antworten eines simuser-Laufs nehmen
 *   --zeige <id>   die rohen Extraktor-Fakten dieses Eintrags ausgeben
 *
 * Exit-Codes: 0 = ueber 50 % der Interviews liefern Slots UND keine erfundenen Zahlen ·
 *              1 = eine der beiden Bedingungen verletzt · 2 = Setup-Fehler.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { extractFacts } from "../lib/wizard/facts-extractor";
import { zahlAngaben, zahlKern } from "../lib/wizard/facts-tiefe";
import type { WizardFacts, WizardMessage } from "../lib/wizard/types";

const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/pipeline-korpus.json");
const RUNS_DIR = resolve(REPO, "data/eval/simuser-runs");
const LOG = "[extraktor-probe]";

/** Die vier Slots, die der Korpus von Hand fuellt — der Massstab dieser Probe. */
const SLOTS = ["projekt", "wirkung", "budget", "programmpassung"] as const;

interface Fall {
  id: string;
  kategorie: string;
  seed: Record<string, unknown>;
  messages: WizardMessage[];
  /** Wie viele der vier Slots der Korpus von Hand befuellt hat. */
  handSlots: number;
}

function alsMessages(roh: Array<{ role: string; kind?: string; content: string }>): WizardMessage[] {
  return roh.map((m, i) => ({
    id: String(i),
    role: m.role as "ai" | "user",
    kind: (m.kind ?? (m.role === "ai" ? "question" : "answer")) as WizardMessage["kind"],
    content: m.content,
    at: new Date(0).toISOString(),
  }));
}

/**
 * Zahlangaben in den extrahierten Fakten, die in keiner Nutzerantwort vorkommen.
 *
 * Die Gegenprobe zur Abdeckung: ein Prompt, der zum Extrahieren ermutigt, kann in die
 * andere Richtung kippen und Zahlen erfinden. Beides zusammen ergibt erst eine Aussage —
 * eine hohe Slot-Quote allein waere auch mit Halluzinationen zu erreichen.
 *
 * Jahreszahlen bleiben aussen vor (siehe zahlAngaben), ebenso Werte unter 10: die sind
 * Alltagssprache ("drei Kolleginnen") und entstehen beim Umformulieren, nicht als
 * erfundene Tatsache.
 */
function erfundeneZahlen(facts: WizardFacts, messages: WizardMessage[]): string[] {
  const quelle = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  const belegt = new Set(
    zahlAngaben(quelle).map(zahlKern).filter((n): n is number => n !== null)
  );
  // Der Seed (schule) kommt aus dem Schulprofil, nicht aus den Antworten — sonst
  // meldete die Probe die Schuelerzahl aus dem Profil als Erfindung.
  const ohneSeed = { ...facts } as Record<string, unknown>;
  delete ohneSeed.schule;
  const gefunden = zahlAngaben(JSON.stringify(ohneSeed))
    .map(zahlKern)
    .filter((n): n is number => n !== null && n >= 10)
    .filter((n) => !belegt.has(n));
  return [...new Set(gefunden)].map(String);
}

function gefuellteSlots(f: WizardFacts): string[] {
  return SLOTS.filter((s) => {
    const v = f?.[s];
    if (!v || typeof v !== "object") return false;
    return Object.values(v as Record<string, unknown>).some((x) => {
      if (x == null || x === "") return false;
      if (Array.isArray(x)) return x.length > 0;
      return true;
    });
  });
}

async function ladeFaelle(laufLabel: string | null): Promise<Fall[]> {
  const korpus = JSON.parse(await readFile(KORPUS_PATH, "utf8")) as Array<{
    id: string;
    category: string;
    schulProfil: Record<string, unknown>;
    userAnswers: Array<{ role: string; kind?: string; content: string }>;
    facts: WizardFacts;
  }>;
  const handSlots = new Map(korpus.map((e) => [e.id, gefuellteSlots(e.facts).length]));

  if (!laufLabel) {
    return korpus.map((e) => ({
      id: e.id,
      kategorie: e.category,
      seed: e.schulProfil,
      messages: alsMessages(e.userAnswers),
      handSlots: handSlots.get(e.id) ?? 0,
    }));
  }

  const dir = resolve(RUNS_DIR, laufLabel);
  if (!existsSync(dir)) {
    console.error(`${LOG} Lauf "${laufLabel}" nicht gefunden: ${dir}`);
    process.exit(2);
  }
  const dateien = (await readdir(dir)).filter((d) => d.endsWith(".json") && !d.startsWith("_"));
  const faelle: Fall[] = [];
  for (const d of dateien) {
    const r = JSON.parse(await readFile(resolve(dir, d), "utf8"));
    if (r.fehler || !r.messages?.length) continue;
    faelle.push({
      id: r.id,
      kategorie: r.kategorie,
      seed: (r.facts?.schule as Record<string, unknown>) ?? {},
      messages: alsMessages(r.messages),
      handSlots: handSlots.get(r.id) ?? 0,
    });
  }
  return faelle.sort((a, b) => a.id.localeCompare(b.id));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let only: string[] | null = null;
  let limit: number | null = null;
  let lauf: string | null = null;
  let zeige: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--only=")) only = a.slice(7).split(",");
    else if (a.startsWith("--limit=")) limit = Number(a.slice(8));
    else if (a === "--lauf") lauf = argv[++i];
    else if (a === "--zeige") zeige = argv[++i];
    else {
      console.error(`${LOG} unbekanntes Flag: ${a}`);
      process.exit(2);
    }
  }

  let faelle = await ladeFaelle(lauf);
  if (only) faelle = faelle.filter((f) => only!.includes(f.id));
  if (limit) faelle = faelle.slice(0, limit);
  if (!faelle.length) {
    console.error(`${LOG} keine Faelle ausgewaehlt.`);
    process.exit(2);
  }

  console.log(
    `${LOG} Quelle: ${lauf ? `simuser-Lauf "${lauf}"` : "handautorisierte Korpus-Antworten"} · ${faelle.length} Interviews\n`
  );
  console.log(`${"ID".padEnd(12)} ${"Kategorie".padEnd(11)} ${"Antw".padStart(4)} ${"Hand".padStart(4)} ${"Extr".padStart(4)} ${"Erf".padStart(4)}  Slots`);

  let mitSlots = 0;
  let mitErfindung = 0;
  const alleErfindungen: string[] = [];
  const proKategorie: Record<string, { n: number; mitSlots: number }> = {};

  for (const f of faelle) {
    const antworten = f.messages.filter((m) => m.role === "user").length;
    let slots: string[] = [];
    let erfunden: string[] = [];
    let fehler: string | null = null;
    try {
      const r = await extractFacts(f.messages, { schule: f.seed } as WizardFacts);
      slots = gefuellteSlots(r.facts);
      erfunden = erfundeneZahlen(r.facts, f.messages);
      if (zeige === f.id) {
        console.log(`\n${LOG} Rohausgabe fuer ${f.id}:\n${JSON.stringify(r.facts, null, 1)}\n`);
      }
    } catch (e) {
      fehler = e instanceof Error ? e.message : String(e);
    }
    if (slots.length > 0) mitSlots++;
    if (erfunden.length > 0) {
      mitErfindung++;
      alleErfindungen.push(`${f.id}: ${erfunden.join(", ")}`);
    }
    const k = (proKategorie[f.kategorie] ??= { n: 0, mitSlots: 0 });
    k.n++;
    if (slots.length > 0) k.mitSlots++;

    console.log(
      `${f.id.padEnd(12)} ${f.kategorie.padEnd(11)} ${String(antworten).padStart(4)} ${String(f.handSlots).padStart(4)} ${String(slots.length).padStart(4)} ${String(erfunden.length).padStart(4)}  ${fehler ? `FEHLER: ${fehler.slice(0, 60)}` : slots.join(", ") || "—"}`
    );
  }

  const quote = mitSlots / faelle.length;
  console.log(`\n${LOG} ===== Ergebnis =====`);
  console.log(`${LOG}   Interviews mit mindestens einem Slot: ${mitSlots}/${faelle.length} (${(quote * 100).toFixed(0)} %)`);
  for (const [k, v] of Object.entries(proKategorie).sort()) {
    console.log(`${LOG}     ${k.padEnd(12)} ${v.mitSlots}/${v.n}`);
  }
  console.log(
    `${LOG}   Interviews mit erfundenen Zahlen ("Erf"): ${mitErfindung}/${faelle.length}`
  );
  for (const x of alleErfindungen) console.log(`${LOG}     ${x}`);
  console.log(
    `${LOG}   Spalte "Hand" = Slots, die der Korpus fuer denselben Fall von Hand fuellt.` +
      ` Der Abstand zu "Extr" ist der Befund. "Erf" muss 0 bleiben — eine hohe Slot-Quote` +
      ` waere sonst auch mit Halluzinationen zu erreichen.`
  );

  if (mitErfindung > 0) {
    console.error(
      `\n${LOG} ${mitErfindung} Interview(s) enthalten Zahlen, die in keiner Antwort stehen.` +
        ` Abdeckung ohne Treue ist wertlos — die Pipeline darf nichts erfinden (WIZ-02).`
    );
    process.exit(1);
  }
  if (quote < 0.5) {
    console.error(
      `\n${LOG} Weniger als die Haelfte der Interviews liefert ueberhaupt Fakten. Alles, was auf` +
        ` \`facts\` aufbaut — Interviewer-Steuerung, Bezahl-Schranke, Generierung — arbeitet` +
        ` dann auf einer weitgehend leeren Tabelle.`
    );
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] && /probe-facts-extractor\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(`${LOG} Abbruch:`, e);
    process.exit(2);
  });
}
