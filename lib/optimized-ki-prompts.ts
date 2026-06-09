/**
 * Optimierte KI-Prompts für die Antragsgenerierung
 * Version 2.0 - Mit Typ-Spezifität und Quality-Scoring
 * 
 * Ersetzt: /lib/ki-prompts.ts (Phase 1)
 */

import { Foerderprogramm } from "@/lib/foerderSchema";
import { ProjektDaten } from "@/lib/ki-antrag-generator";

// ============================================================================
// 1. TYP-SPEZIFISCHE SYSTEM-PROMPTS
// ============================================================================

export const SYSTEM_PROMPTS_BY_TYPE: Record<string, string> = {
  bund: `Du bist ein erfahrener Fördermittelberater für Bundesprogramme (BMBF, KfW, BKM). 
Schreibe präzise, bürokratiekonform, mit Fokus auf:
- Innovation: Klare Abgrenzung zum Status quo, wissenschaftliche Fundierung
- Transferpotenzial: Skalierbarkeit, Modellcharakter für andere Schulen
- Evidenzbasiertheit: Bezug zu Studien, Evaluationen, Best Practices
- Systemrelevanz: Beitrag zu Bildungszielen auf Bundesebene

Dein Stil: Sachlich, präzise, überzeugend. Aktive Sprache, keine Konjunktive.
Struktur pro Absatz: These → Beleg → Nutzen.
Maximal 1 Adjektiv pro Satz, stattdessen konkrete Daten.`,

  land: `Du bist ein erfahrener Fördermittelberater für Landesprogramme (Kultusministerien).
Schreibe praxisnah, umsetzungsorientiert, mit Fokus auf:
- Passung zum Schulprogramm/Medienentwicklungsplan
- Regionalen Kontext und lokale Bedarfe
- Praktische Umsetzbarkeit im Schulalltag
- Verankerung in schulischen Strukturen

Dein Stil: Praxisnah, konkret, verständlich. Aktive Sprache, keine Konjunktive.
Struktur pro Absatz: These → Beleg → Nutzen.
Maximal 1 Adjektiv pro Satz, stattdessen konkrete Daten.`,

  stiftung: `Du bist ein erfahrener Fördermittelberater für Stiftungsprogramme (Telekom, Bosch, Bertelsmann).
Schreibe mission-getrieben, wirkungsorientiert, mit Fokus auf:
- Gesellschaftlichen Mehrwert und Impact
- Innovation und kreative Ansätze
- Langfristige Wirkung über die Förderphase hinaus
- Partizipation und Beteiligung

Dein Stil: Inspiriert, wirkungsorientiert, überzeugend. Aktive Sprache, keine Konjunktive.
Struktur pro Absatz: These → Beleg → Nutzen.
Maximal 1 Adjektiv pro Satz, stattdessen konkrete Daten.`,

  eu: `Du bist ein erfahrener Fördermittelberater für EU-Programme (Erasmus+, ESF).
Schreibe europäisch ausgerichtet, mit Fokus auf:
- Internationalen Austausch und Zusammenarbeit
- Europäische Dimension und Mehrsprachigkeit
- Transfer zwischen verschiedenen Bildungssystemen
- EU-Bildungsziele und -Strategien

Dein Stil: International, offen, kooperativ. Aktive Sprache, keine Konjunktive.
Struktur pro Absatz: These → Beleg → Nutzen.
Maximal 1 Adjektiv pro Satz, stattdessen konkrete Daten.`,

  default: `Du bist ein erfahrener Fördermittelberater für Bildungsförderprogramme.
Schreibe professionell, überzeugend, mit Fokus auf:
- Klare Ziele und messbare Ergebnisse
- Nachhaltigkeit und Verstetigung
- Qualität und fachliche Fundierung

Dein Stil: Professionell, sachlich, präzise. Aktive Sprache, keine Konjunktive.
Struktur pro Absatz: These → Beleg → Nutzen.
Maximal 1 Adjektiv pro Satz, stattdessen konkrete Daten.`
};

// ============================================================================
// 2. FEW-SHOT BEISPIELE
// ============================================================================

interface FewShotExample {
  kontext: string;
  eingabe: string;
  ausgabe: string;
  erklaerung: string;
}

export const FEW_SHOT_EXAMPLES: Record<string, FewShotExample[]> = {
  projektbeschreibung: [
    {
      kontext: "Digitalisierung, Grundschule",
      eingabe: "Wir wollen ein digitales Leseprojekt für Grundschulkinder machen.",
      ausgabe: "Das Projekt 'LeseWelt Digital' etabliert ein KI-gestütztes, individualisiertes Lese-Förderprogramm für 120 Risikokinder der Klassen 1-4. Kerninnovation ist die adaptive Schwierigkeitsanpassung, die bisherige Ansätze um den Faktor 3 effizienter macht (Vergleichsstudie: Müller et al. 2023).",
      erklaerung: "Konkret, quantifiziert, Innovation belegt"
    },
    {
      kontext: "Hardware, Tablets",
      eingabe: "Wir kaufen Tablets für die Schule.",
      ausgabe: "Wir entwickeln ein Konzept zur Integration von Tablets in den differenzierten Unterricht, das 180 Kindern individualisierte Lernpfade ermöglicht und die Lehrkräfte durch automatisierbare Fortschrittsanalysen entlastet.",
      erklaerung: "Technologie als Mittel zum Zweck, pädagogischer Mehrwert klar"
    }
  ],
  
  ziele: [
    {
      kontext: "Leseförderung",
      eingabe: "Die Kinder sollen besser lesen können.",
      ausgabe: "Bis Juni 2026 erreichen 85% der 120 teilnehmenden Risikokinder (Defizit >1 SD im ELFE II-Vortest) eine Lesegeschwindigkeitssteigerung um mindestens 20 Wörter/Minute (messbar durch standardisierten Würzburger Lesetest).",
      erklaerung: "SMART: Spezifisch, Messbar, Attraktiv, Realistisch, Terminiert"
    },
    {
      kontext: "Digitale Kompetenz",
      eingabe: "Wir wollen die digitale Kompetenz fördern.",
      ausgabe: "Wir qualifizieren bis Juli 2026 alle 18 Lehrkräfte (Klasse 1-4) in mediendidaktischer Grundkompetenz (Standard: DigCompEdu Level B1), wovon 80% die Kompetenz in unterrichtspraktischen Beobachtungen nachweisen.",
      erklaerung: "Konkrete Zielgruppe, messbares Ergebnis, klarer Zeitrahmen"
    }
  ],
  
  innovation: [
    {
      kontext: "MINT, Augmented Reality",
      eingabe: "Wir nutzen AR im Unterricht.",
      ausgabe: "Während herkömmliche MINT-Ansätze auf theoretische Vermittlung setzen, ermöglicht unser AR-basiertes Experimentierlabor erstmals individualisierte, handlungsorientierte Forschungserfahrungen in heterogenen Lerngruppen.",
      erklaerung: "Klare Abgrenzung zum Status quo, konkreter Nutzen"
    }
  ],
  
  nachhaltigkeit: [
    {
      kontext: "Projektende",
      eingabe: "Das Projekt wird nachhaltig sein.",
      ausgabe: "Die Nachhaltigkeit sichern wir durch: (1) Verankerung im Schulprogramm mit jährlicher Budgetposition (ab 2027: 3.000€/Jahr aus Schulumlage), (2) Open-Source-Veröffentlichung aller Materialien unter CC-BY-Lizenz, (3) Multiplikatoren-Fortbildung von 5 Kolleginnen, (4) Kooperationsvertrag mit Universität für wissenschaftliche Begleitung über 2026 hinaus.",
      erklaerung: "Konkrete Maßnahmen, Finanzierung, Verankerung dokumentiert"
    }
  ]
};

// ============================================================================
// 3. ANTI-PATTERN ERKENNUNG
// ============================================================================

export const ANTI_PATTERNS = [
  {
    pattern: "Zu viele Adjektive",
    regex: /\b(sehr|äußerst|besonders|außergewöhnlich|wunderbar|hochinnovativ)\b/gi,
    beschreibung: "Überladene Sätze mit mehreren wertenden Adjektiven ohne Fakten",
    beispiel_negativ: "Wir entwickeln ein hochinnovatives, außergewöhnlich wirkungsvolles Projekt.",
    beispiel_positiv: "Wir entwickeln ein KI-gestütztes Leseprogramm, das durch evidenzbasierte Methoden die Lesekompetenz von 60 Kindern messbar verbessert."
  },
  {
    pattern: "Fehlende Quantifizierung",
    regex: /\b(viele|einige|mehrere|große|wichtige)\b/gi,
    beschreibung: "Vage Aussagen ohne konkrete Zahlen",
    beispiel_negativ: "Viele Kinder werden vom Projekt profitieren.",
    beispiel_positiv: "120 Kinder in Klassen 1-4 erhalten wöchentlich 90 Minuten individuelle Förderung."
  },
  {
    pattern: "Konjunktiv-Formulierungen",
    regex: /\b(könnte|würde|sollte|müsste|dürfte)\b/gi,
    beschreibung: "Unsichere, hypothetische Formulierungen statt aktiver Planung",
    beispiel_negativ: "Das Projekt könnte helfen, die Lesekompetenz zu verbessern.",
    beispiel_positiv: "Das Projekt verbessert die Lesekompetenz gezielt bei 120 Kindern."
  },
  {
    pattern: "Passive Konstruktionen",
    regex: /\b(wird|werden)\s+(?:entwickelt|umgesetzt|durchgeführt|gefördert)\b/gi,
    beschreibung: "Passive statt aktiver Sprache",
    beispiel_negativ: "Es wird ein Konzept entwickelt, das von der Schule umgesetzt werden soll.",
    beispiel_positiv: "Wir entwickeln ein Konzept und setzen es als Modellprojekt um."
  }
];

// ============================================================================
// 4. HAUPTFUNKTION: Optimierten Prompt bauen
// ============================================================================

export interface OptimizedPromptConfig {
  includeFewShots?: boolean;
  includeBewertungskriterien?: boolean;
  includeAntiPatternCheck?: boolean;
  targetWordCount?: number;
}

export function buildOptimizedPrompt(
  programm: Foerderprogramm,
  projektDaten: ProjektDaten,
  config: OptimizedPromptConfig = {}
): string {
  const {
    includeFewShots = true,
    includeBewertungskriterien = true,
    includeAntiPatternCheck = true,
    targetWordCount = 1400
  } = config;

  // 1. System-Prompt basierend auf Fördergeber-Typ
  const systemPrompt = SYSTEM_PROMPTS_BY_TYPE[programm.foerdergeberTyp] || 
                       SYSTEM_PROMPTS_BY_TYPE.default;

  // 2. Few-Shot Beispiele auswählen
  const fewShotsSection = includeFewShots 
    ? selectRelevantFewShots(projektDaten)
    : '';

  // 3. Anti-Pattern Check
  const antiPatternSection = includeAntiPatternCheck
    ? formatAntiPatterns()
    : '';

  // 4. Struktur-Vorgaben
  const strukturSection = formatStrukturVorgaben(targetWordCount);

  // 5. Prompt zusammenbauen
  return `${systemPrompt}

PROGRAMM: ${programm.name}
Fördergeber: ${programm.foerdergeber} (${programm.foerdergeberTyp})
Frist: ${programm.bewerbungsfristText || 'laufend'}
Fördersumme: ${programm.foerdersummeText}
${includeBewertungskriterien && programm.kategorien ? `Kategorien: ${programm.kategorien.slice(0, 5).join(', ')}` : ''}

PROJEKT: ${projektDaten.projekttitel}
Schule: ${projektDaten.schulname}
Betrag: ${Number(projektDaten.foerderbetrag).toLocaleString('de-DE')} €
Zeitraum: ${projektDaten.zeitraum}
Zielgruppe: ${projektDaten.zielgruppe}

Beschreibung: ${projektDaten.kurzbeschreibung}
Ziele: ${projektDaten.ziele}
Aktivitäten: ${projektDaten.hauptaktivitaeten}
Ergebnisse: ${projektDaten.ergebnisse || 'Werden im Projekt erarbeitet'}
Nachhaltigkeit: ${projektDaten.nachhaltigkeit || 'Dauerhafte Verankerung geplant'}

${fewShotsSection}

${strukturSection}

${antiPatternSection}

AUFGABE:
Generiere einen professionellen Förderantrag basierend auf den oben genannten Informationen.

ZIEL: ${targetWordCount} Wörter (${Math.round(targetWordCount * 0.9)}-${Math.round(targetWordCount * 1.1)} akzeptabel)

WICHTIG: 
- Jede Zielgruppe muss quantifiziert sein (Anzahl, Alter, Merkmale)
- Jedes Ziel muss messbar sein (Indikator, Zielwert, Zeitpunkt)
- Nutze maximal 1 Adjektiv pro Satz
- Vermeide Konjunktive vollständig
- Struktur pro Absatz: These → Beleg → Nutzen

Schreibe den Antrag jetzt:`;
}

// ============================================================================
// 5. HELFERFUNKTIONEN
// ============================================================================

function selectRelevantFewShots(projektDaten: ProjektDaten): string {
  const sections: string[] = [];
  
  // Projektbeschreibung Beispiel
  sections.push(`BEISPIEL 1 - GUTE PROJEKTBESCHREIBUNG:
Eingabe: "Wir wollen ein digitales Leseprojekt für Grundschulkinder machen."
Ausgabe: "Das Projekt 'LeseWelt Digital' etabliert ein KI-gestütztes, individualisiertes Lese-Förderprogramm für 120 Risikokinder der Klassen 1-4. Kerninnovation ist die adaptive Schwierigkeitsanpassung, die bisherige Ansätze um den Faktor 3 effizienter macht."`);

  // Ziele Beispiel (immer relevant)
  sections.push(`BEISPIEL 2 - SMARTE ZIELFORMULIERUNG:
Eingabe: "Die Kinder sollen besser lesen können."
Ausgabe: "Bis ${getEndDatum(projektDaten.zeitraum)} erreichen 85% der 120 teilnehmenden Risikokinder eine Lesegeschwindigkeitssteigerung um mindestens 20 Wörter/Minute (messbar durch Würzburger Lesetest)."`);

  return `\nBEISPIELE FÜR GUTE ANTRAGSPROSA:\n${sections.join('\n\n')}\n`;
}

function formatStrukturVorgaben(targetWordCount: number): string {
  const abschnitte = [
    { titel: "1. EINLEITUNG", min: 120, max: 200, fokus: "Projektträger, Laufzeit, Betrag, Kurzbeschreibung" },
    { titel: "2. PROJEKTBESCHREIBUNG", min: 180, max: 280, fokus: "These→Beleg→Nutzen, quantifizierte Zielgruppe, Innovation" },
    { titel: "3. UMSETZUNG", min: 180, max: 280, fokus: "Phasen, Zeitplan, Verantwortlichkeiten" },
    { titel: "4. ZIELGRUPPE", min: 80, max: 150, fokus: "Primär/Sekundär, quantifiziert" },
    { titel: "5. PASSUNG ZUM PROGRAMM", min: 80, max: 150, fokus: "Programmziele adressieren, Keywords nutzen" },
    { titel: "6. ERGEBNISSE UND WIRKUNG", min: 120, max: 200, fokus: "SMARTe Ziele, messbare Outcomes" },
    { titel: "7. BUDGET", min: 50, max: 100, fokus: "Tabelle, detaillierte Posten" },
    { titel: "8. ABSCHLUSS", min: 40, max: 100, fokus: "Zusammenfassung, Nachhaltigkeit" }
  ];

  const strukturText = abschnitte.map(a => 
    `${a.titel}: ${a.min}-${a.max} Wörter (${a.fokus})`
  ).join('\n');

  return `\nSTRUKTUR-VORGABEN (Gesamt: ~${targetWordCount} Wörter):\n${strukturText}\n`;
}

function formatAntiPatterns(): string {
  return `\nANTI-PATTERNS (unbedingt vermeiden):\n` +
    ANTI_PATTERNS.map(ap => `- ${ap.pattern}: ${ap.beschreibung}`).join('\n') +
    `\n`;
}

function getEndDatum(zeitraum: string): string {
  if (!zeitraum) return 'Juni 2026';
  const parts = zeitraum.split('-');
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return 'Juni 2026';
}

// ============================================================================
// 6. QUALITY SCORING
// ============================================================================

export interface QualityScore {
  gesamt: number;
  kategorien: {
    struktur: number;
    quantifizierung: number;
    sprache: number;
    fokus: number;
    antiPatterns: number;
  };
  verbesserungsvorschlaege: string[];
  details: {
    wortanzahl: number;
    abschnitteGefunden: number;
    zahlenAnzahl: number;
    konjunktiveAnzahl: number;
    adjektiveAnzahl: number;
  };
}

export function scoreGeneratedAntrag(
  antrag: string,
  programm?: Foerderprogramm,
  targetWordCount: number = 1400
): QualityScore {
  const score: QualityScore = {
    gesamt: 0,
    kategorien: {
      struktur: 0,
      quantifizierung: 0,
      sprache: 0,
      fokus: 0,
      antiPatterns: 0
    },
    verbesserungsvorschlaege: [],
    details: {
      wortanzahl: 0,
      abschnitteGefunden: 0,
      zahlenAnzahl: 0,
      konjunktiveAnzahl: 0,
      adjektiveAnzahl: 0
    }
  };

  // Wortanzahl
  const woerter = antrag.split(/\s+/).filter(w => w.length > 0);
  score.details.wortanzahl = woerter.length;

  // 1. Struktur-Check (20 Punkte)
  const requiredSections = [
    'einleitung', 'projekt', 'beschreibung', 
    'zielgruppe', 'programm', 'ergebnis', 'wirkung', 'budget'
  ];
  const antragLower = antrag.toLowerCase();
  const foundSections = requiredSections.filter(section => 
    antragLower.includes(section)
  ).length;
  score.details.abschnitteGefunden = foundSections;
  score.kategorien.struktur = Math.round((foundSections / requiredSections.length) * 20);

  if (foundSections < 5) {
    score.verbesserungsvorschlaege.push('Füge mehr strukturelle Abschnitte hinzu (Einleitung, Projektbeschreibung, Umsetzung, etc.)');
  }

  // 2. Längen-Check (Wortanzahl)
  const wordCountDeviation = Math.abs(woerter.length - targetWordCount) / targetWordCount;
  if (wordCountDeviation > 0.2) {
    score.kategorien.struktur -= 5;
    score.verbesserungsvorschlaege.push(`Wortanzahl (${woerter.length}) weicht stark vom Ziel (${targetWordCount}) ab`);
  }

  // 3. Quantifizierung-Check (20 Punkte)
  const zahlenPattern = /\d+(?:\.\d{3})*\s*(?:Schüler|Kinder|Lehrer|€|Euro|Stunden|Monate|Wochen|Prozent|%|Klassen|Jahre)/gi;
  const zahlenMatches = antrag.match(zahlenPattern) || [];
  score.details.zahlenAnzahl = zahlenMatches.length;
  score.kategorien.quantifizierung = Math.min(20, zahlenMatches.length * 3);

  if (zahlenMatches.length < 5) {
    score.verbesserungsvorschlaege.push('Füge mehr konkrete Zahlen hinzu (Zielgruppengröße, Budgetposten, Zeitrahmen)');
  }

  // 4. Sprache-Check (20 Punkte)
  const konjunktivePattern = /\b(könnte|würde|sollte|müsste|dürfte|könnten|würden)\b/gi;
  const konjunktiveMatches = antrag.match(konjunktivePattern) || [];
  score.details.konjunktiveAnzahl = konjunktiveMatches.length;
  score.kategorien.sprache = Math.max(0, 20 - konjunktiveMatches.length * 4);

  if (konjunktiveMatches.length > 0) {
    score.verbesserungsvorschlaege.push(`Ersetze Konjunktive durch aktive Planung: ${konjunktiveMatches.slice(0, 3).join(', ')}`);
  }

  // Passive Konstruktionen
  const passivePattern = /\b(wird|werden)\s+(?:entwickelt|umgesetzt|durchgeführt|gefördert|realisiert|geschaffen)\b/gi;
  const passiveMatches = antrag.match(passivePattern) || [];
  if (passiveMatches.length > 3) {
    score.kategorien.sprache -= 3;
    score.verbesserungsvorschlaege.push('Nutze aktive statt passive Konstruktionen');
  }

  // 5. Anti-Pattern-Check (20 Punkte)
  const adjektivPattern = /\b(sehr|äußerst|besonders|wichtig|gut|groß|innovativ|wirkungsvoll|zukunftsweisend|hervorragend)\b/gi;
  const adjektivMatches = antrag.match(adjektivPattern) || [];
  score.details.adjektiveAnzahl = adjektivMatches.length;
  score.kategorien.antiPatterns = Math.max(0, 20 - adjektivMatches.length * 2);

  if (adjektivMatches.length > 8) {
    score.verbesserungsvorschlaege.push('Reduziere wertende Adjektive, nutze stattdessen konkrete Daten');
  }

  // 6. Fokus-Check (20 Punkte)
  if (programm?.kategorien) {
    const kategorienLower = programm.kategorien.map(k => k.toLowerCase());
    const relevanteWoerter = ['digital', 'mint', 'inklusion', 'sprache', 'nachhaltig', 'kultur', 'sport'];
    const gefundeneKategorien = relevanteWoerter.filter(kat => 
      kategorienLower.some(k => k.includes(kat)) && antragLower.includes(kat)
    ).length;
    score.kategorien.fokus = Math.min(20, gefundeneKategorien * 5 + 10);
  } else {
    score.kategorien.fokus = 15;
  }

  // Gesamtscore
  score.gesamt = Math.round(
    (score.kategorien.struktur +
     score.kategorien.quantifizierung +
     score.kategorien.sprache +
     score.kategorien.fokus +
     score.kategorien.antiPatterns) / 1
  );

  return score;
}

// ============================================================================
// 7. REVISIONS-PROMPT
// ============================================================================

export function buildRevisionPrompt(
  originalAntrag: string,
  qualityScore: QualityScore
): string {
  const schwächen = qualityScore.verbesserungsvorschlaege;
  
  return `Du bist ein erfahrener Antragsredakteur. Überarbeite den folgenden Antrag basierend auf den identifizierten Schwächen.

AKTUELLER ANTRAG:
${originalAntrag.substring(0, 2000)}...

IDENTIFIZIERTE SCHWÄCHEN:
${schwächen.map((s, i) => `${i + 1}. ${s}`).join('\n')}

AKTUELLE SCORES:
- Struktur: ${qualityScore.kategorien.struktur}/20
- Quantifizierung: ${qualityScore.kategorien.quantifizierung}/20
- Sprache: ${qualityScore.kategorien.sprache}/20
- Fokus: ${qualityScore.kategorien.fokus}/20
- Anti-Patterns: ${qualityScore.kategorien.antiPatterns}/20
- GESAMT: ${qualityScore.gesamt}/100

ÜBERARBEITUNGSANWEISUNGEN:
${schwächen.map(s => `- ${s}`).join('\n')}

WICHTIG:
- Behalte die Gesamtlänge bei (±10%)
- Behalte die Struktur bei
- Eliminiere alle identifizierten Schwächen
- Erhalte den professionellen Ton

ÜBERARBEITETER ANTRAG:`;
}

// ============================================================================
// 8. EXPORT
// ============================================================================

export const OptimizedKIPrompts = {
  buildOptimizedPrompt,
  buildRevisionPrompt,
  scoreGeneratedAntrag,
  SYSTEM_PROMPTS_BY_TYPE,
  FEW_SHOT_EXAMPLES,
  ANTI_PATTERNS
};

export default OptimizedKIPrompts;
