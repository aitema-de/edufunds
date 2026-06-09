# EduFunds — Review-Liste (Kolja)

**Laufdatum:** 2026-06-08 09:31 UTC  
**Einträge:** 7 `review_risky`-Bugs + 5 AI-Qualitäts-Issues

Diese Liste muss Kolja persönlich durchgehen, da alle Einträge entweder Bezahllogik, KI-Pipeline/Prompts, Auth oder Datenmodell betreffen und nicht risikoarm automatisch behoben werden können.

---

## 1. Bezahl-Endpoints — fehlende Paywall-Gates (KRITISCH)

### PAY-FINANZPLAN-LEGITIMIZE-NO-PAYGATE
**Was:** `app/api/wizard/finanzplan/legitimize/route.ts` prüft `plan != null` und `plan.legitimiertAm`, aber weder `session.paidToken` noch `session.status === 'paid'`. Eine unbezahlte, aber „complete" Session kann ihren Finanzplan über die API legitimieren.  
**Warum nicht automatisch behoben:** Unklar, ob Legitimierung überhaupt Zahlung voraussetzen soll (oder erst der Download). Das Download-Gate in `antrag/download/[token]/page.tsx` ist korrekt; ob dasselbe Gate hier gelten soll, muss bewusst entschieden werden. Berührt Bezahllogik direkt → `review_risky`.  
**Empfohlener nächster Schritt:** Architekturentscheidung treffen: Soll `legitimize` nur nach Zahlung erreichbar sein? Wenn ja, analogen Guard wie im Download-Gate ergänzen (`session.paidToken` vorhanden + verifiziert). NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 beachten (im Dev kein echter Token).

### PAY-FINANZPLAN-AUTOFIX-NO-PAYGATE
**Was:** Identisches Muster wie oben, in `app/api/wizard/finanzplan/autofix/route.ts`. Route lädt Session, ändert Finanzplan und ruft `updateWizardSession` ohne jeglichen Zahlungscheck.  
**Warum nicht automatisch behoben:** Gleiches Muster wie legitimize — bewusste Entscheidung über den Gate-Umfang nötig. Berührt Bezahllogik.  
**Empfohlener nächster Schritt:** Zusammen mit legitimize entscheiden; beide Routen in einem Commit absichern.

---

## 2. Zahlungs-Robustheit — fehlende graceful Error-Responses

### PAY-STRIPE-500
**Was:** `POST /api/stripe/checkout` wirft HTTP 500 mit Stack-Trace, wenn `STRIPE_SECRET_KEY` fehlt. Trifft Dev (Key fehlt) und Prod bei Fehlkonfiguration. Sollte HTTP 503 mit sauberem JSON-Fehler liefern.  
**Warum nicht automatisch behoben:** Änderung berührt Stripe-Checkout-Logik direkt. Kalibrierung: `review_risky` — explizit kein autofix für Bezahllogik.  
**Empfohlener nächster Schritt:** In `app/api/stripe/checkout/route.ts` früh prüfen (`if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({error:'Stripe nicht konfiguriert'},{status:503})`). Nach Fix manuell gegen Dev und gegen Staging (mit Mock) verifizieren.

### PAY-PAYPAL-500
**Was:** Identisches Muster in `app/api/paypal/route.ts`: HTTP 500 statt graceful 4xx/503 wenn PayPal-Credentials fehlen.  
**Warum nicht automatisch behoben:** Bezahllogik → `review_risky`.  
**Empfohlener nächster Schritt:** Analog zu Stripe: früher Credentials-Check + 503-Response. Beide Fixes können im selben Commit landen.

---

## 3. KI-Pipeline — Datenverlust und Schleifenfehler

### WIZARD-ANSWER-LOST-ON-500
**Was:** Wenn DeepSeek abgeschnittenes JSON liefert, wirft `lib/wizard/llm.ts:129` eine Exception. Diese propagiert durch `extractFacts`/`nextStep` in `answer/route.ts`, und der `catch`-Block gibt HTTP 500 zurück — BEVOR `updateWizardSession` (:113) aufgerufen wird. Da `appendMessage` eine reine Funktion ohne DB-Write ist, geht die Nutzerantwort verloren.  
**Warum nicht automatisch behoben:** Fix berührt `lib/wizard/**` (AI-Pipeline) und das Truncation-/Retry-Verhalten in `llm.ts:129`. Zwei mögliche Strategien — Antwort vor LLM-Call persistieren, oder JSON-Parsing toleranter machen (Partial-JSON-Recovery) — sind beide nicht eindeutig risikoarm. Kalibrierung: `review_risky`.  
**Empfohlener nächster Schritt:** Entscheidung: (a) `updateWizardSession` mit der rohen Antwort VOR dem LLM-Call ausführen (einfacher, aber Antwort ist im Session-State ohne verarbeitete Facts); oder (b) Retry-Logik in `llm.ts` + Partial-JSON-Recovery. Option (a) ist robuster für den Datenverlust-Fall. Run 3 (aktion-mensch, Answer 9) als Testfall nutzen.

### WIZARD-INTERVIEWER-LOOP
**Was:** `extractFacts` markiert ein Feld trotz ausführlicher Nutzerantwort weiter als fehlend. `nextStep` stellt dieselbe Frage bis zu 5-mal, bis `maxQuestions(12)` erreicht ist.  
- Run 2: „Bewegungsziel der AG" als Q8–Q12 identisch (trotz Motorik-Screening-Antwort in Q8)  
- Run 3: „Szene aus dem Schulalltag" als Q3–Q6+Q10 (trotz mehrfacher klarer Antworten)  

**Warum nicht automatisch behoben:** Ursache im Facts-Extractor-Prompt und der Interviewer-Logik (`lib/wizard/**`, AI-Prompts). Fix erfordert Prompt-Tuning und ggf. einen Anti-Wiederholungs-Guard. Kalibrierung: `review_risky`.  
**Empfohlener nächster Schritt:** (1) Anti-Wiederholungs-Guard in `interviewer.ts`: falls dieselbe Frage schon n-mal gestellt wurde, Feld als „ausreichend beantwortet" markieren oder überspringen; (2) Facts-Extractor-Prompt überarbeiten, um ausführliche qualitative Antworten besser zu extrahieren. Beides zusammen angehen.

### WIZARD-EIGENANTEIL-FLAG-MISSING
**Was:** Die Pipeline setzt `eigenanteil=true` nie auf Finanzplan-Posten, auch wenn der Nutzer Eigenanteile explizit nennt. Die Information landet nur im Hinweise-String. `validateFinanzplan` berechnet deshalb 0%/falschen Eigenanteil → `legitimize` gibt 422.  
- Run 1 (bmbf-digitalpakt-2): 25% Eigenanteil genannt, alle 5 Posten `eigenanteil=false` → 0%  
- Run 3 (aktion-mensch): 10% Eigenanteil, nur 1.800 statt 2.200 EUR markiert, Gesamtbetrag 24.200 statt 22.000  

**Warum nicht automatisch behoben:** Ursache ist die AI-Pipeline-Generierung in `lib/wizard/pipeline.ts` — Prompt/Schema des Finanzplans setzt das Flag nicht. Fix berührt Pipeline-Prompt/-Schema und ist nicht eindeutig risikoarm. Kalibrierung: `review_risky`.  
**Empfohlener nächster Schritt:** Pipeline-Prompt anpassen, damit Eigenanteil-Posten explizit mit `eigenanteil: true` erzeugt werden. Alternativ: Post-Processing in `generate/route.ts`, das Posten anhand der `facts.eigenanteil_eur`-Angabe nachträglich markiert. Letzteres ist robuster und weniger prompt-sensitiv.

---

## 4. KI-Qualitäts-Issues (aus Wizard-Runs-Auswertung)

**Runs bewertet:** 3 (bmbf-digitalpakt-2, niedersachsen-sport, aktion-mensch)  
**Gesamtbewertung:** Antragstext 4/5, Finanzplan 2/5, Passung 4/5

### QA-01 — Finanzplan-Inkonsistenz (Run 1, DigitalPakt)
**Was:** Prosa-Finanzplan listet 24.000+15.000+8.000+4.000 = 51.000 EUR, behauptet aber „Gesamtbedarf 55.000 EUR". Fortbildungsposten (4.000 EUR, `kategorie:'personal'`) wird in der Prosa weggelassen. System hat `hasConsistencyIssues=true` geflasgt, aber NICHT korrigiert.  
**Empfehlung:** Pipeline-Validierung erweitern: wenn `hasConsistencyIssues=true`, entweder automatisch korrigieren oder Generation zurückweisen und neu versuchen, bevor der Output an den Nutzer geliefert wird.

### QA-02 — Halluzinierte Zahl (Run 1)
**Was:** Fortbildungsposten 4.000 EUR ist erfunden — Begründung im Finanzplan gibt zu: „auf Basis üblicher Tagessätze von ca. 2.000 EUR pro Tag geschätzt". Eine nicht vom Nutzer genannte Honorarpauschale erscheint als fester Budgetposten.  
**Empfehlung:** Facts-Extractor und Pipeline anweisen, keine Beträge zu schätzen oder zu erfinden; nur Zahlen aus Nutzerantworten verwenden. Nicht genannte Posten mit Platzhalter `[BETRAG BITTE ANGEBEN]` ausgeben.

### QA-03 — Finanzplan-Mathematik inkonsistent (Run 3, Aktion Mensch)
**Was:** Prosa nennt Aufschlüsselung 8.000+5.000+4.000+3.000+2.000 = 22.000 EUR (= Gesamtbudget), behauptet dann zusätzlich 2.200 EUR Eigenanteil „oben drauf". Beantragte Förderung soll 19.800 EUR sein. Strukturierter Finanzplan vom System selbst als „betrag-unstimmig" geflasgt.  
**Empfehlung:** Identisch zu QA-01 — `hasConsistencyIssues=true` muss zu einem automatischen Korrekturversuch führen, nicht nur zu einem stillen Flag im Output.

### QA-04 — Wiederholungen/Floskeln (Run 1)
**Was:** Dasselbe Detail (3 Multiplikatoren zu DigiComp-Trainern, 2 Fortbildungstage) wird nahezu wortgleich in 4 von 6 Abschnitten wiederholt. Mindert die Abschickbarkeit.  
**Empfehlung:** Critique-Phase um Duplikatscheck ergänzen. Bereits wiederholte Formulierungen in Folgeabschnitten kürzen oder variieren.

### QA-05 — Resthalluzination nach Critique (Run 2)
**Was:** Critique flaggte „standardisierter Motorik-Test (Kooperationspartner: Gesundheitsamt)" als Beleglücke (Nutzer nannte nur „Motorik-Test", kein Gesundheitsamt). Leichte Neigung zu ausschmückenden, nicht belegten Details.  
**Empfehlung:** Critique-Prompt verschärfen: alle Kooperationspartner-Nennungen explizit gegen `facts.kooperationspartner` abgleichen. Nicht belegte Partner müssen entfernt, nicht nur geflasgt werden.
