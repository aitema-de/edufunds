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
5. **§ 9 Datenschutz/AVV:** Der unter `/avv` abrufbare AVV wird **mit Vertragsschluss
   automatisch Vertragsbestandteil** (kein gesonderter Abschluss nötig).

## Nachtrag 14.07.2026 — der Vertrag holt die Produktwirklichkeit ein

Das Produkt kann seit dem 14.07.2026 Dinge, die der Vertrag nicht regelte. Genau in dieser
Lücke entstehen die teuren Fehler — deshalb nachgezogen:

6. **§ 4a Abs. 1 — Rechnungskauf nur für Schulen und Schulträger** (Entscheidung Kolja).
   Fördervereine und alle übrigen Kunden zahlen per Karte. Der Rechnungskauf schaltet **vor**
   Zahlungseingang frei (bis 459,90 €) — das ist gegenüber öffentlichen Stellen vertretbar,
   gegenüber einem privatrechtlichen Verein nicht. Die Software weist offensichtliche
   Vereinsdomains ab; ein Verein mit **neutraler** Domain ist technisch **nicht** erkennbar —
   deshalb trägt die Klausel (Zusicherung + Stornorecht), nicht der Code.
7. **§ 4a Abs. 5–8 — Folgen der Nichtzahlung.** Bisher stand dort nur „sperren". Der Betrieb
   mahnt jetzt gestuft (Erinnerung → Mahnung → Sperre frühestens 7 Tage später) und sperrt
   **nur die noch nicht eingelösten** Anträge; bereits erstellte bleiben (erbrachte Leistung).
   Zahlung hebt die Sperre auf. Ohne diese Absätze täte der Cron etwas, wofür es keine
   vertragliche Grundlage gäbe.
8. **§ 4a Abs. 6 — anteilige Abrechnung** (Entscheidung Kolja): 20er-Paket, 3 Anträge genutzt,
   nicht gezahlt → gefordert werden 3 × Einzelpreis (ohne Mengenrabatt), gedeckelt auf den
   Paketpreis; der Rest verfällt gegen Gutschrift. Fair, durchsetzbar, und der verlorene Rabatt
   ist der Anreiz, doch zu zahlen.
9. **§ 4b NEU — Rückerstattung und Nacherfüllung.** Es gab dazu **keine einzige Klausel**,
   obwohl der Stripe-Webhook seit dem 14.07. bei voller Erstattung den Zugriff entwertet.
   Jetzt: kein Widerrufsrecht (B2B), **Nacherfüllung vor Erstattung**, Erstattung freiwillig,
   **kein** Erstattungsgrund bei Ablehnung durch den Fördergeber (sonst höhlt Kulanz § 6 aus),
   Teilerstattung lässt den Zugriff bestehen.
10. **§ 7 Abs. 1 — Zahlungsvorbehalt.** Der Entwurf räumte ein „uneingeschränktes, zeitlich
    unbefristetes" Nutzungsrecht ein — das **widersprach** Sperre und Refund-Entwertung: Wer
    ein unbedingtes Dauerrecht hat, dem darf man den Zugriff nicht entziehen. Die
    Rechteeinräumung steht jetzt unter dem Vorbehalt der vollständigen Zahlung.

## Nachtrag 13.07.2026 — eingearbeitet nach der dritten Rechts-Vorprüfung

Die dritte KI-Vorprüfung (`03`/`05` im Anwaltsordner) hat drei Punkte als **Blocker** benannt.
Sie sind hier **als Vorschlag** eingearbeitet — der Wortlaut steht ausdrücklich zur
anwaltlichen Disposition:

1. **§ 4a Kauf auf Rechnung (NEU).** Den Rechnungskauf gibt es im Betrieb tatsächlich — an
   zwei Stellen (Einzelantrag `app/api/wizard/invoice/route.ts`, Kontingent
   `app/api/kontingent/order/route.ts`), je 14 Tage Zahlungsziel bei **sofortiger
   Freischaltung**. Die AGB regelten ihn nicht und widersprachen ihm sogar (§ 3 Abs. 3 knüpft
   den Vertragsschluss an die Zahlung). ⚠️ **Bemerkenswert:** Die *alte* Fassung enthielt
   immerhin eine 14-Tage-Zahlungsklausel — die Neufassung hatte sie ersatzlos verloren. An
   diesem Punkt war der Entwurf **schlechter als das, was er ablöst.**
2. **§ 11 Abs. 2/3 neu gefasst.** Die Summenkappung auf die gezahlte Vergütung (29,90 €) ist
   bei Kardinalpflichtverletzung gestrichen; Abs. 3 ist an den Verschuldensgrad zurückgebunden
   und stellt Abs. 1/2 ausdrücklich unberührt. Grund: Der kategorische Ausschluss entgangener
   Fördermittel erfasste dem Wortlaut nach auch Vorsatz — wegen des Verbots der
   geltungserhaltenden Reduktion drohte die **Gesamtunwirksamkeit** der Haftungsklausel und
   damit unbegrenzte gesetzliche Haftung.
3. **§ 9 Abs. 2 AVV-Einbeziehung.** Die Klausel *versprach* einen AVV, schloss ihn aber nicht —
   Art.-28-Lücke. Jetzt automatische Einbeziehung mit Vertragsschluss.

**§ 7 Abs. 2 (Training) — präzisiert, Aussage hält.** Die dritte Vorprüfung meldete, „kein
Training" sei nicht gedeckt: Der DPA (§ 2.3) nenne das Training als Zweck, „*unless (a) Customer
opted-out … or (b) uses a … Product that is opted-out by default*". Der **Befund war berechtigt,
die Schlussfolgerung falsch** — und beides ist lehrreich:

- Berechtigt war er, weil unsere **Nachweisakte den Beleg nicht enthielt**: Das dort archivierte
  „Terms"-PDF war in Wahrheit nur die **Linkliste** des Legal Centers (die Verträge liegen auf
  `legal.mistral.ai`, nicht auf `mistral.ai/terms`). Die Prüferin hatte also nur den DPA — und
  aus dem allein *muss* man diesen Schluss ziehen.
- Falsch war die Schlussfolgerung, weil die **Commercial ToS § 4.2** die speziellere Regel sind
  und sie umdrehen: „*Mistral AI **will not use** Customer Data or Outputs to train … **except**
  (a) … under a **free subscription**, Vibe Pro or Vibe Teams …, (b) when Customer … provides
  **Feedback**, (c) … **flagged as part of … automated moderation**, (d) … an **Order Form** or
  (e) when Customer uses **Labs Models**.*" Ebenso die Privacy Policy: „*we **do not** use your
  Input and Output to train our … models when you use … **the paid version of our APIs**.*"

**Keine der fünf Ausnahmen trifft zu:** (a) wir sind auf **bezahlter** API (Rechnungen
`MSTRL-API-850529-001/002`), nicht auf einem Free-Abo · (b) wir senden **kein Feedback** — die
einzigen API-Aufrufe im Code sind `chat.completions.create` (`lib/wizard/llm.ts`); der
`/api/feedback`-Endpunkt der Plattform geht an ClickUp, nie an Mistral · (d) kein Order Form ·
(e) `mistral-small-latest` trägt **kein `labs`-Präfix**.

⚠️ **Was bleibt:** Ausnahme **(c)**, das Trainieren mit Inhalten, die die automatische
Missbrauchserkennung flaggt. Das ist der Rest, den erst **Zero Data Retention** beseitigt (der
DPA nimmt Abuse-Monitoring ausdrücklich zurück, „*except … when zero data retention has been
activated*"). ZDR ist beantragt (13.07.), Antwort steht aus.

Belege: `docs/legal/mistral-nachweise/` — jetzt mit **Commercial ToS** und **Privacy Policy** als
Volltext-Archivkopien (vorher fehlten beide).

## Offene Punkte für den Anwalt

- **Verfügbarkeit:** Der Entwurf verspricht bewusst **keine** Verfügbarkeitsquote (bei einem
  Einmalkauf unüblich). Falls Kontingent-Kunden eine zugesichert bekommen sollen → ergänzen.
- **Gewährleistungsfrist** (Entwurf: 12 Monate, § 10) bestätigen. **Haftung (§ 11):** Die
  Summenkappung ist nach der Vorprüfung entfallen — bitte prüfen, ob eine (höhere) Kappung
  wieder eingezogen werden soll und in welcher Höhe sie trägt.
- **§ 4a:** Verzugsregelung, Sperrbefugnis und Vertragsschluss durch Freischaltung bestätigen.
- **§ 4a Abs. 1 (NEU):** Trägt die Beschränkung auf Schulen/Schulträger als AGB-Klausel — und
  genügt die **Zusicherung des Kunden** als Grundlage für ein späteres Storno, wenn sich
  herausstellt, dass ein Verein bestellt hat? (Technisch ist ein Verein mit neutraler Domain
  nicht erkennbar.) Sollte die Bestellmaske eine **ausdrückliche Erklärung** verlangen?
- **§ 4a Abs. 5 (NEU):** Ist die Sperre der noch nicht eingelösten Anträge bei Verzug — nach
  Ankündigung, unter Fortbestand der Forderung — ein zulässiges Zurückbehaltungsrecht?
- **§ 4a Abs. 6 (NEU):** Trägt die **anteilige Abrechnung** zum Einzelpreis (also unter Wegfall
  des Mengenrabatts) im B2B, oder ist das eine unangemessene Benachteiligung? Alternative wäre
  die anteilige Abrechnung zum Paket-Stückpreis.
- **§ 4b (NEU):** Erstattungsrichtlinie insgesamt — insbesondere Abs. 4 (**keine** Erstattung
  bei Ablehnung durch den Fördergeber) im Zusammenspiel mit § 6, und Abs. 5 (Erlöschen des
  Zugriffs bei voller Erstattung).
- **§ 7 Abs. 1 (NEU):** Hält der **Zahlungsvorbehalt** bei der Rechteeinräumung? Er ist die
  Grundlage dafür, dass Sperre und Refund-Entwertung überhaupt zulässig sind.
- **AGB-Einbeziehung:** Die akzeptierte Fassung wird **nicht protokolliert** (kein
  Versionsstempel/Hash). Genügt die Checkbox im B2B, oder ist die Protokollierung nötig?
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

(4) Beim **Kauf auf Rechnung** gilt abweichend von Absatz 3 die Regelung des § 4a.

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
Bedingungen für die Zahlungsabwicklung. Daneben kann der Anbieter den **Kauf auf Rechnung**
anbieten (§ 4a).

## § 4a Kauf auf Rechnung

**(1) Berechtigter Personenkreis.** Der Kauf auf Rechnung steht **ausschließlich Schulen und
Schulträgern** offen (öffentliche und staatlich anerkannte Schulen sowie deren Träger). Er ist
diesem Kreis vorbehalten, weil die Leistung dabei **bereits vor Zahlungseingang freigeschaltet**
wird. Andere Kunden — insbesondere **Fördervereine**, sonstige Vereine, Unternehmen und
Privatpersonen — zahlen über den Zahlungsdienstleister (§ 4 Abs. 4). Der Kunde sichert bei der
Bestellung zu, zum berechtigten Personenkreis zu gehören. Der Anbieter kann Bestellungen auf
Rechnung ohne Angabe von Gründen zurückweisen und einen bereits geschlossenen Vertrag
stornieren (Abs. 8), wenn die Voraussetzungen nicht vorliegen.

(2) Bietet der Anbieter den Kauf auf Rechnung an, kommt der Vertrag **mit der Freischaltung
der Leistung** zustande; auf die Bestätigung der Zahlung (§ 3 Abs. 3) kommt es insoweit nicht
an. Der Anbieter bestätigt den Vertragsschluss unverzüglich per E-Mail.

(3) Die Vergütung ist **innerhalb von 14 Tagen ab Zugang der Rechnung** ohne Abzug zur Zahlung
fällig.

(4) Gerät der Kunde in Zahlungsverzug, schuldet er Verzugszinsen in Höhe von neun Prozentpunkten
über dem Basiszinssatz (§ 288 Abs. 2 BGB) sowie eine Pauschale von 40 € (§ 288 Abs. 5 BGB). Die
Geltendmachung eines weitergehenden Verzugsschadens bleibt vorbehalten.

**(5) Zahlungserinnerung und Sperre.** Nach Ablauf des Zahlungsziels erinnert der Anbieter
zunächst an die Zahlung. Bleibt diese aus, mahnt er und ist **frühestens sieben Tage nach der
Zahlungserinnerung** berechtigt, die **noch nicht eingelösten Anträge eines Kontingents zu
sperren**. Die Sperre wird dem Kunden zuvor angekündigt.
**Bereits erstellte Anträge bleiben abrufbar** — sie sind erbrachte Leistung. Die
Zahlungspflicht besteht unabhängig von der Sperre fort. Zahlt der Kunde, hebt der Anbieter die
Sperre unverzüglich auf.

**(6) Anteilige Abrechnung.** Statt die volle Vergütung eines Kontingents zu verlangen, kann der
Anbieter das Kontingent **anteilig abrechnen**: Die noch nicht eingelösten Anträge verfallen; zu
zahlen sind dann nur die **tatsächlich eingelösten Anträge zum jeweils gültigen Einzelpreis**
(ohne Mengenrabatt), höchstens jedoch die ursprünglich vereinbarte Vergütung. Über den
verfallenen Teil erteilt der Anbieter eine Gutschrift. Wurde **kein Antrag** eingelöst, entfällt
die Forderung vollständig (Storno nach Abs. 8). Nach anteiliger Abrechnung leben die verfallenen
Anträge **auch bei späterer Zahlung nicht wieder auf**.

**(7) Zugriff beim Einzelantrag.** Der auf Rechnung erworbene **Einzelantrag** ist zugleich die
gesamte Leistung; er wird bei Zahlungsverzug nicht gesperrt, sondern bleibt abrufbar. Wird die
Bestellung nach Abs. 8 storniert, erlischt das Zugriffsrecht (§ 7 Abs. 1).

**(8) Storno.** Bleibt die Zahlung trotz Mahnung aus oder gehört der Kunde nicht zum
berechtigten Personenkreis (Abs. 1), kann der Anbieter vom Vertrag zurücktreten. Mit dem Storno
verfallen nicht eingelöste Anträge; beim Einzelantrag erlischt zusätzlich das Zugriffsrecht.
Bereits eingelöste Anträge eines Kontingents bleiben davon unberührt; die Vergütung hierfür
richtet sich nach Abs. 6.

## § 4b Rückerstattung und Nacherfüllung

(1) Der Kunde ist **Unternehmer bzw. öffentliche Stelle** (§ 1). Ein **gesetzliches
Widerrufsrecht besteht nicht**; die §§ 355 ff. BGB gelten nur für Verbraucher.

(2) Ist ein Ergebnis mangelhaft, hat der Kunde zunächst Anspruch auf **Nacherfüllung** — der
Anbieter erzeugt den Antrag auf Wunsch neu. Erst wenn die Nacherfüllung fehlschlägt, kommt eine
Rückerstattung in Betracht.

(3) Unabhängig davon kann der Anbieter **freiwillig** erstatten, insbesondere bei technischen
Fehlern, Doppelkäufen oder wenn eine bezahlte Leistung nicht abgerufen wurde. Ein Anspruch
hierauf besteht nicht.

(4) **Kein Erstattungsgrund** ist die Ablehnung eines Förderantrags durch den Fördergeber oder
eine inhaltliche Unzufriedenheit mit einem ordnungsgemäß erzeugten Entwurf; hierzu gilt § 6.

(5) **Wirkung der Erstattung.** Wird der Kaufpreis **vollständig** erstattet, wird der Vertrag
rückabgewickelt: Der Zugriff auf den betreffenden Antrag bzw. das Kontingent **erlischt** und der
Download-Link wird ungültig (§ 7 Abs. 1). Bereits eingelöste Anträge eines erstatteten
Kontingents bleiben in der Abrechnung berücksichtigt. Eine **Teil**erstattung (etwa aus Kulanz)
lässt den Zugriff **unberührt**.

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
Die Einräumung dieses Rechts steht unter dem **Vorbehalt der vollständigen Zahlung** der
Vergütung. Wird der Kaufpreis vollständig erstattet (§ 4b Abs. 5) oder die Bestellung storniert
(§ 4a Abs. 8), entfällt das Nutzungsrecht und der Anbieter kann den Zugriff entziehen.

(2) Der Kunde bleibt Inhaber der von ihm eingegebenen Daten. **Der Anbieter verwendet
Kundendaten nicht zum Trainieren von KI-Modellen.** Der eingesetzte KI-Anbieter verwendet
Ein- und Ausgaben bei der vom Anbieter genutzten **kostenpflichtigen API vertragsgemäß nicht
zu Trainingszwecken**; Rückmeldefunktionen („Feedback") sowie experimentelle Modelle, deren
Nutzung eine Verwendung zu Trainingszwecken auslösen würde, werden nicht eingesetzt.

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

(2) Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, wird der
unter `/avv` in der bei Vertragsschluss geltenden Fassung abrufbare
**Auftragsverarbeitungsvertrag nach Art. 28 DSGVO mit Vertragsschluss Bestandteil des
Vertrags**. Eines gesonderten Abschlusses bedarf es nicht; auf Wunsch stellt der Anbieter eine
unterzeichnete Fassung bereit. Die vollständige **Liste der Subprozessoren** ist ebenfalls
unter `/avv` abrufbar.

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

(2) Bei leicht fahrlässiger Verletzung **wesentlicher Vertragspflichten (Kardinalpflichten)**
haftet der Anbieter auf den vertragstypischen, vorhersehbaren Schaden. Kardinalpflichten sind
solche Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst
ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.

(3) Im Übrigen — insbesondere bei leicht fahrlässiger Verletzung **nicht wesentlicher**
Vertragspflichten — ist die Haftung ausgeschlossen; das gilt namentlich für entgangene
Fördermittel, entgangenen Gewinn und Folgeschäden. **Die Absätze 1 und 2 bleiben unberührt.**

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
