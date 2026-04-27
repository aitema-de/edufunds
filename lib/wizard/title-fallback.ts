/**
 * LLM-freier Antragstitel-Generator.
 *
 * Wird verwendet, wenn der Outline-Schritt der Pipeline keinen Titel via Gemini
 * erzeugen kann oder soll — z. B. wenn eine Richtlinie mit fester Antragsstruktur
 * uebernommen wird (kein Outline-Aufruf) oder wenn Gemini wegen Rate-Limit
 * (429) ausfaellt. Ergebnis ist nicht so spezifisch wie ein KI-generierter
 * Titel, aber praegnanter als der frueher hartkodierte Fallback
 * `Antrag auf Foerderung: ${programm.name}`.
 */

import type { WizardFacts } from "./types";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const MAX_LEN = 100;

function trim(s: string | undefined | null): string {
  if (!s) return "";
  return s.trim();
}

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

function pickFirst<T>(arr: T[] | undefined | null): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[0];
}

function dropTrailingPunctuation(s: string): string {
  return s.replace(/[.!?,;:]+\s*$/u, "");
}

function lowercaseFirst(s: string): string {
  if (!s) return s;
  return s[0]!.toLowerCase() + s.slice(1);
}

/**
 * Baut aus Wizard-Fakten und Programm-Metadaten einen sprechenden Antragstitel
 * — ohne LLM-Aufruf. Die Ausgabe ist auf {@link MAX_LEN} Zeichen begrenzt.
 *
 * Auswahl-Reihenfolge:
 * 1. Existierender `facts.projekt.titel` (sauber getrimmt).
 * 2. Erste Aktivitaet oder Hauptposten als Subjekt + Schulname (falls
 *    vorhanden) + Programmname.
 * 3. Schulname + Programmname.
 * 4. `facts.projekt.kurzbeschreibung` (gekuerzt) + Programmname.
 * 5. `Antrag auf Foerderung: ${programm.name}` (Letzt-Fallback).
 */
export function buildFallbackTitle(
  programm: Pick<Foerderprogramm, "name">,
  facts: WizardFacts
): string {
  const programmName = trim(programm.name) || "Foerderprogramm";

  // 1. Bereits gesetzter Titel
  const explicit = trim(facts.projekt?.titel);
  if (explicit) return shorten(explicit, MAX_LEN);

  const schule = trim(facts.schule?.name);
  const aktivitaet = trim(pickFirst(facts.projekt?.aktivitaeten));
  const hauptposten = trim(pickFirst(facts.budget?.hauptposten));
  const kurzbeschreibung = trim(facts.projekt?.kurzbeschreibung);

  const subject = aktivitaet || hauptposten;

  // 2. Subjekt (Aktivitaet/Hauptposten) + Schule + Programm
  if (subject && schule) {
    const s = dropTrailingPunctuation(subject);
    return shorten(`${s} — ${schule} (${programmName})`, MAX_LEN);
  }

  // 3. Subjekt allein + Programm
  if (subject) {
    const s = dropTrailingPunctuation(subject);
    return shorten(`${s}: Antrag bei ${programmName}`, MAX_LEN);
  }

  // 4. Schule allein + Programm
  if (schule) {
    return shorten(`${schule}: Antrag auf Foerderung durch ${programmName}`, MAX_LEN);
  }

  // 5. Kurzbeschreibung als Notnagel
  if (kurzbeschreibung) {
    const k = dropTrailingPunctuation(lowercaseFirst(kurzbeschreibung));
    return shorten(`Vorhaben: ${k} — Antrag bei ${programmName}`, MAX_LEN);
  }

  // 6. Generischer Fallback
  return shorten(`Antrag auf Foerderung: ${programmName}`, MAX_LEN);
}
