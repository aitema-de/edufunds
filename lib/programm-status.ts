import type { Foerderprogramm } from "@/lib/foerderSchema";

/**
 * TERMINALE Status: Programme, die redaktionell aus dem aktiven Katalog genommen
 * wurden und dort nie wieder auftauchen sollen — alte Wettbewerbsrunden, Dubletten,
 * eingestellte Programme ("archiviert") oder noch nicht freigegebene Rohdaten
 * ("review_needed"). Anders als eine abgelaufene Frist ist das kein Zeit-, sondern
 * ein Zustandsurteil.
 *
 * Reale Katalog-Werte: "aktiv" / "archiviert" / "review_needed". Die alten Werte
 * "abgelaufen"/"beendet" setzt der Katalog nie, werden aber defensiv mitgefuehrt.
 */
export function isProgrammTerminalerStatus(p: Foerderprogramm): boolean {
  const status = (p as { status?: string }).status;
  return (
    status === "archiviert" ||
    status === "review_needed" ||
    status === "abgelaufen" ||
    status === "beendet"
  );
}

/**
 * Ein Programm gehoert NICHT in den aktiven Finder (und damit ins Archiv), wenn
 *  - es einen terminalen Status hat (archiviert/review_needed/beendet), ODER
 *  - sein Bewerbungsfrist-Ende nachweislich in der Vergangenheit liegt
 *    (bewerbungsfristEnde < heute).
 *
 * Programme OHNE Enddatum ("laufend"/rolling) und mit Status "aktiv" sind NICHT
 * abgelaufen.
 *
 * Hintergrund: Das Archiv filterte frueher auf `status === "abgelaufen"` — diesen
 * Wert setzt der Katalog nie, also war das Archiv immer leer, obwohl Programme mit
 * vergangener Frist im aktiven Katalog auftauchten. Zusaetzlich fielen archivierte
 * Programme OHNE Enddatum (z. B. eingestellte Stiftungsfoerderungen, "keine
 * Ausschreibungen mehr") durch den Rost und blieben im oeffentlichen Finder sichtbar.
 * Diese Funktion ist die eine gemeinsame Quelle fuer die Trennlinie Katalog/Archiv
 * (Archiv einschliessen, Finder/Matcher ausschliessen) — deckungsgleich mit dem
 * Ausschluss in lib/wizard/matcher.ts.
 */
export function isProgrammAbgelaufen(p: Foerderprogramm, now: Date = new Date()): boolean {
  if (isProgrammTerminalerStatus(p)) return true;
  const ende = p.bewerbungsfristEnde;
  if (ende) {
    const d = new Date(ende);
    if (!Number.isNaN(d.getTime()) && d < now) return true;
  }
  return false;
}
