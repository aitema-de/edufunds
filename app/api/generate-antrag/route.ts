/**
 * API-Route für die Antragsgenerierung
 * POST /api/generate-antrag
 * 
 * Konfiguration:
 * - GEMINI_API_KEY muss als Umgebungsvariable gesetzt sein
 * - Falls nicht gesetzt, wird der Fallback-Modus (Template-basiert) verwendet
 */

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createAntragPipeline, AntragPipeline, AntragError, AntragErrorCode } from "@/lib/antrag-pipeline";
import { GenerierterAntrag, PipelineStatus } from "@/lib/programSchema";

// Prüfe API-Key beim Start (nur Status, nicht den Key loggen!)
const hasGeminiKey = !!process.env.GEMINI_API_KEY;
console.log(`[API] KI-Antragsgenerator Status: ${hasGeminiKey ? "✅ API-Key konfiguriert" : "⚠️ Fallback-Modus aktiv (kein GEMINI_API_KEY)"}`);

interface GenerateRequest {
  programmId: string;
  keywords: string[];
  options?: {
    skipRevision?: boolean;
    targetScore?: number;
  };
}

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// OPTIONS Handler für CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

// POST Handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse Request
    let body: GenerateRequest;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Ungültiger JSON-Body" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { programmId, keywords, options } = body;
    
    // Validierung
    if (!programmId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "programmId und keywords (Array) sind erforderlich" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (keywords.length < 3) {
      return NextResponse.json(
        { error: "Mindestens 3 Stichworte erforderlich für qualitativ hochwertige Ergebnisse" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Log API-Status (ohne Key zu exponieren)
    console.log(`[API] Generiere Antrag für ${programmId} mit Keywords: ${keywords.join(", ")} | Modus: ${hasGeminiKey ? "KI-generiert" : "Fallback (Template)"}`);
    
    // Erstelle Pipeline
    let pipeline: AntragPipeline;
    try {
      pipeline = await createAntragPipeline(programmId, (status) => {
        // Progress-Callback (könnte für WebSocket/SSE verwendet werden)
        console.log(`[API] Progress: ${status.progress_percent}% - ${status.step}`);
      });
    } catch (error) {
      console.error("[API] Fehler beim Laden des Programm-Schemas:", error);
      return NextResponse.json(
        { error: `Programm-Schema für ${programmId} nicht gefunden` },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Führe Generierung durch
    let antrag: GenerierterAntrag;
    try {
      antrag = await pipeline.generateAntrag(keywords);
    } catch (error: any) {
      console.error("[API] Generierungsfehler:", error);
      
      // Nutzerfreundliche Fehlermeldungen basierend auf Fehler-Typ
      if (error instanceof AntragError) {
        let userMessage: string;
        let statusCode: number;
        
        switch (error.code) {
          case AntragErrorCode.API_KEY_MISSING:
            userMessage = "KI-Service ist nicht konfiguriert. Der Fallback-Modus (Template-basiert) wird verwendet.";
            statusCode = 503;
            break;
          case AntragErrorCode.API_RATE_LIMIT:
            userMessage = "Zu viele Anfragen an den KI-Service. Bitte warte einen Moment und versuche es erneut.";
            statusCode = 429;
            break;
          case AntragErrorCode.API_UNAVAILABLE:
            userMessage = "Der KI-Service ist temporär nicht verfügbar. Bitte versuche es in einigen Minuten erneut.";
            statusCode = 503;
            break;
          case AntragErrorCode.API_TIMEOUT:
            userMessage = "Die Anfrage hat zu lange gedauert. Bitte versuche es mit weniger Stichworten erneut.";
            statusCode = 504;
            break;
          case AntragErrorCode.SCHEMA_NOT_FOUND:
            userMessage = `Das Programm-Schema '${programmId}' wurde nicht gefunden.`;
            statusCode = 404;
            break;
          case AntragErrorCode.VALIDATION_ERROR:
            userMessage = "Die Anfrage enthält ungültige Daten. Bitte überprüfe deine Eingaben.";
            statusCode = 400;
            break;
          default:
            userMessage = "Ein Fehler ist bei der Antragsgenerierung aufgetreten. Bitte versuche es erneut.";
            statusCode = 500;
        }
        
        return NextResponse.json(
          { 
            error: userMessage,
            code: error.code,
            details: error.details,
            suggestion: "Du kannst es mit weniger Stichworten oder einem anderen Programm versuchen."
          },
          { status: statusCode, headers: corsHeaders }
        );
      }
      
      // Allgemeiner Fehler
      return NextResponse.json(
        { 
          error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
          message: error.message
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Kosten-Tracking
    const kosten = pipeline.getKosten();
    
    // Erfolgs-Response
    const usingAI = !!process.env.GEMINI_API_KEY;
    const response = {
      success: true,
      generation_mode: usingAI ? "ai" : "fallback",
      antrag: {
        ...antrag,
        kosten: {
          api_calls: kosten.apiCalls,
          tokens_used: kosten.tokensUsed,
          estimated_cost_usd: kosten.estimatedCost.toFixed(4),
          generation_time_ms: antrag.metadata.generation_time_ms
        }
      },
      zusammenfassung: {
        programm: programmId,
        keywords_used: keywords,
        qualitaetsscore: antrag.self_review.overall_score,
        revisionen: antrag.metadata.revision_iterations,
        kosten_gesamt: kosten.estimatedCost.toFixed(4),
        mode: usingAI ? "KI-generiert" : "Template-basiert (Fallback)"
      }
    };
    
    console.log(`[API] Erfolgreich generiert in ${Date.now() - startTime}ms`);
    
    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    });
    
  } catch (error: any) {
    console.error("[API] Unbekannter Fehler:", error);
    return NextResponse.json(
      { error: `Interner Serverfehler: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET Handler für verfügbare Schemas
export async function GET() {
  try {
    // Liste der verfügbaren Programm-Schemas
    const verfuegbareSchemas = [
      {
        id: "bmbf-digitalpakt-2",
        name: "DigitalPakt Schule 2.0 (BMBF)",
        beschreibung: "Bundesweite Förderung für digitale Bildung",
        komplexitaet: "hoch",
        foerdersumme: "10.000€ - 500.000€"
      },
      {
        id: "telekom-mint",
        name: "MINT-Förderung (Telekom Stiftung)",
        beschreibung: "MINT-Projekte in der Grundschule",
        komplexitaet: "mittel",
        foerdersumme: "5.000€ - 30.000€"
      },
      {
        id: "nrw-digital",
        name: "Digital.Schule.NRW",
        beschreibung: "Landesförderung für digitale Transformation",
        komplexitaet: "mittel",
        foerdersumme: "5.000€ - 100.000€"
      }
    ];
    
    return NextResponse.json({
      verfuegbare_programme: verfuegbareSchemas,
      api_version: "1.0.0",
      endpoints: {
        generate: "POST /api/generate-antrag",
        list: "GET /api/generate-antrag"
      }
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
