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
      beleg: "80 Schüler werden am Projekt teilnehmen",
      verbesserung: "Vorher/Nachher-Messung mit konkreten Lernzielen ergänzen",
    },
    {
      id: "strategiebezug",
      score: 70,
      beleg: "Im Rahmen des DigitalPakts 2.0 fördern wir digitale Kompetenzen",
      verbesserung: "KMK-Strategie explizit nennen und verankern",
    },
    {
      id: "transferfaehigkeit",
      score: 55,
      beleg: "Das Konzept soll auf andere Schulen übertragen werden",
      verbesserung: "Konkrete Schritte und Zeitplan für Transfer beschreiben",
    },
    {
      id: "kooperationen",
      score: 60,
      beleg: "In Kooperation mit der Universität Berlin",
      verbesserung: "Rolle und konkrete Beiträge der Universität benennen",
    },
    {
      id: "nachhaltigkeit-struktur",
      score: 50,
      beleg: "Das Projekt wird nach Förderung fortgeführt",
      verbesserung: "Curriculum-Verankerung und Finanzierungsplan nach Förderung ergänzen",
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
    "Der Antrag zeigt guten Strategiebezug und sachlichen Ton. Transferfähigkeit und Nachhaltigkeit können konkreter ausformuliert werden.",
};

/** Stub fuer Geber-Gruppe 'stiftung'. */
export const STUB_JUDGE_RESPONSE_STIFTUNG = {
  kriterien: [
    {
      id: "mission-passung",
      score: 80,
      beleg: "Förderung bildungsbenachteiligter Kinder steht im Mittelpunkt",
      verbesserung: "Bezug zur spezifischen Fördermission der Stiftung stärken",
    },
    {
      id: "konkrete-szene",
      score: 70,
      beleg: "Maria, 10 Jahre, aus einer Migrationsfamilie, profitiert besonders",
      verbesserung: "Weiteres konkretes Beispiel mit Vorher/Nachher ergänzen",
    },
    {
      id: "zielgruppe-spezifisch",
      score: 75,
      beleg: "Kinder mit Förderbedarf in Jahrgangsstufe 3-6",
      verbesserung: "Benachteiligungsmerkmale differenzierter benennen",
    },
    {
      id: "wirkung-narrativ",
      score: 65,
      beleg: "Durch die Aktivitäten verbessern sich Lesefähigkeit und Selbstwirksamkeit",
      verbesserung: "Kausalkette von Aktivität zu Wirkung klarer zeichnen",
    },
    {
      id: "ehrlichkeit",
      score: 60,
      beleg: "Wir stellen fest, dass uns Erfahrung mit Online-Formaten fehlt",
      verbesserung: "Risikominimierungsplan ergänzen",
    },
    {
      id: "tonalitaet",
      score: 70,
      beleg: "Zugänglicher, menschlicher Ton ohne Institutionssprache",
      verbesserung: "Weitgehend gut, ein weiteres persönliches Beispiel stärkt die Wirkung",
    },
  ],
  gesamt: 71,
  summary:
    "Gut mission-passender Antrag mit konkreten Beispielen. Wirkungserzählung und Ehrlichkeit über Risiken können weiter stärken.",
};

/** Stub fuer Geber-Gruppe 'eu'. */
export const STUB_JUDGE_RESPONSE_EU = {
  kriterien: [
    {
      id: "europaeischer-mehrwert",
      score: 72,
      beleg: "Transnationale Zusammenarbeit mit Partnern aus 3 EU-Ländern",
      verbesserung: "Erklären warum nationale Förderung nicht ausreicht",
    },
    {
      id: "querschnittsthemen",
      score: 78,
      beleg: "Inklusion und digitale Bildung als EU-Prioritäten adressiert",
      verbesserung: "Green Deal-Bezug als weiteres Querschnittsthema aufgreifen",
    },
    {
      id: "partnerschaft-konkret",
      score: 68,
      beleg: "Partnerschule in Lodz, Polen, und Lissabon, Portugal",
      verbesserung: "Konkrete Rollen und Beiträge jedes Partners listen",
    },
    {
      id: "evaluation-dissemination",
      score: 60,
      beleg: "Evaluationsbericht nach 12 Monaten geplant",
      verbesserung: "Disseminationsplan mit Reichweite und Kanälen ergänzen",
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
    "Solider EU-Antrag mit gutem Querschnittsthemen-Bezug. Disseminationsplan und Innovations-Nachweis benötigen Stärkung.",
};

/** Stub fuer Geber-Gruppe 'wirtschaftspreis'. */
export const STUB_JUDGE_RESPONSE_WIRTSCHAFTSPREIS = {
  kriterien: [
    {
      id: "story-driven",
      score: 85,
      beleg: "Klare Erzählung: Ausgangsproblem Digitalisierungslücke → Lösung → 200 Lernende profitieren",
      verbesserung: "Schluss-Satz mit starkem Preis-Appell stärken",
    },
    {
      id: "vorhaben-praegnant",
      score: 80,
      beleg: "In einem Satz: Wir digitalisieren den Musikunterricht für benachteiligte Schulen",
      verbesserung: "Noch knapper möglich",
    },
    {
      id: "wirkung-konkret",
      score: 75,
      beleg: "200 Schüler, 12 Monate, Vorher-Nachher-Test messbar",
      verbesserung: "Kontrollgruppe oder Vergleichswert nennen",
    },
    {
      id: "glaubwuerdigkeit",
      score: 70,
      beleg: "Schule hat bereits 3 erfolgreiche EU-Projekte durchgeführt",
      verbesserung: "Konkrete Lernerfolge aus Vorgängerprojekten nennen",
    },
    {
      id: "preis-eignung",
      score: 80,
      beleg: "Vorbildcharakter für 300 Schulen im Bezirk dargestellt",
      verbesserung: "Nationale Übertragbarkeit ausführen",
    },
    {
      id: "tonalitaet",
      score: 85,
      beleg: "Knapp, engagiert, Jury-gerecht formuliert",
      verbesserung: "Sehr gut, ein technischer Fachbegriff kürzen",
    },
  ],
  gesamt: 79,
  summary:
    "Starker story-driven Antrag mit klarer Preis-Argumentation. Glaubwürdigkeit kann durch Nachweise aus Vorgängerprojekten noch gestärkt werden.",
};

/** Stub fuer Geber-Gruppe 'verband-uni'. */
export const STUB_JUDGE_RESPONSE_VERBAND_UNI = {
  kriterien: [
    {
      id: "fachlich-belegt",
      score: 75,
      beleg: "Studie von Müller et al. 2023 belegt Wirksamkeit des Ansatzes",
      verbesserung: "Weitere aktuelle Quellen und Metaanalysen zitieren",
    },
    {
      id: "methodik-explizit",
      score: 70,
      beleg: "Design-Based-Learning-Methodik in 3 Phasen beschrieben",
      verbesserung: "Kontrollmaßnahmen und Instrumente detaillierter ausfu",
    },
    {
      id: "zielgruppe-spezifisch",
      score: 68,
      beleg: "Benachteiligte Schüler in Jahrgangsstufe 5-7 mit Förderbedarf",
      verbesserung: "Einschlusskriterien operationalisieren",
    },
    {
      id: "wirkung-evidenz",
      score: 65,
      beleg: "Pre-Post-Messung mit standardisiertem Lesetest geplant",
      verbesserung: "Effektgröße-Erwartung und statistische Power nennen",
    },
    {
      id: "kooperationen",
      score: 72,
      beleg: "Kooperation mit Prof. Dr. Schmidt, Bildungsinstitut München",
      verbesserung: "Rolle der Hochschule in der Evaluation prazisieren",
    },
    {
      id: "tonalitaet",
      score: 75,
      beleg: "Sachlich-evidenzbasierter Ton mit akzeptabler Fachterminologie",
      verbesserung: "Weitgehend passend für Verbands-Gutachter",
    },
  ],
  gesamt: 71,
  summary:
    "Fachlich fundierter Antrag mit expliziter Methodik. Evaluationsdesign und statistische Grundlagen können stärker ausformuliert werden.",
};

export const STUB_COMPLIANCE_VIOLATIONS = {
  violations: [],
  usage: { promptTokens: 0, completionTokens: 0, model: "deepseek-chat" },
};
