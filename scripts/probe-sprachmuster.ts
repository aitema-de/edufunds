/**
 * Deterministische Sprach-Probe über einen Snapshot-Ordner (kein LLM, kein Judge).
 *
 * WARUM ES DAS GIBT
 * -----------------
 * Paket 5 aus Tester-Feedback #008 greift zwei Sprachmuster an, die der Tester
 * benannt und die die Messung über 75 Baseline-Anträge bestätigt hat:
 *
 *   1. Evidenz-Rhetorik ohne Quelle ("nachweislich", "Studien zeigen") —
 *      80 Treffer in 32 von 75 Anträgen.
 *   2. Das Schachtel-Muster "Aussage, weil Begründung — daher Folge" in EINEM
 *      Satz — 259 Sätze in 41 von 75 Anträgen; 16,3 % aller Sätze sind länger
 *      als 300 Zeichen, der längste 1.580.
 *
 * Der Judge-Eval misst Qualität als Ganzes und schwankt; diese Probe zählt die
 * beiden Muster exakt. Beide Zahlen nebeneinander sagen mehr als jede allein:
 * Sinkt die Musterzahl, ohne dass der Judge-Wert fällt, hat die Direktive
 * gewirkt, ohne Substanz zu kosten.
 *
 * 🚫 Gemessen wird der BEREINIGTE Text — der, den der Nutzer liest. Ein
 * "[Annahme: … .]"-Marker enthält Satzzeichen und blähte die Satzlänge sonst
 * künstlich auf (ungefiltert gemessen: 25,6 % statt 16,3 %).
 *
 * Aufruf:
 *   npx tsx scripts/probe-sprachmuster.ts [--dir=data/eval/pipeline-snapshots/<ISO>]
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { bereinigeAntragstext } from "../lib/wizard/offene-punkte";

const DEFAULT_DIR = "data/eval/pipeline-snapshots/baseline";
const LANG_SCHWELLE = 300;

/** Behauptungen über einen Forschungsstand, den niemand belegt hat. */
const EVIDENZ_MUSTER: Array<[string, RegExp]> = [
  ["nachweislich", /\bnachweislich\b/gi],
  ["Studien zeigen/belegen", /\bStudien\s+(zeigen|belegen|weisen)/gi],
  ["Untersuchungen/Forschung zeigen", /\b(Untersuchungen|Forschung(sergebnisse)?)\s+(zeigen|belegen)/gi],
  ["wissenschaftlich erwiesen/fundiert", /\bwissenschaftlich\s+(erwiesen|belegt|fundiert)/gi],
  ["erwiesenermaßen", /\berwiesenerma(ß|ss)en\b/gi],
  ["empirisch belegt", /\bempirisch\s+(belegt|erwiesen)/gi],
  ["es ist belegt", /\bes\s+ist\s+belegt\b/gi],
  ["bekanntlich", /\bbekanntlich\b/gi],
];

/** Grobe Satztrennung auf dem Fließtext (Überschriften und Listen bleiben aussen vor). */
function saetze(text: string): string[] {
  const fliess = text
    .split("\n")
    .filter((z) => !/^\s*(#|[-*]\s|\|)/.test(z))
    .join(" ");
  return fliess
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

/** Begründung UND Folge im selben Satz, verbunden mit einem Gedankenstrich. */
function istSchachtelsatz(s: string): boolean {
  return (
    /\b(weil|da|denn)\b/i.test(s) &&
    /[—–]/.test(s) &&
    /\b(daher|dadurch|somit|folglich|so dass|sodass)\b/i.test(s)
  );
}

export interface SprachBefund {
  antraege: number;
  saetze: number;
  ueberSchwelle: number;
  anteilUeberSchwelle: number;
  laengsterSatz: number;
  evidenzTreffer: number;
  evidenzAntraege: number;
  evidenzNachMuster: Record<string, number>;
  schachtelsaetze: number;
  schachtelAntraege: number;
}

export function probeVerzeichnis(dir: string): SprachBefund {
  const evidenzNachMuster: Record<string, number> = {};
  let antraege = 0, alleSaetze = 0, ueberSchwelle = 0, laengsterSatz = 0;
  let evidenzTreffer = 0, schachtelsaetze = 0;
  const evidenzAntraege = new Set<string>();
  const schachtelAntraege = new Set<string>();

  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const roh: string = d?.result?.artefacts?.finalText ?? "";
    if (!roh) continue;
    const text = bereinigeAntragstext(roh);
    antraege++;

    for (const [name, re] of EVIDENZ_MUSTER) {
      const n = [...text.matchAll(re)].length;
      if (n === 0) continue;
      evidenzNachMuster[name] = (evidenzNachMuster[name] ?? 0) + n;
      evidenzTreffer += n;
      evidenzAntraege.add(f);
    }

    for (const s of saetze(text)) {
      alleSaetze++;
      if (s.length > LANG_SCHWELLE) ueberSchwelle++;
      if (s.length > laengsterSatz) laengsterSatz = s.length;
      if (istSchachtelsatz(s)) {
        schachtelsaetze++;
        schachtelAntraege.add(f);
      }
    }
  }

  return {
    antraege,
    saetze: alleSaetze,
    ueberSchwelle,
    anteilUeberSchwelle: alleSaetze > 0 ? (ueberSchwelle / alleSaetze) * 100 : 0,
    laengsterSatz,
    evidenzTreffer,
    evidenzAntraege: evidenzAntraege.size,
    evidenzNachMuster,
    schachtelsaetze,
    schachtelAntraege: schachtelAntraege.size,
  };
}

function main(): void {
  const arg = process.argv.slice(2).find((a) => a.startsWith("--dir="));
  const dir = arg ? arg.slice("--dir=".length) : DEFAULT_DIR;
  const b = probeVerzeichnis(dir);

  console.log(`[probe-sprachmuster] ${dir}`);
  console.log(`  Anträge: ${b.antraege} · Sätze: ${b.saetze}`);
  console.log(
    `  Sätze über ${LANG_SCHWELLE} Zeichen: ${b.ueberSchwelle} (${b.anteilUeberSchwelle.toFixed(1)} %) · längster: ${b.laengsterSatz}`
  );
  console.log(
    `  Evidenz-Rhetorik ohne Quelle: ${b.evidenzTreffer} Treffer in ${b.evidenzAntraege}/${b.antraege} Anträgen`
  );
  for (const [name, n] of Object.entries(b.evidenzNachMuster).sort((a, c) => c[1] - a[1])) {
    console.log(`      ${String(n).padStart(3)}× ${name}`);
  }
  console.log(
    `  Schachtelsätze "weil … — daher": ${b.schachtelsaetze} in ${b.schachtelAntraege}/${b.antraege} Anträgen`
  );
  console.log(
    `\n  Referenz Baseline (75 Anträge, Stand 20.08.2026): 16,3 % über ${LANG_SCHWELLE} Zeichen,` +
      ` längster 1.580, 80 Evidenz-Treffer in 32 Anträgen, 259 Schachtelsätze in 41 Anträgen.`
  );
}

// Nur ausfuehren, wenn direkt als Skript gestartet (nicht bei import in Tests).
const isMainModule =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] === __filename;
if (isMainModule) main();
