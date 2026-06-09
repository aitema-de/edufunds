# Codebase Structure

**Analysis Date:** 2026-04-30

## Directory Layout

```
edufunds-app/
├── app/                          # Next.js 16 App Router (Pages + API)
│   ├── admin/                    # Admin-Dashboard (cookie-auth)
│   ├── agb/                      # Statische Rechtsseiten
│   ├── antrag/                   # Antrags-UI (Wizard, Mein Anträge, Download, Checkout-Success)
│   │   ├── [programmId]/         # Programmspezifischer Wizard-Pfad
│   │   │   ├── page.tsx          # Klassischer Antragsassistent (Legacy)
│   │   │   └── wizard/           # Adaptiver Wizard
│   │   ├── checkout/success/     # Stripe-Success-Page
│   │   ├── download/[token]/     # Download nach Bezahlung (paid_token)
│   │   ├── meine/                # Liste lokaler Sessions
│   │   └── start/                # Match-Startseite
│   ├── api/                      # Route-Handler (JSON-API)
│   │   ├── admin/                # Admin-Auth (login/logout)
│   │   ├── assistant/generate/   # Legacy KI-Antrag-Endpoint
│   │   ├── checkout/             # Legacy Checkout
│   │   ├── contact/              # Kontakt-Formular
│   │   ├── foerderprogramme/     # Programm-Liste (cached 1h)
│   │   ├── health/               # Health-Checks
│   │   ├── match/                # Programm-Matching (Top 3)
│   │   ├── newsletter/           # Newsletter-Abo + Send + Unsubscribe
│   │   ├── paypal/               # PayPal (alternativ zu Stripe)
│   │   ├── stripe/               # Stripe-Checkout, -Webhook, -Verify
│   │   ├── vitals/               # Web-Vitals-Sammlung
│   │   └── wizard/               # KI-Wizard-Endpoints (start, answer, generate, ...)
│   ├── archiv/                   # Statisch
│   ├── checkout/                 # Marketing-Checkout-Pfade (einzel, jahresabo, success)
│   ├── datenschutz/              # Statisch
│   ├── foerderprogramme/         # Programm-Katalog (Liste + Detail)
│   ├── impressum/                # Statisch
│   ├── kontakt/                  # Kontakt-Formular
│   ├── preise/                   # Preisseite
│   ├── registrieren/             # Statisch (Newsletter)
│   ├── ueber-uns/                # Statisch
│   ├── error.tsx                 # Page-Level Error Boundary
│   ├── global-error.tsx          # Globaler Error-Catch
│   ├── globals.css               # Globale Styles
│   ├── layout.tsx                # Root-Layout mit Schema.org-JSON-LD
│   ├── not-found.tsx             # 404
│   ├── page.tsx                  # Marketing-Landing
│   └── sitemap.ts                # Dynamische Sitemap
├── components/                   # React-Components
│   ├── Wizard/                   # Wizard-spezifisch (Shell, Result, Editor, Cards)
│   ├── skeletons/                # Loading-Skeletons fuer Lists/Detail/Form
│   ├── ui/                       # Primitive (Button, Input, Card, Dialog, ...)
│   └── *.tsx                     # Marketing-Sektionen + Header/Footer
├── lib/                          # Domain-Logik & Utilities
│   ├── wizard/                   # KI-Pipeline, Matcher, Interviewer, Facts, Richtlinien
│   ├── stripe/                   # Stripe-Client (Singleton)
│   ├── db.ts                     # Postgres-Pool + query-Helper
│   ├── errors.ts                 # Error-Codes + Status-Mapping
│   ├── rate-limit.ts             # Rate-Limit-Middleware-Logic
│   ├── logger.ts                 # Structured Logger
│   ├── monitoring.ts             # Monitoring-Hooks
│   ├── cache.ts                  # Generic Cache-Helper
│   ├── cors.ts                   # CORS-Headers
│   ├── admin-auth.ts             # bcrypt + Cookie-Auth
│   ├── newsletter*.ts            # Newsletter-Versand + Templates
│   ├── ki-antrag-generator.ts    # Legacy KI-Antrag (vor Wizard)
│   ├── optimized-ki-prompts.ts   # Legacy Prompts
│   ├── foerderSchema.ts          # Foerderprogramm TypeScript-Interface
│   └── *Schema.ts / *schema.ts   # Zod-Schemata fuer einzelne Domains
├── data/                         # Statische Daten (eingecheckt)
│   ├── foerderprogramme.json     # 131 Programme (~177 KB)
│   ├── richtlinien/              # Programmspezifische Dossiers
│   │   └── *.json
│   ├── richtlinien-prioritaeten.json # Queue mit 82 prio-Programmen
│   ├── programm-schemas/         # Beispiel-Schema-Variants
│   ├── program-sources.json      # Scout-Quellen-Liste
│   ├── antragsprosa-guide.json   # Schreib-Guide fuer Pipeline
│   ├── backups/                  # JSON-Backups
│   ├── schema.sql                # Tabellen-Schema (Doku)
│   └── *.json                    # Diverse Roh-/Verifizier-Dumps
├── db/                           # SQL-Migrationen
│   └── migrations/
│       ├── 002_wizard_session.sql
│       └── 003_paywall.sql
├── hooks/                        # React Custom-Hooks
│   ├── useErrorHandler.ts
│   └── useLocalStorage.ts
├── middleware.ts                 # Edge-Middleware (Rate-Limit + Security-Headers)
├── scripts/                      # Tooling, Cron, Smoke-Tests, Deployment
│   ├── extract-richtlinie.ts     # Gemini-Pro-Extraktion neuer Dossiers
│   ├── scan-new-programs.ts      # Scout fuer neue Programme
│   ├── rebuild-queue.ts          # Queue aus foerderprogramme.json bauen
│   ├── smoke-llm*.ts             # LLM-Provider-Smoke-Tests
│   ├── smoke-pipeline-models.ts  # A/B deepseek-chat vs. v4-pro
│   ├── smoke-pipeline-rerun.ts   # Pipeline-Rerun gegen Recorded-Sessions
│   ├── smoke-critique-rerun.ts   # Critique-Stage Smoke
│   ├── smoke-facts-extractor.ts  # Facts-Extractor-Smoke
│   ├── smoke-pipeline-with-extractor.ts # End-to-End-Smoke
│   ├── deploy-staging.sh         # Staging-Deploy
│   ├── deploy-production.sh      # Production-Deploy (zwei Bestaetigungen)
│   ├── dev-db-tunnel.sh          # SSH-Tunnel zur Dev-DB (Port 5433)
│   ├── postgres-backup.sh        # DB-Dump (Systemd-Timer)
│   ├── setup-db.ts               # Migration-Runner
│   ├── *.py / *.js               # Daten-Pflege-Skripte (Link-Check, Validierung)
│   └── ki-stabilitaet-test*.ts   # Pipeline-Stabilitaetstests
├── __tests__/                    # Jest-Tests
│   ├── components/               # Footer.test, Header.test
│   └── lib/
│       ├── wizard/               # facts-extractor.test, outline-fallback.test, title-fallback.test
│       ├── backend-utils.test.ts
│       ├── foerderSchema.test.ts
│       ├── ki-antrag-generator.test.ts
│       └── utils.test.ts
├── e2e/                          # Playwright-Specs (homepage, antrag, detail)
├── test/                         # Test-Setup (setup.tsx)
├── mocks/                        # Test-Fixtures (test-programme.json)
├── public/                       # Statische Assets (favicon, robots, sitemap-Helfer)
├── output/                       # Generierte Beispiel-Antraege (~70 Markdown-Dateien)
├── memory/                       # Session-Notizen (sessionsuebergreifend, vor Memory-Move)
├── docs/                         # Markdown-Dokumentation
├── templates/                    # E-Mail-Templates (newsletter.html, .txt)
├── backups/                      # Manuelle Backups
├── types/                        # Globale TypeScript-Deklarationen
├── tmp/                          # Scratch-Space (gitignored)
├── dist-nextjs-backup/           # Alter Build-Output (Cleanup-Kandidat)
├── docker-compose.yml            # Lokal: Next + Postgres
├── docker-compose.prod.yml       # Production: 4 Container (app, staging, postgres, landing)
├── Dockerfile / Dockerfile.*     # Verschiedene Build-Varianten (prod, dev, nginx, static)
├── next.config.js                # Standalone-Output, Security-Header, Cache-Header
├── tailwind.config.js            # Tailwind-Theme
├── tsconfig.json                 # TypeScript-Config (path-alias `@/*`)
├── jest.config.js                # Jest-Setup
├── middleware.ts                 # Edge-Middleware
├── package.json                  # Dependencies + Scripts
├── README.md                     # Feature- und Stack-Uebersicht
├── CLAUDE.md                     # Agent-Onboarding (DeepSeek-Stand 28.04.)
├── DEV-WORKFLOW.md               # Lokale Dev-Doku
├── DEPLOY.md                     # Deployment-Doku
├── STRIPE_SETUP.md               # Stripe-Anleitung
├── PR_DRAFT_WIZARD.md            # Aktueller PR-Status
└── *.md                          # Diverse Status-/Plan-/Memory-Dokumente
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router — Routen + Layouts + API-Endpoints.
- Contains: Page-Components (`page.tsx`), Layouts (`layout.tsx`), Error-Boundaries, Route-Handler (`route.ts`).
- Key files: `app/layout.tsx`, `app/page.tsx`, `app/antrag/[programmId]/wizard/page.tsx`, `app/api/wizard/generate/route.ts`, `app/api/match/route.ts`.

**`app/api/wizard/`:**
- Purpose: KI-Wizard-API.
- Contains: Pro Endpunkt ein Unterordner mit `route.ts`. Pfade akzeptieren `POST` (Body mit `sessionToken`) bis auf `[token]/route.ts` (`GET` mit Path-Param).
- Key files: `start/route.ts`, `answer/route.ts`, `generate/route.ts`, `edit-answer/route.ts`, `[token]/route.ts`, `checkout/route.ts`, `readiness/route.ts`, `kumulierungs-check/route.ts`, `finanzplan/autofix/route.ts`, `finanzplan/legitimize/route.ts`.

**`app/antrag/`:**
- Purpose: User-facing Antrags-UI.
- Contains: Server-Components mit `generateStaticParams` (Wizard) und Client-Wrapper-Pages.
- Key files: `[programmId]/wizard/page.tsx` (Wizard-Einstieg), `start/page.tsx` (Match), `meine/page.tsx` (Session-Liste), `download/[token]/page.tsx` (Paid-Download), `checkout/success/page.tsx`.

**`components/Wizard/`:**
- Purpose: Wizard-spezifische React-Components (Client).
- Contains: Container-Component `WizardShell.tsx` (~545 Zeilen), Result-View `AntragResult.tsx`, Editor-Components, kleine Helfer.
- Key files: `WizardShell.tsx`, `AntragResult.tsx`, `FinanzplanEditor.tsx`, `PaywallGate.tsx`, `ChronologySidebar.tsx`, `QuestionCard.tsx`, `ReadinessAmpel.tsx`, `KumulierungsWarnung.tsx`, `MatchResultList.tsx`, `StartClient.tsx`, `MyAntraegeClient.tsx`, `CheckoutSuccessClient.tsx`, `WizardErrorBlock.tsx`, `index.ts` (Barrel mit `WizardShell`-Export).

**`components/`:**
- Purpose: Marketing-/UI-Components.
- Contains: Sections (Hero, Features, Testimonials, Pricing, CTA), Layout (Header, Footer, PageHero), Generic (GlassCard, ErrorBoundary, ErrorMessage, AsyncDataLoader), Loading-States.
- Key files: `Header.tsx`, `Footer.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `KIAntragAssistent.tsx` (Legacy, ~20 KB), `WebVitals.tsx`, `GoogleAnalytics.tsx`.

**`components/ui/`:**
- Purpose: Primitive Building-Blocks (Shadcn-Style: Button, Input, Card, Dialog, FormField, Skeleton).
- Contains: 14 kleine Files mit class-variance-authority + tailwind-merge.

**`components/skeletons/`:**
- Purpose: Loading-Skeletons fuer Detail- und Listen-Views.
- Key files: `DetailSkeleton.tsx`, `FormSkeleton.tsx`, `ProgrammCardSkeleton.tsx`, `index.ts`.

**`lib/wizard/`:**
- Purpose: Domain-Modul fuer KI-Pipeline. Reine TypeScript-Funktionen, keine UI.
- Contains: Stages (matcher, interviewer, facts-extractor, pipeline, finanzplan-generator/-validator/-autofix), Schemas (types, richtlinien-schema), Persistenz (session), LLM-Wrapper (llm), Pricing-Ledger (pricing), Domain-Helper (geber-guidance, programm-kriterien, projekt-overlap, error-classifier, facts-readiness, finanzplan-markdown), Browser-Storage-Helfer (school-profile-client, match-handoff-client, session-index-client), Fallbacks (outline-fallback, title-fallback), Prompt-Bibliothek (prompts).
- Key files: `pipeline.ts` (~12 KB, Hauptorchestrator), `prompts.ts` (~37 KB, alle System- und User-Prompts), `matcher.ts`, `interviewer.ts`, `facts-extractor.ts`, `llm.ts`, `session.ts`, `types.ts`, `richtlinien-loader.ts`, `richtlinien-schema.ts`, `pricing.ts`.

**`lib/`:**
- Purpose: Cross-cutting Utilities und Domain-Helper.
- Contains: DB-Pool, Errors, Logging, Monitoring, Rate-Limit, Validation-Schemata, Newsletter-Engine, CORS-Helfer, Admin-Auth, Stripe-Client, Legacy KI-Generator.
- Key files: `db.ts`, `errors.ts`, `rate-limit.ts`, `logger.ts`, `monitoring.ts`, `foerderSchema.ts`, `admin-auth.ts`, `stripe/client.ts`.

**`data/`:**
- Purpose: Statischer Datenstamm — wird zur Build-Zeit per `import` eingebunden, nicht aus DB gelesen.
- Contains: Foerderprogramm-Katalog, Richtlinien-Dossiers (11 fertig, 70 offen, 1 skip — siehe `richtlinien-prioritaeten.json`), Scout-Quellen, diverse Snapshot/Backup-Dateien.
- Key files: `foerderprogramme.json`, `richtlinien/<programmId>.json`, `richtlinien-prioritaeten.json`, `programm-sources.json`, `antragsprosa-guide.json`, `README.md`.

**`db/migrations/`:**
- Purpose: Idempotente SQL-Migrationen.
- Contains: `002_wizard_session.sql` (session_token + status-Erweiterung), `003_paywall.sql` (paid_token + Stripe-Felder).
- Naming: `00X_<feature>.sql` Praefix-Nummerierung. Migration `001` faktisch in `scripts/init-db.sql` als Bootstrap.

**`scripts/`:**
- Purpose: Tooling abseits der App — Daten-Cleanup-Iterationen, Smoke-Tests, Cron-Skripte, Deploy-Wrapper.
- Contains: 70+ Skripte (Mix TS/JS/Python/Shell). Unterteilt in Daten-Bereinigungsserien (`01_…py`–`14_…py`), Smoke-Tests (`smoke-*.ts`), Cron-Tools (`extract-richtlinie.ts`, `scan-new-programs.ts`, `scout-cron.sh`), Backup, Deployment, Setup.
- Key files: `extract-richtlinie.ts`, `scan-new-programs.ts`, `rebuild-queue.ts`, `deploy-{staging,production}.sh`, `dev-db-tunnel.sh`, `postgres-backup.sh`, `smoke-pipeline-models.ts`, `smoke-pipeline-with-extractor.ts`.

**`__tests__/`:**
- Purpose: Jest-Unit-Tests (NICHT co-located).
- Contains: `__tests__/components/` (Footer, Header), `__tests__/lib/` (utils, foerderSchema, ki-antrag-generator), `__tests__/lib/wizard/` (facts-extractor, outline-fallback, title-fallback).

**`e2e/`:**
- Purpose: Playwright-E2E-Tests.
- Contains: `homepage.spec.ts`, `antrag-page.spec.ts`, `detail-page.spec.ts`.

**`memory/`:**
- Purpose: Historische Session-Notizen (vor Move zu `~/.claude/projects/`-Memory).
- Generated: Manuell.
- Committed: Yes (Lehre, nicht aktiv-genutzt).

**`output/`:**
- Purpose: Generierte Beispiel-Antraege fuer Marketing/Demo.
- Contains: ~70 Markdown-Dateien mit `*-OPTIMIERT.md` Suffix.
- Generated: Manuell durch frueheren Pipeline-Lauf.
- Committed: Yes.

**`docs/`:**
- Purpose: Markdown-Dokumentation, getrennt vom Repo-Root.
- Contains: Detail-Dokumente abseits der `*.md` im Root.

**`dist-nextjs-backup/`:**
- Purpose: Alter Build-Output, Cleanup-Kandidat.
- Generated: Alter Build.
- Committed: Yes (sollte besser nicht).

**`tmp/`:**
- Purpose: Scratch-Space.
- Generated: Yes.
- Committed: No (gitignored).

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Marketing-Landing
- `app/layout.tsx`: Root-Layout mit Fonts, JSON-LD, WebVitals
- `middleware.ts`: Edge-Middleware (Rate-Limit, Security-Header, Legacy-Redirects)
- `app/antrag/start/page.tsx`: Match-Einstieg fuer den Wizard-Flow
- `app/antrag/[programmId]/wizard/page.tsx`: Wizard-Hauptseite (programmspezifisch)

**Configuration:**
- `next.config.js`: Standalone-Build, Security-/Cache-Header, Turbopack-Workspace-Root
- `tsconfig.json`: TypeScript-Config (Path-Alias `@/*` → Root)
- `tailwind.config.js`: Tailwind-Theme
- `jest.config.js`: Jest-Setup
- `postcss.config.cjs`: PostCSS-Setup
- `.env.local.example`: Vorlage mit erforderlichen Env-Vars (kommentiert)
- `.nvmrc`: Node-Version-Pin
- `docker-compose.prod.yml`: Production-Container-Setup (4 Container)
- `Dockerfile.prod`: Production-Image
- `nginx.conf` / `nginx-static.conf`: Landing-Container-Config

**Core Logic:**
- `lib/wizard/pipeline.ts`: Generate-Pipeline (Outline/Section/Critique/Recheck/Revision/Consistency)
- `lib/wizard/matcher.ts`: Programm-Matching mit Top-N-Prefilter
- `lib/wizard/interviewer.ts`: Naechste-Frage-Logik
- `lib/wizard/facts-extractor.ts`: Stage 1 vor Interviewer
- `lib/wizard/finanzplan-generator.ts`: Finanzplan-Stage
- `lib/wizard/finanzplan-validator.ts`: Plan-Validierung gegen Richtlinie
- `lib/wizard/finanzplan-autofix.ts`: LLM-freie Auto-Korrekturen
- `lib/wizard/llm.ts`: Provider-Wrapper (DeepSeek default, Gemini-Fallback)
- `lib/wizard/prompts.ts`: Komplette Prompt-Bibliothek (alle Stages)
- `lib/wizard/session.ts`: DB-Persistenz (Postgres, JSONB-Spalte `antrag_data`)
- `lib/wizard/richtlinien-loader.ts`: Lazy-Load + In-Memory-Cache
- `lib/db.ts`: Postgres-Pool + Query-Helper
- `lib/stripe/client.ts`: Stripe-Singleton

**Testing:**
- `__tests__/lib/wizard/`: Wizard-Unit-Tests (facts-extractor, outline-fallback, title-fallback)
- `__tests__/components/`: Component-Tests (Header, Footer)
- `__tests__/lib/`: Library-Tests (foerderSchema, utils, ki-antrag-generator)
- `e2e/`: Playwright-Specs
- `test/setup.tsx`: Jest-Setup mit Testing-Library
- `mocks/test-programme.json`: Fixture-Daten

## Naming Conventions

**Files:**
- React-Components: PascalCase (`WizardShell.tsx`, `AntragResult.tsx`, `Header.tsx`)
- Library-Module: kebab-case (`facts-extractor.ts`, `school-profile-client.ts`, `richtlinien-loader.ts`)
- Singular-Nouns/Camel-Schema-Files: camelCase (`foerderSchema.ts`, `contactApi.ts`)
- Route-Handler: immer `route.ts` (App-Router-Konvention)
- Pages: immer `page.tsx` (App-Router-Konvention)
- Layouts: immer `layout.tsx`
- Tests: `<modul>.test.ts` / `<modul>.test.tsx`
- E2E-Specs: `<feature>.spec.ts`
- SQL-Migrationen: `00X_<feature>.sql` (zero-padded)

**Directories:**
- App-Router-Strukturen mit Lowercase + Bindestrichen (`/foerderprogramme`, `/api/wizard`).
- Dynamic-Segments in eckigen Klammern (`[programmId]`, `[token]`).
- Test-Verzeichnis `__tests__` (Jest-Konvention).
- Component-Subdirektories nach Domain: `components/Wizard/` (capital, weil Domain-Name) vs. `components/ui/` (lowercase, weil generic).
- Datendomaenen (`data/richtlinien/`, `data/programm-schemas/`) snake-case.

**Identifier:**
- TypeScript-Interfaces: PascalCase, oft mit Domain-Praefix (`WizardSession`, `WizardFacts`, `Foerderprogramm`, `Richtlinie`).
- Functions: camelCase (`runMatch`, `runPipeline`, `extractFacts`, `mergeFacts`).
- Konstanten: UPPER_SNAKE_CASE (`MODEL_INTERVIEW`, `MODEL_PIPELINE`, `MAX_QUESTIONS_DEFAULT`, `OVERLAP_HARD`).
- Deutsche Bezeichner in Domain-Code akzeptiert (`Foerderprogramm`, `Richtlinie`, `Antragsstruktur`, `Kostenposition`, `Kostenkategorie`, `Eigenmittel`, `Foerderhoehe`, `Begruendung`). Umlaute in Identifiern werden vermieden (ae/oe/ue/ss-Schreibweise).

## Where to Add New Code

**New Wizard-Stage (zusaetzlich zu Outline/Section/Critique/Recheck/Revision/Consistency):**
- Domain-Logik: `lib/wizard/<stage-name>.ts` (reine Funktion mit `LlmResult`-Rueckgabe)
- Prompt: erweitere `lib/wizard/prompts.ts` mit `<STAGE>_SYSTEM` + `build<Stage>Prompt(...)`
- Integration: in `lib/wizard/pipeline.ts#runPipeline` einreihen, `PipelineEvent.stage` um den neuen Stage-Tag erweitern, Artefact in `GenerationArtefacts` (`lib/wizard/types.ts`) ergaenzen
- Smoke-Test: `scripts/smoke-pipeline-rerun.ts` adaptieren oder neuen `scripts/smoke-<stage>.ts` anlegen
- Tests: `__tests__/lib/wizard/<stage-name>.test.ts`

**New API-Endpoint:**
- Pfad: `app/api/<bereich>/<aktion>/route.ts`
- Falls Wizard-spezifisch: `app/api/wizard/<aktion>/route.ts`
- Body-Validierung manuell oder via Zod (`lib/<bereich>-schema.ts`)
- DB-Zugriff via `lib/db.ts#query` oder spezifisches Domain-Modul (`lib/wizard/session.ts`, `lib/newsletter.ts`)
- Rate-Limit-Kategorie ggf. in `lib/rate-limit.ts:29` hinzufuegen
- Error-Klassifikation: `lib/errors.ts` erweitern wenn neuer Fehler-Code

**New UI-Component (Wizard):**
- Implementation: `components/Wizard/<ComponentName>.tsx`
- `"use client"` falls State/Hooks
- Re-Export ueber `components/Wizard/index.ts` falls oeffentlich
- Tests: `__tests__/components/<ComponentName>.test.tsx`

**New UI-Component (Marketing):**
- `components/<ComponentName>.tsx` (flach im Components-Root)
- Server-Component default; `"use client"` nur wenn noetig

**New UI-Primitive:**
- `components/ui/<primitive>.tsx`
- class-variance-authority + tailwind-merge wie bestehende Primitives

**New Page-Route:**
- Statisch: `app/<pfad>/page.tsx` (Server-Component)
- Mit Daten: `generateStaticParams` + `generateMetadata` neben `page.tsx`
- Dynamic-Segment: `app/<pfad>/[id]/page.tsx`
- Layout pro Subbaum: `app/<pfad>/layout.tsx`

**New Foerderprogramm:**
- Eintrag in `data/foerderprogramme.json` (folgt `lib/foerderSchema.ts`-Schema)
- Optional Dossier `data/richtlinien/<programmId>.json` (folgt `lib/wizard/richtlinien-schema.ts`)
- Queue-Eintrag in `data/richtlinien-prioritaeten.json` mit `programmId` + `score` + `status` (`open`/`done`/`skip`)
- Nach Edits: `npx tsx scripts/rebuild-queue.ts`

**New DB-Migration:**
- Datei: `db/migrations/<NNN>_<feature>.sql` (naechste freie Nummer)
- Idempotent (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS ... ADD CONSTRAINT ...`)
- Ausgefuehrt manuell oder via `scripts/setup-db.ts`

**New Background-Skript / Cron:**
- TypeScript: `scripts/<name>.ts`, ausgefuehrt mit `npx tsx scripts/<name>.ts`
- Shell-Wrapper: `scripts/<name>.sh`, executable
- Wenn produktiv: zusaetzlich Systemd-Unit + Timer (vgl. `scripts/postgres-backup.service` + `.timer`)

**New Test:**
- Unit: `__tests__/lib/<modul>.test.ts` oder `__tests__/components/<Component>.test.tsx`
- E2E: `e2e/<feature>.spec.ts` (Playwright)
- Smoke: `scripts/smoke-<area>.ts` (kein Jest, eigenstaendig per `npx tsx`)

## Special Directories

**`data/`:**
- Purpose: Single-Source-of-Truth fuer Foerderprogramm-Katalog + Richtlinien.
- Generated: Manuell + via `scripts/scan-new-programs.ts` + `scripts/extract-richtlinie.ts`.
- Committed: Yes (Daten sind Teil des Produkts).

**`output/beispiel-antraege/`:**
- Purpose: Manuell exportierte Marketing-Antragsbeispiele.
- Generated: Manuell durch Pipeline-Laeufe.
- Committed: Yes.

**`memory/`:**
- Purpose: Historische Sessions, Notizen.
- Generated: Manuell.
- Committed: Yes (legacy — neue Sessions liegen in `~/.claude/projects/-home-kolja/memory/edufunds-project.md`).

**`backups/` / `data/backups/`:**
- Purpose: JSON-Snapshots vor Daten-Cleanups.
- Generated: `scripts/backup-data.js`.
- Committed: Yes (selektiv).

**`dist-nextjs-backup/`:**
- Purpose: Alter Build-Output.
- Generated: Alter Build.
- Committed: Yes (Cleanup-Kandidat).

**`.next/`, `node_modules/`, `.swc/`, `tsconfig.tsbuildinfo`:**
- Generated: Yes.
- Committed: No (gitignored).

**`tmp/`:**
- Purpose: Scratch fuer Smoke-Test-Outputs etc.
- Generated: Yes.
- Committed: No.

**`mocks/`:**
- Purpose: Test-Fixtures.
- Generated: No.
- Committed: Yes.

**`templates/`:**
- Purpose: E-Mail-Templates fuer Newsletter (HTML + Plain-Text).
- Committed: Yes.

---

*Structure analysis: 2026-04-30*
