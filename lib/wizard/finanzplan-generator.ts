import { randomUUID } from "crypto";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { Finanzplan, Finanzposten, WizardFacts } from "./types";
import type { Richtlinie } from "./richtlinien-schema";
import { MODEL_PRO, generateJson } from "./gemini";
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

export interface FinanzplanUsage {
  model: string;
  usage: Usage;
}

export async function generateFinanzplan(
  programm: Foerderprogramm,
  facts: WizardFacts,
  richtlinie: Richtlinie | null | undefined
): Promise<{ plan: Finanzplan; usage: FinanzplanUsage }> {
  const { value, usage } = await generateJson<RawResult>(
    MODEL_PRO,
    FINANZPLAN_SYSTEM,
    buildFinanzplanPrompt(programm, facts, richtlinie)
  );

  const posten = (value.posten ?? [])
    .map(normalize)
    .filter((p): p is Finanzposten => p !== null);

  const plan: Finanzplan = {
    posten,
    generiertAm: new Date().toISOString(),
    hinweise: value.hinweise?.length ? value.hinweise : undefined,
  };

  return { plan, usage: { model: MODEL_PRO, usage } };
}
