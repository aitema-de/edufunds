export const dynamic = 'force-static';

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Force Node.js runtime (not Edge) to avoid EvalError
export const runtime = 'nodejs';

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitCheck = await checkEndpointRateLimit(request, 'ai');
  
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response || NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const { programm, projektDaten } = await request.json();

    if (!programm || !projektDaten) {
      return NextResponse.json(
        { error: "Fehlende Daten: programm und projektDaten erforderlich" },
        { status: 400 }
      );
    }

    // Wenn Gemini nicht verfügbar, nutze Fallback
    if (!genAI) {
      console.log("[KI-Generator] Gemini nicht verfügbar, nutze Fallback-Generator");
      const fallbackAntrag = generateFallbackAntrag(programm, projektDaten);
      return NextResponse.json({ 
        antrag: fallbackAntrag,
        model: "fallback-template",
        timestamp: new Date().toISOString(),
        note: "KI-Service nicht konfiguriert - Template-basierter Antrag wurde generiert",
        isFallback: true
      });
    }

    // Gemini Model initialisieren
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2500,
      }
    });

    // Prompt bauen
    const prompt = buildPrompt(programm, projektDaten);

    // Antrag generieren mit Retry-Mechanismus
    let lastError: Error | null = null;
    let text = "";
    const MAX_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[KI-Generator] Versuch ${attempt}/${MAX_RETRIES}...`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        text = response.text();
        
        if (text.length < 500) {
          throw new Error("Generierter Antrag zu kurz");
        }
        
        console.log(`[KI-Generator] Erfolg nach ${attempt} Versuch(en)`);
        break;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`[KI-Generator] Versuch ${attempt} fehlgeschlagen:`, error);
        
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!text && lastError) {
      throw new Error(`KI-Generierung fehlgeschlagen: ${lastError.message}`);
    }

    return NextResponse.json({
      antrag: text,
      model: "gemini-2.0-flash",
      timestamp: new Date().toISOString(),
      isFallback: false
    });

  } catch (error) {
    console.error("[KI-Generator] Fehler:", error);
    
    // Bei Fehler: Fallback nutzen
    try {
      const body = await request.json();
      const fallbackAntrag = generateFallbackAntrag(body.programm, body.projektDaten);
      
      return NextResponse.json({ 
        antrag: fallbackAntrag,
        model: "fallback-template",
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: "KI-Generierung nicht verfügbar" },
        { status: 503 }
      );
    }
  }
}

// Optimierte Prompt-Templates
const SYSTEM_PROMPT_KURZ = `Antragsberater für Bildungsförderung. Stil: sachlich, präzise, aktiv.`;

function buildPrompt(programm: any, projektDaten: any): string {
  return `${SYSTEM_PROMPT_KURZ}

PROGRAMM: ${programm.name} | ${programm.foerdergeber}
Frist: ${programm.bewerbungsfristText || 'laufend'} | Summe: ${programm.foerdersummeText}

PROJEKT: ${projektDaten.projekttitel} | ${projektDaten.schulname}
Betrag: ${projektDaten.foerderbetrag}€ | Zeitraum: ${projektDaten.zeitraum}
Zielgruppe: ${projektDaten.zielgruppe}
Beschreibung: ${projektDaten.kurzbeschreibung}
Ziele: ${projektDaten.ziele}
Aktivitäten: ${projektDaten.hauptaktivitaeten}

STRUKTUR (Markdown):
1. Einleitung (150W)
2. Projektbeschreibung (200W) 
3. Umsetzung (200W)
4. Zielgruppe (100W)
5. Passung zum Programm (100W)
6. Ergebnisse/Wirkung (150W)
7. Budget (Tabelle)
8. Abschluss (50W)

ZIEL: 1200-1500 Wörter, professionell.`;
}

// Fallback-Generator wenn KI nicht verfügbar
function generateFallbackAntrag(programm: any, projektDaten: any): string {
  const kategorienText = programm.kategorien?.join(", ") || "Bildung";
  
  return `# FÖRDERANTRAG: ${projektDaten.projekttitel}

## 1. EINLEITUNG

Die ${projektDaten.schulname} beantragt im Rahmen des Programms „${programm.name}" (${programm.foerdergeber}) einen Zuschuss in Höhe von ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} €.

**Projektlaufzeit:** ${projektDaten.zeitraum}  
**Beantragte Fördersumme:** ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} €

${projektDaten.kurzbeschreibung}

## 2. PROJEKTBESCHREIBUNG

**Projektziele:** ${projektDaten.ziele}

**Zielgruppe:** ${projektDaten.zielgruppe}

**Kategorien:** ${kategorienText}

## 3. PROJEKTUMSETZUNG

**Hauptaktivitäten:** ${projektDaten.hauptaktivitaeten}

**Phasen:**
1. Vorbereitung (Monat 1-2)
2. Implementierung (Monat 3-8)
3. Intensivierung (Monat 9-10)
4. Abschluss (Monat 11-12)

## 4. ZIELGRUPPE

${projektDaten.zielgruppe}

## 5. PASSUNG ZUM PROGRAMM

Das Projekt passt zu „${programm.name}" und erfüllt die Förderkriterien.

## 6. ERWARTETE ERGEBNISSE

${projektDaten.ergebnisse || "Konkrete Projektergebnisse und nachhaltige Verankerung"}

## 7. BUDGET

| Position | Betrag |
|----------|--------|
| Beantragte Förderung | ${Number(projektDaten.foerderbetrag).toLocaleString("de-DE")} € |

## 8. ABSCHLUSS

${projektDaten.nachhaltigkeit || "Das Projekt ist für nachhaltige Wirkung konzipiert."}

Mit freundlichen Grüßen  
Das Projektteam der ${projektDaten.schulname}

---
*Erstellt mit EduFunds KI-Antragsassistent*
`;
}
