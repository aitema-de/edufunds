import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import { computeAutofixes, toMeta } from "@/lib/wizard/finanzplan-autofix";
import type { Finanzplan } from "@/lib/wizard/types";

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, actionId } = (await req.json()) as {
      sessionToken?: string;
      actionId?: string;
    };
    if (!sessionToken || !actionId) {
      return NextResponse.json(
        { error: "sessionToken und actionId erforderlich" },
        { status: 400 }
      );
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    // Paywall-Gate: Finanzplan-Änderungen (Auto-Fix) sind ein Schritt NACH der
    // Zahlung (vgl. AntragResult.tsx: FinanzplanEditor rendert nur bei paid). Ohne
    // diesen Server-Check ließe sich die Paywall per direktem API-Aufruf umgehen.
    if (!session.paidToken) {
      return NextResponse.json(
        { error: "Zahlung erforderlich, bevor der Finanzplan geändert werden kann." },
        { status: 402 }
      );
    }
    const plan = session.data.generation?.finanzplan;
    if (!plan) {
      return NextResponse.json({ error: "Kein Finanzplan vorhanden" }, { status: 400 });
    }
    if (plan.legitimiertAm) {
      return NextResponse.json(
        { error: "Finanzplan ist bereits freigegeben und kann nicht mehr geändert werden." },
        { status: 409 }
      );
    }

    const programm = programme.find((p) => p.id === session.foerderprogrammId);
    const richtlinie = programm ? await loadRichtlinie(programm.id) : null;

    const actions = computeAutofixes({ posten: plan.posten, richtlinie });
    const action = actions.find((a) => a.id === actionId);
    if (!action) {
      return NextResponse.json(
        { error: `Auto-Fix-Aktion '${actionId}' nicht (mehr) verfügbar — Plan oder Richtlinie hat sich geändert.` },
        { status: 410 }
      );
    }

    const newPosten = action.apply(plan.posten);
    const newPlan: Finanzplan = {
      ...plan,
      posten: newPosten,
      generiertAm: plan.generiertAm,
    };

    const updated = await updateWizardSession(sessionToken, {
      ...session.data,
      generation: {
        ...(session.data.generation ?? {}),
        finanzplan: newPlan,
      },
    });

    const validation = updated.data.generation?.finanzplan
      ? validateFinanzplan(updated.data.generation.finanzplan, richtlinie)
      : null;
    const autofixes = updated.data.generation?.finanzplan
      ? computeAutofixes({
          posten: updated.data.generation.finanzplan.posten,
          richtlinie,
        }).map(toMeta)
      : [];

    return NextResponse.json({
      sessionToken: updated.sessionToken,
      finanzplan: updated.data.generation?.finanzplan ?? null,
      validation,
      autofixes,
      appliedAction: toMeta(action),
    });
  } catch (err) {
    console.error("[wizard/finanzplan/autofix] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
