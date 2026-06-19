/**
 * POST /api/eval/match — Read-only Endpoint fuer die externe grant-eval-suite.
 *
 * Body:   { profile: { anliegen, schulname?, schultyp?, bundesland?, geschaetztesBudgetEur? } }
 * Return: { suggestions: [{ program_id, name, deadline, score }] }
 *
 * Gated per Shared-Secret-Header X-Eval-Token gegen EVAL_TOKEN (fail-closed).
 * Wiederverwendet runMatch() aus lib/wizard/matcher — keine DB/Session.
 */
import { NextRequest, NextResponse } from "next/server";
import { runMatch, type MatchInput } from "@/lib/wizard/matcher";

export const maxDuration = 60;

function tokenOk(req: NextRequest): boolean {
  const tok = req.headers.get("x-eval-token");
  return !!process.env.EVAL_TOKEN && tok === process.env.EVAL_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as { profile?: Partial<MatchInput> };
    const p = body.profile ?? (body as Partial<MatchInput>);
    if (!p.anliegen || typeof p.anliegen !== "string") {
      // Ohne Anliegen kann nicht gematcht werden — leere Vorschlagsliste.
      return NextResponse.json({ suggestions: [] });
    }
    const result = await runMatch({
      anliegen: p.anliegen,
      schulname: p.schulname,
      schultyp: p.schultyp,
      bundesland: p.bundesland,
      geschaetztesBudgetEur: p.geschaetztesBudgetEur,
      forceRanking: true, // Eval will Vorschlaege, keine Rueckfrage
    });
    if (result.kind === "clarification") {
      return NextResponse.json({ suggestions: [] });
    }
    return NextResponse.json({
      suggestions: result.matches.map((m) => ({
        program_id: m.id,
        name: m.programm?.name ?? m.id,
        deadline: m.programm?.bewerbungsfristEnde ?? "rolling",
        score: m.score,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "eval match failed", details: (err as Error)?.message },
      { status: 500 },
    );
  }
}
