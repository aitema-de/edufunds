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
      "Qualifizierung der Lehrkräfte ist verpflichtender Teil — wie wird das gesichert?",
      "Anbindung an Bildungsplan und KMK-Strategie 'Bildung in der digitalen Welt'.",
      "Nachhaltigkeit: wie werden die Geräte nach Laufzeit betrieben/erneuert?",
    ],
    pflichten: [
      "Schulträger-Einbindung ist Bedingung (Kommune/Landkreis ist Antragstellerin).",
      "Mittel-Abfluss gemäß Richtlinie; Zweckbindung 7 Jahre.",
    ],
    fallen: [
      "Reine Geräte-Beschaffung ohne pädagogisches Konzept wird regelmäßig zurückgestellt.",
      "Keine Einbindung des IT-Supports/Schulträgers ist häufiger Ablehnungsgrund.",
    ],
  },

  "bosch-schulpreis": {
    gewichtet: [
      "Deutscher Schulpreis bewertet GESAMTES Schulprofil anhand 6 Qualitätsbereiche: Leistung, Umgang mit Vielfalt, Unterrichtsqualität, Verantwortung, Schulklima/-leben, Schule als lernende Institution.",
      "Konkrete Belege statt Bekenntnisse: Daten, Projekte, Strukturen, nicht nur Leitbild-Sätze.",
      "Perspektive aller Beteiligten: Schüler, Eltern, Kollegium, Schulleitung — werden alle im Antrag sichtbar?",
    ],
    pflichten: [
      "Kein Einzelprojekt-Preis, sondern Auszeichnung für die Schule als Ganzes.",
      "Externe Jurys besuchen Shortlist-Schulen — alles im Antrag muss verifizierbar sein.",
    ],
    fallen: [
      "Marketing-Sprache und PR-Projektberichte statt substantielle Prozessbeschreibung.",
      "Fehlende Selbstkritik / ausschließlich positive Schulbeschreibung wirkt unglaubwürdig.",
    ],
  },

  "mercator-digitalisierung": {
    gewichtet: [
      "Stiftung Mercator fördert strategische Partnerschaften, nicht Einzel-Schulprojekte — Partner (Hochschule, Kommune, andere Schule) sind zentral.",
      "Skalierbarkeit und Transfer in andere Schulen sind zwingend mitzudenken.",
      "Digitalisierung als Mittel zur Chancengleichheit, nicht als Technik-Thema an sich.",
    ],
    fallen: [
      "Anträge ohne konkrete Transfer-/Skalierungsperspektive werden selten berücksichtigt.",
      "Antragsteller ohne Kooperations-Substanz ('wir planen Kontakt aufzunehmen') sind zu schwach.",
    ],
  },

  "startchancen-programm": {
    gewichtet: [
      "Startchancen fördert GEZIELT Schulen mit hohem Anteil sozial benachteiligter Schülerschaft — Auswahl der Schule erfolgt durch das Land, nicht durch freie Bewerbung.",
      "Drei Säulen: Investitionen (Lern- und Lebensraum), Chancenbudget (flexibel), multiprofessionelle Teams. Projektbeschreibung MUSS einer Säule klar zuzuordnen sein.",
      "Kooperation mit externen Partnern (Jugendhilfe, Sozialarbeit) ist konstitutiv — nicht 'nice to have'.",
      "Datenbasierte Bedarfsanalyse: demografische/soziale Kennzahlen der Schule konkret benennen, nicht abstrakt behaupten.",
    ],
    pflichten: [
      "Nur Startchancen-Schulen können beantragen (Liste liegt beim Land).",
      "Schul-Entwicklungsplan muss mit dem Programm-Ziel verknüpft sein.",
    ],
    fallen: [
      "Generische 'Wir wollen Chancengleichheit fördern'-Formulierungen ohne konkreten Sozialraum-Bezug.",
      "Fehlende Multiprofessionalität (nur Lehrkräfte, keine Schulsozialarbeit/Psychologie).",
    ],
  },

  "bundesweit-ganztag": {
    gewichtet: [
      "Investiv, kein Personal: förderfähig sind Bau/Umbau/Ausstattung für Ganztag, NICHT Personalkosten oder pädagogische Konzepte allein.",
      "Rechtsanspruch ab 2026 schrittweise (Klasse 1 → Klasse 4) — Bezug zur landesspezifischen Umsetzungsstrategie zwingend.",
      "Nachweis der Kapazitätserweiterung: zusätzliche Plätze, nicht nur Ersatz bestehender.",
      "Qualität: Raumkonzept für Bewegung, Ruhe, Lernen — Ganztag ist mehr als Betreuung.",
    ],
    pflichten: [
      "Schulträger (Kommune/Landkreis) ist Antragstellerin. Schule allein kann NICHT beantragen.",
      "Kofinanzierung durch Länder und Träger geregelt (Länderquote 30 %).",
    ],
    fallen: [
      "Anschaffungen ohne baulichen Zusammenhang (Laptops, Software) sind NICHT förderfähig.",
      "Fehlender Bezug zum Rechtsanspruch / zur Landes-Umsetzungsstrategie.",
    ],
  },

  "erasmus-schule-2026": {
    gewichtet: [
      "Europäischer Mehrwert ist Hauptkriterium: ohne echte grenzüberschreitende Partnerschaft/Mobilität kein Erasmus+.",
      "Querschnittsprioritäten der EU: Inklusion & Vielfalt, digitale Transformation, Umwelt/Klima, demokratische Teilhabe — mindestens eine davon explizit adressieren.",
      "Schlüsselkompetenzen aus dem Europäischen Referenzrahmen — nicht abstrakt 'Kompetenzen stärken', sondern benannt (z. B. Mehrsprachigkeit, digitale Kompetenz).",
      "Dissemination: wie werden Ergebnisse nachhaltig mit anderen Schulen und der Bildungslandschaft geteilt (Kanäle, Adressaten, Zeitrahmen konkret)?",
    ],
    pflichten: [
      "Akkreditierung als Schule oder Konsortium (bei KA121) bzw. gültige PIC-Nummer (OID).",
      "Budget nach Einheitskosten (Unit Costs) — keine freien Posten.",
      "Mindestens eine Partnerschule/-organisation in einem anderen EU-Land.",
    ],
    fallen: [
      "'Unsere Schüler sollen Englisch lernen' ohne partnerschaftliche/kulturelle Komponente — das ist Sprachkurs, nicht Erasmus.",
      "Unterschätzter Dissemination-Aufwand — EU erwartet nachweisbare Weitergabe.",
    ],
  },

  "aktion-mensch-schulkooperation": {
    gewichtet: [
      "Aktion Mensch fördert KOOPERATIONEN zwischen Schule und einem sozialen Träger (Wohlfahrt, Verein, Initiative) — die Schule ist NICHT alleinige Antragstellerin.",
      "Junge Menschen mit Behinderung / in schwierigen Lebenslagen sind Zielgruppe — Inklusion muss substantiell sein, nicht nur Schlagwort.",
      "Selbstbestimmung und Teilhabe der Zielgruppe: wie werden junge Menschen aktiv einbezogen (Stimme, Entscheidung)?",
      "Barrierefreiheit: baulich, kommunikativ, sozial — konkret benennen, was umgesetzt wird.",
      "Wirkungs-Narrativ mit konkreter Szene: Aktion Mensch präferiert Geschichten über Statistik — ein reales Kind, eine reale Situation als Einstieg.",
    ],
    pflichten: [
      "Partner-Organisation muss Aktion-Mensch-förderfähig sein (i.d.R. gemeinnütziger Träger), Kooperationsvereinbarung als Anlage.",
      "Mindestens 10 % Eigenanteil der förderfähigen Kosten — kann durch Träger oder Kooperationspartner eingebracht werden.",
      "Antragsberechtigt ist NUR der gemeinnützige Träger, NICHT die Schule selbst.",
    ],
    fallen: [
      "Reine Schulprojekte ohne einen zusätzlichen sozialen Träger — nicht förderfähig.",
      "Tokenistische Inklusion ('auch eine Förderschule besucht uns einmal') statt echter Ko-Konstruktion.",
      "Unspezifische Zielgruppe ('benachteiligte Jugendliche') ohne Zahlen und konkrete Herausforderung.",
      "PR-Glanz-Sprache ('zukunftsweisende Maßnahme') — Aktion Mensch erwartet ehrliche, konkrete Beschreibung.",
    ],
  },

  "kultur-macht-stark": {
    gewichtet: [
      "Bündnis aus MINDESTENS DREI lokalen Partnern (Kultur + Bildung + Sozialarbeit) ist Kern-Voraussetzung — kein Einzel-Schul-Antrag.",
      "Klare Trennung vom normalen Pflichtunterricht ist entscheidend: Das Angebot läuft zusätzlich und freiwillig — z. B. als Nachmittags-AG, Ferien- oder Wochenend-Format oder offener Treff, nicht als benoteter Teil des Stundenplans. WICHTIG für nutzersichtbare Begründungen: dieses Kriterium ALLTAGSSPRACHLICH erklären (etwa 'fördert freiwillige Angebote neben dem Unterricht wie Theater- oder Musik-AGs') statt mit dem Fachbegriff 'außerschulisch' / 'Außerschulischkeit'.",
      "Kulturbereich konkret benennen: Theater, Musik, Literatur, digitale Spielekultur, Alltagskultur, Zirkus etc. — kein generisches 'Kulturprojekt'.",
      "Zielgruppe mit Risikolagen belegen: Sozialindex des Stadtteils, Transferleistungsquote der Familien — kein abstraktes 'benachteiligte Kinder'.",
      "Diversitätssensible und Empowerment-orientierte pädagogische Ansätze sind besonders gefragt.",
    ],
    pflichten: [
      "Federführender Partner (Letztzuwendungsempfänger) ist Kulturträger oder Bildungsorganisation, NICHT die Schule allein.",
      "Antrag läuft NICHT direkt beim BMBF sondern über einen von ca. 20 Programmpartnern (Bundesverbände).",
      "Bündnisvereinbarung (unterschrieben von allen mindestens drei Partnern) als Pflichtanlage.",
      "Minimum 2.000 EUR Förderhöhe pro Antrag; kein Zuschuss für dauerhafte Investitionen/Geräte.",
    ],
    fallen: [
      "Unzureichende Abgrenzung zum Regelunterricht ist der häufigste Ablehnungsgrund.",
      "Weniger als drei Bündnispartner — formale Ablehnung.",
      "Maßnahme ersetzt ein bestehendes, öffentlich-finanziertes Regelangebot (SGB VIII) — Doppelförderung.",
      "Schule als alleinige Antragstellerin ohne Bündnis-Konstellation.",
    ],
  },

  "ensam-bmz": {
    gewichtet: [
      "Gleichberechtigte Partnerschaft beider Schulen: kein einseitiger 'Entwicklungshilfe'-Ansatz — beide Seiten lernen voneinander.",
      "SDG-Thema konkret und aus beiden Länder-Perspektiven beleuchtet — nicht nur Nord-Sicht.",
      "Schülerinnen-Beteiligung aktiv: Schülerinnen gestalten die Partnerschaft, sie wird nicht nur für sie durchgeführt.",
      "NRO-Begleitung ist starkes Qualitätsmerkmal und wird besonders gefördert.",
      "Nachhaltigkeit der Partnerschaft: langfristiger Plan, Rückbegegnungen, Einfluss in Schulalltag.",
    ],
    pflichten: [
      "Antragsberechtigt: weiterführende Schule (ab Klasse 8, Schülerinnen mind. 14 Jahre), Schulförderverein oder NRO aus Deutschland.",
      "Grundschulen sind NICHT förderberechtigt.",
      "Partnerland muss auf der OECD DAC-Liste stehen (Globaler Süden).",
      "Bei Begegnungsreise: Partnerschaft muss bereits mindestens 1 Jahr bestehen.",
      "Reisezeitraum: nur 1. März bis 31. Oktober förderfähig.",
      "Keine Kombination mit anderen Bundesmitteln (Erasmus+, DAAD, KMK-PAD) für dieselbe Maßnahme.",
    ],
    fallen: [
      "Klassisches Hilfsprojekt oder Workcamp-Charakter — wird abgelehnt.",
      "Einseitige Nord-Süd-Perspektive ohne echten gegenseitigen Lerneffekt.",
      "Reine Lehrkräfteaustausche ohne Schülerinnen-Begegnung im Zentrum.",
      "Infrastrukturelle Beschaffungsmaßnahmen für Partnerschule — nicht förderfähig.",
      "Kombination mit Erasmus+ oder KMK-PAD für dieselbe Maßnahme — Förderausschluss.",
    ],
  },

  "erasmus-schulentwicklung": {
    gewichtet: [
      "Wirkung (Impact) ist der größte Bewertungsblock: 35 von 100 Punkten — spürbare Veränderungen in der Schulbildung muss im Antrag klar herausgestellt sein.",
      "Qualität der Projektkonzeption: 30 Punkte — konkrete Aktivitäten, Zeitplan, Ergebnisse.",
      "Qualität der Partnerschaft: 20 Punkte — Partnerrolle jeder Organisation explizit, Kooperationsvereinbarungen.",
      "Nachweis substanzieller Verwaltungskapazitäten als Koordinator: Finanzmittelverwaltung + Personalmittel für 400.000 EUR Lump-Sum-Förderung.",
      "Mindestpunktzahl in JEDER der vier Kategorien (>=50% der Maximalpunkte) ist Pflicht.",
    ],
    pflichten: [
      "Koordinator MUSS lokale oder regionale Schulbehörde oder Schulkoordinierungsstelle sein.",
      "Partnerschaft umfasst mindestens sechs Organisationen.",
      "In Staat der Antragstellers UND in mindestens einem weiteren EU-Programmstaat: je mind. 1 Schulbehörde/-koordinierungsstelle + mind. 2 allgemeinbildende Schulen.",
      "Pro Antragsfrist nur EINEN Antrag als Koordinator einreichen.",
      "Projektlaufzeit fest 36 Monate ab 1. Oktober des Antragsjahres.",
    ],
    fallen: [
      "Weniger als 70 Gesamtpunkte in der Bewertung — häufigstes Ablehnungskriterium.",
      "In einer der vier Bewertungskategorien unter 50% der Maximalpunkte.",
      "Mehr als ein Antrag als Koordinator pro Antragsfrist.",
      "Partnerschaft erfüllt nicht formale Mindest-Anforderungen (Anzahl Organisationen, Schulbehörden in mind. 2 Ländern).",
    ],
  },

  "ferry-porsche-challenge": {
    gewichtet: [
      "Story-driven Bewerbung: Vorhaben in wenigen prägnanten Sätzen erklärbar — was ist das Besondere des Projekts im Themenfeld?",
      "Klare Zuordnung zu einem Themenfeld des aktuellen Ausschreibungs-Mottos (Themenfelder variieren jährlich).",
      "Konkrete Belege und Ergebnisse statt Versprechen — Jury bewertet Substanz.",
      "Gemeinnützigkeit und regionales Fördergebiet (Baden-Württemberg + Sachsen) sind Grundbedingung.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnützige Organisation oder Verein aus Baden-Württemberg oder Sachsen sein.",
      "Pro Organisation NUR EINE Bewerbung einreichen — interne Abstimmung sicherstellen.",
      "Früzhzeitig einreichen: nur die ersten 200 vollständig eingegangenen Bewerbungen werden berücksichtigt.",
      "Projekt muss wirksam auf mindestens eines der aktuellen Themenfelder einzahlen.",
    ],
    fallen: [
      "Zu späte Einreichung — Kontingent von 200 Bewerbungen ist häufig vor offiziellem Fristende erschöpft.",
      "Bewerbung außerhalb des Fördergebiets BW + Sachsen.",
      "Mehr als eine Bewerbung pro Organisation.",
      "Kein klarer Bezug zu einem der vorgegebenen Themenfelder.",
    ],
  },

  "ferry-porsche-challenge-2025": {
    gewichtet: [
      "Story-driven Bewerbung: das Vorhaben in 2-3 Sätzen erklärbar machen — was ist das Besondere, was hebt es ab?",
      "Klare Zuordnung zu einem Themenfeld des aktuellen Ausschreibungs-Mottos (2026: 'Gemeinsam älter — gemeinsam stärker': Schutz vor Vereinsamung, würdevolles Altern, Digitale Handlungskompetenzen, Brücken in den Ruhestand, Generationendialog).",
      "Konkrete, verifizierbare Projektbeschreibung mit messbarer Wirkung — keine Versprechen.",
      "Gemeinnützigkeit und regionales Fördergebiet (Baden-Württemberg + Sachsen) sind Grundbedingung.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnützige Organisation oder Verein aus Baden-Württemberg oder Sachsen sein.",
      "Pro Organisation NUR EINE Bewerbung — interne Abstimmung sicherstellen.",
      "Frühzeitig einreichen: nur die ersten 200 vollständig eingegangenen Bewerbungen werden berücksichtigt.",
      "Projekt muss wirksam auf mindestens eines der aktuellen Ausschreibungs-Themenfelder einzahlen.",
    ],
    fallen: [
      "Zu späte Einreichung — das 200-Bewerbungen-Kontingent ist erfahrungsgemäß vor dem offiziellen Fristende erschöpft.",
      "Bewerbung außerhalb des Fördergebiets BW + Sachsen.",
      "Mehr als eine Bewerbung pro Organisation.",
      "Kein klarer Bezug zu einem der vorgegebenen Themenfelder des aktuellen Mottos.",
    ],
  },

  "klimalab-2026": {
    gewichtet: [
      "Klimaschutz als strukturell im Selbstverständnis der Organisation verankert — nicht nur als Einzelprojekt.",
      "Konkrete organisatorische Veränderungen geplant: neue Verantwortlichkeiten, Ablauf-Anpassungen, Leitbild-Überarbeitung oder strategische Partnerschaften.",
      "Stiftung Mercator als Kooperationspartner: Förderung kombiniert finanzielle Mittel mit Beratung und Wissenstransfer — beides nutzen.",
      "Gemeinnützige Organisationen (Vereine, Verbände) als Zielgruppe — keine Einzelpersonen oder kommerzielle Unternehmen.",
    ],
    pflichten: [
      "Antragstellerin muss gemeinnützige Organisation (Verein, Verband) sein.",
      "Vorhaben muss Klimaschutz strukturell in der Organisation verankern — kein reines Einzel-Schulprojekt.",
      "Bewerbungsfrist beachten (war 27. Februar 2026 für 2026er Runde — Frist jährlich prüfen).",
    ],
    fallen: [
      "Klimaschutz nur als Projekt-Thema ohne organisationalen Wandel — entspricht nicht der Förder-Logik.",
      "Keine gemeinnützige Rechtsform oder Sitz außerhalb des Fördergebiets.",
      "Projektantrag ohne Bezug zur strategischen Weiterentwicklung der Organisation.",
    ],
  },

  "berlin-startchancen": {
    gewichtet: [
      "Programm ist für Berliner Schulen mit HOHEM Anteil sozial benachteiligter Schülerschaft — Auswahl durch das Land Berlin, keine freie Bewerbung.",
      "Drei Säulen unterscheiden sich inhaltlich klar: Säule I = Investitionen (Lernräume), Säule II = Chancenbudget (Unterrichts-/Schulentwicklung), Säule III = Multiprofessionelle Teams (Personal).",
      "Kooperation mit externen Partnern (Jugendhilfe, Sozialarbeit, Jugendamt) ist konstitutiv — nicht optional.",
      "Datenbasierte Bedarfsanalyse: demografische und soziale Kennzahlen der Schule konkret benennen.",
      "Schul-Entwicklungsplan muss mit Programm-Ziel verknüpft sein.",
    ],
    pflichten: [
      "Nur Startchancen-Schulen des Landes Berlin können partizipieren — Liste liegt bei der Bildungssenatsverwaltung (startchancen@senbjf.berlin.de).",
      "Vorhaben muss einer der drei Fördersäulen klar zuzuordnen sein.",
      "Multiprofessionalität: nicht nur Lehrkräfte, auch Schulsozialarbeit/Psychologie einbeziehen.",
    ],
    fallen: [
      "Generische Aussagen ('Wir wollen Chancengleichheit fördern') ohne konkreten Sozialraum-Bezug.",
      "Fehlende Multiprofessionalität (nur Lehrkräfte, keine weiteren Professionen).",
      "Keine Verbindung zum Schul-Entwicklungsplan.",
      "Projekt kann keiner der drei Säulen klar zugeordnet werden.",
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
