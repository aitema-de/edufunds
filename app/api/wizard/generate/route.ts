import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
} from "@/lib/wizard/session";
import { runPipeline } from "@/lib/wizard/pipeline";
import type { WizardSessionData } from "@/lib/wizard/types";
import type { PipelineStage } from "@/lib/wizard/types";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { query } from "@/lib/db";

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
    if (session.data.phase === "generating") {
      // D-12 Idempotenz: Pipeline laeuft serverseitig schon — Frontend soll pollen, nicht neu starten.
      return NextResponse.json({
        sessionToken,
        phase: "generating",
        message: "Pipeline läuft bereits, polle /api/wizard/[token]",
        generation: session.data.generation ?? null,
      });
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
      const onEvent = async (event: { stage: PipelineStage; message: string }) => {
        try {
          // WICHTIG: zu Beginn der Generierung existiert antrag_data.generation
          // noch nicht. jsonb_set auf '{generation,stage}' legt das fehlende
          // Eltern-Objekt NICHT an und no-op't dann still — dadurch kam beim
          // Polling nie ein Stage an und der Fortschrittsbalken hakte nichts ab.
          // Loesung: generation per Merge (||) setzen/erweitern, statt nested set.
          await query(
            `UPDATE ki_antraege
               SET antrag_data = jsonb_set(
                 COALESCE(antrag_data, '{}'::jsonb),
                 '{generation}',
                 COALESCE(antrag_data->'generation', '{}'::jsonb)
                   || jsonb_build_object('stage', $1::text, 'stageAt', $2::text)
               ),
               updated_at = CURRENT_TIMESTAMP
             WHERE session_token = $3`,
            [event.stage, new Date().toISOString(), sessionToken]
          );
        } catch (e) {
          // Best-Effort — Pipeline darf nicht wegen DB-Hick crashen.
          console.warn("[wizard/generate] Stage-Heartbeat fehlgeschlagen:", e);
        }
      };
      const { artefacts, usages } = await runPipeline(
        programm,
        session.data.facts,
        richtlinie,
        onEvent,
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
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
