# Zahlungsmethoden - EduFunds

## Übersicht

| Zahlungsmethode | Status | Gebühren | Einrichtung |
|-----------------|--------|----------|-------------|
| Rechnungskauf | ✅ Live | Keine | Keine |
| SEPA-Lastschrift | ✅ Live | Keine | Keine |
| Kreditkarte (Stripe) | 🔄 Bereit | Stripe-Gebühren | API-Key nötig |
| Apple Pay (Stripe) | 🔄 Bereit | Stripe-Gebühren | API-Key nötig |
| Google Pay (Stripe) | 🔄 Bereit | Stripe-Gebühren | API-Key nötig |
| PayPal | 🔄 Bereit | PayPal-Gebühren | API-Key nötig |

## Konfiguration

### Umgebungsvariablen (.env)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...

# Bankverbindung für Rechnungen
BANK_ACCOUNT_NAME=Aitema GmbH
BANK_IBAN=DE91 4306 0967 1250 4734 00

> 🔴 **ACHTUNG (14.07.2026): Die hier genannte IBAN `DE91 4306 0967 1250 4734 00` ist ein DUMMY — ihre Prüfsumme ist ungültig.** Nicht kopieren! `BANK_IBAN` muss mit der ECHTEN aitema-Kontoverbindung gesetzt werden; `getBankDetails()` (lib/payments/bank.ts) prüft die Prüfsumme und verweigert sonst den Rechnungskauf.

BANK_BIC=GENODEM1GLS
```

### API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/checkout` | POST | Rechnung/Lastschrift |
| `/api/stripe/checkout` | POST | Stripe-Session erstellen |
| `/api/stripe/verify` | GET | Stripe-Zahlung verifizieren |
| `/api/stripe/webhook` | POST | Stripe-Events empfangen |
| `/api/paypal` | POST/PUT | PayPal-Bestellung/-Erfassung |

## Rechnungskauf

**Ablauf:**
1. Kunde wählt "Rechnung" aus
2. Bestellung wird erstellt
3. Rechnung per E-Mail versendet
4. Kunde überweist innerhalb 14 Tage
5. Nach Zahlungseingang: Freischaltung

**Bankverbindung:**
- Empfänger: Aitema GmbH
- IBAN: DE91 4306 0967 1250 4734 00
- BIC: GENODEM1GLS
- Bank: GLS Bank

## SEPA-Lastschrift

**Ablauf:**
1. Kunde gibt IBAN ein
2. SEPA-Mandat wird erstellt
3. Lastschrift nach 3 Tagen eingezogen
4. Bei Erfolg: Sofortige Freischaltung

**Mandatsreferenz:** Automatisch generiert (MAND-{timestamp})

## Stripe (Kreditkarte, Apple Pay, Google Pay)

**Ablauf:**
1. Kunde wählt "Kreditkarte/Apple Pay/Google Pay"
2. Stripe Checkout Session wird erstellt
3. Weiterleitung zu Stripe
4. Zahlung bei Stripe
5. Rückleitung zu EduFunds
6. Verifizierung via `/api/stripe/verify`

**Stripe-Dashboard:** https://dashboard.stripe.com

## PayPal

**Ablauf:**
1. Kunde wählt "PayPal"
2. PayPal-Bestellung wird erstellt
3. Weiterleitung zu PayPal
4. Zahlung bei PayPal
5. Rückleitung zu EduFunds
6. Erfassung via `/api/paypal` (PUT)

**PayPal-Dashboard:** https://developer.paypal.com

## Testing

### Testdaten Stripe
- Karte: 4242 4242 4242 4242
- Ablauf: 12/25
- CVC: 123

### Testdaten PayPal
- Sandbox: https://developer.paypal.com/developer/accounts/

## Fehlerbehandlung

| Fehler | Lösung |
|--------|--------|
| "Fehlende Pflichtfelder" | Alle *-Felder ausfüllen |
| "Verbindungsfehler" | Netzwerk prüfen, neu versuchen |
| "Stripe Session Error" | API-Key prüfen |
| "PayPal Order Error" | Credentials prüfen |

## Sicherheit

- Alle Zahlungen über HTTPS
- Stripe: PCI-DSS Level 1 zertifiziert
- PayPal: Buyer Protection
- Keine Kartendaten auf unseren Servern
