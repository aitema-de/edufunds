/**
 * Eigene Stage zur strukturierten Fakten-Extraktion aus dem Interview-Verlauf.
 *
 * Hintergrund (UAT 2026-04-28, Bug #5): Der Interviewer hat zwei Aufgaben gleichzeitig
 * — naechste Frage entscheiden und Facts extrahieren — und vernachlaessigt dabei die
 * Extraktion. Slots wie schule.schuelerzahl, besonderheiten, messbare_indikatoren
 * blieben null, obwohl die Information in den User-Antworten stand. Die Pipeline
 * fiel in der Folge auf messages zurueck oder halluzinierte.
 *
 * Diese Stage bekommt ALLE bisherigen User-Antworten + den aktuellen Facts-Stand,
 * geht systematisch jeden Slot durch und befuellt was sich ableiten laesst.
 * Faellt der Call aus (LLM-Error/Timeout), behaelt der Aufrufer den bisherigen
 * Facts-Stand — kein Crash, nur Daten-Luecke.
 */
import { FACTS_EXTRACTOR_SYSTEM, buildFactsExtractorUserPrompt } from "./prompts";
import { MODEL_INTERVIEW, generateJson } from "./llm";
import type { Usage } from "./pricing";
import type { WizardFacts, WizardMessage } from "./types";

export interface FactsExtractionResult {
  facts: WizardFacts;
  /** null, wenn die Extraktion fehlschlug — Aufrufer behaelt dann den alten Stand. */
  usage: { model: string; usage: Usage } | null;
}

export async function extractFacts(
  messages: WizardMessage[],
  currentFacts: WizardFacts
): Promise<FactsExtractionResult> {
  const answers = messages.filter((m) => m.role === "user" && m.kind === "answer");
  if (answers.length === 0) {
    return { facts: currentFacts, usage: null };
  }

  const user = buildFactsExtractorUserPrompt(messages, currentFacts);
  try {
    // temperature 0: Die Extraktion ist eine Lese-Aufgabe, kein Formulieren. Ohne
    // gesetzten Wert laeuft sie auf dem Anbieter-Default und liefert fuer denselben
    // Verlauf mal Fakten, mal `{}` (gemessen 31.07.2026). Fuer eine Stufe, deren
    // Ergebnis Interviewer-Steuerung, Bezahl-Schranke und Generierung speist, ist
    // dieser Zufall nicht hinnehmbar.
    const { value, usage } = await generateJson<Partial<WizardFacts>>(
      MODEL_INTERVIEW,
      FACTS_EXTRACTOR_SYSTEM,
      user,
      { temperature: 0 }
    );
    const merged = mergeFacts(currentFacts, normalisiereSchluessel(value));
    return { facts: merged, usage: { model: MODEL_INTERVIEW, usage } };
  } catch (err) {
    // Extraktion ist nice-to-have — der Interviewer-Pfad geht weiter mit dem
    // alten Facts-Stand. Wir loggen, damit es im Server-Log auffaellt.
    console.warn("[wizard/facts-extractor] Extraktion fehlgeschlagen, behalte bisherigen Stand:", err);
    return { facts: currentFacts, usage: null };
  }
}

/**
 * Zieht deutsche Schluessel-Schreibweisen auf die ASCII-Namen des Schemas.
 *
 * WARUM: Am 18.08.2026 hat ein Sweep "echte Umlaute statt ae/oe/ue" (1187efe)
 * im FACTS-Schema des Prompts die SCHLUESSEL mit umgestellt — aus
 * "schuelerzahl" wurde "schülerzahl", aus "aktivitaeten" wurde "aktivitäten".
 * `WizardFacts` und die 25 Stellen, die diese Slots lesen, blieben ASCII. Die
 * Werte kamen also weiter an, nur unter einem Namen, den niemand liest: still
 * verlorene Schulgroesse und Projekt-Aktivitaeten.
 *
 * Der Prompt ist wieder ASCII. Diese Normalisierung bleibt als Fangnetz — ein
 * Modell darf jederzeit die deutsche Schreibweise liefern, und ein Slot, der
 * lautlos ins Leere laeuft, faellt erst Wochen spaeter auf. Exportiert fuer Tests.
 */
export const FACTS_SCHLUESSEL_ALIAS: Readonly<Record<string, string>> = {
  "schülerzahl": "schuelerzahl",
  "aktivitäten": "aktivitaeten",
  "größe": "groesse",
  "begründung": "begruendung",
  "zugehörigkeit": "zugehoerigkeit",
};

export function normalisiereSchluessel<T>(wert: T): T {
  if (Array.isArray(wert)) {
    return wert.map((v) => normalisiereSchluessel(v)) as unknown as T;
  }
  if (wert === null || typeof wert !== "object") return wert;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(wert as Record<string, unknown>)) {
    const ziel = FACTS_SCHLUESSEL_ALIAS[k] ?? k;
    // Ein bereits vorhandener ASCII-Schluessel gewinnt — sonst ueberschreibt
    // eine leere Umlaut-Variante einen gefuellten Wert.
    if (ziel in out && (v === null || v === undefined || v === "")) continue;
    out[ziel] = normalisiereSchluessel(v);
  }
  return out as unknown as T;
}

/**
 * Merged ein partielles Update in den bisherigen Facts-Stand.
 *
 * Regeln:
 * - Objekt-Slots (schule, projekt, ...) werden flach gemerged: neue Felder kommen
 *   dazu, bestehende werden nur ueberschrieben, wenn das Update einen nicht-leeren
 *   Wert hat.
 * - Array-Slots werden ersetzt, wenn das Update ein Array liefert (Extractor sieht
 *   den ganzen Verlauf, also ist seine Liste autoritativ — sonst koennen alte
 *   Items nie mehr verschwinden, wenn der User in einem Re-Edit anders antwortet).
 * - null/undefined/"" im Update sind no-ops — sie loeschen NICHTS.
 */
export function mergeFacts(
  base: WizardFacts,
  update: Partial<WizardFacts> | undefined
): WizardFacts {
  if (!update) return base;
  const out: WizardFacts = { ...base };
  for (const [k, v] of Object.entries(update)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      out[k] = v;
      continue;
    }
    if (typeof v === "object") {
      const baseObj = (base[k] as Record<string, unknown> | undefined) ?? {};
      const merged: Record<string, unknown> = { ...baseObj };
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        if (v2 === null || v2 === undefined || v2 === "") continue;
        merged[k2] = v2;
      }
      out[k] = merged;
      continue;
    }
    out[k] = v;
  }
  return out;
}
