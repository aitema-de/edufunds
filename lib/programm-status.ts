import type { Foerderprogramm } from "@/lib/foerderSchema";

/**
 * Ein Programm gilt als ABGELAUFEN, wenn
 *  - sein Bewerbungsfrist-Ende nachweislich in der Vergangenheit liegt
 *    (bewerbungsfristEnde < heute), ODER
 *  - sein Status es explizit als beendet/abgelaufen markiert.
 *
 * Programme OHNE Enddatum ("laufend"/rolling) sind NICHT abgelaufen.
 *
 * Hintergrund: Das Archiv filterte frueher auf `status === "abgelaufen"` — diesen
 * Wert setzt der Katalog nie, also war das Archiv immer leer, obwohl Programme mit
 * vergangener Frist im aktiven Katalog auftauchten. Diese Funktion ist die eine
 * gemeinsame Quelle fuer „abgelaufen?" (Archiv einschliessen, Katalog/Matcher
 * ausschliessen).
 */
export function isProgrammAbgelaufen(p: Foerderprogramm, now: Date = new Date()): boolean {
  const status = (p as { status?: string }).status;
  if (status === "abgelaufen" || status === "beendet") return true;
  const ende = p.bewerbungsfristEnde;
  if (ende) {
    const d = new Date(ende);
    if (!Number.isNaN(d.getTime()) && d < now) return true;
  }
  return false;
}
