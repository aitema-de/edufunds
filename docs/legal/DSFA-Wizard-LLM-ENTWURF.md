# DSFA-Entwurf: KI-Wizard / LLM-Verarbeitung (EduFunds)

> ⚠️ **ENTWURF — kein Rechtsrat.** Vor Go-Live durch Fachanwalt IT-Recht/Datenschutz prüfen lassen.
> Stand: 2026-06-12 · Verantwortlicher: aitema GmbH (i. G.), Prenzlauer Allee 229, 10405 Berlin · GF Kolja Schumann

Datenschutz-Folgenabschätzung nach Art. 35 DSGVO für die KI-gestützte Generierung von Förderanträgen (Wizard). Begründung der DSFA-Prüfung: Einsatz einer neuen Technologie (LLM) mit potenziell sensiblem Kontext (Schule) und Drittland-Bezug.

## 1. Verarbeitungstätigkeit
Nutzer (Organisation: Förderverein/Schule/Schulträger — siehe B2B-Entscheidung) beschreiben ein Schul-Vorhaben; der Wizard matcht Förderprogramme, führt ein adaptives Interview und generiert Antragstext + Finanzplan. Die Inhalte werden dafür an ein externes LLM (Provider, siehe §4) gesendet.

## 2. Datenkategorien
**Designseitig erhoben (an das LLM):** institutionsbezogene Daten — Schulname/-typ, Bundesland, Schülerzahl (Aggregat), Projektidee, Ziele, Budget. **Das sind grundsätzlich KEINE personenbezogenen Daten** (Schule = Institution; Aggregatangaben über Gruppen sind nicht auf eine identifizierbare natürliche Person bezogen).
**Risikofläche:** Freitextfelder (Anliegen, Interview-Antworten, „Besonderheiten"), in die ein Nutzer abweichend personenbezogene Daten eintragen könnte (Namen von Personen/Schülern, Kontaktdaten).
**In EU-DB (Hetzner DE), NICHT an das LLM:** E-Mail, Klarname (Kontakt/Rechnung), IP-Adresse, User-Agent, Rechnungsdaten (`org_orders`).

## 3. Rechtsgrundlage
Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung — Erstellung des bestellten Antrags). Keine Einwilligung für die Kernverarbeitung erforderlich; transparente Information genügt (Datenschutzerklärung).

## 4. Empfänger / Drittland
LLM-Provider verarbeitet außerhalb des EU-DB-Hosts. **Aktueller Default: DeepSeek (api.deepseek.com, China)** → Drittlandtransfer ohne Angemessenheitsbeschluss; mehrere EU-Aufsichtsbehörden haben DeepSeek 2025/26 beanstandet/gesperrt. **Offene Provider-Entscheidung** (Spuren: DeepSeek-China + Minimierung / EU-gehostetes DeepSeek bei Nebius / Mistral Small 4 EU) — siehe Memory `project-edufunds-legal-compliance-go-live`. Weitere Auftragsverarbeiter (EU/DPF): Hetzner (DE), Stripe (US/DPF), Resend (US/DPF), Cloudflare (US/DPF).

## 5. Risiken
- **R1 — unbeabsichtigter Transfer personenbezogener Freitext-Daten in ein Drittland** (China) ohne tragfähigen Übermittlungsmechanismus. Schadenshöhe mittel, Eintritt ohne Maßnahmen realistisch (Freitext).
- **R2 — sensible Kontextangaben** (Migrationshintergrund/Förderbedarf) als Gruppen-Aggregat. Kein Personenbezug, solange nicht individualisiert → niedrig.
- **R3 — unbegrenzte Speicherung** (kein Löschkonzept) → Art. 5 Abs. 1 lit. e. Separat zu beheben (Löschjob).

## 6. Technische & organisatorische Maßnahmen (Stand der Umsetzung)
- **M1 — Datenminimierung am Provider-Engpass (UMGESETZT):** `lib/wizard/pii-scrub.ts` entfernt hochpräzise Identifikatoren (E-Mail, Telefon/Fax, IBAN) aus jedem `user`-Prompt, bevor er das Haus verlässt (`lib/wizard/llm.ts`, greift in allen Pipeline-Stufen, provider-unabhängig). Konservativ (keine Namens-Heuristik, keine Fehl-Schwärzung legitimer Zahlen/URLs).
- **M2 — UI-Hinweis (UMGESETZT):** Wizard-Start weist sichtbar darauf hin, keine personenbezogenen Daten einzugeben (`components/Wizard/AnliegenForm.tsx`).
- **M3 — Prompt-/Pipeline-seitige Halluzinations-/Fakt-Verifikation (BESTAND):** verhindert, dass erfundene oder nicht-gedeckte personenbezogene Behauptungen in den Antragstext gelangen.
- **M4 — Datenhaltung in EU (BESTAND):** personenbezogene Stammdaten bleiben in der Hetzner-DB (DE); an das LLM geht nur der minimierte Inhalt.
- **M5 — offen:** Löschkonzept/Cron (R3); AVV mit Provider inkl. Subprozessor-Liste; ggf. Provider-Wechsel auf EU-Host (entschärft R1 strukturell).

## 7. Bewertung
Mit M1–M4 ist die **Restfläche für R1 auf Identifikator-Ebene technisch geschlossen** und auf Namens-/Schülerebene durch UI-Hinweis + Fakt-Verifikation organisatorisch adressiert. Solange der Provider in China sitzt, bleibt R1 auf Rest-Freitext (z. B. ein im Fließtext genannter Name, den keine Heuristik sicher erkennt) **nicht vollständig** ausgeschlossen → die strukturell saubere Lösung ist der **Wechsel auf einen EU-gehosteten Provider** (M5). Empfehlung: M1–M4 gelten als Mindeststandard für ALLE Provider-Spuren; bei Verbleib auf DeepSeek-China sind sie die tragende Schutzschicht und die Provider-Entscheidung ist mit erhöhter Priorität zu treffen.

## 8. Offene Punkte für die anwaltliche Prüfung
- Bewertung, ob mit M1–M4 + DeepSeek-China ein vertretbares Restrisiko besteht oder ob ein EU-Provider zwingend ist.
- Formulierung des Drittland-Hinweises in der Datenschutzerklärung.
- AVV-Vorlage für Org-Kunden inkl. Subprozessor-Liste.
