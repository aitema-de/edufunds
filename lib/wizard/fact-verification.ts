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
  /**
   * Produktvision 2026-06-10 — dreistufig:
   * - "widerspruch": widerspricht einer Nutzeraussage → entfernen.
   * - "tatsache": ungesicherte Tatsache/Zusage/Quelle als feststehend → zu Vorbehalt entschaerfen.
   * - "vorschlag": plausible, nicht widerspruechliche Ausgestaltung → BEHALTEN + auflisten.
   */
  art: "widerspruch" | "tatsache" | "vorschlag";
  warum: string;
}

/** Arten, deren Behauptung neutralisiert (entschaerft/entfernt) wird. */
const NEUTRALISIEREN: ReadonlyArray<FactClaim["art"]> = ["widerspruch", "tatsache"];

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
// 86caht7eq Restluecken-Iteration 02.07.: 8 → 16. Der Cap limitierte das
// Sicherheitsnetz — annahmereiche Antraege (Eval P002) hatten >8 ungedeckte
// Behauptungen, alles jenseits des Caps blieb unmarkiert im Text.
const MAX_CLAIMS = 16;

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
  const ARTEN: ReadonlyArray<FactClaim["art"]> = ["widerspruch", "tatsache", "vorschlag"];
  const out: FactClaim[] = [];
  const seen = new Set<string>();
  for (const c of src.claims as Array<Record<string, unknown>>) {
    if (!c || typeof c !== "object") continue;
    const zitat = typeof c.zitat === "string" ? c.zitat.trim() : "";
    if (!quotePresent(finalText, zitat)) continue;
    const key = normalizeWs(zitat);
    if (seen.has(key)) continue;
    seen.add(key);
    // Im Zweifel "vorschlag" (behalten+markieren statt loeschen) — Vision.
    const art = ARTEN.includes(c.art as FactClaim["art"]) ? (c.art as FactClaim["art"]) : "vorschlag";
    const warum = typeof c.warum === "string" && c.warum.trim() ? c.warum.trim() : "nicht durch Nutzerangaben gedeckt";
    out.push({ zitat, art, warum });
    if (out.length >= MAX_CLAIMS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deterministischer Rechtsfolgen-Detektor (86caht7eq Restluecken-Iteration)
// ---------------------------------------------------------------------------

/**
 * Rechtsfolgen-Behauptungen (Gemeinnuetzigkeit anerkannt, Freistellungsbescheid
 * liegt vor, Zustimmung erteilt, muendliche/schriftliche Zusage) sind gegenueber
 * dem Foerdergeber Falschangaben, wenn der Nutzer sie nicht bestaetigt hat —
 * und laut Produktentscheidung auch als [Annahme: …] TABU (der Nutzer kann sie
 * nicht "einfach bestaetigen", sie muessen als noch einzuholender Schritt
 * formuliert sein). Der LLM-Detektor uebersah sie wiederholt (Eval P001/P003) —
 * diese hochpraezisen Muster fangen sie deterministisch und speisen sie als
 * "tatsache" in den chirurgischen Repair (→ ehrlicher Vorbehalt).
 */
const RECHTSFOLGEN_MUSTER: ReadonlyArray<{ re: RegExp; warum: string }> = [
  {
    re: /(?:ist|sind|wurde)(?:\s+\w+){0,3}\s+als\s+gemeinn(?:ue|ü)tzig\s+anerkannt/gi,
    warum: "Gemeinnuetzigkeits-Anerkennung als feststehend behauptet — Rechtsfolge ohne Nutzerbeleg.",
  },
  {
    re: /Gemeinn(?:ue|ü)tzigkeit[^.\n]{0,60}?(?:ist\s+gegeben|liegt\s+vor|ist\s+anerkannt|wird\s+nachgewiesen|ist\s+nachgewiesen)/gi,
    warum: "Gemeinnuetzigkeit als gegeben/nachgewiesen behauptet — Rechtsfolge ohne Nutzerbeleg.",
  },
  {
    re: /Freistellungsbescheid[^.\n]{0,60}?(?:liegt\s+(?:aktuell\s+)?vor|ist\s+vorhanden|wird\s+nachgewiesen|ist\s+nachgewiesen)/gi,
    warum: "Freistellungsbescheid als vorliegend behauptet — Dokument ohne Nutzerbeleg.",
  },
  {
    re: /(?:hat|haben)\s+(?:bereits\s+)?(?:zugestimmt|die\s+Zustimmung\s+erteilt|ihre?\s+Zustimmung\s+erteilt)/gi,
    warum: "Erteilte Zustimmung Dritter als feststehend behauptet — Zusage ohne Nutzerbeleg.",
  },
  {
    re: /Zustimmung[^.\n]{0,50}?liegt\s+(?:bereits\s+)?vor/gi,
    warum: "Vorliegende Zustimmung behauptet — Zusage ohne Nutzerbeleg.",
  },
  {
    re: /(?:m(?:ue|ü)ndliche|schriftliche)\s+Zusage/gi,
    warum: "Muendliche/schriftliche Zusage behauptet — Zusage ohne Nutzerbeleg.",
  },
];

/** Vorbehalts-Signale: Treffer in einem Satz mit diesen Formulierungen sind schon ehrlich. */
const VORBEHALT_RE =
  /noch\s+(?:einzuholen|zu\s+kl(?:ae|ä)ren|aussteht|nachzureichen|zu\s+beantragen)|einzuholen|anzuerkennen|nachzureichen|beantragt\s+werden|vorbehaltlich|\[TODO:|\[Annahme:/i;

/** Satzgrenzen um einen Match herum finden (fuer Vorbehalts-Kontext-Pruefung). */
function satzUm(text: string, start: number, end: number): string {
  const from = Math.max(text.lastIndexOf(".", start), text.lastIndexOf("\n", start)) + 1;
  const toDot = text.indexOf(".", end);
  const toNl = text.indexOf("\n", end);
  const candidates = [toDot, toNl].filter((i) => i !== -1);
  const to = candidates.length ? Math.min(...candidates) : text.length;
  return text.slice(from, to + 1);
}

/**
 * Findet unbelegte Rechtsfolgen-Behauptungen im Text. Uebersprungen werden
 * Treffer, deren Aussage in der Ground Truth vorkommt (Nutzer hat es belegt)
 * oder deren Satz bereits einen ehrlichen Vorbehalt/Marker traegt.
 */
export function detectRechtsfolgen(finalText: string, groundTruth: string): FactClaim[] {
  const out: FactClaim[] = [];
  const gt = normalizeWs(groundTruth);
  const seen = new Set<string>();
  for (const { re, warum } of RECHTSFOLGEN_MUSTER) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(finalText)) !== null) {
      const zitat = m[0].trim();
      const key = normalizeWs(zitat);
      if (key.length < MIN_ZITAT_LEN || seen.has(key)) continue;
      if (gt.includes(key)) continue; // vom Nutzer selbst so gesagt
      const satz = satzUm(finalText, m.index, m.index + m[0].length);
      if (VORBEHALT_RE.test(satz)) continue; // schon ehrlich formuliert
      seen.add(key);
      out.push({ zitat, art: "tatsache", warum });
    }
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
  /** Neutralisierte Widersprueche/falsche Tatsachen (Zitate, vor dem Repair). */
  neutralisiert: string[];
  /** Sinnvolle Ausgestaltungen, die im Text BLEIBEN — dem Nutzer zur Bestaetigung vorgelegt. */
  vorschlaege: string[];
  /**
   * P2 (Feedback 24.06.): dieselben Vorschlaege mit ihrer Detektor-Begruendung (`warum`),
   * damit die UI pro ergaenzter Formulierung erklaeren kann, WARUM sie aufgenommen wurde
   * ("damit der Eindruck des Halluzinierens nicht entsteht"). Parallel zu `vorschlaege`.
   */
  vorschlaegeBegruendung: Array<{ zitat: string; warum: string }>;
  /** Nach dem (uebernommenen) Repair noch vorhandene Neutralisierungs-Zitate. */
  remaining: string[];
  /** true, wenn der Repair uebernommen wurde. */
  repaired: boolean;
  usages: Array<{ model: string; usage: Usage }>;
}

// Ein uebernommener Repair darf den Text nicht massiv kuerzen (Anti-Truncation).
const MIN_LENGTH_RATIO = 0.6;

/** Wie viele der gelisteten Zitate stehen noch woertlich im Text? */
function countPresent(text: string, claims: FactClaim[]): number {
  return claims.filter((c) => quotePresent(text, c.zitat)).length;
}

/** Anzahl deterministisch erkannter, ungedeckter Zahlen/Eigennamen (harte Halluzination). */
function hardHallucinationCount(text: string, groundTruth: string): number {
  const i = detectIntroduced(text, groundTruth);
  return i.numbers.length + i.entities.length;
}

/**
 * Produktvision 2026-06-10 (dreistufig): prueft den finalText gegen die Nutzer-
 * Ground-Truth. WIDERSPRUECHE und ungesicherte TATSACHEN werden per chirurgischem
 * Repair neutralisiert (Uebernahme nur bei deterministisch nachgewiesener
 * Verbesserung — Never-Worse). Sinnvolle VORSCHLAEGE (Ausgestaltung/Optionen)
 * BLEIBEN im Text und werden separat als zu bestaetigende Vorschlaege zurueckgegeben.
 * Kein Repair-Call, wenn es nur Vorschlaege (nichts zu neutralisieren) gibt.
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

  const llmClaims = anchorClaims(det.value, finalText);
  // Deterministische Rechtsfolgen-Treffer ergaenzen (LLM-Detektor uebersieht sie
  // wiederholt); Dubletten gegen die LLM-Claims per normalisiertem Zitat vermeiden.
  const llmKeys = new Set(llmClaims.map((c) => normalizeWs(c.zitat)));
  const rechtsfolgen = detectRechtsfolgen(finalText, groundTruth).filter(
    (c) => !llmKeys.has(normalizeWs(c.zitat))
  );
  const claims = [...llmClaims, ...rechtsfolgen];
  const zuNeutralisieren = claims.filter((c) => NEUTRALISIEREN.includes(c.art));
  const vorschlagClaims = claims.filter((c) => c.art === "vorschlag");
  const vorschlaege = vorschlagClaims.map((c) => c.zitat);
  const vorschlaegeBegruendung = vorschlagClaims.map((c) => ({ zitat: c.zitat, warum: c.warum }));

  // Nichts zu neutralisieren → Text unveraendert lassen (Vorschlaege bleiben drin
  // und werden nur aufgelistet). Kein Repair-Call.
  if (zuNeutralisieren.length === 0) {
    return { finalText, neutralisiert: [], vorschlaege, vorschlaegeBegruendung, remaining: [], repaired: false, usages };
  }

  const rev = await deps.revise(
    FACT_VERIFICATION_REPAIR_SYSTEM,
    buildFactVerificationRepairPrompt(finalText, zuNeutralisieren)
  );
  usages.push({ model: deps.models.revise, usage: rev.usage });

  const candidate = typeof rev.value === "string" && rev.value.trim() ? rev.value : finalText;

  const beforePresent = countPresent(finalText, zuNeutralisieren);
  const afterPresent = countPresent(candidate, zuNeutralisieren);
  const lengthOk = candidate.length >= finalText.length * MIN_LENGTH_RATIO;
  const noNewHard =
    hardHallucinationCount(candidate, groundTruth) <= hardHallucinationCount(finalText, groundTruth);
  const accept = lengthOk && afterPresent < beforePresent && noNewHard;

  const result = accept ? candidate : finalText;
  // Vorschlaege, die nach dem Repair noch im Text stehen, dem Nutzer vorlegen.
  const vorschlagClaimsImText = claims.filter(
    (c) => c.art === "vorschlag" && quotePresent(result, c.zitat)
  );

  return {
    finalText: result,
    neutralisiert: zuNeutralisieren.map((c) => c.zitat),
    vorschlaege: vorschlagClaimsImText.map((c) => c.zitat),
    vorschlaegeBegruendung: vorschlagClaimsImText.map((c) => ({ zitat: c.zitat, warum: c.warum })),
    remaining: zuNeutralisieren.filter((c) => quotePresent(result, c.zitat)).map((c) => c.zitat),
    repaired: accept,
    usages,
  };
}
