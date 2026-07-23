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
 * liefert (07.07.2026: 23 archivierte Datensaetze aus der Zaehlung genommen;
 * 08.07.2026: 9 weitere Programme ohne Antragsmoeglichkeit archiviert ->
 * Finder-sichtbar 152 -> "150+"; 17.07.2026: 4 Programme ohne offene Runde
 * archiviert -> Finder-sichtbar 148 -> "140+"; 22.07.2026: Frist-Verifikation
 * aller 'unbekannt'-Programme -> 8 weitere ohne offenen Antragsweg als
 * fristZustand=geschlossen belegt (Berlin Startchancen = Landesauswahl ohne
 * Bewerbung, KI-Schulpreis/Town&Country/SH-Kultur/Berliner-Jugendbudget zwischen
 * den Runden, EVZ Bildungsagenda, deine-idee, innogy=Domain tot) ->
 * Finder-sichtbar 133 -> "130+"; 22.07.2026 spaet: Rest-'unbekannt'
 * primaerquellen-geprueft, 4 weitere ohne Antragsweg als geschlossen belegt
 * (hector = nur Nominierung, heinz-nixdorf = 'bittet von Foerderantraegen
 * abzusehen', ideeninitiative = letzte Runde 2023, saechs. Schulgarten-
 * wettbewerb = 12. Runde seit 05/2024 beendet) -> Finder-sichtbar 129 -> "120+";
 * 23.07.2026: hopp-foundation-schulpreis geschlossen (Bestaetigung: verliehener
 * Preis bei Jugend-forscht-Landeswettbewerben, kein Bewerbungsverfahren) ->
 * Finder-sichtbar 128 -> "120+" unveraendert).
 *
 * WICHTIG: Bewusst KEIN Import von data/foerderprogramme.json hier — diese
 * Konstante wird auch in Client-Komponenten (Header, Footer, Hero) genutzt,
 * und der 297-KB-JSON-Import wuerde das Client-Bundle aufblaehen.
 *
 * PFLEGE: Waechst oder schrumpft der aktive Katalog ueber eine Zehnerstelle
 * hinweg, hier EINMAL anpassen — __tests__/lib/programm-count.test.ts schlaegt
 * in beide Richtungen an und nennt den Ist-Wert.
 *
 * Den realen Count NICHT mehr per Einzeiler nachbauen: Hier stand bis 17.07.2026
 * eine Kopie der alten Sperrlisten-Logik (['archiviert','review_needed',
 * 'abgelaufen','beendet']). Das Gate arbeitet inzwischen als Allowlist (nur
 * "aktiv" zaehlt) — die Kopie war eine zweite Wahrheit, die still driftete.
 * Massgeblich ist lib/programm-status.ts#isProgrammAbgelaufen; der Test oben
 * ruft genau die auf.
 */

/**
 * Auf die naechste Zehnerstelle abgerundete AKTIVE Programm-Anzahl.
 * Wird von __tests__/lib/programm-count.test.ts gegen den echten Katalog
 * geprueft — sowohl gegen Ueberzeichnen als auch gegen unnoetige Bescheidenheit.
 */
export const PROGRAMM_COUNT_ROUNDED = 120;

/** Marketing-Label, z. B. "180+" — fuer Stats-Karten/Badges. */
export const PROGRAMM_COUNT_LABEL = `${PROGRAMM_COUNT_ROUNDED}+`;
