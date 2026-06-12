# Auftragsverarbeitungsvertrag (AVV) — Vorlage für Org-Kunden

> **ENTWURF — vor Verwendung durch Fachanwalt IT-Recht/Datenschutz prüfen und
> finalisieren lassen.** Diese Vorlage ist kein Rechtsrat. Sie dient als
> Verhandlungs-/Bereitstellungsgrundlage gegenüber Organisations-Kunden
> (Schulen, Fördervereine, Schulträger).

Vertrag zur Auftragsverarbeitung gemäß **Art. 28 DSGVO**

zwischen

**dem Kunden** (Schule / Förderverein / Schulträger / sonstige Einrichtung) —
nachfolgend **„Verantwortlicher"** —

und

**AITEMA GmbH**, Prenzlauer Allee 229, 10405 Berlin, HRB 283978 B
(Amtsgericht Charlottenburg), Betreiberin der Plattform „EduFunds" —
nachfolgend **„Auftragsverarbeiter"**.

---

## § 1 Gegenstand und Dauer
(1) Gegenstand ist die Verarbeitung personenbezogener Daten durch den
Auftragsverarbeiter im Auftrag des Verantwortlichen im Rahmen der Nutzung der
EduFunds-Plattform (KI-gestützte Erstellung von Förderanträgen).
(2) Die Dauer entspricht der Laufzeit des Hauptvertrags (Nutzungsvertrag).

## § 2 Art, Umfang und Zweck der Verarbeitung
(1) **Art der Verarbeitung:** Erheben, Speichern, Verändern, Auslesen,
Verwenden, Übermitteln an Subprozessoren, Löschen.
(2) **Zweck:** Bereitstellung der Funktionen zur Antragserstellung (Matching,
adaptives Interview, Text- und Finanzplangenerierung, Export), Zahlungs- und
Rechnungsabwicklung sowie Kommunikation mit dem Verantwortlichen.
(3) Die Verarbeitung findet ausschließlich innerhalb der EU/des EWR statt,
soweit nicht in der Subprozessor-Liste (Anlage 1) abweichend geregelt und
abgesichert.

## § 3 Kategorien betroffener Personen und Daten
(1) **Betroffene Personen:** Kontakt-/Konto-Personen der Einrichtung (z. B.
Lehrkräfte, Vereinsvorstand), ggf. in Freitexten genannte Personen.
(2) **Datenkategorien:** Kontakt-/Stammdaten (Name, dienstliche E-Mail,
Organisation, Rechnungsadresse, ggf. USt-ID), Inhalts-/Antragsdaten (vom
Verantwortlichen eingegebene Projekt-/Schulangaben), technische Daten (IP,
User-Agent — befristet, siehe Löschkonzept).
(3) **Datenminimierung:** Die Plattform weist aktiv darauf hin, keine
personenbezogenen Einzeldaten einzugeben, und filtert hochpräzise
Identifikatoren (E-Mail/Telefon/IBAN) vor der KI-Verarbeitung automatisch heraus
(`lib/wizard/pii-scrub.ts`). Besondere Kategorien (Art. 9) sind nicht vorgesehen.

## § 4 Pflichten des Auftragsverarbeiters (Art. 28 Abs. 3)
Der Auftragsverarbeiter
a) verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen;
b) verpflichtet die zur Verarbeitung befugten Personen auf Vertraulichkeit;
c) trifft die erforderlichen technischen und organisatorischen Maßnahmen nach
Art. 32 (Anlage 2);
d) nimmt weitere Subprozessoren nur nach Maßgabe von § 5 in Anspruch;
e) unterstützt den Verantwortlichen bei Betroffenenanfragen (Art. 12–23);
f) unterstützt bei den Pflichten aus Art. 32–36 (Sicherheit, Meldepflichten, DSFA);
g) löscht oder gibt die Daten nach Wahl des Verantwortlichen nach Vertragsende
zurück, soweit keine gesetzliche Aufbewahrungspflicht besteht (z. B. Rechnungen);
h) stellt die zum Nachweis erforderlichen Informationen bereit und ermöglicht
Überprüfungen/Audits.

## § 5 Subprozessoren
(1) Der Verantwortliche stimmt der Beauftragung der in **Anlage 1** genannten
Subprozessoren zu (allgemeine schriftliche Genehmigung, Art. 28 Abs. 2).
(2) Der Auftragsverarbeiter informiert über beabsichtigte Änderungen
(Hinzufügung/Ersetzung) vorab; der Verantwortliche kann aus wichtigem
datenschutzrechtlichem Grund widersprechen.
(3) Mit jedem Subprozessor bestehen Art.-28-konforme Verträge; bei
Drittlandbezug werden geeignete Garantien (Angemessenheitsbeschluss/DPF oder
EU-Standardvertragsklauseln) sichergestellt.

## § 6 Drittlandtransfer
Soweit Subprozessoren außerhalb der EU/des EWR verarbeiten (Anlage 1), erfolgt
dies nur auf Grundlage eines Angemessenheitsbeschlusses (inkl. EU-US Data
Privacy Framework) oder geeigneter Garantien nach Art. 46 (insb. SCC).

## § 7 Betroffenenrechte, Meldepflichten
Der Auftragsverarbeiter unterstützt den Verantwortlichen unverzüglich bei
Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit sowie
bei Verletzungen des Schutzes personenbezogener Daten (Art. 33/34).

## § 8 Löschung und Rückgabe
Nach Abschluss der Leistung löscht der Auftragsverarbeiter die Daten gemäß
seinem Löschkonzept (`docs/legal/LOESCHKONZEPT.md`), sofern keine gesetzliche
Aufbewahrungspflicht entgegensteht.

## § 9 Schlussbestimmungen
Es gilt deutsches Recht. Änderungen bedürfen der Textform. Bei Widersprüchen
gehen die Regelungen dieses AVV den Regelungen des Hauptvertrags in Bezug auf
den Datenschutz vor.

---

## Anlage 1 — Subprozessoren (Stand: Juni 2026)

| Subprozessor | Sitz | Zweck | Datenstandort | Transfergrundlage |
|---|---|---|---|---|
| **Hetzner Online GmbH** | Deutschland | Hosting, Datenbank | DE | — (EU) |
| **Mistral AI SAS** | Frankreich | KI-Textgenerierung (LLM) | EU | — (EU); kein Training, Datenminimierung |
| **Stripe Payments Europe, Ltd.** | Irland (EU) / Stripe, Inc. (USA) | Zahlungsabwicklung | EU/USA | Angemessenheit/DPF bzw. SCC |
| **Haufe-Lexware GmbH & Co. KG (lexoffice)** | Deutschland | Rechnungserstellung | DE | — (EU) |
| **Resend (Plus Five Five, Inc.)** | USA | E-Mail-Versand (transaktional) | USA | DPF bzw. SCC |
| **Cloudflare, Inc.** | USA | CDN / Proxy / Sicherheit | USA/EU | DPF bzw. SCC |

> ⚠️ **Vor Finalisierung verifizieren (Kolja/Anwalt):** exakte Vertragspartner-
> Gesellschaft je Dienst, aktuelle DPF-Zertifizierung (Stripe/Cloudflare/Resend),
> jeweils gültige AVV/DPA-Fundstelle, und ob Cloudflare tatsächlich
> personenbezogene Daten verarbeitet (Proxy-Konfiguration).

## Anlage 2 — Technische und organisatorische Maßnahmen (Art. 32)
Kurzfassung — vollständige TOM-Beschreibung separat pflegen:
- Transportverschlüsselung (TLS) für alle Verbindungen; Datenbank in DE.
- Zugriffskontrolle (rollenbasiert, Admin-Auth), Mandanten-/Session-Trennung.
- Datenminimierung vor KI-Verarbeitung (PII-Scrubbing), kein KI-Training.
- Befristete Speicherung technischer Daten (Löschkonzept, Cron).
- Backups, Logging ohne unnötige Personenbezüge.

---

**Hinweis zum öffentlichen Schuldatenschutz:** Öffentliche Schulen unterliegen
dem jeweiligen Landes-/Schuldatenschutzrecht. Vor Vertragsschluss ist zu prüfen,
ob die Einrichtung den hier genannten Subprozessoren (insb. mit Drittlandbezug)
zustimmen darf. Für rein institutionsbezogene Nutzung ohne personenbezogene
Eingaben ist der Anwendungsbereich des AVV ggf. eng.
