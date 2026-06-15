/**
 * Handverlesene Zusatz-Kriterien pro Förderprogramm.
 *
 * Das ist Fleissarbeit: pro Programm ~20 Minuten Recherche (Richtlinie lesen,
 * frühere Ablehnungen/Bewilligungen auswerten, Gespraeche mit Fördergeber).
 * Jede Ergaenzung hebt die Antragsqualitaet messbar.
 *
 * Wenn fuer eine programmId KEIN Eintrag existiert, faellt der Wizard auf
 * die automatischen Programm-Felder aus foerderprogramme.json + die
 * generische Geber-Typ-Guidance zurueck.
 */

export interface ExtraGuidance {
  /** Was der Geber inhaltlich besonders honoriert (ueber die offiziellen Kriterien hinaus). */
  gewichtet: string[];
  /** Harte Pflichten, ohne die der Antrag durchfaellt. */
  pflichten?: string[];
  /** Typische Ablehnungsgruende / haeufige Fehler. */
  fallen?: string[];
}

/**
 * Keys sind die IDs aus data/foerderprogramme.json.
 */
const KRITERIEN: Record<string, ExtraGuidance> = {
  "bmbf-digitalpakt-2": {
    gewichtet: [
      "Medienkonzept der Schule muss erkennbar dahinter stehen (nicht nur Hardware-Wunschliste).",
      "Qualifizierung der Lehrkraefte ist verpflichtender Teil — wie wird das gesichert?",
      "Anbindung an Bildungsplan und KMK-Strategie 'Bildung in der digitalen Welt'.",
      "Nachhaltigkeit: wie werden die Geraete nach Laufzeit betrieben/erneuert?",
    ],
    pflichten: [
      "Schultraeger-Einbindung ist Bedingung (Kommune/Landkreis ist Antragstellerin).",
      "Mittel-Abfluss gemaess Richtlinie; Zweckbindung 7 Jahre.",
    ],
    fallen: [
      "Reine Geraete-Beschaffung ohne paedagogisches Konzept wird regelmaessig zurueckgestellt.",
      "Keine Einbindung des IT-Supports/Schultraegers ist haeufiger Ablehnungsgrund.",
    ],
  },

  "bosch-schulpreis": {
    gewichtet: [
      "Deutscher Schulpreis bewertet GESAMTES Schulprofil anhand 6 Qualitaetsbereiche: Leistung, Umgang mit Vielfalt, Unterrichtsqualitaet, Verantwortung, Schulklima/-leben, Schule als lernende Institution.",
      "Konkrete Belege statt Bekenntnisse: Daten, Projekte, Strukturen, nicht nur Leitbild-Saetze.",
      "Perspektive aller Beteiligten: Schueler, Eltern, Kollegium, Schulleitung — werden alle im Antrag sichtbar?",
    ],
    pflichten: [
      "Kein Einzelprojekt-Preis, sondern Auszeichnung fuer die Schule als Ganzes.",
      "Externe Jurys besuchen Shortlist-Schulen — alles im Antrag muss verifizierbar sein.",
    ],
    fallen: [
      "Marketing-Sprache und PR-Projektberichte statt substantielle Prozessbeschreibung.",
      "Fehlende Selbstkritik / ausschliesslich positive Schulbeschreibung wirkt unglaubwuerdig.",
    ],
  },

  "mercator-digitalisierung": {
    gewichtet: [
      "Stiftung Mercator foerdert strategische Partnerschaften, nicht Einzel-Schulprojekte — Partner (Hochschule, Kommune, andere Schule) sind zentral.",
      "Skalierbarkeit und Transfer in andere Schulen sind zwingend mitzudenken.",
      "Digitalisierung als Mittel zur Chancengleichheit, nicht als Technik-Thema an sich.",
    ],
    fallen: [
      "Antraege ohne konkrete Transfer-/Skalierungsperspektive werden selten beruecksichtigt.",
      "Antragsteller ohne Kooperations-Substanz ('wir planen Kontakt aufzunehmen') sind zu schwach.",
    ],
  },

  "startchancen-programm": {
    gewichtet: [
      "Startchancen foerdert GEZIELT Schulen mit hohem Anteil sozial benachteiligter Schuelerschaft — Auswahl der Schule erfolgt durch das Land, nicht durch freie Bewerbung.",
      "Drei Saeulen: Investitionen (Lern- und Lebensraum), Chancenbudget (flexibel), multiprofessionelle Teams. Projektbeschreibung MUSS einer Saeule klar zuzuordnen sein.",
      "Kooperation mit externen Partnern (Jugendhilfe, Sozialarbeit) ist konstitutiv — nicht 'nice to have'.",
      "Datenbasierte Bedarfsanalyse: demografische/soziale Kennzahlen der Schule konkret benennen, nicht abstrakt behaupten.",
    ],
    pflichten: [
      "Nur Startchancen-Schulen koennen beantragen (Liste liegt beim Land).",
      "Schul-Entwicklungsplan muss mit dem Programm-Ziel verknuepft sein.",
    ],
    fallen: [
      "Generische 'Wir wollen Chancengleichheit foerdern'-Formulierungen ohne konkreten Sozialraum-Bezug.",
      "Fehlende Multiprofessionalitaet (nur Lehrkraefte, keine Schulsozialarbeit/Psychologie).",
    ],
  },

  "bundesweit-ganztag": {
    gewichtet: [
      "Investiv, kein Personal: foerderfaehig sind Bau/Umbau/Ausstattung fuer Ganztag, NICHT Personalkosten oder paedagogische Konzepte allein.",
      "Rechtsanspruch ab 2026 schrittweise (Klasse 1 → Klasse 4) — Bezug zur landesspezifischen Umsetzungsstrategie zwingend.",
      "Nachweis der Kapazitaetserweiterung: zusaetzliche Plaetze, nicht nur Ersatz bestehender.",
      "Qualitaet: Raumkonzept fuer Bewegung, Ruhe, Lernen — Ganztag ist mehr als Betreuung.",
    ],
    pflichten: [
      "Schultraeger (Kommune/Landkreis) ist Antragstellerin. Schule allein kann NICHT beantragen.",
      "Kofinanzierung durch Laender und Traeger geregelt (Laenderquote 30 %).",
    ],
    fallen: [
      "Anschaffungen ohne baulichen Zusammenhang (Laptops, Software) sind NICHT foerderfaehig.",
      "Fehlender Bezug zum Rechtsanspruch / zur Landes-Umsetzungsstrategie.",
    ],
  },

  "erasmus-schule-2026": {
    gewichtet: [
      "Europaeischer Mehrwert ist Hauptkriterium: ohne echte grenzueberschreitende Partnerschaft/Mobilitaet kein Erasmus+.",
      "Querschnittsprioritaeten der EU: Inklusion & Vielfalt, digitale Transformation, Umwelt/Klima, demokratische Teilhabe — mindestens eine davon explizit adressieren.",
      "Schlüsselkompetenzen aus dem Europaeischen Referenzrahmen — nicht abstrakt 'Kompetenzen staerken', sondern benannt (z. B. Mehrsprachigkeit, digitale Kompetenz).",
      "Dissemination: wie werden Ergebnisse nachhaltig mit anderen Schulen und der Bildungslandschaft geteilt (Kanaele, Adressaten, Zeitrahmen konkret)?",
    ],
    pflichten: [
      "Akkreditierung als Schule oder Konsortium (bei KA121) bzw. gueltige PIC-Nummer (OID).",
      "Budget nach Einheitskosten (Unit Costs) — keine freien Posten.",
      "Mindestens eine Partnerschule/-organisation in einem anderen EU-Land.",
    ],
    fallen: [
      "'Unsere Schueler sollen Englisch lernen' ohne partnerschaftliche/kulturelle Komponente — das ist Sprachkurs, nicht Erasmus.",
      "Unterschaetzter Dissemination-Aufwand — EU erwartet nachweisbare Weitergabe.",
    ],
  },

  "aktion-mensch-schulkooperation": {
    gewichtet: [
      "Aktion Mensch foerdert KOOPERATIONEN zwischen Schule und einem sozialen Traeger (Wohlfahrt, Verein, Initiative) — die Schule ist NICHT alleinige Antragstellerin.",
      "Junge Menschen mit Behinderung / in schwierigen Lebenslagen sind Zielgruppe — Inklusion muss substantiell sein, nicht nur Schlagwort.",
      "Selbstbestimmung und Teilhabe der Zielgruppe: wie werden junge Menschen aktiv einbezogen (Stimme, Entscheidung)?",
      "Barrierefreiheit: baulich, kommunikativ, sozial — konkret benennen, was umgesetzt wird.",
      "Wirkungs-Narrativ mit konkreter Szene: Aktion Mensch praeferiert Geschichten ueber Statistik — ein reales Kind, eine reale Situation als Einstieg.",
    ],
    pflichten: [
      "Partner-Organisation muss Aktion-Mensch-foerderfaehig sein (i.d.R. gemeinnuetziger Traeger), Kooperationsvereinbarung als Anlage.",
      "Mindestens 10 % Eigenanteil der foerderfaehigen Kosten — kann durch Traeger oder Kooperationspartner eingebracht werden.",
      "Antragsberechtigt ist NUR der gemeinnuetzige Traeger, NICHT die Schule selbst.",
    ],
    fallen: [
      "Reine Schulprojekte ohne einen zusaetzlichen sozialen Traeger — nicht foerderfaehig.",
      "Tokenistische Inklusion ('auch eine Foerderschule besucht uns einmal') statt echter Ko-Konstruktion.",
      "Unspezifische Zielgruppe ('benachteiligte Jugendliche') ohne Zahlen und konkrete Herausforderung.",
      "PR-Glanz-Sprache ('zukunftsweisende Massnahme') — Aktion Mensch erwartet ehrliche, konkrete Beschreibung.",
    ],
  },

  "kultur-macht-stark": {
    gewichtet: [
      "Buendnis aus MINDESTENS DREI lokalen Partnern (Kultur + Bildung + Sozialarbeit) ist Kern-Voraussetzung — kein Einzel-Schul-Antrag.",
      "Klare Trennung vom normalen Pflichtunterricht ist entscheidend: Das Angebot laeuft zusaetzlich und freiwillig — z. B. als Nachmittags-AG, Ferien- oder Wochenend-Format oder offener Treff, nicht als benoteter Teil des Stundenplans. WICHTIG fuer nutzersichtbare Begruendungen: dieses Kriterium ALLTAGSSPRACHLICH erklaeren (etwa 'foerdert freiwillige Angebote neben dem Unterricht wie Theater- oder Musik-AGs') statt mit dem Fachbegriff 'ausserschulisch' / 'Ausserschulischkeit'.",
      "Kulturbereich konkret benennen: Theater, Musik, Literatur, digitale Spielekultur, Alltagskultur, Zirkus etc. — kein generisches 'Kulturprojekt'.",
      "Zielgruppe mit Risikolagen belegen: Sozialindex des Stadtteils, Transferleistungsquote der Familien — kein abstraktes 'benachteiligte Kinder'.",
      "Diversitaetssensible und Empowerment-orientierte paedagogische Ansaetze sind besonders gefragt.",
    ],
    pflichten: [
      "Federfuehrender Partner (Letztzuwendungsempfaenger) ist Kulturtraeger oder Bildungsorganisation, NICHT die Schule allein.",
      "Antrag laeuft NICHT direkt beim BMBF sondern ueber einen von ca. 20 Programmpartnern (Bundesverbaende).",
      "Buendnisvereinbarung (unterschrieben von allen mindestens drei Partnern) als Pflichtanlage.",
      "Minimum 2.000 EUR Foerderhoehe pro Antrag; kein Zuschuss fuer dauerhafte Investitionen/Geraete.",
    ],
    fallen: [
      "Unzureichende Abgrenzung zum Regelunterricht ist der haeufigste Ablehnungsgrund.",
      "Weniger als drei Buendnispartner — formale Ablehnung.",
      "Massnahme ersetzt ein bestehendes, oeffentlich-finanziertes Regelangebot (SGB VIII) — Doppelfoerderung.",
      "Schule als alleinige Antragstellerin ohne Buendnis-Konstellation.",
    ],
  },

  "ensam-bmz": {
    gewichtet: [
      "Gleichberechtigte Partnerschaft beider Schulen: kein einseitiger 'Entwicklungshilfe'-Ansatz — beide Seiten lernen voneinander.",
      "SDG-Thema konkret und aus beiden Laender-Perspektiven beleuchtet — nicht nur Nord-Sicht.",
      "Schuelerinnen-Beteiligung aktiv: Schuelerinnen gestalten die Partnerschaft, sie wird nicht nur fuer sie durchgefuehrt.",
      "NRO-Begleitung ist starkes Qualitaetsmerkmal und wird besonders gefoerdert.",
      "Nachhaltigkeit der Partnerschaft: langfristiger Plan, Rueckbegegnungen, Einfluss in Schulalltag.",
    ],
    pflichten: [
      "Antragsberechtigt: weiterfuehrende Schule (ab Klasse 8, Schuelerinnen mind. 14 Jahre), Schulfoerderverein oder NRO aus Deutschland.",
      "Grundschulen sind NICHT foerderberechtigt.",
      "Partnerland muss auf der OECD DAC-Liste stehen (Globaler Sueden).",
      "Bei Begegnungsreise: Partnerschaft muss bereits mindestens 1 Jahr bestehen.",
      "Reisezeitraum: nur 1. Maerz bis 31. Oktober foerderfaehig.",
      "Keine Kombination mit anderen Bundesmitteln (Erasmus+, DAAD, KMK-PAD) fuer dieselbe Massnahme.",
    ],
    fallen: [
      "Klassisches Hilfsprojekt oder Workcamp-Charakter — wird abgelehnt.",
      "Einseitige Nord-Sued-Perspektive ohne echten gegenseitigen Lerneffekt.",
      "Reine Lehrkraefteaustausche ohne Schuelerinnen-Begegnung im Zentrum.",
      "Infrastrukturelle Beschaffungsmassnahmen fuer Partnerschule — nicht foerderfaehig.",
      "Kombination mit Erasmus+ oder KMK-PAD fuer dieselbe Massnahme — Foerderausschluss.",
    ],
  },

  "erasmus-schulentwicklung": {
    gewichtet: [
      "Wirkung (Impact) ist der groesste Bewertungsblock: 35 von 100 Punkten — spuerbare Veraenderungen in der Schulbildung muss im Antrag klar herausgestellt sein.",
      "Qualitaet der Projektkonzeption: 30 Punkte — konkrete Aktivitaeten, Zeitplan, Ergebnisse.",
      "Qualitaet der Partnerschaft: 20 Punkte — Partnerrolle jeder Organisation explizit, Kooperationsvereinbarungen.",
      "Nachweis substanzieller Verwaltungskapazitaeten als Koordinator: Finanzmittelverwaltung + Personalmittel fuer 400.000 EUR Lump-Sum-Foerderung.",
      "Mindestpunktzahl in JEDER der vier Kategorien (>=50% der Maximalpunkte) ist Pflicht.",
    ],
    pflichten: [
      "Koordinator MUSS lokale oder regionale Schulbehoerde oder Schulkoordinierungsstelle sein.",
      "Partnerschaft umfasst mindestens sechs Organisationen.",
      "In Staat der Antragstellers UND in mindestens einem weiteren EU-Programmstaat: je mind. 1 Schulbehoerde/-koordinierungsstelle + mind. 2 allgemeinbildende Schulen.",
      "Pro Antragsfrist nur EINEN Antrag als Koordinator einreichen.",
      "Projektlaufzeit fest 36 Monate ab 1. Oktober des Antragsjahres.",
    ],
    fallen: [
      "Weniger als 70 Gesamtpunkte in der Bewertung — haeufigstes Ablehnungskriterium.",
      "In einer der vier Bewertungskategorien unter 50% der Maximalpunkte.",
      "Mehr als ein Antrag als Koordinator pro Antragsfrist.",
      "Partnerschaft erfuellt nicht formale Mindest-Anforderungen (Anzahl Organisationen, Schulbehoerden in mind. 2 Laendern).",
    ],
  },

  "ferry-porsche-challenge": {
    gewichtet: [
      "Story-driven Bewerbung: Vorhaben in wenigen praegnanten Saetzen erklaerbar — was ist das Besondere des Projekts im Themenfeld?",
      "Klare Zuordnung zu einem Themenfeld des aktuellen Ausschreibungs-Mottos (Themenfelder variieren jaehrlich).",
      "Konkrete Belege und Ergebnisse statt Versprechen — Jury bewertet Substanz.",
      "Gemeinnuetzigkeit und regionales Foerdergebiet (Baden-Wuerttemberg + Sachsen) sind Grundbedingung.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnuetzige Organisation oder Verein aus Baden-Wuerttemberg oder Sachsen sein.",
      "Pro Organisation NUR EINE Bewerbung einreichen — interne Abstimmung sicherstellen.",
      "Fruezhzeitig einreichen: nur die ersten 200 vollstaendig eingegangenen Bewerbungen werden beruecksichtigt.",
      "Projekt muss wirksam auf mindestens eines der aktuellen Themenfelder einzahlen.",
    ],
    fallen: [
      "Zu spaete Einreichung — Kontingent von 200 Bewerbungen ist haeufig vor offiziellem Fristende erschoepft.",
      "Bewerbung ausserhalb des Foerdergebiets BW + Sachsen.",
      "Mehr als eine Bewerbung pro Organisation.",
      "Kein klarer Bezug zu einem der vorgegebenen Themenfelder.",
    ],
  },

  "ferry-porsche-challenge-2025": {
    gewichtet: [
      "Story-driven Bewerbung: das Vorhaben in 2-3 Saetzen erklaerbar machen — was ist das Besondere, was hebt es ab?",
      "Klare Zuordnung zu einem Themenfeld des aktuellen Ausschreibungs-Mottos (2026: 'Gemeinsam aelter — gemeinsam staerker': Schutz vor Vereinsamung, wuerdevolles Altern, Digitale Handlungskompetenzen, Brücken in den Ruhestand, Generationendialog).",
      "Konkrete, verifizierbare Projektbeschreibung mit messbarer Wirkung — keine Versprechen.",
      "Gemeinnuetzigkeit und regionales Foerdergebiet (Baden-Wuerttemberg + Sachsen) sind Grundbedingung.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnuetzige Organisation oder Verein aus Baden-Wuerttemberg oder Sachsen sein.",
      "Pro Organisation NUR EINE Bewerbung — interne Abstimmung sicherstellen.",
      "Fruehzeitig einreichen: nur die ersten 200 vollstaendig eingegangenen Bewerbungen werden beruecksichtigt.",
      "Projekt muss wirksam auf mindestens eines der aktuellen Ausschreibungs-Themenfelder einzahlen.",
    ],
    fallen: [
      "Zu spaete Einreichung — das 200-Bewerbungen-Kontingent ist erfahrungsgemaess vor dem offiziellen Fristende erschoepft.",
      "Bewerbung ausserhalb des Foerdergebiets BW + Sachsen.",
      "Mehr als eine Bewerbung pro Organisation.",
      "Kein klarer Bezug zu einem der vorgegebenen Themenfelder des aktuellen Mottos.",
    ],
  },

  "klimalab-2026": {
    gewichtet: [
      "Klimaschutz als strukturell im Selbstverstaendnis der Organisation verankert — nicht nur als Einzelprojekt.",
      "Konkrete organisatorische Veraenderungen geplant: neue Verantwortlichkeiten, Ablauf-Anpassungen, Leitbild-Ueberarbeitung oder strategische Partnerschaften.",
      "Stiftung Mercator als Kooperationspartner: Foerderung kombiniert finanzielle Mittel mit Beratung und Wissenstransfer — beides nutzen.",
      "Gemeinnuetzige Organisationen (Vereine, Verbaende) als Zielgruppe — keine Einzelpersonen oder kommerzielle Unternehmen.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnuetzige Organisation (Verein, Verband) sein.",
      "Vorhaben muss Klimaschutz strukturell in der Organisation verankern — kein reines Einzel-Schulprojekt.",
      "Bewerbungsfrist beachten (war 27. Februar 2026 fuer 2026er Runde — Frist jaehrlich pruefen).",
    ],
    fallen: [
      "Klimaschutz nur als Projekt-Thema ohne organisationalen Wandel — entspricht nicht der Foerder-Logik.",
      "Keine gemeinnuetzige Rechtsform oder Sitz ausserhalb des Foerdergebiets.",
      "Projektantrag ohne Bezug zur strategischen Weiterentwicklung der Organisation.",
    ],
  },

  "berlin-startchancen": {
    gewichtet: [
      "Programm ist fuer Berliner Schulen mit HOHEM Anteil sozial benachteiligter Schuelerschaft — Auswahl durch das Land Berlin, keine freie Bewerbung.",
      "Drei Saeulen unterscheiden sich inhaltlich klar: Saeule I = Investitionen (Lernraeume), Saeule II = Chancenbudget (Unterrichts-/Schulentwicklung), Saeule III = Multiprofessionelle Teams (Personal).",
      "Kooperation mit externen Partnern (Jugendhilfe, Sozialarbeit, Jugendamt) ist konstitutiv — nicht optional.",
      "Datenbasierte Bedarfsanalyse: demografische und soziale Kennzahlen der Schule konkret benennen.",
      "Schul-Entwicklungsplan muss mit Programm-Ziel verknuepft sein.",
    ],
    pflichten: [
      "Nur Startchancen-Schulen des Landes Berlin koennen partizipieren — Liste liegt bei der Bildungssenatsverwaltung (startchancen@senbjf.berlin.de).",
      "Vorhaben muss einer der drei Foerdersaeulen klar zuzuordnen sein.",
      "Multiprofessionalitaet: nicht nur Lehrkraefte, auch Schulsozialarbeit/Psychologie einbeziehen.",
    ],
    fallen: [
      "Generische Aussagen ('Wir wollen Chancengleichheit foerdern') ohne konkreten Sozialraum-Bezug.",
      "Fehlende Multiprofessionalitaet (nur Lehrkraefte, keine weiteren Professionen).",
      "Keine Verbindung zum Schul-Entwicklungsplan.",
      "Projekt kann keiner der drei Saeulen klar zugeordnet werden.",
    ],
  },
};

export function getExtraGuidance(programmId: string): ExtraGuidance | null {
  return KRITERIEN[programmId] ?? null;
}

export function formatExtraGuidance(g: ExtraGuidance): string {
  const out: string[] = [];
  if (g.gewichtet.length) {
    out.push("Besonders gewichtet vom Fördergeber:");
    g.gewichtet.forEach((x) => out.push(`- ${x}`));
  }
  if (g.pflichten?.length) {
    out.push("\nHarte Pflichten (Antrag fällt sonst durch):");
    g.pflichten.forEach((x) => out.push(`- ${x}`));
  }
  if (g.fallen?.length) {
    out.push("\nTypische Fallstricke / Ablehnungsgründe:");
    g.fallen.forEach((x) => out.push(`- ${x}`));
  }
  return out.join("\n");
}
