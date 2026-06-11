import { NextRequest, NextResponse } from "next/server";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";

/**
 * Produktvision 2026-06-10 — #4: Text-Vorschläge interaktiv.
 *
 * Die vom Assistenten ergänzten Formulierungen (factVerification.vorschlaege)
 * sind im Antragstext (finalText) verankert. Der Nutzer kann sie bestätigen
 * (Vorschlag aus der Liste nehmen, Text bleibt), bearbeiten (Formulierung im
 * finalText ersetzen) oder entfernen (aus finalText streichen). Der Client
 * besitzt die Bearbeitung und schickt — analog zur Finanzplan-Route — die
 * vollständigen neuen Werte; der Server sanitized + persistiert sie atomar.
 */

const MAX_TEXT_LEN = 200_000;
const MAX_VORSCHLAEGE = 100;

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, finalText, vorschlaege } = (await req.json()) as {
      sessionToken?: string;
      finalText?: unknown;
      vorschlaege?: unknown;
    };
    if (!sessionToken) {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    if (finalText === undefined && vorschlaege === undefined) {
      return NextResponse.json(
        { error: "finalText und/oder vorschlaege erforderlich" },
        { status: 400 }
      );
    }

    const session = await getWizardSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    const generation = session.data.generation;
    if (!generation) {
      return NextResponse.json({ error: "Kein Antrag in dieser Session" }, { status: 409 });
    }

    // finalText sanitisieren
    let newFinalText = generation.finalText;
    if (finalText !== undefined) {
      if (typeof finalText !== "string" || finalText.length > MAX_TEXT_LEN) {
        return NextResponse.json({ error: "finalText ungültig" }, { status: 400 });
      }
      newFinalText = finalText;
    }

    // vorschlaege sanitisieren (nur nicht-leere Strings, gedeckelt)
    let newVorschlaege = generation.factVerification?.vorschlaege;
    if (vorschlaege !== undefined) {
      if (!Array.isArray(vorschlaege) || vorschlaege.length > MAX_VORSCHLAEGE) {
        return NextResponse.json({ error: "vorschlaege ungültig" }, { status: 400 });
      }
      newVorschlaege = vorschlaege
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }

    const newData = {
      ...session.data,
      generation: {
        ...generation,
        finalText: newFinalText,
        factVerification: generation.factVerification
          ? { ...generation.factVerification, vorschlaege: newVorschlaege ?? [] }
          : generation.factVerification,
      },
    };

    const updated = await updateWizardSession(sessionToken, newData);
    return NextResponse.json({
      sessionToken: updated.sessionToken,
      finalText: updated.data.generation?.finalText ?? "",
      vorschlaege: updated.data.generation?.factVerification?.vorschlaege ?? [],
    });
  } catch (err) {
    console.error("[wizard/textvorschlag] Fehler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unbekannter Fehler" },
      { status: 500 }
    );
  }
}
