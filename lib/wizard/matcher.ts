/**
 * Matching: Anliegen + Schul-Kontext → gerankte Liste passender Förderprogramme.
 * Nutzt Gemini 2.0 Flash mit JSON-Output.
 */

import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { MODEL_FLASH, generateJson } from "./gemini";
import { addUsage, emptyLedger, type CostLedger } from "./pricing";

const programme = foerderprogrammeData as Foerderprogramm[];

export interface MatchInput {
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
}

export interface MatchedProgramm {
  id: string;
  score: number;
  begruendung: string;
  programm: Foerderprogramm;
}

export interface MatchResult {
  matches: MatchedProgramm[];
  costs: CostLedger;
  totalCandidates: number;
  filteredOut: number;
}

/**
 * Vor-Filter: Programme ausschliessen, die aufgrund harter Kriterien nicht passen.
 * Reduziert Token-Verbrauch und Halluzinationen des Matchers.
 */
function prefilter(input: MatchInput, all: Foerderprogramm[]): Foerderprogramm[] {
  const bl = input.bundesland?.trim().toUpperCase();
  return all.filter((p) => {
    // Abgelaufene Fristen ausschliessen
    if ((p as any).status && (p as any).status === "abgelaufen") return false;

    // Landesprogramme filtern: wenn User bundesland gesetzt hat und
    // Programm explizit andere Laender fordert
    if (bl && Array.isArray((p as any).bundeslaender) && (p as any).bundeslaender.length > 0) {
      const codes = ((p as any).bundeslaender as string[]).map((x) => x.toUpperCase());
      // "DE-ALLE" oder leeres Array bedeutet bundesweit; sonst match auf konkretem Code
      if (!codes.includes("DE-ALLE") && !codes.some((c) => c.endsWith(bl))) return false;
    }

    return true;
  });
}

/**
 * Baut eine kompakte Karten-Darstellung pro Programm (für den LLM-Prompt).
 */
interface CompactProgrammCard {
  id: string;
  name: string;
  typ?: string;
  geber?: string;
  zielgruppe?: string;
  foerdersumme?: number | string;
  frist?: string;
  kategorien?: string[];
  kurz?: string;
}

function toCard(p: Foerderprogramm): CompactProgrammCard {
  return {
    id: p.id,
    name: p.name,
    typ: (p as any).foerdergeberTyp,
    geber: (p as any).foerdergeber,
    zielgruppe: (p as any).zielgruppeText?.substring(0, 120),
    foerdersumme: (p as any).foerdersummeMax ?? (p as any).foerdersummeText,
    frist: (p as any).bewerbungsfristText?.substring(0, 40),
    kategorien: ((p as any).kategorien ?? []).slice(0, 4),
    kurz: ((p as any).kurzbeschreibung ?? "").substring(0, 240),
  };
}

const MATCHER_SYSTEM = `Du bist ein erfahrener Fördermittel-Berater fuer Schulen in Deutschland.
Deine Aufgabe: ein Anliegen einer Schule mit einer Liste von Foerderprogrammen abgleichen und die 5 Programme zurueckgeben, die AM BESTEN passen.

## Matching-Kriterien (von wichtig nach weniger wichtig)
1. Thematische Passung: Bearbeitet das Programm genau das beschriebene Anliegen? Passt die Zielgruppe?
2. Formale Passung: Schultyp, Bundesland, Foerdersumme realistisch erreichbar.
3. Praktikabilitaet: Frist liegt in Zukunft, Aufwand-Nutzen-Verhaeltnis vertretbar.
4. Wirkungstiefe: Programm mit groesserer Hebelwirkung bevorzugen, wenn es thematisch gleich passt.

## Was DU NICHT tust
- KEINE Programme erfinden. Nur IDs aus der gelieferten Liste.
- KEINE "passt irgendwie" Empfehlungen. Score < 50 rausfiltern.
- KEIN Gefaelligkeits-Ranking. Wenn nichts passt, gib weniger als 5 Programme oder eine leere Liste.

## Ausgabeformat (valides JSON, keine Fences)
{
  "matches": [
    {
      "id": "programm-id-exakt-wie-in-liste",
      "score": 0..100,
      "begruendung": "1-2 Saetze, warum dieses Programm zum Anliegen passt. Konkret, mit Bezug zur Anliegen-Formulierung."
    }
  ]
}
Sortiert von höchstem zu niedrigstem Score. Maximal 5 Treffer.`;

function buildUserPrompt(input: MatchInput, cards: CompactProgrammCard[]): string {
  const ctx: string[] = [];
  ctx.push(`ANLIEGEN DER SCHULE:\n${input.anliegen.trim()}`);
  const profile: string[] = [];
  if (input.schulname) profile.push(`Name: ${input.schulname}`);
  if (input.schultyp) profile.push(`Schultyp: ${input.schultyp}`);
  if (input.bundesland) profile.push(`Bundesland: ${input.bundesland}`);
  if (input.geschaetztesBudgetEur)
    profile.push(`Geschaetztes Budget: ${input.geschaetztesBudgetEur.toLocaleString("de-DE")} EUR`);
  if (profile.length) ctx.push(`\nSCHUL-PROFIL:\n${profile.join("\n")}`);
  ctx.push(`\nKANDIDATENLISTE (${cards.length} Programme):\n${JSON.stringify(cards)}`);
  ctx.push(
    "\nFinde die maximal 5 passendsten und begruende. Achte darauf, dass die id exakt wie in der Liste ist."
  );
  return ctx.join("\n");
}

interface RawMatch {
  id: string;
  score: number;
  begruendung: string;
}

export async function runMatch(input: MatchInput): Promise<MatchResult> {
  if (!input.anliegen || input.anliegen.trim().length < 20) {
    throw new Error(
      "Bitte beschreibe dein Anliegen etwas ausfuehrlicher (mind. 20 Zeichen)."
    );
  }

  const filtered = prefilter(input, programme);
  const cards = filtered.map(toCard);

  const { value, usage } = await generateJson<{ matches: RawMatch[] }>(
    MODEL_FLASH,
    MATCHER_SYSTEM,
    buildUserPrompt(input, cards)
  );

  const costs = addUsage(emptyLedger(), MODEL_FLASH, usage);

  const matches: MatchedProgramm[] = [];
  for (const m of value.matches ?? []) {
    if (!m.id || typeof m.score !== "number") continue;
    if (m.score < 50) continue;
    const p = programme.find((x) => x.id === m.id);
    if (!p) continue; // KI hat halluziniert / wir haben es rausgefiltert
    matches.push({ id: m.id, score: Math.round(m.score), begruendung: m.begruendung ?? "", programm: p });
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    matches: matches.slice(0, 5),
    costs,
    totalCandidates: filtered.length,
    filteredOut: programme.length - filtered.length,
  };
}
