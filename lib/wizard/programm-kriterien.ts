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
    ],
    pflichten: [
      "Partner-Organisation muss Aktion-Mensch-foerderfaehig sein (i.d.R. gemeinnuetziger Traeger).",
      "Kofinanzierung: 30 % Eigenanteil in der Regel erforderlich.",
    ],
    fallen: [
      "Reine Schulprojekte ohne einen zusaetzlichen sozialen Traeger — nicht foerderfaehig.",
      "Tokenistische Inklusion ('auch eine Foerderschule besucht uns einmal') statt echter Ko-Konstruktion.",
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
