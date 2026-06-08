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

1. **B1 — Entitlement-Schicht + Kontingent-Codes.** `markSessionPaid` um Quelle erweitern; `credit_codes`-
   Tabelle; Einlöse-Endpoint + UI im Wizard („Kontingent-Code einlösen" neben „29,90 € zahlen"). Codes
   anfangs admin/manuell (per Rechnung) ausgegeben. → behebt Autor-≠-Zahler sofort.
2. **B2 — Rechnungskauf** von Paketen (öffentliche Hand); SEPA/Rechnungs-Logik sauber neu (Keim in
   LEGACY-CHECKOUT-REFERENCE.md), erzeugt `credit_codes` per Rechnung.
3. **B3 — Self-Serve-Kontingent-Kauf per Karte** (Stripe-Checkout `metadata.mode=org_quota` → Webhook
   erzeugt Code automatisch + Mail).
4. **B4 — Magic-Link-Autor-Identität** → robustes Resume über Geräte, „Meine Anträge" E-Mail-gebunden.
5. **B5 — Käufer-Dashboard** (gleicher Magic-Link) → Verbrauch/Verwaltung, vollendet den Hybrid.

## Offen (vor/in B1 zu klären)

- **Paketgrößen + Preise** (z. B. 5 / 20 / 50 Anträge; Preis je Paket; einmalig vs. jährlich; Ablauf?).
  Bisherige `/preise`-Tarife als Anhalt: Jahresabo 5 Anträge / Schulträger 20 Anträge.
- **Code-Granularität:** ein Sammel-Code je Kontingent vs. pro-Schule-Codes vs. Einmal-Codes (Attribution
  vs. Einfachheit).
- **Attribution bei Einlösung:** Schule/E-Mail abfragen → einfacher Nutzungsreport für die Leitung?
- **Magic-Link-Zeitpunkt:** ab wann E-Mail erfassen (Start optional vs. erst beim Freischalten/Resume).
