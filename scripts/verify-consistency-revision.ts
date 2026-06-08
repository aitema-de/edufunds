/**
 * Echte-Lauf-Verifikation der Konsistenz-Revisions-Stage (QA-01/03).
 * Faehrt runPipeline mit echtem DeepSeek fuer mehrere Szenarien und berichtet,
 * ob/wie viele Konsistenz-Issues nach der Revision verbleiben.
 *
 * Lauf:  npx tsx --env-file=.env.local scripts/verify-consistency-revision.ts
 * Braucht nur DEEPSEEK_API_KEY (keine DB).
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

const scenarios: Array<{ id: string; facts: WizardFacts; answers: string[] }> = [
  {
    id: "bmbf-digitalpakt-2",
    facts: {
      projekt: {
        titel: "Digitale Lerninfrastruktur Grundschule",
        kurzbeschreibung: "Anschaffung von Tablets und Fortbildung des Kollegiums.",
        ziele: ["Digitale Grundbildung staerken", "Lehrkraefte fortbilden"],
        zielgruppe: "240 Schuelerinnen und Schueler",
        aktivitaeten: ["Tablet-Einsatz im Unterricht", "interne Fortbildungstage"],
        zeitraum: "Schuljahr 2026/27",
      },
      wirkung: { erwartete_ergebnisse: ["hoehere Medienkompetenz"] },
      budget: { beantragt_eur: 41250, eigenmittel_eur: 13750, hauptposten: ["Tablets", "Lizenzen", "Fortbildung"] },
    },
    answers: [
      "Wir wollen 30 Tablets fuer je 450 Euro anschaffen, das sind 13.500 Euro.",
      "Dazu Lizenzen fuer eine Lernsoftware, etwa 4.800 Euro im Jahr.",
      "Die Schule bringt 13.750 Euro Eigenmittel ein, das sind 25 Prozent der Gesamtkosten.",
      "Zwei interne Fortbildungstage, Honorare haben wir noch nicht festgelegt.",
    ],
  },
  {
    id: "niedersachsen-sport",
    facts: {
      projekt: {
        titel: "Bewegte Grundschule",
        kurzbeschreibung: "Sport-AG mit Fokus auf Motorik.",
        ziele: ["Motorik foerdern"],
        zielgruppe: "60 Kinder der Klassen 1-4",
        aktivitaeten: ["woechentliche Sport-AG"],
      },
      budget: { beantragt_eur: 8000, eigenmittel_eur: 2000 },
    },
    answers: [
      "Wir moechten Sportgeraete fuer 5.000 Euro anschaffen.",
      "Eine Uebungsleiterin auf Honorarbasis, 3.000 Euro fuer das Schuljahr.",
      "Die Schule traegt 2.000 Euro Eigenanteil.",
    ],
  },
  {
    id: "aktion-mensch-schulkooperation",
    facts: {
      projekt: {
        titel: "Theater inklusiv",
        kurzbeschreibung: "Inklusives Theaterprojekt.",
        ziele: ["Teilhabe staerken"],
        zielgruppe: "gemischte Gruppe mit und ohne Behinderung",
        aktivitaeten: ["Theaterworkshops", "Auffuehrung"],
      },
      budget: { beantragt_eur: 19800, eigenmittel_eur: 2200 },
    },
    answers: [
      "Eine Theaterpaedagogin fuer 12.000 Euro ueber das Schuljahr.",
      "Material und Buehnenbild fuer 5.000 Euro.",
      "Fahrten zu zwei Auffuehrungsorten, etwa 2.800 Euro.",
      "Die Schule bringt 2.200 Euro Eigenmittel ein.",
    ],
  },
];

async function main() {
  const onlyId = process.argv[2];
  for (const s of scenarios) {
    if (onlyId && s.id !== onlyId) continue;
    const programm = programme.find((p) => p.id === s.id);
    if (!programm) {
      console.log(`SKIP ${s.id} — Programm nicht gefunden`);
      continue;
    }
    const richtlinie = await loadRichtlinie(s.id);
    console.log(`\n=== ${s.id} (${programm.name}) ===`);
    try {
      const { artefacts } = await runPipeline(programm, s.facts, richtlinie, undefined, msgs(s.answers));
      const fp = artefacts.finanzplan;
      const total = fp?.posten.reduce((a, p) => a + p.betragEur, 0) ?? 0;
      const eigen = fp?.posten.filter((p) => p.eigenanteil).reduce((a, p) => a + p.betragEur, 0) ?? 0;
      console.log(`  Finanzplan: ${fp?.posten.length ?? 0} Posten, Gesamt ${total} EUR, davon Eigenanteil ${eigen} EUR`);
      console.log(`  hasConsistencyIssues (final): ${Boolean(artefacts.hasConsistencyIssues)} (${artefacts.consistencyIssues?.length ?? 0})`);
      if (artefacts.consistencyIssues?.length) {
        for (const i of artefacts.consistencyIssues) console.log(`    - [${i.art}] ${i.beschreibung}`);
      }
      console.log(`  Antragstext-Laenge: ${artefacts.finalText?.length ?? 0} Zeichen`);
    } catch (e) {
      console.log(`  FEHLER: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main().then(() => process.exit(0));
