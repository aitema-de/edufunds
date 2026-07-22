import { NextRequest, NextResponse } from "next/server";
import { runMatch, type MatchInput } from "@/lib/wizard/matcher";
import { brauchtFristHinweis } from "@/lib/foerder-zustaende";

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
      forceRanking: body.forceRanking,
      previousAnliegen: body.previousAnliegen,
    });

    // D-08/D-09: Tagged-Union-Dispatch im JSON-Response.
    // Frontend (Plan 02-02) liest body.kind und rendert ranking-Liste oder ClarificationCard.
    if (result.kind === "clarification") {
      return NextResponse.json({
        kind: "clarification",
        question: result.question,
        costs: result.costs,
      });
    }

    return NextResponse.json({
      kind: "ranking",
      matches: result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        // D-04: altes Pauschal-Feld hart entfernt — strukturierte Felder ersetzen es.
        passt_weil: m.passt_weil,
        achtung_bei: m.achtung_bei,
        programm: {
          id: m.programm.id,
          name: m.programm.name,
          foerdergeber: (m.programm as any).foerdergeber,
          foerdergeberTyp: (m.programm as any).foerdergeberTyp,
          foerdersummeText: (m.programm as any).foerdersummeText,
          foerdersummeMin: (m.programm as any).foerdersummeMin,
          foerdersummeMax: (m.programm as any).foerdersummeMax,
          bewerbungsfristText: (m.programm as any).bewerbungsfristText,
          bewerbungsfristEnde: (m.programm as any).bewerbungsfristEnde,
          // Nicht den rohen fristZustand ausliefern, sondern die Entscheidung:
          // Muss der Kunde VOR dem Kauf sehen, dass die Frist ungeprueft ist?
          // (Entscheidung 22.07.2026 — s. components/FristHinweis.tsx.)
          fristUnverifiziert: brauchtFristHinweis((m.programm as any).fristZustand),
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
      { error: "Matching fehlgeschlagen" },
      { status: 500 }
    );
  }
}
