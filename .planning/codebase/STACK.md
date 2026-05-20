# Technology Stack

**Analysis Date:** 2026-04-30

## Languages

**Primary:**
- TypeScript ^5.9.3 — gesamter App-Code (`app/`, `lib/`, `components/`, `scripts/`)
- TSX — React-Server-/Client-Components in `app/` und `components/`

**Secondary:**
- JavaScript (CommonJS) — Build-/Tooling-Konfiguration: `next.config.js`, `jest.config.js`, `postcss.config.cjs`, `tailwind.config.js`, sowie ältere Skripte in `scripts/*.js` (z. B. `scripts/setup-monitoring.sh`-Helper, `scripts/check-fristen.js`)
- Python 3 — Datenpflege-Skripte in `scripts/01_analyse_links.py` … `scripts/14_finaler_audit_report.py` (Link-Audit, Programm-Bereinigung) — kein Laufzeit-Bestandteil der App
- SQL — DB-Migrationen in `db/migrations/*.sql`, Initial-Seed `scripts/init-db.sql`, Schema-Skizze `data/schema.sql`
- Bash — Deployment- und Backup-Skripte in `scripts/deploy-staging.sh`, `scripts/deploy-production.sh`, `scripts/backup.sh`, `scripts/dev-db-tunnel.sh`, `scripts/postgres-backup.sh`

## Runtime

**Environment:**
- Node.js 20 — pinned in `.github/workflows/build-deploy.yml` (`NODE_VERSION: '20'`) und allen Workflow-Files; lokal entspricht die Dev-Server-Erwartung (Next 16 + Turbopack)
- Next.js Standalone Output (`next.config.js` → `output: 'standalone'`) für Docker-Image
- Docker / Docker Compose — `docker-compose.yml` (Dev) + `docker-compose.prod.yml` (Prod), Container `edufunds-app`, `edufunds-staging`, `edufunds-postgres`, `edufunds-landing`
- Hosting: Hetzner-Server (`49.13.15.44`) hinter Traefik mit Let's-Encrypt; Domains `app.edufunds.org` und `staging.edufunds.org`

**Package Manager:**
- npm (Lockfile: `package-lock.json` vorhanden, ~Standard für `npm ci` in CI)

## Frameworks

**Core:**
- Next.js ^16.1.6 — App Router, Turbopack-Dev (`next dev -p 3101`), `serverExternalPackages: ['pg']` in `next.config.js`, Standalone-Build für Docker
- React ^18.3.0 / React-DOM ^18.3.0 — UI-Layer
- Tailwind CSS ^3.4.19 — Styling, Konfiguration in `tailwind.config.js`, PostCSS-Pipeline via `postcss.config.cjs` mit `autoprefixer` ^10.4.24
- TypeScript ^5.9.3 — `tsconfig.json` mit `strict: true`, Path-Alias `@/*` → Repo-Root, `moduleResolution: bundler`

**UI / Animations:**
- framer-motion ^12.34.0 — UI-Animationen
- lucide-react ^0.474.0 — Icons
- @radix-ui/react-slot ^1.2.4 — Primitive für Buttons/Slots
- class-variance-authority ^0.7.1, clsx ^2.1.1, tailwind-merge ^3.4.0 — Tailwind-Variant-Management
- react-markdown ^10.1.0 + remark-gfm ^4.0.1 — Markdown-Rendering (Antrag-Vorschau, Newsletter-Preview)
- html2pdf.js ^0.14.0 — Browser-PDF-Export im Wizard (`components/KIAntragAssistent.tsx` lädt dynamisch)

**Daten / Forms:**
- swr ^2.4.0 — Client-Caching für Programmlisten (`lib/swr-fetcher.ts`, genutzt in `app/foerderprogramme/page.tsx`)
- zod ^3.24.1 — Schema-Validierung (Wizard-Strukturen, Newsletter, Kontaktformular; vgl. `lib/wizard/richtlinien-schema.ts`, `lib/contact-schema.ts`)
- uuid ^13.0.0 — Token-/Session-IDs

**Testing:**
- jest ^29.7.0 mit `next/jest`-Preset — Konfiguration in `jest.config.js`, Setup-File `test/setup.tsx`
- jest-environment-jsdom ^29.7.0 — DOM-Tests
- @testing-library/react ^16.3.2 + @testing-library/jest-dom ^6.9.1 + @testing-library/user-event ^14.6.1 — Komponenten-Tests
- ts-jest ^29.4.9 — TypeScript-Transform
- Coverage-Schwelle 50 % global (`jest.config.js`), Test-Verzeichnisse `__tests__/`, plus E2E-Ordner `e2e/` (vom Jest-Run ausgeschlossen)

**Build/Dev:**
- Next.js Turbopack — Dev-Server (`turbopack: { root: __dirname }` in `next.config.js` wegen Eltern-Pfad-Workaround)
- tsx ^4.21.0 — Direkt-Ausführung von TS-Skripten (`npx tsx scripts/extract-richtlinie.ts`, `scripts/rebuild-queue.ts`, `scripts/smoke-pipeline-models.ts`)
- ESLint via `next lint` (Script `lint`, keine eigene `.eslintrc`/`eslint.config.*` im Repo — Default-Next-Config)

## Key Dependencies

**Critical:**
- openai ^6.34.0 — DeepSeek-Client (OpenAI-kompatibel) in `lib/wizard/llm.ts`, `baseURL: "https://api.deepseek.com"`. Trägt den gesamten Wizard- und Match-Pipeline-Traffic.
- @google/generative-ai ^0.24.1 — Gemini-SDK; weiterhin Default in den Cron-Skripten `scripts/extract-richtlinie.ts` (Modell `gemini-2.5-pro`) und `scripts/scan-new-programs.ts` (Modell `gemini-2.0-flash`); im Runtime-Pfad nur als Provider-Fallback per `LLM_PROVIDER=gemini` aktiv (`lib/wizard/llm.ts`)
- pg ^8.18.0 (+ @types/pg ^8.16.0) — PostgreSQL-Pool (`lib/db.ts`); SSL automatisch in Production (`rejectUnauthorized: false`); ist als `serverExternalPackages` in `next.config.js` markiert
- stripe ^20.4.1 — Server-SDK (`lib/stripe/client.ts`) für Checkout-Sessions und Webhook-Signature-Verifikation; aktuell hinter Dev-Mock (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`) noch nicht produktiv geschaltet
- @stripe/stripe-js ^8.7.0 — Browser-SDK (Redirect zur Hosted-Checkout-URL)
- resend ^4.1.1 — Transaktional-/Newsletter-Mail (`app/api/newsletter/send/route.ts`, `app/api/contact/route.ts`)
- jose ^6.1.3 — Admin-JWT (Sign/Verify, `lib/admin-auth.ts`); benötigt `JWT_SECRET` ≥ 32 Zeichen
- bcryptjs ^2.4.3 (+ @types/bcryptjs ^2.4.6) — Admin-Passwort-Hash (`ADMIN_PASSWORD_HASH`, bcrypt 12 Rounds)

**Infrastructure / Optional:**
- @paypal/react-paypal-js ^8.9.2 — PayPal-Button (zweiter Bezahlpfad in `app/api/paypal/route.ts`, sandbox/live je nach `NODE_ENV`); aktuell nicht im Wizard-Flow aktiv
- @types/node ^20.0.0, @types/react ^18, @types/react-dom ^18, @types/uuid ^10, @types/jest ^29.5.14 — Typen
- postcss ^8.5.6, autoprefixer ^10.4.24 — CSS-Pipeline

## Configuration

**Environment:**
- Templates: `.env.example` (Repo-Standard) und `.env.local.example` (kuratierter Onboarding-Satz). Lokale Datei `.env.local` (gitignoriert)
- Schlüssel-Variablen (vgl. `.env.local.example` und `.env.example`):
  - `DATABASE_URL` — Postgres-Connection (Format `postgresql://user:pass@host:port/db?sslmode=disable`)
  - `LLM_PROVIDER` (`deepseek` | `gemini`, Default `deepseek`)
  - `DEEPSEEK_API_KEY` — Pflicht im Default-Pfad
  - `GEMINI_API_KEY` — Pflicht für Cron-Skripte und Provider-Fallback
  - `OPENROUTER_API_KEY` — vorgesehen, aktuell **nicht im Code referenziert** (toter Slot in `.env.local.example`)
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (bzw. `FROM_EMAIL`), `ADMIN_EMAIL`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_EINZELANTRAG`, `NEXT_PUBLIC_PAYWALL_DEV_MOCK`
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (optional, Sandbox/Live über `NODE_ENV`)
  - `JWT_SECRET` (≥ 32 Zeichen), `ADMIN_PASSWORD_HASH`, `NEWSLETTER_ADMIN_KEY`
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_ID`
  - Optional: `REDIS_URL` (Slot reserviert, Rate-Limit-Store ist aktuell In-Memory; siehe `lib/rate-limit.ts`), `SENTRY_DSN` (vorgesehen, nicht implementiert — vgl. `app/global-error.tsx` „TODO: Sentry/LogRocket")
- Sonstiges: `NEXT_TELEMETRY_DISABLED=1`, `PORT`, `NEXTJS_PORT=3101`

**Build / Tooling:**
- `next.config.js` — Standalone-Output, harte Security-Header (CSP, HSTS, COOP/CORP, Permissions-Policy), Cache-Control-Profile pro Asset-Klasse, Turbopack-Root-Pin
- `middleware.ts` — globale Security-Header, Rate-Limit-Wrapper für `/api/*`, ID-Redirect-Map für alte Programm-URLs
- `tsconfig.json` — `strict`, `moduleResolution: bundler`, Path-Alias `@/*`, `target: ES2017`
- `jest.config.js` — `next/jest`-Preset, `testEnvironment: jsdom`, Coverage-Threshold 50 %, ignoriert `e2e/`

## Platform Requirements

**Development:**
- Node.js 20+, npm
- PostgreSQL 16 — entweder via `docker-compose up -d postgres` (Image `postgres:16-alpine`) oder über SSH-Tunnel zur Dev-DB auf Hetzner mittels `scripts/dev-db-tunnel.sh --bg` (lokaler Port 5433)
- Dev-Server: `npm run dev` → `http://localhost:3101`
- Smoke-Tests: `npm run test:smoke` (Skript `scripts/smoke-test.js`); LLM-Smoke `scripts/smoke-llm.ts`, `scripts/smoke-pipeline-models.ts`

**Production:**
- Hetzner-Server `49.13.15.44`, Docker + Traefik (Let's-Encrypt)
- Container: `edufunds-app` (App), `edufunds-staging`, `edufunds-postgres`, `edufunds-landing`
- Deployment via GitHub Actions (`.github/workflows/build-deploy.yml`, `deploy-staging.yml`, `deploy.yml`) und manuelle Skripte `scripts/deploy-staging.sh` / `scripts/deploy-production.sh`
- Wöchentliche Cron-Workflows: `weekly-dossier-extraction.yml` (Mo 04:00 UTC, Gemini-2.5-pro-Extraktion via `scripts/extract-richtlinie.ts`), `weekly-program-scan.yml` (Gemini-Flash-Scan via `scripts/scan-new-programs.ts`)

## Eval-Apparat (Phase 1 + Phase 5)

> Regressions-Eval fuer Matcher (Phase 1+2) und Generate-Pipeline (Phase 5).
> Versionierte Korpora + Snapshot/Replay + Threshold-Gate-CI.

### Komponenten

| Komponente | Pfad | Phase | Zweck |
|------------|------|-------|-------|
| `scripts/eval-matcher.ts` | `scripts/` | 1+2 | Matcher-Eval: Recall@3, Off-Target-Rate, Clarif-Precision |
| `scripts/eval-pipeline.ts` | `scripts/` | 5 | Pipeline-Eval: WIZ-01/-02/-03 + Finanzplan-Sub |
| `lib/wizard/geber-classification.ts` | `lib/wizard/` | 5 | Programm-ID → 4-5 strategische Geber-Cluster fuer WIZ-03-Judge |
| `lib/wizard/config.ts` | `lib/wizard/` | 5 | 4 Feature-Flags fuer Tuning-Hebel (PIPELINE_CONFIG, alle Env-Var-gesteuert) |
| `data/eval/` | `data/` | 1+5 | Korpora, Snapshots, Reports, BASELINE, TUNING, README |
| `.github/workflows/pipeline-eval.yml` | `.github/workflows/` | 5 | CI-Threshold-Gate fuer PRs auf lib/wizard/** und data/richtlinien/** |

### Eval-Metriken Phase 5

| Metrik | Achse | Gate-Typ |
|--------|-------|----------|
| Pflichtabschnitt-Coverage | WIZ-01 | hart (exit 1 bei > 2σ Regression) |
| Halluzinations-Detection | WIZ-02 | mittel (exit 1 bei > 2σ + 10 % Regression) |
| Tonalitaets-Passung (LLM-Judge) | WIZ-03 | warning-only (zu viel LLM-Varianz fuer hartes Gate) |
| Finanzplan-Validity | Sub | warning-only |

### Tuning-Hebel (Wave 3, Phase 5)

| Flag | Hebel-Nummer | Betrifft |
|------|-------------|---------|
| `PIPELINE_SHARP_PROMPTS` | 1 | CRITIQUE/SECTION/REVISION/RECHECK-Prompts |
| `PIPELINE_COMPLIANCE_STAGE` | 2 | Post-Recheck-Compliance-Check-Stage |
| `PIPELINE_USE_VORBILD_FORMULIERUNGEN` | 3 | Dossier-Daten-Injection in Section/Revision |
| `PIPELINE_GEBER_ROUTING_V2` | 4 | Geber-Guidance-Rubrics (geber-guidance.ts) |

---

*Stack analysis: 2026-04-30 + Eval-Apparat ergaenzt 2026-05-20*
