import { NextRequest, NextResponse } from "next/server";
import { getWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { evaluateFactsReadiness } from "@/lib/wizard/facts-readiness";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = (await req.json()) as { sessionToken?: string };
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    const richtlinie = await loadRichtlinie(session.foerderprogrammId);
    const report = evaluateFactsReadiness(session.data.facts, richtlinie);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[wizard/readiness] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
