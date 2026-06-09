# COMPASS - LESSONS LEARNED & PROZESS-VERBESSERUNG

## Fehler-Analyse: Mercator "Digitale Bildung Grundschule"

### Was schiefging:
1. **Link defekt:** Programm hat 404-Fehler
2. **Nicht auffindbar:** Suche findet das Programm nicht
3. **Agent hat nicht geprüft:** Compass hat offensichtlich nicht jeden Link manuell getestet

### Warum der Fehler passierte:
- Automatisierte Checks reichen nicht
- Keine manuelle Stichprobe bei kritischen Programmen
- Keine funktionierende Such-Indexierung

---

## KONKRETE MASSNAHMEN (ab sofort)

### 1. Verpflichtende manuelle Link-Prüfung
**JEDES** neue Programm muss:
- [ ] Link im Browser geöffnet werden
- [ ] Seite muss laden (kein 404)
- [ ] Programm muss tatsächlich existieren
- [ ] Screenshot als Beweis

### 2. Suchfunktion-Check
**JEDES** neue Programm muss:
- [ ] Über die Suche auffindbar sein
- [ ] In der Kategorie-Liste erscheinen
- [ ] Auf der Übersichtsseite sichtbar sein

### 3. Redundante Prüfung
- Scout erfasst → Compass verifiziert → **Ich (Milo) stichproben**
- Bei 10% der Programme manuelle Kontrolle

### 4. Fehler-Logging
Jeder gefundene Fehler wird dokumentiert:
- Was wurde übersehen?
- Warum?
- Wie wird es verhindert?

---

## Sofort-Aufgabe für Compass:

1. **Alle Mercator-Programme prüfen**
   - Digitale Bildung
   - Integration
   - Alle anderen

2. **Suchindex reparieren**
   - Warum wird das Programm nicht gefunden?
   - Ist es im JSON aber nicht im Build?

3. **Report erstellen**
   - Welche Programme haben defekte Links?
   - Welche sind nicht auffindbar?

---

*Prozess-Update: 2026-02-13*
