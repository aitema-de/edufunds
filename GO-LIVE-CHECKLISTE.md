# EduFunds — Go-Live Launch-Scope (Stand 2026-06-12)

Definierter Umfang bis zum ersten **zahlenden** Kunden. „Fertig" = alle 🔴 erledigt
+ Entscheidung über jedes 🟡. Quelle der Befunde: Server-Inventur + Code-Verifikation
+ Compliance-Analyse (siehe `docs/legal/`, `STRIPE-LIVE-CUTOVER.md`).

**Status-Legende:** ✅ erledigt · 🔴 harter Blocker · 🟡 vor Launch entscheiden · 🟢 kann nach Launch · 👤 extern (Kolja/Anwalt)
**Owner:** C = Claude baut · K = Kolja · A = Fachanwalt

---

## 1 · Code & Deploy 🚦

- 🔴 **C/K** Wizard ist NICHT in Prod: `app.edufunds.org` läuft seit 17.04. auf Vor-Wizard-`main`. Merge `feature/wizard-adaptive` → `staging` → `main`.
- 🔴 **K** ⚠️ `deploy.yml` auto-deployt bei JEDEM Push auf `main` → `main` erst mergen, wenn ALLES launch-ready (sonst kaputte Paywall live).
- 🟡 **C/K** Generalprobe: einmal nach Prod deployen **mit Sandbox-Keys**, Wizard+Checkout+Webhook verifizieren → dann ist Go-Live nur noch der Key-Tausch.
- 🟢 **C** Toter Ballast aufräumen: `docker-compose.prod.yml` (`edufunds-nextjs`) ist nicht der aktive Deploy-Pfad (echter Deploy = `docker run` in `deploy-production.sh`).

## 2 · Zahlung & Rechnung 💳

- 🔴 **K** `db/migrations/009_invoice.sql` auf **staging- UND prod-DB** ausrollen (sonst schlägt Webhook-UPDATE fehl). 004–008 sind schon drauf.
- 🔴 **K** Prod-`.env.production`: `LEXOFFICE_API_KEY` setzen.
- 🔴 **K/C** E2E-Test: Stripe-Testmodus (`4242…`) → Webhook → lexoffice → §312i-Mail mit PDF. ⚠️ Prod-Code `finalize=true` = **echte fortlaufende Rechnungsnummer** (GoBD) — vorsichtig testen/stornieren.
- 🔴 **K** Stripe Live-Cutover als **letzter** Schritt → siehe [`STRIPE-LIVE-CUTOVER.md`] (Live-Konto `acct_…2RbKUcSBRFK`, Price `price_1ThRcARbKUcSBRFKwVaNcYHr`).
- 🟡 **K/A** §14-UStG-Pflichtangaben an einer echten finalisierten Rechnung prüfen (lexoffice-Firmenstammdaten/Absender).
- 🟡 **C** AGB/Datenschutz-Bestätigung im Checkout (Stripe `consent_collection`) — aktuell nicht gesetzt; für AGB-Einbeziehung sinnvoll.

## 3 · Recht & Compliance ⚖️

- ✅ B2B-only entschieden + Checkout erzwingt Org-Daten (`4318b39`); AGB §14-Unternehmer-Klausel vorhanden (`app/agb/page.tsx`).
- ✅ §312i-Bestellbestätigungsmail gebaut (`4318b39`).
- ✅ Datenschutzerklärung Sektion 5 „KI-gestützte Antragserstellung" + DSGVO-Transparenz-UI (`9462d5e`).
- ✅ Datenminimierung am LLM-Transfer (`39a9dd2`).
- 🔴 **C** **Impressum + AGB: „AITEMA GmbH i.G." → echte Rechtsform** (HRB 283978 B, Amtsgericht Charlottenburg) — Pflichtangabe §5 DDG, falsche Angabe abmahnfähig.
- 🟡 **C** **AI-Act Art. 50 Transparenz** (Deadline **02.08.2026**): (1) Wizard/Chatbot offenlegen „du interagierst mit KI"; (2) generierten Antrag/Export als KI-erzeugt kennzeichnen. Billig umzusetzen.
- 🟡 **C** **Löschkonzept + Cron** (IP-Adressen in 3 Tabellen, abgelaufene Sessions/Magic-Links/Credit-Codes) — Art. 5(1)e. Vorhandene Cleanups betreffen nur Queue/Kandidaten.
- 🟡 **C/A** **AVV-Vorlage für Org-Kunden** inkl. Subprozessor-Liste (Mistral/Stripe/Resend/Hetzner/Cloudflare) — Schulen/Fördervereine brauchen das zum Kauf.
- 👤 **A** Rechtstexte final durch Fachanwalt IT-Recht/Datenschutz (AGB / AVV / Datenschutz / DSFA-Entwurf `docs/legal/DSFA-Wizard-LLM-ENTWURF.md`).

## 4 · LLM-Provider & Betrieb 🤖

- ✅ Mistral als Default (`d790b35`), Live-Eval = Parität mit DeepSeek (Gate PASSED); bezahltes Abo aktiv (429 gelöst).
- 🔴 **K** `MISTRAL_API_KEY` in **staging- UND prod-`.env`** (sonst 401, kein LLM).
- 🟡 **K** Mistral **Zero-Data-Retention beantragen** (Support, Scale-Plan, „legitimate reasons") + DPA-PDF archivieren — sonst greift das DSGVO-Argument nur halb.
- 🟡 **K** `FROM_EMAIL` / Resend-Domain `edufunds.org` verifizieren (war bisher aitema.de-only).
- 🟢 **C** `deepseek-chat`-Alias stirbt 24.07.2026 — nur relevant, falls DeepSeek-Fallback genutzt wird (Default=Mistral).

## 5 · QA & Abnahme ✅

- 🟡 **K** Visuelle Abnahme: DSGVO-Transparenz-UI + B2B-Checkout (bisher nur tsc/RTL, kein Live-Blick).
- 🟡 **K** UAT-Piloten: Tester-Doku versandbereit (`/home/kolja/edufunds-tester-versand/`), Test-URL `staging.edufunds.org/antrag/start`.
- 🟢 **C/K** Matcher-Datenqualität (C2/C4/D1/D4 …) = Qualitäts-Track, **kein** Go-Live-Blocker → [[project-edufunds-matcher-katalog-datenqualitaet]].

---

## Empfohlene Reihenfolge

1. **Recht fertigstellen** (C baut): Impressum/AGB-Rechtsform, AI-Act-Transparenz, Löschkonzept+Cron, AVV-Vorlage, Checkout-Consent.
2. **Env + Migration** (K): `MISTRAL_API_KEY`, `LEXOFFICE_API_KEY` in Prod; Migration 009 staging+prod.
3. **Generalprobe-Deploy** mit Sandbox-Keys → Wizard/Checkout/Webhook/Rechnung E2E auf Prod testen.
4. **Visuelle Abnahme** + UAT-Feedback einarbeiten.
5. **Anwalt** über finale Rechtstexte (parallel ab Schritt 1 möglich).
6. **Go-Live** = `staging→main` mergen (Auto-Deploy) **+ Stripe Live-Keys setzen** (der reversible letzte Schalter).
