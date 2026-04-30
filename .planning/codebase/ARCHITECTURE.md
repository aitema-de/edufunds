# Architecture

**Analysis Date:** 2026-04-30

## Pattern Overview

**Overall:** Next.js 16 App Router Monolith mit klar geschnittener KI-Pipeline-Domain

**Key Characteristics:**
- App-Router-Stack: Server-Components rendern Routen, Client-Components (`"use client"`) treiben den Wizard, Route-Handler bilden die JSON-API.
- KI-Domain ist als reines Library-Modul gekapselt (`lib/wizard/`) — Stages sind reine Funktionen, der Route-Handler ist nur Orchestrator + DB-Persistenz.
- Datenstamm ist statisch und versioniert in `data/foerderprogramme.json` + `data/richtlinien/<programmId>.json`. Postgres haelt nur Sessions, Newsletter und Kontaktanfragen — kein ORM, direkt `pg`.
- Anonyme Session-Modell: jeder Wizard-Lauf identifiziert sich per opakem `session_token` (UUID, im `localStorage` gespeichert). Zahlung erzeugt zusaetzlich `paid_token` als Entitlement-Handle.
- Provider-agnostische LLM-Schicht: `lib/wizard/llm.ts` schaltet ueber `LLM_PROVIDER`-Env zwischen DeepSeek (default, OpenAI-SDK) und Gemini (Google-SDK).

## Layers

**Pages / Routes (App Router):**
- Purpose: Statische und SEO-relevante Routen, Antrags-UI, Foerderprogramm-Katalog.
- Location: `app/`
- Contains: Server Components mit `generateStaticParams`/`generateMetadata`, Page-Layouts, `error.tsx`/`not-found.tsx`/`global-error.tsx`.
- Depends on: `components/`, `lib/wizard/richtlinien-loader.ts`, `data/foerderprogramme.json`.
- Used by: Browser direkt; Indizierung in `app/sitemap.ts`.

**API Route Handlers:**
- Purpose: JSON-Endpunkte fuer Wizard, Matching, Stripe, Health, Newsletter, Kontakt, Admin.
- Location: `app/api/**/route.ts`
- Contains: `POST`/`GET`-Handler, Zod-Validierung, DB-Zugriff via `lib/db.ts`, Pipeline-Orchestrierung.
- Depends on: `lib/wizard/*`, `lib/stripe/client.ts`, `lib/db.ts`, `lib/rate-limit.ts`, `lib/errors.ts`.
- Used by: Frontend (`components/Wizard/*`), Stripe-Webhook (extern).

**UI Components:**
- Purpose: Wiederverwendbare React-Bausteine; Wizard-Shell, Marketing-Sektionen, Forms, Skeletons.
- Location: `components/` mit Subdomain `components/Wizard/` (Wizard-spezifisch) und `components/ui/` (Primitives).
- Contains: Client-Components mit Hooks, Server-Components fuer Marketing.
- Depends on: `lib/wizard/*-client.ts` (Browser-Storage-Helpers), `hooks/`, `lib/utils.ts`.
- Used by: App-Router-Pages.

**Wizard Domain (KI-Pipeline):**
- Purpose: Matching, Interview-Schleife, Generate-Pipeline, Finanzplan, Validierung.
- Location: `lib/wizard/`
- Contains: Stage-Module (Matcher, Interviewer, Facts-Extractor, Pipeline mit Outline/Section/Critique/Recheck/Revision/Consistency, Finanzplan-Generator/-Validator/-Autofix), Session-Persistenz, LLM-Wrapper, Pricing-Ledger, Schema-Definitionen.
- Depends on: `data/foerderprogramme.json` (Programm-Katalog), `data/richtlinien/*.json` (Richtlinien-Dossiers), `data/richtlinien-prioritaeten.json` (Queue-Scores), `lib/db.ts`, OpenAI-SDK / Google-Generative-AI-SDK.
- Used by: Route-Handler in `app/api/wizard/*` und `app/api/match/`.

**Persistence / DB Layer:**
- Purpose: Connection-Pool, Query-Helper, idempotente SQL-Migrationen.
- Location: `lib/db.ts`, `db/migrations/*.sql`
- Contains: Singleton-Pool (`getPool()`), `query()`/`withClient()`-Helper, Migrationen `002_wizard_session.sql`, `003_paywall.sql`.
- Depends on: `pg` (`@types/pg`), `DATABASE_URL`-Env.
- Used by: `lib/wizard/session.ts`, `lib/newsletter.ts`, `lib/contactApi.ts`, alle Newsletter/Kontakt-Routes.

**Cross-Cutting Layer:**
- Purpose: Middleware, Logging, Rate-Limit, Errors, Caching, Monitoring.
- Location: `middleware.ts`, `lib/rate-limit.ts`, `lib/errors.ts`, `lib/logger.ts`, `lib/monitoring.ts`, `lib/cache.ts`, `lib/cors.ts`.
- Used by: alle API-Routen (via Edge-Middleware) + Route-Handler-internes Error-Handling.

**Static Data:**
- Purpose: Foerderprogramm-Katalog (~131 Programme), Richtlinien-Dossiers (11 fertig), Queue-Prioritaeten (Top-N-Matcher-Filter), Programm-Quellen-Liste fuer Scout.
- Location: `data/`
- Contains: `foerderprogramme.json`, `richtlinien/<programmId>.json` (Dossiers), `richtlinien-prioritaeten.json`, `programm-sources.json`, `programm-schemas/*.json`, `antragsprosa-guide.json`.
- Used by: `lib/wizard/matcher.ts`, `lib/wizard/richtlinien-loader.ts`, `app/foerderprogramme/[id]/page.tsx`, alle Wizard-Routes als Programm-Lookup.

**Scripts (Tooling/Cron):**
- Purpose: Daten-Pflege, Smoke-Tests, Deployment, Backup.
- Location: `scripts/`
- Contains: `extract-richtlinie.ts` + `scan-new-programs.ts` (Gemini-direkt, nicht ueber `llm.ts`-Wrapper), `rebuild-queue.ts`, `smoke-pipeline-models.ts`, `smoke-llm.ts`, `smoke-facts-extractor.ts`, `smoke-pipeline-rerun.ts`, `smoke-critique-rerun.ts`, `smoke-pipeline-with-extractor.ts`, `setup-db.ts`, `validate-data.ts`, `dev-db-tunnel.sh`, `deploy-staging.sh`, `deploy-production.sh`, Postgres-Backup-Systemd-Unit.
- Used by: Operatoren manuell + Cron auf dem Hetzner-Server.

## Data Flow

**Hauptdiagramm Antrags-Erstellung:**

```
Match → Wizard (Interview-Schleife) → Generate-Pipeline → Paywall → Download
```

**1. Match-Phase:**

1. User landet auf `/antrag/start` (`app/antrag/start/page.tsx` rendert `components/Wizard/StartClient.tsx`).
2. Browser POSTet Anliegen + Schul-Profil an `app/api/match/route.ts`.
3. `lib/wizard/matcher.ts#runMatch` filtert per `prefilter` (Bundesland-Match, abgelaufene Fristen) gegen `data/foerderprogramme.json`, sortiert nach `data/richtlinien-prioritaeten.json`-Queue-Score, schickt Top-20 an DeepSeek `deepseek-chat` (Pipe-Format `id|score|begruendung`).
4. Bis zu 3 Treffer werden zurueckgegeben. `lib/wizard/match-handoff-client.ts#saveHandoff` speichert Anliegen + Profil in `sessionStorage`.
5. User klickt einen Treffer und landet auf `/antrag/[programmId]/wizard`.

**2. Interview-Schleife:**

1. `app/antrag/[programmId]/wizard/page.tsx` lädt Richtlinie via `loadRichtlinie(programm.id)` und rendert `components/Wizard/WizardShell.tsx`.
2. `WizardShell` ruft beim ersten Mount `POST /api/wizard/start` mit `seedFacts` aus `match-handoff-client.ts` + `school-profile-client.ts` (localStorage).
3. `app/api/wizard/start/route.ts` legt eine Session in Postgres an (`createWizardSession` in `lib/wizard/session.ts`), ruft `nextStep()` (`lib/wizard/interviewer.ts`) → DeepSeek-Aufruf, gibt erste Frage zurueck.
4. User antwortet → `POST /api/wizard/answer` → zwei Stages laufen:
   - **Stage 1: Facts-Extractor** (`lib/wizard/facts-extractor.ts#extractFacts`) — eigener LLM-Call, der ueber den GANZEN Verlauf der User-Antworten rekursiv Facts strukturiert (UAT-Bug #5 Fix vom 2026-04-28: Interviewer war ueberlastet, halluzinierte Slots).
   - **Stage 2: Interviewer** (`lib/wizard/interviewer.ts#nextStep`) — entscheidet die naechste Frage anhand der frischen Facts. Hard-Cap bei `maxQuestions=12`.
5. Schleife laeuft bis `kind=ready` oder Cap erreicht. Phase wechselt zu `ready_to_generate`.
6. UI zeigt parallel `ReadinessAmpel` (`POST /api/wizard/readiness`) und `KumulierungsWarnung` (`POST /api/wizard/kumulierungs-check`).

**3. Generate-Pipeline:**

1. User klickt „Antrag schreiben lassen" → `POST /api/wizard/generate`.
2. `app/api/wizard/generate/route.ts` setzt Phase `generating`, ruft `lib/wizard/pipeline.ts#runPipeline`.
3. Pipeline-Stages (sequenziell, alle ueber `MODEL_PIPELINE` aka `deepseek-chat`):
   - **Outline** — entweder direkt aus Richtlinien-`antragsstruktur` uebernommen (kein LLM-Call) oder via `OUTLINE_SYSTEM`/`buildOutlinePrompt` aus DeepSeek; Fallback `lib/wizard/outline-fallback.ts#buildFallbackOutline` bei LLM-Fehler.
   - **Section** — pro Outline-Abschnitt ein `generateText`-Call mit `SECTION_SYSTEM`. User-Roh-Antworten werden zur Halluzinations-Vermeidung mitgegeben.
   - **Critique** — JSON-Call mit `CRITIQUE_SYSTEM` (`maxTokens=8000`), liefert strukturierte Findings (`schwere`, `kategorie`, `vorschlag`).
   - **Revision** — Final-Text via `REVISION_SYSTEM` mit Critique-Output als Input.
   - **Recheck** — `MODEL_FLASH`-Call gegen `RECHECK_SYSTEM`, prueft welche Findings die Revision geschlossen hat (`hasOpenHighFindings`).
   - **Finanzplan** — `lib/wizard/finanzplan-generator.ts` mit `FINANZPLAN_SYSTEM` → strukturierter `Finanzposten[]`.
   - **Consistency** — Cross-Check Antragstext × Finanzplan via `CONSISTENCY_SYSTEM`, liefert `ConsistencyIssue[]`.
4. Artefacts (`outline`, `sections`, `critique`, `critiqueFindings`, `critiqueResolutions`, `consistencyIssues`, `finalText`, `finanzplan`) werden in `WizardSessionData.generation` persistiert; `phase=complete`, Status `complete`.
5. Cost-Ledger (`lib/wizard/pricing.ts`) summiert alle Token-Verbrauchungen pro Modell auf.

**4. Paywall:**

1. `components/Wizard/PaywallGate.tsx` rendert ueber den Antragstext, blockiert Download.
2. User klickt → `POST /api/wizard/checkout` (`app/api/wizard/checkout/route.ts`) erzeugt Stripe-Checkout-Session via `lib/stripe/client.ts#getStripe`. Mit `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` faellt der Flow auf `app/api/wizard/checkout/dev-mock/` zurueck (kein echter Stripe-Call).
3. Stripe leitet zur Bezahlseite. Nach Erfolg `success_url` → `app/antrag/checkout/success/page.tsx` (rendert `CheckoutSuccessClient.tsx`).
4. Stripe sendet `checkout.session.completed` an `app/api/stripe/webhook/route.ts` → `markSessionPaid()` (`lib/wizard/session.ts`) erzeugt `paid_token` und setzt Status `paid`.

**5. Download:**

1. User folgt `/antrag/download/[paid_token]` (`app/antrag/download/[token]/page.tsx`).
2. Server-Component lädt Session via `getSessionByPaidToken()`, rendert `AntragResult` mit Final-Text + Finanzplan + Critique.
3. Frontend-Export via `html2pdf.js` (PDF), Word-Export, Klartext-Kopie.

**State Management:**

- Server-State: Postgres `ki_antraege`-Tabelle als Single-Source-of-Truth pro Session (`session_token` PK, `antrag_data` JSONB).
- Browser-Local-State (`localStorage`): Schul-Profil (`edufunds.wizard.school_profile`), Session-Index (`edufunds.wizard.session.<programmId>` → `session_token`), Match-Handoff (`sessionStorage`, einmal-konsumierbar).
- React-State (`WizardShell`): aktuelle Frage, Messages, Optimistic-Update beim Antworten.
- KEIN globaler State-Manager (kein Redux/Zustand/etc).

## Key Abstractions

**`WizardSession` / `WizardSessionData`:**
- Purpose: Persistierte Repräsentation eines kompletten Antrag-Laufs.
- Examples: `lib/wizard/types.ts:154` (`WizardSession`), `lib/wizard/types.ts:144` (`WizardSessionData`)
- Pattern: Postgres-Row → `rowToSession()`-Mapper, Updates ueber `updateWizardSession()`. JSONB-Spalte `antrag_data` traegt das gesamte Daten-Objekt; nicht normalisiert.

**`Foerderprogramm`:**
- Purpose: Datenmodell fuer ein Foerderprogramm aus dem statischen Katalog.
- Examples: `lib/foerderSchema.ts` (Schema), `data/foerderprogramme.json` (Daten), `data/programm-schemas/*.json` (Beispiel-Variants).
- Pattern: TypeScript-Interface, JSON-Datei wird via `import` direkt zur Build-Zeit eingebunden.

**`Richtlinie`:**
- Purpose: Programm-spezifisches Dossier mit foerderfaehigen Kostenpositionen, Eigenmittel-Pflicht, Antragsstruktur, Kumulierung.
- Examples: `lib/wizard/richtlinien-schema.ts:90` (Schema), `data/richtlinien/bmbf-digitalpakt-2.json`, `data/richtlinien/kultur-macht-stark.json`.
- Pattern: Lazy-Load via `lib/wizard/richtlinien-loader.ts` mit In-Memory-Cache. Programme ohne Dossier fallen auf generische Wizard-Logik zurueck.

**`WizardFacts`:**
- Purpose: Strukturierte Slots `schule`, `projekt`, `wirkung`, `budget`, `programmpassung` — wachsen waehrend der Interview-Schleife.
- Examples: `lib/wizard/types.ts:17`
- Pattern: Tiefes Partial-Object. `mergeFacts()` (`lib/wizard/facts-extractor.ts:64`) macht flachen Object-Merge mit Null-/Empty-Skip-Logic.

**`PipelineEvent`:**
- Purpose: Optional-Stream-Hook fuer Pipeline-Stages, koennte spaeter SSE oder UI-Live-Update.
- Examples: `lib/wizard/pipeline.ts:147`
- Pattern: Discriminated-Union mit `stage`-Tag.

**`CostLedger`:**
- Purpose: Token-Verbrauch- und Kosten-Tracking pro Session.
- Examples: `lib/wizard/pricing.ts:48`
- Pattern: Immutable-Append: `addUsage(ledger, model, usage)` gibt neuen Ledger zurueck; landet in `WizardSessionData.costs`.

**Provider-Wrapper (`generateJson` / `generateText`):**
- Purpose: Einheitliche LLM-API mit Provider-Switch DeepSeek/Gemini.
- Examples: `lib/wizard/llm.ts:204` (`generateJson`), `lib/wizard/llm.ts:210` (`generateText`)
- Pattern: Internes Dispatch ueber `PROVIDER`-Konstante; gemeinsame `LlmResult<T>`-Rueckgabe mit `value` + `usage`. 60-Sekunden-Timeout via `withTimeout`.

## Entry Points

**Marketing-Landing:**
- Location: `app/page.tsx`
- Triggers: Browser auf `/`
- Responsibilities: Hero + Features-Sektion. Auf eigener Domain `edufunds.org` als nginx-statisch deployed (separater Container).

**App-Router-Root-Layout:**
- Location: `app/layout.tsx`
- Triggers: alle Routen unter `app/`
- Responsibilities: Schema.org-JSON-LD, Google-Fonts (DM Serif Display + Plus Jakarta Sans), `WebVitals`-Component, Globale CSS-Patterns.

**Edge-Middleware:**
- Location: `middleware.ts`
- Triggers: Jeder Request (Matcher-Config in Zeile 79-87)
- Responsibilities: Rate-Limiting (`lib/rate-limit.ts`), URL-Redirects fuer Legacy-Programm-IDs, Security-Header (CSP, HSTS, X-Frame-Options).

**Wizard-Start-Page:**
- Location: `app/antrag/start/page.tsx`
- Triggers: `/antrag/start` (auch via Hero-CTA verlinkt)
- Responsibilities: Rendert `StartClient.tsx`, der das Anliegen einsammelt und die Match-API ruft.

**Wizard-Page (programmspezifisch):**
- Location: `app/antrag/[programmId]/wizard/page.tsx`
- Triggers: `/antrag/<programmId>/wizard`
- Responsibilities: `generateStaticParams` baut alle Programm-IDs zur Build-Zeit, `loadRichtlinie` server-seitig, dann Client-Hydration in `WizardShell`.

**Wizard-API-Endpunkte:**
- Locations:
  - `app/api/match/route.ts` — Programm-Matching (max 60s)
  - `app/api/wizard/start/route.ts` — Session-Anlage + erste Frage
  - `app/api/wizard/answer/route.ts` — Antwort + naechste Frage
  - `app/api/wizard/edit-answer/route.ts` — Rollback bis vor Antwort, dann neu fragen
  - `app/api/wizard/[token]/route.ts` — Session-State lesen (GET)
  - `app/api/wizard/generate/route.ts` — Pipeline-Trigger (max 300s)
  - `app/api/wizard/readiness/route.ts` — Pre-Flight-Check vor Generate
  - `app/api/wizard/kumulierungs-check/route.ts` — Doppelfoerderung-Heuristik
  - `app/api/wizard/finanzplan/autofix/route.ts` — LLM-freie Plan-Korrekturen
  - `app/api/wizard/finanzplan/legitimize/route.ts` — User-Freigabe des Plans
  - `app/api/wizard/checkout/route.ts` — Stripe-Checkout-Session
  - `app/api/wizard/checkout/dev-mock/` — Lokaler Mock-Pfad
- Triggers: Frontend-`fetch` aus `WizardShell`, Stripe-Webhook
- Responsibilities: JSON-In/Out, Persistenz via `lib/wizard/session.ts`.

**Stripe-Webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe ruft nach Checkout-Erfolg
- Responsibilities: Signatur-Pruefung mit Raw-Body, `markSessionPaid()` setzt `paid_token` + Status `paid`.

**Cron-Skripte (Server):**
- Locations: `scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`, `scripts/scout-cron.sh`, `scripts/postgres-backup.sh` (mit Systemd-Unit)
- Triggers: Cron / Systemd-Timer auf Hetzner-Host
- Responsibilities: Richtlinien-Dossiers extrahieren (Gemini direkt, nicht ueber `llm.ts`-Wrapper), neue Programme scannen, DB-Backup.

## Error Handling

**Strategy:** Mehrschichtige defensive Behandlung — LLM-Calls scheitern oft, ohne dass die User-Session sterben darf.

**Patterns:**
- **Fail-soft im Wizard:** `extractFacts` (`lib/wizard/facts-extractor.ts:44`) catched LLM-Fehler, behaelt alten Facts-Stand. Outline-LLM-Fail (`lib/wizard/pipeline.ts:215`) faellt auf `buildFallbackOutline` zurueck. Title-LLM-Fail nutzt `buildFallbackTitle`.
- **Hard-Timeout:** `withTimeout` in `lib/wizard/llm.ts:60` killt LLM-Calls nach 60s, damit SDK-interne Backoff-Loops die UI nicht blockieren.
- **Strukturierte Fehler-Kategorien im Frontend:** `lib/wizard/error-classifier.ts#classifyWizardError` mappt rohe Library-Strings auf `rate-limit | gemini-down | timeout | validation | not-found | unknown`. `WizardErrorBlock`-Component rendert Titel + Erklaerung + Retry-Button.
- **API-Errors:** Route-Handler returnen `NextResponse.json({error}, {status})`. Status-Mapping zentral in `lib/errors.ts:46` (`ERROR_STATUS_CODES`).
- **Phase-Guard:** `wizard/answer` prueft `phase==="interviewing"`, `wizard/generate` prueft `phase in {ready_to_generate, interviewing}`. Falsche Phase → `409 Conflict`.
- **Pipeline-Failure:** Bei Pipeline-Crash setzt `app/api/wizard/generate/route.ts:78` Phase `failed`, persistiert das. UI bietet Retry.
- **React-Boundaries:** `app/error.tsx`, `app/global-error.tsx`, `components/ErrorBoundary.tsx` fangen Render-Crashes; `app/not-found.tsx` fuer 404.
- **DB-Connection:** Pool wirft `pool.on('error')` aufs Server-Log; Connection wird lazy hergestellt.

## Cross-Cutting Concerns

**Logging:**
- `lib/logger.ts` — strukturierter Logger.
- `lib/monitoring.ts` — Performance-/Error-Tracking-Hooks.
- API-Routen nutzen `console.error` mit Tag-Praefix (`[wizard/start]`, `[stripe/webhook]`, `[api/match]`).
- `WebVitals.tsx` (Client) misst Core-Web-Vitals.

**Validation:**
- Eingangs-Validierung in Route-Handlern manuell (Type-Check + Trimm + Length-Check). Zod ist als Dependency da, wird aber nur in `lib/contact-schema.ts`, `lib/foerderSchema.ts`, `lib/newsletter-schema.ts` punktuell genutzt.
- LLM-Output-Normalisierung in `lib/wizard/pipeline.ts#normalizeCritique`/`normalizeConsistency`/`normalizeResolutions` — defensive Casts, harte Caps (max 12 Findings, max 8 Issues).

**Authentication:**
- **Anonym pro Session:** `session_token` (UUID, `localStorage`) als Session-Identifier, kein Login.
- **Admin-Bereich:** Cookie + bcrypt, `lib/admin-auth.ts`, Routes unter `app/api/admin/login`, `app/api/admin/logout`, Frontend `app/admin/dashboard/`.
- **Paid-Token:** Sekundaerer opaker Token, wird vom Stripe-Webhook eingesetzt; Download-URL `/antrag/download/<paid_token>` ist die Entitlement-Pruefung.

**Rate-Limiting:**
- Konfiguration in `lib/rate-limit.ts:29` — Kategorien `default` (100/15min), `auth` (10/15min), `ai` (5/h, Pipeline-Generierung), `wizard` (60/h, Frage-Antwort), `newsletter` (5/h).
- Dev-Bypass fuer `localhost` im `NODE_ENV=development`.
- Memory-Store; Redis als Production-TODO dokumentiert.

**Security-Header:**
- Doppelt implementiert: `middleware.ts:13` und `next.config.js:51` (CSP, HSTS, X-Frame-Options, Permissions-Policy).
- Stripe-Webhook nutzt Raw-Body fuer Signatur-Pruefung (`runtime: nodejs`, `dynamic: force-dynamic`).

**Caching:**
- HTTP-Caching pro Pfad-Pattern in `next.config.js:17` (statische Assets ein Jahr immutable, `/api/foerderprogramme` 1h SWR, andere `/api/` no-store).
- In-Memory-Cache fuer Richtlinien-Dossiers in `lib/wizard/richtlinien-loader.ts:14`.
- `lib/cache.ts` als generischer Cache-Helper.

---

*Architecture analysis: 2026-04-30*
