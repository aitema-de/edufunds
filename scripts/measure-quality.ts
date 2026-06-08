/**
 * Misst QA-02/04/05-Metriken über echte Pipeline-Läufe — für Vorher/Nachher-
 * Vergleich der Prompt-Schärfungen.
 *
 * Lauf:  npx tsx --env-file=.env.local scripts/measure-quality.ts [label]
 * Braucht nur DEEPSEEK_API_KEY.
 *
 * Metriken (kleiner = besser):
 *  - QA02_hedgePosten: Finanzplan-Posten, deren Begründung Schätz-/Annahme-Sprache enthält (erfundene Beträge).
 *  - QA04_maxOverlap:  maximale 5-Wort-Shingle-Überlappung (Jaccard) zwischen zwei Abschnitten (Wiederholung).
 *  - QA05_textMarker:  Treffer typischer Halluzinations-Marker im finalen Antragstext.
 *  - consIssues:       verbleibende Konsistenz-Issues (sollte 0 bleiben).
 */
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import foerderprogramme from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts, WizardMessage } from "@/lib/wizard/types";

const programme = foerderprogramme as Foerderprogramm[];

function msgs(answers: string[]): WizardMessage[] {
  const out: WizardMessage[] = [];
  answers.forEach((a, i) => {
    out.push({ id: `q${i}`, at: "t", role: "ai", kind: "question", content: `Frage ${i + 1}` });
    out.push({ id: `a${i}`, at: "t", role: "user", kind: "answer", content: a });
  });
  return out;
}

const HEDGE = /gesch[aä]tzt|\bca\.|pauschal|angenommen|auf basis|[uü]blich|orientiert sich|annahme|kalkuliert mit/i;
const MARKERS = [/TV-?L\s?E?\d/i, /TV[oö]D/i, /Az\.?\s*\d/i, /\bKMK\b/, /Gesundheitsamt/i, /Willkommensklasse/i, /\bMDM\b/, /\bQ[1-4]\/20\d\d/];

function norm(s: string): string[] {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2);
}
function shingles(s: string, n = 5): Set<string> {
  const w = norm(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const scenarios: Array<{ id: string; facts: WizardFacts; answers: string[] }> = [
  {
    id: "bmbf-digitalpakt-2",
    facts: {
      projekt: { titel: "Digitale Lerninfrastruktur Grundschule", kurzbeschreibung: "Tablets und Fortbildung.", ziele: ["Digitale Grundbildung"], zielgruppe: "240 SuS", aktivitaeten: ["Tablet-Einsatz", "Fortbildungstage"], zeitraum: "2026/27" },
      budget: { beantragt_eur: 41250, eigenmittel_eur: 13750, hauptposten: ["Tablets", "Lizenzen", "Fortbildung"] },
    },
    answers: ["30 Tablets fuer je 450 Euro, also 13.500 Euro.", "Lizenzen fuer Lernsoftware, etwa 4.800 Euro im Jahr.", "Die Schule bringt 13.750 Euro Eigenmittel ein.", "Zwei interne Fortbildungstage, Honorare noch nicht festgelegt."],
  },
  {
    id: "niedersachsen-sport",
    facts: {
      projekt: { titel: "Bewegte Grundschule", kurzbeschreibung: "Sport-AG Motorik.", ziele: ["Motorik"], zielgruppe: "60 Kinder", aktivitaeten: ["Sport-AG"] },
      budget: { beantragt_eur: 8000, eigenmittel_eur: 2000 },
    },
    answers: ["Sportgeraete fuer 5.000 Euro.", "Uebungsleiterin auf Honorarbasis, 3.000 Euro fuer das Schuljahr.", "Die Schule traegt 2.000 Euro Eigenanteil."],
  },
  {
    id: "aktion-mensch-schulkooperation",
    facts: {
      projekt: { titel: "Theater inklusiv", kurzbeschreibung: "Inklusives Theater.", ziele: ["Teilhabe"], zielgruppe: "gemischte Gruppe", aktivitaeten: ["Workshops", "Auffuehrung"] },
      budget: { beantragt_eur: 19800, eigenmittel_eur: 2200 },
    },
    answers: ["Theaterpaedagogin fuer 12.000 Euro.", "Material und Buehnenbild fuer 5.000 Euro.", "Fahrten, etwa 2.800 Euro.", "Die Schule bringt 2.200 Euro Eigenmittel ein."],
  },
];

async function main() {
  const label = process.argv[2] ?? "run";
  const onlyId = process.argv[3];
  for (const s of scenarios) {
    if (onlyId && s.id !== onlyId) continue;
    const programm = programme.find((p) => p.id === s.id);
    if (!programm) continue;
    const richtlinie = await loadRichtlinie(s.id);
    try {
      const { artefacts } = await runPipeline(programm, s.facts, richtlinie, undefined, msgs(s.answers));
      const posten = artefacts.finanzplan?.posten ?? [];
      const hedge = posten.filter((p) => p.begruendung && HEDGE.test(p.begruendung)).length;
      const secs = (artefacts.sections ?? []).map((x) => x.text);
      let maxOverlap = 0;
      for (let i = 0; i < secs.length; i++)
        for (let j = i + 1; j < secs.length; j++)
          maxOverlap = Math.max(maxOverlap, jaccard(shingles(secs[i]), shingles(secs[j])));
      const text = artefacts.finalText ?? "";
      const markerHits = MARKERS.reduce((a, r) => a + (r.test(text) ? 1 : 0), 0);
      const cons = artefacts.consistencyIssues?.length ?? 0;
      const estHinweise = (artefacts.finanzplan?.hinweise ?? []).filter((h) => /ist gesch[aä]tzt/i.test(h));
      console.log(
        `[${label}] ${s.id}: QA02_hedgePosten=${hedge}/${posten.length} QA02_warnHinweise=${estHinweise.length} QA04_maxOverlap=${maxOverlap.toFixed(3)} QA05_textMarker=${markerHits} consIssues=${cons}`
      );
      for (const h of estHinweise) console.log(`    Hinweis: ${h}`);
    } catch (e) {
      console.log(`[${label}] ${s.id}: FEHLER ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main().then(() => process.exit(0));
