# Monetarisierungs-Architektur — Vereine + Schulen

> Stand 2026-06-08. Grundlagen-Entscheidung, bevor das Schulträger-Kontingent (B) gebaut wird.
> Verwandt: [STRIPE_SETUP.md](../../STRIPE_SETUP.md), [LEGACY-CHECKOUT-REFERENCE.md](./LEGACY-CHECKOUT-REFERENCE.md).

## Problem

Der heutige Flow ist **ein einziger** Pfad: *Stichpunkte + Förderprogramme finden = gratis → Antrag
schreiben lassen = kostenpflichtig → vor dem Download zahlen (29,90 € Karte)*. Dieser Flow passt zum
**Verein**, aber **nicht zur Schule**. Grund: die zwei Kundentypen unterscheiden sich auf zwei Achsen.

| Achse | Verein | Schule / Schulträger |
|---|---|---|
| Autor vs. Zahler | quasi identisch (Vorstand schreibt + darf Vereinskonto belasten) | **getrennt** — Lehrkraft schreibt, Leitung/Verwaltung zahlt |
| Zahlungskultur | Karte/sofort ok | **Rechnung/Haushalt/Beschaffung**, vorab auf Leitungsebene |
| Wann fällt die Geld-Entscheidung? | am Ende, beim Download | **vorher**, zentral, oft jährlich |
| Struktur | eine Einheit | **zentraler Zahler, viele dezentrale Autoren** (mehrere Schulen, ggf. mehrere Bundesländer) |

Zusätzliche Realität (beide Segmente): Ein Antrag entsteht **über mehrere Sitzungen/Geräte** → Pausieren
& Wiederaufnehmen muss robust sein.

## Leitprinzip: „Authoring" von „Entitlement" trennen

Statt den Bezahlflow umzubauen, werden zwei heute verschmolzene Dinge getrennt:

- **Authoring-Engine** (Wizard → fertiger Antrag) — für alle Segmente gleich, bis zum Freischalt-Punkt
  kostenlos nutzbar.
- **Entitlement** — die Frage „Ist dieser Antrag freigeschaltet?" — beantwortbar durch **mehrere
  austauschbare Freischalt-Quellen**.

Die Download-Schranke (`paid_token` auf `ki_antraege`, gesetzt von `markSessionPaid()`) **bleibt technisch
an Ort und Stelle**. Was sich ändert: **was** die Schranke erfüllt und **wer wann zahlt**. Das ist der
architektonische Hebel — eine **Entitlement-Schicht** über `markSessionPaid()`.

### Freischalt-Quellen

| Quelle | Wer zahlt / wann | Segment |
|---|---|---|
| Einzelzahlung (Karte) | Autor, am Download | Verein, Solo — **auch Schule erlaubt** |
| Kontingent (Vorkasse, N Credits) | Org **vorab**, Autor löst nur ein | Schulträger, anwendende Vereine |
| Rechnungskauf eines Pakets | Org per Rechnung/SEPA | Schule/Schulträger (öffentliche Hand) |
| *(später)* Abo / Rahmenvertrag | Org jährlich | große Träger |

## Entscheidungen (2026-06-08)

- **D-1 — Lehrkraft sieht keine eigene Bezahlschranke.** Im Schul-Segment wird die Geld-Entscheidung nach
  vorne (Leitungsebene) gezogen; die Lehrkraft erlebt „dieser Antrag ist über deinen Träger gedeckt" und
  schaltet per **Code-Einlösung / Org-Budget** frei — nie eine eigene Zahlung. Der **Verein behält die
  Karten-Schranke** am Download.
- **D-2 — Schule: Rechnung/Kontingent UND Einzel-Karte sind beide möglich.** Verwaltungsabläufe in Schulen
  sind uns nicht abschließend bekannt → maximale Flexibilität, die Entitlement-Schicht erlaubt mehrere
  Quellen parallel.
- **D-3 — Kein Gratis-Probe-Antrag (vorerst).** Watch-Item; falls Schulträger-Vertrieb einen
  Qualitätsnachweis vor Budgetfreigabe braucht, neu bewerten.
- **D-4 — Credit wird beim Freischalten verbraucht, nicht beim Start.** Nur fertige Anträge ziehen einen
  Credit; abgebrochene Entwürfe kosten nichts (fair fürs Org-Budget).
- **D-5 — Identität passwortlos (Magic-Link) als EIN Primitiv** für (a) Autor-Wiedereinstieg über Geräte
  und (b) leichtes Käufer-Login der Leitung. Kein Passwort-Auth-System.
- **D-6 — Separater EduFunds-Stripe-Account** (siehe STRIPE_SETUP.md), Standard-Payment ohne Connect.

## Zwei Reisen (Soll)

### Verein (Autor ≈ Zahler) — unverändert
Stichpunkte + Programme finden (frei) → Antrag schreiben (mehrsitzungsfähig) → am Download **29,90 € per
Karte** → `paid_token`. Bereits gebaut & verifiziert.

### Schule (Autor ≠ Zahler) — Geld-Entscheidung nach vorne
1. **Leitung/Verwaltung** entscheidet vorab: kauft **Kontingent** („N Anträge", per Rechnung **oder**
   Karte) → erhält Codes bzw. leichtes Verwaltungs-Login.
2. **Lehrkräfte** schreiben über mehrere Sitzungen/Geräte (→ Magic-Link-Resume), sehen **keine
   Bezahlschranke**, sondern Freischalten = **Code einlösen / aus Org-Budget ziehen** (atomar
   dekrementiert beim Freischalten, D-4).
3. **Leitung** sieht Verbrauch (pro Schule) und schaltet nach.

## Datenmodell (Skizze)

- **Entitlement-Helper** um `markSessionPaid()`: eine Funktion „schalte Session X frei, Quelle = {card |
  code | invoice | org}" → setzt `paid_token`, protokolliert `tier`/Quelle. Heutiger Karten-Webhook wird
  ein Spezialfall.
- **`credit_codes`** (neu): `code` (unique), `credits_total`, `credits_used` (DEFAULT 0), `purchaser_email`,
  `org_name` (optional), `stripe_session_id`/Rechnungsref, `created_at`, optional `expires_at`. Atomare
  Einlösung: `UPDATE credit_codes SET credits_used = credits_used + 1 WHERE code = $1 AND credits_used <
  credits_total RETURNING …` (kein Überziehen, deckt sich mit Optimistic-Lock-Praxis).
- **Identität (Magic-Link, später):** `auth_identities` (E-Mail + Token), Verknüpfung Antrag↔E-Mail für
  cross-device „Meine Anträge"; Org-Rolle für das Käufer-Dashboard.

## Baureihenfolge (deckt beide Kunden, keine Sackgasse)

1. **B1 — Entitlement-Schicht + Kontingent-Codes. ✅ ERLEDIGT 2026-06-08.** `markSessionPaid`/
   `tryMarkSessionPaid` um Quelle (card|code) erweitert; `credit_codes` + `credit_code_redemptions`
   (Migration 004); `POST /api/wizard/redeem-code` + „Kontingent-Code einlösen" im PaywallGate;
   `scripts/create-credit-code.ts` für manuelle/rechnungsbasierte Ausgabe. Verifiziert: Unit 9/9,
   API-Suite 15/15, echter HTTP-E2E (atomarer Verbrauch, Idempotenz, Refund). Commits
   454cbc6 / cfbcc85 / 98ce3cf. → behebt Autor-≠-Zahler.
2. **B2 — Rechnungskauf** von Paketen (öffentliche Hand); SEPA/Rechnungs-Logik sauber neu (Keim in
   LEGACY-CHECKOUT-REFERENCE.md), erzeugt `credit_codes` per Rechnung.
3. **B3 — Self-Serve-Kontingent-Kauf per Karte** (Stripe-Checkout `metadata.mode=org_quota` → Webhook
   erzeugt Code automatisch + Mail).
4. **B4 — Magic-Link-Autor-Identität** → robustes Resume über Geräte, „Meine Anträge" E-Mail-gebunden.
5. **B5 — Käufer-Dashboard** (gleicher Magic-Link) → Verbrauch/Verwaltung, vollendet den Hybrid.

## Produktentscheidungen für B2/B3 — GELOCKT 2026-06-09

- **D-7 — Modell = Prepaid-Pack, KEIN Abo.** Org kauft einmalig N Credits (one-time Stripe-Charge bzw.
  Rechnung), kein Auto-Renew, keine Subscription-/Reset-Logik. Matcht die gebaute `credit_codes`-Infra 1:1.
  → `/preise`-Wording muss von „Abo /Jahr" auf „Kontingent" entschärft werden (Folge-To-do, siehe unten).
- **D-8 — Paketstaffel (Minimal-Fix, monoton steigender Mengenrabatt):**
  | Paket | Preis (inkl. MwSt) | €/Antrag | Rabatt vs. Einzel 29,90 € |
  |---|---|---|---|
  | Einzel | 29,90 € | 29,90 € | 0 % |
  | 5 Anträge | **139,90 €** | 27,98 € | 6,4 % |
  | 10 Anträge | **249,90 €** | 24,99 € | 16,4 % |
  | 20 Anträge | **459,90 €** | 22,99 € | 23,1 % |
  Geprüft: 2×10er (499,80 €) ist teurer als ein 20er → 20er ist klar bester Stückpreis. Als **eine
  konfigurierbare Preistabelle** halten (eine Quelle), damit `/preise`-Seite + Checkout + Rechnung nie driften.
- **D-9 — Code-Granularität = ein Sammel-Code je Kauf.** Träger bekommt EINEN Code mit N Credits (1 Zeile in
  `credit_codes`), verteilt ihn an alle Lehrkräfte. Attribution über `credit_code_redemptions` (Schule/E-Mail
  bei Einlösung abfragen → Nutzungsreport für die Leitung). Kein Pro-Schule-/Einmal-Code-Splitting (vorerst).
- **D-10 — Ablauf = 12 Monate ab Kauf.** `expires_at = Kaufdatum + 12 Mon.` (Feld existiert in `credit_codes`,
  atomare Einlösung prüft es bereits). Erinnerungsmail vor Ablauf = späteres Watch-Item.

### Folge-To-dos aus den Entscheidungen
- `/preise`-Seite (`app/preise/page.tsx`): „Jahresabo"/„Schulträger-Abo /Jahr" → „Kontingent" umbenennen,
  Mindestlaufzeit-/Kündigungs-FAQ (impliziert Abo) anpassen, Preise auf D-8 ziehen.
- Eine zentrale Preistabelle (Pack-Definitionen) als Single Source für `/preise` + B2 + B3.

## Noch offen (B4/B5 / später)

- **Attribution-Tiefe:** Pflicht- vs. optionale Schul-/E-Mail-Abfrage bei Einlösung (UI in `redeem-code`).
- **Magic-Link-Zeitpunkt:** ab wann E-Mail erfassen (Start optional vs. erst beim Freischalten/Resume) — B4.
