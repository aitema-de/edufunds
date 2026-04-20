import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  createWizardSession,
  updateWizardSession,
  appendMessage,
} from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const { programmId } = (await req.json()) as { programmId?: string };
    if (!programmId) {
      return NextResponse.json({ error: "programmId fehlt" }, { status: 400 });
    }
    const programm = programme.find((p) => p.id === programmId);
    if (!programm) {
      return NextResponse.json({ error: "Programm nicht gefunden" }, { status: 404 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    const session = await createWizardSession(programm.id, programm.name, ip);

    const step = await nextStep(
      programm,
      session.data.messages,
      session.data.facts,
      0,
      session.data.interviewer.maxQuestions
    );

    let data = session.data;
    data = { ...data, facts: step.updatedFacts };

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

    const updated = await updateWizardSession(session.sessionToken, data);
    return NextResponse.json({
      sessionToken: updated.sessionToken,
      phase: updated.data.phase,
      question:
        step.kind === "question"
          ? { content: step.question, rationale: step.rationale }
          : null,
      ready: step.kind === "ready" ? { summary: step.summary } : null,
      totalQuestions: updated.data.interviewer.totalQuestions,
      maxQuestions: updated.data.interviewer.maxQuestions,
      facts: updated.data.facts,
    });
  } catch (err) {
    console.error("[wizard/start] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
