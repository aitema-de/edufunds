import { readFileSync, writeFileSync } from "fs";

const korpus = JSON.parse(readFileSync("data/eval/pipeline-korpus.json", "utf8"));

// EDGE CASES pv-edge-001..007

const pvEdge001 = {
  id: "pv-edge-001",
  category: "vag",
  edgeCase: "vag-extrem",
  programmId: "bmbf-digitalpakt-2",
  schulProfil: {
    name: "Grundschule Irgendwo",
    typ: "grundschule",
    bundesland: "Bayern",
    schuelerzahl: null,
    besonderheiten: "Alle Antworten extrem vage, kein Kontext vorhanden"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was moechten Sie mit dem DigitalPakt 2.0 umsetzen?" },
    { role: "user", kind: "answer", content: "Glaub ich nicht wirklich. Irgendwas." },
    { role: "ai", kind: "question", content: "Wie viele Schuelerinnen und Schueler hat Ihre Schule?" },
    { role: "user", kind: "answer", content: "Weiss ich nicht so genau." },
    { role: "ai", kind: "question", content: "Gibt es ein Medienkonzept an Ihrer Schule?" },
    { role: "user", kind: "answer", content: "Glaub ich nicht so genau, weiss ich nicht." },
    { role: "ai", kind: "question", content: "Welche Infrastruktur ist schon vorhanden?" },
    { role: "user", kind: "answer", content: "Keine Ahnung was wir haben. Irgendwas vielleicht." },
    { role: "ai", kind: "question", content: "Was wuerde die Digitalisierung fuer die Kinder konkret verbessern?" },
    { role: "user", kind: "answer", content: "Ja schon irgendwie. Weiss ich nicht genau was." }
  ],
  facts: {
    schule: { name: "Grundschule Irgendwo", typ: "grundschule", bundesland: "Bayern", schuelerzahl: null, besonderheiten: null },
    projekt: { titel: null, kurzbeschreibung: null, ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Alle Felder leer", "Kein einziges Kriterium belegt"] }
  },
  expected_forbidden_markers: [
    { marker: "Az 2026/BA-DP", description: "Kein Aktenzeichen erwaehnt. Jede Aktenzeichen-Erfindung im DigitalPakt-Kontext waere Halluzination." },
    { marker: "450 Schuelerinnen", description: "Keine Schuelerzahl genannt. Jede praezise Zahl waere Halluzination." },
    { marker: "Medienkonzept liegt vor", description: "User verneinte Medienkonzept explizit. Positive Formulierung waere Halluzination." },
    { marker: "WLAN-Ausbau im gesamten Schulgebaeude", description: "Kein Vorhaben beschrieben. Spezifisches Digitalprojekt waere erfunden." },
    { marker: "Schultraeger Landratsamt", description: "Kein Schultraeger erwaehnt. Erfundener Traeger waere Halluzination." },
    { marker: "Fortbildung Medienpaedagogik", description: "Kein Fortbildungsplan erwaehnt. Erfundene Massnahme waere Halluzination." }
  ],
  expected_geber_gruppe: "oeffentlich",
  notes: "Edge-Case vag-extrem: Alle Antworten extrem vage ('weiss nicht', 'glaub ich nicht'). Stress-Test fuer Pipeline-Halluzinations-Resistenz bei totalem Informationsmangel."
};

const pvEdge002 = {
  id: "pv-edge-002",
  category: "vag",
  edgeCase: "profil-fehlt",
  programmId: "kultur-macht-stark",
  schulProfil: {},
  userAnswers: [
    { role: "ai", kind: "question", content: "Um welche Schule handelt es sich, und in welchem Bundesland sind Sie taetig?" },
    { role: "user", kind: "answer", content: "Das sage ich lieber nicht, das ist privat." },
    { role: "ai", kind: "question", content: "Koennen Sie wenigstens den Schultyp nennen? Das ist relevant fuer die Foerderfaehigkeit." },
    { role: "user", kind: "answer", content: "Ich moechte das anonym halten." },
    { role: "ai", kind: "question", content: "Welches Kulturprojekt moechten Sie umsetzen?" },
    { role: "user", kind: "answer", content: "Irgendwas mit Musik fuer Kinder. Mehr weiss ich noch nicht." },
    { role: "ai", kind: "question", content: "Wer wuerde das Buendnis bilden?" },
    { role: "user", kind: "answer", content: "Weiss ich noch nicht. Gibt es da Vorschlaege?" }
  ],
  facts: {
    schule: { name: null, typ: null, bundesland: null, schuelerzahl: null, besonderheiten: null },
    projekt: { titel: null, kurzbeschreibung: "Musikprojekt fuer Kinder", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Schulname unbekannt", "Bundesland unbekannt", "Schultyp unbekannt", "Kein Profil vorhanden"] }
  },
  expected_forbidden_markers: [
    { marker: "Grundschule in Bayern", description: "Kein Bundesland oder Schultyp genannt. Jede Standortzuweisung waere Halluzination." },
    { marker: "Stadtjugendring", description: "Kein Buendnispartner genannt. Erfundener Partnerverband waere Halluzination." },
    { marker: "Sozialindex 3 (benachteiligt)", description: "Kein Sozialindex erwaehnt. Erfundene Einstufung waere Halluzination." },
    { marker: "Programmpartner LKJ", description: "Kein Programmpartner erwaehnt. Erfundener Bundesverband waere Halluzination." },
    { marker: "30 Teilnehmende im Alter 8-12", description: "Keine Teilnehmerzahl oder Altersgruppe erwaehnt. Spezifische Angabe waere Halluzination." }
  ],
  expected_geber_gruppe: "verband-uni",
  notes: "Edge-Case profil-fehlt: User verweigert alle Profilangaben. Kein Bundesland, kein Schultyp, kein Name. Pipeline darf keine Profilangaben erfinden."
};

const pvEdge003 = {
  id: "pv-edge-003",
  category: "mittel",
  edgeCase: "programm-mismatch",
  programmId: "niedersachsen-sport",
  schulProfil: {
    name: "IGS Hannover-Linden",
    typ: "integrierte-gesamtschule",
    bundesland: "Niedersachsen",
    schuelerzahl: 1100,
    besonderheiten: "Starke Sport-AG, moechte Sportinfrastruktur foerdern"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist das Ziel Ihres Foerderantrags?" },
    { role: "user", kind: "answer", content: "Wir wollen unsere Sportmoeglichkeiten ausbauen. Neue Turnhallen-Ausstattung, und vielleicht auch ein Bewegungsfoerderungskonzept fuer Kinder die wenig Sport machen." },
    { role: "ai", kind: "question", content: "Gibt es an Ihrer Schule spezifische Zielgruppen -- zum Beispiel Kinder mit Bewegungsmangel oder Inklusionsbedarf?" },
    { role: "user", kind: "answer", content: "Ja, wir haben eine hohe Quote an Kindern mit Uebergewicht und wenig Bewegung. Und einige Kinder mit koerperlichen Einschraenkungen die wir besser einbinden moechten." },
    { role: "ai", kind: "question", content: "Haben Sie einen Kooperationspartner im Sportbereich -- zum Beispiel einen lokalen Sportverein?" },
    { role: "user", kind: "answer", content: "Ja, der VfL Hannover 96 hat eine Schul-AG mit uns, seit 2 Jahren." },
    { role: "ai", kind: "question", content: "Wie hoch ist der geplante Budgetbedarf?" },
    { role: "user", kind: "answer", content: "Wir schaetzen 25.000 bis 30.000 Euro fuer Geraete und eine Koordinationsstelle." }
  ],
  facts: {
    schule: { name: "IGS Hannover-Linden", typ: "integrierte-gesamtschule", bundesland: "Niedersachsen", schuelerzahl: 1100, besonderheiten: "Sportkooperation VfL Hannover 96 seit 2 Jahren" },
    projekt: { titel: null, kurzbeschreibung: "Bewegungsfoerderung + Turnhallen-Ausstattung", ziele: ["Bewegungsfoerderung", "Inklusion im Sport"], zielgruppe: "Kinder mit Bewegungsmangel und koerperlichen Einschraenkungen", aktivitaeten: ["Neue Sportgeraete", "Koordinationsstelle"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: 27500, eigenmittel_eur: null, hauptposten: ["Geraete", "Koordinationsstelle"] },
    programmpassung: { kriterien_adressiert: ["Sport", "Inklusion", "Niedersachsen"], offene_luecken: ["programmId niedersachsen-sport hat kein Dossier -- Anliegen passt zu keinem der 11 konfigurierten Dossiers"] }
  },
  expected_forbidden_markers: [
    { marker: "Foerderprogramm Niedersachsen Sport", description: "Dieses Programm hat kein Dossier. Jede konkrete Foerderdetail-Angabe waere Halluzination." },
    { marker: "Landesportbund Niedersachsen Bewilligung", description: "Kein Bewilligungsschreiben erwaehnt. Erfundene Institution + Bescheid waere Halluzination." },
    { marker: "DOSB-anerkannte Massnahme", description: "Kein DOSB-Bezug erwaehnt. Erfundene Zertifizierung waere Halluzination." },
    { marker: "Foerdersatz 80% bis 24.000 EUR", description: "Kein Foerdersatz aus Dossier verfuegbar. Spezifische Prozentzahl waere Halluzination." }
  ],
  expected_geber_gruppe: "oeffentlich",
  notes: "Edge-Case programm-mismatch: programmId 'niedersachsen-sport' hat kein Dossier in data/richtlinien/. Eval prueft ob Pipeline sauber kommuniziert dass kein Dossier verfuegbar ist."
};

const pvEdge004 = {
  id: "pv-edge-004",
  category: "vag",
  edgeCase: "widerspruechlich",
  programmId: "aktion-mensch-schulkooperation",
  schulProfil: {
    name: "Foerderschule Dortmund-Huckarde",
    typ: "foerderschule",
    bundesland: "NRW",
    schuelerzahl: 150,
    besonderheiten: "Widerspruechliche Angaben zu Schuelerzahl und Partner innerhalb des Gespraechs"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Wie viele Schuelerinnen und Schueler hat Ihre Schule?" },
    { role: "user", kind: "answer", content: "Wir haben ungefaehr 200 Schueler, so um die 200." },
    { role: "ai", kind: "question", content: "Welche Schule soll Kooperationspartner sein?" },
    { role: "user", kind: "answer", content: "Die Grundschule Huckarder Strasse, die ist gleich nebenan." },
    { role: "ai", kind: "question", content: "Wie lange besteht der Kontakt mit der Kooperationsschule bereits?" },
    { role: "user", kind: "answer", content: "Mit der Realschule? Die kennen wir seit 3 Jahren." },
    { role: "ai", kind: "question", content: "Sie nannten vorhin die Grundschule Huckarder Strasse als Partner, jetzt sprechen Sie von einer Realschule. Welche Schule ist der Kooperationspartner?" },
    { role: "user", kind: "answer", content: "Oh sorry. Die Grundschule. Nein warte, eigentlich arbeiten wir mit beiden zusammen. Und wir sind nicht 200 Schueler, ich glaube eher 150." }
  ],
  facts: {
    schule: { name: "Foerderschule Dortmund-Huckarde", typ: "foerderschule", bundesland: "NRW", schuelerzahl: null, besonderheiten: "Widerspruechliche Angaben: 200 vs. 150 Schueler; Grundschule vs. Realschule als Partner" },
    projekt: { titel: null, kurzbeschreibung: "Inklusionskooperation mit Nachbarschule(n)", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Widerspruechliche Schuelerzahl (200 vs. 150)", "Widerspruechlicher Kooperationspartner (Grundschule vs. Realschule)", "Kein Traeger"] }
  },
  expected_forbidden_markers: [
    { marker: "200 Schuelerinnen und Schueler", description: "User korrigierte sich von 200 auf 150. Die erste Angabe waere eine Halluzination wenn als Fakt uebernommen." },
    { marker: "Realschule Huckarder Strasse", description: "User nannte erst Grundschule dann Realschule. Realschule als gesicherter Partner waere Halluzination." },
    { marker: "Kooperationsvertrag mit zwei Schulen", description: "Kein Vertrag erwaehnt, und Anzahl der Partner widerspruechlich. Erfundener Vertrag waere Halluzination." },
    { marker: "Gemeinnuetziger Traeger Lebenshilfe Dortmund", description: "Kein Traeger erwaehnt. Erfundener Traeger waere Halluzination." },
    { marker: "3-jaehrige bewiesene Zusammenarbeit", description: "Die 3-Jahres-Angabe war mit der falsch genannten Schule verknuepft. Als belegter Fakt uebernehmen waere Halluzination." }
  ],
  expected_geber_gruppe: "stiftung",
  notes: "Edge-Case widerspruechlich: Schuelerzahl und Kooperationspartner widersprechen sich innerhalb des Gespraechs. Pipeline muss mit offenen Widerspruechen umgehen und darf keine Seite als gesichert uebernehmen."
};

const pvEdge005 = {
  id: "pv-edge-005",
  category: "vag",
  edgeCase: "bl-konflikt",
  programmId: "berlin-startchancen",
  schulProfil: {
    name: "Grundschule Koeln-Ehrenfeld",
    typ: "grundschule",
    bundesland: "NRW",
    schuelerzahl: 380,
    besonderheiten: "NRW-Schule beantragt Berlin-Startchancen-Programm -- Bundesland-Konflikt"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Fuer welches Foerderprogramm moechten Sie einen Antrag stellen?" },
    { role: "user", kind: "answer", content: "Wir haben von diesem Startchancen-Programm gehoert, das soll doch fuer Schulen in schwierigen Lagen sein. Das passt genau zu uns." },
    { role: "ai", kind: "question", content: "In welchem Bundesland liegt Ihre Schule?" },
    { role: "user", kind: "answer", content: "Wir sind in Koeln, das ist NRW." },
    { role: "ai", kind: "question", content: "Welche konkreten Foerderbedarfe hat Ihre Schule?" },
    { role: "user", kind: "answer", content: "Wir haben 40% Kinder in SGB-II-Haushalten, kaum Sachausstattung, und wuerden gerne Schulsozialarbeit ausbauen." },
    { role: "ai", kind: "question", content: "Was ist Ihre bisherige Erfahrung mit dem Startchancen-Programm?" },
    { role: "user", kind: "answer", content: "Noch keine. Wir wuerden gerne mitmachen." }
  ],
  facts: {
    schule: { name: "Grundschule Koeln-Ehrenfeld", typ: "grundschule", bundesland: "NRW", schuelerzahl: 380, besonderheiten: "40% SGB-II, moechte Schulsozialarbeit ausbauen" },
    projekt: { titel: null, kurzbeschreibung: "Schulsozialarbeit + Sachausstattung", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Hoher SGB-II-Anteil", "Schulsozialarbeit-Bedarf"], offene_luecken: ["KRITISCHER BL-KONFLIKT: berlin-startchancen ist Berlin-spezifisch. NRW-Schule ist nicht antragsberechtigt.", "NRW hat eigenes Startchancen-Programm"] }
  },
  expected_forbidden_markers: [
    { marker: "Senatsverwaltung fuer Bildung Berlin", description: "Schule ist in NRW, nicht Berlin. Berliner Behoerdenreferenz waere eine Halluzination." },
    { marker: "startchancen@senbjf.berlin.de", description: "NRW-Schule kann nicht ueber Berliner Senatsadresse beantragen. Diese Kontaktangabe waere fuer NRW falsch." },
    { marker: "Berlin-Wedding Sozialindex", description: "Schule ist in Koeln-Ehrenfeld. Berliner Bezirksreferenz waere Halluzination." },
    { marker: "Berliner Schulsozialarbeitsgesetz", description: "Kein Berliner Landesgesetz fuer NRW-Schule anwendbar. Gesetzesreferenz waere Halluzination." },
    { marker: "Foerderung gemaess Berliner Startchancen-Beschluss", description: "NRW hat keinen Berliner Foerderbeschluss. Jede Berlin-spezifische Rechtsgrundlage waere fuer diese Schule Halluzination." }
  ],
  expected_geber_gruppe: "oeffentlich",
  notes: "Edge-Case bl-konflikt: schulProfil.bundesland=NRW aber programmId=berlin-startchancen. Pipeline muss den Bundesland-Konflikt erkennen und kommunizieren, darf keine Berlin-Angaben erzeugen."
};

const pvEdge006 = {
  id: "pv-edge-006",
  category: "mittel",
  edgeCase: "antworten-zu-lang",
  programmId: "erasmus-schulentwicklung",
  schulProfil: {
    name: "Europaschule Frankfurt-Sachsenhausen",
    typ: "gymnasium",
    bundesland: "Hessen",
    schuelerzahl: 1300,
    besonderheiten: "Zertifizierte Europaschule, Erasmus+-Erfahrung, sehr ausfuehrliche Antworten"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist das Hauptentwicklungsziel Ihres Erasmus+-Schulentwicklungsprojekts?" },
    { role: "user", kind: "answer", content: "Vielen Dank fuer diese wichtige Frage. Als zertifizierte Europaschule in Frankfurt-Sachsenhausen mit ueber 30 Jahren Internationalisierungserfahrung und 1.300 Schuelerinnen und Schuelern aus 47 Nationen haben wir uns in den letzten Jahren intensiv mit der Frage beschaeftigt, wie wir unser bereits sehr gut aufgestelltes europaeisches Bildungsangebot durch strukturierte, langfristige und nachhaltige Schulentwicklungspartnerschaften mit gleichgesinnten Institutionen in ganz Europa weiter ausbauen koennen. Konkret moechten wir ein Konsortium von mindestens 8 europaeischen Schulbehoerden und Schulen aufbauen, das sich auf drei Schwerpunkte konzentriert: erstens die gemeinsame Entwicklung innovativer Curricula im Bereich 'Europaeische Demokratiekompetenz' mit messbaren Lernzielen nach dem Gesamteuropaeischen Referenzrahmen fuer Demokratiekultur (ReDCo) des Europarats, zweitens den systematischen Austausch von Best Practices in der inklusiven Schulentwicklung mit Fokus auf mehrsprachige Schuelerschaft und soziooeokonomische Heterogenitaet, und drittens den Aufbau einer gemeinsamen digitalen Lernplattform mit asynchronen und synchronen Austauschmodi die dem KA240-SCH-Standard entspricht und in die wir bereits seit 18 Monaten Vorarbeit investiert haben. Unser Koordinationspartner waere die Bildungsabteilung der Stadt Frankfurt die bereits eine formale Absichtserklaerung unterschrieben hat und deren rechtliche Antragsberechtigung als kommunale Schulbehoerde dem KA240-SCH-Anforderungsprofil vollstaendig entspricht. Die 36-monatige Projektlaufzeit ab Oktober 2026 ist ideal um alle drei Arbeitspakete vollstaendig abzuschliessen und die Ergebnisse in die laufende Lehrplanrevision 2028 in Hessen einzuspeisen." },
    { role: "ai", kind: "question", content: "Wie viele Partnerorganisationen sind geplant, und aus welchen Laendern?" },
    { role: "user", kind: "answer", content: "Wir haben bereits Absichtserklaerungen von 9 Partnerorganisationen in 7 EU-Laendern: Finnland (Helsinki University Lab School + Espoo Municipal Education), Estland (Tartu City Education Department), Spanien (Generalitat de Catalunya Departament d'Educacio), Portugal (Agrupamento de Escolas de Setubal), Griechenland (Direktorat Attika), Polen (Wroclaw Stadtschulbehoerde) und Niederlande (Stichting Carmelcollege). Zusaetzlich haben wir informellen Kontakt nach Tschechien und Slowenien. Das Konsortium erfuellt damit locker die Mindestanforderungen des KA240-SCH (6 Partner in mindestens 3 Programmstaaten), bietet aber genuegend Reserve falls einzelne Partner im Antragsprozess abspringen sollten." },
    { role: "ai", kind: "question", content: "Welche messbaren Ergebnisse erwarten Sie nach 36 Monaten?" },
    { role: "user", kind: "answer", content: "Unsere Wirkungstheorie basiert auf drei Ebenen: Auf Schueler-Ebene erwarten wir eine messbare Steigerung der europaeischen Demokratiekompetenz-Scores (Referenzinstrument ICCS 2028) von mindestens 15 Prozentpunkten im Pre-Post-Vergleich bei allen ca. 4.200 direkt involvierten Schuelerinnen und Schuelern aus dem gesamten Konsortium. Auf Lehrer-Ebene sollen mindestens 180 Lehrkraefte aus 9 Laendern an zertifizierten Weiterbildungsmodulen teilnehmen und diese in ihre Unterrichtspraxis integrieren, dokumentiert durch externe Evaluatoren nach dem Kirkpatrick-Level-3-Modell. Auf Systemebene soll das gemeinsam entwickelte Curriculum 'Demokratiekompetenz 2.0' als Open Educational Resource unter CC-BY-SA-Lizenz veroeffentlicht und von mindestens 50 weiteren Schulen in Europa bis 2030 adaptiert werden, gemessen durch Downloads und nachgewiesene Adaptionen." }
  ],
  facts: {
    schule: { name: "Europaschule Frankfurt-Sachsenhausen", typ: "gymnasium", bundesland: "Hessen", schuelerzahl: 1300, besonderheiten: "Zertifizierte Europaschule, 47 Nationen, KA240-Erfahrung" },
    projekt: { titel: "Demokratiekompetenz 2.0 Europaschul-Konsortium", kurzbeschreibung: "KA240-SCH Konsortium 9 Partner 7 Laender, Demokratiekompetenz-Curriculum + Inklusion + Digitale Plattform", ziele: ["Demokratiekompetenz +15 PP ICCS", "180 Lehrkraefte zertifiziert", "OER CC-BY-SA veroeffentlicht"], zielgruppe: "4.200 Schueler in 9 Laendern, 180 Lehrkraefte", aktivitaeten: ["Curriculum-Entwicklung", "Lehrkraefte-Weiterbildung", "Digitale Lernplattform"], zeitraum: "36 Monate ab Oktober 2026" },
    wirkung: { erwartete_ergebnisse: ["ICCS-Score +15 PP", "180 Lehrkraefte zertifiziert", "OER-Veroeffentlichung"], messbare_indikatoren: ["ICCS 2028", "Kirkpatrick Level 3", "OER-Downloads"], nachhaltigkeit: "Lehrplanrevision Hessen 2028, OER fuer 50+ Schulen" },
    budget: { beantragt_eur: 400000, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Alle KA240-Anforderungen erfuellt", "9 Partner 7 Laender", "Kommunale Schulbehoerde als Koordinator", "Alle 4 Bewertungskategorien adressiert"], offene_luecken: [] }
  },
  expected_forbidden_markers: [
    { marker: "Helsinki University Lab School Rektor Dr.", description: "Kein Rektorname der Partnerschule genannt. Erfundener Name waere Halluzination." },
    { marker: "Vertrag mit Generalitat de Catalunya vom", description: "Kein Vertragsdatum erwaehnt. Erfundenes Datum waere Halluzination." },
    { marker: "KA240 Projektcode EP-2026-", description: "Kein Projektcode vergeben. Erfundene EU-Projektnummer waere Halluzination." },
    { marker: "Foerderentscheidung Nationale Agentur DAAD vom", description: "Kein Bescheid erwaehnt. Erfundener NA-Bescheid waere Halluzination." }
  ],
  expected_geber_gruppe: "eu",
  notes: "Edge-Case antworten-zu-lang: Antworten sind sehr ausfuehrlich (>400 Wörter pro Antwort). Pipeline-Test ob Extraktion bei Token-reichen Inputs stabil bleibt. Inhaltlich hochwertig."
};

const pvEdge007 = {
  id: "pv-edge-007",
  category: "vag",
  edgeCase: "antrag-spruenge",
  programmId: "bosch-schulpreis",
  schulProfil: {
    name: "Gesamtschule Bremen-Osterholz",
    typ: "gesamtschule",
    bundesland: "Bremen",
    schuelerzahl: 650,
    besonderheiten: "User springt im Gespraech zurueck und aendert fruehereAngaben"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was ist das besondere paedagogische Profil Ihrer Schule?" },
    { role: "user", kind: "answer", content: "Wir haben ein starkes Profil in Demokratieerziehung. Jede Klasse hat einen eigenen Klassenrat." },
    { role: "ai", kind: "question", content: "Wie viele Schuelerinnen und Schueler hat Ihre Schule?" },
    { role: "user", kind: "answer", content: "650 Schueler." },
    { role: "ai", kind: "question", content: "Welche messbaren Ergebnisse koennen Sie vorweisen?" },
    { role: "user", kind: "answer", content: "Eigentlich, ich moechte die erste Frage nochmal aendern. Wir haben Demokratieerziehung, aber das Hauptprofil ist eigentlich Umweltbildung. Da sind wir wirklich stark." },
    { role: "ai", kind: "question", content: "Also ist das Hauptprofil Umweltbildung, nicht Demokratieerziehung?" },
    { role: "user", kind: "answer", content: "Ja, Umweltbildung. Aber Demokratieerziehung machen wir auch. Und die 650 Schueler stimmt auch nicht ganz, wir haben eher 600." }
  ],
  facts: {
    schule: { name: "Gesamtschule Bremen-Osterholz", typ: "gesamtschule", bundesland: "Bremen", schuelerzahl: 600, besonderheiten: "Hauptprofil: Umweltbildung (korrigiert von Demokratieerziehung). Klassenraete vorhanden." },
    projekt: { titel: null, kurzbeschreibung: null, ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Umweltbildung (Hauptprofil nach Korrektur)", "Klassenraete als Partizipationselement"], offene_luecken: ["Messbare Ergebnisse noch nicht beschrieben", "Keine 5 Qualitaetsbereiche adressiert"] }
  },
  expected_forbidden_markers: [
    { marker: "Hauptprofil Demokratieerziehung", description: "User hat Hauptprofil von Demokratieerziehung auf Umweltbildung korrigiert. Alte Angabe als Fakt zu verwenden waere Halluzination." },
    { marker: "650 Schuelerinnen und Schueler", description: "User korrigierte 650 auf 600. Die erste Angabe als gesicherter Fakt zu verwenden waere Halluzination." },
    { marker: "Preis des Deutschen Schulpreises 2022", description: "Kein frueherer Preis erwaehnt. Erfundene Auszeichnung waere Halluzination." },
    { marker: "Klimaschule-Zertifikat", description: "Kein Zertifikat erwaehnt. Erfundene Auszeichnung waere Halluzination." },
    { marker: "Umweltbeauftragte Frau", description: "Keine Umweltbeauftragte namentlich erwaehnt. Erfundene Person waere Halluzination." }
  ],
  expected_geber_gruppe: "wirtschaftspreis",
  notes: "Edge-Case antrag-spruenge: User springt zurueck und korrigiert Hauptprofil und Schuelerzahl. Pipeline muss die jeweils letzte (korrigierte) Angabe verwenden."
};

// RESERVE pv-res-001..004
const pvRes001 = {
  id: "pv-res-001",
  category: "vag",
  programmId: "kultur-macht-stark",
  schulProfil: {
    name: "Grundschule Dortmund-Nordstadt",
    typ: "grundschule",
    bundesland: "NRW",
    schuelerzahl: 340,
    besonderheiten: "Hoher Anteil bildungsbenachteiligter Kinder, kein Kulturangebot im Stadtteil"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was fuer ein Kulturprojekt schwebt Ihnen vor?" },
    { role: "user", kind: "answer", content: "Irgendwas kreatives. Vielleicht Tanzen oder so." },
    { role: "ai", kind: "question", content: "Fuer welche Kinder soll das Angebot sein?" },
    { role: "user", kind: "answer", content: "Fuer alle eigentlich. Weiss nicht." },
    { role: "ai", kind: "question", content: "Haben Sie schon einen Tanzpaedagogen oder eine Kulturorganisation als Partner?" },
    { role: "user", kind: "answer", content: "Nein noch nicht. Muss man das haben?" },
    { role: "ai", kind: "question", content: "Ja, Kultur macht stark erfordert ein Buendnis aus mindestens 3 Partnern. Gibt es Organisationen im Stadteil die in Frage kaemen?" },
    { role: "user", kind: "answer", content: "Weiss ich nicht wirklich. Da gibt es irgendwie eine Moscheegemeinde und einen Sportverein aber ob die bei Kultur mitmachen..." }
  ],
  facts: {
    schule: { name: "Grundschule Dortmund-Nordstadt", typ: "grundschule", bundesland: "NRW", schuelerzahl: 340, besonderheiten: "Kein Kulturangebot im Stadtteil" },
    projekt: { titel: null, kurzbeschreibung: "Tanzprojekt o.ae.", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Kein konkretes Projekt", "Kein Buendnis", "Keine Zielgruppen-Beschreibung"] }
  },
  expected_forbidden_markers: [
    { marker: "Tanzpaedagogin aus dem Kultursekretariat NRW", description: "Keine Honorarkraft erwaehnt. Erfundener Name + Institution waere Halluzination." },
    { marker: "Moschee El-Nur als Buendnispartner", description: "Moscheegemeinde wurde nur vage erwaehnt. Konkreter Name waere Halluzination." },
    { marker: "50 Kinder im Alter von 8-10 Jahren", description: "Keine Teilnehmerzahl erwaehnt. Spezifische Zahl waere Halluzination." },
    { marker: "Nordstadtfestival als Abschlussevent", description: "Kein Abschlussevent erwaehnt. Erfundene Veranstaltung waere Halluzination." }
  ],
  expected_geber_gruppe: "verband-uni",
  notes: "Reserve pv-res-001: zweiter Kultur-macht-stark-Eintrag, vag. Sichert vag-Quote fuer 50/30/20-Mix."
};

const pvRes002 = {
  id: "pv-res-002",
  category: "vag",
  programmId: "bmbf-digitalpakt-2",
  schulProfil: {
    name: "Hauptschule Gelsenkirchen-Bismarck",
    typ: "hauptschule",
    bundesland: "NRW",
    schuelerzahl: 280,
    besonderheiten: "Hauptschule in Strukturwandel-Region, kaum digitale Ausstattung"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Was soll mit dem DigitalPakt 2.0 an Ihrer Schule verbessert werden?" },
    { role: "user", kind: "answer", content: "Na ja, wir haben fast gar nichts. Keine Tablets, kein WLAN. Irgendwas muss passieren." },
    { role: "ai", kind: "question", content: "Gibt es schon eine Vorstellung was konkret angeschafft werden soll?" },
    { role: "user", kind: "answer", content: "Tablets wuerden wir gerne. Und vielleicht WLAN. Mehr weiss ich nicht." },
    { role: "ai", kind: "question", content: "Hat Ihre Schule ein Medienkonzept das als Grundlage fuer den Antrag dienen koennte?" },
    { role: "user", kind: "answer", content: "Nein. Haetten wir eigentlich mal machen muessen." },
    { role: "ai", kind: "question", content: "Wer wuerde den Antrag vorbereiten -- haben Sie Kapazitaeten dafuer?" },
    { role: "user", kind: "answer", content: "Keine Ahnung. Ich bin ja selbst schon ueberarbeitet." }
  ],
  facts: {
    schule: { name: "Hauptschule Gelsenkirchen-Bismarck", typ: "hauptschule", bundesland: "NRW", schuelerzahl: 280, besonderheiten: "Keine digitale Ausstattung" },
    projekt: { titel: null, kurzbeschreibung: "Tablets und WLAN", ziele: [], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Kein Medienkonzept", "Kein konkretes Vorhaben ausser Tablets/WLAN", "Kapazitaetsmangel fuer Antragstellung"] }
  },
  expected_forbidden_markers: [
    { marker: "30 iPads Modell 10. Generation", description: "Kein konkretes Geraetemodell erwaehnt. Spezifische Produktbezeichnung waere Halluzination." },
    { marker: "IT-Beauftragter Herr", description: "Keine Person fuer IT-Koordination erwaehnt. Erfundene Person waere Halluzination." },
    { marker: "Schultraeger Stadt Gelsenkirchen Beschluss", description: "Kein Schultraeger-Beschluss erwaehnt. Erfundenes Datum waere Halluzination." },
    { marker: "DigitalPakt 1 Restmittel 12.000 EUR", description: "Keine DigitalPakt-1-Restmittel erwaehnt. Erfundener Betrag waere Halluzination." }
  ],
  expected_geber_gruppe: "oeffentlich",
  notes: "Reserve pv-res-002: zweiter DigitalPakt-Eintrag, vag. Hauptschule ohne Medienkonzept."
};

const pvRes003 = {
  id: "pv-res-003",
  category: "mittel",
  programmId: "ensam-bmz",
  schulProfil: {
    name: "Stadtteilschule Hamburg-Wilhelmsburg",
    typ: "stadtteilschule",
    bundesland: "Hamburg",
    schuelerzahl: 1200,
    besonderheiten: "Globales-Lernen-AG seit 3 Jahren, Interesse an Erstanbahnungsreise nach Ghana"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Ist dies eine erste Anbahnungsreise zu einer neuen Partnerschaft, oder haben Sie schon eine bestehende Partnerschaft?" },
    { role: "user", kind: "answer", content: "Das waere eine neue Verbindung. Wir haben keine Partnerschule in Ghana, aber wir haben einen ghanaischen Kulturverein hier in Hamburg als Kontakt." },
    { role: "ai", kind: "question", content: "Fuer eine Anbahnungsreise muss die Schule in einem Land des Globalen Suedens (OECD DAC-Liste) besucht werden. Ghana ist dabei. Wer soll reisen?" },
    { role: "user", kind: "answer", content: "Zwei Lehrkraefte und vielleicht 4 Schueler aus der Globales-Lernen-AG." },
    { role: "ai", kind: "question", content: "Welche Schule in Ghana ist das Ziel?" },
    { role: "user", kind: "answer", content: "Das weiss ich noch nicht konkret. Der Kulturverein hat Kontakte. Wir muessen noch anfragen." },
    { role: "ai", kind: "question", content: "Welches SDG-Thema soll Schwerpunkt sein?" },
    { role: "user", kind: "answer", content: "Wasser und Klimagerechtigkeit. Das sind Themen die in Ghana sehr relevant sind." }
  ],
  facts: {
    schule: { name: "Stadtteilschule Hamburg-Wilhelmsburg", typ: "stadtteilschule", bundesland: "Hamburg", schuelerzahl: 1200, besonderheiten: "Globales-Lernen-AG 3 Jahre, Kontakt ghanaischer Kulturverein Hamburg" },
    projekt: { titel: null, kurzbeschreibung: "ENSA Anbahnungsreise Ghana, SDG Wasser/Klimagerechtigkeit", ziele: ["Neue Schulpartnerschaft Ghana", "Globales Lernen SDG 6/13"], zielgruppe: "2 Lehrkraefte + 4 Schueler Globales-Lernen-AG", aktivitaeten: ["Anbahnungsreise Ghana"], zeitraum: null },
    wirkung: { erwartete_ergebnisse: ["Formale Schulpartnerschaft nach Reise"], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: ["Anbahnungsreise-Spur", "Ghana auf DAC-Liste", "SDG-Bezug klar"], offene_luecken: ["Konkrete Zielschule noch nicht bekannt", "NRO-Begleitung nicht geplant", "Reisezeitraum noch offen"] }
  },
  expected_forbidden_markers: [
    { marker: "Bishop John Amoa School Accra", description: "Keine konkrete Zielschule genannt. Erfundener Schulname waere Halluzination." },
    { marker: "ENSA-Anbahnungsreise-Code 2026/AN-", description: "Keine Foerdernummer vergeben. Erfundene Nummer waere Halluzination." },
    { marker: "Reisekosten 8.500 EUR", description: "Kein Budget erwaehnt. Spezifische Kostensumme waere Halluzination." },
    { marker: "NRO Afrika-Buero Hamburg e.V.", description: "Keine NRO als Begleitorganisation erwaehnt. Erfundene NRO waere Halluzination." }
  ],
  expected_geber_gruppe: "eu",
  notes: "Reserve pv-res-003: zweiter ENSA-Eintrag, mittlere Qualitaet. Anbahnungsreise Ghana, Zielschule noch offen."
};

const pvRes004 = {
  id: "pv-res-004",
  category: "vag",
  programmId: "aktion-mensch-schulkooperation",
  schulProfil: {
    name: "Montessori-Grundschule Muenchen-Schwabing",
    typ: "grundschule",
    bundesland: "Bayern",
    schuelerzahl: 200,
    besonderheiten: "Montessori-Profil, moechte mit Foerderschule kooperieren"
  },
  userAnswers: [
    { role: "ai", kind: "question", content: "Welche Art von Inklusions-Kooperation moechten Sie aufbauen?" },
    { role: "user", kind: "answer", content: "Wir moechten mit einer Foerderschule zusammenarbeiten, irgendwie. Das liegt uns am Herzen." },
    { role: "ai", kind: "question", content: "Welche Foerderschule haben Sie im Sinn?" },
    { role: "user", kind: "answer", content: "Da gibt es eine in der Naehe, aber ob die wollen weiss ich nicht. Ich habe noch nicht angerufen." },
    { role: "ai", kind: "question", content: "Welcher gemeinnuetzige Traeger wuerde den Antrag stellen?" },
    { role: "user", kind: "answer", content: "Wir als Montessori-Schule? Oder gibt es da was anderes? Ich kenne mich nicht aus." },
    { role: "ai", kind: "question", content: "Hat die Montessori-Schule eine gemeinnuetzige Traegergesellschaft?" },
    { role: "user", kind: "answer", content: "Ja, der Foerderverein ist eingetragener Verein. Ob der gemeinnuetzig ist weiss ich nicht genau." }
  ],
  facts: {
    schule: { name: "Montessori-Grundschule Muenchen-Schwabing", typ: "grundschule", bundesland: "Bayern", schuelerzahl: 200, besonderheiten: "Montessori-Profil, Foerderverein als potenzieller Traeger" },
    projekt: { titel: null, kurzbeschreibung: "Kooperation mit Foerderschule", ziele: ["Inklusion"], zielgruppe: null, aktivitaeten: [], zeitraum: null },
    wirkung: { erwartete_ergebnisse: [], messbare_indikatoren: [], nachhaltigkeit: null },
    budget: { beantragt_eur: null, eigenmittel_eur: null, hauptposten: [] },
    programmpassung: { kriterien_adressiert: [], offene_luecken: ["Foerderschule noch nicht kontaktiert", "Traeger-Gemeinnuetzigkeit unklar", "Kein Konzept"] }
  },
  expected_forbidden_markers: [
    { marker: "Foerderschule Muenchen-Neuhausen", description: "Kein Name der Foerderschule genannt. Erfundener Schulname waere Halluzination." },
    { marker: "Gemeinnuetzigkeitsstatus bestätigt Finanzamt Muenchen", description: "Keine Bestaetigung der Gemeinnuetzigkeit erwaehnt. Erfundene Bestaetigung waere Halluzination." },
    { marker: "Montessori-Traeger e.V. Mitglied AMI", description: "Kein AMI-Bezug erwaehnt. Erfundene Zertifizierung waere Halluzination." },
    { marker: "10%-Eigenanteil aus Foerderverein-Kasse", description: "Keine Eigenanteil-Quelle erwaehnt. Erfundene Finanzierungsquelle waere Halluzination." }
  ],
  expected_geber_gruppe: "stiftung",
  notes: "Reserve pv-res-004: dritter Aktion-Mensch-Eintrag, vag. Montessori Bayern, Traegerstruktur unklar."
};

korpus.push(pvEdge001, pvEdge002, pvEdge003, pvEdge004, pvEdge005, pvEdge006, pvEdge007);
korpus.push(pvRes001, pvRes002, pvRes003, pvRes004);
writeFileSync("data/eval/pipeline-korpus.json", JSON.stringify(korpus, null, 2));
console.log("Total entries:", korpus.length);
console.log("kategorien:", korpus.reduce((acc,e) => (acc[e.category]=(acc[e.category]||0)+1, acc), {}));
const totalMarkers = korpus.reduce((s,e) => s + e.expected_forbidden_markers.length, 0);
console.log("total markers:", totalMarkers, "avg:", (totalMarkers/korpus.length).toFixed(1));
