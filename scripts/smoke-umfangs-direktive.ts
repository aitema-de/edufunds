/**
 * A/B-Smoke fuer die Umfangs-Direktive (22.07.2026).
 *
 * Frage: Aendert die neue ZIEL-UMFANG-Direktive (maxZeichen -> 70-90%-Korridor
 * + Begruendungs-Auftrag) tatsaechlich Laenge und Theorie-Anteil des erzeugten
 * Abschnitts — oder bleibt der Median bei ~800 Zeichen kleben?
 *
 * A = Abschnitt OHNE maxZeichen  (reproduziert das Verhalten vor der Aenderung:
 *     die Direktive ist der EINZIGE Unterschied im Prompt)
 * B = Abschnitt MIT maxZeichen 5000 (hessen-esf-praxis, paedagogisches-konzept)
 *
 * Aufruf: npx tsx --env-file=.env.local scripts/smoke-umfangs-direktive.ts
 * Kosten: 2 LLM-Calls (mistral-small) — Centbetrag.
 */

import * as fs from "fs";
import { buildSectionPrompt, SECTION_SYSTEM } from "../lib/wizard/prompts";
import { generateText, MODEL_PIPELINE } from "../lib/wizard/llm";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";
import type { Foerderprogramm } from "../lib/foerderSchema";

const THEORIE =
  /Selbstwirksamkeit|Bildungsgerechtigkeit|Teilhabe|partizipativ|handlungsorientiert|BNE|demokratiepädagog|Resilienz|Wirkungslogik|Sozialraum|Lebenswelt|Peer|Empowerment|Inklusion|Chancengerechtigkeit|Kompetenzorientier|Berufsorientierung(?:stheorie)?|Praxislernen|Produktionsschul/gi;

async function main() {
  const katalog: Foerderprogramm[] = JSON.parse(
    fs.readFileSync("data/foerderprogramme.json", "utf-8")
  );
  const programm = katalog.find((p) => p.id === "hessen-esf-praxis")!;
  const richtlinie: Richtlinie = JSON.parse(
    fs.readFileSync("data/richtlinien/hessen-esf-praxis.json", "utf-8")
  );
  const abschnitt = richtlinie.antragsstruktur!.abschnitte.find(
    (a) => a.id === "pädagogisches-konzept"
  )!;

  // Kompakte, plausible Fakten — bewusst duennes Input-Niveau (wie im Eval-Korpus),
  // damit der Vergleich den Direktiven-Effekt zeigt, nicht einen Fakten-Effekt.
  const facts = {
    schule: "Gesamtschule Am Bornberg, Kassel, 780 Schueler:innen",
    zielgruppe:
      "12 Schueler:innen der Jahrgangsstufe 8/9 mit Abschlussgefaehrdung, geringer Lernmotivation und hohen Fehlzeiten",
    vorhaben:
      "PuSch-Klasse mit zwei Praxistagen pro Woche in Betrieben (Handwerk, Pflege, Einzelhandel), begleitet durch eine sozialpaedagogische Fachkraft des Traegers",
    ziel: "Hauptschulabschluss erreichen, Anschlussperspektive Ausbildung",
    partner: "Bildungstraeger Werkstatt e.V. (sozialpaedagogische Begleitung)",
  };

  const fokus = {
    name: abschnitt.name,
    fokus:
      "Paedagogisches Konzept: Wie Praxislernen und individuelle Foerderung die Zielgruppe zum Abschluss fuehren",
  };

  const promptA = buildSectionPrompt(
    programm, facts as never, fokus, "PuSch an der Gesamtschule Am Bornberg",
    { ...abschnitt, maxZeichen: undefined }, undefined, richtlinie
  );
  const promptB = buildSectionPrompt(
    programm, facts as never, fokus, "PuSch an der Gesamtschule Am Bornberg",
    abschnitt, undefined, richtlinie
  );

  console.log(`[smoke] Modell: ${MODEL_PIPELINE} | Limit im Fall B: ${abschnitt.maxZeichen} Zeichen`);
  console.log(`[smoke] Prompt A enthaelt ZIEL-UMFANG: ${promptA.includes("ZIEL-UMFANG")}`);
  console.log(`[smoke] Prompt B enthaelt ZIEL-UMFANG: ${promptB.includes("ZIEL-UMFANG")}\n`);

  for (const [label, prompt] of [["A (ohne Direktive, wie vor der Aenderung)", promptA], ["B (mit Direktive)", promptB]] as const) {
    const res = await generateText(MODEL_PIPELINE, SECTION_SYSTEM, prompt, { temperature: 0.4 });
    const text = res.value ?? "";
    const woerter = text.trim().split(/\s+/).filter(Boolean).length;
    const theorie = (text.match(THEORIE) || []).length;
    console.log(`=== ${label} ===`);
    console.log(`  Zeichen: ${text.length} | Woerter: ${woerter} | Theorie-Marker: ${theorie}`);
    console.log(`  Ausnutzung des 5000er-Limits: ${((100 * text.length) / 5000).toFixed(0)}%`);
    console.log(`  Anfang: ${JSON.stringify(text.slice(0, 160))}\n`);
  }
}

main().catch((e) => {
  console.error("[smoke] FEHLER:", e.message);
  process.exit(1);
});
