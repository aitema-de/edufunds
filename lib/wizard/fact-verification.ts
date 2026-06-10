import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts } from "./types";
import type { Usage } from "./pricing";
import { detectIntroduced } from "./hallucination-gate";
import {
  FACT_VERIFICATION_DETECT_SYSTEM,
  FACT_VERIFICATION_REPAIR_SYSTEM,
  buildFactVerificationDetectPrompt,
  buildFactVerificationRepairPrompt,
} from "./prompts";

/**
 * Fakt-Verifikations-Pass (Probe 09.06., Hebel 1b — nach dem Zahlen-Gate)
 * ----------------------------------------------------------------------
 * Das deterministische Halluzinations-Gate (hallucination-gate.ts) faengt nur
 * ZAHLEN und EIGENNAMEN, und nur solche, die die REVISION gegenueber dem Entwurf
 * NEU eingefuehrt hat. Zwei Luecken bleiben:
 *   1. NARRATIVE Erfindungen (Partner-Rollen, Termine, Meilensteinplaene,
 *      Zusagen Dritter, Mengen/Reichweiten, Verbreitungskanaele, Verfahren) —
 *      keine isolierte Zahl/kein Eigenname, deterministisch nicht greifbar.
 *   2. SECTION-STAGE-Halluzinationen — schon im Entwurf erfunden, damit Teil des
 *      "erlaubten Korpus" des Zahlen-Gates und dort korrekt NICHT als neu geflaggt.
 *
 * Dieser Pass schliesst beide Luecken: ein LLM-Detektor extrahiert konkrete,
 * UEBERPRUEFBARE Tatsachenbehauptungen, die nicht durch die Nutzer-Ground-Truth
 * (Facts + Roh-Antworten — bewusst OHNE Entwurf) gedeckt sind; ein gezielter
 * Repair degradiert sie zu ehrlichen Luecken-Markern.
 *
 * Drei Sicherungen gegen "zu aggressiv" (markierte Luecken sind bereits die
 * Staerke der Pipeline, Probe-Score 4,5):
 *   - DETEKTOR-Anker: nur Behauptungen, deren Zitat WOERTLICH im finalText steht,
 *     ueberleben — vom Detektor selbst erfundene Zitate fliegen deterministisch raus.
 *   - REPAIR ist chirurgisch und beruehrt nur die gelisteten Stellen.
 *   - NEVER-WORSE-Akzeptanzgate (wie beim Zahlen-Gate): uebernommen nur, wenn
 *     mindestens ein geflaggtes Zitat verschwand, der Text nicht massiv kuerzte UND
 *     deterministisch keine NEUEN harten Halluzinationen (Zahlen/Namen) entstanden.
 *
 * Detektion + Repair sind als Dependencies injiziert → unit-testbar ohne Netzwerk.
 */

export interface FactClaim {
  /** Woertliches Kurzzitat aus dem Antrag (Anker fuer Praesenz-Pruefung + Repair). */
  zitat: string;
  art: "partner" | "termin" | "zusage" | "menge" | "kanal" | "verfahren" | "sonstiges";
  warum: string;
}

// ---------------------------------------------------------------------------
// Ground Truth (NUR Nutzerangaben — bewusst OHNE Entwurf)
// ---------------------------------------------------------------------------

function collectLeafValues(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node.trim());
    return;
  }
  if (typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectLeafValues(v, out);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) collectLeafValues(v, out);
  }
}

/**
 * Gesicherte Nutzer-Ground-Truth: Facts-Blattwerte + Roh-Antworten des Nutzers.
 * Der Entwurf gehoert ABSICHTLICH NICHT dazu — section-stage-erfundene Fakten
 * stehen im Entwurf und sollen genau hier auffallen.
 */
export function buildGroundTruth(facts: WizardFacts, userAnswers?: string[]): string {
  const leaves: string[] = [];
  collectLeafValues(facts, leaves);
  const parts = [leaves.join("\n")];
  if (userAnswers?.length) parts.push(userAnswers.join("\n"));
  return parts.filter((p) => p.trim()).join("\n");
}

/** Knapper Programm-Kontext fuer den Detektor (legitime Rahmung, nicht flagbar). */
export function buildProgrammKontext(programm: Foerderprogramm): string {
  const p = programm as unknown as Record<string, unknown>;
  const pick = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  return [pick("name") || pick("titel"), pick("zielgruppe"), pick("foerderzweck"), pick("beschreibung")]
    .filter((s) => s && s.trim())
    .join(" — ");
}

// ---------------------------------------------------------------------------
// Anker: nur woertlich im Text vorhandene Zitate ueberleben
// ---------------------------------------------------------------------------

const MIN_ZITAT_LEN = 8;
const MAX_CLAIMS = 8;

function normalizeWs(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Steht das Zitat (whitespace-tolerant) woertlich im Text? */
function quotePresent(text: string, zitat: string): boolean {
  const z = normalizeWs(zitat);
  if (z.length < MIN_ZITAT_LEN) return false;
  return normalizeWs(text).includes(z);
}

/**
 * Filtert die Roh-Claims des Detektors: nur valide Felder, Zitat muss woertlich
 * im finalText stehen (verwirft vom LLM erfundene Zitate), dedupliziert, gekappt.
 */
export function anchorClaims(raw: unknown, finalText: string): FactClaim[] {
  const src = (raw ?? {}) as { claims?: unknown };
  if (!Array.isArray(src.claims)) return [];
  const ARTEN: ReadonlyArray<FactClaim["art"]> = [
    "partner", "termin", "zusage", "menge", "kanal", "verfahren", "sonstiges",
  ];
  const out: FactClaim[] = [];
  const seen = new Set<string>();
  for (const c of src.claims as Array<Record<string, unknown>>) {
    if (!c || typeof c !== "object") continue;
    const zitat = typeof c.zitat === "string" ? c.zitat.trim() : "";
    if (!quotePresent(finalText, zitat)) continue;
    const key = normalizeWs(zitat);
    if (seen.has(key)) continue;
    seen.add(key);
    const art = ARTEN.includes(c.art as FactClaim["art"]) ? (c.art as FactClaim["art"]) : "sonstiges";
    const warum = typeof c.warum === "string" && c.warum.trim() ? c.warum.trim() : "nicht durch Nutzerangaben gedeckt";
    out.push({ zitat, art, warum });
    if (out.length >= MAX_CLAIMS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pass (LLM injiziert)
// ---------------------------------------------------------------------------

export interface FactVerificationDeps {
  /** Detektor: liefert das rohe JSON ({claims:[…]}). */
  detect: (system: string, user: string) => Promise<{ value: unknown; usage: Usage }>;
  /** Chirurgischer Repair: liefert den bereinigten Antragstext. */
  revise: (system: string, user: string) => Promise<{ value: string; usage: Usage }>;
  models: { detect: string; revise: string };
}

export interface FactVerificationResult {
  /** Bereinigter (oder unveraenderter) Antragstext. */
  finalText: string;
  /** Anker-geprueft erkannte, ungedeckte Behauptungen (Zitate). */
  flagged: string[];
  /** Nach dem (uebernommenen) Repair noch woertlich vorhandene geflaggte Zitate. */
  remaining: string[];
  /** true, wenn der Repair uebernommen wurde. */
  repaired: boolean;
  usages: Array<{ model: string; usage: Usage }>;
}

// Ein uebernommener Repair darf den Text nicht massiv kuerzen (Anti-Truncation).
const MIN_LENGTH_RATIO = 0.6;

/** Wie viele der geflaggten Zitate stehen noch woertlich im Text? */
function countPresent(text: string, claims: FactClaim[]): number {
  return claims.filter((c) => quotePresent(text, c.zitat)).length;
}

/** Anzahl deterministisch erkannter, ungedeckter Zahlen/Eigennamen (harte Halluzination). */
function hardHallucinationCount(text: string, groundTruth: string): number {
  const i = detectIntroduced(text, groundTruth);
  return i.numbers.length + i.entities.length;
}

/**
 * Prueft den finalText gegen die Nutzer-Ground-Truth und entschaerft narrative,
 * ungedeckte Tatsachenbehauptungen. No-op (kein Repair-Call), wenn der Detektor
 * nichts Ankerbares findet. Uebernahme nur bei deterministisch nachgewiesener
 * Verbesserung (Never-Worse).
 */
export async function verifyFacts(
  finalText: string,
  groundTruth: string,
  programmKontext: string,
  deps: FactVerificationDeps
): Promise<FactVerificationResult> {
  const usages: Array<{ model: string; usage: Usage }> = [];

  const det = await deps.detect(
    FACT_VERIFICATION_DETECT_SYSTEM,
    buildFactVerificationDetectPrompt(finalText, groundTruth, programmKontext)
  );
  usages.push({ model: deps.models.detect, usage: det.usage });

  const claims = anchorClaims(det.value, finalText);
  if (claims.length === 0) {
    return { finalText, flagged: [], remaining: [], repaired: false, usages };
  }

  const rev = await deps.revise(
    FACT_VERIFICATION_REPAIR_SYSTEM,
    buildFactVerificationRepairPrompt(finalText, claims)
  );
  usages.push({ model: deps.models.revise, usage: rev.usage });

  const candidate = typeof rev.value === "string" && rev.value.trim() ? rev.value : finalText;

  const beforePresent = countPresent(finalText, claims);
  const afterPresent = countPresent(candidate, claims);
  const lengthOk = candidate.length >= finalText.length * MIN_LENGTH_RATIO;
  const noNewHard =
    hardHallucinationCount(candidate, groundTruth) <= hardHallucinationCount(finalText, groundTruth);
  const accept = lengthOk && afterPresent < beforePresent && noNewHard;

  const result = accept ? candidate : finalText;
  const flagged = claims.map((c) => c.zitat);

  return {
    finalText: result,
    flagged,
    remaining: claims.filter((c) => quotePresent(result, c.zitat)).map((c) => c.zitat),
    repaired: accept,
    usages,
  };
}
