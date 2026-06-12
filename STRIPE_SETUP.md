# Stripe-Setup für EduFunds

Checkliste für Koljas Einrichtung — sobald abgehakt, ist die Paywall live.

> **Reaffirmiert 2026-06-08:** Separater EduFunds-Account (NICHT den SailHub-Spenden-Account
> wiederverwenden). Grund: sauberes „EduFunds"-Checkout-Branding + getrennte
> Buchhaltung/Auszahlung. Der SailHub-Account nutzt Stripe **Connect** (Geld läuft an die
> Vereine durch); EduFunds dagegen ist eine reine **Standard-Charge an aitema** — die zwei
> Modelle bleiben dadurch auch organisatorisch sauber getrennt. Test-Mode steht direkt nach
> der Registrierung zur Verfügung (vor vollständigem KYC) — die komplette Test-Einrichtung
> (Produkt/Preis/Webhook) kann also sofort erfolgen, KYC/Live folgt.

## 1. Stripe-Account anlegen

- https://dashboard.stripe.com/register aufrufen
- **Neuen Account unter aitema GmbH** erstellen (nicht den SailHub-Account wiederverwenden, damit das Checkout-Branding „EduFunds" zeigt)
- KYC durchlaufen: Gewerbeanmeldung, Steuer-Nr., IBAN
- Im Profil: **Business-Name** = „EduFunds" (das erscheint später im Checkout-Header)

## 2. Produkt + Preis anlegen

Im Dashboard: **Produkte → Neues Produkt**
- Name: `EduFunds Einzelantrag`
- Beschreibung: `Ein KI-generierter Förderantrag inkl. Finanzplan`
- Preis: `29,00 €`, **einmalig** (nicht Abo)
- Speichern → **Preis-ID kopieren** (Format `price_...`)

## 3. Webhook-Endpoint einrichten

Im Dashboard: **Entwickler → Webhooks → Endpoint hinzufügen**
- URL: `https://app.edufunds.org/api/stripe/webhook`
  (für Staging zusätzlich `https://staging.edufunds.org/api/stripe/webhook` — eigener Endpoint, eigener Secret)
- Events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
- Speichern → **Signing-Secret kopieren** (Format `whsec_...`)

## 4. API-Keys kopieren

- **Entwickler → API-Keys**
- Test-Modus-Keys für Staging/Dev, Live-Keys für Production
- Secret Key kopieren (`sk_test_...` oder `sk_live_...`)

## 5. Environment-Variablen setzen

### Lokal (`~/edufunds-app/.env.local`)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # Wert aus dem Staging-Webhook
STRIPE_PRICE_EINZELANTRAG=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3101
NEXT_PUBLIC_PAYWALL_DEV_MOCK=1    # Dev-Mock weiterhin aktiv, um ohne Stripe zu testen
```

### Staging (`/home/edufunds/edufunds-app/.env.production` auf Server)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # Staging-Webhook-Secret
STRIPE_PRICE_EINZELANTRAG=price_... # gleicher Test-Price
NEXT_PUBLIC_APP_URL=https://staging.edufunds.org
# NEXT_PUBLIC_PAYWALL_DEV_MOCK weglassen (Dev-Mock ist auf Staging aus)
```

### Production
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # Production-Webhook-Secret
STRIPE_PRICE_EINZELANTRAG=price_... # Live-Price-ID
NEXT_PUBLIC_APP_URL=https://app.edufunds.org
```

**Wichtig:** Live- und Test-Mode haben getrennte Webhook-Secrets und Price-IDs. Nicht vertauschen.

## 6. Stripe CLI für lokale Webhook-Tests (optional)

```bash
# Einmalig:
brew install stripe/stripe-cli/stripe
stripe login

# Webhook-Forwarding starten:
stripe listen --forward-to http://localhost:3101/api/stripe/webhook

# → zeigt dir den Webhook-Secret (whsec_...) fuer die Session.
# Das STRIPE_WEBHOOK_SECRET in .env.local kurz ersetzen, dev-server neu starten.

# Test-Zahlung triggern:
stripe trigger checkout.session.completed
```

## 7. Verifikation (Staging)

1. Wizard durchlaufen bis zum Antragsresult
2. „Jetzt für 29 € freischalten" → Redirect zu Stripe Checkout (de-Lokale, Marke „EduFunds")
3. Testkarte `4242 4242 4242 4242`, beliebiges zukünftiges Ablaufdatum, CVC `123`
4. Nach Erfolg: Stripe leitet auf `/antrag/checkout/success?session_token=...&cs=...`
5. Success-Seite pollt `/api/wizard/[token]` alle 2s; sobald Webhook gefeuert hat und `paidToken` gesetzt ist → Redirect auf `/antrag/download/[paidToken]`
6. Download-Seite zeigt vollständigen Antrag + Finanzplan, Copy/Download/PDF-Buttons aktiv

## 8. Production-Checkliste vor Live-Schaltung

> **Sandbox → Live umstellen:** Detaillierte Cutover-Checkliste in
> [`STRIPE-LIVE-CUTOVER.md`](./STRIPE-LIVE-CUTOVER.md) (Live-Konto seit 2026-06-12 aktiviert).

- [ ] Test-Mode erfolgreich durchlaufen
- [ ] Live-Keys in `.env.production` eingetragen
- [ ] Live-Webhook-Endpoint in Stripe registriert
- [ ] Deploy via `./scripts/deploy-production.sh`
- [ ] Ein realer 29-€-Durchlauf zur Validierung (danach via Stripe Refund zurück)

## Webhook-Smoke (Plan 02.1-02)

Zwei verifizierte Smoke-Pfade — beide funktionieren ohne Stripe-Live-Account.

### Pfad A — Auto-Smoke über Stripe-SDK (CI-tauglich)

```bash
# Voraussetzung: Dev-Server läuft (npm run dev)
# Voraussetzung: STRIPE_SECRET_KEY (Test-Mode reicht!) + STRIPE_WEBHOOK_SECRET in .env.local
npx tsx --env-file=.env.local scripts/smoke-stripe-webhook.ts
```

Erwartet: `OK — Webhook-Pfad smoke-tested (3/3).`

Hinweis Test 1: Wenn `smoke-fake-token` nicht in der Dev-DB existiert, gibt der Webhook 500 zurück — das ist korrekt (Stripe retried 5xx). Für einen echten 200-Durchlauf `SMOKE_SESSION_TOKEN` auf einen existierenden Token setzen.

### Pfad B — Stripe-CLI manuell (Production-realistisch)

```bash
# Einmalig:
stripe login

# Terminal 1 (laufen lassen):
stripe listen --forward-to http://localhost:3101/api/stripe/webhook
# → "Ready! Your webhook signing secret is whsec_xxx"
# → den whsec_xxx in .env.local als STRIPE_WEBHOOK_SECRET eintragen, Dev-Server neu starten

# Terminal 2:
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
stripe trigger charge.refunded
```

Erwartet: Terminal 1 zeigt jeweils 200-Response, Backend-Logs zeigen `[stripe/webhook] event.id=evt_... type=...` plus den jeweiligen Case-Branch.
