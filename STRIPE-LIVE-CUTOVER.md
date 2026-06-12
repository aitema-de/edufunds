# Stripe Cutover: Sandbox → Live

Schritt-für-Schritt-Checkliste für den Umstieg von der Stripe-Sandbox auf das
aktivierte Live-Konto der aitema GmbH.

> **Voraussetzung erfüllt (2026-06-12):** Live-Konto **aktiviert & verifiziert**
> (KYC: Unternehmensprofil, Geschäftsführer-Identität, wirtschaftlich Berechtigte,
> IBAN, 2FA). Der Cutover wurde **bewusst aufgeschoben** — EduFunds-Production läuft
> aktuell weiter auf den **Sandbox-Keys**.
>
> | Konto | ID | Verwendung |
> |---|---|---|
> | EduFunds Sandbox | `acct_1Tg2nADHzDjbCkJn` (`…ADHzDjbCkJn`) | bisher in Prod aktiv (Test-Keys) |
> | EduFunds **Live** | `acct_…2RbKUcSBRFK` | Ziel des Cutovers — **bestätigt 2026-06-12** |
> | (allgemeines aitema GmbH-Konto | `acct_1SrJvqE9QiYZiN3h` | NICHT für EduFunds verwenden) |
>
> Account-ID bestätigt: Die Live-Price-ID des Einzelantrags
> (`price_1ThRcARbKUcSBRFKwVaNcYHr`) enthält die Account-Kennung `…RbKUcSBRFK` →
> gehört eindeutig zum EduFunds-gebrandeten Live-Account. Die Stripe-Aktivierungsmail
> vom 16.04. nannte `acct_1SrJvqE9QiYZiN3h` — das ist der **allgemeine** aitema-Account,
> der NICHT für EduFunds genutzt wird.

Begleitend: Die Grund-Einrichtung (Produkt/Webhook/Verifikation) ist in
[`STRIPE_SETUP.md`](./STRIPE_SETUP.md) dokumentiert. **Dieses Dokument behandelt
ausschließlich den Wechsel Test → Live.**

---

## 🚧 PREREQUISITE (Stand 2026-06-12): Wizard ist noch nicht in Production

**Vor dem Stripe-Cutover steht ein vollständiger Prod-Deploy.** Befund vom 2026-06-12:

- `app.edufunds.org` (Container `edufunds-app`) läuft seit **17.04.2026** auf **Vor-Wizard-Code**
  (Branch `main`): **keine** Checkout-Route, **keine** `STRIPE_`-Variablen, nur `GEMINI_API_KEY`.
- Der Wizard + Stripe-Checkout liegt nur auf `feature/wizard-adaptive` — **nie nach `main`
  gemergt, nie nach Prod deployt**.
- `deploy-production.sh` baut Branch **`main`** und startet `edufunds-app` per `docker run`
  mit `--env-file /home/edufunds/edufunds-app/.env.production` (dort fehlen die Stripe-Werte).
  Die `docker-compose.prod.yml` (`edufunds-nextjs`) ist NICHT der aktive Deploy-Pfad.

**Nötige Reihenfolge vor diesem Cutover:**
1. `feature/wizard-adaptive` → `staging` → `main` mergen (inkl. Entscheidung über offene
   Compliance-Arbeit: Datenminimierung `39a9dd2`, Mistral-Branch).
2. `.env.production` auf dem Server um Stripe- (und DeepSeek-)Variablen ergänzen — fehlen komplett.
3. `./scripts/deploy-production.sh` (deployt `main`).
4. Erst dann die Stripe-Live-Schritte unten.

---

## ⚠️ Die drei klassischen Cutover-Fallen

1. **Webhook-Secret** unterscheidet sich zwischen Test- und Live-Modus. Live-Endpoint
   muss **separat neu angelegt** werden, sonst schlägt die Signaturprüfung fehl
   (`400 invalid signature`) und keine Zahlung wird freigeschaltet.
2. **Price-ID** für den Einzelantrag existiert im Live-Konto **nicht** — Sandbox-Price-IDs
   sind modus-gebunden. Die Live-Price muss neu erstellt und `STRIPE_PRICE_EINZELANTRAG`
   nachgezogen werden. (Die Org-Pakete brauchen das **nicht** — siehe unten.)
3. **Keys nicht vertauschen** — `sk_live_…`/`pk_live_…` gehören NUR in Production, niemals
   in Staging/Dev (dort bleiben Test-Keys).

---

## Schritt 1 — Live-Produkt & -Preis anlegen

Im Dashboard **in den Live-Modus wechseln** (Schalter oben, „Testmodus" aus), dann
**Produkte → Neues Produkt**:

- [ ] Name: `EduFunds Einzelantrag`
- [ ] Preis: **29,90 €**, **einmalig** (nicht Abo), Währung EUR, inkl. MwSt.
      → muss dem aktuellen Sandbox-Betrag entsprechen (Single Source: `lib/.../packs.ts`, Einzel = `2990` Cent)
- [x] Live-Price-ID (kopiert per Sandbox→Live, 2026-06-12): **`price_1ThRcARbKUcSBRFKwVaNcYHr`**

> **Org-Pakete (5/10/20 Anträge) NICHT manuell anlegen:** Der Kontingent-Flow
> (`app/api/kontingent/checkout/route.ts`) erzeugt die Beträge zur Laufzeit per
> `price_data` aus `packs.ts` — er braucht **keine** vorab angelegten Price-IDs.
> Nur der Einzelantrag-Flow (`app/api/wizard/checkout/route.ts`) referenziert eine
> feste Price-ID über `STRIPE_PRICE_EINZELANTRAG`.

## Schritt 2 — Live-Webhook-Endpoint einrichten

Dashboard (Live-Modus): **Entwickler → Webhooks → Endpoint hinzufügen**

- [ ] URL: `https://app.edufunds.org/api/stripe/webhook`
- [ ] Events auswählen (genau die vier, die der Code behandelt):
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.expired`
  - [ ] `charge.refunded`
  - [ ] `checkout.session.async_payment_failed`
- [ ] Speichern → **Live-Signing-Secret** kopieren (Format `whsec_…`)

## Schritt 3 — Live-API-Keys holen

Dashboard (Live-Modus): **Entwickler → API-Keys**

- [ ] Secret Key kopieren (`sk_live_…`)
- [ ] (Publishable Key `pk_live_…` nur falls clientseitig benötigt — aktuell nutzt der
      Code nur `STRIPE_SECRET_KEY`)

## Schritt 4 — Production-ENV umstellen

Auf dem Server: `root@49.13.15.44:/home/edufunds/edufunds-app/.env.production`

- [ ] `STRIPE_SECRET_KEY=sk_live_…`            ← Live Secret Key (Schritt 3)
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_…`          ← **Live**-Webhook-Secret (Schritt 2)
- [ ] `STRIPE_PRICE_EINZELANTRAG=price_…`      ← **Live**-Price-ID (Schritt 1)
- [ ] `NEXT_PUBLIC_APP_URL=https://app.edufunds.org`  (bleibt)
- [ ] `NEXT_PUBLIC_PAYWALL_DEV_MOCK` **NICHT gesetzt** (Dev-Mock muss in Prod aus sein!)

> Staging/Dev bleiben unverändert auf **Test**-Keys + Test-Webhook-Secret.

## Schritt 5 — Deployen

- [ ] `./scripts/deploy-production.sh`  (deployt `main` nach app.edufunds.org, zweifache Bestätigung)

## Schritt 6 — Live-Verifikation (echter Durchlauf)

Mit echter Karte (kleiner realer Betrag, danach Refund) oder Stripe-Live-Test:

- [ ] Wizard bis zum Antragsresult durchlaufen → „Jetzt für 29,90 € freischalten"
- [ ] Redirect zu Stripe Checkout zeigt **Live**-Umgebung + Marke „EduFunds", Betrag 29,90 €
- [ ] Zahlung abschließen → Redirect auf `/antrag/checkout/success?...`
- [ ] Success-Seite pollt → nach Webhook-Eintreffen Redirect auf `/antrag/download/[paidToken]`
- [ ] Download-Seite zeigt vollständigen Antrag + Finanzplan, Export-Buttons aktiv
- [ ] Im **Live**-Dashboard prüfen: Webhook-Delivery **200**, Zahlung verbucht
- [ ] DB prüfen: `org_orders`-Eintrag / `paidToken` gesetzt
- [ ] Test-Zahlung per **Stripe Refund** zurückerstatten → `charge.refunded`-Webhook feuert (200)

## Schritt 7 — Nachkontrolle (erste echte Tage)

- [ ] Erste echte Kundenzahlung im Live-Dashboard auf erfolgreichen Webhook-Roundtrip prüfen
- [ ] Auszahlung (Payout) auf die hinterlegte aitema-IBAN bestätigen
- [ ] Sandbox-Keys aus Prod sind vollständig ersetzt (kein `sk_test_`/`whsec_`-Test-Rest)

---

## Rollback

Falls etwas bricht: in `.env.production` die **Sandbox-Werte** (`sk_test_…`,
Test-`whsec_…`, Test-Price-ID) wiederherstellen und erneut deployen. Der Code ist
modus-agnostisch — der Umstieg ist reine Konfiguration, kein Code-Change.
