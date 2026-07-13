# EduFunds — AGB-Neufassung (ENTWURF, Stand 13.07.2026)

> **Status: ENTWURF — nicht in Kraft.** Erstellt von Claude, **kein Rechtsrat**.
> Vor dem Go-Live durch Fachanwalt (IT-Recht/Datenschutz) prüfen und freigeben.
> Umgesetzt in `app/agb/page.tsx` auf Branch `feature/agb-neufassung` —
> **bewusst nicht nach `staging` gemergt**, damit der Entwurf nicht ungeprüft mit
> dem Cutover auf Produktion gelangt.

## Warum eine Neufassung nötig ist

Die geltenden AGB (Stand Februar 2026) sind generische SaaS-/Beratungs-AGB der aitema GmbH.
Sie beschreiben **nicht das Produkt, das EduFunds verkauft** — und widersprechen an einer
Stelle direkt der Rechnung, die der Kunde bekommt:

| Geltende AGB | Tatsächliches Produkt (Code, `/preise`, Lexware-Rechnung) | Risiko |
|---|---|---|
| § 5: Preise **zzgl.** gesetzlicher USt | 29,90 € **inkl.** 19 % USt (`taxType: gross`, `VAT_RATE = 0.19`) | Widerspruch AGB ↔ Preisauszeichnung ↔ Rechnung (PAngV; überraschende Klausel § 305c BGB) |
| § 6: SaaS, **12 Monate Mindestlaufzeit**, automatische Verlängerung | Einmalkauf, ausdrücklich „kein Abo"; Kontingente = Prepaid ohne Verlängerung | AGB versprechen ein Abo, das es nicht gibt |
| § 2: Vertragsschluss durch Unterschrift / Auftragsbestätigung / Kontoaktivierung | Klick im Stripe-Checkout | tatsächlicher Vertragsweg ist nicht geregelt |
| § 3: SaaS-Bereitstellung, **98,5 % Verfügbarkeit**, Beratung nach Aufwand | KI-Antragsgenerator, kein Beratungsvertrag | Zusage, die niemand verkauft |
| § 9: Gewährleistung „Software entspricht Leistungsbeschreibung" | KI-Ergebnis mit Fehlerrisiko | **kein KI-Passus, keine Erfolgsgarantie-Klausel** → Haftungslücke |

Beibehalten wird das Tragende der Altfassung: **Unternehmer-only** (§ 1 Abs. 2 — deckt die
B2B-Entscheidung, schließt Verbraucher/Widerrufsrecht aus) und **kein KI-Training mit
Kundendaten**.

## Was der Entwurf neu regelt

1. **§ 4 Preise:** 29,90 € **inkl. 19 % USt**; Kontingente als Vorkasse-Pakete, 12 Monate
   gültig, keine automatische Verlängerung. Beseitigt den Widerspruch zur Rechnung.
2. **§ 3 Vertragsschluss:** über den Checkout (Stripe), Vertrag mit Zahlungsbestätigung,
   Bestätigung per E-Mail (§ 312i Abs. 1 Nr. 3 BGB).
3. **§ 6 KI-Ergebnis — der zentrale neue Passus:** Der Antrag ist ein **maschinell erzeugter
   Entwurf**, kann Fehler enthalten, muss vor Einreichung geprüft werden; **keine Gewähr für
   eine Bewilligung**; keine Rechts- oder Steuerberatung (RDG). Das schließt die Haftungslücke.
4. **§ 7 Zugriffsdauer 12 Monate** — bringt die AGB mit dem Löschkonzept in Deckung
   (`anonymize_expired_paid_antraege` anonymisiert bezahlte Anträge nach 12 Monaten). Bisher
   löschte das System nach einer Frist, die vertraglich nirgends vereinbart war.
5. **§ 9 Datenschutz/AVV:** verweist auf die neue Seite `/avv` (AVV + Subprozessorliste).

## Offene Punkte für den Anwalt

- **Verfügbarkeit:** Der Entwurf verspricht bewusst **keine** Verfügbarkeitsquote (bei einem
  Einmalkauf unüblich). Falls Kontingent-Kunden eine zugesichert bekommen sollen → ergänzen.
- **Gewährleistungsfrist** (Entwurf: 12 Monate, § 10) und **Haftungshöchstgrenze** (Entwurf:
  gezahlte Vergütung, § 11) bestätigen.
- **§ 6:** Reicht die Formulierung als Haftungsausschluss für KI-Fehler gegenüber
  Unternehmern? Grenze zur Rechtsdienstleistung (RDG) mitprüfen.
- **§ 1 Abs. 2:** Die Verbraucher-Ausschlussklausel wirkt nur, wenn der Checkout die
  Organisationseigenschaft tatsächlich abfragt — das tut er (Pflichtfeld Organisation +
  Bestellart). Bitte als Gesamtbild würdigen.
- Preisänderungen bei Kontingenten (Bestandsschutz?), Ausschluss der Abtretung, AGB-Änderungen.
- **§ 9 Abs. 3 (EU/EWR):** Mistral betreibt die genutzte API auf Azure (Schweden, **Norwegen**)
  und CoreWeave (EWR) — Norwegen ist EWR, nicht EU. Der Entwurf sagt daher „Europäischer
  Wirtschaftsraum". Belege: `docs/legal/mistral-nachweise/` (Abruf 13.07.2026).

---

# Allgemeine Geschäftsbedingungen der aitema GmbH für EduFunds

**Stand: [Datum der Freigabe] — ENTWURF**

Diese AGB gelten für Verträge zwischen der aitema GmbH und Unternehmern im Sinne des § 14 BGB.

## § 1 Geltungsbereich

(1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der aitema GmbH,
Prenzlauer Allee 229, 10405 Berlin (nachfolgend „Anbieter"), und dem Kunden über die Nutzung
der Plattform EduFunds.

(2) Diese AGB gelten **ausschließlich für Unternehmer im Sinne des § 14 BGB**, juristische
Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Als Unternehmer
gelten auch eingetragene Vereine (insbesondere Fördervereine), Verbände, Stiftungen und
sonstige Organisationen, unabhängig von ihrer Gemeinnützigkeit. Ein Vertragsschluss mit
Verbrauchern im Sinne des § 13 BGB findet nicht statt; der Kunde bestätigt beim Kauf, dass er
im Namen einer Einrichtung handelt.

(3) Abweichende Bedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, der
Anbieter stimmt ihrer Geltung ausdrücklich in Textform zu.

## § 2 Leistungsgegenstand

(1) Der Anbieter stellt über EduFunds eine Software zur Verfügung, mit der Kunden
Förderprogramme recherchieren und **Entwürfe von Förderanträgen mit Unterstützung
künstlicher Intelligenz erstellen** können.

(2) Die Recherche in der Förderdatenbank ist kostenfrei nutzbar. Kostenpflichtig ist die
Erstellung und Freischaltung eines KI-generierten Antragsentwurfs.

(3) Der Anbieter reicht **keine Anträge ein** und tritt nicht gegenüber Fördergebern auf. Die
Einreichung, die Kommunikation mit dem Fördergeber und die Einhaltung von Fristen liegen
allein beim Kunden.

(4) Der Anbieter schuldet **keine Rechts-, Steuer- oder Förderberatung** im Sinne des
Rechtsdienstleistungsgesetzes.

## § 3 Vertragsschluss

(1) Die Darstellung der Leistungen auf der Plattform ist kein bindendes Angebot, sondern eine
Aufforderung zur Bestellung.

(2) Der Kunde gibt ein verbindliches Angebot ab, indem er im Bestellvorgang die
kostenpflichtige Leistung auswählt, seine Angaben vervollständigt und den Bezahlvorgang
über den Zahlungsdienstleister abschließt.

(3) Der Vertrag kommt mit der Bestätigung der Zahlung zustande. Der Anbieter bestätigt den
Vertragsschluss unverzüglich per E-Mail; die Rechnung wird ebenfalls per E-Mail übermittelt.

## § 4 Preise und Zahlung

(1) Der Preis für einen Einzelantrag beträgt **29,90 € inklusive der gesetzlichen
Umsatzsteuer von derzeit 19 %**. Die auf der Plattform ausgewiesenen Preise sind
Bruttopreise; ein Preis versteht sich stets einschließlich Umsatzsteuer.

(2) Kontingente sind **Vorkasse-Pakete**: Der Kunde erwirbt eine bestimmte Anzahl von
Anträgen im Voraus. Es besteht **kein Abonnement**; es erfolgt **keine automatische
Verlängerung** und keine wiederkehrende Zahlung.

(3) Erworbene Kontingente sind **ab Kauf 12 Monate gültig**. Nach Ablauf verfallen nicht
genutzte Anträge, sofern nichts anderes vereinbart ist.

(4) Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Es gelten ergänzend dessen
Bedingungen für die Zahlungsabwicklung.

## § 5 Leistungserbringung und Verfügbarkeit

(1) Der Anbieter erbringt die Leistung mit der Sorgfalt eines ordentlichen Kaufmanns und ist
um eine hohe Verfügbarkeit der Plattform bemüht.

(2) Eine bestimmte Verfügbarkeitsquote wird nicht zugesichert. Wartungsfenster, Störungen bei
Vorleistern und Ereignisse höherer Gewalt können zu vorübergehenden Einschränkungen führen.

## § 6 KI-generierte Ergebnisse — keine Erfolgsgarantie

(1) Die Antragstexte werden **maschinell durch ein KI-System erzeugt**. Sie sind ein
**Entwurf** und keine fertige, geprüfte Einreichung.

(2) KI-Systeme können **inhaltlich falsche, unvollständige oder erfundene Angaben** erzeugen.
Der Kunde ist verpflichtet, jeden Entwurf **vor der Einreichung inhaltlich zu prüfen**,
insbesondere Zahlen, Fristen, Förderkriterien und Angaben zur eigenen Einrichtung.

(3) Der Anbieter **gewährleistet nicht**, dass ein mit EduFunds erstellter Antrag den
formalen Anforderungen eines konkreten Förderprogramms genügt, fristgerecht ist oder zu einer
**Bewilligung oder Auszahlung von Fördermitteln** führt. Eine Erfolgsgarantie wird
ausdrücklich nicht übernommen.

(4) Die Verantwortung für den eingereichten Antrag trägt allein der Kunde.

## § 7 Nutzungsrechte, Zugriffsdauer und KI-Training

(1) Der Kunde erhält an den für ihn erstellten Antragstexten das uneingeschränkte,
zeitlich unbefristete Recht zur Nutzung, insbesondere zur Einreichung bei Fördergebern.

(2) Der Kunde bleibt Inhaber der von ihm eingegebenen Daten. **Der Anbieter verwendet
Kundendaten nicht zum Trainieren von KI-Modellen**; dies ist auch mit dem eingesetzten
KI-Anbieter vertraglich sichergestellt.

(3) Der **Online-Zugriff** auf einen bezahlten Antrag über die Plattform besteht für
**12 Monate ab Kauf**. Danach werden die Antragsinhalte im Rahmen des Löschkonzepts
anonymisiert. Der Kunde ist gehalten, seinen Antrag rechtzeitig zu exportieren
(PDF/Word/Text); der Export steht ihm jederzeit zur Verfügung.

## § 8 Pflichten des Kunden

(1) Der Kunde stellt sicher, dass die von ihm eingegebenen Angaben richtig und vollständig
sind und dass er zur Verwendung etwaiger Inhalte Dritter berechtigt ist.

(2) Der Kunde gibt in die Freitextfelder **keine personenbezogenen Daten** ein, soweit dies
nicht erforderlich ist. Der Anbieter weist hierauf in der Anwendung hin und bereinigt
Freitexte vor der Übermittlung an das KI-System automatisiert um Identifikatoren.

(3) Der Kunde ist für die sichere Aufbewahrung seiner Zugangsdaten und Freischaltcodes
verantwortlich.

## § 9 Datenschutz und Auftragsverarbeitung

(1) Die Einzelheiten der Verarbeitung ergeben sich aus der Datenschutzerklärung.

(2) Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen
die Parteien einen **Auftragsverarbeitungsvertrag nach Art. 28 DSGVO**. Die AVV-Fassung sowie
die vollständige **Liste der Subprozessoren** sind unter `/avv` abrufbar bzw. auf Anfrage
erhältlich.

(3) Die KI-Verarbeitung findet ausschließlich im Europäischen Wirtschaftsraum statt.

## § 10 Gewährleistung

(1) Der Anbieter gewährleistet, dass die Plattform im Wesentlichen der Leistungsbeschreibung
entspricht. § 6 (KI-generierte Ergebnisse) bleibt unberührt.

(2) Mängel werden innerhalb angemessener Frist beseitigt. Gewährleistungsansprüche verjähren
12 Monate ab Bereitstellung der Leistung.

## § 11 Haftung

(1) Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für Schäden aus
der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach den Vorschriften des
Produkthaftungsgesetzes.

(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist
die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt, höchstens jedoch auf
die Summe der vom Kunden für die betroffene Leistung gezahlten Vergütung.

(3) Im Übrigen ist die Haftung ausgeschlossen. Insbesondere haftet der Anbieter nicht für
entgangene Fördermittel, entgangenen Gewinn oder Folgeschäden, die daraus entstehen, dass ein
Antrag nicht bewilligt, verspätet oder fehlerhaft eingereicht wurde.

## § 12 Vertragslaufzeit

Der Vertrag über einen Einzelantrag oder ein Kontingent ist ein **einmaliger Kaufvertrag**
über digitale Leistungen. Es besteht **kein Dauerschuldverhältnis**, keine Mindestlaufzeit und
keine Kündigungsnotwendigkeit. Für die Gültigkeitsdauer von Kontingenten gilt § 4 Abs. 3, für
die Zugriffsdauer § 7 Abs. 3.

## § 13 Änderungen dieser AGB

Der Anbieter kann diese AGB mit Wirkung für künftige Bestellungen ändern. Für bereits
abgeschlossene Verträge gilt die bei Vertragsschluss geltende Fassung.

## § 14 Schlussbestimmungen

(1) Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.

(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten ist Berlin, sofern der Kunde
Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
Sondervermögen ist.

(3) Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen
unberührt.

**Anbieter:** aitema GmbH · Prenzlauer Allee 229 · 10405 Berlin · office@aitema.de
Handelsregister: Amtsgericht Charlottenburg, HRB 283978 B · USt-IdNr.: DE461054353
