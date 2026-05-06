import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
} from "@/lib/wizard/session";
import { runPipeline } from "@/lib/wizard/pipeline";
import type { WizardSessionData } from "@/lib/wizard/types";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";

const programme = foerderprogrammeData as Foerderprogramm[];

export const maxDuration = 300; // bis zu 5 Minuten für die gesamte Pipeline

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = (await req.json()) as { sessionToken?: string };
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken fehlt" }, { status: 400 });
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    if (
      session.data.phase !== "ready_to_generate" &&
      session.data.phase !== "interviewing"
    ) {
      return NextResponse.json(
        { error: `Session ist in Phase ${session.data.phase}` },
        { status: 409 }
      );
    }

    const programm = programme.find((p) => p.id === session.foerderprogrammId);
    if (!programm) {
      return NextResponse.json(
        { error: "Programm nicht mehr in Daten vorhanden" },
        { status: 404 }
      );
    }

    const generatingData: WizardSessionData = {
      ...session.data,
      phase: "generating",
    };
    await updateWizardSession(sessionToken, generatingData, "in_progress");

    try {
      const richtlinie = await loadRichtlinie(programm.id);
      const { artefacts, usages } = await runPipeline(
        programm,
        session.data.facts,
        richtlinie,
        undefined,
        session.data.messages
      );
      let costs = generatingData.costs ?? emptyLedger();
      for (const u of usages) costs = addUsage(costs, u.model, u.usage);
      const completeData: WizardSessionData = {
        ...generatingData,
        phase: "complete",
        generation: artefacts,
        costs,
      };
      const updated = await updateWizardSession(sessionToken, completeData, "complete");
      return NextResponse.json({
        sessionToken,
        phase: updated.data.phase,
        generation: updated.data.generation,
        costs: updated.data.costs ?? null,
      });
    } catch (pipelineErr) {
      console.error("[wizard/generate] Pipeline-Fehler:", pipelineErr);
      const failedData: WizardSessionData = { ...generatingData, phase: "failed" };
      await updateWizardSession(sessionToken, failedData);
      return NextResponse.json(
        {
          error:
            pipelineErr instanceof Error
              ? pipelineErr.message
              : "Pipeline-Fehler",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[wizard/generate] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
