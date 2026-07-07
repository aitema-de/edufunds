# EduFunds — Go-Live-Cutover-Runbook

> **Verifizierter Stand: 07.07.2026** (read-only gegen Prod-DB `edufunds` und
> `.env.production` auf `49.13.15.44`). Punkte mit „🔴 Kolja-Go" sind **bewusst
> nicht autonom** ausgeführt — sie ändern den Prod-Zustand und brauchen deine
> ausdrückliche Freigabe. Alles darunter ist copy-paste-fertig und gegen den
> echten Server-Zustand geprüft.

`app.edufunds.org` läuft aktuell auf der **Wartungsseite** (`edufunds-maintenance`,
Traefik-Router Prio 1000 überlagert die App). Die App-Container laufen dahinter.

---

## 1. Verifizierter Ist-Zustand (07.07.2026)

| Bereich | Befund | Cutover-Relevanz |
|---|---|---|
| **Prod-DB Migrationen** | 002–**010** angewandt (`ki_antraege`, `credit_codes`, `org_orders`, `magic_links`, `feedback_tickets`, `newsletter_entries`, `newsletter_issues`, Spalten `author_email`/`paid_token`/`tier`/`invoice_lexoffice_id`). | **Nur Migration 011 (`stripe_webhook_events`) FEHLT** → Schritt 3.2 |
| **Prod-Daten** | `ki_antraege`: 6 Zeilen, 3 bezahlt (Alt-Testkäufe). | unkritisch |
| **Stripe** | `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` gesetzt. | **Prod ist bereits LIVE** — die ältere Notiz „noch Sandbox" war veraltet. Nur Live-Webhook-Erreichbarkeit gegenprüfen (Schritt 4). |
| **LLM-Provider** | `.env.production` → `LLM_PROVIDER=mistral`, `MISTRAL_API_KEY` (len 32) gesetzt. | Greift automatisch beim Container-Recreate (Deploy). Verifizieren (Schritt 4). |
| **Kritische Secrets** | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET` (44), `ADMIN_PASSWORD_HASH` (60), `RESEND_API_KEY`, `LEXOFFICE_API_KEY` — **alle gesetzt**. | Secret-Check besteht (Prod). |
| **Code-Branch** | `main` (= Prod-Branch) ist **119 Commits hinter `staging`**; 10 main-only Commits (Newsletter/Feedback) sind in staging bereits enthalten. **Probemerge `staging→main` sauber, 0 Konflikte.** | **Zentraler Schritt: `staging → main` mergen = Content-Freeze** → Schritt 3.1 |
| **Container** | `edufunds-app` (healthy), `edufunds-maintenance` (up), `edufunds-postgres`, `edufunds-staging`, `edufunds-landing` — alle up. | ok |

**Fazit:** Technisch fehlen nur drei Schritte — `staging→main`, Migration 011,
Cutover-Deploy. Stripe-Live und Provider-Flip sind bereits vorbereitet.

---

## 2. Was bereits erledigt ist (kein Handlungsbedarf)

- ✅ Stripe Live scharfgeschaltet (`sk_live` + Live-Webhook), 17.06. mit echter Karte verifiziert + refundet.
- ✅ `LLM_PROVIDER=mistral` in `.env.production` (EU/DSGVO-Provider).
- ✅ Alle 6 kritischen Prod-Secrets gesetzt.
- ✅ Prod-DB bis Migration 010 aktuell.
- ✅ Go-Live-Härtung auf `staging`: Webhook-Dedup, Runtime-Secret-Check, Nonce-CSP, Retention (bezahlt 12 Mon. + PII-Rest-Lücke 90 Tage), React-#418-Fix, robots-env-aware.

---

## 3. Cutover — geordnete Schritte

> Reihenfolge ist bewusst: **Merge → Migration (additiv, vor neuem Code) → Deploy
> hinter Wartungsseite → intern verifizieren → Wartungsseite entfernen → öffentlich smoke-testen.**
> So ist zu keinem Zeitpunkt die alte App exponiert und der neue Code wird geprüft, bevor er sichtbar wird.

### 3.1 🔴 Kolja-Go: `staging → main` mergen (Content-Freeze)

Der Probemerge ist konfliktfrei. Über PR (Trail) oder direkt:

```bash
# Variante PR (empfohlen, GitHub):
gh pr create --repo aitema-de/edufunds --base main --head staging \
  --title "Go-Live: staging → main (Cutover 07.2026)" \
  --body "Content-Freeze für Production-Cutover. Siehe docs/CUTOVER-RUNBOOK.md"
gh pr merge <NR> --repo aitema-de/edufunds --merge
```

Danach steht `origin/main` auf dem staging-Stand (inkl. Migration-011-Datei, Mistral-Default im Code, alle Härtungen).

### 3.2 🔴 Kolja-Go: Migration 011 auf Prod-DB `edufunds` anwenden

Additiv (`CREATE TABLE IF NOT EXISTS`) und idempotent — gefahrlos, mehrfach anwendbar.
Muss **vor** dem Deploy laufen (der neue Webhook-Handler erwartet die Tabelle).

```bash
ssh root@49.13.15.44
cd /home/edufunds/edufunds-app
git fetch origin
# Migration aus dem gemergten main-Stand direkt in die Prod-DB pipen:
git show origin/main:db/migrations/011_stripe_webhook_events.sql \
  | docker exec -i edufunds-postgres psql -U edufunds -d edufunds

# Verifikation (Tabelle muss existieren):
docker exec edufunds-postgres psql -U edufunds -d edufunds -c "\d stripe_webhook_events"
```

### 3.3 🔴 Kolja-Go: Cutover-Deploy (baut `main`, recreated Container)

Der Deploy hat eine **eingebaute Schutzbremse** (bricht ab, falls `sk_test`) —
greift hier nicht, da Prod `sk_live` hat. Er fragt interaktiv zweimal nach
(„Staging smoke-getestet?" → `y`, dann Tippbestätigung `deploy`).

**Deploy-Reibung vorher abfangen** (geteilter Working-Tree, Wartungs-Dateien):
```bash
ssh root@49.13.15.44 'cd /home/edufunds/edufunds-app && git checkout -- ops/maintenance/index.html 2>/dev/null; rm -f ops/maintenance/nginx.conf'
```

Deploy (baut App-Container mit neuem `main` **hinter** der noch aktiven Wartungsseite):
```bash
cd /home/kolja/edufunds-app
./scripts/deploy-production.sh          # PAYWALL_BYPASS=0 (Default = echte Zahlung)
```
> Hinweis: Der Smoke-Test am Ende des Skripts trifft `app.edufunds.org` — solange die
> Wartungsseite (Prio 1000) läuft, liefert das die Coming-Soon-Seite (200), **nicht**
> die App. Das ist ok; die echte App-Verifikation kommt in Schritt 4 vor dem Enthüllen.

### 3.4 Intern verifizieren (App läuft, noch verborgen)

```bash
ssh root@49.13.15.44 'docker inspect --format "{{.State.Health.Status}}" edufunds-app'   # → healthy
ssh root@49.13.15.44 'docker exec edufunds-app printenv LLM_PROVIDER'                     # → mistral
```

### 3.5 🔴 Kolja-Go: Wartungsseite entfernen (App wird öffentlich)

```bash
./scripts/maintenance-mode.sh off
```

---

## 4. Post-Cutover-Verifikation (öffentlich)

```bash
# a) Grund-Erreichbarkeit
for p in / /foerderprogramme /api/health; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w '%{http_code}\n' "https://app.edufunds.org$p"; done

# e) robots.txt = Allow (Prod ohne ROBOTS_NOINDEX → indexierbar)
curl -s https://app.edufunds.org/robots.txt | head -3

# f) Admin-Login erreichbar (ADMIN_PASSWORD_HASH ist auf Prod gesetzt)
curl -s -o /dev/null -w '%{http_code}\n' https://app.edufunds.org/admin
```

Auf dem Server (erst `ssh root@49.13.15.44`, dann Klartext):
```bash
cd /home/edufunds/edufunds-app

# b) Provider im laufenden Container (EU/DSGVO)  → mistral
docker exec edufunds-app printenv LLM_PROVIDER

# c) Webhook-Dedup-Tabelle vorhanden  → t
docker exec edufunds-postgres psql -U edufunds -d edufunds -tAc "SELECT to_regclass('public.stripe_webhook_events') IS NOT NULL"

# d) Retention-Cron Dry-Run (zählt, ändert nichts — enthält den neuen 90-Tage-PII-Op)
S=$(grep '^CRON_SECRET=' .env.production | cut -d= -f2-)   # falls in Anführungszeichen: diese entfernen
curl -fsS -H "x-cron-key: $S" "https://app.edufunds.org/api/cron/retention?dryRun=1" | jq '{dryRun, totalAffected}'
```

**Manuell / Stripe-Dashboard (Kolja):**
- Ein echter End-to-End-Kauf (kleiner Betrag) oder Stripe-CLI-Testevent → Webhook `checkout.session.completed` `pending_webhooks=0`, Antrag freigeschaltet, Rechnung (lexoffice) + Bestätigungsmail (Resend) kommen an.
- Live-Webhook-Endpoint im Stripe-Dashboard zeigt Zustellungen mit 200.

---

## 5. Retention-Cron produktiv schalten (nach Cutover)

`CRON_SECRET` ist auf Prod gesetzt; es fehlt nur der Crontab-Eintrag. Täglich 03:30:

```bash
ssh root@49.13.15.44
cd /home/edufunds/edufunds-app
S=$(grep '^CRON_SECRET=' .env.production | cut -d= -f2-)   # ggf. Anführungszeichen entfernen
( crontab -l 2>/dev/null; \
  echo "30 3 * * * curl -fsS -X POST -H \"x-cron-key: $S\" https://app.edufunds.org/api/cron/retention >/dev/null 2>&1" ) | crontab -
crontab -l | grep retention   # kontrollieren
```
> Optional: Erst einmal **manuell mit `?dryRun=1`** laufen lassen (Schritt 4d) und die
> Zahlen plausibilisieren, bevor der scharfe Cron greift.
> Newsletter-Cron (`/api/cron/newsletter`) analog, falls der Newsletter live gehen soll.

---

## 6. Rollback

Wenn nach dem Enthüllen etwas klemmt — **sofort zurück auf die Wartungsseite**
(verbirgt die App wieder, App-Container bleibt für Diagnose laufen):

```bash
./scripts/maintenance-mode.sh on
```
- Migration 011 ist rein additiv → **kein DB-Rollback nötig**.
- Für einen Code-Rollback: `git checkout` des vorherigen `main`-Commits (`888dbdc`)
  auf dem Server + erneuter `deploy-production.sh`. (Vorher-Stand notieren!)

---

## 7. 🔴 Rechts-/Compliance-Gate (Kolja + Fachanwalt — Go-Live-Blocker außerhalb Technik)

Diese Punkte sind **nicht** durch den Deploy gelöst und sollten vor dem Enthüllen sitzen:

- [ ] **HRB-Nummer** in Impressum + AGB eintragen (AITEMA GmbH — „i.G."-Status prüfen/ersetzen).
- [ ] **AVV-Vorlage + Subprozessor-Liste** (inkl. **Mistral**) für Org-Kunden bereitstellen (`docs/legal/AVV-VORLAGE.md` als Basis).
- [ ] **Mistral DPA archivieren** (`legal.mistral.ai/terms/data-processing-addendum`) + **Zero-Retention (ZDR) beantragen** (Support, Bildungskontext begründen).
- [ ] **EU-AI-Act Art. 50 Transparenz** — verbindlich **ab 02.08.2026**: Chatbot-KI-Hinweis + KI-Kennzeichnung des Outputs (Komponenten vorhanden, final gegenprüfen).
- [ ] **Datenschutzerklärung**: LLM-Verarbeitung + Mistral/Paris benannt (erledigt — final gegenlesen).
- [ ] **Cookie-Consent**: nach Analyse **nicht erforderlich** (nur funktionales localStorage + Stripe) — dokumentiert lassen.
- [ ] **Löschkonzept** (`docs/legal/LOESCHKONZEPT.md`) durch Fachanwalt bestätigen; Retention-Cron produktiv (Schritt 5).
- [ ] **Finale anwaltliche Abnahme** (IT-Recht/Datenschutz) vor erstem zahlenden Kunden.

---

## 8. Bekannte Reibungspunkte

- **Geteilter Working-Tree** `/home/edufunds/edufunds-app` für staging + prod. `maintenance-mode.sh` scp't `ops/maintenance/*` dorthin → beim nächsten `git checkout` Konflikt. Workaround in Schritt 3.3 (vor dem Deploy).
- **`--env-file`-Container**: Env-Änderungen greifen erst beim **Container-Recreate** (Deploy), nicht bei `docker restart`.
- **Nie zwei Sessions im selben Working-Tree** parallel deployen.
- Branch-Workflow bleibt strikt `feature/* → staging → main`.
