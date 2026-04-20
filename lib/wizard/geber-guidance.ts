/**
 * Leitlinien pro Foerdergeber-Typ — formen Interviewer-Fragen,
 * Antrags-Gliederung, Tonalitaet und Gutachter-Fokus.
 *
 * Basis: reale Erwartungen deutscher Foerdergeber. Keine Halluzinationen ueber
 * spezifische Programme — nur Typ-weites Alignment.
 */

export type GeberTyp =
  | "bund"
  | "land"
  | "stiftung"
  | "eu"
  | "verband"
  | "uni"
  | "programm"
  | "sonstige";

export interface GeberGuidance {
  label: string;
  interviewerPriorities: string;
  outlineStyle: string;
  sectionStyle: string;
  critiqueFocus: string;
}

const BUND: GeberGuidance = {
  label: "Bundesfoerderung (z. B. BMBF, BMUV, BMFSFJ)",
  interviewerPriorities: `Prioritaeten fuer Bundesfoerderungen:
1. Messbare Wirkung: Frage nach quantifizierbaren Indikatoren (Teilnehmende, Stunden, Vorher/Nachher).
2. Transferfaehigkeit: Wie wird das Vorhaben auf andere Schulen uebertragbar?
3. Anschlussfaehigkeit: Bezug zu KMK-Beschluessen, Bildungsstrategien, Digitalpakt-Kontext, BNE-Zielen etc. — frage, was der Anlass war und ob bestehende Konzepte anknuepfen.
4. Kooperationen: externe Partner (Hochschule, Stiftung, Verein, Betrieb)?
5. Nachhaltigkeit UEBER die Projektlaufzeit hinaus (Strukturen, Curriculum-Verankerung).
6. Erst danach: Budget, Zeitplan, Formalia.`,
  outlineStyle: `Gliederung eher sachlich und gegliedert, typisch: Ausgangslage & Bedarf → Zielsetzung → Vorhabenbeschreibung → Arbeitsplan → Erwartete Wirkungen & Evaluation → Verstetigung → Kooperationen → Finanzplan (falls gewuenscht).`,
  sectionStyle: `Tonalitaet: sachlich, fachlich, nachvollziehbar, KEINE Pathos-Formeln. Fachterminologie, die zum Bildungssektor passt, ist erwuenscht. Argumentiere mit Zahlen, Bezuegen auf Strategien/Forschung und klaren Kausalketten.`,
  critiqueFocus: `Pruefe besonders: Sind die Wirkungsindikatoren wirklich messbar? Fehlt der Bezug zu nationalen Bildungszielen? Ist die Transferfaehigkeit plausibel beschrieben? Wirkt die Nachhaltigkeit hohl ("wird fortgefuehrt") oder substantiell (strukturelle Verankerung)?`,
};

const LAND: GeberGuidance = {
  label: "Landesfoerderung",
  interviewerPriorities: `Prioritaeten fuer Landesfoerderungen:
1. Regionaler Bezug: Wie staerkt das Vorhaben die Schule/Region im Landeskontext? Gibt es Bezug zum Landes-Bildungsplan, zu landesspezifischen Initiativen?
2. Schultraeger-Einbindung: Ist der Traeger informiert/beteiligt? Teil-Finanzierung?
3. Kommunale Partner: Stadt/Landkreis, Jugendamt, andere Schulen im Netzwerk?
4. Messbare Wirkung auf Schuelerebene.
5. Nachhaltigkeit nach Foerderende.
6. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung klassisch: Ausgangslage (regional eingebettet) → Zielsetzung → Vorhaben → Partner & Traegerschaft → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalitaet: sachlich, aber mit regionalem Kolorit (Ort, Gemeinde, Schulform konkret benannt). Landesbehoerden-Sprache ist ok ("Schulgemeinschaft", "Bildungsqualitaet", "Lernbedingungen"), aber keine leeren Floskeln.`,
  critiqueFocus: `Pruefe: Fehlt der regionale Bezug? Ist der Schultraeger sichtbar? Passt der Ton zur Behoerdenperspektive oder klingt es zu PR-haft?`,
};

const STIFTUNG: GeberGuidance = {
  label: "Stiftungsfoerderung",
  interviewerPriorities: `Prioritaeten fuer Stiftungsfoerderungen:
1. Passung zur Stiftungsmission: Was treibt die Stiftung an, und wie zahlt das Vorhaben konkret darauf ein? Frage nach dem roten Faden zwischen Bedarf der Schule und Mission der Stiftung.
2. Geschichte & Mensch: Stiftungen reagieren auf plausible, gut erzaehlte Vorhaben. Frage nach dem konkreten Anlass, nach Personen hinter dem Projekt, nach einer Szene aus dem Schulalltag, die den Bedarf greifbar macht.
3. Zielgruppe SEHR spezifisch: welche Kinder, wie viele, mit welchen Herausforderungen?
4. Wirkung in Beispielen, nicht nur Zahlen.
5. Besonderheiten der Schule (Lage, soziale Faktoren, Milieu).
6. Nachhaltigkeit: realistisch, ehrlich — Stiftungen mögen keinen PR-Glanz ohne Substanz.
7. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung erzaehlerischer, typisch: Unsere Schule (Kontext) → Der Bedarf (Szene, Menschen) → Unsere Idee → Was wir konkret tun → Was entsteht (Wirkung) → Wie es weitergeht.`,
  sectionStyle: `Tonalitaet: klar, menschlich, konkret. Kurze Szenen oder Zahlen-Beispiele sind starker als abstrakte Bekenntnisse. Nicht unterwuerfig-bittend, aber auch nicht marketing-glatt. Stiftungsname darf genannt werden, wenn es inhaltlich passt.`,
  critiqueFocus: `Pruefe: Ist die Mission-Passung explizit? Gibt es mindestens EIN konkretes Beispiel/Szene, die den Bedarf greifbar macht? Wirkt die Wirkung wie echte Veraenderung oder wie ein Event-Bericht? Ist die Nachhaltigkeit glaubhaft oder ein PR-Satz?`,
};

const EU: GeberGuidance = {
  label: "EU-Foerderung (Erasmus+, ESF, etc.)",
  interviewerPriorities: `Prioritaeten fuer EU-Foerderungen:
1. Europaeischer Mehrwert: Grenzueberschreitende Partnerschaft, Austausch, Best-Practice-Transfer. Frage nach konkreten Partnern oder Partnerregionen, falls nicht vorhanden: wie entsteht der EU-Mehrwert anders?
2. Schluesselkompetenzen & lifelong learning: Bezug zum Europaeischen Referenzrahmen.
3. Querschnittsthemen: Inklusion, Gender, digitale Transformation, Nachhaltigkeit — welche davon adressiert das Vorhaben?
4. Innovation: Was ist hier neu?
5. Evaluation & Dissemination: Wie werden Ergebnisse messbar gemacht und geteilt?
6. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung orientiert sich an EU-Konventionen: Background & Rationale → Objectives → Activities & Methodology → Partnerships → Expected Impact → Dissemination & Sustainability. Deutsch schreiben, aber mit diesen inhaltlichen Bloecken.`,
  sectionStyle: `Tonalitaet: formell, praezise, explizit zu EU-Prioritaeten verlinkt. Buerokratie-Ton ist ok, aber ohne Floskelketten. Indikatoren und Dissemination-Wege muessen konkret benannt sein.`,
  critiqueFocus: `Pruefe: Fehlt der europaeische Mehrwert? Sind Querschnittsthemen explizit adressiert? Sind Partnerschaft und Dissemination spezifisch (Namen, Kanaele) oder abstrakt?`,
};

const GENERIC: GeberGuidance = {
  label: "Allgemeine Foerderung",
  interviewerPriorities: `Prioritaeten generell:
1. Bedarf und Ausgangslage: Was ist der konkrete Anlass, welche Luecke wird gefuellt?
2. Zielgruppe spezifisch mit Zahlen und Merkmalen.
3. Messbare Wirkung / Ergebnisse.
4. Nachhaltigkeit.
5. Budget-Logik.`,
  outlineStyle: `Standardgliederung: Ausgangslage → Zielsetzung → Vorhaben → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalitaet: sachlich, konkret, keine Floskeln.`,
  critiqueFocus: `Pruefe auf Floskeln, fehlende Quantifizierung und Belege.`,
};

export function getGuidance(typ: string | undefined): GeberGuidance {
  switch ((typ ?? "").toLowerCase() as GeberTyp) {
    case "bund":
      return BUND;
    case "land":
      return LAND;
    case "stiftung":
      return STIFTUNG;
    case "eu":
      return EU;
    default:
      return GENERIC;
  }
}
