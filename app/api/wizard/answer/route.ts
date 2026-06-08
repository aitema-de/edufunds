import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
  appendMessage,
} from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";
import { extractFacts } from "@/lib/wizard/facts-extractor";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, answer } = (await req.json()) as {
      sessionToken?: string;
      answer?: string;
    };
    if (!sessionToken || typeof answer !== "string") {
      return NextResponse.json(
        { error: "sessionToken und answer (string) erforderlich" },
        { status: 400 }
      );
    }
    const trimmed = answer.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Antwort darf nicht leer sein" },
        { status: 400 }
      );
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden" },
        { status: 404 }
      );
    }
    if (session.data.phase !== "interviewing") {
      return NextResponse.json(
        { error: `Session ist in Phase ${session.data.phase}, keine Antwort erwartet` },
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

    // Antwort als Nachricht aufnehmen. Sonderfall Retry: Ist die LETZTE Nachricht
    // bereits eine User-Antwort (statt einer AI-Frage), ist der vorige Turn nach
    // dem Speichern der Antwort fehlgeschlagen (keine Folgefrage erzeugt). Dann
    // ist diese Einsendung ein Wiederholversuch — die letzte Antwort ersetzen,
    // nicht doppelt anhaengen (verhindert Duplikate, auch bei korrigierter Antwort).
    const msgs = session.data.messages;
    const last = msgs[msgs.length - 1];
    const isUnprocessedRetry = last?.role === "user" && last.kind === "answer";

    let data = isUnprocessedRetry
      ? {
          ...session.data,
          messages: [
            ...msgs.slice(0, -1),
            { ...last, content: trimmed, at: new Date().toISOString() },
          ],
        }
      : appendMessage(session.data, {
          role: "user",
          kind: "answer",
          content: trimmed,
          // factsBefore speichern, damit wir die Antwort spaeter editierbar machen koennen
          meta: { factsBefore: session.data.facts },
        });

    // Datenverlust-Schutz: die rohe Antwort SOFORT persistieren, BEVOR die
    // LLM-Stages laufen. Schlaegt eine Stage fehl (z. B. abgeschnittenes JSON aus
    // DeepSeek in nextStep), ist die Nutzerantwort bereits gespeichert und
    // ueberlebt Reload und Retry — frueher ging sie verloren, weil
    // updateWizardSession erst nach den LLM-Calls erreicht wurde.
    await updateWizardSession(sessionToken, data);

    // Stage 1: dedizierte Fakten-Extraktion ueber den gesamten Verlauf.
    // Faellt sie aus, behaelt der Aufrufer den alten Stand — der Interviewer arbeitet dann
    // wie zuvor mit teilbefuellten Facts, aber stuerzt nicht ab.
    const extracted = await extractFacts(data.messages, data.facts);
    data = { ...data, facts: extracted.facts };
    if (extracted.usage) {
      data = {
        ...data,
        costs: addUsage(data.costs ?? emptyLedger(), extracted.usage.model, extracted.usage.usage),
      };
    }

    // Stage 2: Interviewer entscheidet die naechste Frage anhand des frischen Facts-Stands.
    const richtlinie = await loadRichtlinie(programm.id);
    let step: Awaited<ReturnType<typeof nextStep>>["step"];
    let usage: Awaited<ReturnType<typeof nextStep>>["usage"];
    try {
      ({ step, usage } = await nextStep(
        programm,
        data.messages,
        data.facts,
        data.interviewer.totalQuestions,
        data.interviewer.maxQuestions,
        richtlinie
      ));
    } catch (stepErr) {
      // nextStep konnte keine valide Frage erzeugen (z. B. abgeschnittenes JSON).
      // Die Antwort ist oben bereits persistiert — kein Datenverlust. Wir melden
      // einen wiederholbaren Fehler; der Retry oben ersetzt die Antwort statt sie
      // zu doppeln, sodass ein erneutes Senden den Turn sauber abschliesst.
      console.error("[wizard/answer] nextStep fehlgeschlagen (Antwort gesichert):", stepErr);
      return NextResponse.json(
        {
          error:
            "Die KI war kurz nicht erreichbar. Deine Antwort ist gespeichert — bitte sende sie gleich noch einmal.",
          retryable: true,
        },
        { status: 503 }
      );
    }
    // Interviewer kann via facts_update noch ergaenzen (Fallback), aber Extractor ist fuehrend.
    data = { ...data, facts: step.updatedFacts };

    if (usage) {
      data = { ...data, costs: addUsage(data.costs ?? emptyLedger(), usage.model, usage.usage) };
    }

    if (step.kind === "question") {
      data = appendMessage(data, {
        role: "ai",
        kind: "question",
        content: step.question,
        meta: step.rationale ? { rationale: step.rationale } : undefined,
      });
      data = {
        ...data,
        interviewer: {
          ...data.interviewer,
          totalQuestions: data.interviewer.totalQuestions + 1,
        },
      };
    } else {
      data = { ...data, phase: "ready_to_generate" };
    }

    const updated = await updateWizardSession(sessionToken, data);
    return NextResponse.json({
      sessionToken,
      phase: updated.data.phase,
      question:
        step.kind === "question"
          ? { content: step.question, rationale: step.rationale }
          : null,
      ready: step.kind === "ready" ? { summary: step.summary } : null,
      totalQuestions: updated.data.interviewer.totalQuestions,
      maxQuestions: updated.data.interviewer.maxQuestions,
      facts: updated.data.facts,
      costs: updated.data.costs ?? null,
    });
  } catch (err) {
    console.error("[wizard/answer] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
