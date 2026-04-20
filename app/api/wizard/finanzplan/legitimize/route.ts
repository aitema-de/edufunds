import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";

const programme = foerderprogrammeData as Foerderprogramm[];

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
    const plan = session.data.generation?.finanzplan;
    if (!plan) {
      return NextResponse.json({ error: "Kein Finanzplan vorhanden" }, { status: 400 });
    }
    if (plan.legitimiertAm) {
      return NextResponse.json({ error: "Bereits freigegeben" }, { status: 409 });
    }

    const programm = programme.find((p) => p.id === session.foerderprogrammId);
    const richtlinie = programm ? await loadRichtlinie(programm.id) : null;
    const validation = validateFinanzplan(plan, richtlinie);
    if (!validation.okFuerFreigabe) {
      return NextResponse.json(
        {
          error: "Freigabe nicht möglich — bitte erst Fehler beheben.",
          warnungen: validation.warnungen,
        },
        { status: 422 }
      );
    }

    const legitimiertPlan = { ...plan, legitimiertAm: new Date().toISOString() };
    const newData = {
      ...session.data,
      generation: {
        ...(session.data.generation ?? {}),
        finanzplan: legitimiertPlan,
      },
    };
    const updated = await updateWizardSession(sessionToken, newData);
    return NextResponse.json({
      sessionToken: updated.sessionToken,
      finanzplan: updated.data.generation?.finanzplan ?? null,
    });
  } catch (err) {
    console.error("[wizard/finanzplan/legitimize] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
