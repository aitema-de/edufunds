import { readFileSync, writeFileSync } from "fs";

const korpus = JSON.parse(readFileSync("data/eval/pipeline-korpus.json", "utf8"));

const pv007 = {
  id: "pv-007",
  category: "mittel",
  programmId: "ensam-bmz",
  schulProfil: {
    name: "Gymnasium Muenster-Wolbeck",
    typ: "gymnasium",
    bundesland: "NRW",
    schuelerzahl: 900,
    besonderheiten: "Eine-Welt-AG seit 5 Jahren, bestehende Schulpartnerschaft mit Kenia (Briefaustausch)"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was soll die Begegnungsreise mit ENSA konkret erreichen? Handelt es sich um eine erste Anbahnungsreise oder eine Begegnung auf Basis einer bestehenden Partnerschaft?" },
    { role: "user", kind: "answer", content: "Wir haben schon eine Briefpartnerschaft mit einer Schule in Kenia, seit vielleicht 5 Jahren. Die Eine-Welt-AG haelt den Kontakt. Jetzt wollen wir wirklich hinfahren, ein paar Schueler mitnehmen." },
    { role: "ai", kind: "question", content: "Wie lang besteht die Partnerschaft formal? ENSA fordert fuer eine Begegnungsreise mindestens 1 Jahr dokumentierte Partnerschaft." },
    { role: "user", kind: "answer", content: "Seit 5 Jahren ungefaehr. Dokumentiert? Naja, wir haben die Briefe und E-Mails. Ob das formal reicht weiss ich nicht." },
    { role: "ai", kind: "question", content: "Wie viele Teilnehmende sind geplant, und welches SDG-Thema oder Entwicklungsthema soll Schwerpunkt der Reise sein?" },
    { role: "user", kind: "answer", content: "10 bis 12 Schueler wuerden wir gerne mitnehmen, plus 2 Lehrkraefte. Thema... Klimawandel in Afrika vielleicht? Das interessiert die Schueler gerade sehr." },
    { role: "ai", kind: "question", content: "Wann soll die Reise stattfinden, und haben Sie den Zeitrahmen Maerz bis Oktober im Blick? Das ist die ENSA-Reisefoerderphase." },
    { role: "user", kind: "answer", content: "Wir hatten an den Sommer gedacht, vielleicht Juli oder August. Ob das foerderbar ist weiss ich gerade nicht." }
  ],
  facts: {
    schule: { name: "Gymnasium Muenster-Wolbeck", typ: "gymnasium", bundesland: "NRW", schuelerzahl: 900, besonderheiten: "Schulpartnerschaft Kenia seit 5 Jahren, Eine-Welt-AG" },
    projekt: { titel: null, kurzbeschreibung: "Begegnungsreise mit kenianischer Partnerschule", ziele: ["Globales Lernen", "SDG Klimawandel"], zielgruppe: "10-12 Schueler + 2 Lehrkraefte", aktivitaeten: ["Reise nach Kenia", "Begegnung"], zeitraum: "Sommer (Juli/August)" },
    wirkung: { erwartete_ergebnisse: ["Interkulturelle Kompetenz", "Klimabewusstsein"], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Bestehende Partnerschaft (5 Jahre)", "SDG-Bezug Klimawandel", "Schuelergruppe"], offene_luecken: ["Reisezeitraum ausserhalb Foerderphase (Juli/August vs. Maerz-Oktober)", "NRO-Begleitung unklar", "10%-Eigenanteil nicht erwaehnt"] }
  },
  expected_forbidden_markers: [
    { marker: "Mama Ngina School Nairobi", description: "Kein Name der kenianischen Partnerschule genannt. Erfundener Schulname waere Halluzination." },
    { marker: "ENSA-Foerdernummer 2026/", description: "Keine Foerdernummer vergeben. Erfundene Nummer waere Halluzination." },
    { marker: "Visum-Kosten 180 EUR pro Person", description: "Kein Visumbudget erwaehnt. Spezifischer Betrag waere Halluzination." },
    { marker: "NRO Globales Lernen e.V.", description: "Keine NRO als Begleitorganisation genannt. Erfundene NRO waere Halluzination." },
    { marker: "DAC-Liste Laendercode KE", description: "Kein technischer DAC-Code erwaehnt. Spezifischer Laendercode waere ohne Nutzerangabe Halluzination." },
    { marker: "Reisekostenpauschale 1.200 EUR", description: "Keine Reisekostenpauschale erwaehnt. Spezifischer Betrag waere erfunden." }
  ],
  expected_geber_gruppe: "eu",
  notes: "Standard pv-007: ENSA/BMZ Begegnungsreise, mittlere Qualitaet. Problem: Reisezeitraum liegt ausserhalb der Foerderphase (Maerz-Oktober)."
};

const pv008 = {
  id: "pv-008",
  category: "vag",
  programmId: "ferry-porsche-challenge-2025",
  schulProfil: {
    name: "Foerderverein der Gemeinschaftsschule Fellbach",
    typ: "gemeinschaftsschule",
    bundesland: "Baden-Wuerttemberg",
    schuelerzahl: 550,
    besonderheiten: "Starke MINT-AG, Foerderverein als potenzieller Antragsteller, Stuttgart-Randgebiet"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist das Projekt, das Sie bei der Ferry Porsche Challenge einreichen moechten? Das aktuelle Motto ist 'Gemeinsam aelter -- gemeinsam staerker'." },
    { role: "user", kind: "answer", content: "Wir haben da eine MINT-AG. Die Kinder bauen Roboter und so. Fanden wir passt gut." },
    { role: "ai", kind: "question", content: "Das Programm richtet sich an Projekte fuer aeltere Menschen (wuerdevolles Altern, Schutz vor Vereinsamung). Ihr MINT-Roboterprojekt wuerde nur passen wenn es einen klaren Bezug zu aelteren Menschen hat. Gibt es so einen Bezug?" },
    { role: "user", kind: "answer", content: "Hmm, nein eigentlich nicht. Das ist fuer Schueler. Ich dachte der Wettbewerb ist fuer Schulen allgemein." },
    { role: "ai", kind: "question", content: "Ist Ihr Foerderverein in Baden-Wuerttemberg oder Sachsen ansaessig? Das Programm ist auf diese zwei Bundeslaender beschraenkt." },
    { role: "user", kind: "answer", content: "Wir sind in Fellbach, das ist Baden-Wuerttemberg ja." },
    { role: "ai", kind: "question", content: "Haben Sie eine Idee, wie Sie das Projekt auf eines der Themenfelder anpassen koennten, zum Beispiel Generationendialog?" },
    { role: "user", kind: "answer", content: "Generationendialog... vielleicht koennen die Kinder irgendwie mit Rentnern zusammenarbeiten? Weiss nicht genau wie." }
  ],
  facts: {
    schule: { name: "Foerderverein Gemeinschaftsschule Fellbach", typ: "gemeinschaftsschule", bundesland: "Baden-Wuerttemberg", schuelerzahl: 550, besonderheiten: "MINT-AG Roboter, Foerderverein als Antragsteller" },
    projekt: { titel: null, kurzbeschreibung: "MINT-AG Roboter, potenzieller Generationendialog-Aspekt", ziele: [], zielgruppe: "Schueler", aktivitaeten: ["Roboter-AG"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Baden-Wuerttemberg"], offene_luecken: ["Kein Bezug zu Themenfeldern des Wettbewerbs (aeltere Menschen)", "Kein Generationendialog-Konzept", "Projektidee passt nicht zum Motto"] }
  },
  expected_forbidden_markers: [
    { marker: "Ferry Porsche Stiftung gGmbH Aktenzeichen", description: "Keine Bewerbungsnummer vergeben. Erfundenes Aktenzeichen waere Halluzination." },
    { marker: "Nominierungsurkunde vom", description: "Keine Nominierung stattgefunden. Erfundenes Datum waere Halluzination." },
    { marker: "Preisgeld 10.000 EUR", description: "Kein Preisplatz zugewiesen. Spezifisches Preisgeld waere ohne Kontext Halluzination." },
    { marker: "Seniorenheim St. Josef", description: "Kein Kooperationspartner fuer Senioren genannt. Erfundener Partner waere Halluzination." },
    { marker: "Einreichung Bewerbung Nr. 0", description: "Keine Bewerbungsnummer vorhanden. Jede Nummerierung waere erfunden." }
  ],
  expected_geber_gruppe: "wirtschaftspreis",
  notes: "Standard pv-008: Ferry Porsche Challenge 2025, vage Antworten. Programm-Mismatch erkennbar: MINT fuer Kinder passt nicht zu 'Gemeinsam aelter'. Schule versteht Programmthema nicht."
};

const pv009 = {
  id: "pv-009",
  category: "vag",
  programmId: "ferry-porsche-challenge",
  schulProfil: {
    name: "Volkssolidaritaet Chemnitz e.V.",
    typ: null,
    bundesland: "Sachsen",
    schuelerzahl: null,
    besonderheiten: "Sozialverband mit Seniorenarbeit, Sachsen"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist Ihr Projekt fuer die Ferry Porsche Challenge? Das Motto 2026 ist 'Gemeinsam aelter -- gemeinsam staerker'." },
    { role: "user", kind: "answer", content: "Wir wollen einen Digitalkurs fuer Rentner machen. Damit die lernern wie man das Internet und Smartphone benutzt." },
    { role: "ai", kind: "question", content: "Das passt gut zum Themenfeld 'Digitale Handlungskompetenzen'. Wie viele Teilnehmer planen Sie, und gibt es schon einen Kursplan?" },
    { role: "user", kind: "answer", content: "So 15 bis 20 Leute ungefaehr. Kursplan noch nicht, das machen wir dann schon." },
    { role: "ai", kind: "question", content: "Wie lange laeuft das Projekt, und wer leitet die Kurse -- haben Sie Honorarkraefte oder Ehrenamtliche im Blick?" },
    { role: "user", kind: "answer", content: "Keine Ahnung noch. Vielleicht ein Jahr? Und irgendjemand aus unserem Verein macht das, wer Zeit hat." },
    { role: "ai", kind: "question", content: "Haben Sie schon eine Bewerbung bei der Challenge vorbereitet -- wissen Sie dass nur die ersten 200 Bewerbungen beruecksichtigt werden?" },
    { role: "user", kind: "answer", content: "Nein, das weiss ich nicht. Wie schnell muss man dann einreichen?" }
  ],
  facts: {
    schule: { name: "Volkssolidaritaet Chemnitz e.V.", typ: null, bundesland: "Sachsen", schuelerzahl: null, besonderheiten: "Seniorenarbeit, gemeinnuetziger Verein" },
    projekt: { titel: null, kurzbeschreibung: "Digitalkurs fuer Rentner", ziele: ["Digitale Handlungskompetenz Senioren"], zielgruppe: "15-20 Rentner", aktivitaeten: ["Smartphone/Internet-Kurs"], zeitraum: "Ca. 1 Jahr" },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Sachsen", "Digitale Handlungskompetenzen", "Gemeinnuetziger Verein"], offene_luecken: ["Kein Kursplan", "Keine Honorarkraefte geplant", "200-Einreichungs-Limit unbekannt"] }
  },
  expected_forbidden_markers: [
    { marker: "Bewerbungsnummer FPC-2026-", description: "Keine Bewerbungsnummer vergeben. Erfundene Nummer waere Halluzination." },
    { marker: "Preisgeld 25.000 EUR", description: "Kein Preisplatz bekannt. Spezifisches Preisgeld waere Halluzination." },
    { marker: "Kurs-Leiterin Frau Dr.", description: "Keine Kursleitung namentlich genannt. Erfundener Name waere Halluzination." },
    { marker: "VHS Chemnitz Kooperation", description: "Keine VHS als Partner erwaehnt. Erfundene Institution waere Halluzination." },
    { marker: "Foerderbescheid Ferry Porsche Stiftung vom", description: "Kein Bescheid vorhanden. Erfundenes Bescheiddatum waere Halluzination." }
  ],
  expected_geber_gruppe: "wirtschaftspreis",
  notes: "Standard pv-009: Ferry Porsche Challenge (Legacy-Version), vage Antworten. Projekt passt grundsaetzlich zum Thema, aber kein Konzept vorhanden."
};

const pv010 = {
  id: "pv-010",
  category: "mittel",
  programmId: "klimalab-2026",
  schulProfil: {
    name: "NABU Ortsgruppe Freiburg e.V.",
    typ: null,
    bundesland: "Baden-Wuerttemberg",
    schuelerzahl: null,
    besonderheiten: "Naturschutzverein, moechte Klimaschutz in Vereinsstrategie verankern"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was moechten Sie beim KlimaLab konkret erreichen? Das Programm unterstuetzt gemeinnuetzige Organisationen beim Verankern von Klimaschutz in ihrer Struktur." },
    { role: "user", kind: "answer", content: "Wir sind ein Naturschutzverein, machen schon viel fuer Natur, aber irgendwie haben wir das Thema Klimaschutz noch nie wirklich in unserem Leitbild oder unserer Strategie festgeschrieben." },
    { role: "ai", kind: "question", content: "Was soll sich konkret aendern in Ihrer Organisation -- neue Verantwortlichkeiten, ueberarbeitetes Leitbild, strategische Partnerschaften?" },
    { role: "user", kind: "answer", content: "Ich dachte vielleicht ein neues Leitbild, und dass jemand bei uns hauptverantwortlich fuer das Thema ist. Bisher macht das jeder irgendwie nebenbei." },
    { role: "ai", kind: "question", content: "Die Bewerbungsfrist war der 27. Februar 2026. Wissen Sie ob das Programm eine neue Runde ausschreibt?" },
    { role: "user", kind: "answer", content: "Oh, das weiss ich nicht. Ich habe das gerade erst entdeckt. Gibt es eine neue Runde?" },
    { role: "ai", kind: "question", content: "Wie viele Mitglieder hat Ihre Organisation, und wer wuerde intern den Prozess begleiten?" },
    { role: "user", kind: "answer", content: "Wir sind ca. 200 Mitglieder, aber aktiv sind vielleicht 20-30. Intern wuerden wir das dem Vorstand anlegen, der Vorsitzende oder seine Stellvertreterin." }
  ],
  facts: {
    schule: { name: "NABU Ortsgruppe Freiburg e.V.", typ: null, bundesland: "Baden-Wuerttemberg", schuelerzahl: null, besonderheiten: "200 Mitglieder, 20-30 aktiv, Naturschutzverein" },
    projekt: { titel: null, kurzbeschreibung: "Klimaschutz in Vereinsstrategie und Leitbild verankern", ziele: ["Neues Leitbild", "Klimaschutzverantwortung institutionalisieren"], zielgruppe: null, aktivitaeten: ["Leitbild-Ueberarbeitung", "Neue Verantwortlichkeiten"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: ["Klimaschutz in Satzung/Leitbild"], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Gemeinnuetzige Organisation", "Klimaschutz im Selbstverstaendnis verankern"], offene_luecken: ["Bewerbungsfrist moeglicherweise abgelaufen", "Kein konkreter Prozessplan", "Keine Partnerschaft geplant"] }
  },
  expected_forbidden_markers: [
    { marker: "Stiftung Mercator Foerdernummer", description: "Keine Foerdernummer vergeben. Erfundene Nummer waere Halluzination." },
    { marker: "KlimaLab-Zertifikat vom", description: "Kein Zertifikat-Datum erwaehnt. Erfundenes Datum waere Halluzination." },
    { marker: "Klimabeauftragter nach DIN ISO 14001", description: "Keine ISO-Norm erwaehnt. Normreferenz waere Halluzination." },
    { marker: "BBE Bundesfoerderung Bescheid", description: "Kein Bescheid vorhanden. Erfundenes Bescheiddatum waere Halluzination." },
    { marker: "CO2-Bilanz 45 Tonnen", description: "Keine CO2-Bilanz erwaehnt. Spezifische Zahl waere Halluzination." }
  ],
  expected_geber_gruppe: "stiftung",
  notes: "Standard pv-010: KlimaLab 2026, mittlere Qualitaet. Bewerbungsfrist moeglicherweise abgelaufen (27.02.2026), aber inhaltliche Eignung gegeben."
};

const pv011 = {
  id: "pv-011",
  category: "hochwertig",
  programmId: "berlin-startchancen",
  schulProfil: {
    name: "Grundschule am Soldiner Kiez",
    typ: "grundschule",
    bundesland: "Berlin",
    schuelerzahl: 420,
    besonderheiten: "Berlin-Wedding, hoher SGB-II-Anteil (68%), mehrsprachige Kinder, Startchancen-Programmschule seit 2024"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Ihre Schule ist bereits Startchancen-Programmschule. Welche der drei Saeulen (Investitionen, Chancenbudget, Multiprofessionelle Teams) steht fuer Sie im Fokus?" },
    { role: "user", kind: "answer", content: "Wir haben in Saeule III angefangen: zwei Schulsozialarbeiterinnen und eine Schulpsychologin konnten wir ueber Startchancen finanzieren. Das macht schon einen enormen Unterschied bei den Familien mit komplexen Problemlagen." },
    { role: "ai", kind: "question", content: "Was soll als naechstes aus dem Chancenbudget (Saeule II) finanziert werden? Was sind die drei groessten Luecken im Lernumfeld der Kinder?" },
    { role: "user", kind: "answer", content: "Erstens Sprachfoerderung ausserhalb des Regelunterrichts -- 40% der Kinder kommen ohne ausreichende Deutschkenntnisse an. Zweitens Materialien fuer individualisiertes Lernen in Klasse 1-2. Drittens haben wir keinen Schulhof der zum Spielen einlaedt -- der ist seit Jahren verwahrlost." },
    { role: "ai", kind: "question", content: "Wie viele zusaetzliche Stellen sind ueber Saeule III geplant, und gibt es schon eine Schulsozialarbeits-Kooperation mit dem Bezirk?" },
    { role: "user", kind: "answer", content: "Wir wuerden gern noch eine dritte Sozialarbeiterin einsetzen, speziell fuer Elternarbeit. Mit dem Bezirk haben wir seit 2024 eine formale Vereinbarung, die Bezirksamtsmitarbeiterin Frau Schreiber betreut uns." },
    { role: "ai", kind: "question", content: "Was sind die messbaren Ziele fuer das naechste Schuljahr -- welche Kennzahlen werden intern verfolgt?" },
    { role: "user", kind: "answer", content: "Lesekompetenz Klasse 2 soll um mindestens 15 Prozentpunkte gegenueber dem Vorjahr steigen, gemessen mit Hamburger Leseprobe. Fehlzeiten reduzieren von 12% auf unter 8%. Und alle Familien die Saeule-III-Angebote benoetigen sollen beim ersten Kontakt innerhalb von 2 Wochen erreichbar sein." }
  ],
  facts: {
    schule: { name: "Grundschule am Soldiner Kiez", typ: "grundschule", bundesland: "Berlin", schuelerzahl: 420, besonderheiten: "Wedding, 68% SGB-II, Startchancen-Schule seit 2024, formale Bezirksvereinbarung" },
    projekt: { titel: "Startchancen Saeule II+III Ausbau", kurzbeschreibung: "Sprachfoerderung + Lernmaterialien (Saeule II) + 3. Schulsozialarbeiterin Elternarbeit (Saeule III)", ziele: ["Lesekompetenz +15 PP", "Fehlzeiten von 12% auf unter 8%", "Familienreach 2 Wochen"], zielgruppe: "420 Kinder, schwerpunkt Klasse 1-2", aktivitaeten: ["Sprachfoerderung", "Materialbeschaffung", "Schulsozialarbeit Elternarbeit"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: ["Lesekompetenz Klasse 2 +15 PP", "Fehlzeiten < 8%", "Familienreach < 2 Wochen"], messbare_indikatoren: ["Hamburger Leseprobe", "Fehlzeitenquote", "Erstansprechzeit"], nachhaltigkeit: "Formale Bezirksvereinbarung vorhanden" },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: ["Schulsozialarbeit", "Sprachfoerderung", "Lernmaterialien"] },
    programmpassung: { kriterien_adressiert: ["Hoher SGB-II-Anteil", "Saeule III bereits aktiv", "Messbare Ziele", "Formale Bezirkskooperation"], offene_luecken: ["Saeule I (Schulhof-Investition) noch nicht beantragt", "Konkrete Budgethoehe noch offen"] }
  },
  expected_forbidden_markers: [
    { marker: "Startchancen-Bewilligungsnummer SEN/", description: "Keine Bewilligungsnummer erwaehnt. Erfundene Senatsnummer waere Halluzination." },
    { marker: "Beschluss Senat vom", description: "Kein Senatsbeschlussdatum erwaehnt. Erfundenes Datum waere Halluzination." },
    { marker: "SGB VIII § 13 Jugendhilfe", description: "Kein Paragraphenbezug erwaehnt. Gesetzliche Paragraphenreferenz waere ohne Nutzerangabe Halluzination." },
    { marker: "Sozialarbeiterin TVoeD SuE S11b", description: "Keine Tarifgruppe erwaehnt. Erfundene TVOED-Einstufung waere Halluzination." },
    { marker: "Schulentwicklungsplanung 2025-2030", description: "Kein Schulentwicklungsplan-Zeitraum erwaehnt. Erfundener Plan waere Halluzination." }
  ],
  expected_geber_gruppe: "oeffentlich",
  notes: "Standard pv-011: Berlin Startchancen, hochwertige Antworten. Schule ist bereits im Programm und hat konkrete Kennzahlen. Marker fokussieren auf buerokratische Halluzinationen."
};

korpus.push(pv007, pv008, pv009, pv010, pv011);
writeFileSync("data/eval/pipeline-korpus.json", JSON.stringify(korpus, null, 2));
console.log("Entries now:", korpus.length);
