# Generalprobe-Deploy — Wizard nach Prod, noch mit Sandbox-Keys

Ziel: den **kompletten Zahlungs-/Antrags-Pfad** (Wizard → Checkout → Webhook →
lexoffice-Rechnung → §312i-Mail) auf prod-naher Umgebung gegen **Stripe-Sandbox**
durchspielen, BEVOR echte Keys gesetzt werden. Danach ist der echte Go-Live nur
noch der Key-Tausch (siehe `STRIPE-LIVE-CUTOVER.md`).

## Ausgangslage (verifiziert 2026-06-12)
- `app.edufunds.org` (Container `edufunds-app`) läuft seit 17.04. auf Vor-Wizard-`main`.
- `deploy-production.sh` baut `main` per `docker run`, `--env-file .env.production`
  (ohne DEV_MOCK-Build-Arg → echter Stripe-Pfad aktiv).
- `deploy-staging.sh` backt `NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` in den Build → Staging
  nutzt IMMER den Mock-Checkout, NIE echtes Stripe.
- ⚠️ `.github/workflows/deploy.yml` deployt automatisch bei Push auf `main`.
- ⚠️ lexoffice hat KEINE Sandbox: `finalize=true` erzeugt eine echte, fortlaufende
  Rechnungsnummer (GoBD) — auch bei einem Stripe-Sandbox-Testkauf.

## Empfehlung: zweistufig
1. **Code-Pfad-Probe auf PROD mit Sandbox-Keys** (diese Datei) — validiert Deploy-
   Mechanik UND echten Stripe-Pfad, ohne echtes Geld.
2. **Go-Live** = Live-Keys setzen (`STRIPE-LIVE-CUTOVER.md`), 1 echter Testkauf + Storno.

> Alternative (noch risikoärmer für laufenden Prod-Traffic): einen separaten,
> einmaligen Staging-Build OHNE `--build-arg NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` und mit
> Sandbox-`STRIPE_*` in `.env.staging`. Erfordert manuellen `docker build` ohne den
> Arg — siehe Anhang.

---

## Schritt 0 — Kolja-TODOs VOR dem Deploy (Reihenfolge zwingend)

Diese müssen **vor** dem Merge nach `main` erledigt sein, sonst deployt der
Auto-Deploy mit fehlender Konfiguration:

- [ ] **AGB-Checkbox im Sandbox:** Die ToS-URL liegt unter „Öffentliche Angaben",
      die im Sandbox aber gesperrt ist (Geschäftsprofil „unvollständig"). Daher für
      die Generalprobe in `.env.production` **`STRIPE_TOS_CONSENT=off`** setzen — dann
      läuft der Checkout ohne ToS-URL. Auf dem Live-Konto ist „Öffentliche Angaben"
      verfügbar: dort `https://app.edufunds.org/agb` (+ `/datenschutz`) eintragen und
      `STRIPE_TOS_CONSENT` wieder entfernen (Default = Checkbox an).
- [ ] **Stripe-Sandbox-Webhook:** Endpoint `https://app.edufunds.org/api/stripe/webhook`
      anlegen, Events `checkout.session.completed/expired`, `charge.refunded`,
      `checkout.session.async_payment_failed` → Sandbox-`whsec_…` kopieren.
- [ ] **Migration 009** auf die Prod-DB ausrollen:
      ```bash
      cat db/migrations/009_invoice.sql | ssh root@49.13.15.44 \
        "docker exec -i edufunds-postgres psql -U edufunds -d edufunds"
      ```
- [ ] **`.env.production` ergänzen** (per SSH/nano, Werte selbst eintippen):
      ```
      STRIPE_SECRET_KEY=sk_test_…            # SANDBOX
      STRIPE_WEBHOOK_SECRET=whsec_…          # SANDBOX-Webhook
      STRIPE_PRICE_EINZELANTRAG=price_…      # SANDBOX-Price
      MISTRAL_API_KEY=…                      # sonst 401, kein LLM
      LEXOFFICE_API_KEY=…
      CRON_SECRET=…                          # openssl rand -base64 32
      NEXT_PUBLIC_APP_URL=https://app.edufunds.org
      FROM_EMAIL=…                           # Resend-verifizierte Domain prüfen
      ```
      ⚠️ `NEXT_PUBLIC_PAYWALL_DEV_MOCK` NICHT setzen (echter Stripe-Pfad).
- [ ] **lexoffice-Rechnung entschärfen** für die Probe — sonst echte Rechnungsnummer.
      ✅ Schalter gebaut: in `.env.production` für die Probe **`LEXOFFICE_FINALIZE=false`**
      setzen → es entsteht nur ein löschbarer Entwurf (keine Nummer/PDF, Bestätigungsmail
      ohne Anhang). Für den echten Go-Live wieder entfernen/`=true` (Default).

## Schritt 1 — Deploy
- [ ] `feature/wizard-adaptive` → `staging` → `main` mergen (Workflow feature→staging→main).
- [ ] Push auf `main` löst Auto-Deploy aus — ODER manuell `./scripts/deploy-production.sh`.
- [ ] Healthcheck abwarten (`/api/health` → `database:true`).

## Schritt 2 — E2E-Verifikation auf app.edufunds.org
- [ ] Wizard durchlaufen → Matching → Interview → Antragsentwurf erscheint.
- [ ] KI-Hinweise sichtbar (Start + Ergebnis), Datenschutz/Impressum/AGB korrekt.
- [ ] „Freischalten" → Stripe-**Sandbox**-Checkout (Marke EduFunds, AGB-Checkbox,
      Org-Felder), Testkarte `4242 4242 4242 4242`.
- [ ] Success-Redirect → Download-Seite zeigt vollständigen Antrag + Finanzplan,
      Export trägt die KI-Kennzeichnung.
- [ ] Webhook im Sandbox-Dashboard → Delivery **200**; `org_orders`/`paid_token` in DB.
- [ ] §312i-Bestätigungsmail kommt an, lexoffice-Entwurf/Rechnung erzeugt.
- [ ] Löschkonzept-Dry-Run: `POST /api/cron/retention?dryRun=1` mit `x-cron-key` → Zahlen plausibel.

## Schritt 3 — Aufräumen
- [ ] lexoffice-Test-Entwurf löschen (falls finalize=false) bzw. Rechnung stornieren.
- [ ] Sandbox-Testkauf ggf. in Stripe refunden (übt auch den `charge.refunded`-Pfad).

## Danach: echter Go-Live
Nur noch Keys tauschen + 1 realer Testkauf + Storno — Details `STRIPE-LIVE-CUTOVER.md`.

---

## Anhang — Variante Staging mit Sandbox-Stripe (ohne Prod-Risiko)
```bash
# auf dem Server, manueller Build OHNE DEV_MOCK:
ssh root@49.13.15.44
cd /home/edufunds/edufunds-app && git checkout staging && git pull
docker build -t edufunds:staging .            # KEIN --build-arg DEV_MOCK
# .env.staging vorher um SANDBOX STRIPE_*/MISTRAL/LEXOFFICE ergänzen
# dann Container-Swap wie in deploy-staging.sh (ab `docker run`).
```
Damit läuft die volle echte-Sandbox-Probe auf `staging.edufunds.org`, ohne den
Prod-Container anzufassen.
