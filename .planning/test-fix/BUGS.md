# EduFunds — Bug-Report

**Laufdatum:** 2026-06-08 09:31 UTC
**Gesamt:** 16 Funde · Behoben: 7 · Zur Review: 7 · Noise: 1 · Fehlend/Ignoriert: 1

---

## Zusammenfassung nach Klassifikation

| Klassifikation   | Anzahl |
|------------------|--------|
| `review_risky`   | 7      |
| `autofix_app`    | 2      |
| `autofix_test`   | 6      |
| `noise`          | 1      |

---

## HIGH — Payments

### PAY-STRIPE-500 · `review_risky` · **Zur Review**
**Titel:** POST /api/stripe/checkout wirft 500 statt graceful 4xx wenn STRIPE_SECRET_KEY fehlt  
**Bereich:** payments  
**Dateien:** `app/api/stripe/checkout/route.ts`  
**Repro:**  
```
curl -X POST http://localhost:3101/api/stripe/checkout
-> HTTP 500, {"error":"Stripe-Integration fehlgeschlagen","details":"Error: STRIPE_SECRET_KEY fehlt"}
```
Im Dev fehlt der Key; auch in Prod ohne Key = ungehandhabter Throw statt sauberer Fehlerantwort. Sollte einen HTTP 503 mit sauberem JSON-Fehler liefern.

---

### PAY-PAYPAL-500 · `review_risky` · **Zur Review**
**Titel:** POST /api/paypal wirft 500 statt graceful 4xx wenn PayPal-Credentials fehlen  
**Bereich:** payments  
**Dateien:** `app/api/paypal/route.ts`  
**Repro:**  
```
curl -X POST http://localhost:3101/api/paypal
-> HTTP 500, {"error":"Interner Serverfehler","details":"Error: PayPal Credentials fehlen"}
```
Identisches Muster wie Stripe. Bezahllogik → nicht automatisch fixen.

---

## HIGH — Wizard

### WIZARD-ANSWER-LOST-ON-500 · `review_risky` · **Zur Review**
**Titel:** Nutzerantwort geht verloren bei DeepSeek-JSON-Truncation: appendMessage rein, updateWizardSession nach throw nie erreicht  
**Bereich:** wizard  
**Dateien:** `app/api/wizard/answer/route.ts`, `lib/wizard/llm.ts`  
**Repro:**  
POST /api/wizard/answer: `appendMessage` (route.ts:59, reine Funktion ohne DB-Write) → `extractFacts` (:69) / `nextStep` (:80). Liefert DeepSeek abgeschnittenes JSON, wirft `lib/wizard/llm.ts:129` „DeepSeek lieferte kein valides JSON". Exception propagiert in den catch (:127) → HTTP 500, `updateWizardSession` (:113) wird nie erreicht. Nutzerantwort ist nicht persistiert, muss erneut gesendet werden.  
**Belegt:** Run 3 (aktion-mensch), Answer 9.

---

### WIZARD-INTERVIEWER-LOOP · `review_risky` · **Zur Review**
**Titel:** Interviewer-Schleife: identische Frage bis zu 5×, weil Facts-Extractor das Faktum nicht extrahiert  
**Bereich:** wizard  
**Dateien:** `lib/wizard/facts-extractor.ts`, `lib/wizard/interviewer.ts`, `app/api/wizard/answer/route.ts`  
**Repro:**  
Frage-Antwort-Schleife in POST /api/wizard/answer: `extractFacts` markiert ein Feld trotz ausführlicher Nutzerantwort weiter als fehlend, `nextStep` stellt dieselbe Frage erneut bis `maxQuestions(12)`.  
- Run 2 (niedersachsen-sport): „Bewegungsziel der AG" identisch als Q8–Q12.  
- Run 3 (aktion-mensch): „Szene aus dem Schulalltag" als Q3–Q6+Q10.

---

### WIZARD-EIGENANTEIL-FLAG-MISSING · `review_risky` · **Zur Review**
**Titel:** Pipeline setzt eigenanteil=true nie auf Finanzplan-Posten → validateFinanzplan blockiert Freigabe  
**Bereich:** wizard  
**Dateien:** `lib/wizard/pipeline.ts`, `app/api/wizard/generate/route.ts`, `lib/wizard/finanzplan-validator.ts`  
**Repro:**  
POST /api/wizard/generate: Pipeline erzeugt Posten mit `eigenanteil=false`, auch wenn Nutzer Eigenanteil explizit nannte. Info landet nur im Hinweise-String. `validateFinanzplan` rechnet 0%/falschen Eigenanteil → `legitimize` gibt 422 „Eigenanteil X% liegt unter dem geforderten Minimum".  
- Run 1 (bmbf-digitalpakt-2): 25% genannt, alle 5 Posten `eigenanteil=false` → 0%.  
- Run 3 (aktion-mensch): 10% genannt, nur 1.800 statt 2.200 EUR markiert, Gesamtbetrag 24.200 statt 22.000.

---

## MEDIUM — Payments

### PAY-FINANZPLAN-LEGITIMIZE-NO-PAYGATE · `review_risky` · **Zur Review**
**Titel:** finanzplan/legitimize prüft Zahlungsstatus nicht (kein session.paidToken/status-Check)  
**Bereich:** payments  
**Dateien:** `app/api/wizard/finanzplan/legitimize/route.ts`  
**Repro:**  
Route prüft nur `plan != null` (:22) und `plan.legitimiertAm` (:25), aber nicht `session.paidToken` bzw. `session.status === 'paid'`. Eine „complete", unbezahlte Session kann ihren Finanzplan über die API legitimieren. Download-Gate in `antrag/download/[token]/page.tsx` ist korrekt implementiert; der Freigabe-Endpunkt fehlt das analoge Gate. Aktuell blockiert nur zufällig der Eigenanteil-422.

---

### PAY-FINANZPLAN-AUTOFIX-NO-PAYGATE · `review_risky` · **Zur Review**
**Titel:** finanzplan/autofix prüft Zahlungsstatus nicht (gleiches fehlendes Bezahl-Gate wie legitimize)  
**Bereich:** payments  
**Dateien:** `app/api/wizard/finanzplan/autofix/route.ts`  
**Repro:**  
Route lädt Session, validiert/ändert Finanzplan, ruft `updateWizardSession`, ohne `session.paidToken` oder `session.status` zu prüfen. Analog zu legitimize kann eine unbezahlte Session ihren Finanzplan über die API verändern/autofixen.

---

## HIGH — Pages

### BUG-HYDRATION-DETAIL-SIMILAR · `autofix_app` · **BEHOBEN** (commit `c1bdfd0`)
**Titel:** Hydration-Mismatch auf Programm-Detailseite: „Ähnliche Programme" rendern unterschiedliche Reihenfolge Server vs. Client  
**Bereich:** pages  
**Dateien:** `app/foerderprogramme/[id]/FoerderprogrammDetailClient.tsx`  
**Repro:** Browser auf `/foerderprogramme/niedersachsen-sport`: `pageerror: Hydration failed … server rendered HTML didn't match the client`. Mismatch im Abschnitt „Ähnliche Programme" — nicht-deterministischer Tie-Break bei gleicher Treffer-Zahl in `getSimilarPrograms`.

---

## LOW — Pages

### ASSET-FAVICON-404 · `autofix_app` · **BEHOBEN** (commit `388833a`)
**Titel:** Fehlendes /favicon.ico → 404, Browser-Auto-Request  
**Bereich:** pages  
**Dateien:** `app/layout.tsx`, `public/favicon.svg`  
**Repro:** `curl http://localhost:3101/favicon.ico` → 404. `favicon.svg` existiert als 200, aber kein `app/favicon.ico` und kein `<link rel=icon>` in `app/layout.tsx`. Browser fordert automatisch `/favicon.ico` → Konsolen-Error.

---

## LOW — Quality (Tests)

### TEST-HOMEPAGE-NAV-EDUFUNDS · `autofix_test` · **BEHOBEN** (commit `c2ad07a`)
**Titel:** Veralteter Selektor: nav.getByText(/EduFunds/i) findet Brand nicht  
**Bereich:** quality  
**Dateien:** `e2e/homepage.spec.ts`  
**Repro:** `locator('nav').getByText(/EduFunds/i)` Timeout/not found. Brand-Span liegt in Header.tsx (:82) vor dem `<nav>` (:88).

---

### TEST-HOMEPAGE-PROGRAMME-STRICTMODE · `autofix_test` · **BEHOBEN** (commit `798caa0`)
**Titel:** Veralteter Selektor: getByRole('link',{name:/Programme/i}) matcht 3 Elemente (Strict-Mode-Violation)  
**Bereich:** quality  
**Dateien:** `e2e/homepage.spec.ts`  
**Repro:** Strict-mode violation, 3 Treffer (Nav-Link „Förderprogramme 130+", CTA-Button, weiterer Link) nach Redesign.

---

### TEST-ANTRAG-FORM-STRICTMODE · `autofix_test` · **BEHOBEN** (commit `13b65d3`)
**Titel:** Veralteter Selektor: locator('form').first().or(...) matcht 2 Elemente auf Antrag/KI-Assistent-Seite  
**Bereich:** quality  
**Dateien:** `e2e/antrag-page.spec.ts`  
**Repro:** Strict-mode violation (div „Schulname \*" + `<form>`) in Test „KI-Assistent-Seite lädt korrekt".

---

### TEST-ANTRAG-GENERATE-OUTDATED · `autofix_test` · **BEHOBEN** (commit `f6e698f`)
**Titel:** Veraltete Erwartung: „KI-Antrag kann generiert werden" und „Download-Buttons nach Generierung" (isLoading||hasResult=false)  
**Severity:** medium  
**Bereich:** quality  
**Dateien:** `e2e/antrag-page.spec.ts`  
**Repro:** Tests erwarten Loading- oder Ergebnis-/Download-Zustand direkt auf der alten Antragsseite. App wurde auf Wizard-Flow (`/antrag/[programmId]/wizard`, Paywall-Gate) umgebaut → Erwartung trifft nicht zu.

---

### TEST-DETAIL-CLICK-STRICTMODE · `autofix_test` · **BEHOBEN** (commit `7936334`)
**Titel:** Veralteter Selektor: Klick auf Programmkarte matcht article + Details-Link (Strict-Mode-Violation)  
**Bereich:** quality  
**Dateien:** `e2e/detail-page.spec.ts`  
**Repro:** Strict-mode violation, `.glass-card, article, [data-testid=program-card]` → 2 Treffer (article + „Details ansehen"-Link) nach Redesign.

---

## LOW — Server (Noise)

### NOISE-DEV-LOG-PAYMENT-THROWS · `noise` · **kein eigenständiger Bug**
**Titel:** 4 Dev-Log-Fehlerzeilen während Sweep stammen aus den Stripe/PayPal-500ern  
**Bereich:** server  
**Dateien:** `.planning/test-fix/sweep-results.json`  
**Erläuterung:** Die Log-Ausgaben „Stripe Error: STRIPE_SECRET_KEY fehlt" und „PayPal Error: PayPal Credentials fehlen" sind exakt die Symptome der bereits unter `pay-stripe-500` / `pay-paypal-500` erfassten Throws. Kein eigenständiger Bug — Doppelung → noise.
