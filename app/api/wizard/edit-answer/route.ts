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

    // Rollback auf Zustand vor dieser Antwort
    let data = rollbackBeforeMessage(session.data, messageId);

    // Neue Antwort an der gleichen Stelle einfuegen — factsBefore jetzt = data.facts
    data = appendMessage(data, {
      role: "user",
      kind: "answer",
      content: trimmed,
      meta: { factsBefore: data.facts, editedAt: new Date().toISOString() },
    });

    // Stage 1: Fakten-Extraktion ueber den (durch Rollback bereinigten) Verlauf.
    const extracted = await extractFacts(data.messages, data.facts);
    data = { ...data, facts: extracted.facts };
    if (extracted.usage) {
      data = {
        ...data,
        costs: addUsage(data.costs ?? emptyLedger(), extracted.usage.model, extracted.usage.usage),
      };
    }

    // Stage 2: Interviewer weiterfragen mit frischem Facts-Stand.
    const richtlinie = await loadRichtlinie(programm.id);
    const { step, usage } = await nextStep(
      programm,
      data.messages,
      data.facts,
      data.interviewer.totalQuestions,
      data.interviewer.maxQuestions,
      richtlinie
    );
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
