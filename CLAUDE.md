# EduFunds — Claude-Onboarding

Kurz-Briefing fuer Claude-Code-Sitzungen. Funktionale Uebersicht steht in [README.md](README.md). Dieses Dokument fokussiert auf Konventionen, aktive Blocker und das, was aus Quelltext und Git-Log nicht sofort sichtbar ist.

## Status (Stand 27.04.2026)

- **Aktiver Branch:** `feature/wizard-adaptive` (34 Commits, push gleichauf mit origin). Phase 1 (Basis-Wizard) + Pipeline-Qualitaets-Hebel + Richtlinien-Infrastruktur + Skip-Resolution + Daten-Cleanup abgeschlossen. Noch kein PR gegen staging eroeffnet.
- **Datenkatalog:** `data/foerderprogramme.json` — 131 Programme, davon 82 mit `kiAntragGeeignet=true` in der Prio-Queue (`data/richtlinien-prioritaeten.json`). Dossiers in `data/richtlinien/`: 11 done / 70 open / 1 skip.
- **Live:** Production `app.edufunds.org` und Staging `staging.edufunds.org` laufen auf altem Stand (vor Wizard). Migrationen 002 + 003 noch nicht ausgerollt.

## Aktive Blocker

1. **Gemini-Quota** — der konfigurierte API-Key ist Free-Tier. Rate-Limit (50 RPD Pro / 1500 RPD Flash) wird im echten Betrieb nach wenigen Pipeline-Laeufen erreicht; 429-Fehler halten dann tagelang an. Paid-Tier-Klaerung mit Fedo offen. E2E-Test der Pipeline-Hebel deshalb unverifiziert.
2. **Stripe-Account** — Pfad A (neuer EduFunds-Account unter aitema GmbH) entschieden, Anlage zeitlich verschoben. Bis dahin laeuft die Paywall nur im Dev-Mock (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`). Schritte stehen in [STRIPE_SETUP.md](STRIPE_SETUP.md).

## Konventionen

- **Sprache:** Deutsch in allen Dokumenten, Texten, UI-Strings, Commit-Messages und Logs. Umlaute (ae/oe/ue/ss) sind in Code-/Tooling-Identifiers erlaubt — in JSON-Datenfeldern, die durch Tooling laufen, ASCII bevorzugen, um Encoding-Probleme zu vermeiden.
- **Branchen-Workflow:** `feature/*` → `staging` → `main`. Nie direkt auf `main` mergen.
- **Commits:** Conventional-Commit-Praefixe (`feat`, `fix`, `chore`, `docs`). Kurze deutsche Subject-Line, Body mit Begruendung und Stichworten zu betroffenen Dateien.
- **Daten-Mutationen:** `data/foerderprogramme.json` und `data/richtlinien-prioritaeten.json` sind leitend. Bei Aenderungen am Katalog Queue mit `npx tsx scripts/rebuild-queue.ts` regenerieren.

## Tech-Stack-Realitaet

| | |
|---|---|
| Frontend/Backend | Next.js 16 (App Router, Turbopack), React 18, TypeScript, Tailwind |
| DB | PostgreSQL 16 via `pg` (kein ORM, kein Supabase trotz altem Memo). Migrationen `migrations/00X_*.sql`, idempotent. |
| KI | Google Generative AI SDK, Modelle `gemini-2.0-flash` (Interview) + `gemini-2.5-pro` (Pipeline) |
| Payments | Stripe Standard-Payment, kein Connect (vgl. SailHub). Code in `app/api/wizard/checkout/route.ts`. |
| Hosting | Docker + Traefik auf Hetzner (49.13.15.44). Containers `edufunds-app`, `edufunds-staging`, `edufunds-postgres`, `edufunds-landing`. |

## Wichtige Pfade

- `app/api/match/route.ts` — Programm-Matching (Gemini Flash)
- `app/antrag/[id]/wizard/` — adaptiver Wizard
- `lib/wizard/` — Matcher, Interviewer, Pipeline, Validator, Schema
- `data/richtlinien/` — pro Programm ein extrahiertes Dossier (JSON nach `lib/wizard/richtlinien-schema.ts`)
- `scripts/extract-richtlinie.ts` — Dossier-Extraktion via Gemini Pro (`--list`, `--next`, manuell)
- `scripts/scan-new-programs.ts` — Scanner fuer neue Programme aus konfigurierten Quellen
- `scripts/rebuild-queue.ts` — Queue aus `foerderprogramme.json` neu aufbauen
- `scripts/deploy-{staging,production}.sh` — Deployment

## Lokale Dev-Umgebung

Workspace: `/home/kolja/edufunds-app/` (auf dem Production-Server liegt eine separate Kopie unter `/home/edufunds/edufunds-app/`).

```bash
./scripts/dev-db-tunnel.sh --bg    # SSH-Tunnel zur Dev-DB auf 49.13.15.44 → localhost:5433
npm run dev                        # http://localhost:3101
```

Details: [DEV-WORKFLOW.md](DEV-WORKFLOW.md). Wizard-Anknuepfen: [WIZARD_RESUME.md](WIZARD_RESUME.md) (Stand 20.04., teilweise veraltet).

## Persistente Memory

Sessionsuebergreifender Kontext liegt im Claude-Memory ausserhalb des Repos: `~/.claude/projects/-home-kolja/memory/edufunds-project.md`. Dort stehen detaillierte Fortschrittsstaende, Blocker-Historie und naechste Schritte. Bei Anknuepfung zuerst dort hineinschauen.
