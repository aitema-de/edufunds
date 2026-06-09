# Legacy-Checkout — Referenz vor dem Aufräumen (A)

> Gesichert am 2026-06-08, bevor die alten Pre-Launch-Checkout-Pfade entfernt wurden.
> Der kanonische Bezahlflow ist: `PaywallGate` → `POST /api/wizard/checkout`
> → Stripe Checkout (`mode: payment`, Price-ID aus Env) → `POST /api/stripe/webhook`
> → `markSessionPaid` (mintet `paidToken`).
>
> Diese Datei bewahrt die Informationen aus dem gelöschten Alt-Cluster auf, die für
> **Modell B (Schulträger-Kontingent)** und ggf. Rechnungs-/SEPA-Zahlung noch gebraucht werden.

## Entfernte Dateien
- `app/api/checkout/route.ts` (In-Memory-Bestellsystem, `force-static`, Rechnung/Lastschrift/Kreditkarte)
- `app/api/stripe/checkout/route.ts` (Dublette mit Inline-Preisen, nicht an Wizard-Sessions gekoppelt)
- `app/api/paypal/route.ts` (PayPal, halbfertig)
- `app/api/stripe/verify/route.ts` (toter 503-Stub, `force-static`)
- `app/checkout/einzel/page.tsx`, `app/checkout/jahresabo/page.tsx`, `app/checkout/success/page.tsx`

## Bankverbindung aitema GmbH (war hardcoded in `/api/checkout`)
- Empfänger: **Aitema GmbH**
- IBAN: **DE91 4306 0967 1250 4734 00**
- BIC: **GENODEM1GLS**
- Bank: **GLS Bank**
- → Gehört in Produktion in Env/Config, NICHT in den Code.

## Rechnungs-/SEPA-Design (für spätere B2B-/Schulträger-Zahlung)
**Rechnung:**
- `orderNumber = EDU-<base36(timestamp)>`, `invoiceNumber = RE-<timestamp>`
- Zahlungsziel: +14 Tage
- Verwendungszweck = `orderNumber`

**SEPA-Lastschrift:**
- Mandat: `mandateReference = MAND-<timestamp>`, `mandateDate`, `iban`, `bic`, `accountHolder`
- Einzug: +3 Tage nach Mandat

> Hinweis: Schulträger (öffentliche Hand) zahlen i. d. R. **per Rechnung**, nicht per Karte.
> Falls Modell B Rechnungszahlung braucht, hier sauber neu bauen (DB statt In-Memory,
> dynamische Route, IBAN aus Config). Stripe kann Rechnung/SEPA auch nativ
> (`payment_method_types: ["sepa_debit"]`, bzw. Stripe Invoicing) — bevorzugen.

## Tarif-/Bundle-Struktur (aus alter `/preise`-Seite) — Vorlage für Modell B
| Tarif | Preis | Kontingent | Sonstiges |
|---|---|---|---|
| Freemium | 0 € | 0 Anträge (nur Suche/Ansicht) | → `/registrieren` |
| Einzelantrag | 29 € einmalig | 1 Antrag | = Modell A, kanonischer Wizard-Flow |
| Jahresabo | 149 € / Jahr | 5 Anträge inkl., weitere 14,90 € | **Modell-B-Kandidat (Kontingent)** |
| Schulträger-Abo | 249 € / Jahr | 20 Anträge inkl., bis 5 User, weitere 9,90 € | **Modell B**, aktuell nur `/kontakt`-Anfrage |

Alte Inline-Stripe-Beträge (Cent): `einzel = 2900`, `jahresabo = 14900`.

## Modell B (Schulträger-Kontingent) — Umsetzungsskizze
1. Stripe-Price-IDs je Paket: `STRIPE_PRICE_KONTINGENT_5 / _20 / _N`.
2. Checkout-Session-Metadata: `mode = "org_quota"`, `org_id`, `credits = N`.
3. Webhook verzweigt: bei `mode === "org_quota"` → `org_credits += N` (neue Tabelle/Spalte)
   statt `markSessionPaid`.
4. Antragserstellung prüft: gültiger `paidToken` (Modell A) **ODER** `org.credits > 0` (Modell B)
   → Credit **atomar** dekrementieren (Optimistic Lock / `... WHERE credits > 0`).
