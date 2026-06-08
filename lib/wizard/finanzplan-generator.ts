import { randomUUID } from "crypto";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { Finanzplan, Finanzposten, WizardFacts } from "./types";
import type { Richtlinie } from "./richtlinien-schema";
import { MODEL_PRO, generateJson } from "./llm";
import { FINANZPLAN_SYSTEM, buildFinanzplanPrompt } from "./prompts";
import type { Usage } from "./pricing";

interface RawPosten {
  kategorie?: string;
  bezeichnung?: string;
  betragEur?: number;
  begruendung?: string;
  eigenanteil?: boolean;
}

interface RawResult {
  posten: RawPosten[];
  hinweise?: string[];
}

const ALLOWED: Finanzposten["kategorie"][] = [
  "personal",
  "sachkosten",
  "investitionen",
  "honorare",
  "reisekosten",
  "overhead",
  "sonstiges",
];

function normalize(p: RawPosten): Finanzposten | null {
  if (!p?.bezeichnung || typeof p.betragEur !== "number" || !Number.isFinite(p.betragEur)) {
    return null;
  }
  const kat = (p.kategorie ?? "sonstiges").toLowerCase();
  const kategorie = (ALLOWED as string[]).includes(kat)
    ? (kat as Finanzposten["kategorie"])
    : "sonstiges";
  return {
    id: randomUUID(),
    kategorie,
    bezeichnung: p.bezeichnung.trim(),
    betragEur: Math.round(p.betragEur),
    begruendung: p.begruendung?.trim() || undefined,
    eigenanteil: Boolean(p.eigenanteil),
  };
}

/**
 * Stellt sicher, dass ein vom Nutzer explizit genannter Eigenanteil
 * (`facts.budget.eigenmittel_eur`) im Finanzplan als eigens markierter Posten
 * (`eigenanteil: true`) abgebildet wird.
 *
 * Hintergrund: Das LLM setzt das `eigenanteil`-Flag unzuverlaessig (der Prompt
 * weist es nur fuer richtlinien-pflichtige Eigenmittel an, nicht fuer die
 * konkrete Nutzerangabe). Ohne diese deterministische Normalisierung rechnet
 * `validateFinanzplan` 0 % Eigenanteil und blockiert die Freigabe (HTTP 422),
 * obwohl der Nutzer einen Eigenanteil zugesagt hat.
 *
 * Konvention: Gesamtkosten = Foerderung + Eigenmittel. Nicht als Eigenanteil
 * markierte Posten gelten als Foerderkosten und bleiben unveraendert; der
 * Eigenanteil wird als separater, sauber bezifferter Posten ergaenzt bzw.
 * (bei unzuverlaessiger LLM-Markierung) konsolidiert.
 *
 * Exportiert fuer Tests.
 */
export function applyStatedEigenanteil(
  posten: Finanzposten[],
  facts: WizardFacts,
  hinweise: string[]
): Finanzposten[] {
  const stated = facts?.budget?.eigenmittel_eur;
  if (typeof stated !== "number" || !Number.isFinite(stated) || stated <= 0) {
    return posten;
  }
  const round = Math.round(stated);
  const currentEigen = posten
    .filter((p) => p.eigenanteil)
    .reduce((s, p) => s + p.betragEur, 0);

  // Bereits korrekt abgebildet (±1 % Toleranz, mind. 1 EUR)? Dann nichts tun.
  const tol = Math.max(1, round * 0.01);
  if (Math.abs(currentEigen - round) <= tol) {
    return posten;
  }

  // Unzuverlaessige LLM-Eigenanteil-Posten konsolidieren und einen sauberen
  // Eigenanteil-Posten in Hoehe der Nutzerangabe einsetzen.
  const foerderPosten = posten.filter((p) => !p.eigenanteil);
  const eigenPosten: Finanzposten = {
    id: randomUUID(),
    kategorie: "sonstiges",
    bezeichnung: "Eigenanteil Schultraeger",
    betragEur: round,
    begruendung: "Vom Antragsteller zugesagte Eigenmittel.",
    eigenanteil: true,
  };
  hinweise.push(
    `Eigenanteil von ${round.toLocaleString("de-DE")} EUR aus deinen Angaben als separater Posten ergaenzt.`
  );
  return [...foerderPosten, eigenPosten];
}

export interface FinanzplanUsage {
  model: string;
  usage: Usage;
}

export async function generateFinanzplan(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined,
  userAnswers?: string[]
): Promise<{ plan: Finanzplan; usage: FinanzplanUsage }> {
  const { value, usage } = await generateJson<RawResult>(
    MODEL_PRO,
    FINANZPLAN_SYSTEM,
    buildFinanzplanPrompt(programm, facts, richtlinie, userAnswers)
  );

  const posten = (value.posten ?? [])
    .map(normalize)
    .filter((p): p is Finanzposten => p !== null);

  // Deterministische Eigenanteil-Normalisierung (siehe applyStatedEigenanteil):
  // garantiert, dass eine explizite Nutzer-Eigenmittelangabe als markierter
  // Posten erscheint, unabhaengig davon, ob das LLM das Flag gesetzt hat.
  const hinweise = value.hinweise?.length ? [...value.hinweise] : [];
  const postenMitEigenanteil = applyStatedEigenanteil(posten, facts, hinweise);

  const plan: Finanzplan = {
    posten: postenMitEigenanteil,
    generiertAm: new Date().toISOString(),
    hinweise: hinweise.length ? hinweise : undefined,
  };

  return { plan, usage: { model: MODEL_PRO, usage } };
}
