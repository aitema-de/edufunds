import { NextRequest, NextResponse } from "next/server";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";
import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import { computeAutofixes, toMeta } from "@/lib/wizard/finanzplan-autofix";

const programme = foerderprogrammeData as Foerderprogramm[];

function sanitizePosten(raw: unknown): Finanzposten | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Finanzposten>;
  if (!r.bezeichnung || typeof r.bezeichnung !== "string") return null;
  if (typeof r.betragEur !== "number" || !Number.isFinite(r.betragEur)) return null;
  const katOk = ["personal", "sachkosten", "investitionen", "honorare", "reisekosten", "overhead", "sonstiges"];
  const kategorie = katOk.includes(r.kategorie as string) ? (r.kategorie as Finanzposten["kategorie"]) : "sonstiges";
  return {
    id: typeof r.id === "string" && r.id.length > 0 ? r.id : crypto.randomUUID(),
    kategorie,
    bezeichnung: r.bezeichnung.trim(),
    betragEur: Math.max(0, Math.round(r.betragEur)),
    begruendung: typeof r.begruendung === "string" ? r.begruendung.trim() || undefined : undefined,
    eigenanteil: Boolean(r.eigenanteil),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, posten, hinweise } = (await req.json()) as {
      sessionToken?: string;
      posten?: unknown[];
      hinweise?: string[];
    };
    if (!sessionToken || !Array.isArray(posten)) {
      return NextResponse.json(
        { error: "sessionToken und posten[] erforderlich" },
        { status: 400 }
      );
    }
    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    if (session.data.generation?.finanzplan?.legitimiertAm) {
      return NextResponse.json(
        { error: "Finanzplan ist bereits freigegeben und kann nicht mehr geaendert werden." },
        { status: 409 }
      );
    }

    const cleanedPosten = posten.map(sanitizePosten).filter((p): p is Finanzposten => p !== null);
    const existing = session.data.generation?.finanzplan;
    const plan: Finanzplan = {
      posten: cleanedPosten,
      hinweise: Array.isArray(hinweise) && hinweise.length > 0 ? hinweise : existing?.hinweise,
      generiertAm: existing?.generiertAm ?? new Date().toISOString(),
    };

    const newData = {
      ...session.data,
      generation: {
        ...(session.data.generation ?? {}),
        finanzplan: plan,
      },
    };

    const updated = await updateWizardSession(sessionToken, newData);
    const programm = programme.find((p) => p.id === updated.foerderprogrammId);
    const richtlinie = programm ? await loadRichtlinie(programm.id) : null;
    const validation = updated.data.generation?.finanzplan
      ? validateFinanzplan(updated.data.generation.finanzplan, richtlinie)
      : null;
    const autofixes = updated.data.generation?.finanzplan
      ? computeAutofixes({
          posten: updated.data.generation.finanzplan.posten,
          richtlinie,
        }).map(toMeta)
      : [];
    return NextResponse.json({
      sessionToken: updated.sessionToken,
      finanzplan: updated.data.generation?.finanzplan ?? null,
      validation,
      autofixes,
    });
  } catch (err) {
    console.error("[wizard/finanzplan] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
