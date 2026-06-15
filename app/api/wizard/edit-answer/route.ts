import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  getWizardSession,
  updateWizardSession,
  appendMessage,
  rollbackBeforeMessage,
} from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";
import { extractFacts } from "@/lib/wizard/facts-extractor";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, messageId, newAnswer } = (await req.json()) as {
      sessionToken?: string;
      messageId?: string;
      newAnswer?: string;
    };
    if (!sessionToken || !messageId || typeof newAnswer !== "string") {
      return NextResponse.json(
        { error: "sessionToken, messageId und newAnswer (string) erforderlich" },
        { status: 400 }
      );
    }
    const trimmed = newAnswer.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Neue Antwort darf nicht leer sein" },
        { status: 400 }
      );
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }

    const programm = programme.find((p) => p.id === session.foerderprogrammId);
    if (!programm) {
      return NextResponse.json(
        { error: "Programm nicht mehr in Daten vorhanden" },
        { status: 404 }
      );
    }

    // Idempotenter Retry: Schlug bei einem vorherigen Edit der Folgefrage-Schritt
    // (nextStep) fehl, liegt die editierte Antwort bereits als letzte
    // (unverarbeitete) User-Nachricht in der Session — allerdings mit NEUER id.
    // Ein erneutes Speichern traegt noch die alte messageId, die es nicht mehr
    // gibt. Dann die letzte Antwort ersetzen statt 404 zu werfen (spiegelt die
    // answer-Route), damit ein zweiter Versuch den Turn sauber abschliesst.
    const msgs = session.data.messages;
    const last = msgs[msgs.length - 1];
    const targetExists = msgs.some((m) => m.id === messageId);
    const isUnprocessedRetry =
      !targetExists && last?.role === "user" && last.kind === "answer";

    let data: typeof session.data;
    if (isUnprocessedRetry) {
      data = {
        ...session.data,
        messages: [
          ...msgs.slice(0, -1),
          { ...last, content: trimmed, at: new Date().toISOString() },
        ],
      };
    } else {
      // Rollback auf Zustand vor dieser Antwort
      data = rollbackBeforeMessage(session.data, messageId);
      // Neue Antwort an der gleichen Stelle einfuegen — factsBefore jetzt = data.facts
      data = appendMessage(data, {
        role: "user",
        kind: "answer",
        content: trimmed,
        meta: { factsBefore: data.facts, editedAt: new Date().toISOString() },
      });
    }

    // Datenverlust-Schutz: die editierte Antwort SOFORT persistieren, BEVOR die
    // LLM-Stages laufen. Schlaegt eine Stage fehl (z. B. abgeschnittenes JSON aus
    // dem LLM in nextStep), ueberlebt die Korrektur Reload + Retry. Frueher ging
    // sie verloren, weil updateWizardSession erst NACH den LLM-Calls erreicht
    // wurde — der Edit verschwand und im „Bisherigen Dialog" blieb der alte Text
    // stehen (gemeldeter Pilot-Bug).
    await updateWizardSession(sessionToken, data);

    // Stage 1: Fakten-Extraktion ueber den (durch Rollback bereinigten) Verlauf.
    const extracted = await extractFacts(data.messages, data.facts);
    data = { ...data, facts: extracted.facts };
    if (extracted.usage) {
      data = {
        ...data,
        costs: addUsage(data.costs ?? emptyLedger(), extracted.usage.model, extracted.usage.usage),
      };
    }

    // Stage 2: Interviewer weiterfragen mit frischem Facts-Stand. Faellt nextStep
    // aus (z. B. abgeschnittenes JSON), ist die Aenderung oben bereits gesichert —
    // wir melden einen wiederholbaren Fehler statt die Korrektur zu verschlucken.
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
      console.error(
        "[wizard/edit-answer] nextStep fehlgeschlagen (Aenderung gesichert):",
        stepErr
      );
      return NextResponse.json(
        {
          error:
            "Die KI war kurz nicht erreichbar. Ihre Änderung ist gespeichert — bitte speichern Sie sie gleich noch einmal.",
          retryable: true,
        },
        { status: 503 }
      );
    }
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
      messages: updated.data.messages,
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
    console.error("[wizard/edit-answer] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
