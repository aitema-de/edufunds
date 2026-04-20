import { NextRequest, NextResponse } from "next/server";
import { runMatch, type MatchInput } from "@/lib/wizard/matcher";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<MatchInput>;
    if (!body.anliegen || typeof body.anliegen !== "string") {
      return NextResponse.json({ error: "anliegen (string) erforderlich" }, { status: 400 });
    }
    const result = await runMatch({
      anliegen: body.anliegen,
      schulname: body.schulname,
      schultyp: body.schultyp,
      bundesland: body.bundesland,
      geschaetztesBudgetEur: body.geschaetztesBudgetEur,
    });

    return NextResponse.json({
      matches: result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        begruendung: m.begruendung,
        programm: {
          id: m.programm.id,
          name: m.programm.name,
          foerdergeber: (m.programm as any).foerdergeber,
          foerdergeberTyp: (m.programm as any).foerdergeberTyp,
          foerdersummeText: (m.programm as any).foerdersummeText,
          foerdersummeMax: (m.programm as any).foerdersummeMax,
          bewerbungsfristText: (m.programm as any).bewerbungsfristText,
          kategorien: (m.programm as any).kategorien,
          kurzbeschreibung: (m.programm as any).kurzbeschreibung,
        },
      })),
      totalCandidates: result.totalCandidates,
      filteredOut: result.filteredOut,
      costs: result.costs,
    });
  } catch (err) {
    console.error("[api/match] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Matching fehlgeschlagen" },
      { status: 500 }
    );
  }
}
