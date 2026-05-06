# Codebase Concerns

**Analysis Date:** 2026-04-30

## Tech Debt

**Stripe-Paywall im Dev-Mock — Production blockiert:**
- Issue: Paywall laeuft komplett im Dev-Mock-Modus (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1`). Echter Stripe-Account ist noch nicht angelegt (Pfad A: neuer EduFunds-Account unter aitema GmbH entschieden, Termin offen). Solange `STRIPE_SECRET_KEY` + `STRIPE_PRICE_EINZELANTRAG` fehlen, gibt `app/api/wizard/checkout/route.ts:46-52` HTTP 503 zurueck — kein Umsatz moeglich.
- Files: `STRIPE_SETUP.md`, `app/api/wizard/checkout/route.ts`, `app/api/wizard/checkout/dev-mock/route.ts`, `components/Wizard/PaywallGate.tsx:13`, `app/api/stripe/webhook/route.ts`
- Impact: Production-Launch blockiert. Nutzer koennen Wizard durchlaufen, aber den Antrag nicht freischalten.
- Fix approach: Stripe-KYC durchlaufen (siehe `STRIPE_SETUP.md` Schritte 1-7), Test-Mode auf Staging verifizieren, dann Live-Keys in `.env.production` ausrollen.

**Cron-Skripte umgehen den LLM-Provider-Wrapper:**
- Issue: `scripts/extract-richtlinie.ts` (Zeile 27, 30, 235) und `scripts/scan-new-programs.ts` (Zeile 21, 23, 144, 193) importieren `@google/generative-ai` direkt und verwenden `gemini-2.5-pro` / `gemini-2.0-flash` hardcoded. Sie nutzen NICHT den DeepSeek-Default aus `lib/wizard/llm.ts`.
- Files: `scripts/extract-richtlinie.ts`, `scripts/scan-new-programs.ts`, `.github/workflows/weekly-dossier-extraction.yml`, `.github/workflows/weekly-program-scan.yml`
- Impact: Bei Gemini-Quota-Engpass (28.04.2026 entschaerft, aber Wiederholung moeglich) faellt der woechentliche Dossier-Extract aus. Inkonsistente Provider-Strategie zwischen Pipeline und Cron. GitHub-Action setzt explizit `GEMINI_API_KEY` — Wechsel braucht Workflow-Update.
- Fix approach: Migrieren auf `lib/wizard/llm.ts`-Wrapper. Da Skripte ausserhalb von Next.js laufen, ggf. Wrapper-Modul refactoren, sodass es auch standalone via `tsx` aufrufbar ist. Workflows auf `DEEPSEEK_API_KEY` umstellen, `GEMINI_API_KEY` als optionalen Fallback behalten.

**Migrationen 002+003 nur auf Dev-DB:**
- Issue: `db/migrations/002_wizard_session.sql` (session_token + Status-CHECK-Erweiterung) und `db/migrations/003_paywall.sql` (paid_token, stripe_session_id, paid_at) sind nur lokal/auf Dev-DB ausgerollt. Staging und Production laufen weiterhin auf Pre-Wizard-Schema.
- Files: `db/migrations/002_wizard_session.sql`, `db/migrations/003_paywall.sql`
- Impact: Wizard- und Paywall-Code in `feature/wizard-adaptive` ist auf prod nicht lauffaehig — ohne Migrationen wirft die App beim ersten `INSERT INTO ki_antraege (... session_token ...)` einen DB-Fehler. Live-Deployment des Wizards blockiert.
- Fix approach: Staging-Deploy via `scripts/deploy-staging.sh` mit Migrations-Apply. Idempotenz ist gegeben (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`). Vor dem Apply Backup ziehen.

**Force-static auf POST-Endpunkten — semantisch falsch:**
- Issue: 14 API-Routen tragen `export const dynamic = 'force-static'` direkt vor einem `POST`-Handler. `force-static` ist fuer GET/HEAD gedacht und steht im Widerspruch zum Mutations-Verhalten. Funktioniert in Next.js 16 nur, weil Next bei dynamischen Faktoren (Cookies, FormData) automatisch ueberschreibt.
- Files: `app/api/contact/route.ts:1`, `app/api/newsletter/route.ts:1`, `app/api/newsletter/send/route.ts:1`, `app/api/newsletter/unsubscribe/route.ts:1`, `app/api/newsletter/preview/route.ts:1`, `app/api/admin/login/route.ts:1`, `app/api/admin/logout/route.ts:1`, `app/api/checkout/route.ts:1`, `app/api/foerderprogramme/route.ts:1`, `app/api/health/route.ts:14`, `app/api/health/backend/route.ts:14`, `app/api/health/dashboard/route.ts:23`, `app/api/paypal/route.ts:1`, `app/api/stripe/checkout/route.ts:1`, `app/api/stripe/verify/route.ts:1`, `app/api/vitals/route.ts:1`
- Impact: Latente Bug-Quelle bei Next.js-Updates. Build-Output kann Fehlermeldungen werfen (Static-Export-Versuche). Nicht kritisch, weil Dev/Run-Verhalten korrekt ist.
- Fix approach: Auf POST/PATCH/DELETE-Endpunkten `force-static` entfernen oder durch `force-dynamic` ersetzen.

**dist-nextjs-backup Altlast im Repo:**
- Issue: 617 Dateien unter `dist-nextjs-backup/` — vollstaendiger Build-Output eines alten Next-Stands liegt im Working Tree.
- Files: `dist-nextjs-backup/`
- Impact: Verzerrt Suchergebnisse (grep, find). Vergroessert Repo-Clone unnoetig.
- Fix approach: Pruefen, ob noch referenziert (Deploy-Skripte, Dockerfile). Wenn nicht: in `.gitignore` aufnehmen und mit `git rm -r` entfernen.

**Tote Backup-Dateien:**
- Issue: `PERSONA.md.bak.20260211`, `SOUL.md.bak.20260211`, `SOUL.md.bak.20260216-1803` liegen im Repo-Root.
- Files: `/home/kolja/edufunds-app/PERSONA.md.bak.20260211`, `/home/kolja/edufunds-app/SOUL.md.bak.20260211`, `/home/kolja/edufunds-app/SOUL.md.bak.20260216-1803`
- Impact: Gering — kosmetisch.
- Fix approach: Loeschen, da Git-History ausreichend ist.

**Doppeltes Konventions-Schema fuer Kontaktformular:**
- Issue: Zwei Schema-Dateien `lib/contactSchema.ts` (camelCase, Re-Export) und `lib/contact-schema.ts` (kebab-case) existieren parallel. `lib/contactApi.ts:1` importiert aus `./contactSchema`, andere Stellen koennten `./contact-schema` verwenden.
- Files: `lib/contactSchema.ts`, `lib/contact-schema.ts`, `lib/contactApi.ts`
- Impact: Drift-Risiko, wenn nur ein Schema gepflegt wird.
- Fix approach: Eine Datei kanonisch machen, andere als Re-Export oder loeschen.

**TODO-Stub `validateField` ohne Implementierung:**
- Issue: `lib/contactApi.ts:68-74` exportiert `validateField` mit Kommentar `TODO: Implement validation logic` und gibt immer `null` zurueck.
- Files: `lib/contactApi.ts:72`
- Impact: Echtzeit-Feldvalidierung im Kontaktformular funktioniert nicht.
- Fix approach: Implementieren mit `validateContactForm` aus selbem Modul, ein Feld extrahieren.

**Checkout-Route mit In-Memory-Map fuer Bestellungen:**
- Issue: `app/api/checkout/route.ts:7` benutzt `const orders = new Map()` — Bestellungen ueberleben keinen Server-Restart. Kommentar `// Bestellungen speichern (in Produktion: Datenbank)` macht das explizit.
- Files: `app/api/checkout/route.ts:7-8`
- Impact: Diese Route scheint Legacy zu sein (PayPal/Lastschrift/Rechnung) und ist parallel zu `app/api/wizard/checkout/route.ts` (Stripe). Bei Production-Nutzung waeren Daten-Verlust und Inkonsistenz garantiert. Zwei TODO-Kommentare (Z. 60 + 87) bestaetigen unfertigen Zustand.
- Fix approach: Klaeren, ob Route noch genutzt wird (Frontend-Such-Audit). Wenn legacy: entfernen. Wenn aktiv: in `ki_antraege`-Tabelle persistieren oder neue `orders`-Tabelle.

## Known Bugs

**5 Test-Suites failen pre-existing:**
- Symptoms: `npm test` zeigt 5 of 10 Suites failed, 28 of 94 Tests failed
- Files: `__tests__/components/Header.test.tsx`, `__tests__/components/Footer.test.tsx`, `__tests__/lib/backend-utils.test.ts`, `__tests__/lib/ki-antrag-generator.test.ts`, `app/api/contact/test.ts`
- Trigger: jeder `npm test`-Lauf
  - Header.test: ESM-Loading-Problem mit `lucide-react/dist/esm/lucide-react.js` ("Cannot use import statement outside a module") — Jest-Transform-Konfiguration faengt ESM nicht ab
  - Footer.test: Syntax-Error in Z. 170 (`expect(screen.getByText('AGB').closest('href', '/agb');` — `toHaveAttribute` fehlt, `closest()` falsch verwendet)
  - ki-antrag-generator.test: importiert nicht-existierende Funktionen `isOpenAIAvailable`, `generateMockAntrag`, `generateAntragWithOpenAI` aus `lib/ki-antrag-generator.ts` (API ist veraltet)
  - `app/api/contact/test.ts` ist gar kein Jest-Test, sondern ein ad-hoc-Skript fuer `ts-node --esm`, wird aber von `testMatch` aufgesammelt
- Workaround: keiner. Tests sind im CI nicht aktiv (kein test-Workflow in `.github/workflows/`).
- Fix approach: (a) Footer-Test Z. 170 syntaktisch fixen, (b) Header-Test entweder via `transformIgnorePatterns` lucide-react transformen oder lucide-Icons mocken, (c) ki-antrag-generator.test loeschen oder gegen aktuelle API neu schreiben, (d) `app/api/contact/test.ts` ausserhalb von `testMatch` legen (z. B. nach `.skip.ts` umbenennen oder `testPathIgnorePatterns` erweitern).

**Pipeline-Hebel 1-5 nur via smoke-Skripte verifiziert:**
- Symptoms: Keine Jest-Coverage fuer Section-Generation, Critique-Stage, Revision, Recheck, Consistency-Check. Halluzinations-Regression koennte unentdeckt deployt werden.
- Files: `lib/wizard/pipeline.ts`, `scripts/smoke-pipeline-models.ts`, `scripts/smoke-critique-rerun.ts`, `scripts/smoke-pipeline-rerun.ts`, `scripts/smoke-pipeline-with-extractor.ts`
- Trigger: nur via manuelles Anwerfen der Smoke-Skripte gegen echte LLM-API
- Workaround: Smoke-Skripte vor jedem Pipeline-Refactor laufen lassen
- Fix approach: Jest-Tests mit gemockten LLM-Responses (Fixtures fuer typische Critique-Findings, Section-Outputs). `lib/wizard/llm.ts` ueber `jest.mock` injizieren.

**Reload-Resume im laufenden Wizard ist UX-Luecke:**
- Symptoms: Nutzer kann Browser-Tab schliessen, aber nicht zuverlaessig in laufendem Wizard fortsetzen. Session-Token in `localStorage` (Schluessel `edufunds.wizard.session.{programmId}` in `WizardShell.tsx:46`), aber State-Restore-Pfad ist unvollstaendig.
- Files: `components/Wizard/WizardShell.tsx:46`, `lib/wizard/match-handoff-client.ts`, `app/api/wizard/[token]/route.ts`
- Trigger: Tab-Reload waehrend `phase: "interviewing"` oder `phase: "generating"`
- Workaround: keiner — Nutzer muss von vorn anfangen
- Fix approach: `WizardShell` `useEffect` ergaenzen, der bei Mount aus localStorage restoured. State-Restore sollte den letzten ausstehenden Frage-State (`question`, `phase`, `messages`) ueber `/api/wizard/[token]` GET vollstaendig wiederherstellen.

**WSL2-Bridge-Latenz-Bug — Diagnose-Falle:**
- Symptoms: Browser-Haenger im Wizard mit Meldung "Server scheint zu haengen". Default-Annahme: Backend-Problem. Tatsaechlich: WSL2-localhost-Forwarder verzoegert Anfragen, Backend antwortet schnell.
- Files: betrifft Dev-Setup (`http://localhost:3101`), nicht Production
- Trigger: Wiederholtes Reload des Wizards in WSL2 ueber Windows-Browser
- Workaround: Direkter `curl http://localhost:3101/api/...` als erste Diagnose, dann Browser-Reload. Bei WSL: `wsl --shutdown` und neu starten.
- Fix approach: Doku-Eintrag (vorhanden in Memory `feedback_wsl_browser_localhost_latenz.md`). Optional `.env.local` mit `next dev -H 0.0.0.0` und WSL-IP statt localhost.

## Security Considerations

**`localStorage`-Session-Token ist faktisch Auth-Bearer:**
- Risk: `session_token` (UUID, in Cookie waere besser) liegt in localStorage und wird per JSON-Body an Backend uebertragen. XSS auf der Domain wuerde Token leaken; ohne Same-Site/HttpOnly-Cookie-Schutz kein automatisches Loggen-Aus bei XSS-Verdacht.
- Files: `components/Wizard/WizardShell.tsx:46` (`STORAGE_KEY_PREFIX`), `lib/wizard/session-index-client.ts`, `app/api/wizard/answer/route.ts:18-22`
- Current mitigation: Strikte CSP mit `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (`middleware.ts:23`) — `'unsafe-inline'` und `'unsafe-eval'` weichen den Schutz aber wieder auf.
- Recommendations: Mittel- bis langfristig auf HttpOnly-Cookie umstellen, CSP `unsafe-inline`/`unsafe-eval` reduzieren (Inline-Script-Audit, Tailwind-Inline-Styles brauchen `unsafe-inline` fuer style-src nicht mehr ab Next 14, Build umstellen).

**`paid_token` als reine URL-Identitaet:**
- Risk: Download-URL `/antrag/download/{paid_token}` ist Bearer-faehig — wer den Link kennt, hat 30 Tage Zugriff (Kommentar in `db/migrations/003_paywall.sql:5-13`). Kein Login, kein Rotation. E-Mail-Forward gibt vollen Zugriff.
- Files: `db/migrations/003_paywall.sql:16-23`, `app/antrag/download/[token]/page.tsx`, `app/api/stripe/webhook/route.ts:54-58`
- Current mitigation: `paid_token` ist 64-stellig opak. Index ist UNIQUE. Stripe-Customer-Email als sekundaere Identitaet gespeichert (manuelle Reconciliation moeglich).
- Recommendations: Token-TTL serverseitig erzwingen (`paid_at + INTERVAL '30 days'`-Check beim Download), Magic-Link an `stripe_customer_email` ausspielen statt URL ausgeben, ggf. Single-Use mit Refresh-Token-Pattern.

**Rate-Limiting nur In-Memory — verteilte Deployments unsicher:**
- Risk: `lib/rate-limit.ts:65` haelt Counter in `Map<string, RateLimitEntry>` pro Prozess. Bei Multi-Instance/Multi-Region oder Container-Restart wird der Counter genullt; Angreifer koennte Restart triggern oder ueber mehrere Replicas verteilen.
- Files: `lib/rate-limit.ts:58-75`
- Current mitigation: AI-Pipeline-Limit aggressiv (5/h pro IP), Wizard-Limit 60/h, Auth-Limit 10/15min. `setInterval` cleant abgelaufene Eintraege.
- Recommendations: Redis-basiert auf Production. Vorbereitet im Code (`# REDIS_URL=...` in `.env.local.example:51`), aber noch nicht implementiert. Singleton-Container heute = ausreichend, bei Scale-Out muss Redis zwingend rein.

**`ALLOWED_ORIGINS` / CORS-Setup:**
- Risk: `process.env.ALLOWED_ORIGINS` wird in `lib/cors.ts` konsumiert (Liste-Setup), aber Wizard-API-Routen pruefen Origin nicht aktiv. CSRF auf den POST-Endpunkten ist via `X-Frame-Options: DENY` + Browser-CORS-Default geschuetzt, aber nicht via expliziten CSRF-Token.
- Files: `lib/cors.ts`, `middleware.ts:13-28`, `app/api/wizard/*/route.ts`
- Current mitigation: Strict-Transport-Security, Frame-Ancestors none.
- Recommendations: CSRF-Token-Pattern fuer state-changing Routes oder Origin-Check via `lib/cors.ts`-Helfer in jeder POST-Route ergaenzen.

**`STRIPE_WEBHOOK_SECRET` Verifikation: korrekt, aber stillschweigender Bypass bei fehlender Konfig:**
- Risk: `app/api/stripe/webhook/route.ts:11-17` gibt 503 zurueck, wenn Stripe nicht konfiguriert. Korrekt. Aber: kein Alarm/Logging, wenn der Endpoint im Live-Modus ohne Secret aufgerufen wird — ein Angreifer koennte fake Webhooks an staging.edufunds.org schicken; Server ignoriert sie zwar, aber Log-Audit fehlt.
- Files: `app/api/stripe/webhook/route.ts:11-17, 35`
- Current mitigation: Signature-Check bei vorhandenem Secret korrekt implementiert mit `stripe.webhooks.constructEvent`. RawBody via `await req.text()` korrekt.
- Recommendations: Failed-Signature-Calls als Sicherheitsereignis loggen via `lib/monitoring.ts`.

## Performance Bottlenecks

**Pipeline-Generation: ~9 LLM-Calls pro Antrag:**
- Problem: `lib/wizard/pipeline.ts` orchestriert Outline + Section(N) + Critique + Revision + Recheck + Consistency. Bei DeepSeek-`deepseek-chat` 2-30s pro Call.
- Files: `lib/wizard/pipeline.ts`, `lib/wizard/llm.ts:50` (60s Hard-Timeout)
- Cause: Sequenzielle LLM-Stages noetig fuer Halluzinations-Reduktion. Section-Generation pro Abschnitt loopt linear.
- Improvement path: Section-Generation parallelisieren (Promise.all). Mit DeepSeek-Rate-Limits abgleichen. Caching pro `programmId + factsHash` fuer Outline-Stage.

**Matcher: 37s -> 2s historisch optimiert, aber Top-N hardcoded:**
- Problem: `app/api/match/route.ts` mit `deepseek-chat` (Pipe-Format + Top-N-Cut, 28.04. Optimierung) auf 2s reduziert. `lib/wizard/matcher.ts` enthaelt ungetypte `(p as any)`-Casts (Z. 96, 100-101, 130-132).
- Files: `app/api/match/route.ts`, `lib/wizard/matcher.ts:96-132`
- Cause: Type-Schwaeche bei `Foerderprogramm` — Felder `status`, `bundeslaender`, `foerdersummeMax`, `foerdersummeText`, `kategorien`, `kurzbeschreibung` sind nicht im Schema (`lib/foerderSchema.ts`), werden aber im JSON benutzt.
- Improvement path: `lib/foerderSchema.ts` um die fehlenden Felder erweitern, `as any`-Casts entfernen.

**`html2pdf.js` Bundle-Last:**
- Problem: `html2pdf.js` (~500 KB) wird in `components/Wizard/AntragResult.tsx:119` und `components/KIAntragAssistent.tsx:16` lazy geladen.
- Files: `components/Wizard/AntragResult.tsx:119`, `components/KIAntragAssistent.tsx:14-17`
- Cause: Korrekt dynamisch importiert.
- Improvement path: Pruefen, ob server-seitig PDF generiert werden kann (Resend/Puppeteer). Aktuelle Loesung ist OK fuer Phase 1.

## Fragile Areas

**LLM-JSON-Parsing ohne Schema-Validation:**
- Files: `lib/wizard/llm.ts:121-125, 182-186`, `lib/wizard/pipeline.ts:49-74`
- Why fragile: `JSON.parse(text)` mit `as T`-Cast trusted dem LLM-Output. Bei Schema-Drift (Modell-Update, Prompt-Aenderung) silente Type-Falschheiten. `normalizeCritique` in `pipeline.ts:49` macht nachgelagertes Whitelisting der Felder, aber nicht alle Pipeline-Stages haben so eine Saeuberung.
- Safe modification: Vor jeder Pipeline-Stage Zod-Schema einfuehren, `safeParse` auf `generateJson`-Returns. Bei Validierungsfehler retry oder fallback (z. B. `buildFallbackOutline` in `lib/wizard/outline-fallback.ts`).
- Test coverage: Smoke-Skripte, kein Unit-Test mit malformed-JSON-Fixtures.

**Provider-Switch via Env-Var:**
- Files: `lib/wizard/llm.ts:25-26`
- Why fragile: `LLM_PROVIDER` wird beim Modul-Import einmalig gelesen. Hot-Reload zwischen Providern erfordert Server-Restart. Keine Fallback-Kette (DeepSeek down -> automatisch Gemini).
- Safe modification: Per-Request-Provider-Wahl mit Circuit-Breaker bauen. Bei `LlmTimeoutError` zweiten Provider versuchen.
- Test coverage: `scripts/smoke-llm.ts`, `scripts/smoke-llm-large.ts` vorhanden, kein Jest.

**`force-static` auf POST-Routes:**
- Files: 14 Routen in `app/api/`
- Why fragile: Next.js 16-spezifisches Verhalten; bei Major-Update koennte Build-Fehler werfen.
- Safe modification: Routen, die DB lesen/schreiben, auf `force-dynamic` umstellen.

**`appendMessage`/`updateWizardSession` ohne Transaction:**
- Files: `lib/wizard/session.ts:73, 92, 139, 152, 183-186`, `app/api/wizard/answer/route.ts:59`
- Why fragile: Wizard-Antwort-Flow macht mehrere DB-Updates (appendMessage, updateWizardSession) ohne Transaction. Bei concurrent Reqs (z. B. doppeltes Submit) Race-Condition moeglich.
- Safe modification: `BEGIN/COMMIT` um Antwort-Verarbeitung in `answer/route.ts` legen.
- Test coverage: keiner.

## Scaling Limits

**Single-Container-Setup:**
- Current capacity: 1 `edufunds-app` Container + 1 Postgres + 1 Staging
- Limit: Multi-Instance scheitert an In-Memory-Rate-Limit (`lib/rate-limit.ts:65`) und in-memory Order-Map (`app/api/checkout/route.ts:7`).
- Scaling path: Redis-Backed-RateLimit (vorbereitet via `REDIS_URL`-Kommentar), Order-Persistence in DB.

**`data/foerderprogramme.json` Vollscan im Memory:**
- Current capacity: 131 Programme
- Limit: Bei >1000 Programmen wird Bundle-Size + Memory-Footprint problematisch (Match-API laedt komplettes JSON: `app/api/wizard/answer/route.ts:2`).
- Scaling path: DB-Tabelle statt JSON-File. Migration nicht akut bei aktuellem Wachstum.

## Dependencies at Risk

**Next.js 16.1.6 (sehr neu):**
- Risk: Major-Version, viele 3rd-Party-Plugins (z. B. `next/jest`) hinken nach. Test-Setup-Fragilitaet (`jest.config.js`, ESM-Loader-Issues bei lucide-react) hat Wurzel hier.
- Impact: Build-Breaks bei Patch-Releases moeglich. `tsbuildinfo` ist 1.4 MB, deutet auf Build-Cache-Wachstum.
- Migration plan: Bei Bug-Reports auf Next 16 minimal angeben, ggf. auf 15 LTS zuruecksetzen wenn kritisch.

**`@google/generative-ai 0.24.1`:**
- Risk: Hardcoded in Cron-Skripten (siehe oben). Library-Version aelter als OpenAI-SDK; Schema-Aenderungen bei Gemini-API durchschlagen direkt.
- Impact: Geringes akut, hoch bei Gemini-API-Breakage.
- Migration plan: Wechsel auf `lib/wizard/llm.ts`-Wrapper (siehe Tech-Debt-Punkt oben).

**`html2pdf.js 0.14.0` ohne TypeScript-Types:**
- Risk: `(await import("html2pdf.js")).default` mit `as` Cast in `AntragResult.tsx:119-122`. Schema-Drift in Library laeuft ungeprueft durch.
- Impact: PDF-Download koennte still kaputtgehen.
- Migration plan: Eigene `.d.ts`-Datei pflegen oder auf `jsPDF`/`pdf-lib` mit TS-Types umsteigen.

## Missing Critical Features

**~70 Foerderprogramm-Dossiers offen:**
- Problem: `data/richtlinien-prioritaeten.json` listet 82 prio-Programme; nur 11 Dossiers in `data/richtlinien/` extrahiert. 70 stehen auf `open`, 1 auf `skip`.
- Blocks: Wizard-Pipeline kann fuer 71 von 82 prio-Programmen keine Richtlinien-Validierung durchfuehren (`lib/wizard/richtlinien-loader.ts:26-37` returned `null` fuer fehlende Dossiers, Pipeline laeuft dann ohne Richtlinien-Hebel).
- Fix approach: Cron `weekly-dossier-extraction.yml` laeuft Mo 04:00 UTC, extrahiert 1 Dossier/Woche -> 70 Wochen ETA. Bottleneck: Mensch-Review jedes PR. Alternative: Batch-Extraktion via `extract-richtlinie.ts` und Sammel-Review.

**Live-UAT mit echten Schul-Inputs:**
- Problem: Erste End-to-End-UAT 28.04.2026 hat ~20 Halluzinationen ergeben; 3 von 5 Bugs gefixt, #2 Section-Halluzinationen reduziert aber nicht 0, #5 Facts-Extraktion mager.
- Blocks: Vertrauenswuerdiger Production-Launch.
- Fix approach: Zweite UAT-Runde nach Migration-Apply auf Staging mit verschiedenen Programm/Schul-Kombis. Telemetrie/Cost-Ledger pro Run dokumentieren.

**Fehlerlogging-Integration:**
- Problem: `app/global-error.tsx:20` enthaelt `// TODO: Sentry/LogRocket Integration wenn verfuegbar`. Aktuell nur `console.error`.
- Blocks: Production-Fehler werden nicht persistent erfasst.
- Fix approach: Sentry-Init in `app/layout.tsx` + `global-error.tsx` einbauen, DSN in `.env.production`.

## Test Coverage Gaps

**Wizard-Pipeline:**
- What's not tested: Outline-Generation, Section-Generation, Critique, Revision, Recheck, Consistency, Finanzplan-Validation
- Files: `lib/wizard/pipeline.ts`, `lib/wizard/finanzplan-validator.ts`, `lib/wizard/finanzplan-generator.ts`, `lib/wizard/finanzplan-autofix.ts`, `lib/wizard/programm-kriterien.ts`, `lib/wizard/projekt-overlap.ts`, `lib/wizard/geber-guidance.ts`, `lib/wizard/facts-readiness.ts`
- Risk: Halluzinations-Regression schlaegt erst beim naechsten Smoke-Run auf
- Priority: High

**Wizard-API-Routes:**
- What's not tested: alle Endpunkte unter `app/api/wizard/`
- Files: `app/api/wizard/start/route.ts`, `app/api/wizard/answer/route.ts`, `app/api/wizard/edit-answer/route.ts`, `app/api/wizard/generate/route.ts`, `app/api/wizard/finanzplan/route.ts`, `app/api/wizard/checkout/route.ts`, `app/api/wizard/[token]/route.ts`, `app/api/wizard/kumulierungs-check/route.ts`, `app/api/wizard/readiness/route.ts`
- Risk: API-Vertrag mit Frontend kann silently brechen
- Priority: High

**Stripe-Webhook:**
- What's not tested: `app/api/stripe/webhook/route.ts`
- Files: `app/api/stripe/webhook/route.ts`
- Risk: Zahlungs-Roundtrip ist kritischer Pfad. Signature-Pruefung, `markSessionPaid`, Edge-Cases (`payment_status=unpaid`, refund) ungetestet.
- Priority: High

**Existierende Test-Suites:**
- What's not tested: 5 von 10 Suites kompilieren nicht (siehe "Known Bugs"). Effektive Coverage liegt unter den 50% Threshold in `jest.config.js:24-31`.
- Files: siehe "Known Bugs"
- Risk: Abnahme-Coverage faktisch nicht enforced, weil Test-Run im CI fehlt.
- Priority: Medium (Cleanup), High (CI-Integration)

**E2E:**
- What's not tested: `e2e/` Verzeichnis existiert, aber kein Playwright/Cypress-Setup im `package.json`. Vom `testPathIgnorePatterns: ['/e2e/']` ausgenommen.
- Files: `e2e/`
- Risk: Keine durchgehende User-Journey-Verifikation
- Priority: Medium

---

*Concerns audit: 2026-04-30*
