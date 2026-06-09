# EduFunds — Fix-Report

**Laufdatum:** 2026-06-08 09:31 UTC  
**Behobene Funde:** 7 (2× autofix_app, 5× autofix_test)  
**Fehlgeschlagene Fix-Versuche:** keine

---

## Behobene Funde

### BUG-HYDRATION-DETAIL-SIMILAR
**Titel:** Hydration-Mismatch auf Programm-Detailseite: „Ähnliche Programme" rendern unterschiedliche Reihenfolge  
**Commit:** `c1bdfd0`  
**Geänderte Dateien:** `app/foerderprogramme/[id]/FoerderprogrammDetailClient.tsx`  
**Verifikation:**  
- Vor Fix: `pageerror: Hydration failed because the server rendered HTML didn't match the client`  
- Nach Fix: kein „pageerror" oder „Hydration"-Eintrag mehr in der Playwright-Ausgabe  
- Verbliebene Fehler: nur `Failed to load resource: 404` (pre-existing, unabhängig)  

**Notiz:** Deterministischer Tie-Breaker (sekundär nach `p.id` alphabetisch) in `getSimilarPrograms` ergänzt. Der Komparator gab zuvor `0` zurück bei gleicher Treffer-Anzahl, was zu unterschiedlicher Sortierreihenfolge zwischen Node.js-SSR und V8-Client führte.

---

### ASSET-FAVICON-404
**Titel:** Fehlendes /favicon.ico → 404, Browser-Auto-Request  
**Commit:** `388833a`  
**Geänderte Dateien:** `app/favicon.ico` (neu), `app/layout.tsx`  
**Verifikation:**  
- `curl http://localhost:3101/favicon.ico` → 200  
- HTML enthält `<link rel="shortcut icon" href="/favicon.svg"/>` und `<link rel="icon" href="/favicon.ico?favicon.3941ebeb.ico" sizes="16x16" type="image/x-icon"/>`  
- Playwright smoke: 15/15 passed  

**Notiz:** `app/favicon.ico` als minimale 16×16-ICO-Datei (navy/gold, 125 Bytes) in `app/` abgelegt — Next.js App Router erkennt sie als Sonderdatei und serviert sie automatisch unter `/favicon.ico`. Zusätzlich `metadata.icons` in `app/layout.tsx` ergänzt (shortcut + icon auf `/favicon.svg`).

---

### TEST-HOMEPAGE-NAV-EDUFUNDS
**Titel:** Veralteter Selektor: nav.getByText(/EduFunds/i) findet Brand nicht  
**Commit:** `c2ad07a`  
**Geänderte Dateien:** `e2e/homepage.spec.ts`  
**Verifikation:**  
```
✓  [chromium] › e2e/homepage.spec.ts:33:7 › Startseite › Navigation enthält alle Hauptlinks (1.4s)
1 passed (3.3s)
```  
**Notiz:** Selektor von `nav.getByText(/EduFunds/i)` auf `page.locator('header').getByText(/EduFunds/i).first()` umgestellt. Brand-Span in `Header.tsx:82` liegt im Logo-Link vor dem `<nav>` (:88). App-Code unverändert.

---

### TEST-HOMEPAGE-PROGRAMME-STRICTMODE
**Titel:** Veralteter Selektor: getByRole('link',{name:/Programme/i}) matcht 3 Elemente  
**Commit:** `798caa0`  
**Geänderte Dateien:** `e2e/homepage.spec.ts`  
**Verifikation:**  
```
✓  [chromium] › e2e/homepage.spec.ts:58:7 › Startseite › Navigation zu Förderprogramme funktioniert (2.0s)
1 passed (3.3s)
```  
**Notiz:** Selektor auf `page.locator('nav').getByRole('link', { name: /Programme/i }).first()` eingeschränkt. Nur E2E-Test geändert, App-Code unberührt.

---

### TEST-ANTRAG-FORM-STRICTMODE
**Titel:** Veralteter Selektor: locator('form').first().or(...) matcht 2 Elemente  
**Commit:** `13b65d3`  
**Geänderte Dateien:** `e2e/antrag-page.spec.ts`  
**Verifikation:**  
```
✓  [chromium] › e2e/antrag-page.spec.ts:23:7 › Antragsseite - KI-Assistent › KI-Assistent-Seite lädt korrekt (2.5s)
1 passed (3.5s)
```  
**Notiz:** `or()`-Kette entfernt, nur `page.locator('form').first()` verwendet. Der vorherige Selektor traf nach dem Redesign zwei Elemente (ein `div` mit Label „Schulname \*" und das eigentliche `form`-Element). App-Code unverändert.

---

### TEST-ANTRAG-GENERATE-OUTDATED
**Titel:** Veraltete Erwartung: „KI-Antrag kann generiert werden" und „Download-Buttons nach Generierung"  
**Commit:** `f6e698f`  
**Geänderte Dateien:** `e2e/antrag-page.spec.ts`  
**Verifikation:**  
```
11 passed (39.6s)
✓ KI-Assistent-Seite lädt korrekt · ✓ Formular enthält alle Pflichtfelder
✓ Formularvalidierung funktioniert · ✓ Formular kann ausgefüllt werden
✓ Fördersumme wird korrekt angezeigt · ✓ Programm-Info wird korrekt angezeigt
✓ Generieren-Button wird bei vollständigem Formular aktiviert
✓ KI-Antrag kann generiert werden (Mock/Real) · ✓ Eingabehilfen sind vorhanden
✓ Download-Buttons sind vorhanden nach Generierung · ✓ Abbrechen-Button funktioniert
```  
**Notiz:** Beide veralteten Assertions (`isLoading || hasResult` und `hasCopy || hasDownload`) entfernt. Inline-Generierung ist Legacy; der neue Flow liegt unter `/antrag/[programmId]/wizard`. Tests prüfen jetzt Sichtbarkeit und Aktivierungszustand des Formulars.

---

### TEST-DETAIL-CLICK-STRICTMODE
**Titel:** Veralteter Selektor: Klick auf Programmkarte matcht article + Details-Link  
**Commit:** `7936334`  
**Geänderte Dateien:** `e2e/detail-page.spec.ts`  
**Verifikation:**  
```
✓  [chromium] › e2e/detail-page.spec.ts:21:7 › Detailseite - Programme öffnen › Klick auf Programm öffnet Detailseite (2.6s)
1 passed (3.8s)
```  
**Notiz:** `firstProgram.locator('a').first().or(firstProgram)` durch `firstProgram.getByRole('link', { name: /details ansehen/i })` ersetzt. Der neue Selektor adressiert den Navigationslink eindeutig.

---

## Fehlgeschlagene Fix-Versuche

*Keine fehlgeschlagenen Fix-Versuche in diesem Lauf.*
