import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import {
  createWizardSession,
  updateWizardSession,
  appendMessage,
  mergeFacts,
} from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";
import type { WizardFacts } from "@/lib/wizard/types";
import { addUsage, emptyLedger } from "@/lib/wizard/pricing";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";
import { readJsonBody } from "@/lib/json-body";
import { getClientIP } from "@/lib/rate-limit";

function richtlinieStatus(r: Richtlinie | null): {
  available: boolean;
  stub: boolean;
  version?: string;
} {
  if (!r) return { available: false, stub: false };
  const stub = r.version?.includes("stub") ?? false;
  return { available: true, stub, version: r.version };
}

const programme = foerderprogrammeData as Foerderprogramm[];

export async function POST(req: NextRequest) {
  try {
    const gelesen = await readJsonBody<{ programmId?: string; seedFacts?: Partial<WizardFacts> }>(req);
    if (!gelesen.ok) return gelesen.response;
    const { programmId, seedFacts } = gelesen.body;
    if (!programmId) {
      return NextResponse.json({ error: "programmId fehlt" }, { status: 400 });
    }
    const programm = programme.find((p) => p.id === programmId);
    if (!programm) {
      return NextResponse.json({ error: "Programm nicht gefunden" }, { status: 404 });
    }

    // Gemeinsame IP-Ermittlung (lib/rate-limit.ts): liest den X-Forwarded-For von
    // RECHTS. Vorher stand hier `split(",")[0]` — der erste Eintrag ist vom Client
    // frei erfindbar, die auf der Session gespeicherte Herkunfts-IP war damit
    // beliebig faelschbar (Selbst-Pentest 30.07.2026).
    const ermittelt = getClientIP(req);
    const ip = ermittelt === "unknown" ? undefined : ermittelt;

    const session = await createWizardSession(programm.id, programm.name, ip);

    // Seed-Facts aus dem Schul-Profil uebernehmen, bevor der Interviewer startet
    const initialFacts = seedFacts
      ? mergeFacts(session.data.facts, seedFacts)
      : session.data.facts;

    const richtlinie = await loadRichtlinie(programm.id);
    const { step, usage } = await nextStep(
      programm,
      session.data.messages,
      initialFacts,
      0,
      session.data.interviewer.maxQuestions,
      richtlinie
    );

    let data = session.data;
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
      costs: updated.data.costs ?? null,
      richtlinieStatus: richtlinieStatus(richtlinie),
    });
  } catch (err) {
    console.error("[wizard/start] Fehler:", err);
    return NextResponse.json(
      { error: "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
