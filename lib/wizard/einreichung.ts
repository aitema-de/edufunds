/**
 * Aufbereitung der Einreichungs-Informationen aus einem Richtlinien-Dossier
 * fuer die Anzeige: WIE/WO der Antrag eingereicht wird (einreichungsweg) und
 * WELCHE Unterlagen noetig sind (anlagen). Server- wie clientseitig nutzbar
 * (reine Datenfunktionen, kein I/O).
 */

import type { Richtlinie } from "./richtlinien-schema";

export interface EinreichungInfo {
  einreichungsweg?: string;
  anlagen?: string[];
  bearbeitungsdauer?: string;
}

/**
 * Liest die Einreichungs-relevanten Felder aus richtlinie.antragsstruktur.
 * Gibt null zurueck, wenn weder ein einreichungsweg noch Anlagen vorhanden
 * sind — die UI faellt dann auf generische Hinweise zurueck.
 */
export function getEinreichung(
  richtlinie: Richtlinie | null | undefined,
): EinreichungInfo | null {
  const struktur = richtlinie?.antragsstruktur;
  if (!struktur) return null;

  const einreichungsweg =
    typeof struktur.einreichungsweg === "string" && struktur.einreichungsweg.trim()
      ? struktur.einreichungsweg
      : undefined;
  const anlagen =
    Array.isArray(struktur.anlagen) && struktur.anlagen.length > 0
      ? struktur.anlagen
      : undefined;
  const bearbeitungsdauer =
    typeof struktur.bearbeitungsdauer === "string" && struktur.bearbeitungsdauer.trim()
      ? struktur.bearbeitungsdauer
      : undefined;

  if (!einreichungsweg && !anlagen) return null;

  return { einreichungsweg, anlagen, bearbeitungsdauer };
}

/**
 * best-effort Anzeige-Fix; vollstaendige Dossier-Umlaut-Bereinigung ist ein
 * separater Daten-Schritt. Die Dossier-Texte sind ASCII-kodiert
 * (Foerderportal/Traeger/Gemeinnuetzigkeit). Wir wenden NUR diese kuratierten,
 * sicheren Ersetzungen an (Reihenfolge wie gelistet) — KEIN ss->ss, KEIN
 * generisches ae/oe/ue, weil das Woerter wie "aktuelle"/"Quelle" zerstoeren wuerde.
 */
export function fixDisplayUmlaut(s: string): string {
  if (!s) return s;
  let out = s;

  // Prefix/Teilstring (global, ueberall im Wort).
  const teilstring: Array<[RegExp, string]> = [
    [/Foerder/g, "Förder"],
    [/foerder/g, "förder"],
    [/Traeger/g, "Träger"],
    [/traeger/g, "träger"],
    [/Gemeinnuetzig/g, "Gemeinnützig"],
    [/gemeinnuetzig/g, "gemeinnützig"],
  ];
  for (const [re, rep] of teilstring) out = out.replace(re, rep);

  // Ganzwort (mit Wortgrenzen, global).
  const ganzwort: Array<[RegExp, string]> = [
    [/\bfuer\b/g, "für"],
    [/\bueber\b/g, "über"],
    [/\bkoennen\b/g, "können"],
    [/\bmuessen\b/g, "müssen"],
    [/\bgueltig\b/g, "gültig"],
    [/\bzustaendig\b/g, "zuständig"],
    [/\bZustaendig\b/g, "Zuständig"],
    [/\bBehoerde\b/g, "Behörde"],
    [/\bBehoerden\b/g, "Behörden"],
    [/\bnaehere\b/g, "nähere"],
    [/\bVerfuegung\b/g, "Verfügung"],
    [/\bAntraege\b/g, "Anträge"],
    [/\bPruefung\b/g, "Prüfung"],
    [/\bpruefen\b/g, "prüfen"],
    [/\bGebuehr\b/g, "Gebühr"],
    [/\bGebuehren\b/g, "Gebühren"],
    [/\bermoeglichen\b/g, "ermöglichen"],
    [/\bberuecksichtigen\b/g, "berücksichtigen"],
    [/\bzusaetzlich\b/g, "zusätzlich"],
    [/\bspaetestens\b/g, "spätestens"],
    [/\bvollstaendig\b/g, "vollständig"],
    [/\bVollstaendig\b/g, "Vollständig"],
  ];
  for (const [re, rep] of ganzwort) out = out.replace(re, rep);

  return out;
}
