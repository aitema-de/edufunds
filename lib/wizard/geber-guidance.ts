/**
 * Leitlinien pro Foerdergeber-Typ — formen Interviewer-Fragen,
 * Antrags-Gliederung, Tonalitaet und Gutachter-Fokus.
 *
 * Basis: reale Erwartungen deutscher Foerdergeber. Keine Halluzinationen ueber
 * spezifische Programme — nur Typ-weites Alignment.
 *
 * GUIDANCE_BASE = bisherige Rubrics (Wave-3-Default OFF → unveraendertes Verhalten)
 * GUIDANCE_V2   = geschaerfte Rubrics mit Typ-spezifischem Wording (Hebel 4)
 * getGuidance() waehlt via PIPELINE_CONFIG.geberRoutingV2 zwischen Base und V2.
 */

import { PIPELINE_CONFIG } from "./config";

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

// ─────────────────────────────────────────────────────────────────────────────
// GUIDANCE_BASE — bisherige Rubrics (Default OFF → unveraendertes Verhalten)
// ─────────────────────────────────────────────────────────────────────────────

const BUND_BASE: GeberGuidance = {
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

const LAND_BASE: GeberGuidance = {
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

const STIFTUNG_BASE: GeberGuidance = {
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

const EU_BASE: GeberGuidance = {
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

const GENERIC_BASE: GeberGuidance = {
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

/** Record-Form fuer Base (alle 8 GeberTyp-Keys). */
export const GUIDANCE_BASE: Record<GeberTyp, GeberGuidance> = {
  bund: BUND_BASE,
  land: LAND_BASE,
  stiftung: STIFTUNG_BASE,
  eu: EU_BASE,
  verband: GENERIC_BASE,
  uni: GENERIC_BASE,
  programm: GENERIC_BASE,
  sonstige: GENERIC_BASE,
};

// ─────────────────────────────────────────────────────────────────────────────
// GUIDANCE_V2 — geschaerfte Rubrics (Hebel 4, PIPELINE_GEBER_ROUTING_V2=1)
//
// Wording-Prinzip: Typ-spezifische critiqueFocus + sectionStyle mit konkreten
// Beispielen aus den Dossiers, Cluster-spezifischer Tonalitaets-Pruefung und
// praeziseren Verbots-Mustern fuer das LLM-as-Judge + Section-Generation.
// ─────────────────────────────────────────────────────────────────────────────

const BUND_V2: GeberGuidance = {
  label: "Bundesfoerderung (z. B. BMBF, BMUV, BMFSFJ, BMZ)",
  interviewerPriorities: `Prioritaeten fuer Bundesfoerderungen (V2 — geschaerft):
1. Messbare Wirkung: quantifizierbare Indikatoren PFLICHT — Teilnehmende mit Zahl, Vorher/Nachher-Vergleich, Erhebungsplan. "Verbessert Lernerfolg" ist KEIN Indikator.
2. Strategiebezug: Bezug zu KMK-Strategie 'Bildung in der digitalen Welt', DigitalPakt-Kontext, BNE-Zielen, BMBF-Rahmenprogramm NUR wenn aus User-Antworten belegbar — keinen Strategiebezug erfinden.
3. Transferfaehigkeit: Wie uebertraegbar auf andere Schulen? Konkrete Multiplikations-Mechanismen (Handreichung, Open-Source, Fortbildung).
4. Kooperationen: externe Partner mit Name + Rolle + Beitrag (Hochschule, Stiftung, Verein, Betrieb) — abstrakte "Kooperationspartner sind vorhanden"-Formulierung ist wertlos.
5. Strukturelle Nachhaltigkeit: Curriculum-Verankerung, Personal-Konzept nach Foerderende, Betriebsmodell. Kein "wird fortgefuehrt"-Satz.
6. Erst danach: Budget, Zeitplan, Formalia.`,
  outlineStyle: `Gliederung sachlich-strukturiert: Ausgangslage & Bedarf (mit Zahlen) → Zielsetzung (SMART) → Vorhabenbeschreibung → Arbeitsplan mit Meilensteinen → Evaluation & Wirkungsmessung → Verstetigung (strukturell beschrieben) → Kooperationen (Partner mit Namen) → Finanzplan.`,
  sectionStyle: `Tonalitaet: sachlich-fachlich, keine PR-Formeln ("zukunftsweisend", "innovativ", "passgenau"). Argumentiere mit konkreten Zahlen und Quellen. Jede Behauptung ueber Wirkung braucht einen Indikator. Strategiebezug nur wenn belegbar — lieber Luecken-Marker als Erfindung. Nachhaltigkeit strukturell belegen (Budget-Plan, Personalplan, Kooperationsvertrag).`,
  critiqueFocus: `Pruefe SEHR genau: (1) Sind Wirkungsindikatoren wirklich messbar (Zahl + Erhebungsmethode) oder leere Versprechen? (2) Ist Strategiebezug (KMK/DigitalPakt/BNE) aus User-Antworten belegbar oder nur behauptet? (3) Ist Transferfaehigkeit konkret beschrieben (Handreichung/Fortbildungs-Konzept) oder ein PR-Satz? (4) Ist Nachhaltigkeit strukturell (Curriculum-Verankerung, Personalplan) oder hohl? (5) Sind externe Partner mit Name + Rolle benannt?`,
};

const LAND_V2: GeberGuidance = {
  label: "Landesfoerderung",
  interviewerPriorities: `Prioritaeten fuer Landesfoerderungen (V2 — geschaerft):
1. Landesspezifischer Bildungsstrategie-Bezug: Welches Bundesland? Welche Landesinitiative (z.B. Berliner Startchancen-Programm, Niedersachsen-Sport-Foerderung, Bayern MINT-Initiative)? Nur wenn aus User-Antworten belegbar.
2. Kommunale Verankerung: Schultraeger (Stadt/Landkreis) ist informiert und ggf. Mitantragsteller oder Kofinanzier. Konkrete Ansprechperson beim Traeger.
3. Foederalismus-Kontext: Bundesland muss bekannt sein — ohne BL-Angabe Luecken-Marker setzen.
4. Regionale Partner: Jugendamt, andere Schulen im Verbund, kommunale Einrichtungen.
5. Messbare Wirkung mit regionalem Bezug.
6. Nachhaltigkeit nach Foerderende mit kommunaler Stuetzung.`,
  outlineStyle: `Gliederung regional eingebettet: Ausgangslage (Ort, Gemeinde, Schulform explizit) → Zielsetzung → Vorhaben → Partner & Traegerschaft (mit Schultraeger-Satz) → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalitaet: sachlich mit regionalem Kolorit. Ort/Gemeinde/Schulform IMMER konkret nennen. Landesbehoerden-Sprache ("Schulgemeinschaft", "Bildungsqualitaet", "Lernbedingungen") ist OK. PR-Glanz und Floskelketten vermeiden. Wenn Bundesland unbekannt: expliziten Luecken-Marker setzen statt zu raten.`,
  critiqueFocus: `Pruefe: (1) Fehlt Bundesland oder kommunaler Kontext — wenn ja, Luecken-Marker statt Erfindung. (2) Ist der Schultraeger explizit erwähnt mit Rolle? (3) Ist der Ton behoerden-passend oder klingt es zu PR-haft? (4) Sind regionale Besonderheiten (Sozialraum, Schulform, demografische Lage) sichtbar?`,
};

const STIFTUNG_V2: GeberGuidance = {
  label: "Stiftungsfoerderung",
  interviewerPriorities: `Prioritaeten fuer Stiftungsfoerderungen (V2 — geschaerft):
1. Mission-Passung explizit: Die Stiftungsmission (z.B. Aktion Mensch: Inklusion & Teilhabe; Bosch: Schulqualitaet als Ganzes; Mercator: strategische Partnerschaften) muss im Antrag woeritlich aufgegriffen werden — nicht abstrakt "passt zur Mission".
2. Konkrete Szene als Einstieg: 1-2 Saetze mit einem echten Kind oder einer echten Klassen-Situation, die den Bedarf greifbar macht. Keine Statistik-Einleitung.
3. Zielgruppe SEHR spezifisch: Alter, Klassenstufe, Herausforderung (z.B. "14 Schuelerinnen mit Foerderbedarf sozio-emotional in Klasse 6-8") — NICHT "benachteiligte Schueler".
4. Wirkungs-Narrativ: Was veraendert sich konkret bei diesen Kindern? Beispiel-Szene aus dem Ergebnis (nicht Tabelle).
5. Ehrlichkeit zu Luecken: Stiftungen vertrauen Antraegen mehr, die offen Schwaechen benennen.
6. Nachhaltigkeit realistisch: Was bleibt nach Foerderende strukturell, was haengt am Foerder-Budget?`,
  outlineStyle: `Gliederung erzaehlerisch-menschlich: Unsere Schule — wer wir sind (1 Absatz) → Der Bedarf — die Szene (konkret) → Unsere Idee (was wir tun) → Die Wirkung (wie es sich anfuehlt wenn es klappt) → Wie es weitergeht (realistisch, ehrlich).`,
  sectionStyle: `Tonalitaet: klar, menschlich, konkret. Szenen > Statistiken. Stiftungsname und Foerderschwerpunkt darf direkt erwaehnt werden wenn inhaltlich passend. VERBOTEN: "zukunftsweisende Massnahme", "passgenau", "nachhaltige Strukturen werden etabliert" ohne Erklaerung, "ganzheitlicher Ansatz". Ehrliche Luecken sind Staerke, nicht Schwaeche.`,
  critiqueFocus: `Pruefe SEHR genau: (1) Ist die Stiftungs-Mission wortlich aufgegriffen (nicht nur behauptet)? (2) Gibt es EINE konkrete Szene mit einem echten Menschen/Kind als Einstieg oder Bedarfs-Illustration? (3) Ist die Zielgruppe wirklich spezifisch (Alter, Klassenstufe, konkrete Herausforderung) oder pauschal? (4) Wirkt die Wirkungsbeschreibung wie echte Veraenderung oder wie ein Marketing-Event? (5) Ist die Nachhaltigkeit ehrlich beschrieben oder ein PR-Satz?`,
};

const EU_V2: GeberGuidance = {
  label: "EU-Foerderung (Erasmus+, ESF, Horizont, ENSA-BMZ etc.)",
  interviewerPriorities: `Prioritaeten fuer EU-Foerderungen (V2 — geschaerft):
1. Europaeischer Mehrwert PFLICHT: Transnationale Partnerschaft mit MINDESTENS einer benannten Organisation in einem anderen EU-Land (Name + Land + Rolle). Ohne konkrete Partner kein EU-Mehrwert.
2. Querschnittsthemen der EU explizit: Inklusion & Vielfalt, digitale Transformation, Umwelt/Klima, demokratische Teilhabe — mindestens EINE davon mit konkretem Bezug adressieren, nicht nur erwaehnen.
3. Schluesselkompetenzen aus dem Europaeischen Referenzrahmen BENENNEN (z.B. Mehrsprachigkeit, digitale Kompetenz, soziale Kompetenz) — nicht abstrakt "Kompetenzen staerken".
4. Innovation: Was ist methodisch oder inhaltlich neu im europaeischen Bildungskontext?
5. Dissemination-Plan konkret: Kanaele (Webseite, Newsletter, offene Ressourcen), Adressaten, Zeitrahmen — NICHT "Ergebnisse werden geteilt".
6. Evaluation-Methodik: Wie werden Ergebnisse gemessen? Welche Indikatoren?`,
  outlineStyle: `Gliederung an EU-Konventionen: Background & Rationale (europaeischer Kontext) → Objectives (SMART mit EU-Querschnittsthemen) → Activities & Methodology (Partnerschafts-Aktivitaeten konkret) → Partnerships (Partner mit Namen, Laendern, Rollen) → Expected Impact (Indikatoren, Messmethoden) → Dissemination & Sustainability (Kanaele, Zeitrahmen).`,
  sectionStyle: `Tonalitaet: formell, EU-konventionsgerecht. EU-Jargon ("Europaeischer Mehrwert", "Querschnittsthemen", "Schluesseldokumente des Rates") ist OK. VERBOTEN: Abstrakte Partnerbeschreibungen ohne Namen/Land. Dissemination ohne konkrete Kanaele. Querschnittsthemen ohne Bezug zum Vorhaben. Innovation ohne Erklaerung was neu ist.`,
  critiqueFocus: `Pruefe: (1) Sind Partnerorganisationen mit Name + Land + Rolle benannt? (2) Sind Querschnittsthemen (Inklusion/Digital/Klima/Demokratie) mit konkretem Vorhaben verbunden oder nur als Schlagwort eingestreut? (3) Sind Schluesselkompetenzen aus dem EU-Referenzrahmen explizit benannt? (4) Ist der Dissemination-Plan konkret (Kanaele, Adressaten, Zeitrahmen) oder ein Platzhaltender-Satz? (5) Fehlt die Evaluation-Methodik?`,
};

const VERBAND_V2: GeberGuidance = {
  label: "Verbandsfoerderung / Fachverband",
  interviewerPriorities: `Prioritaeten fuer Verbandsfoerderungen (V2 — geschaerft):
1. Fachterminologie korrekt verwenden: Verbandsfoerderungen erwarten fachlich korrekte Sprache aus dem jeweiligen Bereich (Sport, Musik, Naturwissenschaft, Sozialarbeit).
2. Methodik explizit beschreiben: Welche Lehr-/Lernmethoden werden eingesetzt? Warum dieser Ansatz?
3. Zielgruppe spezifisch: Welche Schuelerinnen (Alter, Klassenstufe, Vorwissen, besondere Herausforderungen)?
4. Wirkungs-Evidenz aus User-Antworten: Erfahrungswerte aus dem Vorhaben zitieren, KEINE erfundenen Studien oder Quellen.
5. Kooperationen: Fachkraefte mit Qualifikation und Rolle (z.B. "Diplomsportpaedagoge X, zustaendig fuer Bewegungseinheiten").
6. Praxis-Transfer: Wie fliesst das Gelernte dauerhaft in den Schulalltag ein?`,
  outlineStyle: `Gliederung sachlich-fachlich: Bedarf & Ausgangslage (mit Fachbezug) → Zielsetzung (fachlich praezise) → Methodik (Schritt-fuer-Schritt) → Zielgruppe (spezifisch) → Wirkung & Evidenz → Nachhaltigkeit & Praxis-Transfer → Kooperationen (Fachkraefte mit Qualifikation).`,
  sectionStyle: `Tonalitaet: sachlich-evidenzbasiert, weniger Pathos als bei Stiftungen, mehr Methodik als bei Bundesfoerderungen. Fachterminologie OK und erwuenscht. VERBOTEN: erfundene Studien oder Quellenangaben, vage Wirkungsversprechen ohne Evidenz, Floskelketten. Ehrliche Luecken benennen wenn Evidenz fehlt.`,
  critiqueFocus: `Pruefe: (1) Ist die Fachterminologie des Verbands-Bereichs korrekt verwendet oder generisch? (2) Ist die Methodik explizit beschrieben oder nur benannt? (3) Sind Wirkungsaussagen mit Evidenz aus User-Antworten belegt oder erfunden? (4) Sind Fachkraefte mit Qualifikation und Rolle benannt? (5) Ist der Praxis-Transfer in den Schulalltag konkret beschrieben?`,
};

const UNI_V2: GeberGuidance = {
  label: "Uni- / Hochschulfoerderung",
  interviewerPriorities: `Prioritaeten fuer Uni-/Hochschulfoerderungen (V2 — geschaerft):
1. Wissenschaftliche Methodik: Hypothesen, Untersuchungsdesign, erwartete Erkenntnisse MUESSEN explizit beschrieben sein.
2. Forschungs-Praxis-Transfer: Wie fliessen wissenschaftliche Erkenntnisse in die Schul-Praxis ein? Wer uebersetzt die Ergebnisse fuer den Unterricht?
3. Partnerschaft Schule-Hochschule: Konkrete Hochschule/Institut mit Name + Fachbereich + Ansprechperson.
4. Publikationspfad oder Dissemination: Wo werden Erkenntnisse veroeffentlicht oder geteilt?
5. Ethische Aspekte: Falls Datenerhebung bei Schuelerinnen: Eltern-Einwilligung, Datenschutz erwähnen.
6. Replizierbarkeit: Koennen andere Schulen die Methodik uebernehmen?`,
  outlineStyle: `Gliederung wissenschaftlich strukturiert: Forschungsfrage/Hypothesen → Methodik & Untersuchungsdesign → Datenerhebung (Stichprobe, Instrumente) → Erwartete Erkenntnisse → Praxis-Transfer → Dissemination/Publikation → Zeitplan → Finanzierung.`,
  sectionStyle: `Tonalitaet: wissenschaftlich-praezise. Hypothesen und Methodik-Beschreibung nach wissenschaftlichem Standard. Fachbegriffe aus der Bildungsforschung (Effektgroesse, Kontrollgruppe, quasie-experimentelles Design) sind erwuenscht wenn angemessen. VERBOTEN: Behauptungen ohne methodischen Beleg, vage Formulierungen wie "neue Erkenntnisse werden gewonnen". Ethische Aspekte der Schuelerdaten-Erhebung nicht vergessen.`,
  critiqueFocus: `Pruefe: (1) Sind Hypothesen und Untersuchungsdesign explizit formuliert? (2) Ist der Praxis-Transfer konkret beschrieben (wer, wie, wann)? (3) Ist die Hochschule/das Institut mit Name + Fachbereich benannt? (4) Gibt es einen Publikations- oder Disseminations-Plan? (5) Sind ethische Aspekte (Datenschutz, Eltern-Einwilligung) erwaehnt wenn Datenerhebung stattfindet?`,
};

const PROGRAMM_V2: GeberGuidance = {
  label: "Foerder-Wettbewerb / Preis (z.B. Bosch-Schulpreis, Ferry-Porsche-Challenge)",
  interviewerPriorities: `Prioritaeten fuer Foerder-Wettbewerbe und Preise (V2 — geschaerft):
1. Story-driven Einstieg: Vorhaben in 2-3 praegnanten Saetzen erklaerbar machen. Was ist das Besondere?
2. Schule-als-Ganzes-Perspektive: Preise (insbesondere Bosch-Schulpreis) bewerben NICHT ein Einzelprojekt, sondern das Schulprofil und die Schul-als-Institution. Kein "ein Lehrer macht das" oder "eine Klasse hat...".
3. Preis-Eignung-Argument: Warum verdient gerade diese Schule/dieses Vorhaben diesen Preis? Was hebt es ab?
4. Konkrete Belege statt Bekenntnisse: Ergebnisse, Daten, abgeschlossene Projekte, Schueler-Stimmen — nichts Erfundenes.
5. Selbstkritik / Ehrlichkeit: Jury-Mitglieder besuchen Shortlist-Schulen — alles muss verifizierbar sein.
6. Regionaler Bezug wenn Preis regional begrenzt ist (z.B. Ferry Porsche Challenge: BW + Sachsen).`,
  outlineStyle: `Gliederung preis-orientiert, praegnant: Was macht uns besonders (Hook) → Unsere Schule im Kontext (Einbettung) → Konkrete Ergebnisse und Belege → Wirkung auf die Schulgemeinschaft → Zukunftsperspektive (wie geht es weiter).`,
  sectionStyle: `Tonalitaet: knapp, story-driven, mit konkreten Belegen. Qualitaet vor Quantitaet bei Beispielen. Marketing-Sprache und PR-Projektberichte sind FATAL fuer Preis-Antraege — Jurys sind Experten und durchschauen leere Bekenntnisse. Ehrliche Reflexion (was hat nicht funktioniert?) ist ein Pluspunkt.`,
  critiqueFocus: `Pruefe: (1) Ist das Vorhaben in 2-3 Saetzen praegnant erklaerbar oder braucht es viele Erklaerungen? (2) Wird die Schule-als-Ganzes beschrieben oder nur ein Einzel-Projekt/eine Person? (3) Gibt es konkrete, verifizierbare Belege (Zahlen, Projekte, Schueler-Stimmen) oder Bekenntnisse? (4) Gibt es einen Moment ehrlicher Selbstreflexion? (5) Passt der regionale Bezug bei regional begrenzten Preisen?`,
};

const SONSTIGE_V2: GeberGuidance = {
  label: "Sonstige / unklare Foerderung",
  interviewerPriorities: `Prioritaeten bei unklarer Geber-Zuordnung (V2 — geschaerft):
1. Bedarf und Ausgangslage: Konkreter Anlass, welche Luecke wird gefuellt — mit Zahlen und Fakten.
2. Zielgruppe spezifisch: Alter, Klassenstufe, Herausforderung mit messbaren Merkmalen.
3. Messbare Wirkung: Mindestens ein Indikator der messbar ist.
4. Nachhaltigkeit: Was bleibt nach Foerderende?
5. Budget-Logik: Kosten plausibel und foerderfaehig?`,
  outlineStyle: `Standardgliederung: Ausgangslage → Zielsetzung → Vorhaben → Zielgruppe → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalitaet: neutral-sachlich, lieber generisch-praezise als spezifisch-falsch. Keine Annahmen ueber Geber-Erwartungen treffen, die nicht aus User-Antworten ableitbar sind. Luecken-Marker setzen statt zu erfinden.`,
  critiqueFocus: `Pruefe: (1) Sind Wirkungsaussagen quantifiziert oder nur vage? (2) Gibt es Floskeln ("zukunftsweisend", "passgenau", "nachhaltige Struktur") ohne Belege? (3) Ist die Zielgruppe spezifisch oder pauschal? (4) Sind Budget-Positionen plausibel und foerderfaehig beschrieben?`,
};

/** Record-Form fuer V2 (alle 8 GeberTyp-Keys — TypeScript erzwingt Vollstaendigkeit). */
export const GUIDANCE_V2: Record<GeberTyp, GeberGuidance> = {
  bund: BUND_V2,
  land: LAND_V2,
  stiftung: STIFTUNG_V2,
  eu: EU_V2,
  verband: VERBAND_V2,
  uni: UNI_V2,
  programm: PROGRAMM_V2,
  sonstige: SONSTIGE_V2,
};

// ─────────────────────────────────────────────────────────────────────────────
// Selector: waehlt via PIPELINE_CONFIG.geberRoutingV2 zwischen Base und V2.
// Default OFF → GUIDANCE_BASE = bisheriges Verhalten (keine Regression).
// ─────────────────────────────────────────────────────────────────────────────

export const GUIDANCE: Record<GeberTyp, GeberGuidance> = PIPELINE_CONFIG.geberRoutingV2
  ? GUIDANCE_V2
  : GUIDANCE_BASE;

export function getGuidance(typ: string | undefined): GeberGuidance {
  const key = (typ ?? "").toLowerCase() as GeberTyp;
  return GUIDANCE[key] ?? GUIDANCE.sonstige;
}
