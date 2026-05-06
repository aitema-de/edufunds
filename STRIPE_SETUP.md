# Stripe-Setup für EduFunds

Checkliste für Koljas Einrichtung — sobald abgehakt, ist die Paywall live.

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

- [ ] Test-Mode erfolgreich durchlaufen
- [ ] Live-Keys in `.env.production` eingetragen
- [ ] Live-Webhook-Endpoint in Stripe registriert
- [ ] Deploy via `./scripts/deploy-production.sh`
- [ ] Ein realer 29-€-Durchlauf zur Validierung (danach via Stripe Refund zurück)
