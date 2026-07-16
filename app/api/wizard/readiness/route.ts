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
    // FP-V-2: Rohantworten mitgeben, damit der Readiness-Check trennschärfer wird
    // (z. B. Nachhaltigkeit nicht als "fehlt" melden, wenn sie beantwortet wurde).
    const userAnswers = (session.data.messages ?? [])
      .filter((m) => m.role === "user" && m.kind === "answer")
      .map((m) => m.content);
    const report = evaluateFactsReadiness(session.data.facts, richtlinie, userAnswers);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[wizard/readiness] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
