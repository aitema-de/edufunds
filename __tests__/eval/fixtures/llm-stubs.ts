/**
 * Deterministische LLM-Stubs fuer Wave-2-Tests (jest.mock-Targets).
 * Wave 2 Plan 05-04 — realistische Stub-Antworten.
 *
 * Verwendung in Tests:
 *   import { STUB_JUDGE_RESPONSE_OEFFENTLICH } from "@/tests/eval/fixtures/llm-stubs";
 *   jest.mock("@/lib/wizard/llm", ...);
 *   (generateJson as jest.Mock).mockResolvedValue({ value: STUB_JUDGE_RESPONSE_OEFFENTLICH, usage: { promptTokens: 100, candidatesTokens: 200 } });
 */

/** Realistische Judge-Antwort fuer Geber-Gruppe 'oeffentlich' (6 Kriterien aus RUBRIC_OEFFENTLICH).
 * Gewichteter Score: 65*25 + 70*20 + 55*15 + 60*15 + 50*15 + 75*10 = 1625+1400+825+900+750+750 = 6250 / 100 = 62.5 → ~63
 */
export const STUB_JUDGE_RESPONSE_OEFFENTLICH = {
  kriterien: [
    {
      id: "messbare-wirkung",
      score: 65,
      beleg: "80 Schueler werden am Projekt teilnehmen",
      verbesserung: "Vorher/Nachher-Messung mit konkreten Lernzielen ergaenzen",
    },
    {
      id: "strategiebezug",
      score: 70,
      beleg: "Im Rahmen des DigitalPakts 2.0 foerdern wir digitale Kompetenzen",
      verbesserung: "KMK-Strategie explizit nennen und verankern",
    },
    {
      id: "transferfaehigkeit",
      score: 55,
      beleg: "Das Konzept soll auf andere Schulen uebertragen werden",
      verbesserung: "Konkrete Schritte und Zeitplan fuer Transfer beschreiben",
    },
    {
      id: "kooperationen",
      score: 60,
      beleg: "In Kooperation mit der Universitaet Berlin",
      verbesserung: "Rolle und konkrete Beitraege der Universitaet benennen",
    },
    {
      id: "nachhaltigkeit-struktur",
      score: 50,
      beleg: "Das Projekt wird nach Foerderung fortgefuehrt",
      verbesserung: "Curriculum-Verankerung und Finanzierungsplan nach Foerderung ergaenzen",
    },
    {
      id: "tonalitaet",
      score: 75,
      beleg: "Sachlicher, evidenzbasierter Ton im gesamten Antrag",
      verbesserung: "Wenige Floskeln wie 'zukunftsweisend' streichen",
    },
  ],
  gesamt: 63,
  summary:
    "Der Antrag zeigt guten Strategiebezug und sachlichen Ton. Transferfaehigkeit und Nachhaltigkeit koennen konkreter ausformuliert werden.",
};

/** Stub fuer Geber-Gruppe 'stiftung'. */
export const STUB_JUDGE_RESPONSE_STIFTUNG = {
  kriterien: [
    {
      id: "mission-passung",
      score: 80,
      beleg: "Foerderung bildungsbenachteiligter Kinder steht im Mittelpunkt",
      verbesserung: "Bezug zur spezifischen Foerdermission der Stiftung staerken",
    },
    {
      id: "konkrete-szene",
      score: 70,
      beleg: "Maria, 10 Jahre, aus einer Migrationsfamilie, profitiert besonders",
      verbesserung: "Weiteres konkretes Beispiel mit Vorher/Nachher ergaenzen",
    },
    {
      id: "zielgruppe-spezifisch",
      score: 75,
      beleg: "Kinder mit Foerderbedarf in Jahrgangsstufe 3-6",
      verbesserung: "Benachteiligungsmerkmale differenzierter benennen",
    },
    {
      id: "wirkung-narrativ",
      score: 65,
      beleg: "Durch die Aktivitaeten verbessern sich Lesefaehigkeit und Selbstwirksamkeit",
      verbesserung: "Kausalkette von Aktivitaet zu Wirkung klarer zeichnen",
    },
    {
      id: "ehrlichkeit",
      score: 60,
      beleg: "Wir stellen fest, dass uns Erfahrung mit Online-Formaten fehlt",
      verbesserung: "Risikominimierungsplan ergaenzen",
    },
    {
      id: "tonalitaet",
      score: 70,
      beleg: "Zugaenglicher, menschlicher Ton ohne Institutionssprache",
      verbesserung: "Weitgehend gut, ein weiteres persoenliches Beispiel staerkt die Wirkung",
    },
  ],
  gesamt: 71,
  summary:
    "Gut mission-passender Antrag mit konkreten Beispielen. Wirkungserzaehlung und Ehrlichkeit ueber Risiken koennen weiter staerken.",
};

/** Stub fuer Geber-Gruppe 'eu'. */
export const STUB_JUDGE_RESPONSE_EU = {
  kriterien: [
    {
      id: "europaeischer-mehrwert",
      score: 72,
      beleg: "Transnationale Zusammenarbeit mit Partnern aus 3 EU-Laendern",
      verbesserung: "Erklaeren warum nationale Foerderung nicht ausreicht",
    },
    {
      id: "querschnittsthemen",
      score: 78,
      beleg: "Inklusion und digitale Bildung als EU-Prioritaeten adressiert",
      verbesserung: "Green Deal-Bezug als weiteres Querschnittsthema aufgreifen",
    },
    {
      id: "partnerschaft-konkret",
      score: 68,
      beleg: "Partnerschule in Lodz, Polen, und Lissabon, Portugal",
      verbesserung: "Konkrete Rollen und Beitraege jedes Partners listen",
    },
    {
      id: "evaluation-dissemination",
      score: 60,
      beleg: "Evaluationsbericht nach 12 Monaten geplant",
      verbesserung: "Disseminationsplan mit Reichweite und Kanaelen ergaenzen",
    },
    {
      id: "innovation",
      score: 65,
      beleg: "Peer-to-Peer-Lernmodell ist neu im regionalen Kontext",
      verbesserung: "Stand der Technik kurz darstellen um Neuigkeit zu belegen",
    },
    {
      id: "tonalitaet",
      score: 75,
      beleg: "Formell strukturierter Antrag im EU-Konventionen-Stil",
      verbesserung: "Weitgehend passend, EU-Fachjargon korrekt verwendet",
    },
  ],
  gesamt: 70,
  summary:
    "Solider EU-Antrag mit gutem Querschnittsthemen-Bezug. Disseminationsplan und Innovations-Nachweis benoetigen Staerkung.",
};

/** Stub fuer Geber-Gruppe 'wirtschaftspreis'. */
export const STUB_JUDGE_RESPONSE_WIRTSCHAFTSPREIS = {
  kriterien: [
    {
      id: "story-driven",
      score: 85,
      beleg: "Klare Erzaehlung: Ausgangsproblem Digitalisierungsluecke → Loesung → 200 Lernende profitieren",
      verbesserung: "Schluss-Satz mit starkem Preis-Appell staerken",
    },
    {
      id: "vorhaben-praegnant",
      score: 80,
      beleg: "In einem Satz: Wir digitalisieren den Musikunterricht fuer benachteiligte Schulen",
      verbesserung: "Noch knapper moeglich",
    },
    {
      id: "wirkung-konkret",
      score: 75,
      beleg: "200 Schueler, 12 Monate, Vorher-Nachher-Test messbar",
      verbesserung: "Kontrollgruppe oder Vergleichswert nennen",
    },
    {
      id: "glaubwuerdigkeit",
      score: 70,
      beleg: "Schule hat bereits 3 erfolgreiche EU-Projekte durchgefuehrt",
      verbesserung: "Konkrete Lernerfolge aus Vorgaengerprojekten nennen",
    },
    {
      id: "preis-eignung",
      score: 80,
      beleg: "Vorbildcharakter fuer 300 Schulen im Bezirk dargestellt",
      verbesserung: "Nationale Uebertragbarkeit ausfuehren",
    },
    {
      id: "tonalitaet",
      score: 85,
      beleg: "Knapp, engagiert, Jury-gerecht formuliert",
      verbesserung: "Sehr gut, ein technischer Fachbegriff kuerzen",
    },
  ],
  gesamt: 79,
  summary:
    "Starker story-driven Antrag mit klarer Preis-Argumentation. Glaubwuerdigkeit kann durch Nachweise aus Vorgaengerprojekten noch gestaerkt werden.",
};

/** Stub fuer Geber-Gruppe 'verband-uni'. */
export const STUB_JUDGE_RESPONSE_VERBAND_UNI = {
  kriterien: [
    {
      id: "fachlich-belegt",
      score: 75,
      beleg: "Studie von Mueller et al. 2023 belegt Wirksamkeit des Ansatzes",
      verbesserung: "Weitere aktuelle Quellen und Metaanalysen zitieren",
    },
    {
      id: "methodik-explizit",
      score: 70,
      beleg: "Design-Based-Learning-Methodik in 3 Phasen beschrieben",
      verbesserung: "Kontrollmassnahmen und Instrumente detaillierter ausfu",
    },
    {
      id: "zielgruppe-spezifisch",
      score: 68,
      beleg: "Benachteiligte Schueler in Jahrgangsstufe 5-7 mit Foerderbedarf",
      verbesserung: "Einschlusskriterien operationalisieren",
    },
    {
      id: "wirkung-evidenz",
      score: 65,
      beleg: "Pre-Post-Messung mit standardisiertem Lesetest geplant",
      verbesserung: "Effektgroeße-Erwartung und statistische Power nennen",
    },
    {
      id: "kooperationen",
      score: 72,
      beleg: "Kooperation mit Prof. Dr. Schmidt, Bildungsinstitut Muenchen",
      verbesserung: "Rolle der Hochschule in der Evaluation prazisieren",
    },
    {
      id: "tonalitaet",
      score: 75,
      beleg: "Sachlich-evidenzbasierter Ton mit akzeptabler Fachterminologie",
      verbesserung: "Weitgehend passend fuer Verbands-Gutachter",
    },
  ],
  gesamt: 71,
  summary:
    "Fachlich fundierter Antrag mit expliziter Methodik. Evaluationsdesign und statistische Grundlagen koennen staerker ausformuliert werden.",
};

export const STUB_COMPLIANCE_VIOLATIONS = {
  violations: [],
  usage: { promptTokens: 0, completionTokens: 0, model: "deepseek-chat" },
};
