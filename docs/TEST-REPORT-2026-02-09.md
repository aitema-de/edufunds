# EduFunds Website Test Report
**Datum:** 2026-02-09  
**Tester:** Automated Website Testing  
**URL:** https://edufunds.org

---

## Zusammenfassung

Die EduFunds Website hat **massive technische Probleme**. Während die statischen HTML-Seiten existieren, funktioniert das URL-Routing nicht korrekt, und alle dynamischen Funktionen (APIs) sind nicht verfügbar.

---

## 1. Seiten-Test Ergebnisse

### 1.1 Startseite
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL | ✅ | https://edufunds.org |
| HTTP Status | ✅ | 200 |
| Titel | ✅ | "Startseite \| EduFunds" |
| Inhalt | ✅ | Vorhanden |
| Bilder | ⚠️ | Keine Bilder gefunden (nur CSS-Styling) |

### 1.2 Impressum
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ✅ | https://edufunds.org/impressum.html |
| HTTP Status | ✅ | 200 |
| Titel | ✅ | "Impressum \| EduFunds" |
| Inhalt | ✅ | Vorhanden (Musterdaten) |

### 1.3 Datenschutz
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ✅ | https://edufunds.org/datenschutz.html |
| HTTP Status | ✅ | 200 |
| Titel | ✅ | "Datenschutz \| EduFunds" |
| Inhalt | ✅ | Vorhanden (Musterdaten) |

### 1.4 AGB
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ❌ | Seite existiert nicht |
| HTTP Status | ⚠️ | 200 (aber Startseiten-Inhalt) |
| Titel | ❌ | "Startseite \| EduFunds" (falsch) |
| Inhalt | ❌ | Startseite statt AGB |

### 1.5 Über uns
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ❌ | Seite existiert nicht |
| HTTP Status | ⚠️ | 200 (aber Startseiten-Inhalt) |
| Titel | ❌ | "Startseite \| EduFunds" (falsch) |
| Inhalt | ❌ | Startseite statt Über-uns |

### 1.6 Kontakt
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ❌ | Seite existiert nicht |
| HTTP Status | ⚠️ | 200 (aber Startseiten-Inhalt) |
| Titel | ❌ | "Startseite \| EduFunds" (falsch) |
| Inhalt | ❌ | Startseite statt Kontaktformular |

### 1.7 Förderfinder (/programme)
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ✅ | https://edufunds.org/programme.html |
| HTTP Status | ✅ | 200 |
| Titel | ✅ | "Förderprogramme \| EduFunds" |
| Inhalt | ✅ | 50 Programme gelistet |
| Programme | ✅ | Bund, Länder, Stiftungen, EU |

### 1.8 Antrag-Seiten (/antrag/[id])
| Kriterium | Status | Details |
|-----------|--------|---------|
| URL ohne .html | ❌ | Zeigt Startseite |
| URL mit .html | ❌ | Seite existiert nicht |
| HTTP Status | ⚠️ | 200 (aber Startseiten-Inhalt) |
| Titel | ❌ | "Startseite \| EduFunds" (falsch) |
| Inhalt | ❌ | Startseite statt Antragsformular |

### 1.9 404 Seite
| Kriterium | Status | Details |
|-----------|--------|---------|
| Nicht-existierende URL | ❌ | Zeigt Startseite |
| HTTP Status | ❌ | 200 (sollte 404 sein) |
| Titel | ❌ | "Startseite \| EduFunds" (falsch) |
| Inhalt | ❌ | Startseite statt 404-Fehler |

---

## 2. Funktionalitäts-Test

### 2.1 Newsletter-Formular
| Aspekt | Status | Details |
|--------|--------|---------|
| Frontend | ❌ | Kein Formular gefunden |
| API-Endpunkt | ❌ | POST /api/newsletter → 405 Not Allowed |
| Funktionalität | ❌ | Nicht verfügbar |

### 2.2 Kontaktformular
| Aspekt | Status | Details |
|--------|--------|---------|
| Frontend | ❌ | Kein Formular gefunden |
| API-Endpunkt | ❌ | POST /api/contact → 405 Not Allowed |
| Funktionalität | ❌ | Nicht verfügbar |

### 2.3 KI-Antragsassistent
| Aspekt | Status | Details |
|--------|--------|---------|
| Frontend | ❌ | Keine UI gefunden |
| API-Endpunkt | ❌ | POST /api/assistant → 405 Not Allowed |
| Funktionalität | ❌ | Nicht verfügbar |

### 2.4 PDF-Export Funktion
| Aspekt | Status | Details |
|--------|--------|---------|
| Frontend | ❌ | Kein Button/Link gefunden |
| API-Endpunkt | ❌ | POST /api/generate-pdf → 405 Not Allowed |
| Funktionalität | ❌ | Nicht verfügbar |

### 2.5 Suche/Filter im Förderfinder
| Aspekt | Status | Details |
|--------|--------|---------|
| Frontend | ⚠️ | Nur statische Tags vorhanden |
| JavaScript | ❌ | Keine dynamische Filterung gefunden |
| Funktionalität | ❌ | Nicht verfügbar |

---

## 3. API-Endpunkte Übersicht

| Endpunkt | Methode | Status | Response |
|----------|---------|--------|----------|
| /api/programs | GET | ❌ | Startseite HTML |
| /api/contact | POST | ❌ | 405 Not Allowed |
| /api/newsletter | POST | ❌ | 405 Not Allowed |
| /api/assistant | POST | ❌ | 405 Not Allowed |
| /api/generate-pdf | POST | ❌ | 405 Not Allowed |

**Server:** nginx/1.29.4

---

## 4. Fehler-Dokumentation

### 4.1 Kritische Fehler (Sofort beheben)

1. **URL-Routing komplett defekt**
   - Alle URLs ohne `.html` zeigen die Startseite
   - Keine 404-Fehlerseite
   - Beispiel: `/impressum` zeigt Startseite statt Impressum

2. **Fehlende Seiten**
   - AGB-Seite fehlt
   - Über-uns Seite fehlt
   - Kontakt-Seite fehlt
   - Alle Antragsseiten fehlen

3. **Alle APIs nicht funktionsfähig**
   - Kein Backend verfügbar
   - Alle POST-Requests geben 405 zurück
   - Keine Datenbank-Anbindung erkennbar

4. **Keine dynamische Funktionalität**
   - Newsletter nicht abonnierbar
   - Kontaktformular nicht nutzbar
   - KI-Assistent nicht verfügbar
   - PDF-Export nicht möglich
   - Suche/Filter nicht implementiert

### 4.2 Was funktioniert

- ✅ Startseite wird korrekt angezeigt
- ✅ Förderfinder (`/programme.html`) zeigt 50 Programme an
- ✅ Impressum (`/impressum.html`) erreichbar
- ✅ Datenschutz (`/datenschutz.html`) erreichbar
- ✅ Statische HTML-Seiten werden ausgeliefert
- ✅ Tailwind CSS-Styling funktioniert

---

## 5. Empfehlungen

### 5.1 Sofortmaßnahmen (P0 - Kritisch)

1. **URL-Routing korrigieren**
   ```nginx
   # Beispiel nginx-Konfiguration
   location / {
       try_files $uri $uri.html $uri/ =404;
   }
   ```

2. **404-Seite erstellen**
   - Eigene Fehlerseite mit HTTP 404 Status

3. **Fehlende Seiten erstellen**
   - `agb.html` erstellen
   - `ueber-uns.html` erstellen
   - `kontakt.html` erstellen
   - `antrag.html` oder dynamische Antragsseiten erstellen

### 5.2 Kurzfristige Maßnahmen (P1 - Hoch)

4. **Backend-Server einrichten**
   - Node.js/Express oder Python/Flask Server
   - API-Endpunkte implementieren:
     - `POST /api/contact`
     - `POST /api/newsletter`
     - `POST /api/assistant`
     - `POST /api/generate-pdf`
     - `GET /api/programs` (JSON statt HTML)

5. **Kontaktformular implementieren**
   - Frontend: Formular auf kontakt.html
   - Backend: E-Mail-Versand einrichten

6. **Newsletter-Anmeldung implementieren**
   - Datenbank für E-Mail-Adressen
   - Bestätigungs-E-Mail Versand

### 5.3 Mittelfristige Maßnahmen (P2 - Normal)

7. **KI-Antragsassistent entwickeln**
   - OpenAI API oder lokales LLM integrieren
   - Chat-Interface erstellen
   - Kontext: Förderprogramm-Daten

8. **PDF-Export implementieren**
   - Bibliothek: Puppeteer oder jsPDF
   - Antragsdaten zu PDF konvertieren

9. **Suche/Filter im Förderfinder**
   - JavaScript-basierte Filterung
   - Suchfeld hinzufügen
   - Kategorie-Filter

10. **Bilder hinzufügen**
    - Aktuell nur CSS-Styling, keine echten Bilder

### 5.4 Langfristige Verbesserungen (P3 - Niedrig)

11. **SEO-Optimierung**
    - Meta-Tags vervollständigen
    - Sitemap.xml erstellen
    - robots.txt optimieren

12. **Performance-Optimierung**
    - CDN für Assets
    - Bilder optimieren
    - Caching implementieren

13. **Barrierefreiheit**
    - ARIA-Labels hinzufügen
    - Kontrast verbessern
    - Tastaturnavigation testen

---

## 6. Priorisierte TODO-Liste

| Priorität | Aufgabe | Aufwand | Status |
|-----------|---------|---------|--------|
| P0 | URL-Routing fixen (ohne .html) | Klein | ❌ Offen |
| P0 | 404-Seite erstellen | Klein | ❌ Offen |
| P0 | AGB-Seite erstellen | Klein | ❌ Offen |
| P0 | Über-uns Seite erstellen | Klein | ❌ Offen |
| P0 | Kontakt-Seite erstellen | Klein | ❌ Offen |
| P0 | Antragsseiten erstellen | Mittel | ❌ Offen |
| P1 | Backend-Server einrichten | Groß | ❌ Offen |
| P1 | Kontaktformular Backend | Mittel | ❌ Offen |
| P1 | Newsletter-Backend | Mittel | ❌ Offen |
| P2 | KI-Assistent implementieren | Groß | ❌ Offen |
| P2 | PDF-Export implementieren | Mittel | ❌ Offen |
| P2 | Suche/Filter JavaScript | Mittel | ❌ Offen |

---

## 7. Technische Details

### Erkannte Technologien
- **Frontend:** HTML5, Tailwind CSS (via CDN)
- **Server:** nginx/1.29.4
- **Hosting:** Scheinbar statisches Hosting (kein Node.js/Python Backend)
- **Keine erkannt:** JavaScript-Frameworks, APIs, Datenbank

### Domain-Informationen
- **Domain:** edufunds.org
- **SSL:** ✅ Aktiv (HTTPS)
- **Server-Header:** nginx/1.29.4

---

## Fazit

Die EduFunds Website ist derzeit ein **statischer HTML-Prototyp** ohne funktionierendes Backend. Die wichtigsten Probleme sind:

1. **Routing:** URLs funktionieren nur mit `.html` Endung
2. **Fehlende Seiten:** AGB, Über uns, Kontakt, Antrag fehlen
3. **Keine APIs:** Alle dynamischen Funktionen nicht verfügbar
4. **Keine Datenbank:** Keine Speicherung von Nutzerdaten möglich

**Empfohlener nächster Schritt:** Einrichten eines Backend-Servers (Node.js/Express oder ähnliches) und Implementieren der grundlegenden API-Endpunkte.

---

*Report generiert am 2026-02-09 durch automatisierte Website-Tests*
