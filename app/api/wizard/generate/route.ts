import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
} from "@/lib/wizard/session";
import { runPipeline } from "@/lib/wizard/pipeline";
import { withPromptCacheKey, cacheKeyFromSession } from "@/lib/wizard/llm";
import type { WizardSessionData } from "@/lib/wizard/types";
import type { PipelineStage } from "@/lib/wizard/types";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { query } from "@/lib/db";
import { readJsonBody } from "@/lib/json-body";

const programme = foerderprogrammeData as Foerderprogramm[];

export const maxDuration = 300; // bis zu 5 Minuten für die gesamte Pipeline

export async function POST(req: NextRequest) {
  try {
    const gelesen = await readJsonBody<{ sessionToken?: string; texttiefe?: string }>(req);
    if (!gelesen.ok) return gelesen.response;
    const body = gelesen.body;
    const { sessionToken } = body;
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken fehlt" }, { status: 400 });
    }
    // P3-B: Texttiefe-Wahl validieren (sonst Default "standard" = unverändertes Verhalten).
    const texttiefe =
      body.texttiefe === "knapp" || body.texttiefe === "ausfuehrlich"
        ? body.texttiefe
        : "standard";

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
    // "failed" MUSS hier stehen. Der Fehlerpfad unten schreibt genau diese Phase —
    // stand sie nicht in der Erlaubnisliste, sperrte sich die Session mit dem
    // eigenen Fehlschlag selbst aus: Jeder Klick auf „Erneut versuchen" bekam
    // 409 zurueck, dauerhaft, ohne Ausweg. Genau so ist es am 13.08.2026 einem
    // Tester ergangen (Antrag 37, pilot.edufunds.org): ein 500 um 12:05:38, danach
    // sieben 409 in acht Minuten, dann hat er aufgegeben. Das Frontend setzte beim
    // Retry nur seinen EIGENEN Zustand auf "ready_to_generate" zurueck — der Server
    // wusste davon nichts.
    if (
      session.data.phase !== "ready_to_generate" &&
      session.data.phase !== "interviewing" &&
      session.data.phase !== "failed"
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
      // Neuer Anlauf — der Fehler des letzten Versuchs ist Geschichte.
      lastError: undefined,
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
      // Alle Aufrufe dieses Laufs teilen einen Prompt-Cache-Schluessel. Die
      // Pipeline schickt denselben Block (Dossier, Fakten, Nutzerantworten,
      // stehende Regeln) ueber ihre Stufen hinweg immer wieder mit — gemessen
      // am 19.08.2026 sind 77 % des Prompt-Volumens Wiederholung. Gecachte
      // Tokens kosten das Minutenkontingent praktisch nichts (7.534 -> 30),
      // und genau dieses Kontingent ist der Engpass.
      const { artefacts, usages } = await withPromptCacheKey(
        cacheKeyFromSession(sessionToken),
        () =>
          runPipeline(
            programm,
            session.data.facts,
            richtlinie,
            onEvent,
            session.data.messages,
            { texttiefe }
          )
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
      const meldung =
        pipelineErr instanceof Error ? pipelineErr.message : "Pipeline-Fehler";

      // Frisch lesen statt `generatingData` zu recyceln: Waehrend die Pipeline
      // lief, hat der Stage-Heartbeat (onEvent) `generation.stage` in die DB
      // geschrieben. Der alte Code schrieb den VOR-Pipeline-Stand zurueck und
      // loeschte damit die einzige Spur, wie weit die Generierung gekommen war.
      const aktuell = await getWizardSession(sessionToken);
      const basis = aktuell?.data ?? generatingData;
      const failedData: WizardSessionData = {
        ...basis,
        phase: "failed",
        lastError: {
          message: meldung,
          at: new Date().toISOString(),
          stage: basis.generation?.stage,
        },
      };
      await updateWizardSession(sessionToken, failedData);
      return NextResponse.json({ error: meldung }, { status: 500 });
    }
  } catch (err) {
    console.error("[wizard/generate] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
