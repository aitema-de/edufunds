/**
 * A/B-Test: deepseek-chat (ohne Reasoning) vs. deepseek-v4-pro (mit Reasoning)
 * fuer Section-Generation in der Wizard-Pipeline.
 *
 * Hypothese: Reasoning bringt bei kreativem deutschen Antragstexten unter
 * Richtlinien-Constraints sichtbar Qualitaet — zum Preis von 5–10× Latenz und
 * 12× Output-Token-Kosten.
 *
 * Setup: identischer Section-Prompt (DigitalPakt 2 + plausible Schule + Pflicht-
 * abschnitt "Bedarfsanalyse und Ausgangslage"). Drei Runs pro Modell, damit
 * Latenz-Streuung und Output-Varianz sichtbar werden.
 *
 * Run: `npx tsx --env-file=.env.local scripts/smoke-pipeline-models.ts`
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import OpenAI from "openai";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";
import type { WizardFacts } from "../lib/wizard/types";
import { SECTION_SYSTEM, buildSectionPrompt } from "../lib/wizard/prompts";
import { computeUsdCents } from "../lib/wizard/pricing";

const REPO = resolve(__dirname, "..");
const OUT_DIR = resolve(REPO, "tmp/ab-section");
const PROGRAMM_ID = "bmbf-digitalpakt-2";
const ABSCHNITT_ID = "bedarfsanalyse";
const RUNS_PRO_MODELL = 3;
const MODELLE = ["deepseek-chat", "deepseek-v4-pro"] as const;

interface RunResult {
  modell: string;
  run: number;
  latenzMs: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  contentChars: number;
  contentWords: number;
  usdCents: number;
  finishReason: string;
  contentPreview: string;
}

const FACTS: WizardFacts = {
  schule: {
    name: "Grundschule am Buschgraben",
    typ: "grundschule",
    bundesland: "berlin",
    schuelerzahl: 312,
    besonderheiten:
      "Drei-Zuegig, Ganztag, hoher Anteil Schueler mit nicht-deutscher Familiensprache (44 %). Bestand DigitalPakt 1: 12 Whiteboards (Bj. 2021), zwei Notebook-Wagen mit je 16 Geraeten (Bj. 2020/21), strukturierte Verkabelung in Hauptgebaeude. Nebengebaeude (Klassen 5/6) noch nicht versorgt.",
  },
  projekt: {
    titel:
      "Digitale Lehr-/Lernumgebung Klassen 5/6: WLAN-Erweiterung Nebengebaeude und Klassensaetze Tablets",
    kurzbeschreibung:
      "Ausbau der digitalen Infrastruktur im Nebengebaeude (Klassen 5/6, 8 Raeume), Beschaffung von zwei Klassensaetzen iPads inkl. Lade-/Synchronisationswagen, Lizenz fuer Lernplattform Anton+ fuer 130 Schueler, Fortbildung von 14 Lehrkraeften (3 Tage Mediendidaktik). Anbindung an bestehendes Schul-IT-Konzept und Medienkonzept Stand 2024.",
    ziele: [
      "Vollstaendige WLAN-Versorgung aller 22 Klassenraeume bis Ende Schuljahr 2026/27",
      "Tablet-Verfuegbarkeit 1:1 fuer Klassen 5/6 in mind. 12 Wochenstunden",
      "Mediendidaktische Qualifizierung aller 14 Lehrkraefte der Klassen 5/6",
    ],
    zielgruppe: "130 Schuelerinnen und Schueler der Klassen 5 und 6, 14 Lehrkraefte",
    aktivitaeten: [
      "Strukturierte Verkabelung Nebengebaeude",
      "Access-Points (8 Stueck) installieren, in bestehendes Netzwerk einbinden",
      "Beschaffung 2 Klassensaetze iPads (32 Stueck) inkl. MDM-Lizenz",
      "Schulinterne Fortbildung Mediendidaktik (3 Tage, externer Anbieter)",
    ],
    zeitraum: "01.09.2026 – 31.07.2027",
  },
  wirkung: {
    erwartete_ergebnisse: [
      "Nebengebaeude WLAN-versorgt, Tablets in Klassen 5/6 nutzbar ab Q4 2026",
      "Lehrkraefte qualifiziert, Mediendidaktik-Konzept fortgeschrieben",
    ],
    messbare_indikatoren: [
      "WLAN-Verfuegbarkeit in 22/22 Klassenraeumen",
      "Schueler-Geraete-Verhaeltnis Klassen 5/6 = 1:1",
      "14/14 Lehrkraefte mit absolvierter Fortbildung (Teilnahme-Bestaetigung)",
    ],
    nachhaltigkeit:
      "Geraete-Wartung uebernimmt der bezirkliche IT-Dienstleister (bestehender Vertrag, Ausweitung um Nebengebaeude bereits beauftragt). Ersatzbeschaffungsplan fuer Tablets nach 5 Jahren ueber bezirklichen Investitionshaushalt vorgesehen.",
  },
  budget: {
    beantragt_eur: 78000,
    eigenmittel_eur: 22000,
    hauptposten: [
      "Strukturierte Verkabelung + 8 Access-Points: 28.000 €",
      "32 iPads inkl. Lade-/Synchronisationswagen: 32.000 €",
      "MDM-Lizenz 3 Jahre: 4.500 €",
      "Lernplattform Anton+ 3 Jahre / 130 Plaetze: 6.500 €",
      "Fortbildung Mediendidaktik (extern): 7.000 €",
    ],
  },
  programmpassung: {
    kriterien_adressiert: [
      "WLAN-Ausbau (Sachkosten foerderfaehig)",
      "Mobile Endgeraete als Teil paedagogischen Konzepts (Investitionen foerderfaehig)",
      "Fortbildung Lehrkraefte (foerderfaehig)",
      "Eigenanteil Bezirk (Schultraeger) gesichert: 22.000 €",
    ],
  },
};

async function loadProgramm(): Promise<Foerderprogramm> {
  const raw = await readFile(resolve(REPO, "data/foerderprogramme.json"), "utf-8");
  const list = JSON.parse(raw) as Foerderprogramm[];
  const p = list.find((x) => x.id === PROGRAMM_ID);
  if (!p) throw new Error(`Programm ${PROGRAMM_ID} nicht in foerderprogramme.json`);
  return p;
}

async function loadRichtlinie(): Promise<Richtlinie> {
  const raw = await readFile(resolve(REPO, `data/richtlinien/${PROGRAMM_ID}.json`), "utf-8");
  return JSON.parse(raw) as Richtlinie;
}

function findAbschnitt(rl: Richtlinie) {
  const a = rl.antragsstruktur?.abschnitte?.find((x) => x.id === ABSCHNITT_ID);
  if (!a) throw new Error(`Abschnitt ${ABSCHNITT_ID} nicht im Dossier`);
  return a;
}

async function callOnce(
  client: OpenAI,
  modell: string,
  system: string,
  user: string,
  run: number
): Promise<RunResult> {
  const t0 = Date.now();
  const res = await client.chat.completions.create({
    model: modell,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    // Bewusst kein max_tokens — wir wollen Reasoning nicht ungewollt cappen.
  });
  const latenzMs = Date.now() - t0;
  const choice = res.choices[0];
  const content = (choice?.message?.content ?? "").trim();
  const usage = res.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  // DeepSeek liefert reasoning_tokens via completion_tokens_details.
  const reasoningTokens =
    (usage as unknown as { completion_tokens_details?: { reasoning_tokens?: number } })
      .completion_tokens_details?.reasoning_tokens ?? 0;
  const usdCents = computeUsdCents(modell, {
    promptTokens: usage.prompt_tokens,
    candidatesTokens: usage.completion_tokens,
  });
  return {
    modell,
    run,
    latenzMs,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    reasoningTokens,
    contentChars: content.length,
    contentWords: content.split(/\s+/).filter(Boolean).length,
    usdCents,
    finishReason: choice?.finish_reason ?? "?",
    contentPreview: content,
  };
}

function fmt(n: number, dec = 0): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY fehlt — .env.local pruefen");

  await mkdir(OUT_DIR, { recursive: true });

  const programm = await loadProgramm();
  const richtlinie = await loadRichtlinie();
  const richtlinieAbschnitt = findAbschnitt(richtlinie);

  const titel =
    "Digitale Lehr-/Lernumgebung Klassen 5/6 — WLAN-Erweiterung und Klassensaetze Tablets, Grundschule am Buschgraben";
  const abschnittInput = {
    name: richtlinieAbschnitt.name,
    fokus: `Leitfragen: ${richtlinieAbschnitt.leitfragen?.join(" | ")}`,
  };

  const userPrompt = buildSectionPrompt(programm, FACTS, abschnittInput, titel, richtlinieAbschnitt);

  console.log("=".repeat(80));
  console.log(`A/B-Test Section-Generation`);
  console.log(`Programm: ${programm.name}`);
  console.log(`Abschnitt: ${richtlinieAbschnitt.name} (${ABSCHNITT_ID})`);
  console.log(`System-Prompt: ${SECTION_SYSTEM.length} Zeichen`);
  console.log(`User-Prompt: ${userPrompt.length} Zeichen, ~${Math.round(userPrompt.length / 4)} Tokens`);
  console.log(`Runs pro Modell: ${RUNS_PRO_MODELL}`);
  console.log("=".repeat(80));

  await writeFile(resolve(OUT_DIR, "_prompt.md"), `# System\n\n${SECTION_SYSTEM}\n\n# User\n\n${userPrompt}\n`);

  const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  const all: RunResult[] = [];

  for (const modell of MODELLE) {
    console.log(`\n>>> ${modell}`);
    for (let r = 1; r <= RUNS_PRO_MODELL; r++) {
      process.stdout.write(`  Run ${r}/${RUNS_PRO_MODELL} ... `);
      try {
        const result = await callOnce(client, modell, SECTION_SYSTEM, userPrompt, r);
        all.push(result);
        await writeFile(
          resolve(OUT_DIR, `${modell}_run${r}.md`),
          `<!-- modell=${modell} run=${r} latenz=${result.latenzMs}ms ` +
            `tokens=${result.promptTokens}/${result.completionTokens} ` +
            `reasoning=${result.reasoningTokens} -->\n\n${result.contentPreview}\n`
        );
        console.log(
          `${(result.latenzMs / 1000).toFixed(1)}s · ` +
            `${result.promptTokens}/${result.completionTokens} tok ` +
            `(reasoning ${result.reasoningTokens}) · ` +
            `${result.contentWords}W · ${result.usdCents.toFixed(3)}¢ · ${result.finishReason}`
        );
      } catch (err) {
        console.log(`FEHLER: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("ZUSAMMENFASSUNG");
  console.log("=".repeat(80));
  for (const modell of MODELLE) {
    const runs = all.filter((r) => r.modell === modell);
    if (!runs.length) continue;
    const avg = (sel: (r: RunResult) => number) => runs.reduce((s, r) => s + sel(r), 0) / runs.length;
    const min = (sel: (r: RunResult) => number) => Math.min(...runs.map(sel));
    const max = (sel: (r: RunResult) => number) => Math.max(...runs.map(sel));
    console.log(`\n${modell} (n=${runs.length})`);
    console.log(`  Latenz:           min ${(min((r) => r.latenzMs) / 1000).toFixed(1)}s · avg ${(avg((r) => r.latenzMs) / 1000).toFixed(1)}s · max ${(max((r) => r.latenzMs) / 1000).toFixed(1)}s`);
    console.log(`  Prompt-Tokens:    ${fmt(avg((r) => r.promptTokens))} (avg)`);
    console.log(`  Completion-Tok.:  ${fmt(avg((r) => r.completionTokens))} (avg) — davon Reasoning ${fmt(avg((r) => r.reasoningTokens))}`);
    console.log(`  Content-Woerter:  min ${min((r) => r.contentWords)} · avg ${Math.round(avg((r) => r.contentWords))} · max ${max((r) => r.contentWords)}`);
    console.log(`  Kosten/Call:      ${avg((r) => r.usdCents).toFixed(3)} ¢ (avg)`);
  }

  // Hochrechnung auf eine volle Pipeline-Run.
  // Pipeline-Calls mit MODEL_PRO: 1 Outline (oft Fallback) + ~6 Sections + 1 Critique + 1 Revision = 9 Calls.
  // Konservativ rechnen wir mit 9 PRO-Calls bei vergleichbarer Token-Last.
  console.log("\nHOCHRECHNUNG (9 PRO-Calls pro vollstaendigem Antragslauf, gleiche Token-Last):");
  for (const modell of MODELLE) {
    const runs = all.filter((r) => r.modell === modell);
    if (!runs.length) continue;
    const avgLatencyS = runs.reduce((s, r) => s + r.latenzMs, 0) / runs.length / 1000;
    const avgCost = runs.reduce((s, r) => s + r.usdCents, 0) / runs.length;
    console.log(
      `  ${modell.padEnd(20)} ~${(avgLatencyS * 9).toFixed(0)}s Pipeline-Latenz, ~${(avgCost * 9).toFixed(1)}¢ Pipeline-Kosten`
    );
  }

  console.log(`\nOutputs in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
