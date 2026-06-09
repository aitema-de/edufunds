export const dynamic = 'force-static';

import { NextRequest, NextResponse } from "next/server";

// In-Memory Speicher für Vitals (in Production: Datenbank)
const vitalsBuffer: any[] = [];
const MAX_BUFFER_SIZE = 1000;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Daten validieren
    if (!data.name || typeof data.value !== "number") {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }
    
    // Zum Buffer hinzufügen
    vitalsBuffer.push({
      ...data,
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
    });
    
    // Buffer begrenzen
    if (vitalsBuffer.length > MAX_BUFFER_SIZE) {
      vitalsBuffer.shift();
    }
    
    // In Production: Batch-Upload zu Analytics-Datenbank
    // await saveToDatabase(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vitals API Error:", error);
    return NextResponse.json(
      { error: "Failed to process vitals" },
      { status: 500 }
    );
  }
}

// GET für Monitoring-Dashboard
export async function GET(request: NextRequest) {
  // Nur in Development oder mit Auth-Token
  if (process.env.NODE_ENV === "production") {
    const authToken = request.headers.get("authorization");
    if (authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }
  
  // Statistiken berechnen
  const stats = {
    total: vitalsBuffer.length,
    byName: {} as Record<string, { count: number; avg: number; min: number; max: number }>,
    last24h: vitalsBuffer.filter(
      (v) => new Date(v.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
  };
  
  // Metriken gruppieren
  vitalsBuffer.forEach((vital) => {
    if (!stats.byName[vital.name]) {
      stats.byName[vital.name] = { count: 0, avg: 0, min: Infinity, max: 0 };
    }
    
    const metric = stats.byName[vital.name];
    metric.count++;
    metric.avg = (metric.avg * (metric.count - 1) + vital.value) / metric.count;
    metric.min = Math.min(metric.min, vital.value);
    metric.max = Math.max(metric.max, vital.value);
  });
  
  return NextResponse.json({
    stats,
    recent: vitalsBuffer.slice(-50),
  });
}
