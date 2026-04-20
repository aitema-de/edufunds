import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { getWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import type { Kumulierung } from "@/lib/wizard/richtlinien-schema";
import type { WizardFacts } from "@/lib/wizard/types";

const programme = foerderprogrammeData as Foerderprogramm[];

/**
 * Einfaches Aehnlichkeits-Mass auf Projekt-Kurzbeschreibung / Titel.
 * Kein NLP — nur Heuristik: gemeinsame Kurzfassungs-Tokens ueber 40%.
 */
function projektUeberlappung(a: WizardFacts, b: WizardFacts): { similar: boolean; score: number } {
  const pa = (a.projekt as { kurzbeschreibung?: string; titel?: string } | undefined);
  const pb = (b.projekt as { kurzbeschreibung?: string; titel?: string } | undefined);
  const ta = (pa?.titel ?? "") + " " + (pa?.kurzbeschreibung ?? "");
  const tb = (pb?.titel ?? "") + " " + (pb?.kurzbeschreibung ?? "");
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-zA-Zäöüß0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 4);
  const A = new Set(normalize(ta));
  const B = new Set(normalize(tb));
  if (A.size === 0 || B.size === 0) return { similar: false, score: 0 };
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  const score = (2 * shared) / (A.size + B.size);
  return { similar: score >= 0.4, score };
}

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
    const { programmId, otherSessionTokens } = (await req.json()) as {
      programmId?: string;
      otherSessionTokens?: string[];
    };
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
          `Die Richtlinien nennen das jeweils andere Programm ausdruecklich als unvereinbar.`
        );
        level = "error";
      }

      if (kumulierungCurrent.erlaubt === false || kumulierungOther.erlaubt === false) {
        reasons.push("Mindestens eins der Programme erlaubt keine Doppelfoerderung derselben Massnahme.");
        if (level !== "error") level = "warning";
      }

      const overlap = projektUeberlappung(other.data.facts, {}); // facts of current still empty at start — will improve later
      // Ohne aktuelle Projekt-Facts koennen wir nicht matchen. Nimm nur die Unvereinbarkeit.
      // Falls aehnlich, ergaenzen wir spaeter ueber einen zweiten Call nach dem Interview.

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
