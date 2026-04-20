import { NextRequest, NextResponse } from "next/server";
import { getWizardSession } from "@/lib/wizard/session";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "token fehlt" }, { status: 400 });
  }
  const session = await getWizardSession(token);
  if (!session) {
    return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({
    sessionToken: session.sessionToken,
    foerderprogrammId: session.foerderprogrammId,
    foerderprogrammName: session.foerderprogrammName,
    phase: session.data.phase,
    messages: session.data.messages,
    facts: session.data.facts,
    interviewer: session.data.interviewer,
    generation: session.data.generation ?? null,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}
