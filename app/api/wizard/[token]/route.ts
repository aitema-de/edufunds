import { NextRequest, NextResponse } from "next/server";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";
import { loadRichtlinie } from "@/lib/wizard/richtlinien-loader";
import type { WizardFacts } from "@/lib/wizard/types";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "token fehlt" }, { status: 400 });
  }
  const session = await getWizardSession(token);
  if (!session) {
    return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
  }
  // 86cabdzwk: Dokumentlabel fuer Clients ohne Server-Kontext (CheckoutSuccess).
  const richtlinie = await loadRichtlinie(session.foerderprogrammId).catch(() => null);
  return NextResponse.json({
    sessionToken: session.sessionToken,
    foerderprogrammId: session.foerderprogrammId,
    foerderprogrammName: session.foerderprogrammName,
    dokumentLabel: richtlinie?.dokumentLabel ?? null,
    dokumentLabelGenus: richtlinie?.dokumentLabelGenus ?? null,
    phase: session.data.phase,
    messages: session.data.messages,
    facts: session.data.facts,
    interviewer: session.data.interviewer,
    generation: session.data.generation ?? null,
    costs: session.data.costs ?? null,
    status: session.status,
    paidToken: session.paidToken ?? null,
    paidAt: session.paidAt ?? null,
    tier: session.tier ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}

/**
 * Direktes Korrigieren eines einzelnen extrahierten Fakts (Befund 15 — echte
 * Inline-Editierbarkeit der Fakten-Kacheln). Bearbeitet NUR bereits vorhandene
 * Fakten (kein Anlegen neuer Felder) und coerct den Wert anhand des aktuellen
 * Typs (Zahl/Array/Text). Loest KEINEN LLM-Lauf aus — reine Nutzer-Korrektur.
 *
 * Hinweis: Eine spaetere Interview-Antwort kann den Fakt theoretisch erneut
 * extrahieren/ueberschreiben; der primaere Einsatz ist die finale Korrektur in
 * der "ready_to_generate"-Phase direkt vor dem Schreiben.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "token fehlt" }, { status: 400 });
  }

  let body: { section?: string; key?: string; value?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "ungueltiger Body" }, { status: 400 });
  }
  const { section, key, value } = body;
  if (!section || !key || typeof section !== "string" || typeof key !== "string") {
    return NextResponse.json(
      { error: "section und key (string) erforderlich" },
      { status: 400 }
    );
  }
  // DoS-Schutz: Fakt-Werte sind kurze Korrekturen, keine Freitext-Massen.
  if (typeof value === "string" && value.length > 4000) {
    return NextResponse.json(
      { error: "Wert ist zu lang (max. 4.000 Zeichen)." },
      { status: 400 }
    );
  }

  const session = await getWizardSession(token);
  if (!session) {
    return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
  }

  // Nach Generierung/Bezahlung ist eine Fakt-Korrektur wirkungslos -> sperren,
  // damit kein fertiger Antrag und seine Fakten auseinanderlaufen.
  if (session.paidToken || session.data.phase === "complete" || session.data.phase === "generating") {
    return NextResponse.json(
      { error: "Fakten koennen nach dem Schreiben des Antrags nicht mehr geaendert werden." },
      { status: 409 }
    );
  }

  const facts: WizardFacts = { ...(session.data.facts ?? {}) };
  const sec = facts[section];
  if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
    return NextResponse.json({ error: "Unbekannter Abschnitt" }, { status: 400 });
  }
  const secObj = sec as Record<string, unknown>;
  if (!(key in secObj)) {
    return NextResponse.json({ error: "Unbekanntes Feld" }, { status: 400 });
  }

  const current = secObj[key];
  let coerced: unknown;
  if (typeof current === "number") {
    // Deutsche Eingaben tolerieren: "12.500" / "12 500" / "12.500,5"
    const cleaned = String(value ?? "")
      .replace(/\./g, "")
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, "");
    const n = Number(cleaned);
    if (cleaned === "" || !Number.isFinite(n)) {
      return NextResponse.json({ error: "Bitte eine Zahl eingeben." }, { status: 400 });
    }
    coerced = n;
  } else if (Array.isArray(current)) {
    coerced = String(value ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    coerced = String(value ?? "").trim();
  }

  const newFacts: WizardFacts = {
    ...facts,
    [section]: { ...secObj, [key]: coerced },
  };

  const updated = await updateWizardSession(token, {
    ...session.data,
    facts: newFacts,
  });

  return NextResponse.json({ facts: updated.data.facts });
}
