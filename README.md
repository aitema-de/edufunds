# EduFunds

🎓 **Fördermittel-Plattform für Schulen**

Eine Übersicht von über 130 Förderprogrammen für Schulen in Deutschland – unterstützt durch einen KI-Antragsassistenten.

## Features

- 🔍 **Förderfinder**: Durchsuche 130+ Förderprogramme
- 🤖 **KI-Antragsassistent**: Hilft bei der Antragstellung
- 📊 **Filter**: Nach Bundesland, Schulform, Kategorie
- 🏛️ **Fördergeber**: Bund, Länder, Stiftungen, EU

## Schnellstart

```bash
# Dependencies installieren
npm install

# Statischen Export erstellen
node export-static.js

# Output ist im dist/ Ordner
```

## Deployment

**Hosting:** Hetzner

Siehe [DEPLOY.md](DEPLOY.md) für Details.

### Workflow
1. `staging` Branch → Staging-Umgebung
2. Testen & validieren
3. `main` Branch → Production

## Daten

Alle Förderprogramme sind in `data/foerderprogramme.json` gespeichert.

**Aktueller Bestand (Februar 2026):**
- 123 aktive Förderprogramme
- 68 Stiftungsprogramme
- 29 Landesprogramme  
- 17 Bundesprogramme
- 4 EU-Programme
- 5 Sonstige

## Tech Stack

- Next.js + React + TypeScript
- Tailwind CSS
- Statischer Export → Hetzner

## Lizenz

© 2025 EduFunds
