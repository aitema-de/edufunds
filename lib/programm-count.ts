/**
 * Einzige Quelle fuer die nach aussen kommunizierte Anzahl der Foerderprogramme.
 *
 * Hintergrund: Die Zahl stand frueher als Hardcode an vielen Stellen
 * (50+, 130+, "ueber 135", 160+) und driftete auseinander. Damit das nicht
 * wieder passiert, kommt sie ueberall aus diesem Modul.
 *
 * Regel: Realer Katalog-Bestand wird auf die naechste Zehnerstelle ABGERUNDET
 * und mit "+" kommuniziert (z. B. 188 Programme -> "180+"). Bewusst nicht der
 * exakte Wert: rund + "+" bleibt laenger korrekt und wirkt serioeser.
 *
 * WICHTIG: Bewusst KEIN Import von data/foerderprogramme.json hier — diese
 * Konstante wird auch in Client-Komponenten (Header, Footer, Hero) genutzt,
 * und der 297-KB-JSON-Import wuerde das Client-Bundle aufblaehen.
 *
 * PFLEGE: Waechst der Katalog ueber die naechste Zehnerstelle (aktuell 188 ->
 * sobald >= 190), hier EINMAL erhoehen. Realen Count zeigt:
 *   node -e "console.log(require('./data/foerderprogramme.json').length)"
 */

/** Auf die naechste Zehnerstelle abgerundete Programm-Anzahl. */
export const PROGRAMM_COUNT_ROUNDED = 180;

/** Marketing-Label, z. B. "180+" — fuer Stats-Karten/Badges. */
export const PROGRAMM_COUNT_LABEL = `${PROGRAMM_COUNT_ROUNDED}+`;
