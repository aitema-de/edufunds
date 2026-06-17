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

## ✅ Vorbedingungen (Stand 2026-06-17): erfüllt

Der frühere Blocker („Wizard nicht in Production") ist **erledigt**. Auf `app.edufunds.org`
am 2026-06-17 verifiziert:

- Wizard + Checkout **live**: `/api/wizard/checkout` und `/api/stripe/webhook` antworten `405`
  (Route vorhanden, erwartet POST) — nicht mehr `404`.
- `.env.production` enthält bereits: `STRIPE_SECRET_KEY` (**noch `sk_test_…`**),
  `STRIPE_WEBHOOK_SECRET` (Test), `STRIPE_PRICE_EINZELANTRAG` (Test), `STRIPE_TOS_CONSENT`,
  sowie `LEXOFFICE_API_KEY`, `MISTRAL_API_KEY`, `CRON_SECRET` (alle gesetzt).
- **Migration 009** (`invoice_*`-Spalten auf `ki_antraege`) ist auf der Prod-DB **bereits angewandt**.

**Damit reduziert sich der Cutover auf reine Konfiguration:**
1. Im Dashboard (Live-Modus): Produkt/Preis prüfen, ToS-URL, Webhook-Endpoint, API-Keys (Schritte 1–3).
2. Drei Stripe-Werte test→live umstellen — **per `scripts/set-stripe-live-env.sh`** (Schritt 4).
3. **Bypass aus dem Build:** `deploy-production.sh` baut seit 2026-06-17 standardmäßig **OHNE**
   Paywall-Bypass (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=0`). Ein Schutz bricht den Deploy ab, falls der
   Key noch `sk_test` ist. Pilot-Builds nur noch explizit mit `--with-paywall-bypass` (Schritt 5).
4. Deploy + echter Testkauf (Schritte 6–7).

> Code-Änderung ist **nicht** nötig — der Umstieg ist reine Konfiguration.

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

## Schritt 1b — AGB-URL im Dashboard hinterlegen (Pflicht!)

Der Checkout fordert eine AGB-Zustimmung (`consent_collection.terms_of_service`).
Stripe lehnt die Session ab, wenn keine ToS-URL hinterlegt ist:

- [ ] Dashboard (Live-Modus): **Einstellungen → Checkout und Payment Links →
      Nutzungsbedingungen** → `https://app.edufunds.org/agb` eintragen.
- [ ] (Empfohlen) Datenschutz-URL ebenfalls: `https://app.edufunds.org/datenschutz`.
- ⚠️ Gilt auch für die **Sandbox** — sonst bricht schon die Generalprobe.

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

## Schritt 4 — Production-ENV umstellen (per Script)

Lokal im Repo ausführen — das Script liest die Werte versteckt ein und überträgt sie
nur via ssh-stdin (kein Eintrag in History/argv/Chat), legt ein Backup an und ist idempotent:

```bash
./scripts/set-stripe-live-env.sh
```

Es fragt nacheinander ab und setzt in `.env.production`:
- [ ] `STRIPE_SECRET_KEY=sk_live_…`            ← Live Secret Key (Schritt 3)
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_…`          ← **Live**-Webhook-Secret (Schritt 2)
- [ ] `STRIPE_PRICE_EINZELANTRAG=price_…`      ← **Live**-Price-ID (Schritt 1, Default vorbelegt)

> `NEXT_PUBLIC_PAYWALL_DEV_MOCK` muss in der Env **nicht** gesetzt werden — der Bypass wird
> ohnehin zur Build-Zeit gesteuert (siehe Schritt 5), nicht über die Runtime-Env.
> Staging/Dev bleiben unverändert auf **Test**-Keys + Test-Webhook-Secret.

## Schritt 5 — Deployen (ohne Bypass = echte Zahlung)

`deploy-production.sh` baut standardmäßig **ohne** Paywall-Bypass. Ein eingebauter Schutz
**bricht ab**, falls `STRIPE_SECRET_KEY` noch `sk_test` ist — also unbedingt erst Schritt 4.

- [ ] `./scripts/deploy-production.sh`  (deployt `main`, zweifache Bestätigung, Bypass aus)

> Pilot-/UAT-Build mit kostenlosem Freischalten geht nur noch explizit:
> `./scripts/deploy-production.sh --with-paywall-bypass` — **nicht** für den Go-Live.

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
