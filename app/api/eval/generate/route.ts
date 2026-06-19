/**
 * POST /api/eval/generate — Read-only Endpoint fuer die externe grant-eval-suite.
 *
 * Body:   { profile: { anliegen, schulname?, schultyp?, bundesland?, geschaetztesBudgetEur? }, program_id }
 * Return: { text, claimed_program_id, declined }
 *
 * Gated per Shared-Secret-Header X-Eval-Token gegen EVAL_TOKEN (fail-closed).
 * Wiederverwendet runPipeline() direkt (ohne Session/DB) + loadRichtlinie().
 * Achtung: die Pipeline macht ~9 LLM-Calls → maxDuration hoch.
 */
import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import { runPipeline } from "@/lib/wizard/pipeline";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { WizardFacts } from "@/lib/wizard/types";

export const maxDuration = 300;

const PROGRAMME = foerderprogrammeData as unknown as Foerderprogramm[];

function tokenOk(req: NextRequest): boolean {
  const tok = req.headers.get("x-eval-token");
  return !!process.env.EVAL_TOKEN && tok === process.env.EVAL_TOKEN;
}

type EvalProfile = {
  anliegen?: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
};

function toFacts(p: EvalProfile): WizardFacts {
  return {
    schule: { name: p.schulname, typ: p.schultyp, bundesland: p.bundesland },
    projekt: { titel: (p.anliegen ?? "").slice(0, 80), kurzbeschreibung: p.anliegen },
    budget: { beantragt_eur: p.geschaetztesBudgetEur },
  };
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as { profile?: EvalProfile; program_id?: string };
    const programId = body.program_id;
    if (!programId) {
      return NextResponse.json({ text: "", claimed_program_id: null, declined: true });
    }
    const programm = PROGRAMME.find((x) => x.id === programId);
    if (!programm) {
      return NextResponse.json({ text: "", claimed_program_id: null, declined: true, reason: "unknown_program" });
    }
    const facts = toFacts(body.profile ?? {});
    const richtlinie = await loadRichtlinie(programm.id).catch(() => null);
    const result = await runPipeline(programm, facts, richtlinie);
    return NextResponse.json({
      text: result.artefacts.finalText ?? "",
      claimed_program_id: programId,
      declined: false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "eval generate failed", details: (err as Error)?.message },
      { status: 500 },
    );
  }
}
