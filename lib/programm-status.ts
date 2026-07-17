import type { Foerderprogramm, ProgrammStatus } from "@/lib/foerderSchema";
import type { FristZustand } from "@/lib/foerder-zustaende";

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
 * Ist die Bewerbungsfrist eines Programms VERKAUFSFAEHIG, d. h. belegt offen?
 *
 * Zwei Wege, in dieser Reihenfolge:
 *
 * 1. Maschinenlesbarer `fristZustand` vorhanden (der Nachfolger, s.
 *    lib/foerder-zustaende.ts) — FAIL-CLOSED:
 *      - "keine"     (belegt rollend)                  => verkaufsfaehig
 *      - "stichtag"  wiederkehrend                     => verkaufsfaehig
 *      - "stichtag"  letzter Termin heute/spaeter      => verkaufsfaehig
 *      - "stichtag"  alle Termine vergangen            => NICHT
 *      - "unbekannt" (nicht erfasst)                   => NICHT
 *
 * 2. Kein `fristZustand` — LEGACY-Fallback auf `bewerbungsfristEnde`:
 *    verkaufsfaehig, solange kein Ende in der Vergangenheit belegt ist.
 *
 * ⚠️ Die LEGACY-Luecke (17.07.2026): `bewerbungsfristEnde` ist bei den meisten
 * Programmen NICHT gesetzt, und dann ist "laeuft rollend" von "Frist nicht
 * erfasst" nicht unterscheidbar — beides ein fehlendes Feld, das der Fallback
 * als "laeuft" liest. So wurde ein Antrag fuer den Foerderfonds Demokratie
 * verkauft, dessen einziger Stichtag am 30.09.2019 lag. `fristZustand` schliesst
 * genau diese Luecke — pro migriertem Programm. Bis ein Programm migriert ist,
 * gilt der Legacy-Weg; die Groesse der offenen Luecke haelt
 * __tests__/data/katalog-fristen.test.ts fest.
 */
export function istFristVerkaufsfaehig(
  p: Foerderprogramm,
  now: Date = new Date()
): boolean {
  const fz: FristZustand | undefined = p.fristZustand;

  if (fz) {
    switch (fz.art) {
      case "keine":
        return true;
      case "stichtag": {
        if (fz.jaehrlichWiederkehrend) return true;
        // Der spaeteste belegte Termin entscheidet.
        const gueltige = fz.stichtage
          .map((s) => new Date(s))
          .filter((d) => !Number.isNaN(d.getTime()));
        if (gueltige.length === 0) return false; // belegter, aber unlesbarer Termin -> fail-closed
        const letzter = gueltige.reduce((a, b) => (a > b ? a : b));
        return letzter >= now;
      }
      case "unbekannt":
        return false;
    }
  }

  // Legacy-Fallback: nur ein belegtes Ende in der Vergangenheit sperrt.
  const ende = p.bewerbungsfristEnde;
  if (ende) {
    const d = new Date(ende);
    if (!Number.isNaN(d.getTime()) && d < now) return false;
  }
  return true;
}

/**
 * Ein Programm gehoert NICHT in den aktiven Finder (und damit ins Archiv), wenn
 *  - sein Status nicht `aktiv` ist (s. o.), ODER
 *  - seine Bewerbungsfrist nicht verkaufsfaehig ist (s. istFristVerkaufsfaehig:
 *    fail-closed bei fristZustand, Legacy-Fallback auf bewerbungsfristEnde).
 */
export function isProgrammAbgelaufen(p: Foerderprogramm, now: Date = new Date()): boolean {
  if (isStatusNichtAnbietbar(p)) return true;
  if (!istFristVerkaufsfaehig(p, now)) return true;
  return false;
}
