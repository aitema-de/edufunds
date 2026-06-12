/**
 * Datenminimierung am Dritt-Land-Transfer (DSGVO Art. 5 Abs. 1 lit. c, Art. 44 ff.).
 *
 * Der LLM-Provider verarbeitet Prompts AUSSERHALB des EU-DB-Hosts (Hetzner DE).
 * Bevor Nutzer-Freitext das Haus verlaesst, entfernt dieser Scrubber hochpraezise
 * personenbezogene IDENTIFIKATOREN (E-Mail, Telefon/Fax, IBAN), die ein
 * Foerderantrag inhaltlich NIE braucht.
 *
 * Bewusste Grenzen:
 *  - KEINE Namens-Heuristik. Namen automatisch zu schwaerzen produziert zu viele
 *    Fehltreffer (zerstoert legitime Inhalte wie Programm-/Ortsnamen). Der Schutz
 *    auf Namens-/Schuelerdaten-Ebene laeuft ueber (a) den UI-Hinweis am Wizard-
 *    Start und (b) die Fakt-Verifikation der Pipeline, NICHT ueber Loeschung hier.
 *  - Praezision vor Vollstaendigkeit: lieber einen Identifikator durchlassen als
 *    eine legitime Zahl (Budget, Jahr, Menge), ein Datum, eine Uhrzeit oder eine
 *    URL zerstoeren. Die Muster sind deshalb eng gefasst.
 *
 * Anwendung am EINZIGEN Provider-Engpass (lib/wizard/llm.ts) auf den `user`-Prompt
 * — damit greift die Minimierung provider-unabhaengig in ALLEN Pipeline-Stufen
 * (Matcher, Interviewer, Fakt-Extraktion, Section, Critique, Revision).
 */

export type PiiKind = "email" | "phone" | "iban";

export interface PiiHit {
  kind: PiiKind;
  match: string;
}

const PLACEHOLDER: Record<PiiKind, string> = {
  email: "[E-Mail entfernt]",
  phone: "[Telefon entfernt]",
  iban: "[IBAN entfernt]",
};

// Reihenfolge ist wichtig: IBAN VOR Telefon schwaerzen, sonst greift das
// Telefon-Muster (c) in die Ziffernbloecke einer IBAN.
const PATTERNS: { kind: PiiKind; src: string; flags: string }[] = [
  // IBAN (DE): DE + 2 Pruefziffern + 18 Stellen, optionale 4er-Gruppen.
  { kind: "iban", src: "\\bDE\\d{2}(?:[ ]?\\d{4}){4}[ ]?\\d{2}\\b", flags: "gi" },

  // E-Mail: Standard. Faengt KEINE blanke URL (kein @-Zeichen darin).
  { kind: "email", src: "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", flags: "gi" },

  // Telefon/Fax — bewusst KONSERVATIV (Budgets/Jahre/Mengen/Daten/Uhrzeiten
  // sollen NICHT getroffen werden):
  //   (a) internationale Vorwahl:  +49 531 1234567
  { kind: "phone", src: "\\+49[\\s/().-]?\\d(?:[\\s/().-]?\\d){5,}", flags: "g" },
  //   (b) gelabelt:                Tel.: 0531 1234567 / Fax 030 12345678
  { kind: "phone", src: "(?:tel\\.?|telefon|fax|mobil|handy)\\s*:?\\s*\\+?\\d(?:[\\s/().-]?\\d){5,}", flags: "gi" },
  //   (c) deutsche Vorwahl MIT Trennzeichen + >=3 weitere Ziffern:
  //       0531/1234567, 030 12345678 — trifft NICHT "10 000", "2026", "08:00".
  { kind: "phone", src: "\\b0\\d{1,5}[\\s/-]\\d{3,}(?:[\\s/-]?\\d+)*\\b", flags: "g" },
];

/** Findet alle hochpraezisen PII-Identifikatoren. Exportiert fuer Tests/Telemetrie. */
export function findPii(text: string): PiiHit[] {
  if (!text) return [];
  const hits: PiiHit[] = [];
  for (const { kind, src, flags } of PATTERNS) {
    const re = new RegExp(src, flags);
    for (const m of text.matchAll(re)) hits.push({ kind, match: m[0] });
  }
  return hits;
}

/**
 * Entfernt hochpraezise PII-Identifikatoren aus einem Prompt-Text, bevor er an
 * den externen LLM-Provider geht. Gibt den bereinigten Text plus die Anzahl der
 * Schwaerzungen zurueck (fuer Logging/Telemetrie — der PII-Inhalt selbst wird
 * NICHT geloggt).
 */
export function scrubPiiForLlm(text: string): { text: string; redactions: number } {
  if (!text) return { text, redactions: 0 };
  let out = text;
  let count = 0;
  for (const { kind, src, flags } of PATTERNS) {
    const re = new RegExp(src, flags);
    out = out.replace(re, () => {
      count++;
      return PLACEHOLDER[kind];
    });
  }
  return { text: out, redactions: count };
}
