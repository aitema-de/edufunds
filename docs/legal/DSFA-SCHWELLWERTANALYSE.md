# Schwellwertanalyse zur DSFA-Pflicht + Risikodokumentation (EduFunds, KI-Antragsassistent)

> ⚠️ **ENTWURF — kein Rechtsrat.** Vor Go-Live durch Fachanwalt IT-Recht/Datenschutz prüfen lassen.
> **Stand: 13.07.2026** · Verantwortliche: aitema GmbH, Prenzlauer Allee 229, 10405 Berlin ·
> Amtsgericht Charlottenburg, HRB 283978 B · Geschäftsführer: Kolja Schumann
>
> **Ersetzt** den früheren „DSFA-Wizard-LLM-ENTWURF" (Stand 12.06.2026). Dieser beschrieb einen
> überholten Sachverhalt (LLM-Provider DeepSeek/China, Cloudflare als Auftragsverarbeiter, „kein
> Löschkonzept", Rechtsform „i. G.") und ist deshalb zurückgezogen.

## 1. Zweck dieses Dokuments

Zu prüfen ist, ob für die KI-gestützte Erstellung von Förderantrags-Entwürfen eine
Datenschutz-Folgenabschätzung nach **Art. 35 DSGVO** durchzuführen ist. Kommt die Prüfung zu
einem Negativ-Ergebnis, ist **dieses Dokument selbst** der nach Art. 5 Abs. 2 DSGVO geschuldete
Nachweis, dass die Frage geprüft wurde. Zusätzlich dokumentiert Abschnitt 5 die erkannten
Risiken und die dagegen umgesetzten Maßnahmen.

## 2. Die Verarbeitung

Eine Einrichtung (Förderverein, Schule oder Schulträger) beschreibt ein Schulvorhaben. Die
Plattform sucht passende Förderprogramme, führt ein Interview und erzeugt daraus einen
**Antragsentwurf** samt Finanzplan. Für die Textgenerierung werden die Eingaben an ein
Sprachmodell übermittelt.

**An das Sprachmodell übermittelt** werden bestimmungsgemäß **institutionsbezogene** Angaben:
Schulname und -typ, Bundesland, Schülerzahl (Aggregat), Projektidee, Ziele, Budget. Das sind
grundsätzlich **keine personenbezogenen Daten** — eine Schule ist eine Institution, und
Aggregatangaben über Gruppen beziehen sich nicht auf eine identifizierbare natürliche Person.

**In der Datenbank (Hetzner, Deutschland), nicht an das Sprachmodell:** E-Mail-Adresse,
Name der Kontaktperson, Rechnungsdaten, IP-Adresse, Browserkennung.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).

**Empfänger:** Mistral AI SAS, Paris (Sprachmodell — Verarbeitung auf Rechenzentren in
**Schweden und Norwegen**, also im EWR; kein Drittlandtransfer), Hetzner (DE), Stripe (Zahlung),
Haufe-Lexware (Rechnung), Resend (E-Mail-Versand). Vollständige Liste: `/avv`.

## 3. Schwellwertanalyse nach Art. 35

### 3.1 Die Regelbeispiele des Art. 35 Abs. 3

| Tatbestand | Einschlägig? | Begründung |
|---|---|---|
| lit. a — systematische und umfassende **Bewertung persönlicher Aspekte** (Profiling) mit Rechtswirkung oder ähnlich erheblicher Beeinträchtigung | **nein** | Es wird niemand bewertet. Bewertet wird ein *Projektvorhaben* gegen Förderkriterien. Über natürliche Personen wird weder eine Entscheidung getroffen noch ein Profil gebildet. |
| lit. b — umfangreiche Verarbeitung besonderer Kategorien (Art. 9) oder von Daten über Straftaten | **nein** | Besondere Kategorien werden nicht erhoben. Kontextangaben (z. B. Förderbedarf) fallen allenfalls als **Gruppen-Aggregat** an, ohne Individualisierung. |
| lit. c — systematische umfangreiche **Überwachung öffentlich zugänglicher Bereiche** | **nein** | Findet nicht statt. |

### 3.2 Weitere Kriterien (Art. 35 Abs. 1: „voraussichtlich hohes Risiko")

Gegen ein hohes Risiko sprechen: die Daten sind **institutionsbezogen**, nicht personenbezogen;
es findet **keine automatisierte Entscheidung** über Personen statt (Art. 22); die Verarbeitung
ist **nicht umfangreich** (ein Antragsentwurf je Vorgang, kein Massen-Screening); die
Betroffenen sind **nicht in einer Abhängigkeitslage** gegenüber uns; die Verarbeitung erfolgt
**im EWR**.

Für eine genauere Betrachtung spricht: Einsatz einer **neuen Technologie** (Sprachmodell) und
der **Bildungskontext** (potenziell schutzbedürftige Betroffene, falls Schülerdaten in
Freitexte gelangen).

### 3.3 Ergebnis

**Eine DSFA nach Art. 35 DSGVO ist nach hiesiger Einschätzung nicht erforderlich.** Keiner der
Regelfälle ist einschlägig; ein „voraussichtlich hohes Risiko" ist bei ausschließlich
institutionsbezogener Verarbeitung ohne Personenbewertung nicht erkennbar.

> 🔴 **Anwaltlich zu bestätigen:** Ob die „Muss-Liste" der Datenschutzkonferenz (DSK) einen
> Tatbestand enthält, der KI-Einsatz im Bildungskontext unabhängig davon erfasst. Der genaue
> Wortlaut ist hier nicht sicher bekannt und darf nicht geraten werden.
>
> **Hinweis:** Ist eine **öffentliche Schule** ihrerseits Verantwortliche, kann *sie* zu einer
> DSFA verpflichtet sein. Wir schulden ihr dann Unterstützung (Art. 28 Abs. 3 lit. f) — die
> Abschnitte 2 und 5 dieses Dokuments sind darauf ausgelegt, dafür verwendbar zu sein.

## 4. Erkannte Risiken

- **R1 — Personenbezogene Daten in Freitextfeldern.** Ein Nutzer könnte entgegen der Aufforderung
  Namen oder Kontaktdaten in ein Freitextfeld schreiben, die dann an das Sprachmodell gingen.
  *Eintrittswahrscheinlichkeit:* ohne Maßnahmen realistisch. *Schwere:* mittel — die Verarbeitung
  bliebe im EWR, es entstünde also kein Drittlandproblem, wohl aber eine nicht erforderliche
  Verarbeitung.
- **R2 — Speicherung beim Auftragsverarbeiter.** Mistral speichert Ein- und Ausgaben derzeit
  **30 Tage** zur Missbrauchserkennung. *Schwere:* gering (EWR, Auftragsverarbeitung, kein
  Training), aber **nicht null**, solange sie besteht.
- **R3 — Fehlkonfiguration des Providers.** Eine falsch gesetzte Umgebungsvariable könnte einen
  Nicht-EWR-Anbieter aktivieren und damit die vertragliche EWR-Zusage unbemerkt unwahr machen.

## 5. Maßnahmen (Stand der Umsetzung)

| | Maßnahme | Status |
|---|---|---|
| M1 | **Automatische Bereinigung am Provider-Engpass:** `lib/wizard/pii-scrub.ts` entfernt Identifikatoren (E-Mail, Telefon/Fax, IBAN) aus **jedem** an das Modell gehenden Prompt — provider-unabhängig, in allen Pipeline-Stufen. Konservativ ausgelegt (keine Namensheuristik, um legitime Angaben nicht zu zerstören). | ✅ umgesetzt |
| M2 | **Sichtbarer Hinweis** im Assistenten, keine personenbezogenen Daten einzugeben (`components/Wizard/AnliegenForm.tsx`). | ✅ umgesetzt |
| M3 | **Faktenprüfung in der Pipeline** — verhindert, dass nicht gedeckte Behauptungen in den Antragstext gelangen. | ✅ Bestand |
| M4 | **Datenhaltung in Deutschland** (Hetzner); an das Modell geht ausschließlich der bereinigte Inhalt. | ✅ Bestand |
| M5 | **Löschkonzept mit automatisiertem Cron** — Fristen dokumentiert (`LOESCHKONZEPT.md`), im Code implementiert (`lib/retention.ts`), täglich laufend. | ✅ umgesetzt (13.07.2026) |
| M6 | **EWR-Provider** (Mistral, Paris; Rechenzentren Schweden/Norwegen) statt eines Drittlandanbieters — beseitigt R1 in seiner ursprünglich schwerwiegenden Form (Drittlandtransfer) **strukturell**. | ✅ umgesetzt |
| M7 | **Technischer Riegel gegen Fehlkonfiguration:** In Produktion wird ausschließlich der EWR-Provider akzeptiert; jede andere Einstellung führt zum Startfehler (`lib/wizard/llm.ts`). | ✅ umgesetzt (13.07.2026) |
| M8 | **Zero Data Retention** beim Sprachmodell-Anbieter beantragt — beseitigt R2 vollständig. | 🔶 beantragt, Freigabe offen |
| M9 | **Auftragsverarbeitungsvertrag** mit Subprozessorliste öffentlich verfügbar (`/avv`); DPA des Sprachmodell-Anbieters archiviert (`docs/legal/mistral-nachweise/`). | ✅ umgesetzt |

## 6. Bewertung

Das ursprünglich tragende Risiko — ein Drittlandtransfer nach China — **existiert nicht mehr**:
Die Verarbeitung findet im EWR statt und ist technisch dagegen abgesichert, versehentlich
verlagert zu werden (M7). Für Freitexte ist die Identifikator-Ebene technisch geschlossen (M1)
und die Namensebene organisatorisch adressiert (M2, M3). Die verbleibende 30-Tage-Speicherung
beim Auftragsverarbeiter (R2) ist transparent gemacht (Datenschutzerklärung Abschnitt 5) und
soll mit der ZDR-Freigabe entfallen (M8).

**Restrisiko: gering.** Es rechtfertigt nach hiesiger Einschätzung keine DSFA-Pflicht — die
Maßnahmen sind gleichwohl umgesetzt, weil sie unabhängig davon dem Grundsatz der
Datenminimierung (Art. 5 Abs. 1 lit. c, Art. 25) dienen.

## 7. Offene Punkte für die anwaltliche Prüfung

1. Bestätigung des Ergebnisses aus 3.3 (DSFA nicht erforderlich) — insbesondere im Hinblick auf
   die DSK-„Muss-Liste" und den KI-Einsatz im Bildungskontext.
2. Ist die 30-Tage-Speicherung beim Sprachmodell-Anbieter eine weisungsgebundene Verarbeitung
   im Rahmen des Art.-28-Verhältnisses — oder verarbeitet er insoweit zu **eigenen** Zwecken
   (mit eigener Verantwortlichkeit und eigener Transparenzpflicht)?
3. Muss der Go-Live bis zur ZDR-Freigabe warten, oder genügt die transparente Angabe?
