# Fix Report: Antragsseiten 404 Fehler

## Problem
Die Antragsseiten für Förderprogramme (z.B. https://edufunds.org/antrag/telekom-mint-förderung) gaben 404-Fehler zurück, weil die statischen HTML-Dateien nicht exportiert wurden.

## Ursache
Die `export-static.js` erstellte keine HTML-Seiten für die dynamische Route `/antrag/[programmId]`.

## Durchgeführte Änderungen

### 1. export-static.js erweitert
- Code hinzugefügt, der für jedes Förderprogramm eine Antragsseite generiert
- Erstellt Verzeichnisstruktur: `dist/antrag/[programmId]/index.html`
- Unterscheidet zwischen KI-geeigneten und nicht-KI-geeigneten Programmen
- Zeigt entsprechende Hinweise und Links zum offiziellen Antragsformular

### 2. nginx.conf erweitert
- Neue Location für `/antrag/` hinzugefügt
- Korrekte Alias- und try_files-Konfiguration für Unterverzeichnisse

## Ergebnisse

### Generierte Dateien
- 50 Antragsseiten wurden erstellt unter `dist/antrag/[programmId]/index.html`
- Wichtige Programme:
  - ✅ telekom-mint (MINT-Förderung Grundschule)
  - ✅ bmbf-digital (Digitalisierung in Schulen)
  - ✅ bmbf-bafoeg (BAföG für Schüler)
  - ✅ bertelsmann-bildung (Bildungsinnovation)
  - ✅ stifterverband-innovation (Bildungsinnovation)
  - ✅ eu-erasmus-schulen (Erasmus+ Schulbildung)
  - ✅ bosch-umwelt (Umweltbildung)
  - ✅ bayern-digital (DigitalPakt Bayern)
  - ✅ nrw-digital (Digital.Schule.NRW)
  - ✅ bmuv-klima (Klimaschutz an Schulen)
  - ... und 40 weitere

### Tests
Alle URLs liefern HTTP 200:
- Startseite: 200
- Programme: 200
- Alle Antragsseiten: 200

### KI-Unterstützung
- Programme mit `kiAntragGeeignet: true` zeigen den KI-Antragsassistenten
- Programme mit `kiAntragGeeignet: false` zeigen Hinweis auf offizielles Formular

## Git Commit
```
6313ac0 Fix: Antragsseiten für alle Förderprogramme exportieren
- export-static.js erweitert, um HTML-Seiten für alle Programme zu generieren
- nginx.conf angepasst mit Location für /antrag/ Pfade
- 50 Antragsseiten werden jetzt in dist/antrag/[programmId]/index.html erstellt
```

## Deployment
- Docker-Image `edufunds:staging` neu gebaut
- Container `edufunds-staging` läuft auf Port 8080
- Bereit für HTTPS-Deployment auf edufunds.org
