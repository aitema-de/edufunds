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
  label: "Bundesförderung (z. B. BMBF, BMUV, BMFSFJ)",
  interviewerPriorities: `Prioritäten für Bundesförderungen:
1. Messbare Wirkung: Frage nach quantifizierbaren Indikatoren (Teilnehmende, Stunden, Vorher/Nachher).
2. Transferfähigkeit: Wie wird das Vorhaben auf andere Schulen übertragbar?
3. Anschlussfähigkeit: Bezug zu KMK-Beschlüssen, Bildungsstrategien, Digitalpakt-Kontext, BNE-Zielen etc. — frage, was der Anlass war und ob bestehende Konzepte anknüpfen.
4. Kooperationen: externe Partner (Hochschule, Stiftung, Verein, Betrieb)?
5. Nachhaltigkeit UEBER die Projektlaufzeit hinaus (Strukturen, Curriculum-Verankerung).
6. Erst danach: Budget, Zeitplan, Formalia.`,
  outlineStyle: `Gliederung eher sachlich und gegliedert, typisch: Ausgangslage & Bedarf → Zielsetzung → Vorhabenbeschreibung → Arbeitsplan → Erwartete Wirkungen & Evaluation → Verstetigung → Kooperationen → Finanzplan (falls gewünscht).`,
  sectionStyle: `Tonalität: sachlich, fachlich, nachvollziehbar, KEINE Pathos-Formeln. Fachterminologie, die zum Bildungssektor passt, ist erwünscht. Argumentiere mit Zahlen, Bezügen auf Strategien/Forschung und klaren Kausalketten.`,
  critiqueFocus: `Prüfe besonders: Sind die Wirkungsindikatoren wirklich messbar? Fehlt der Bezug zu nationalen Bildungszielen? Ist die Transferfähigkeit plausibel beschrieben? Wirkt die Nachhaltigkeit hohl ("wird fortgeführt") oder substantiell (strukturelle Verankerung)?`,
};

const LAND_BASE: GeberGuidance = {
  label: "Landesfoerderung",
  interviewerPriorities: `Prioritäten für Landesförderungen:
1. Regionaler Bezug: Wie stärkt das Vorhaben die Schule/Region im Landeskontext? Gibt es Bezug zum Landes-Bildungsplan, zu landesspezifischen Initiativen?
2. Schulträger-Einbindung: Ist der Träger informiert/beteiligt? Teil-Finanzierung?
3. Kommunale Partner: Stadt/Landkreis, Jugendamt, andere Schulen im Netzwerk?
4. Messbare Wirkung auf Schülerebene.
5. Nachhaltigkeit nach Förderende.
6. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung klassisch: Ausgangslage (regional eingebettet) → Zielsetzung → Vorhaben → Partner & Trägerschaft → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalität: sachlich, aber mit regionalem Kolorit (Ort, Gemeinde, Schulform konkret benannt). Landesbehörden-Sprache ist ok ("Schulgemeinschaft", "Bildungsqualität", "Lernbedingungen"), aber keine leeren Floskeln.`,
  critiqueFocus: `Prüfe: Fehlt der regionale Bezug? Ist der Schulträger sichtbar? Passt der Ton zur Behördenperspektive oder klingt es zu PR-haft?`,
};

const STIFTUNG_BASE: GeberGuidance = {
  label: "Stiftungsfoerderung",
  interviewerPriorities: `Prioritäten für Stiftungsförderungen:
1. Passung zur Stiftungsmission: Was treibt die Stiftung an, und wie zahlt das Vorhaben konkret darauf ein? Frage nach dem roten Faden zwischen Bedarf der Schule und Mission der Stiftung.
2. Geschichte & Mensch: Stiftungen reagieren auf plausible, gut erzählte Vorhaben. Frage nach dem konkreten Anlass, nach Personen hinter dem Projekt, nach einer Szene aus dem Schulalltag, die den Bedarf greifbar macht.
3. Zielgruppe SEHR spezifisch: welche Kinder, wie viele, mit welchen Herausforderungen?
4. Wirkung in Beispielen, nicht nur Zahlen.
5. Besonderheiten der Schule (Lage, soziale Faktoren, Milieu).
6. Nachhaltigkeit: realistisch, ehrlich — Stiftungen mögen keinen PR-Glanz ohne Substanz.
7. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung erzählerischer, typisch: Unsere Schule (Kontext) → Der Bedarf (Szene, Menschen) → Unsere Idee → Was wir konkret tun → Was entsteht (Wirkung) → Wie es weitergeht.`,
  sectionStyle: `Tonalität: klar, menschlich, konkret. Kurze Szenen oder Zahlen-Beispiele sind starker als abstrakte Bekenntnisse. Nicht unterwürfig-bittend, aber auch nicht marketing-glatt. Stiftungsname darf genannt werden, wenn es inhaltlich passt.`,
  critiqueFocus: `Prüfe: Ist die Mission-Passung explizit? Gibt es mindestens EIN konkretes Beispiel/Szene, die den Bedarf greifbar macht? Wirkt die Wirkung wie echte Veränderung oder wie ein Event-Bericht? Ist die Nachhaltigkeit glaubhaft oder ein PR-Satz?`,
};

const EU_BASE: GeberGuidance = {
  label: "EU-Förderung (Erasmus+, ESF, etc.)",
  interviewerPriorities: `Prioritäten für EU-Förderungen:
1. Europäischer Mehrwert: Grenzüberschreitende Partnerschaft, Austausch, Best-Practice-Transfer. Frage nach konkreten Partnern oder Partnerregionen, falls nicht vorhanden: wie entsteht der EU-Mehrwert anders?
2. Schlüsselkompetenzen & lifelong learning: Bezug zum Europäischen Referenzrahmen.
3. Querschnittsthemen: Inklusion, Gender, digitale Transformation, Nachhaltigkeit — welche davon adressiert das Vorhaben?
4. Innovation: Was ist hier neu?
5. Evaluation & Dissemination: Wie werden Ergebnisse messbar gemacht und geteilt?
6. Erst danach: Budget, Formalia.`,
  outlineStyle: `Gliederung orientiert sich an EU-Konventionen: Background & Rationale → Objectives → Activities & Methodology → Partnerships → Expected Impact → Dissemination & Sustainability. Deutsch schreiben, aber mit diesen inhaltlichen Blöcken.`,
  sectionStyle: `Tonalität: formell, präzise, explizit zu EU-Prioritäten verlinkt. Bürokratie-Ton ist ok, aber ohne Floskelketten. Indikatoren und Dissemination-Wege müssen konkret benannt sein.`,
  critiqueFocus: `Prüfe: Fehlt der europäische Mehrwert? Sind Querschnittsthemen explizit adressiert? Sind Partnerschaft und Dissemination spezifisch (Namen, Kanäle) oder abstrakt?`,
};

const GENERIC_BASE: GeberGuidance = {
  label: "Allgemeine Förderung",
  interviewerPriorities: `Prioritäten generell:
1. Bedarf und Ausgangslage: Was ist der konkrete Anlass, welche Lücke wird gefüllt?
2. Zielgruppe spezifisch mit Zahlen und Merkmalen.
3. Messbare Wirkung / Ergebnisse.
4. Nachhaltigkeit.
5. Budget-Logik.`,
  outlineStyle: `Standardgliederung: Ausgangslage → Zielsetzung → Vorhaben → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalität: sachlich, konkret, keine Floskeln.`,
  critiqueFocus: `Prüfe auf Floskeln, fehlende Quantifizierung und Belege.`,
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
  label: "Bundesförderung (z. B. BMBF, BMUV, BMFSFJ, BMZ)",
  interviewerPriorities: `Prioritäten für Bundesförderungen (V2 — geschärft):
1. Messbare Wirkung: quantifizierbare Indikatoren PFLICHT — Teilnehmende mit Zahl, Vorher/Nachher-Vergleich, Erhebungsplan. "Verbessert Lernerfolg" ist KEIN Indikator.
2. Strategiebezug: Bezug zu KMK-Strategie 'Bildung in der digitalen Welt', DigitalPakt-Kontext, BNE-Zielen, BMBF-Rahmenprogramm NUR wenn aus User-Antworten belegbar — keinen Strategiebezug erfinden.
3. Transferfähigkeit: Wie überträgbar auf andere Schulen? Konkrete Multiplikations-Mechanismen (Handreichung, Open-Source, Fortbildung).
4. Kooperationen: externe Partner mit Name + Rolle + Beitrag (Hochschule, Stiftung, Verein, Betrieb) — abstrakte "Kooperationspartner sind vorhanden"-Formulierung ist wertlos.
5. Strukturelle Nachhaltigkeit: Curriculum-Verankerung, Personal-Konzept nach Förderende, Betriebsmodell. Kein "wird fortgeführt"-Satz.
6. Erst danach: Budget, Zeitplan, Formalia.`,
  outlineStyle: `Gliederung sachlich-strukturiert: Ausgangslage & Bedarf (mit Zahlen) → Zielsetzung (SMART) → Vorhabenbeschreibung → Arbeitsplan mit Meilensteinen → Evaluation & Wirkungsmessung → Verstetigung (strukturell beschrieben) → Kooperationen (Partner mit Namen) → Finanzplan.`,
  sectionStyle: `Tonalität: sachlich-fachlich, keine PR-Formeln ("zukunftsweisend", "innovativ", "passgenau"). Argumentiere mit konkreten Zahlen und Quellen. Jede Behauptung über Wirkung braucht einen Indikator. Strategiebezug nur wenn belegbar — lieber Lücken-Marker als Erfindung. Nachhaltigkeit strukturell belegen (Budget-Plan, Personalplan, Kooperationsvertrag).`,
  critiqueFocus: `Prüfe SEHR genau: (1) Sind Wirkungsindikatoren wirklich messbar (Zahl + Erhebungsmethode) oder leere Versprechen? (2) Ist Strategiebezug (KMK/DigitalPakt/BNE) aus User-Antworten belegbar oder nur behauptet? (3) Ist Transferfähigkeit konkret beschrieben (Handreichung/Fortbildungs-Konzept) oder ein PR-Satz? (4) Ist Nachhaltigkeit strukturell (Curriculum-Verankerung, Personalplan) oder hohl? (5) Sind externe Partner mit Name + Rolle benannt?`,
};

const LAND_V2: GeberGuidance = {
  label: "Landesfoerderung",
  interviewerPriorities: `Prioritäten für Landesförderungen (V2 — geschärft):
1. Landesspezifischer Bildungsstrategie-Bezug: Welches Bundesland? Welche Landesinitiative (z.B. Berliner Startchancen-Programm, Niedersachsen-Sport-Förderung, Bayern MINT-Initiative)? Nur wenn aus User-Antworten belegbar.
2. Kommunale Verankerung: Schulträger (Stadt/Landkreis) ist informiert und ggf. Mitantragsteller oder Kofinanzier. Konkrete Ansprechperson beim Träger.
3. Föderalismus-Kontext: Bundesland muss bekannt sein — ohne BL-Angabe Lücken-Marker setzen.
4. Regionale Partner: Jugendamt, andere Schulen im Verbund, kommunale Einrichtungen.
5. Messbare Wirkung mit regionalem Bezug.
6. Nachhaltigkeit nach Förderende mit kommunaler Stützung.`,
  outlineStyle: `Gliederung regional eingebettet: Ausgangslage (Ort, Gemeinde, Schulform explizit) → Zielsetzung → Vorhaben → Partner & Trägerschaft (mit Schulträger-Satz) → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalität: sachlich mit regionalem Kolorit. Ort/Gemeinde/Schulform IMMER konkret nennen. Landesbehörden-Sprache ("Schulgemeinschaft", "Bildungsqualität", "Lernbedingungen") ist OK. PR-Glanz und Floskelketten vermeiden. Wenn Bundesland unbekannt: expliziten Lücken-Marker setzen statt zu raten.`,
  critiqueFocus: `Prüfe: (1) Fehlt Bundesland oder kommunaler Kontext — wenn ja, Lücken-Marker statt Erfindung. (2) Ist der Schulträger explizit erwähnt mit Rolle? (3) Ist der Ton behörden-passend oder klingt es zu PR-haft? (4) Sind regionale Besonderheiten (Sozialraum, Schulform, demografische Lage) sichtbar?`,
};

const STIFTUNG_V2: GeberGuidance = {
  label: "Stiftungsfoerderung",
  interviewerPriorities: `Prioritäten für Stiftungsförderungen (V2 — geschärft):
1. Mission-Passung explizit: Die Stiftungsmission (z.B. Aktion Mensch: Inklusion & Teilhabe; Bosch: Schulqualität als Ganzes; Mercator: strategische Partnerschaften) muss im Antrag wöritlich aufgegriffen werden — nicht abstrakt "passt zur Mission".
2. Konkrete Szene als Einstieg: 1-2 Sätze mit einem echten Kind oder einer echten Klassen-Situation, die den Bedarf greifbar macht. Keine Statistik-Einleitung.
3. Zielgruppe SEHR spezifisch: Alter, Klassenstufe, Herausforderung (z.B. "14 Schülerinnen mit Förderbedarf sozio-emotional in Klasse 6-8") — NICHT "benachteiligte Schüler".
4. Wirkungs-Narrativ: Was verändert sich konkret bei diesen Kindern? Beispiel-Szene aus dem Ergebnis (nicht Tabelle).
5. Ehrlichkeit zu Lücken: Stiftungen vertrauen Anträgen mehr, die offen Schwächen benennen.
6. Nachhaltigkeit realistisch: Was bleibt nach Förderende strukturell, was hängt am Förder-Budget?`,
  outlineStyle: `Gliederung erzählerisch-menschlich: Unsere Schule — wer wir sind (1 Absatz) → Der Bedarf — die Szene (konkret) → Unsere Idee (was wir tun) → Die Wirkung (wie es sich anfühlt wenn es klappt) → Wie es weitergeht (realistisch, ehrlich).`,
  sectionStyle: `Tonalität: klar, menschlich, konkret. Szenen > Statistiken. Stiftungsname und Förderschwerpunkt darf direkt erwähnt werden wenn inhaltlich passend. VERBOTEN: "zukunftsweisende Maßnahme", "passgenau", "nachhaltige Strukturen werden etabliert" ohne Erklärung, "ganzheitlicher Ansatz". Ehrliche Lücken sind Stärke, nicht Schwäche.`,
  critiqueFocus: `Prüfe SEHR genau: (1) Ist die Stiftungs-Mission wortlich aufgegriffen (nicht nur behauptet)? (2) Gibt es EINE konkrete Szene mit einem echten Menschen/Kind als Einstieg oder Bedarfs-Illustration? (3) Ist die Zielgruppe wirklich spezifisch (Alter, Klassenstufe, konkrete Herausforderung) oder pauschal? (4) Wirkt die Wirkungsbeschreibung wie echte Veränderung oder wie ein Marketing-Event? (5) Ist die Nachhaltigkeit ehrlich beschrieben oder ein PR-Satz?`,
};

const EU_V2: GeberGuidance = {
  label: "EU-Förderung (Erasmus+, ESF, Horizont, ENSA-BMZ etc.)",
  interviewerPriorities: `Prioritäten für EU-Förderungen (V2 — geschärft):
1. Europäischer Mehrwert PFLICHT: Transnationale Partnerschaft mit MINDESTENS einer benannten Organisation in einem anderen EU-Land (Name + Land + Rolle). Ohne konkrete Partner kein EU-Mehrwert.
2. Querschnittsthemen der EU explizit: Inklusion & Vielfalt, digitale Transformation, Umwelt/Klima, demokratische Teilhabe — mindestens EINE davon mit konkretem Bezug adressieren, nicht nur erwähnen.
3. Schlüsselkompetenzen aus dem Europäischen Referenzrahmen BENENNEN (z.B. Mehrsprachigkeit, digitale Kompetenz, soziale Kompetenz) — nicht abstrakt "Kompetenzen stärken".
4. Innovation: Was ist methodisch oder inhaltlich neu im europäischen Bildungskontext?
5. Dissemination-Plan konkret: Kanäle (Webseite, Newsletter, offene Ressourcen), Adressaten, Zeitrahmen — NICHT "Ergebnisse werden geteilt".
6. Evaluation-Methodik: Wie werden Ergebnisse gemessen? Welche Indikatoren?`,
  outlineStyle: `Gliederung an EU-Konventionen: Background & Rationale (europäischer Kontext) → Objectives (SMART mit EU-Querschnittsthemen) → Activities & Methodology (Partnerschafts-Aktivitäten konkret) → Partnerships (Partner mit Namen, Ländern, Rollen) → Expected Impact (Indikatoren, Messmethoden) → Dissemination & Sustainability (Kanäle, Zeitrahmen).`,
  sectionStyle: `Tonalität: formell, EU-konventionsgerecht. EU-Jargon ("Europäischer Mehrwert", "Querschnittsthemen", "Schlüsseldokumente des Rates") ist OK. VERBOTEN: Abstrakte Partnerbeschreibungen ohne Namen/Land. Dissemination ohne konkrete Kanäle. Querschnittsthemen ohne Bezug zum Vorhaben. Innovation ohne Erklärung was neu ist.`,
  critiqueFocus: `Prüfe: (1) Sind Partnerorganisationen mit Name + Land + Rolle benannt? (2) Sind Querschnittsthemen (Inklusion/Digital/Klima/Demokratie) mit konkretem Vorhaben verbunden oder nur als Schlagwort eingestreut? (3) Sind Schlüsselkompetenzen aus dem EU-Referenzrahmen explizit benannt? (4) Ist der Dissemination-Plan konkret (Kanäle, Adressaten, Zeitrahmen) oder ein Platzhaltender-Satz? (5) Fehlt die Evaluation-Methodik?`,
};

const VERBAND_V2: GeberGuidance = {
  label: "Verbandsförderung / Fachverband",
  interviewerPriorities: `Prioritäten für Verbandsförderungen (V2 — geschärft):
1. Fachterminologie korrekt verwenden: Verbandsförderungen erwarten fachlich korrekte Sprache aus dem jeweiligen Bereich (Sport, Musik, Naturwissenschaft, Sozialarbeit).
2. Methodik explizit beschreiben: Welche Lehr-/Lernmethoden werden eingesetzt? Warum dieser Ansatz?
3. Zielgruppe spezifisch: Welche Schülerinnen (Alter, Klassenstufe, Vorwissen, besondere Herausforderungen)?
4. Wirkungs-Evidenz aus User-Antworten: Erfahrungswerte aus dem Vorhaben zitieren, KEINE erfundenen Studien oder Quellen.
5. Kooperationen: Fachkräfte mit Qualifikation und Rolle (z.B. "Diplomsportpädagoge X, zuständig für Bewegungseinheiten").
6. Praxis-Transfer: Wie fliesst das Gelernte dauerhaft in den Schulalltag ein?`,
  outlineStyle: `Gliederung sachlich-fachlich: Bedarf & Ausgangslage (mit Fachbezug) → Zielsetzung (fachlich präzise) → Methodik (Schritt-für-Schritt) → Zielgruppe (spezifisch) → Wirkung & Evidenz → Nachhaltigkeit & Praxis-Transfer → Kooperationen (Fachkräfte mit Qualifikation).`,
  sectionStyle: `Tonalität: sachlich-evidenzbasiert, weniger Pathos als bei Stiftungen, mehr Methodik als bei Bundesförderungen. Fachterminologie OK und erwünscht. VERBOTEN: erfundene Studien oder Quellenangaben, vage Wirkungsversprechen ohne Evidenz, Floskelketten. Ehrliche Lücken benennen wenn Evidenz fehlt.`,
  critiqueFocus: `Prüfe: (1) Ist die Fachterminologie des Verbands-Bereichs korrekt verwendet oder generisch? (2) Ist die Methodik explizit beschrieben oder nur benannt? (3) Sind Wirkungsaussagen mit Evidenz aus User-Antworten belegt oder erfunden? (4) Sind Fachkräfte mit Qualifikation und Rolle benannt? (5) Ist der Praxis-Transfer in den Schulalltag konkret beschrieben?`,
};

const UNI_V2: GeberGuidance = {
  label: "Uni- / Hochschulförderung",
  interviewerPriorities: `Prioritäten für Uni-/Hochschulförderungen (V2 — geschärft):
1. Wissenschaftliche Methodik: Hypothesen, Untersuchungsdesign, erwartete Erkenntnisse MÜSSEN explizit beschrieben sein.
2. Forschungs-Praxis-Transfer: Wie fliessen wissenschaftliche Erkenntnisse in die Schul-Praxis ein? Wer übersetzt die Ergebnisse für den Unterricht?
3. Partnerschaft Schule-Hochschule: Konkrete Hochschule/Institut mit Name + Fachbereich + Ansprechperson.
4. Publikationspfad oder Dissemination: Wo werden Erkenntnisse veröffentlicht oder geteilt?
5. Ethische Aspekte: Falls Datenerhebung bei Schülerinnen: Eltern-Einwilligung, Datenschutz erwähnen.
6. Replizierbarkeit: Können andere Schulen die Methodik übernehmen?`,
  outlineStyle: `Gliederung wissenschaftlich strukturiert: Forschungsfrage/Hypothesen → Methodik & Untersuchungsdesign → Datenerhebung (Stichprobe, Instrumente) → Erwartete Erkenntnisse → Praxis-Transfer → Dissemination/Publikation → Zeitplan → Finanzierung.`,
  sectionStyle: `Tonalität: wissenschaftlich-präzise. Hypothesen und Methodik-Beschreibung nach wissenschaftlichem Standard. Fachbegriffe aus der Bildungsforschung (Effektgröße, Kontrollgruppe, quasie-experimentelles Design) sind erwünscht wenn angemessen. VERBOTEN: Behauptungen ohne methodischen Beleg, vage Formulierungen wie "neue Erkenntnisse werden gewonnen". Ethische Aspekte der Schülerdaten-Erhebung nicht vergessen.`,
  critiqueFocus: `Prüfe: (1) Sind Hypothesen und Untersuchungsdesign explizit formuliert? (2) Ist der Praxis-Transfer konkret beschrieben (wer, wie, wann)? (3) Ist die Hochschule/das Institut mit Name + Fachbereich benannt? (4) Gibt es einen Publikations- oder Disseminations-Plan? (5) Sind ethische Aspekte (Datenschutz, Eltern-Einwilligung) erwähnt wenn Datenerhebung stattfindet?`,
};

const PROGRAMM_V2: GeberGuidance = {
  label: "Förder-Wettbewerb / Preis (z.B. Bosch-Schulpreis, Ferry-Porsche-Challenge)",
  interviewerPriorities: `Prioritäten für Förder-Wettbewerbe und Preise (V2 — geschärft):
1. Story-driven Einstieg: Vorhaben in 2-3 prägnanten Sätzen erklärbar machen. Was ist das Besondere?
2. Schule-als-Ganzes-Perspektive: Preise (insbesondere Bosch-Schulpreis) bewerben NICHT ein Einzelprojekt, sondern das Schulprofil und die Schul-als-Institution. Kein "ein Lehrer macht das" oder "eine Klasse hat...".
3. Preis-Eignung-Argument: Warum verdient gerade diese Schule/dieses Vorhaben diesen Preis? Was hebt es ab?
4. Konkrete Belege statt Bekenntnisse: Ergebnisse, Daten, abgeschlossene Projekte, Schüler-Stimmen — nichts Erfundenes.
5. Selbstkritik / Ehrlichkeit: Jury-Mitglieder besuchen Shortlist-Schulen — alles muss verifizierbar sein.
6. Regionaler Bezug wenn Preis regional begrenzt ist (z.B. Ferry Porsche Challenge: BW + Sachsen).`,
  outlineStyle: `Gliederung preis-orientiert, prägnant: Was macht uns besonders (Hook) → Unsere Schule im Kontext (Einbettung) → Konkrete Ergebnisse und Belege → Wirkung auf die Schulgemeinschaft → Zukunftsperspektive (wie geht es weiter).`,
  sectionStyle: `Tonalität: knapp, story-driven, mit konkreten Belegen. Qualität vor Quantität bei Beispielen. Marketing-Sprache und PR-Projektberichte sind FATAL für Preis-Anträge — Jurys sind Experten und durchschauen leere Bekenntnisse. Ehrliche Reflexion (was hat nicht funktioniert?) ist ein Pluspunkt.`,
  critiqueFocus: `Prüfe: (1) Ist das Vorhaben in 2-3 Sätzen prägnant erklärbar oder braucht es viele Erklärungen? (2) Wird die Schule-als-Ganzes beschrieben oder nur ein Einzel-Projekt/eine Person? (3) Gibt es konkrete, verifizierbare Belege (Zahlen, Projekte, Schüler-Stimmen) oder Bekenntnisse? (4) Gibt es einen Moment ehrlicher Selbstreflexion? (5) Passt der regionale Bezug bei regional begrenzten Preisen?`,
};

const SONSTIGE_V2: GeberGuidance = {
  label: "Sonstige / unklare Förderung",
  interviewerPriorities: `Prioritäten bei unklarer Geber-Zuordnung (V2 — geschärft):
1. Bedarf und Ausgangslage: Konkreter Anlass, welche Lücke wird gefüllt — mit Zahlen und Fakten.
2. Zielgruppe spezifisch: Alter, Klassenstufe, Herausforderung mit messbaren Merkmalen.
3. Messbare Wirkung: Mindestens ein Indikator der messbar ist.
4. Nachhaltigkeit: Was bleibt nach Förderende?
5. Budget-Logik: Kosten plausibel und förderfähig?`,
  outlineStyle: `Standardgliederung: Ausgangslage → Zielsetzung → Vorhaben → Zielgruppe → Wirkung → Nachhaltigkeit → Finanzierung.`,
  sectionStyle: `Tonalität: neutral-sachlich, lieber generisch-präzise als spezifisch-falsch. Keine Annahmen über Geber-Erwartungen treffen, die nicht aus User-Antworten ableitbar sind. Lücken-Marker setzen statt zu erfinden.`,
  critiqueFocus: `Prüfe: (1) Sind Wirkungsaussagen quantifiziert oder nur vage? (2) Gibt es Floskeln ("zukunftsweisend", "passgenau", "nachhaltige Struktur") ohne Belege? (3) Ist die Zielgruppe spezifisch oder pauschal? (4) Sind Budget-Positionen plausibel und förderfähig beschrieben?`,
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
