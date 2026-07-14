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

### 3.0 🔴 STOPP — Prüfen, welche AGB live gehen würde

> **Die AGB-Neufassung liegt auf `feature/agb-neufassung`, NICHT auf `staging`.** Ein Cutover
> vom heutigen Stand würde die **alte** Fassung veröffentlichen — mit „Preise zzgl. USt"
> (während brutto abgerechnet wird), 12 Monaten Mindestlaufzeit und automatischer Verlängerung
> (obwohl „kein Abo" verkauft wird) und **ohne** die KI-Klausel. Das ist genau der Zustand, den
> die Neufassung beseitigen soll.
>
> Der Branch ist bewusst nicht gemergt, weil der Text zur anwaltlichen Freigabe steht.
> **Reihenfolge daher zwingend:** Freigabe → `feature/agb-neufassung` → `staging` → erst dann
> Cutover.

```bash
# Pflicht-Check vor dem Merge nach main — muss "NEUFASSUNG" ausgeben:
git show staging:app/agb/page.tsx | grep -q "KI-generierte Ergebnisse" \
  && echo "OK: AGB-Neufassung ist auf staging" \
  || echo "STOPP: staging traegt noch die ALTE AGB — Cutover wuerde sie veroeffentlichen!"
```

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

### 6.1 ⚠️ Zwei Fallen beim Wartungs-Container (14.07.2026 in Prod erlebt)

**(a) `on` ein zweites Mal aufzurufen war ein Leck.** `maintenance-mode.sh on` löscht den
Wartungs-Container (`docker rm -f`) und baut ihn neu. Beim **ersten** Aktivieren ist das sicher,
weil `edufunds-app` erst danach startet. Ist die App aber schon oben — und das ist sie im
Coming-Soon-Betrieb, als interner Newsletter-Proxy —, dann fehlt für zwei bis drei Sekunden der
Router mit Priorität 1000, und **Traefik liefert in diesem Fenster die volle App unter
`edufunds.org` aus** (Live-Stripe, ungeprüfte Rechtstexte).
→ **Behoben:** Das Skript stoppt `edufunds-app` jetzt **vor** dem Container-Tausch und startet sie
danach wieder. Ohne die App gibt es keinen konkurrierenden Router; schlimmstenfalls ist die Seite
kurz nicht erreichbar (503) — das ist harmlos, ein Leck wäre es nicht.

**(b) Die Seite per `scp` zu aktualisieren wirkt NICHT.** `index.html` und `nginx.conf` sind
**Einzeldatei-Bind-Mounts**, und Docker bindet die an den **Inode**. `scp` ersetzt die Datei
(neuer Inode) → der laufende Container hält den alten und liefert **stur die alte Seite** aus:
gleicher Pfad, gleicher Mount, HTTP 200, **keine Fehlermeldung**. Auch ein In-place-`cat >` hilft
nicht mehr, sobald der Inode einmal getauscht wurde.
→ **Nur ein neu erstellter Container löst den Mount neu auf.** Der Smoke im Skript prüft deshalb
jetzt nicht mehr bloß HTTP 200, sondern ob die **ausgelieferte Seite die lokale Fassung ist** —
und bricht sonst ab.

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

---

## 9. Phase 2 — Domain-Zusammenführung: `edufunds.org` = die Plattform

> **Stand 08.07.2026.** Dies ist der zweite, bewusst getrennte Teil des Cutovers.
> Phase 1 (oben) bringt die **App** auf den neuesten Stand und hinter der
> Wartungsseite auf `app.edufunds.org`. Phase 2 macht die **Apex-Domain
> `edufunds.org`** zur öffentlichen Plattform-Adresse und räumt den Drift auf.
> **Voraussetzung:** Phase 1 fertig + intern verifiziert, **und** das
> Rechts-/Compliance-Gate (Abschnitt 7) grün — denn der Apex-Switch **ist** der
> öffentliche Go-Live.

### ✅ Bereits umgesetzt am 08.07.2026 (Coming-Soon sitzt schon auf dem Apex)

Modell-Entscheidung Kolja: die **finale Adresse `edufunds.org` trägt schon jetzt die
Coming-Soon-Seite**, damit der Go-Live nur noch ein Umschalten auf *derselben* Domain ist
(kein Domain-Umzug im kritischen Moment). Umgesetzt + verifiziert:

- `edufunds-maintenance`-Router deckt jetzt `Host(edufunds.org)||Host(www…)||Host(app…)`
  (Prio 1000) ab; die nginx macht **Host-301** für `www`/`app` → `edufunds.org`, `edufunds.org`
  selbst zeigt Coming-Soon (`robots: Disallow:/`) + reicht `/admin`, `/api/admin`,
  `/api/newsletter/*`, `/_next/*` an `edufunds-app` durch.
- **Alte `edufunds-landing` gestoppt** (nicht entfernt → Rollback-Reserve).
- **`NEXT_PUBLIC_APP_URL=https://edufunds.org`** in `.env.production` gesetzt (**aktiv erst
  ab nächstem Container-Recreate/Go-Live-Rebuild**; bis dahin decken die 301 die Links ab).
- **Admin-Login jetzt unter `https://edufunds.org/admin/login`** (Origin-Check = same-origin, ok).

**Damit bleibt für den Go-Live nur:** Code-Cutover (Phase 1) + `edufunds-app`-Router auf
`Host(edufunds.org)` + permanenter Redirect-Router + `maintenance off`. Siehe 9.4/9.7.
⚠️ Wenn `maintenance off` läuft, verschwindet die Coming-Soon-nginx **inkl. ihres Host-301
für www/app** — der Redirect muss dann von **Traefik-Labels auf `edufunds-app`** getragen
werden (9.4), sonst laufen `www`/`app` ins Leere.

### 9.0 Der Drift (Ausgangs-Zustand VOR dem 08.07.-Umbau — historisch)

> Beschreibt den Stand, bevor die Coming-Soon auf den Apex gezogen wurde (siehe
> „Bereits umgesetzt" oben). Bleibt als Referenz/Rollback-Bild stehen.

Alle drei Domains zeigen per DNS auf `49.13.15.44`; die Aufteilung macht **allein Traefik**:

| Domain | Router → Container | Inhalt |
|---|---|---|
| `edufunds.org` / `www` | `edufunds-landing` (nginx, **separates Repo**) | ALTE statische Landing. **Nur `/` (200); alle Unterseiten `programme.html`/`ueber-uns.html`/… → 502.** |
| `app.edufunds.org` | `edufunds-maintenance` (prio 1000) → davor | Coming-Soon „Bald verfügbar"; dahinter läuft `edufunds-app` (neue App) verborgen. |
| `staging.edufunds.org` | `edufunds-staging` | Neuester Stand (Dev). |

Die **neue App bringt für jede alte Seite eine eigene, saubere Route mit**
(`/`, `/foerderprogramme`, `/ueber-uns`, `/kontakt`, `/impressum`, `/datenschutz`,
`/agb`, `/preise`, …) — die alte `edufunds-landing` wird damit **überflüssig**.

### 9.1 SEO-Befund (Crawl 08.07.2026) → minimale 301-Map

- **`site:edufunds.org` bei Google liefert nur die Startseite** `edufunds.org/`. Keine
  weiteren indexierten URLs. Die alten `.html`-Unterseiten sind **nicht indexiert**
  und liefern ohnehin 502 → praktisch **kein SEO-Verlustrisiko**.
- Apex `/` behält die URL → die neue App-Startseite ersetzt sie **ohne Redirect**;
  Canonical bleibt `https://edufunds.org/`.
- `.html`-301s sind nur **billige Absicherung** für etwaige Backlinks:

| Alt (301 →) | Neu |
|---|---|
| `/programme.html` | `/foerderprogramme` |
| `/ueber-uns.html` | `/ueber-uns` |
| `/kontakt.html` | `/kontakt` |
| `/impressum.html` | `/impressum` |
| `/datenschutz.html` | `/datenschutz` |
| `/agb.html` | `/agb` |

Diese Redirects am besten **in der App** (`next.config.ts` → `redirects()`), da die
alte Landing danach abgeschaltet wird. Snippet (auf `staging` einbauen, mit-cutovern):

```ts
// next.config.ts
async redirects() {
  return [
    { source: '/programme.html',    destination: '/foerderprogramme', permanent: true },
    { source: '/ueber-uns.html',    destination: '/ueber-uns',        permanent: true },
    { source: '/kontakt.html',      destination: '/kontakt',          permanent: true },
    { source: '/impressum.html',    destination: '/impressum',        permanent: true },
    { source: '/datenschutz.html',  destination: '/datenschutz',      permanent: true },
    { source: '/agb.html',          destination: '/agb',              permanent: true },
  ];
}
```

### 9.2 ✅ Code-Vorarbeit auf `staging` (erledigt 13.07.2026, PR `feature/apex-domain-vorarbeit`)

Alles umgesetzt, 661 Tests grün, `tsc` sauber, Production-Build ok:

1. ✅ **`NEXT_PUBLIC_APP_URL` als Build-Arg**: `Dockerfile` (`ARG`/`ENV`, Default `https://edufunds.org`);
   `deploy-production.sh` + `deploy-staging.sh` lesen die Domain **aus der jeweiligen `.env`-Datei**
   (eine Quelle der Wahrheit) und reichen sie an `docker build` durch.
2. ✅ **Fallbacks vereinheitlicht**: neuer Helper `publicAppUrl()` / `CANONICAL_APP_URL` in
   `lib/app-url.ts`. Die vorher ~12 verstreuten Literale (`app.edufunds.org`, **`edufunds.de`**,
   `localhost:3101`) sind ersetzt — inkl. `sampleNewsletterData` (wird in `send/route.ts`
   tatsächlich als Versand-Fallback benutzt, war kein reines Demo-Objekt).
3. ✅ `redirects()` aus 9.1 in `next.config.js`.
4. ✅ **Zusätzlich gefunden und behoben — hätte sonst still Schaden gemacht:**
   - **Newsletter-CTAs**: Der LLM-Prompt in `generate-draft.ts` schrieb dem Modell
     `https://app.edufunds.org/foerderprogramme` vor, während `sanitizeLlmUrl()` gegen die
     **konfigurierte** Basis-Domain prüft. Nach dem Apex-Switch hätte der Sanitizer genau die
     Links verworfen, die der Prompt erzeugt — `newsItems`-Links wären **ersatzlos** und ohne
     Fehlermeldung verschwunden. Prompt-Domain ist jetzt Parameter (= Sanitizer-Basis);
     Regressionstest „Cutover-Invariante" in `__tests__/lib/newsletter/render.test.ts`.
   - **`deploy-production.sh` ist die authoritative Quelle der Traefik-Labels.** Ein Umhängen
     nur am Container (9.4) hätte der **nächste Prod-Deploy stillschweigend zurückgedreht**.
     Der Apex-Router ist daher als Flag **`--apex`** im Skript umgesetzt (siehe 9.4).
   - `collectNewsletterContent()` las `NEXT_PUBLIC_APP_URL` gar nicht, sondern immer den
     Fallback — behoben.
5. **CORS** (`lib/cors.ts`) enthält `https://edufunds.org` bereits → nach dem Switch kein Bruch.
6. Über `feature/*` → `staging` → mit dem Cutover nach `main`.

### 9.3 🔴 Kolja-Go: `.env.production` + Rebuild

```bash
ssh root@49.13.15.44 'cd /home/edufunds/edufunds-app && \
  sed -i "s#^NEXT_PUBLIC_APP_URL=.*#NEXT_PUBLIC_APP_URL=https://edufunds.org#" .env.production && \
  grep NEXT_PUBLIC_APP_URL .env.production'
# Danach Cutover-Deploy (baut mit dem neuen Build-Arg; Apex-Domain im Client+Server):
cd /home/kolja/edufunds-app && ./scripts/deploy-production.sh
```

### 9.4 🔴 Kolja-Go: Traefik umhängen (Apex → App, alte Landing raus)

**Seit 13.07. im Deploy-Skript umgesetzt** — nicht mehr von Hand am Container:

```bash
./scripts/deploy-production.sh --apex
```

Das Flag setzt den `edufunds-app`-Router auf `Host(`edufunds.org`)` und legt den
301-Redirect-Router (`www.`/`app.` → Apex) an. Die Rule steht bewusst **ohne
Leerzeichen** um `||` (Word-Splitting-Falle bei der Label-Expansion).

> ⚠️ **`--apex` gehört ab dem Switch in JEDEN weiteren Prod-Deploy.** Das Skript ist die
> authoritative Quelle der Container-Labels: ein Deploy ohne das Flag setzt den Router
> wieder auf `app.edufunds.org` — die Apex-Domain fiele still aus.

Die alte Landing ist bereits gestoppt (08.07., Container als Rollback-Reserve erhalten).

> **`app.edufunds.org` bleibt als 301 bestehen — NICHT wegwerfen.** Bereits versendete
> Double-Opt-in-/Unsubscribe-Mails und ggf. Stripe-Return-URLs zeigen dorthin.

### 9.5 🔴 Kolja: Stripe-Webhook-Endpoint nachziehen

Der im Stripe-Dashboard registrierte Webhook zeigt auf `app.edufunds.org/api/stripe/webhook`.
Nach 9.4 würde ein POST dorthin **301** auf den Apex bekommen — **Stripe folgt Redirects
bei Webhooks nicht zuverlässig**. Daher im Dashboard den Endpoint auf
`https://edufunds.org/api/stripe/webhook` umstellen (neues `whsec_…` → in `.env.production`
+ Container-Recreate). Danach ein Test-Event auf 200 prüfen (Abschnitt 4).

### 9.6 Robots / Indexierung freigeben

Die Wartungs-nginx serviert `robots: Disallow:/`; die App selbst rendert env-abhängig
(`app/robots.ts`, `NEXT_PUBLIC_APP_URL` + Noindex-Flag). Nach dem Switch:
- `edufunds-maintenance` ist weg (9.7) → die App liefert `robots.txt`.
- Sicherstellen, dass das Noindex-Flag auf Prod **aus** ist → `Allow`. Prüfen:
  `curl -s https://edufunds.org/robots.txt` (kein `Disallow: /`), `…/sitemap.xml` (200).
- In der **Google Search Console** `https://edufunds.org` (Domain-Property) verifizieren
  und die neue Sitemap einreichen.

### 9.7 🔴 Kolja-Go: Öffentlich schalten + Wartungsseite entfernen

```bash
./scripts/maintenance-mode.sh off      # entfernt edufunds-maintenance
```
> **Dieser Schritt ersetzt Phase-1-Schritt 3.5.** Danach ist `edufunds.org` die
> öffentliche Plattform; `app.`/`www.` leiten 301 dorthin.

⚠️ **Interim-Admin-Proxy zurückbauen:** In der Coming-Soon-Phase reicht die Wartungs-nginx
`/admin`, `/api/admin`, `/api/newsletter/*`, `/_next/*` an die App durch (siehe
`ops/maintenance/nginx.conf`, hinzugefügt 08.07.2026). Mit `maintenance off` fällt die
ganze nginx weg → automatisch obsolet. Kein separater Rückbau nötig.

### 9.8 Verifikation Phase 2

```bash
for u in \
  "https://edufunds.org/" "https://edufunds.org/foerderprogramme" \
  "https://edufunds.org/robots.txt" "https://edufunds.org/sitemap.xml"; do
  printf "%s -> " "$u"; curl -s -o /dev/null -w '%{http_code}\n' "$u"; done
# 301-Weiterleitungen (Location muss auf https://edufunds.org/... zeigen):
curl -sI https://www.edufunds.org/         | grep -iE 'HTTP/|location'
curl -sI https://app.edufunds.org/preise   | grep -iE 'HTTP/|location'
curl -sI https://edufunds.org/programme.html | grep -iE 'HTTP/|location'   # → 301 /foerderprogramme
```

### 9.9 Rollback Phase 2

- **Sofort:** `edufunds-app`-Router-Labels zurück auf `Host(app.edufunds.org)` (Redeploy
  mit altem Label-Block) **und** `docker start edufunds-landing` → Apex zeigt wieder auf
  die alte Landing, App wieder unter `app.`.
- Alternativ nur verbergen: `./scripts/maintenance-mode.sh on` (App weg, Coming-Soon zurück).
- `NEXT_PUBLIC_APP_URL` in `.env.production` zurück auf `app.edufunds.org` + Redeploy,
  falls die absoluten Links zurück sollen.

### 9.10 Nachlauf (nach stabilem Betrieb)

- `edufunds-landing`-Container + dessen **separates Repo** archivieren/stilllegen
  (die neue App ist die einzige Quelle → **Repo-Drift aufgelöst**).
- Prüfen, ob `app.edufunds.org`-301 dauerhaft bleiben soll (empfohlen: ja).
