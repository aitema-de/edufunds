import type { Foerderprogramm, ProgrammStatus } from "@/lib/foerderSchema";

/**
 * Der EINZIGE Status, unter dem ein Programm im Finder/Matcher erscheinen und
 * damit verkauft werden darf. Die Liste aller Werte steht in `PROGRAMM_STATUS`
 * (lib/foerderSchema.ts) — hier faellt nur die Entscheidung, welcher davon
 * anbietbar ist.
 */
export const STATUS_ANBIETBAR: ProgrammStatus = "aktiv";

/**
 * Gehoert dieses Programm NICHT in den aktiven Katalog (unabhaengig von Fristen)?
 *
 * Bewusst eine ALLOWLIST (fail-closed): Nur exakt `aktiv` ist anbietbar, alles
 * andere nicht — archiviert, review_needed, ein spaeter ergaenzter Status, ein
 * Tippfehler, ein fehlendes Feld.
 *
 * Vorher war das eine SPERRLISTE ("archiviert"/"review_needed"/"abgelaufen"/
 * "beendet" → terminal, sonst anbietbar). Eine Sperrliste muss jeden schlechten
 * Fall im Voraus kennen und schweigt bei allem, was sie nicht kennt — der
 * unbekannte Wert wird dann still VERKAUFT. Das war am 17.07.2026 real: Das
 * Schema erlaubte `pausiert` und `auslaufend`, beide standen auf keiner
 * Sperrliste. Ein pausiertes Programm waere also weiter angeboten worden.
 *
 * Fuer die heutigen Daten ist die Umstellung verhaltensgleich (aktiv → anbietbar,
 * archiviert → nicht); sie schliesst nur die Luecke fuer alles Unbekannte.
 */
export function isStatusNichtAnbietbar(p: Foerderprogramm): boolean {
  return (p as { status?: string }).status !== STATUS_ANBIETBAR;
}

/**
 * Ein Programm gehoert NICHT in den aktiven Finder (und damit ins Archiv), wenn
 *  - sein Status nicht `aktiv` ist (s. o.), ODER
 *  - sein Bewerbungsfrist-Ende nachweislich in der Vergangenheit liegt
 *    (bewerbungsfristEnde < heute).
 *
 * Programme OHNE `bewerbungsfristEnde` und mit Status `aktiv` gelten hier als
 * laufend.
 *
 * ⚠️ BEKANNTE LUECKE (17.07.2026, dokumentiert statt stillschweigend):
 * `bewerbungsfristEnde` ist bei 173 von 189 Programmen NICHT gesetzt. Fuer diese
 * ist "laeuft rollend" von "Frist nicht erfasst" nicht unterscheidbar — beides
 * ist ein fehlendes Feld, und diese Funktion liest es als "laeuft". So wurde ein
 * Antrag fuer den Foerderfonds Demokratie verkauft, dessen einziger Stichtag am
 * 30.09.2019 lag ("Momentan sind keine Antraege moeglich", Website Stand 01/2026).
 * Die Wahrheit stand dabei im Katalog — nur im Freitextfeld
 * `bewerbungsfristText`, das kein Code liest.
 *
 * Diese Funktion kann das nicht heilen: Sie kann ein Feld, das es nicht gibt,
 * nicht pruefen. Die Loesung ist ein expliziter Zustand "Frist unbekannt" im
 * Datenmodell (statt undefined) plus Quellenbeleg — bis dahin werden betroffene
 * Programme redaktionell auf `archiviert` gesetzt.
 */
export function isProgrammAbgelaufen(p: Foerderprogramm, now: Date = new Date()): boolean {
  if (isStatusNichtAnbietbar(p)) return true;
  const ende = p.bewerbungsfristEnde;
  if (ende) {
    const d = new Date(ende);
    if (!Number.isNaN(d.getTime()) && d < now) return true;
  }
  return false;
}
