import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { getWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import type { Kumulierung } from "@/lib/wizard/richtlinien-schema";
import type { WizardFacts } from "@/lib/wizard/types";
import {
  OVERLAP_HARD,
  OVERLAP_SOFT,
  projektUeberlappung,
} from "@/lib/wizard/projekt-overlap";

const programme = foerderprogrammeData as Foerderprogramm[];

interface Conflict {
  otherSessionToken: string;
  otherProgrammId: string;
  otherProgrammName: string;
  similarityScore: number;
  reasons: string[];
  level: "error" | "warning";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      programmId?: string;
      otherSessionTokens?: string[];
      currentSessionToken?: string;
      currentFacts?: WizardFacts;
    };
    const { programmId, otherSessionTokens, currentSessionToken, currentFacts } = body;

    if (!programmId) {
      return NextResponse.json({ error: "programmId erforderlich" }, { status: 400 });
    }
    if (!Array.isArray(otherSessionTokens) || otherSessionTokens.length === 0) {
      return NextResponse.json({ conflicts: [] });
    }

    const current = programme.find((p) => p.id === programmId);
    if (!current) {
      return NextResponse.json({ error: "Programm nicht gefunden" }, { status: 404 });
    }
    const currentRichtlinie = await loadRichtlinie(programmId);
    const kumulierungCurrent: Kumulierung =
      currentRichtlinie?.kumulierung ?? { erlaubt: "bedingt" };

    let factsCurrent: WizardFacts = {};
    if (currentSessionToken) {
      const cur = await getWizardSession(currentSessionToken);
      if (cur) factsCurrent = cur.data.facts;
    } else if (currentFacts) {
      factsCurrent = currentFacts;
    }

    const conflicts: Conflict[] = [];

    for (const token of otherSessionTokens) {
      if (!token) continue;
      const other = await getWizardSession(token);
      if (!other) continue;
      if (other.foerderprogrammId === programmId) continue;

      const otherProgramm = programme.find((p) => p.id === other.foerderprogrammId);
      if (!otherProgramm) continue;

      const otherRichtlinie = await loadRichtlinie(other.foerderprogrammId);
      const kumulierungOther: Kumulierung =
        otherRichtlinie?.kumulierung ?? { erlaubt: "bedingt" };

      const reasons: string[] = [];
      let level: Conflict["level"] = "warning";

      const unvereinbar =
        (kumulierungCurrent.unvereinbarMit ?? []).includes(other.foerderprogrammId) ||
        (kumulierungOther.unvereinbarMit ?? []).includes(programmId);
      if (unvereinbar) {
        reasons.push(
          "Die Richtlinien nennen das jeweils andere Programm ausdrücklich als unvereinbar."
        );
        level = "error";
      }

      if (kumulierungCurrent.erlaubt === false || kumulierungOther.erlaubt === false) {
        reasons.push(
          "Mindestens eins der Programme erlaubt keine Doppelförderung derselben Maßnahme."
        );
        if (level !== "error") level = "warning";
      }

      const overlap = projektUeberlappung(factsCurrent, other.data.facts);
      const overlapPercent = Math.round(overlap.score * 100);
      const stichworte = overlap.commonTokens.length
        ? ` Überschneidende Stichworte: ${overlap.commonTokens.join(", ")}.`
        : "";
      if (overlap.score >= OVERLAP_HARD) {
        reasons.push(
          `Projektbeschreibung überschneidet sich stark mit dem anderen Antrag (${overlapPercent} %).` +
            stichworte +
            " Dieselbe Maßnahme darf in der Regel nicht aus beiden Programmen gefördert werden."
        );
        if (level !== "error") level = "warning";
      } else if (overlap.score >= OVERLAP_SOFT) {
        reasons.push(
          `Projektbeschreibung überschneidet sich spürbar (${overlapPercent} %).` +
            stichworte +
            " Bitte prüfen, dass identische Kostenposten nicht aus beiden Programmen beantragt werden."
        );
        if (level !== "error") level = "warning";
      }

      if (reasons.length === 0) continue;

      conflicts.push({
        otherSessionToken: token,
        otherProgrammId: other.foerderprogrammId,
        otherProgrammName: other.foerderprogrammName,
        similarityScore: overlap.score,
        reasons,
        level,
      });
    }

    return NextResponse.json({ conflicts });
  } catch (err) {
    console.error("[wizard/kumulierungs-check] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
