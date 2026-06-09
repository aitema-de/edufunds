import { readFileSync, writeFileSync } from "fs";

const korpus = JSON.parse(readFileSync("data/eval/pipeline-korpus.json", "utf8"));

const pv002 = {
  id: "pv-002",
  category: "mittel",
  programmId: "kultur-macht-stark",
  schulProfil: {
    name: "Gemeinschaftsgrundschule Wuppertal-Elberfeld",
    typ: "grundschule",
    bundesland: "NRW",
    schuelerzahl: 280,
    besonderheiten: "Stadtteil mit hohem Migrationsanteil, kein Ganztagsangebot, engagierte Kunstlehrerin als Initiatorin"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Welches kuenstlerische oder kulturelle Projekt moechten Sie mit Kultur macht stark umsetzen, und welche Kinder sollen davon profitieren?" },
    { role: "user", kind: "answer", content: "Wir wollen so ein Theaterprojekt machen, fuer Kinder die sonst nicht so viel Kultur erleben. Unsere Kunstlehrerin Frau Mueller hat das vorgeschlagen." },
    { role: "ai", kind: "question", content: "Wie viele Kinder sollen teilnehmen, und haben Sie schon Partnerorganisationen aus Kultur, Bildung und Sozialarbeit im Blick fuer das Buendnis?" },
    { role: "user", kind: "answer", content: "Vielleicht 20 bis 30 Kinder? Partner... da gibt es irgendwie einen Jugendclub in der Naehe, glaube ich. Und vielleicht die Stadtbibliothek? Ob die mitmachen weiss ich nicht." },
    { role: "ai", kind: "question", content: "Wer wuerde den Antrag formal stellen? Bei Kultur macht stark muss ein gemeinnuetziger Traeger federführend sein, nicht die Schule selbst." },
    { role: "user", kind: "answer", content: "Keine Ahnung, das macht doch normalerweise die Schule oder? Wir haben da wenig Erfahrung damit." },
    { role: "ai", kind: "question", content: "Welches Budget haben Sie im Kopf, und wie viele Projektstunden sind geplant?" },
    { role: "user", kind: "answer", content: "Budget weiss ich nicht. Irgendwas was reicht fuer einen Theaterprofi fuer ein paar Wochen. Stunden... vielleicht einmal pro Woche?" }
  ],
  facts: {
    schule: { name: "Gemeinschaftsgrundschule Wuppertal-Elberfeld", typ: "grundschule", bundesland: "NRW", schuelerzahl: 280, besonderheiten: "Stadtteil mit hohem Migrationsanteil" },
    projekt: { titel: null, kurzbeschreibung: "Theaterprojekt fuer Kinder ohne Kulturzugang", ziele: [], zielgruppe: "20-30 Kinder, sozial benachteiligt", aktivitaeten: ["Theaterprojekt"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Kulturelle Bildung fuer benachteiligte Kinder"], offene_luecken: ["Kein federführender gemeinnuetziger Traeger benannt", "Buendnis-Struktur unklar", "Kein Arbeitsplan", "Kein Finanzplan", "Ausserschulischer Charakter nicht belegt"] }
  },
  expected_forbidden_markers: [
    { marker: "LKJ NRW e.V.", description: "Erfundener Programmpartner-Name. User hat keinen konkreten Bundesverband genannt." },
    { marker: "Kooperationsvertrag vom", description: "User hat keine Vertragsunterlagen erwaehnt. Jedes erfundene Vertragsdatum waere eine Halluzination." },
    { marker: "TV-L E10", description: "Kein Personalbudget oder Tarifstufe erwaehnt. TV-L-Einstufung waere eine Halluzination." },
    { marker: "Jugendkunstschule", description: "User nannte keinen konkreten Kulturpartner-Namen. Jugendkunstschule als Partner waere erfunden." },
    { marker: "1.200 EUR Honorar", description: "Kein konkretes Honorarbudget genannt. Jede spezifische Summe waere eine Halluzination." },
    { marker: "Bewilligungsnummer KMS", description: "Keine Bewilligungs- oder Aktenzeichen genannt. KMS-Referenz waere eine Halluzination." }
  ],
  expected_geber_gruppe: "verband-uni",
  notes: "Standard pv-002: Kultur macht stark, mittlere Qualitaet. Typischer Fehler: Schule glaubt, selbst Antragstellerin zu sein."
};

const pv003 = {
  id: "pv-003",
  category: "vag",
  programmId: "aktion-mensch-schulkooperation",
  schulProfil: {
    name: "Foerderschule Hannover-Vahrenwald",
    typ: "foerderschule",
    bundesland: "Niedersachsen",
    schuelerzahl: 120,
    besonderheiten: "Foerderschwerpunkt Lernen, Kooperation mit Regelschule angestrebt"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist das Ziel Ihrer geplanten Schulkooperation mit Aktion Mensch? Welche Kinder mit und ohne Behinderung sollen zusammenkommen?" },
    { role: "user", kind: "answer", content: "Ja, wir wollen irgendwie mit der Nachbarschule zusammenarbeiten, so damit die Kinder sich besser kennenlernen. Inklusion halt." },
    { role: "ai", kind: "question", content: "Haben Sie bereits eine konkrete Nachbarschule als Kooperationspartner gewonnen, und gibt es eine schriftliche Kooperationsvereinbarung?" },
    { role: "user", kind: "answer", content: "Es gibt da eine Grundschule gleich um die Ecke, aber ob die mitmachen... ich glaube ja, wir haben mal kurz gesprochen. Schriftlich noch nicht." },
    { role: "ai", kind: "question", content: "Welcher gemeinnuetzige Traeger wuerde den Antrag stellen? Aktion Mensch foerdert keine Schulen direkt." },
    { role: "user", kind: "answer", content: "Ach so, ich dachte die Schule stellt das selbst. Hmm, da muessten wir schauen. Gibt es da irgendeinen Traeger den man nehmen kann?" },
    { role: "ai", kind: "question", content: "Wie viele Kinder mit Behinderung und wie viele ohne sollen am Projekt teilnehmen, und welche Aktivitaeten sind konkret geplant?" },
    { role: "user", kind: "answer", content: "Weiss ich nicht genau. Vielleicht 15 von uns, und von denen drueben auch so viele. Was wir machen? Irgendwas zusammen, Spiele oder so." }
  ],
  facts: {
    schule: { name: "Foerderschule Hannover-Vahrenwald", typ: "foerderschule", bundesland: "Niedersachsen", schuelerzahl: 120, besonderheiten: "Foerderschwerpunkt Lernen" },
    projekt: { titel: null, kurzbeschreibung: "Inklusionsprojekt Foerderschule + Regelschule", ziele: ["Inklusion"], zielgruppe: "Kinder mit und ohne Behinderung, ca. 15+15", aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Inklusion"], offene_luecken: ["Kein gemeinnuetziger Traeger", "Keine formale Kooperationsvereinbarung", "Keine konkreten Aktivitaeten", "Eigenanteil unklar"] }
  },
  expected_forbidden_markers: [
    { marker: "Kooperationsvertrag vom 01.09.2025", description: "User nannte kein Vertragsdatum. Erfundenes Datum waere Halluzination." },
    { marker: "AWO Kreisverband Hannover", description: "User nannte keinen Traeger. AWO als Antragsteller waere eine Halluzination." },
    { marker: "Integrationshelferin 20 Std/Woche", description: "Keine Personalplanung erwaehnt. Spezifische Stellenbezeichnung mit Stunden waere erfunden." },
    { marker: "sozialpädagogische Fachkraft E9", description: "Keine Tarifgruppe erwaehnt. TV-L/TVOED-Eingruppierung waere erfunden." },
    { marker: "Teilhabe-Pauschale 150 EUR", description: "Keine Kostenpauschalen genannt. Spezifischer Betrag waere eine Halluzination." },
    { marker: "Förderbescheid Nr.", description: "Keine Bewilligungsreferenz vorhanden. Jede Bescheid-Nummer waere eine Halluzination." }
  ],
  expected_geber_gruppe: "stiftung",
  notes: "Standard pv-003: Aktion Mensch Schulkooperation, vage Antworten. Schule weiss nicht dass sie nicht antragsberechtigt ist."
};

const pv004 = {
  id: "pv-004",
  category: "hochwertig",
  programmId: "bosch-schulpreis",
  schulProfil: {
    name: "Gesamtschule Friedrichsdorf",
    typ: "gesamtschule",
    bundesland: "Hessen",
    schuelerzahl: 1200,
    besonderheiten: "Externe Evaluation 2022+2024, 0 Abbrecher in 3 Jahren, 18-22 Prozentpunkte ueber Sozialindex-Schnitt"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was macht Ihre Schule als Ganzes besonders? Was wuerden Sie als den Kern Ihres paedagogischen Qualitaetsanspruchs beim Deutschen Schulpreis benennen?" },
    { role: "user", kind: "answer", content: "Wir haben in den letzten 10 Jahren ein System aufgebaut, das Schuelerinnen und Schueler mit sehr unterschiedlichen Voraussetzungen auf vergleichbarem hohen Niveau zum Abschluss bringt. Dokumentiert durch externe Evaluation 2022 und 2024 -- je nach Sozialindex liegen wir 18-22 Prozentpunkte ueber dem Landesschnitt." },
    { role: "ai", kind: "question", content: "Wie gehen Sie konkret mit der Heterogenitaet Ihrer Schuelerschaft um? Welche nachweisbaren Ergebnisse im Bereich Umgang mit Vielfalt koennen Sie belegen?" },
    { role: "user", kind: "answer", content: "Wir nutzen ein differenziertes Kurssystem ab Klasse 7 mit individuellem Feedback-Portfolio fuer jede Schuelerin. Das Portfolio wird halbjaehrlich mit den Eltern besprochen. Rueckmeldeqouten von 94 Prozent bei Elterngespraechen. Kein Schueler verlaesst die Schule ohne Abschluss -- Quote 0 Abbrecher in den letzten 3 Jahren." },
    { role: "ai", kind: "question", content: "Beschreiben Sie kurz die Schulleitung und Verantwortungsstruktur. Wie ist Schueler- und Elternpartizipation institutionell verankert?" },
    { role: "user", kind: "answer", content: "Wir haben einen Schulrat mit echten Entscheidungsrechten, nicht nur beratend. Schuelervertretung waehlt jaehrlich einen Projektfonds von 8.000 EUR, ueber dessen Verwendung sie vollstaendig autonom entscheidet. Elternbeirat ist in allen Gremien stimmberechtigt." },
    { role: "ai", kind: "question", content: "Was wuerden Sie mit dem Preisgeld konkret tun?" },
    { role: "user", kind: "answer", content: "Wir wollen ein Kollegium-Austauschprogramm mit zwei Schulen in Sachsen und Bayern aufbauen. Hospitationswochen, gegenseitige Unterrichtsbeobachtung, gemeinsame Curriculum-Entwicklung im MINT-Bereich. Budget: 45.000 EUR fuer 3 Jahre." }
  ],
  facts: {
    schule: { name: "Gesamtschule Friedrichsdorf", typ: "gesamtschule", bundesland: "Hessen", schuelerzahl: 1200, besonderheiten: "Externe Evaluation 2022+2024, 0 Abbrecher 3 Jahre" },
    projekt: { titel: "Kollegium-Austauschprogramm MINT", kurzbeschreibung: "Hospitationswochen und Curriculum-Entwicklung mit Schulen in Sachsen und Bayern", ziele: ["Qualitaetsentwicklung MINT", "Kollegialer Austausch"], zielgruppe: "Lehrkraefte und Schuelerschaft", aktivitaeten: ["Hospitationswochen", "Unterrichtsbeobachtung", "Curriculum-Entwicklung"], zeitraum: "3 Jahre" },
    wirkung: { erwartete_ergebnisse: ["Staerkung MINT-Unterricht", "Qualitaetstransfer"], messbare_indikatoren: ["Schuelerergebnisse MINT", "Lehrkraft-Feedback"], nachhaltigkeit: "Langfristige Schulpartnerschaft" },
    budget: { beantragt_eur: 45000, eigenmittel_eur: null, hauptposten: ["Reisekosten Hospitationen", "Materialien Curriculum-Entwicklung"] },
    programmpassung: { kriterien_adressiert: ["Leistung messbar belegt", "Umgang mit Vielfalt", "Schulleitung", "Partizipation"], offene_luecken: ["Verantwortungsgemeinschaft noch nicht ausgefuehrt", "Schulleben noch nicht beschrieben"] }
  },
  expected_forbidden_markers: [
    { marker: "Preis des Bundespraesident", description: "Bosch-Schulpreis hat keinen Bezug zum Bundespraesident. Diese Assoziation waere eine Halluzination." },
    { marker: "Robert Bosch Stiftung GmbH Aktenzeichen", description: "Kein Aktenzeichen-Prozess im Schulpreis-Kontext. Erfundenes Aktenzeichen waere Halluzination." },
    { marker: "Juryprotokoll vom", description: "Kein Juryprotokoll-Datum erwaehnt. Erfundenes Datum waere Halluzination." },
    { marker: "Auszeichnung 2019", description: "Kein historischer Preis erwaehnt. Erfundenes Auszeichnungsjahr waere Halluzination." },
    { marker: "Schulentwicklungsplan §", description: "Kein Paragraphen-Bezug zum Schulentwicklungsplan erwaehnt. Paragraphen-Referenz waere erfunden." }
  ],
  expected_geber_gruppe: "wirtschaftspreis",
  notes: "Standard pv-004: Bosch-Schulpreis, hochwertige Antworten. Marker fokussieren auf typische Preiskontext-Halluzinationen."
};

const pv005 = {
  id: "pv-005",
  category: "mittel",
  programmId: "erasmus-schule-2026",
  schulProfil: {
    name: "Realschule Tuebingen-Lustnau",
    typ: "realschule",
    bundesland: "Baden-Wuerttemberg",
    schuelerzahl: 450,
    besonderheiten: "Englisch- und Franzoesisch-Profil, Brieffreundschaft mit franz. Schule seit 2018"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was soll Ihr Erasmus+-Projekt konkret umsetzen -- einen Schueleraustausch, eine Lehrermobilitaet oder eine Schulpartnerschaft?" },
    { role: "user", kind: "answer", content: "Wir haben schon eine Brieffreundschaft mit einer Schule in Frankreich, so seit 2018. Jetzt wollen wir mal echte Begegnungen machen, also Schueler hinschicken und welche empfangen." },
    { role: "ai", kind: "question", content: "Wie viele Schuelerinnen und Schueler sollen am Austausch teilnehmen, und fuer welche Jahrgaenge ist das geplant?" },
    { role: "user", kind: "answer", content: "So 15 bis 20, wahrscheinlich die Klassen 8 und 9. Genau wissen wir das noch nicht." },
    { role: "ai", kind: "question", content: "Haben Sie bereits einen EU-Login und Erasmus+ schon frueher beantragt?" },
    { role: "user", kind: "answer", content: "Ich glaube wir haben da mal irgendwas gemacht, vor ein paar Jahren. Aber das war ein anderer Kollege, der ist jetzt nicht mehr da. Ob wir noch einen Login haben weiss ich nicht." },
    { role: "ai", kind: "question", content: "Was ist der konkrete Lerninhalt des Austauschs -- welches europaeische Thema soll das Projekt haben?" },
    { role: "user", kind: "answer", content: "Nachhaltigkeit vielleicht? Das ist ja immer gut. Oder einfach gegenseitiges Kennenlernen und Sprachkompetenz staerken." }
  ],
  facts: {
    schule: { name: "Realschule Tuebingen-Lustnau", typ: "realschule", bundesland: "Baden-Wuerttemberg", schuelerzahl: 450, besonderheiten: "Brieffreundschaft mit franz. Schule seit 2018" },
    projekt: { titel: null, kurzbeschreibung: "Schueleraustausch mit franzoesischer Partnerschule", ziele: ["Sprachkompetenz", "Europaeische Begegnung"], zielgruppe: "Klassen 8 und 9, ca. 15-20 Schueler", aktivitaeten: ["Gegenseitiger Besuch"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: ["Sprachkompetenzstaerkung"], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Bestehende Partnerschaft", "Sprachlicher Austausch"], offene_luecken: ["EU-Login-Status unklar", "Kein konkreter Lerninhalt/SDG", "Keine Inklusionskomponente erwaehnt"] }
  },
  expected_forbidden_markers: [
    { marker: "OID E10", description: "Erasmus+ OID-Nummern sind institutionsspezifisch und wurden nicht genannt. Erfundene OID waere Halluzination." },
    { marker: "Lycée Victor Hugo", description: "Kein Name der franzoesischen Partnerschule genannt. Erfundener Schulname waere Halluzination." },
    { marker: "Nationale Agentur Bescheid vom", description: "Kein NA-Bescheid oder Datum erwaehnt. Erfundenes Bescheiddatum waere Halluzination." },
    { marker: "KA121-SCH", description: "Keine Antragsart spezifiziert. KA121/KA122-Zuordnung waere ohne Nutzerangabe Halluzination." },
    { marker: "Foerdersatz 70 EUR pro Reisetag", description: "Keine spezifischen Tagessaetze genannt. Reisetag-Foerdersatz aus Programmleitfaden waere ohne Kontext Halluzination." }
  ],
  expected_geber_gruppe: "eu",
  notes: "Standard pv-005: Erasmus+ Schule 2026, mittlere Qualitaet. Bestehende Partnerschaft vorhanden, aber formale Anforderungen unklar."
};

const pv006 = {
  id: "pv-006",
  category: "vag",
  programmId: "erasmus-schulentwicklung",
  schulProfil: {
    name: "Berufsschule Hamburg-Harburg",
    typ: "berufsschule",
    bundesland: "Hamburg",
    schuelerzahl: 800,
    besonderheiten: "Technische Berufsfelder, kaum Erfahrung mit EU-Programmen"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist der Hauptentwicklungsbedarf Ihrer Schule, den Sie mit dem Erasmus+-Schulentwicklungsprojekt angehen moechten?" },
    { role: "user", kind: "answer", content: "Wir muessen uns irgendwie modernisieren. Digital und so. Und vielleicht auch internationaler werden." },
    { role: "ai", kind: "question", content: "Das Erasmus+-Schulentwicklungsprojekt erfordert mindestens 6 Partnerorganisationen aus mehreren EU-Laendern. Haben Sie schon Kontakt zu auslaendischen Schulen?" },
    { role: "user", kind: "answer", content: "Nein, noch nicht. Koennen die nicht selbst Partner finden? Oder gibt es da eine Liste?" },
    { role: "ai", kind: "question", content: "Antragsberechtigt als Koordinator sind laut Programm lokale Schulbehoerden. Waere die Hamburger Schulbehoerde bereit, den Antrag zu koordinieren?" },
    { role: "user", kind: "answer", content: "Das weiss ich nicht. Die Schulbehoerde? Keine Ahnung ob die sowas machen. Ich dachte wir koennen das selbst einreichen." },
    { role: "ai", kind: "question", content: "Das Projektvolumen betraegt pauschal 400.000 EUR ueber 36 Monate. Koennen Sie ein konkretes Entwicklungsziel benennen?" },
    { role: "user", kind: "answer", content: "400.000 klingt viel. Keine Ahnung was wir damit machen wuerden. Vielleicht Fortbildungen? Weiss nicht." }
  ],
  facts: {
    schule: { name: "Berufsschule Hamburg-Harburg", typ: "berufsschule", bundesland: "Hamburg", schuelerzahl: 800, besonderheiten: "Technische Berufsfelder, kein EU-Projekterfahrung" },
    projekt: { titel: null, kurzbeschreibung: "Allgemeine Schulentwicklung / Digitalisierung", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Kein Koordinator benannt", "Keine Partnerorganisationen", "Kein konkretes Entwicklungsziel"] }
  },
  expected_forbidden_markers: [
    { marker: "Bezirkliches Bildungszentrum Hamburg", description: "Kein Name einer Koordinierungsstelle genannt. Erfundene Institution waere Halluzination." },
    { marker: "KA240-SCH Antragsnummer", description: "Keine Antragsnummer vorhanden. Erfundene EU-Antragsnummer waere Halluzination." },
    { marker: "Partnerschule in Estland", description: "Keine Partnerschule erwaehnt. Erfundene Laender-Zuordnung waere Halluzination." },
    { marker: "EU-Login PIC", description: "Keine PIC-Nummer bekannt. PIC-Nummer waere erfunden." },
    { marker: "Berufsbildungszentrum Tampere", description: "Kein auslaendischer Partnername genannt. Tampere als erfundener EU-Partner waere Halluzination." },
    { marker: "Qualitaetssicherungsbeauftragter", description: "Keine Personalstruktur beschrieben. Erfundene Rollenbenennung waere Halluzination." }
  ],
  expected_geber_gruppe: "eu",
  notes: "Standard pv-006: Erasmus+ Schulentwicklung, vage Antworten. Schule kennt die Programmstruktur nicht."
};

korpus.push(pv002, pv003, pv004, pv005, pv006);
writeFileSync("data/eval/pipeline-korpus.json", JSON.stringify(korpus, null, 2));
console.log("Entries now:", korpus.length);
