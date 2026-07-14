import { NextRequest, NextResponse } from "next/server";
import { getWizardSession } from "@/lib/wizard/session";
import { generateText, MODEL_PRO } from "@/lib/wizard/llm";
import {
  reformulatePassage,
  isReformulierDirektive,
  MAX_PASSAGE_LEN,
  type ReformulierDirektive,
} from "@/lib/reformulierung";

/**
 * P4-A Teil 1 (Pilot-Feedback 24.06.) — On-Demand-Passagen-Reformulierung.
 *
 * ZUSTANDSLOS: nimmt eine Passage + Direktive, gibt eine gate-geprüfte Variante
 * zurück. Persistiert NICHTS — der Client splict die angenommene Variante in den
 * finalText und speichert über die bestehende /api/wizard/textvorschlag-Route.
 * So bleibt die neue Fläche minimal und der bewährte Speicher-Pfad unberührt.
 *
 * Rate-Limit: eigener 'reformulieren'-Bucket (lib/rate-limit.ts), damit die
 * LLM-Calls das Interview-Budget nicht aufzehren.
 */

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, passage, direktive } = (await req.json()) as {
      sessionToken?: string;
      passage?: unknown;
      direktive?: unknown;
    };

    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    if (typeof passage !== "string" || passage.trim().length === 0) {
      return NextResponse.json({ error: "passage erforderlich" }, { status: 400 });
    }
    if (passage.length > MAX_PASSAGE_LEN) {
      return NextResponse.json({ error: "passage zu lang" }, { status: 400 });
    }
    if (!isReformulierDirektive(direktive)) {
      return NextResponse.json({ error: "direktive ungültig" }, { status: 400 });
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    if (!session.data.generation) {
      return NextResponse.json({ error: "Kein Antrag in dieser Session" }, { status: 409 });
    }

    // Ground-Truth für das Halluzinations-Gate — exakt wie die Pipeline:
    // Facts + Nutzerantworten (role=user, kind=answer).
    const facts = session.data.facts;
    const userAnswers = session.data.messages
      .filter((m) => m.role === "user" && m.kind === "answer")
      .map((m) => m.content);

    const ergebnis = await reformulatePassage(
      { passage, direktive: direktive as ReformulierDirektive, facts, userAnswers },
      { generate: (system, user) => generateText(MODEL_PRO, system, user).then((r) => ({ value: r.value })) }
    );

    if (!ergebnis.ok) {
      // 200 mit ok:false — kein Serverfehler, sondern „konnte nicht sicher
      // umformuliert werden". Der Client behält das Original + zeigt einen Hinweis.
      return NextResponse.json({ ok: false, grund: ergebnis.grund });
    }
    return NextResponse.json({ ok: true, variante: ergebnis.variante });
  } catch (err) {
    console.error("[wizard/reformulieren] Fehler:", err);
    return NextResponse.json({ error: "unbekannter Fehler" }, { status: 500 });
  }
}
