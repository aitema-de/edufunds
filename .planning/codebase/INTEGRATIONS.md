# External Integrations

**Analysis Date:** 2026-04-30

## APIs & External Services

**LLM-Provider (Wizard, Matcher, Pipeline):**
- DeepSeek — Default-Provider für Interview UND Pipeline
  - SDK/Client: `openai` ^6.34.0 mit `baseURL: "https://api.deepseek.com"` (`lib/wizard/llm.ts`, `getDeepseek()`)
  - Modell: `deepseek-chat` für beide Stages (`MODEL_INTERVIEW`, `MODEL_PIPELINE`)
  - Auth: `DEEPSEEK_API_KEY`
  - Aktivierung: `LLM_PROVIDER=deepseek` (Default)
  - Hard-Timeout: 60 s pro Call (`REQUEST_TIMEOUT_MS` in `lib/wizard/llm.ts`)
  - Wichtig: `deepseek-v4-flash`/`-v4-pro` sind Reasoning-Modelle (~80 interne Tokens), daher bewusst `deepseek-chat`
- Google Gemini — Fallback-Provider plus aktiver Pfad in den Cron-Skripten
  - SDK: `@google/generative-ai` ^0.24.1
  - Modelle: `gemini-2.0-flash` (Interview) + `gemini-2.5-pro` (Pipeline) im Wrapper; Cron-Skript `scripts/extract-richtlinie.ts` ruft `gemini-2.5-pro` direkt, `scripts/scan-new-programs.ts` ruft `gemini-2.0-flash` direkt — bypassen `lib/wizard/llm.ts`
  - Auth: `GEMINI_API_KEY`
  - Aktivierung im Runtime: `LLM_PROVIDER=gemini`
- OpenRouter — als Slot in `.env.local.example` (`OPENROUTER_API_KEY`) erwähnt, **aktuell nicht im Code referenziert**

**Payments:**
- Stripe (Standard-Payment, kein Connect)
  - Server-SDK: `stripe` ^20.4.1 (Singleton-Client `lib/stripe/client.ts`)
  - Browser-SDK: `@stripe/stripe-js` ^8.7.0
  - Routes: `app/api/wizard/checkout/route.ts` (Wizard-Tier `einzelantrag`), `app/api/stripe/checkout/route.ts` (Legacy-Checkout), `app/api/stripe/webhook/route.ts` (Webhook), `app/api/stripe/verify/route.ts` (Verify), `app/api/wizard/checkout/dev-mock/route.ts` (Dev-Bypass)
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_EINZELANTRAG`
  - Status: produktiv noch **nicht** geschaltet (Account-Anlage Pfad A unter aitema GmbH offen, vgl. `STRIPE_SETUP.md`); Dev-Mock via `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` markiert Sessions als bezahlt ohne Stripe-Call
  - Webhook-Events behandelt: `checkout.session.completed` → `markSessionPaid()`; `charge.refunded`, `checkout.session.expired`, `checkout.session.async_payment_failed` werden geloggt aber nicht gehandhabt
- PayPal (zweiter Bezahlpfad, separat zum Wizard)
  - Server-Route: `app/api/paypal/route.ts` (REST-Aufrufe an PayPal-OAuth + Orders)
  - Browser-SDK: `@paypal/react-paypal-js` ^8.9.2
  - Endpoints: `https://api-m.paypal.com` (Live, `NODE_ENV=production`) bzw. `https://api-m.sandbox.paypal.com` (sonst)
  - Auth: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
  - Produkte: `einzel` (29 €) und `jahresabo` (149 €) als Hard-Coded-Preise — nicht im Wizard-Paywall-Flow integriert

**Email:**
- Resend
  - SDK: `resend` ^4.1.1
  - Imports: `app/api/newsletter/send/route.ts`, `app/api/contact/route.ts`
  - Auth: `RESEND_API_KEY`
  - From-Adresse: `RESEND_FROM_EMAIL` (alternativ `FROM_EMAIL`), Default `noreply@edufunds.org`
  - Admin-Notifications gehen an `ADMIN_EMAIL` (Default `office@aitema.de`)

**Analytics:**
- Google Analytics 4 (gtag)
  - Komponente: `components/GoogleAnalytics.tsx` lädt `https://www.googletagmanager.com/gtag/js?id=$GA_ID`
  - Auth/Config: `NEXT_PUBLIC_GA_ID`
  - Helfer: `gtag`-Wrapper für `event` und `purchase` (Conversion-Tracking)

## Data Storage

**Databases:**
- PostgreSQL 16 (`postgres:16-alpine` lokal, separater `edufunds-postgres`-Container in Production)
  - Connection: `DATABASE_URL` (Format `postgresql://user:pass@host:port/db?sslmode=disable`)
  - Client: `pg` ^8.18.0 — Connection-Pool als Singleton (`lib/db.ts`, `getPool()`); SSL automatisch aktiv in Production (`rejectUnauthorized: false`)
  - Migrationen: `db/migrations/002_wizard_session.sql` (Wizard-Session-Token + Status-Erweiterung), `db/migrations/003_paywall.sql` (Paid-Token + Stripe-Felder); idempotent (`IF NOT EXISTS`/`IF EXISTS`)
  - Initial-Setup: `scripts/init-db.sql` (Docker-Entrypoint), `scripts/setup-db.ts` (Bootstrap via `lib/db.ts#initializeDatabase`)
  - Tabellen (Auszug): `newsletter_entries`, `contact_requests`, `ki_antraege` (mit `session_token`, `paid_token`, `paid_at`, `stripe_session_id`, `stripe_customer_email`, `tier`, Status-Set `draft|in_progress|complete|paid|submitted|approved|rejected`)
  - Backups: `scripts/backup.sh`, `scripts/postgres-backup.sh` + systemd-Units `scripts/postgres-backup.service|.timer`
  - Dev-Zugriff: SSH-Tunnel via `scripts/dev-db-tunnel.sh --bg` (Hetzner → `localhost:5433`)
  - Kein ORM, kein Supabase (entgegen älterer Memo-Stände — vgl. `CLAUDE.md`)

**Datei-/Asset-Storage:**
- Lokales Dateisystem für JSON-Datenkatalog
  - `data/foerderprogramme.json` (131 Programme), `data/richtlinien-prioritaeten.json` (Prio-Queue), `data/richtlinien/<programmId>.json` (Dossiers)
  - Schema-Backup `data/schema.sql`, Backups `data/backups/`
- `public/` für statische Assets (Bilder, Fonts via Google Fonts CDN)
- Newsletter-Templates `templates/newsletter.html` + `templates/newsletter.txt`
- Kein Object-Storage (S3/R2/...) im Einsatz

**Caching:**
- In-Memory: SWR (`swr` ^2.4.0) für Programmlisten (`lib/swr-fetcher.ts` + `app/foerderprogramme/page.tsx`)
- Rate-Limit-Store: `Map<string, RateLimitEntry>` im Prozess (`lib/rate-limit.ts`); Cleanup-Interval alle 5 Min
- Redis: Slot in `.env.example` (`REDIS_URL`) und Kommentar in `lib/rate-limit.ts` („in Production: Redis") — **nicht implementiert**
- HTTP-Cache: pro-Route Cache-Control-Header in `next.config.js` (`/api/foerderprogramme` mit `s-maxage=3600`, statische Assets `immutable`, andere `/api/*` `no-store`)

## Authentication & Identity

**Public-Wizard:**
- Anonyme Sessions ohne Login
- Session-Token (UUID) in DB-Spalte `ki_antraege.session_token` (Migration `db/migrations/002_wizard_session.sql`)
- Paid-Token nach Zahlung in `ki_antraege.paid_token` (Migration `db/migrations/003_paywall.sql`) — wird im Stripe-Webhook gesetzt (`markSessionPaid()` aus `lib/wizard/session.ts`)

**Admin:**
- JWT (HS256) via `jose` ^6.1.3 in `lib/admin-auth.ts` (`SignJWT`/`jwtVerify`)
- Passwort-Hash mit bcryptjs ^2.4.3, 12 Rounds (`ADMIN_PASSWORD_HASH`)
- Auth-Variablen: `JWT_SECRET` (≥ 32 Zeichen), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `NEWSLETTER_ADMIN_KEY`
- Externer Auth-Provider: keiner (kein Supabase Auth, kein NextAuth, kein OAuth)

## Monitoring & Observability

**Error Tracking:**
- Slot vorgesehen (`SENTRY_DSN` in `.env.example`, `app/global-error.tsx` enthält `// TODO: Sentry/LogRocket Integration wenn verfügbar`)
- Aktuell keine produktive Integration — Errors gehen via `console.error` in die Container-Logs

**Logs:**
- `console.log` / `console.error` mit Präfixen wie `[DB]`, `[stripe/webhook]`, `[wizard/llm]`
- Eigenes Logging-Modul `lib/logger.ts`
- Monitoring-Helper `lib/monitoring.ts` (Mail-Benachrichtigung an Admin-Dashboard)

**Health Checks:**
- Endpoint `app/api/health` (Container-Healthcheck in `docker-compose.yml`: `wget --spider http://localhost:3000/api/health`)
- Skript: `npm run health:check` → `curl http://localhost:3101/api/health`
- Postgres-Healthcheck via `pg_isready` im Compose-Service

**Performance / Vitals:**
- Endpoint `app/api/vitals` für Web-Vitals-Reports

## CI/CD & Deployment

**Hosting:**
- Hetzner-Server `49.13.15.44` mit Docker + Traefik (Let's-Encrypt-Cert-Resolver)
- Domains: `app.edufunds.org` (Production), `staging.edufunds.org` (Staging), Landing über separate Container

**CI Pipeline (GitHub Actions):**
- `.github/workflows/build-deploy.yml` — Build + Push Container-Image nach `ghcr.io` (auf Pushes nach `main`/`staging` und manuell)
- `.github/workflows/deploy.yml` — Deployment-Workflow
- `.github/workflows/deploy-staging.yml` — rsync von `dist/` nach Hetzner und Container-Restart über SSH (`HETZNER_SSH_KEY`, `HETZNER_HOST`, `HETZNER_USER` als Secrets)
- `.github/workflows/weekly-dossier-extraction.yml` — Cron Mo 04:00 UTC, ruft `npx tsx scripts/extract-richtlinie.ts --next` (Gemini-2.5-pro), eröffnet Pull Request mit dem neuen Dossier
- `.github/workflows/weekly-program-scan.yml` — wöchentlicher Scan neuer Programme via Gemini-Flash, schreibt in `data/program-candidates.json` und öffnet PR

**Deployment-Skripte (manuell/PowerShell):**
- `scripts/deploy-staging.sh`, `scripts/deploy-production.sh`
- `deploy.js`, `github-deploy.js`, `github-push.js`, `export-static.js`

**Dockerfiles** (mehrere Varianten je Use-Case):
- `Dockerfile`, `Dockerfile.dev`, `Dockerfile.prod`, `Dockerfile.standalone`, `Dockerfile.nginx`, `Dockerfile.nginx-static`, `Dockerfile.simple`, `Dockerfile.static`, `Dockerfile.deploy`
- Compose: `docker-compose.yml` (Dev), `docker-compose.prod.yml` (Prod)

## Environment Configuration

**Required env vars (Production-kritisch):**
- `DATABASE_URL` — Postgres-Connection
- `LLM_PROVIDER` — Default `deepseek`
- `DEEPSEEK_API_KEY` — Pflicht im Default-Pfad
- `GEMINI_API_KEY` — Pflicht für Cron-Workflows (`extract-richtlinie.ts`, `scan-new-programs.ts`) und Provider-Fallback
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (alternativ `FROM_EMAIL`), `ADMIN_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_EINZELANTRAG` — sobald Paywall live geht
- `JWT_SECRET` (≥ 32 Zeichen), `ADMIN_PASSWORD_HASH`, `NEWSLETTER_ADMIN_KEY`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_ID`

**Required env vars (optional / Pfad-spezifisch):**
- `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` — solange Stripe nicht produktiv ist
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` — für PayPal-Pfad
- `OPENROUTER_API_KEY` — Slot reserviert, ungenutzt
- `REDIS_URL` — Slot reserviert, ungenutzt
- `SENTRY_DSN` — Slot reserviert, ungenutzt

**Secrets-Locations:**
- Lokal: `.env.local` (gitignoriert, Templates `.env.example` und `.env.local.example`)
- CI: GitHub Actions Secrets (`HETZNER_SSH_KEY`, `HETZNER_HOST`, `HETZNER_USER`, plus LLM-/Stripe-/Resend-Keys für Cron-Workflows)
- Production-Container: Environment-Vars aus `.env`-Datei auf dem Hetzner-Host
- `.gitignore` blockiert `.env`, `.env.local`, `.env.production`, `.env.*.local`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` (`app/api/stripe/webhook/route.ts`) — Stripe-Checkout-Events
  - Validiert `stripe-signature` gegen `STRIPE_WEBHOOK_SECRET`
  - Liest Raw-Body via `await req.text()`, `runtime = "nodejs"`, `dynamic = "force-dynamic"`
  - Aktiv: `checkout.session.completed` → `markSessionPaid()` mit Metadata `wizard_session_token`, `tier`, Customer-Email
  - Geloggt aber nicht behandelt: `charge.refunded`, `checkout.session.expired`, `checkout.session.async_payment_failed`
- Newsletter-Bestätigung/Unsubscribe: `app/api/newsletter` und `app/api/newsletter/unsubscribe` (Token-basiert, kein externer Webhook im engeren Sinne)
- PayPal: `return_url` `${NEXT_PUBLIC_URL}/checkout/success?method=paypal` — kein eingehender PayPal-Webhook implementiert

**Outgoing:**
- DeepSeek REST (`https://api.deepseek.com/chat/completions` über `openai`-SDK) — Wizard-Pipeline
- Gemini REST (`generativelanguage.googleapis.com` über `@google/generative-ai`) — Cron-Skripte und Fallback
- Stripe REST (`api.stripe.com`) — Checkout-Sessions
- PayPal REST (`api-m.paypal.com` / `api-m.sandbox.paypal.com`) — OAuth + Orders
- Resend REST — Mail-Versand (Newsletter, Bestätigungs-Mails, Kontaktformular)
- Google Tag Manager — `https://www.googletagmanager.com/gtag/js?id=$GA_ID` (Browser-Side)

---

*Integration audit: 2026-04-30*
