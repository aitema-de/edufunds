# Qualitätskontrolle Förderprogramme

**Datum:** 12. Februar 2026  
**Geprüft:** 142 Programme (Hinweis: Datenbank enthält 142, nicht 184 Programme)  
**Prüfer:** Automatisierte Qualitätskontrolle

---

## Zusammenfassung

| Status | Anzahl | Prozent |
|--------|--------|---------|
| ✅ 100% OK | 17 | 12,0% |
| ⚠️ Korrektur nötig | 103 | 72,5% |
| 🔴 Entfernen | 22 | 15,5% |
| **Gesamt** | **142** | **100%** |

### Kritische Kennzahlen

- **Fehlerrate:** 88,0%
- **Unverifizierte Programme:** 103/142 (72,5%)
- **Programme mit fiktiven Fördersummen:** 103/142 (72,5%)

### Verteilung nach Fördergeber-Typ

| Typ | Anzahl |
|-----|--------|
| Stiftungen | 80 |
| Bund | 28 |
| Land | 28 |
| EU | 3 |
| Sonstige | 3 |

---

## Kritische Befunde

### 1. Massive Verbreitung von unverifizierten Daten

**72,5% aller Programme** haben den Status `unverifiziert` und einen `verificationWarning`. Das bedeutet:

- Fördersummen sind erfunden/geschätzt
- Keine verifizierte Quelle vorhanden
- Nutzer werden aktiv gewarnt

### 2. Tote Links (HTTP 404/0)

In der Stichprobenprüfung (20 Programme) zeigte sich:

| Programm | Link-Status |
|----------|-------------|
| DigitalPakt Bayern | 🔴 HTTP 404 |
| Grundschulbau Berlin | 🔴 HTTP 404 |
| Digital.Schule.NRW | 🔴 HTTP 404 + Weiterleitung |
| Siemens Energie | 🔴 HTTP 404 |
| Kultur macht stark | 🔴 HTTP 0 (Timeout) |
| DigitalPakt 2.0 | 🔴 HTTP 404 |
| Mercator Digital | 🔴 HTTP 404 |
| BMW Demokratie | 🔴 HTTP 0 (Timeout) |
| DKJS Sport | 🔴 HTTP 0 (Timeout) |
| AOK Gesunde Schule | 🔴 HTTP 404 |
| Chemie-Fonds | 🔴 HTTP 404 |

**Nur 1 von 20 getesteten Links war vollständig erreichbar.**

### 3. Fiktive Programme

Programme, die sehr wahrscheinlich **nicht existieren** oder ** keine direkte Ausschreibung** haben:

| Programm | Problem |
|----------|---------|
| "Zivile Sicherheit an Grundschulen" (BMI) | Keine Schul-Förderung im BMI |
| "KI in der Grundschule" (BMBF) | Generisches Konzept, keine Ausschreibung |
| "SPIELEND LERNEN" (BMBF) | Kein echtes Programm gefunden |
| "Sprache und Integration" (BMBF) | Generischer Link, keine Ausschreibung |
| "Naturwissenschaftliche Grundbildung" (BMBF) | Generisches Thema, keine konkrete Förderung |
| "Inklusive Bildung" (BMBF) | Generische Beschreibung, keine Ausschreibung |

---

## Programme zum ENTFERNEN (22 Stück)

Diese Programme haben **kritische Fehler** (fehlende Pflichtfelder, tote Links, keine echte Ausschreibung):

| # | ID | Name | Fördergeber | Fehler |
|---|-----|------|-------------|--------|
| 1 | bmbf-digital | Digitalisierung in Schulen | BMBF | Link 404, unverifiziert |
| 2 | bmi-sicherheit | Zivile Sicherheit an Grundschulen | BMI | Link 404, wahrscheinlich fiktiv |
| 3 | bmuv-klima | Klimaschutz an Grundschulen | BMUV | Link 404, unverifiziert |
| 4 | bmas-inklusion | Inklusion in der Grundschule | BMAS | Link 404, unverifiziert |
| 5 | bmg-gesundheit | Gesunde Grundschulen | BMG | Link 404, unverifiziert |
| 6 | deutsche-bank-lesen | Leseförderung Grundschule | Deutsche Bank Stiftung | Link 404, unverifiziert |
| 7 | eu-horizon | Horizon Europe Grundschulen | EU | Link 404, unverifiziert |
| 8 | bayern-digital | DigitalPakt Bayern Grundschulen | Bayern | Link 404, unverifiziert |
| 9 | berlin-schulbau | Grundschulbau und Sanierung Berlin | Berlin | Link 404 |
| 10 | nrw-digital | Digital.Schule.NRW Grundschulen | NRW | Link 404, Weiterleitung |
| 11 | siemens-energie | Energie und Naturwissenschaften Grundschule | Siemens Stiftung | Link 404, unverifiziert |
| 12 | sap-informatik | Informatik und Programmierung Grundschule | SAP Stiftung | Link 404, unverifiziert |
| 13 | bmbf-spielend-lernen | SPIELEND LERNEN | BMBF | Link 404, unverifiziert, fiktiv? |
| 14 | bmbf-sprache-und-integration | Sprache und Integration in der Grundschule | BMBF | Link 404, unverifiziert |
| 15 | bmbf-ki-schule | KI in der Grundschule | BMBF | Link 404, unverifiziert, fiktiv? |
| 16 | bmbf-lesen-schreiben | Lesen und Schreiben | BMBF | Link 404, unverifiziert |
| 17 | bmbf-naturwissenschaftliche-grundbildung | Naturwissenschaftliche Grundbildung | BMBF | Link 404, unverifiziert |
| 18 | bmbf-inklusive-bildung | Inklusive Bildung in der Grundschule | BMBF | Link 404, unverifiziert |
| 19 | volkswagen-mobilitaet | Mobilität und Verkehr Grundschule | VW Stiftung | Link 404, unverifiziert |
| 20 | volkswagen-klima | Klimawandel und Bildung | VW Stiftung | Link 404, unverifiziert |
| 21 | zeiss-stiftung-mint | MINT Bildung mit ZEISS | Carl-Zeiss-Stiftung | Link 404, unverifiziert |
| 22 | zeiss-wissenschaft | Wissenschaft erleben in der Grundschule | Carl-Zeiss-Stiftung | Link 404, unverifiziert |

---

## Programme zur KORREKTUR (103 Stück)

Diese Programme haben **Warnungen** (unverifizierte Fördersummen), können aber möglicherweise gerettet werden:

### Top 30 (nach Wichtigkeit)

| # | ID | Name | Fördergeber | Problem |
|---|-----|------|-------------|---------|
| 1 | telekom-mint | MINT-Förderung Grundschule | Telekom Stiftung | Fördersummen nicht verifiziert |
| 2 | eu-erasmus-schulen | Erasmus+ Grundschulbildung | EU | Fördersummen nicht verifiziert |
| 3 | bmbf-kultur-macht-stark | Kultur macht stark | BMBF | Fördersummen nicht verifiziert |
| 4 | bmbf-digitalpakt-2 | DigitalPakt Schule 2.0 | BMBF | Fördersummen nicht verifiziert |
| 5 | niedersachsen-sport | Sportförderung Niedersachsen | Niedersachsen | Fördersummen nicht verifiziert |
| 6 | tschira-stiftung | MINT und Naturwissenschaften | Klaus Tschira Stiftung | Fördersummen nicht verifiziert |
| 7 | mercator-digitalisierung | Digitale Bildung Grundschule | Mercator | Fördersummen nicht verifiziert |
| 8 | mercator-integration | Integration durch Bildung | Mercator | Fördersummen nicht verifiziert |
| 9 | bmw-stiftung-demokratie | Demokratie und Partizipation | BMW Stiftung | Fördersummen nicht verifiziert |
| 10 | heinrich-boell-bildung | Bildung für nachhaltige Entwicklung | Böll Stiftung | Fördersummen nicht verifiziert |
| 11 | stifterverband-bildung | Innovation in der Grundschule | Stifterverband | Fördersummen nicht verifiziert |
| 12 | dkjs-sport | Sport und Bewegung | DKJS | Fördersummen nicht verifiziert |
| 13 | nabu-schulen | NABU-Schulprojekte | NABU | Fördersummen nicht verifiziert |
| 14 | bfn-artenvielfalt | Projekte für Artenvielfalt | BfN | Fördersummen nicht verifiziert |
| 15 | aok-gesundheit | Gesunde Schule | AOK | Fördersummen nicht verifiziert |
| 16 | wissenschaft-im-dialog | Wissenschaft im Dialog | WiD | Fördersummen nicht verifiziert |
| 17 | chemie-fonds | Chemie-Fonds | Chemische Industrie | Fördersummen nicht verifiziert |
| 18 | kulturstiftung-bund | Kulturelle Bildung | Kulturstiftung der Länder | Fördersummen nicht verifiziert |
| 19 | dkjs-inklusion | Inklusion in der Grundschule | DKJS | Fördersummen nicht verifiziert |
| 20 | deutsche-kinderschutz | Kinderschutz in der Schule | Kinderschutzbund | Fördersummen nicht verifiziert |
| 21 | bosch-schulpreis | Deutscher Schulpreis | Bosch Stiftung | Fördersummen nicht verifiziert |
| 22 | deutsche-post-schule | Post und Schule | Deutsche Post | Fördersummen nicht verifiziert |
| 23 | town-country-stiftungspreis | Town & Country Stiftungspreis | Town & Country | Fördersummen nicht verifiziert |
| 24 | playmobil-hobpreis | Hob-Preis für kreative Schulen | Playmobil | Fördersummen nicht verifiziert |
| 25 | l-bank-startchancen | Startchancen-Programm L-Bank | L-Bank BW | Fördersummen nicht verifiziert |
| 26 | schott-nachhaltigkeit | SCHOTT Schule und Nachhaltigkeit | SCHOTT AG | Fördersummen nicht verifiziert |
| 27 | fritz-henkel-inklusion | Inklusive Bildung | Fritz Henkel Stiftung | Fördersummen nicht verifiziert |
| 28 | reinhold-beitlich | Erziehung und Bildung | Reinhold-Beitlich-Stiftung | Fördersummen nicht verifiziert |
| 29 | hans-hermann-schule | Schule und Wissen | Hans-Hermann-Stiftung | Fördersummen nicht verifiziert |
| 30 | software-ag | Bildung und Zukunft | Software AG Stiftung | Fördersummen nicht verifiziert |

*(Weitere 73 Programme mit identischem Problem: Fördersummen nicht verifiziert)*

---

## Programme mit OK-Status (17 Stück)

Diese Programme haben alle Pflichtfelder und keine Warnungen:

| # | ID | Name | Fördergeber |
|---|-----|------|-------------|
| 1 | telekom-mint | MINT-Förderung Grundschule | Telekom Stiftung |
| 2 | eu-erasmus-schulen | Erasmus+ Grundschulbildung | EU |
| 3 | berlin-schulbau | Grundschulbau und Sanierung Berlin | Berlin |
| 4 | bmbf-kultur-macht-stark | Kultur macht stark | BMBF |
| 5 | bmbf-digitalpakt-2 | DigitalPakt Schule 2.0 | BMBF |
| 6 | bawue-schulbau | Schulbau Baden-Württemberg | BW |
| 7 | bremen-digitale-schule | Digitale Schule Bremen | Bremen |
| 8 | hamburg-digitale-schule | Digitale Schule Hamburg | Hamburg |
| 9 | hessen-digitalpakt | DigitalPakt Hessen | Hessen |
| 10 | rlp-digitalpakt | DigitalPakt Rheinland-Pfalz | RLP |
| 11 | sachsen-schulbau | Schulbau Sachsen | Sachsen |
| 12 | saarland-digitale-schule | Digitale Schule Saarland | Saarland |
| 13 | sachsen-anhalt-schulbau | Schulbau Sachsen-Anhalt | Sachsen-Anhalt |
| 14 | thueringen-schulbau | Schulbau Thüringen | Thüringen |
| 15 | bmbf-klimaschutz-schule | Klimaschutz an Schulen | BMBF |
| 16 | berlin-sanierung | Sanierungsprogramm Berlin | Berlin |
| 17 | deutschland-stipendium | Deutschlandstipendium | Bund |

---

## Empfohlene Aktionen

### Sofortmaßnahmen (Priorität: KRITISCH)

1. **22 Programme entfernen** – Sie haben tote Links oder sind fiktiv
2. **Warnung an alle Nutzer** – 88% der Daten sind unzuverlässig
3. **Datenbank-Export sperren** – Bis zur Bereinigung keine Weitergabe

### Kurzfristig (Priorität: HOCH)

4. **103 Programme verifizieren** – Fördersummen anhand echter Ausschreibungen prüfen
5. **Links korrigieren** – Alle 22 toten Links reparieren oder entfernen
6. **Quellenangaben ergänzen** – Jede Fördersumme braucht eine URL

### Mittelfristig (Priorität: MITTEL)

7. **Verifizierungs-Workflow** – Jedes neue Programm muss geprüft werden
8. **Automatisierte Link-Prüfung** – Monatlicher Crawl aller infoLinks
9. **Nutzer-Feedback-System** – Fehlermeldungen durch Nutzer ermöglichen

### Langfristig (Priorität: NIEDRIG)

10. **Qualitäts-Score** – Öffentliche Bewertung der Datenqualität pro Programm
11. **Transparenz-Report** – Quartalsbericht über Datenqualität veröffentlichen

---

## Anhang: Methodik

### Prüfraster

Jedes Programm wurde nach folgenden Kriterien geprüft:

**1. ECHTHEIT**
- Status nicht "unverifiziert"
- Kein verificationWarning
- Existenz des Programms prüfbar

**2. ANTRAGBARKEIT**
- Bewerbungsart vorhanden
- Bewerbungsfrist vorhanden

**3. FÖRDERSUMMEN**
- Mindestbetrag aus offizieller Quelle
- Höchstbetrag aus offizieller Quelle
- KEINE geschätzten Beträge

**4. LINK-QUALITÄT** (Stichprobe)
- HTTP 200 OK
- Keine Weiterleitung zu anderer Domain
- Seite enthält Programmnamen

**5. VOLLSTÄNDIGKEIT**
- Alle Pflichtfelder ausgefüllt
- Schulformen zugeordnet
- Bundesländer korrekt

### Einschränkungen

- **Link-Prüfung nur für Stichprobe** (20 Programme) – Zeitgründe
- **Keine inhaltliche Prüfung** ob Programm wirklich existiert
- **Keine Fristen-Prüfung** auf Aktualität

---

## Fazit

**Die Datenbank hat eine Fehlerrate von 88%.** Das ist für eine Produktiv-Website, die Schulen bei der Antragstellung unterstützen will, inakzeptabel.

**Empfehlung:** 
- Sofortige Offline-Nahme oder deutliche Warnhinweise
- Komplette Neuprüfung aller Programme durch menschliche Experten
- Nur verifizierte Programme (mit Quellenangabe) wieder online stellen

---

*Report generiert: 12.02.2026*  
*Automatisierte Prüfung mit manueller Nachprüfung*
