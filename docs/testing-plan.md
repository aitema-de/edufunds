# Testing-Plan für KI-Antragsgenerator

## Übersicht

Diese Dokumentation beschreibt Test-Szenarien, Test-Stichworte und Bewertungskriterien für die Qualitätsprüfung des KI-Antragsgenerators.

## Test-Szenarien

### Szenario 1: DigitalPakt Schule 2.0 (BMBF)
**Programm-ID:** `bmbf-digitalpakt-2`
**Komplexität:** Hoch
**Fördersumme:** 10.000€ - 500.000€

#### Test-Stichworte Sets

**Set 1.1: Minimal (3 Keywords)**
```
["Tablets", "Grundschule", "Leseförderung"]
```
*Erwartung:* Grundfunktionalität, möglicherweise lückenhaft

**Set 1.2: Standard (5-7 Keywords)**
```
["Digitale Leseförderung", "Tablets", "Grundschule", "120 Kinder", "KI-gestützt", "Inklusion", "Kooperation Universität"]
```
*Erwartung:* Ausgewogener Antrag mit guten Details

**Set 1.3: Vollständig (10+ Keywords)**
```
["Digitale Leseförderung", "Tablets", "iPads", "Grundschule", "Klassen 1-4", "120 Kinder", "Risikogruppe", 
"KI-gestützte Analyse", "Individuelle Förderpläne", "Inklusion", "Kooperation Universität", 
"Lehrerfortbildung", "Wissenschaftliche Begleitung", "45.000€", "24 Monate"]
```
*Erwartung:* Hochdetaillierter, professioneller Antrag

**Set 1.4: Edge Case - Sehr spezifisch**
```
["MINT-Förderung", "Roboter-Programmierung", "Grundschule", "Mädchen", "20 Kinder", "Lego Education", 
"Kooperation TUM", "3. Klasse", "Nachmittagsbetreuung", "15.000€"]
```
*Erwartung:* Präziser, fokussierter Antrag

---

### Szenario 2: Telekom Stiftung MINT
**Programm-ID:** `telekom-mint`
**Komplexität:** Mittel
**Fördersumme:** 5.000€ - 30.000€

#### Test-Stichworte Sets

**Set 2.1: Naturwissenschaftliches Labor**
```
["Naturwissenschaftliches Forscherlabor", "Experimente", "Grundschule", "200 Kinder", 
"Praktische Forschung", "Sachunterricht", "MINT", "Kooperation Hochschule", "20.000€"]
```

**Set 2.2: Robotik-Projekt**
```
["Robotik", "Programmierung", "Grundschule", "3. und 4. Klasse", "BeeBots", "Lego WeDo", 
"Algorithmisches Denken", "40 Kinder", "Lehrerfortbildung", "Inklusion"]
```

**Set 2.3: Mathematik-Förderung**
```
["Mathematik-Förderung", "Rechenschwäche", "1. und 2. Klasse", "60 Kinder", 
"Spielerisches Lernen", "Mathe-Werkstatt", "Fördermaterial", "Elternarbeit", "Evaluation"]
```

---

### Szenario 3: Digital.Schule.NRW
**Programm-ID:** `nrw-digital`
**Komplexität:** Mittel
**Fördersumme:** 5.000€ - 100.000€

#### Test-Stichworte Sets

**Set 3.1: Digitale Infrastruktur**
```
["WLAN-Ausbau", "Digitale Ausstattung", "Grundschule", "200 Kinder", 
"Mobile Geräte", "Digitale Bildung", "Medienkompetenz", "Unterrichtsentwicklung", "80.000€"]
```

**Set 3.2: Medienkonzept**
```
["Medienkonzept", "Medienbildung", "Klasse 1-4", "150 Kinder", 
"Medienkompetenz", "Kritischer Medienumgang", "Elterninformationsveranstaltungen", "Lehrerfortbildung"]
```

---

## Qualitäts-Bewertungskriterien

### 1. Inhaltliche Qualität (40 Punkte)

| Kriterium | Beschreibung | Punkte |
|-----------|--------------|--------|
| **Vollständigkeit** | Alle wesentlichen Antragsfelder sind beantwortet | 10 |
| **Kohärenz** | Logischer Aufbau, zusammenhängende Argumentation | 10 |
| **Programm-Passung** | Antwortet auf Förderkriterien des Programms | 10 |
| **Innovation** | Innovative Elemente klar herausgearbeitet | 10 |

### 2. Sprachliche Qualität (30 Punkte)

| Kriterium | Beschreibung | Punkte |
|-----------|--------------|--------|
| **Aktive Sprache** | Keine Passivkonstruktionen, aktive Formulierungen | 10 |
| **Konkretheit** | Konkrete Daten statt vager Adjektive | 10 |
| **Professioneller Ton** | Fachsprache, angemessene Bildungssprache | 10 |

### 3. Strukturelle Qualität (20 Punkte)

| Kriterium | Beschreibung | Punkte |
|-----------|--------------|--------|
| **SMARTe Ziele** | Spezifisch, Messbar, Attraktiv, Realistisch, Terminiert | 10 |
| **Quantifizierung** | Zahlen, Daten, Fakten zu allen Zielgruppen/Outputs | 10 |

### 4. Technische Qualität (10 Punkte)

| Kriterium | Beschreibung | Punkte |
|-----------|--------------|--------|
| **JSON-Validität** | Korrektes JSON-Format | 5 |
| **Zeichenlimits** | Einhaltung der maximalen Zeichen pro Feld | 5 |

### Gesamtbewertung

| Score | Bewertung |
|-------|-----------|
| 90-100 | Ausgezeichnet (publikationsreif) |
| 80-89 | Gut (geringe Nacharbeit nötig) |
| 70-79 | Befriedigend (Nacharbeit erforderlich) |
| 60-69 | Ausreichend (erhebliche Überarbeitung) |
| <60 | Mangelhaft (neue Generierung empfohlen) |

---

## Test-Checkliste

### Funktionale Tests

- [ ] API-Endpoint `/api/generate-antrag` antwortet
- [ ] Alle 3 Programme funktionieren
- [ ] Fallback-Modus funktioniert ohne API-Key
- [ ] Rate-Limiting funktioniert
- [ ] Fehlermeldungen sind nutzerfreundlich

### Qualitäts-Tests (pro Programm)

- [ ] Test mit minimalen Stichworten (3)
- [ ] Test mit Standard-Stichworten (5-7)
- [ ] Test mit vollständigen Stichworten (10+)
- [ ] Test mit Edge Cases

### Review-Kriterien (manuelle Prüfung)

Für jeden generierten Antrag prüfen:

- [ ] Alle Sektionen enthalten Inhalt
- [ ] Keine Konjunktiv-Formulierungen (könnte, würde)
- [ ] Aktive Sprache ("Wir entwickeln" statt "Es wird entwickelt")
- [ ] Zielgruppe quantifiziert (Anzahl, Alter, Merkmale)
- [ ] Zeitplan konkret (Datum oder Monate)
- [ ] Budget begründet
- [ ] Innovation herausgearbeitet
- [ ] Nachhaltigkeit konkret beschrieben
- [ ] Max. 1 Adjektiv pro Satz
- [ ] These → Beleg → Nutzen Struktur erkennbar

---

## Automatisierte Tests (Vorschlag)

### Unit Tests

```typescript
// Beispiel-Teststruktur
describe("AntragPipeline", () => {
  describe("generateAntrag", () => {
    it("sollte Antrag mit gültigen Keywords generieren", async () => {
      // Test-Code
    });
    
    it("sollte Fallback nutzen bei fehlendem API-Key", async () => {
      // Test-Code
    });
    
    it("sollte Fehler werfen bei ungültigem Programm-ID", async () => {
      // Test-Code
    });
  });
  
  describe("Retry-Logik", () => {
    it("sollte bei 429 Retry versuchen", async () => {
      // Test-Code
    });
  });
});
```

### Integration Tests

```typescript
describe("API Endpoint", () => {
  it("POST /api/generate-antrag sollte Antrag zurückgeben", async () => {
    // Test-Code
  });
  
  it("sollte 429 bei Rate-Limit zurückgeben", async () => {
    // Test-Code
  });
});
```

---

## Test-Daten-Sammlung

### Positive Beispiele (für Training/Fine-Tuning)

**Beispiel 1: Ausgezeichneter Projektbeschrieb**
```
"Das Projekt 'MINT-Explorer' etabliert ein mobiles Naturwissenschafts-Labor 
für Grundschulkinder, das durch praxisnahe Experimente naturwissenschaftliches 
Grundverständnis fördert. Kerninnovation ist die Kooperation mit der TU München, 
die wissenschaftliche Begleitung und Expertise-Workshops bereitstellt. 
Die 200 teilnehmenden Kinder (Klassen 1-4) absolvieren pro Schuljahr 
12 geführte Experimente zu den Themen Kräfte, Stoffe und Lebenswelten."
```
*Score: 95/100*

**Beispiel 2: Gute Zielformulierung**
```
"Bis Juli 2026 erreichen 85% der 120 teilnehmenden Risikokinder 
(Klassen 1-4, Defizit >1 SD im ELFE II-Vortest) eine Steigerung 
der Lesegeschwindigkeit um mindestens 20 Wörter/Minute, messbar 
durch standardisierte Vorher-Nachher-Tests."
```
*Score: 92/100*

### Negative Beispiele (für Anti-Patterns)

**Beispiel 1: Zu viele Adjektive**
```
"Wir entwickeln ein hochinnovatives, außergewöhnlich wirkungsvolles 
und wunderbar nachhaltiges Projekt für unsere Schule."
```
*Problem:* 3 wertende Adjektive, 0 konkrete Fakten

**Beispiel 2: Konjunktiv-Formulierungen**
```
"Das Projekt könnte helfen, die Lesekompetenz zu verbessern. 
Es wäre wünschenswert, wenn mehr Kinder teilnehmen würden."
```
*Problem:* Unsicher, hypothetisch, keine konkrete Planung

---

## Dokumentation der Test-Ergebnisse

### Vorlage für Test-Report

```markdown
## Test-Report: [Programm] - [Keyword-Set]

**Datum:** YYYY-MM-DD
**Tester:** [Name]
**Modus:** [KI / Fallback]

### Generierter Antrag

**Sektionen:**
1. [Sektion 1]: [Kurze Zusammenfassung]
2. [Sektion 2]: [Kurze Zusammenfassung]
...

### Bewertung

| Kategorie | Score | Anmerkungen |
|-----------|-------|-------------|
| Inhalt | X/40 | |
| Sprache | X/30 | |
| Struktur | X/20 | |
| Technisch | X/10 | |
| **Gesamt** | **X/100** | |

### Stärken
1. ...
2. ...

### Schwächen
1. ...
2. ...

### Verbesserungsvorschläge
1. ...
2. ...

### API-Metriken
- API-Calls: X
- Tokens: X
- Dauer: X ms
- Geschätzte Kosten: $X.XXXX
```

---

## Nächste Schritte

1. **Sobald API-Key verfügbar:**
   - Alle Test-Szenarien durchführen
   - Bewertungen nach obigem Schema erstellen
   - Durchschnittsscore berechnen

2. **Iterative Verbesserung:**
   - Schwache Sektionen identifizieren
   - Prompts anpassen
   - Erneut testen
   - Bis Score > 85 für alle Programme

3. **Dokumentation:**
   - Finale Test-Reports erstellen
   - Lessons learned dokumentieren
   - Best Practices extrahieren

---

*Letzte Aktualisierung: 2025-02-12*
*Version: 1.0.0*
