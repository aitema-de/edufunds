/**
 * Einzige Quelle fuer die nach aussen kommunizierte Anzahl der Foerderprogramme.
 *
 * Hintergrund: Die Zahl stand frueher als Hardcode an vielen Stellen
 * (50+, 130+, "ueber 135", 160+) und driftete auseinander. Damit das nicht
 * wieder passiert, kommt sie ueberall aus diesem Modul.
 *
 * Regel: Der AKTIVE Katalog-Bestand (ohne archivierte/abgelaufene Programme —
 * genau das, was der oeffentliche Finder zeigt) wird auf die naechste Zehnerstelle
 * ABGERUNDET und mit "+" kommuniziert (z. B. 161 aktive Programme -> "160+").
 * Bewusst nicht der exakte Wert: rund + "+" bleibt laenger korrekt und wirkt
 * serioeser — und die Zahl darf nicht ueberzeichnen, was der Finder tatsaechlich
 * liefert (07.07.2026: 23 archivierte Datensaetze aus der Zaehlung genommen).
 *
 * WICHTIG: Bewusst KEIN Import von data/foerderprogramme.json hier — diese
 * Konstante wird auch in Client-Komponenten (Header, Footer, Hero) genutzt,
 * und der 297-KB-JSON-Import wuerde das Client-Bundle aufblaehen.
 *
 * PFLEGE: Waechst der aktive Katalog ueber die naechste Zehnerstelle (aktuell 161
 * -> sobald >= 170), hier EINMAL erhoehen. Realen AKTIV-Count zeigt (Logik
 * deckungsgleich mit lib/programm-status.ts#isProgrammAbgelaufen):
 *   node -e "const d=require('./data/foerderprogramme.json'),n=new Date(),t=p=>['archiviert','review_needed','abgelaufen','beendet'].includes(p.status),x=p=>t(p)||(p.bewerbungsfristEnde&&new Date(p.bewerbungsfristEnde)<n);console.log(d.filter(p=>!x(p)).length)"
 */

/** Auf die naechste Zehnerstelle abgerundete AKTIVE Programm-Anzahl. */
export const PROGRAMM_COUNT_ROUNDED = 160;

/** Marketing-Label, z. B. "180+" — fuer Stats-Karten/Badges. */
export const PROGRAMM_COUNT_LABEL = `${PROGRAMM_COUNT_ROUNDED}+`;
