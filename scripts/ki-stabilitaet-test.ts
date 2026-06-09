/**
 * KI-Stabilitätstest - 20 API-Calls (4 Programme × 5 Varianten)
 * 
 * Ausführung:
 *   npx ts-node scripts/ki-stabilitaet-test.ts
 * 
 * Erfolgskriterium: ≥18/20 erfolgreich (90%)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Konfiguration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Test-Programme
const TEST_PROGRAMME = [
  {
    id: "bkm-digital-2024",
    name: "Kultur Digital",
    foerdergeber: "Bundesministerium für Kultur und Medien",
    foerdergeberTyp: "bund",
    foerdersummeText: "bis zu 80% der Kosten",
    bewerbungsfristText: "15.01. - 31.03.2025",
    kategorien: ["digitalisierung", "kultur", "medienkompetenz"],
    kurzbeschreibung: "Förderung für Digitalisierungsprojekte in kulturellen Bildungseinrichtungen."
  },
  {
    id: "bayern-digital-2024",
    name: "Bayern Digital",
    foerdergeber: "Bayerisches Kultusministerium",
    foerdergeberTyp: "land",
    foerdersummeText: "bis zu 70% der Kosten",
    bewerbungsfristText: "laufend",
    kategorien: ["digitalisierung", "infrastruktur"],
    kurzbeschreibung: "Landesförderung für digitale Bildung in Bayern."
  },
  {
    id: "bertelsmann-bildung-2024",
    name: "Bildung 2030",
    foerdergeber: "Bertelsmann Stiftung",
    foerdergeberTyp: "stiftung",
    foerdersummeText: "bis zu 100.000€",
    bewerbungsfristText: "quartalsweise",
    kategorien: ["bildung", "zukunft", "innovation"],
    kurzbeschreibung: "Förderung innovativer Bildungsprojekte."
  },
  {
    id: "erasmus-schule-2024",
    name: "Erasmus+ Schulbildung",
    foerdergeber: "Europäische Union",
    foerdergeberTyp: "eu",
    foerdersummeText: "Je nach Projektgröße",
    bewerbungsfristText: "01.02. - 30.04.2025",
    kategorien: ["international", "austausch", "mobilität"],
    kurzbeschreibung: "EU-Förderung für internationale Schulpartnerschaften."
  }
];

// 5 Projekt-Varianten pro Programm
const PROJEKT_VARIANTEN = [
  {
    name: "Digitalisierung des Kunstunterrichts",
    schulname: "Gymnasium Musterstadt",
    betrag: "25000",
    zeitraum: "12 Monate (Sep 2025 - Aug 2026)",
    zielgruppe: "Schüler Klassen 7-10, ca. 200 Schüler",
    beschreibung: "Integration digitaler Medien in den Kunstunterricht durch Tablets und VR-Brillen.",
    ziele: "Steigerung der Medienkompetenz. Förderung kreativer Ausdrucksformen.",
    aktivitaeten: "Anschaffung Hardware. Lehrerfortbildungen. Neue Unterrichtskonzepte.",
    ergebnisse: "10 digitale Kunstprojekte. 5 geschulte Lehrkräfte. Handreichung.",
    nachhaltigkeit: "Geräte werden dauerhaft genutzt. Lehrer bilden Kollegen weiter."
  },
  {
    name: "MINT-Forscherlabor für Grundschüler",
    schulname: "Grundschule Sonnenhof",
    betrag: "35000",
    zeitraum: "18 Monate (Jan 2026 - Jun 2027)",
    zielgruppe: "Grundschüler Klassen 1-4, ca. 150 Schüler",
    beschreibung: "Aufbau eines MINT-Forscherlabors mit Experimentierstationen.",
    ziele: "Frühe MINT-Begeisterung wecken. Naturwissenschaftliches Denken fördern.",
    aktivitaeten: "Einrichtung Labor. Materialanschaffung. Experimentierkurse.",
    ergebnisse: "30 Experimente. Schulung 8 Lehrkräfte. Eltern-Workshops.",
    nachhaltigkeit: "Materialien werden jährlich ergänzt. Konzept an andere Schulen übertragbar."
  },
  {
    name: "Inklusion durch Sport und Bewegung",
    schulname: "Förderschule Bunter Kreis",
    betrag: "18000",
    zeitraum: "10 Monate (Aug 2025 - Mai 2026)",
    zielgruppe: "Schüler mit Förderbedarf, ca. 80 Schüler",
    beschreibung: "Barrierefreie Sportangebote für Kinder mit unterschiedlichen Fähigkeiten.",
    ziele: "Teilhabe am Sport fördern. Soziale Kompetenzen stärken.",
    aktivitaeten: "Therapiegeräte anschaffen. Inklusionstraining. Regelmäßige Sportfeste.",
    ergebnisse: "Wöchentliche Sportangebote. 10 geschulte Pädagogen.",
    nachhaltigkeit: "Geräte bleiben dauerhaft. Trainingskonzept fest etabliert."
  },
  {
    name: "Sprachförderung durch digitale Storytelling",
    schulname: "Gesamtschule Rheintal",
    betrag: "22000",
    zeitraum: "14 Monate (Okt 2025 - Nov 2026)",
    zielgruppe: "Schüler mit Migrationshintergrund, ca. 120 Schüler",
    beschreibung: "Digitale Werkzeuge zur Sprachförderung durch interaktives Storytelling.",
    ziele: "Deutschkenntnisse verbessern. Digitale Kompetenz aufbauen.",
    aktivitaeten: "Tablets anschaffen. Storytelling-Apps lizenzieren. Workshops.",
    ergebnisse: "Digitale Geschichtensammlung. 6 qualifizierte Lehrkräfte.",
    nachhaltigkeit: "Apps werden dauerhaft genutzt. Materialien als OER veröffentlicht."
  },
  {
    name: "Nachhaltige Schulhofgestaltung",
    schulname: "Realschule Grüne Zukunft",
    betrag: "45000",
    zeitraum: "16 Monate (Mrz 2026 - Jun 2027)",
    zielgruppe: "Alle Schüler, ca. 500 Schüler",
    beschreibung: "Umgestaltung des Schulhofs zu einem Klima-und-Natur-Erlebnisraum.",
    ziele: "Umweltbewusstsein stärken. Klimaresiliente Schulhofgestaltung.",
    aktivitaeten: "Bepflanzung. Bewässerungssystem. Outdoor-Klassenzimmer.",
    ergebnisse: "Klimagarten. Regenwassernutzung. Schulhof als Lernraum.",
    nachhaltigkeit: "Pflanzen werden vom Garten-AG gepflegt. Konzept für andere Schulen."
  }
];

// Optimierter Prompt (kompakt)
const SYSTEM_PROMPT_KURZ = `Antragsberater für Bildungsförderung. Stil: sachlich, präzise, aktiv. Regeln: 1 Adjektiv/Satz, konkrete Daten, These→Beleg→Nutzen.`;

function buildPrompt(programm: any, projekt: any): string {
  return `${SYSTEM_PROMPT_KURZ}

PROGRAMM: ${programm.name} | ${programm.foerdergeber} (${programm.foerdergeberTyp})
Frist: ${programm.bewerbungsfristText} | Summe: ${programm.foerdersummeText}
Kategorien: ${programm.kategorien.join(", ")}

PROJEKT: ${projekt.name} | ${projekt.schulname}
Betrag: ${projekt.betrag}€ | Zeitraum: ${projekt.zeitraum}
Zielgruppe: ${projekt.zielgruppe}

Beschreibung: ${projekt.beschreibung}
Ziele: ${projekt.ziele}
Aktivitäten: ${projekt.aktivitaeten}
Ergebnisse: ${projekt.ergebnisse}
Nachhaltigkeit: ${projekt.nachhaltigkeit}

STRUKTUR (Markdown):
1. Einleitung (150W)
2. Projektbeschreibung (200W) 
3. Umsetzung (200W)
4. Zielgruppe (100W)
5. Passung zum Programm (100W)
6. Ergebnisse/Wirkung (150W)
7. Budget (Tabelle)
8. Abschluss (50W)

ZIEL: 1200-1500 Wörter, professionell, überzeugend.`;
}

interface TestResult {
  programm: string;
  projekt: string;
  start: string;
  ende: string;
  dauer_sek: number;
  status: number;
  token_laenge: number;
  erfolg: boolean;
  fehler?: string;
  versuche?: number;
}

async function runTest(): Promise<void> {
  console.log("🧪 KI-Stabilitätstest gestartet");
  console.log(`   API-Key konfiguriert: ${GEMINI_API_KEY ? '✅' : '❌'}`);
  console.log(`   Testläufe: ${TEST_PROGRAMME.length} Programme × ${PROJEKT_VARIANTEN.length} Varianten = ${TEST_PROGRAMME.length * PROJEKT_VARIANTEN.length} Calls`);
  
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY nicht gesetzt!");
    process.exit(1);
  }
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2500,
    }
  });
  
  const results: TestResult[] = [];
  let erfolgreich = 0;
  let fehlgeschlagen = 0;
  
  const startTime = Date.now();
  
  // 20 API-Calls durchführen
  for (const programm of TEST_PROGRAMME) {
    for (let i = 0; i < PROJEKT_VARIANTEN.length; i++) {
      const projekt = PROJEKT_VARIANTEN[i];
      const callStart = Date.now();
      
      console.log(`\n📋 Test: ${programm.id} + ${projekt.name.substring(0, 30)}...`);
      
      const prompt = buildPrompt(programm, projekt);
      console.log(`   Prompt-Länge: ${prompt.length} Zeichen (~${Math.ceil(prompt.length/4)} Token)`);
      
      let attempts = 0;
      let success = false;
      let text = "";
      let errorMsg = "";
      const MAX_RETRIES = 3;
      
      // Retry-Mechanismus
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        attempts = attempt;
        try {
          const result = await model.generateContent(prompt);
          text = result.response.text();
          
          if (text.length < 500) {
            throw new Error("Antrag zu kurz");
          }
          
          success = true;
          break;
        } catch (error) {
          errorMsg = String(error);
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`   ⏳ Retry ${attempt} nach ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      
      const callEnd = Date.now();
      const dauer = (callEnd - callStart) / 1000;
      
      const result: TestResult = {
        programm: programm.id,
        projekt: projekt.name,
        start: new Date(callStart).toISOString(),
        ende: new Date(callEnd).toISOString(),
        dauer_sek: Math.round(dauer * 100) / 100,
        status: success ? 200 : 500,
        token_laenge: text.length,
        erfolg: success,
        fehler: success ? undefined : errorMsg,
        versuche: attempts
      };
      
      results.push(result);
      
      if (success) {
        erfolgreich++;
        console.log(`   ✅ Erfolg in ${dauer.toFixed(1)}s (${text.length} Zeichen, ${attempts} Versuch(e))`);
      } else {
        fehlgeschlagen++;
        console.log(`   ❌ Fehlgeschlagen nach ${attempts} Versuchen: ${errorMsg.substring(0, 80)}...`);
      }
      
      // Kurze Pause zwischen Calls
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  const gesamtzeit = (Date.now() - startTime) / 1000 / 60;
  
  // Ergebnis zusammenfassen
  const summary = {
    meta: {
      start: new Date(startTime).toISOString(),
      ende: new Date().toISOString(),
      gesamtzeit_min: Math.round(gesamtzeit * 100) / 100,
      api_key_verfuegbar: !!GEMINI_API_KEY,
      max_retries: 3,
      max_output_tokens: 2500
    },
    ergebnisse: results,
    summary: {
      erfolgsquote: `${erfolgreich}/${results.length}`,
      erfolgsquote_prozent: Math.round((erfolgreich / results.length) * 100),
      durchschnitt_zeit_sek: Math.round((results.reduce((a, r) => a + r.dauer_sek, 0) / results.length) * 100) / 100,
      durchschnitt_token: Math.round(results.filter(r => r.erfolg).reduce((a, r) => a + r.token_laenge, 0) / Math.max(1, erfolgreich)),
      gesamtzeit_min: Math.round(gesamtzeit * 100) / 100,
      alle_erfolgreich: erfolgreich === results.length,
      kritisch: erfolgreich < 18 ? `NUR ${erfolgreich}/${results.length} ERFOLGREICH - Unter 90%` : null
    }
  };
  
  // Ergebnis ausgeben
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST-ERGEBNISSE");
  console.log("=".repeat(60));
  console.log(`   Erfolgsquote: ${summary.summary.erfolgsquote} (${summary.summary.erfolgsquote_prozent}%)`);
  console.log(`   Ziel: ≥18/20 (90%)`);
  console.log(`   Status: ${summary.summary.erfolgsquote_prozent >= 90 ? '✅ BESTANDEN' : '❌ NICHT BESTANDEN'}`);
  console.log(`   Ø Zeit: ${summary.summary.durchschnitt_zeit_sek}s`);
  console.log(`   Ø Token: ${summary.summary.durchschnitt_token}`);
  console.log(`   Gesamtzeit: ${summary.summary.gesamtzeit_min.toFixed(2)} Min`);
  
  // JSON speichern
  const fs = require('fs');
  const outputPath = '/home/edufunds/edufunds-app/docs/KI_STABILITÄT_TEST.json';
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Ergebnisse gespeichert in: ${outputPath}`);
  
  // Exit-Code setzen
  if (erfolgreich < 18) {
    console.log("\n❌ Test nicht bestanden (weniger als 90% Erfolgsquote)");
    process.exit(1);
  } else {
    console.log("\n✅ Test bestanden!");
    process.exit(0);
  }
}

runTest().catch(console.error);
