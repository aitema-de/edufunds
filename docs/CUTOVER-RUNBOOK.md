# EduFunds — Go-Live-Cutover-Runbook

> **Verifizierter Stand: 07.07.2026** (read-only gegen Prod-DB `edufunds` und
> `.env.production` auf `49.13.15.44`). Punkte mit „🔴 Kolja-Go" sind **bewusst
> nicht autonom** ausgeführt — sie ändern den Prod-Zustand und brauchen deine
> ausdrückliche Freigabe. Alles darunter ist copy-paste-fertig und gegen den
> echten Server-Zustand geprüft.

> ## Nachtrag 17.07.2026 — vor dem Cutover lesen
>
> Erneut read-only gegen Server, Prod-DB, Stripe-Live-Konto und die laufenden Container geprüft.
> Drei Dinge haben sich gegenüber dem 07.07. verschoben:
>
> 1. **Schritt 3.1 ist erledigt** — PR #89 ist gemergt, `origin/main` = `622760d` und enthält
>    `staging` vollständig (`main..staging` = 0). Das AGB-Gate aus 3.0 **besteht auf `main`**
>    (Neufassung + § 4a + § 4b vorhanden). Migrationen 011–015 liegen auf `main`.
> 2. **⛔ `--apex` ist im Cutover-Deploy Pflicht** (Schritt 3.3) — ohne das Flag geht
>    `edufunds.org` nach `maintenance off` auf **404**. Begründung + Beleg stehen bei 3.3.
> 3. **Die Domain in Abschnitt 4 war veraltet** (`app.` statt Apex) — korrigiert.
>
> Unverändert offen und **weiterhin der teuerste Einzelschritt**: der Stripe-Webhook (9.5) zeigt
> am 17.07. immer noch auf `https://app.edufunds.org/api/stripe/webhook` (`we_1ThSrNRbKUcSBRFKpP8xbTiK`,
> `enabled`) — read-only gegen das Live-Konto bestätigt.

`app.edufunds.org` läuft aktuell auf der **Wartungsseite** (`edufunds-maintenance`,
Traefik-Router Prio 1000 überlagert die App). Die App-Container laufen dahinter.

---

## 1. Verifizierter Ist-Zustand (07.07.2026)

| Bereich | Befund | Cutover-Relevanz |
|---|---|---|
| **Prod-DB Migrationen** | 002–**010** angewandt (`ki_antraege`, `credit_codes`, `org_orders`, `magic_links`, `feedback_tickets`, `newsletter_entries`, `newsletter_issues`, Spalten `author_email`/`paid_token`/`tier`/`invoice_lexoffice_id`). | ⚠️ **Überholt:** Es fehlen **011–015**, nicht nur 011 (012–015 gab es am 07.07. noch nicht). Am 17.07. read-only nachgeprüft — **alle fünf fehlen**, Prod unberührt → Schritt 3.2 |
| **Prod-Daten** | `ki_antraege`: 6 Zeilen, 3 bezahlt (Alt-Testkäufe). | unkritisch |
| **Stripe** | `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` gesetzt. | **Prod ist bereits LIVE** — die ältere Notiz „noch Sandbox" war veraltet. Nur Live-Webhook-Erreichbarkeit gegenprüfen (Schritt 4). |
| **LLM-Provider** | `.env.production` → `LLM_PROVIDER=mistral`, `MISTRAL_API_KEY` (len 32) gesetzt. | Greift automatisch beim Container-Recreate (Deploy). Verifizieren (Schritt 4). |
| **Kritische Secrets** | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET` (44), `ADMIN_PASSWORD_HASH` (60), `RESEND_API_KEY`, `LEXOFFICE_API_KEY` — **alle gesetzt**. | Secret-Check besteht (Prod). |
| **Code-Branch** | `main` ist **191 Commits hinter `staging`** und hat **15 eigene** (Hotfixes direkt auf main: Newsletter-Härtung 07.07., Coming-Soon-Apex + Admin-Proxy 08.07., Feedback-Ticketzähler). ⚠️ **Der Probemerge ist NICHT mehr konfliktfrei** (9 Dateien) — die frühere Aussage „0 Konflikte" ist überholt. Konflikte sind in **PR #89** bereits aufgelöst und verifiziert. | **Zentraler Schritt: PR #89 mergen = Content-Freeze** → Schritt 3.1 |
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
>
> ⚠️ **Seit 14.07.2026 ist das nicht mehr nur „besser", sondern zwingend:** Der Code
> **zitiert die Neufassung**. Der Rechnungskauf ist auf Schulen und Schulträger beschränkt und
> weist Fördervereine mit der Meldung *„Der Kauf auf Rechnung ist Schulen und Schulträgern
> vorbehalten (**AGB § 4a**)"* ab. Einen § 4a gibt es in der **alten** AGB **nicht** — ein
> Cutover ohne die Neufassung würde also eine Klausel zitieren, die nicht existiert, und die
> Beschränkung stünde ohne vertragliche Grundlage da. Dasselbe gilt für die Sperre bei
> Zahlungsverzug (§ 4a Abs. 5), die anteilige Abrechnung (§ 4a Abs. 6), die Entwertung nach
> Rückerstattung (§ 4b/§ 7 Abs. 1) — alles **implementiert**, aber nur in der Neufassung
> geregelt.

```bash
# Pflicht-Check vor dem Merge nach main — beide Zeilen muessen "OK" ausgeben:
git show staging:app/agb/page.tsx | grep -q "KI-generierte Ergebnisse" \
  && echo "OK: AGB-Neufassung ist auf staging" \
  || echo "STOPP: staging traegt noch die ALTE AGB — Cutover wuerde sie veroeffentlichen!"

# Der Code zitiert § 4a und § 4b — sie muessen in der ausgelieferten AGB stehen:
git show staging:app/agb/page.tsx | grep -q 'nr="§ 4a"' \
  && git show staging:app/agb/page.tsx | grep -q 'nr="§ 4b"' \
  && echo "OK: § 4a + § 4b sind auf staging" \
  || echo "STOPP: Der Code zitiert AGB-Paragrafen, die die ausgelieferte AGB nicht hat!"
```

### 3.1 ✅ ERLEDIGT (16.07.): PR #89 mergen (Content-Freeze)

> **Nicht mehr auszuführen.** `origin/main` = `622760d`, enthält `staging` vollständig
> (`git rev-list --count origin/main..origin/staging` = 0). Am 17.07. nachgeprüft.
> Der folgende Abschnitt bleibt als Beleg der Konfliktauflösung stehen.

⚠️ **Der Merge ist NICHT konfliktfrei** — die alte Runbook-Aussage („Probemerge sauber, 0 Konflikte",
Stand 07.07.) stimmt nicht mehr. `main` hat **15 eigene Commits**: Hotfixes, die direkt auf `main`
gemacht wurden (Newsletter-Härtung 07.07., Coming-Soon-Apex-Switch + Admin-Proxy 08.07.,
Feedback-Ticketzähler). **9 Dateien kollidieren.**

Deshalb **nicht** `staging` direkt nach `main` mergen, sondern den vorbereiteten Branch nehmen:
`cutover/staging-to-main` — dort sind die Konflikte aufgelöst und die Auflösung ist **verifiziert**:

- Der aufgelöste Merge-Baum ist **byte-identisch mit `origin/staging`** → `main` enthält keinerlei
  Inhalt, den `staging` nicht schon hat.
- Jeder inhaltliche main-Commit einzeln gegengeprüft (Apex-301, Admin-Proxy, Router-Rule,
  Ticketzähler → alle vorhanden; die wenigen „fehlenden" Newsletter-Zeilen sind **abgelöst**:
  `publicAppUrl()` statt hartkodiertem Fallback, `buildSystemPrompt(isKickoff, ctaUrl)` statt
  `(isKickoff)` — genau die CTA-Härtung aus `f67eeaf`, konsequenter zu Ende geführt).
- Gate auf dem **Merge-Ergebnis**: 745 Unit + 96 Integration + 7 E2E grün, tsc sauber, Build ok.

```bash
gh pr merge 89 --repo aitema-de/edufunds --merge
```

Danach steht `origin/main` auf dem staging-Stand (AGB-Neufassung, Geldpfad-Absicherung,
Refund-Entwertung, Mahnwesen, IBAN-Guard, Migrationen 011–015).

### 3.2 🔴 Kolja-Go: Migrationen 011–015 auf Prod-DB `edufunds` anwenden

Alle additiv (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`) und idempotent —
gefahrlos, mehrfach anwendbar. Müssen **vor** dem Deploy laufen: der Webhook-Handler
erwartet die Tabelle (011) **und** den Status `refunded` (012). Fehlt 012, wirft
`charge.refunded` an der CHECK-Constraint, Stripe retried, und der Download-Token
bleibt trotzdem gültig — der Bug, den 012 gerade schließt.

| Migration | Inhalt |
|---|---|
| 011 | `stripe_webhook_events` (Idempotenz-Riegel) |
| 012 | Rückerstattung: `ki_antraege.status += 'refunded'`, `refunded_at/_token`, `credit_codes.revoked_at` |
| 013 | Bestellstatus-Lebenszyklus: `org_orders.paid_at/cancelled_at/cancel_reason/session_token` + CHECK |
| 014 | Mahnlauf: `org_orders.reminder_sent_at/dunning_sent_at` |
| 015 | Anteilige Abrechnung: `org_orders.settled_at/settled_amount_cents` |

```bash
ssh root@49.13.15.44
cd /home/edufunds/edufunds-app
git fetch origin
for m in 011_stripe_webhook_events 012_refund 013_order_status 014_dunning 015_settlement; do
  echo "--- $m ---"
  git show origin/main:db/migrations/${m}.sql \
    | docker exec -i edufunds-postgres psql -U edufunds -d edufunds -v ON_ERROR_STOP=1
done

# Verifikation — beide Constraints und die neuen Spalten müssen stehen:
docker exec edufunds-postgres psql -U edufunds -d edufunds -c \
  "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname IN ('ki_antraege_status_check','org_orders_status_check');"
# ki_antraege_status_check MUSS 'refunded' enthalten.
```

> **Trockenlauf gegen einen KLON der echten Prod-DB (14.07.2026):** Alle fünf Migrationen laufen
> sauber durch, sind **idempotent** (zweiter Lauf fehlerfrei), die **Altdaten bleiben unbeschadet**
> (6 Anträge, 3 bezahlt/mit Token, 2 Codes, 1 Newsletter-Eintrag), und der neue Refund-Pfad
> (`status='refunded'`) funktioniert auf genau diesen Daten — vorher wäre er an der CHECK-Constraint
> gescheitert. Klon danach gedroppt, Prod unberührt (011/012/015 dort weiterhin nicht angewandt).
> Auf `edufunds_staging` sind 012–015 zusätzlich seit dem 14.07. produktiv.
> **Prod-DB am 14.07. read-only geprüft:** `org_orders` ist leer (die CHECK-Constraint aus 013
> kann also an keinen Altdaten scheitern), `ki_antraege` hat nur `paid`/`complete`/`in_progress`
> — alle innerhalb der neuen Constraint. **Keine** der Migrationen 011–015 ist bislang drin.

### 3.3 🔴 Kolja-Go: Cutover-Deploy (baut `main`, recreated Container)

> ### ⛔ `--apex` ist PFLICHT — ohne das Flag geht `edufunds.org` nach Schritt 3.5 auf 404
>
> **Korrigiert 17.07.2026, gegen die laufenden Container geprüft.** Bis dahin stand hier
> `./scripts/deploy-production.sh` **ohne** `--apex` — das widerspricht der eigenen Warnung in
> Abschnitt 9.4 und der Kopfzeile des Deploy-Skripts („NACH dem Apex-Switch gehoert `--apex` in
> JEDEN weiteren Prod-Deploy").
>
> Ist-Zustand der Traefik-Router (17.07., `docker inspect`):
>
> | Container | Router-Rule | |
> |---|---|---|
> | `edufunds-app` | ``Host(`app.edufunds.org`)`` | **nicht** auf dem Apex — letzter Deploy lief ohne `--apex` |
> | `edufunds-maintenance` | ``Host(`edufunds.org`)││Host(`www.…`)││Host(`app.…`)``, Prio 1000 | bedient **als einziger** `edufunds.org` und macht selbst den 301 |
>
> **Daraus folgt:** Der Apex-„Switch" von 08.07. hängt derzeit **allein an der Wartungs-nginx**.
> `maintenance-mode.sh off` (3.5) entfernt diesen Container — deployst du vorher ohne `--apex`,
> matcht danach **kein Router mehr auf `edufunds.org`** → **Traefik-404**, und die App taucht
> stattdessen unter `app.edufunds.org` auf. Zusammen mit 9.5 (Webhook auf
> `https://edufunds.org/api/stripe/webhook`) heißt das: **Stripe liefert in ein 404, Geld kommt
> an, nichts wird freigeschaltet** — genau der Schaden, vor dem 9.5 warnt, nur über einen anderen
> Weg.
>
> Passend dazu: `.env.production` hat `NEXT_PUBLIC_APP_URL=https://edufunds.org` (der laufende
> Container trägt noch das alte `app.edufunds.org` eingebacken). Der Deploy baut die App also
> ohnehin **für den Apex** — der Router muss mitziehen.

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
./scripts/deploy-production.sh --apex   # --apex = PFLICHT (s. o.); PAYWALL_BYPASS=0 (Default = echte Zahlung)
```
> ⚠️ **Niemals `--with-paywall-bypass` auf Prod.** Der Default ist korrekt (echte Zahlung).
> Das Pilot-Image trägt den Bypass und darf nie nach Prod.

> Hinweis: Der Smoke-Test am Ende des Skripts trifft mit `--apex` die Apex-Domain — solange die
> Wartungsseite (Prio 1000) läuft, liefert das die Coming-Soon-Seite (200), **nicht**
> die App. Das ist ok; die echte App-Verifikation kommt in Schritt 4 vor dem Enthüllen.

**Direkt nach dem Deploy prüfen, dass der Router wirklich auf dem Apex steht** (sonst ist 3.5
eine Falle):
```bash
ssh root@49.13.15.44 'docker inspect edufunds-app --format "{{index .Config.Labels \"traefik.http.routers.edufunds-app.rule\"}}"'
# ERWARTET: Host(`edufunds.org`)   —   steht dort Host(`app.edufunds.org`), fehlte --apex: neu deployen.
```

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

> **Domain korrigiert 17.07.2026:** Hier stand durchgängig `app.edufunds.org` — das ist seit dem
> Apex-Switch (08.07.) nur noch ein **301**. Gegen `app.` geprüft, misst man die Weiterleitung
> statt der App: `curl -w '%{http_code}'` **ohne** `-L` liefert `301`, und der robots-Check
> gäbe eine **leere** Ausgabe zurück, die wie „kein Disallow" aussieht. Kanonisch ist
> `edufunds.org`.

```bash
# a) Grund-Erreichbarkeit (kanonische Domain)
for p in / /foerderprogramme /api/health; do
  printf "%s -> " "$p"; curl -s -o /dev/null -w '%{http_code}\n' "https://edufunds.org$p"; done

# e) robots.txt = Allow (Prod ohne ROBOTS_NOINDEX → indexierbar)
curl -s https://edufunds.org/robots.txt | head -3

# f) Admin-Login erreichbar (ADMIN_PASSWORD_HASH ist auf Prod gesetzt)
curl -s -o /dev/null -w '%{http_code}\n' https://edufunds.org/admin

# g) app./www. leiten weiter, statt tot zu sein (301 auf den Apex)
curl -s -o /dev/null -w 'app -> %{http_code} %{redirect_url}\n' https://app.edufunds.org/
curl -s -o /dev/null -w 'www -> %{http_code} %{redirect_url}\n' https://www.edufunds.org/
```

Auf dem Server (erst `ssh root@49.13.15.44`, dann Klartext):
```bash
cd /home/edufunds/edufunds-app

# b) Provider im laufenden Container (EU/DSGVO)  → mistral
docker exec edufunds-app printenv LLM_PROVIDER

# c) Webhook-Dedup-Tabelle vorhanden  → t
docker exec edufunds-postgres psql -U edufunds -d edufunds -tAc "SELECT to_regclass('public.stripe_webhook_events') IS NOT NULL"

# d) Retention-Cron Dry-Run (zählt, ändert nichts — enthält den neuen 90-Tage-PII-Op)
#    Container-intern aufrufen (wie der echte Cron, s. 5.1) — ein externer curl gegen die
#    Apex-Domain läuft vor "maintenance off" in ein stilles 405 der Wartungs-nginx.
S=$(grep '^CRON_SECRET=' .env.production | cut -d= -f2-)   # falls in Anführungszeichen: diese entfernen
docker exec edufunds-app sh -lc "curl -fsS -H 'x-cron-key: $S' 'http://localhost:3000/api/cron/retention?dryRun=1'" | jq '{dryRun, totalAffected}'
```

**Manuell / Stripe-Dashboard (Kolja):**
- Ein echter End-to-End-Kauf (kleiner Betrag) oder Stripe-CLI-Testevent → Webhook `checkout.session.completed` `pending_webhooks=0`, Antrag freigeschaltet, Rechnung (lexoffice) + Bestätigungsmail (Resend) kommen an.
- Live-Webhook-Endpoint im Stripe-Dashboard zeigt Zustellungen mit 200.

---

## 5. Crons

### 5.1 Retention-Cron — ✅ läuft bereits (seit 13.07.2026)

```
30 3 * * * /opt/ops/edufunds-retention-cron.sh
```

> ⚠️ **Nicht per `curl` gegen `app.edufunds.org` einrichten** (so stand es hier bis 14.07.).
> Die Coming-Soon-nginx läuft mit Traefik-Prio 1000 vor der App und reicht `/api/cron/*`
> **nicht** durch — ein externer curl liefe in ein stilles **405**, ohne dass es jemand
> merkt. Das Skript ruft deshalb **container-intern** auf (`docker exec` → localhost:3000)
> und bleibt auch nach `maintenance off` korrekt.

### 5.2 🔴 Mahnlauf-Cron produktiv schalten (NACH dem Cutover-Deploy)

Skript ist installiert (`/opt/ops/edufunds-dunning-cron.sh`, 14.07.2026) und gegen den
Staging-Container verifiziert. Der **Crontab-Eintrag fehlt bewusst noch**: Der Prod-Container
läuft bis zum Cutover auf altem Code **ohne** den Endpoint `/api/cron/dunning` — der Lauf
würde täglich mit exit 1 fehlschlagen und ein falsches Sicherheitsgefühl erzeugen.

**Erst nach dem Cutover-Deploy (3.3) eintragen:**

```bash
ssh root@49.13.15.44
# 1. Vorher prüfen, dass der Endpoint auf PROD existiert (muss JSON liefern, nicht leer):
CONTAINER=edufunds-app LOG=/tmp/dunning-check.log /opt/ops/edufunds-dunning-cron.sh --dry-run
cat /tmp/dunning-check.log     # "OK {"dryRun":true,...}" erwartet

# 2. Dann scharf schalten (täglich 04:00, nach der Retention um 03:30):
( crontab -l 2>/dev/null; echo "0 4 * * * /opt/ops/edufunds-dunning-cron.sh" ) | crontab -
crontab -l | grep dunning
```

Der Lauf ist zweistufig: Zahlungserinnerung bei Fälligkeit (folgenlos), Mahnung + Sperre der
noch offenen Credits nach 7 Tagen Kulanz. Die Mail geht **zuerst** raus, der Zustand ändert
sich erst danach — scheitert der Versand, bleibt alles unverändert und der nächste Lauf
versucht es erneut (niemand wird still gesperrt). Das Skript beendet sich mit **exit 1**,
wenn Mails fehlschlugen, damit es nicht untergeht.

> Newsletter-Cron (`/api/cron/newsletter`) läuft bereits monatlich.

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

### 7.1 Stand 14.07.2026 — was seither erledigt ist

- ✅ **Mistral-Nachweisakte vollständig** (`docs/legal/mistral-nachweise/`): Commercial ToS,
  Privacy Policy, DPA, Subprozessoren — alle von `legal.mistral.ai` mit Abrufvermerk.
  ⚠️ Das frühere „Terms"-PDF war nur die **Linkliste** und als Nachweis wertlos.
  „Kein Training" ist jetzt **belegt** (ToS § 4.2: kostenpflichtige API). ZDR beantragt.
- ✅ **AGB-Neufassung** um § 4a (Rechnungskauf), § 11 (Haftung), § 9 (AVV-Einbeziehung)
  ergänzt — liegt auf `feature/agb-neufassung`, **nicht** auf `staging` (siehe Schritt 3.0).
- ✅ **Google Fonts von der Wartungsseite entfernt.** Sie luden bei jedem Aufruf von
  `edufunds.org` und übertrugen die Besucher-IP ohne Einwilligung an Google — im
  Widerspruch zur eigenen Datenschutzerklärung. Schriften jetzt self-hosted.
- 🔴 **Offen:** anwaltliche Freigabe (Adressat noch nicht benannt), Newsletter-Testversand,
  Plan-Screenshot aus `admin.mistral.ai` für die Nachweisakte.

### 7.2 🔴 Sicherheits-Blocker vor `maintenance-mode.sh off`

Diese Punkte sind **behoben** (14.07.2026), stehen hier aber als Merkposten, weil sie
**erst mit dem Öffnen** wirksam geworden wären — die Wartungs-nginx hat sie bisher verdeckt:

- ✅ `/api/health/dashboard` war **völlig ungeschützt** (kein Auth, `CORS: *`) und lieferte
  Systemmetriken, Fehlerlogs und Client-IPs an jeden. Jetzt `requireAdmin`.
- ✅ **Rate-Limits waren wirkungslos:** `getClientIP` nahm den ersten `X-Forwarded-For`-Eintrag,
  Traefik läuft mit `forwardedHeaders.insecure=true` → jede IP frei fälschbar. Betraf
  Login-Bruteforce, KI-Kostenlimit und den Rechnungskauf. Jetzt wird von rechts gelesen.
- ✅ **Rechnungskauf** schaltete ohne jede Prüfung sofort frei (bis 459,90 €). Jetzt
  Bucket `invoice` (3/24h) + max. 2 offene unbezahlte Rechnungen pro E-Mail.

**Noch offen (nicht blockierend, aber vor dem ersten echten Kunden zu klären):**
- [ ] `charge.refunded` entwertet den `paid_token` **nicht** — nach einer Rückerstattung
      bleibt der Download unbegrenzt gültig (TODO PAY-03 im Webhook-Handler).
- [ ] `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` steht noch fest in `.github/workflows/*.yml`
      (nur `workflow_dispatch`, aber laut Datei selbst „vor Go-Live entfernen").
- [ ] Toter Button „Sektion bearbeiten" (`AntragResult.tsx` → `?editAnswer=true` wird
      nirgends gelesen).
- [ ] Kein E2E-Test über den Kaufpfad; `markSessionPaid`/`createOrder` laufen in keinem
      Test real (überall gemockt).

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

### 9.5 ⛔ STOPP — Stripe-Webhook-Endpoint nachziehen (Kolja)

> **Der teuerste Fehler im ganzen Cutover.** Wird dieser Schritt vergessen, nimmt die
> Plattform Geld an und liefert nichts — und **niemand merkt es**, denn der Kunde sieht
> einen Bezahlvorgang, der sauber durchläuft. Deshalb steht hier ein Stopp und keine
> Checkbox.

**Verifizierter Ist-Zustand (14.07.2026, read-only gegen das Live-Konto abgefragt):**

| | |
|---|---|
| URL | `https://app.edufunds.org/api/stripe/webhook` ⬅️ **zeigt auf die ALTE Domain** |
| Status | `enabled` |
| Events | `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `checkout.session.async_payment_failed` |

`charge.refunded` ist aktiviert ✅ — der seit 14.07. implementierte Refund-Handler (entwertet
`paid_token` + Kontingent) bekommt also tatsächlich Events. Aber: Nach 9.4 bekäme ein POST auf
`app.edufunds.org` **301** auf den Apex — **Stripe folgt Redirects bei Webhooks nicht**. Die
Freischaltung hängt allein an diesem Webhook (`checkout.session.completed` → `markSessionPaid`).

1. Im Stripe-Dashboard den **bestehenden** Endpoint bearbeiten und die URL auf
   `https://edufunds.org/api/stripe/webhook` ändern.
   → **Beim Bearbeiten bleibt das Signing-Secret dasselbe** — dann sind weder eine
   `.env.production`-Änderung noch ein Container-Recreate nötig. Im Dashboard gegenprüfen.
   ⚠️ Legst du stattdessen einen **neuen** Endpoint an, gibt es ein **neues `whsec_…`**: Das
   muss in `.env.production` und der Container **neu erzeugt** werden (ein `docker restart`
   genügt nicht, siehe Abschnitt 8) — sonst schlägt die Signaturprüfung bei jeder Zahlung fehl.
2. **Verifizieren, nicht vertrauen** — im Dashboard ein Test-Event senden und auf **200**
   prüfen. Ein 301 oder 404 hier bedeutet: Jede echte Zahlung würde ins Leere laufen.

```bash
# Gegenprobe von außen: Der Endpoint muss DIREKT antworten (kein 301!).
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -X POST \
  https://edufunds.org/api/stripe/webhook
# Erwartet: 400 (fehlende Signatur) — NICHT 301, NICHT 404.
# 400 heißt: Die Route lebt und prüft die Signatur. Genau richtig.
```

**Sicherheitsnetz (seit 14.07.2026):** Falls der Webhook doch einmal ausbleibt, ist der Kunde
nicht mehr verloren. Der Erfolgs-Screen fragt nach 12 Sekunden ohne Freischaltung selbst bei
Stripe nach (`POST /api/wizard/checkout/reconcile`) und schaltet frei, wenn Stripe die Session
als `paid` meldet — mit Abgleich der Stripe-Metadaten, damit eine fremde Checkout-Session-ID
nichts nützt. Im Server-Log erscheint dann eine **Warnung** („der Webhook ist ausgeblieben").
→ **Diese Warnung ist ein Alarm, kein Rauschen.** Taucht sie auf, stimmt etwas mit dem Endpoint
nicht. Das Netz ersetzt Schritt 9.5 **nicht** — es verhindert nur, dass ein Fehler hier direkt
Kundengeld kostet.

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
