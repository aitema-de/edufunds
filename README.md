# EduFunds

🎓 **Fördermittel-Plattform für Schulen**

Über 135 geprüfte Förderprogramme für allgemeinbildende Schulen in Deutschland, plus ein KI-Antragswizard, der in einer adaptiven Befragung und einer vierstufigen Pipeline einen programmspezifischen Antragsentwurf erstellt.

## Features

- 🔍 **Förderfinder** — 135+ Programme, Filter nach Bundesland, Schulform, Kategorie, Fördergeber
- 🧭 **Adaptiver KI-Antragswizard** (Beta) unter `/antrag/[id]/wizard`:
  - Interviewer (Gemini 2.0 Flash) stellt bis zu 12 gezielte Fragen, abgestimmt auf Geber-Typ (Bund/Land/Stiftung/EU) und kuratierte Programm-Kriterien
  - Pipeline (Gemini 2.5 Pro): Gliederung → Abschnitte → Gutachten → Finalfassung
  - Schul-Profil wird lokal gespeichert und beim nächsten Antrag vorausgefüllt
  - Antworten sind nachträglich editierbar (Dialog läuft ab dort neu)
  - Kosten-Schätzung pro Session (~0,20–0,35 €)
  - Export: Kopieren, PDF, Word, Text
- 📑 **Klassischer KI-Antragsassistent** unter `/antrag/[id]` (Legacy, eine lange Formularseite)
- 📊 **Übersicht deiner Anträge** unter `/antrag/meine`

## Architektur

| Container | Image | Domain | Funktion |
|-----------|-------|--------|----------|
| `edufunds-landing` | nginx:alpine | edufunds.org | Marketing Landing |
| `edufunds-app` | edufunds:latest (Next.js 16) | app.edufunds.org | Plattform + Wizard |
| `edufunds-staging` | edufunds:staging | staging.edufunds.org | Staging |
| `edufunds-postgres` | postgres:16-alpine | intern | DB (Newsletter + Sessions) |

Daten der Förderprogramme liegen statisch in `data/foerderprogramme.json`. Postgres hält Newsletter-Abos, Kontaktanfragen und KI-Wizard-Sessions (`ki_antraege`-Tabelle).

## Setup lokal (WSL/macOS/Linux)

```bash
git clone https://github.com/Aitema-gmbh/edufunds.git
cd edufunds
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY etc. eintragen
./scripts/dev-db-tunnel.sh --bg    # SSH-Tunnel zur Dev-DB auf 49.13.15.44
npm run dev                        # http://localhost:3101
```

Details und Troubleshooting: [DEV-WORKFLOW.md](DEV-WORKFLOW.md). Agent-Onboarding: [CLAUDE.md](CLAUDE.md).

## Deployment

Branch-Workflow: `feature/*` → `staging` → `main`.

```bash
# Nach Staging deployen
./scripts/deploy-staging.sh            # interaktiv
./scripts/deploy-staging.sh --yes      # ohne Bestätigung

# Nach Production deployen (zweifache Bestätigung)
./scripts/deploy-production.sh
```

Beide Skripte: `git pull` am Server → `docker build` → Container-Swap → Health-Check → Smoke-Test der Haupt-Routen.

## Tech Stack

- Next.js 16 (App Router, Turbopack) + React 18 + TypeScript
- Tailwind CSS
- PostgreSQL (via `pg`)
- Google Generative AI SDK (`@google/generative-ai`) für Gemini
- react-markdown + remark-gfm für den Antragstext
- html2pdf.js für PDF-Export
- Docker + Traefik auf Hetzner

## Daten

`data/foerderprogramme.json` (~135 Programme, Stand April 2026)
- 80 Stiftungen · 30 Länder · 17 Bund · 4 EU · 4 sonstige

## Lizenz

© 2026 aitema GmbH
