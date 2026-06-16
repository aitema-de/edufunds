export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWizardSession, tryMarkSessionPaid } from "@/lib/wizard/session";
import {
  normalizeCode,
  consumeCredit,
  refundCredit,
  logRedemption,
} from "@/lib/wizard/credit-codes";

/**
 * Loest einen Kontingent-Code fuer eine Wizard-Session ein und schaltet sie frei
 * (ohne eigene Zahlung der Lehrkraft). Reihenfolge:
 *  1. Session pruefen (existiert? bereits bezahlt?)
 *  2. Credit ATOMAR verbrauchen (kein Ueberziehen)
 *  3. Session freischalten (race-sicher); falls bereits anderweitig bezahlt -> Credit erstatten
 *  4. Einloesung protokollieren
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sessionToken?: string;
      code?: string;
    };

    if (!body.sessionToken || typeof body.sessionToken !== "string") {
      return NextResponse.json({ error: "sessionToken erforderlich" }, { status: 400 });
    }
    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "code erforderlich" }, { status: 400 });
    }

    const session = await getWizardSession(body.sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    // Idempotent: bereits freigeschaltet -> kein erneuter Verbrauch.
    if (session.paidToken) {
      return NextResponse.json({ alreadyPaid: true, paidToken: session.paidToken });
    }

    const code = normalizeCode(body.code);
    const consumed = await consumeCredit(code);
    if (!consumed.ok) {
      const map: Record<typeof consumed.reason, { status: number; message: string }> = {
        unknown: { status: 404, message: "Code unbekannt. Bitte Eingabe prüfen." },
        expired: { status: 410, message: "Dieser Kontingent-Code ist abgelaufen." },
        exhausted: {
          status: 409,
          message: "Das Kontingent ist aufgebraucht. Bitte beim Träger nachfragen.",
        },
      };
      const r = map[consumed.reason];
      return NextResponse.json({ error: r.message, reason: consumed.reason }, { status: r.status });
    }

    const { session: paid, didSet } = await tryMarkSessionPaid(body.sessionToken, {
      source: "code",
      tier: "kontingent",
      creditCode: code,
    });

    if (!didSet) {
      // Zwischenzeitlich anderweitig bezahlt -> Credit erstatten, bestehenden Token liefern.
      await refundCredit(code);
      return NextResponse.json({ alreadyPaid: true, paidToken: paid.paidToken });
    }

    await logRedemption(code, body.sessionToken, paid.paidToken!);

    return NextResponse.json({
      paidToken: paid.paidToken,
      creditsRemaining: consumed.creditsRemaining,
    });
  } catch (err) {
    console.error("[api/wizard/redeem-code] Fehler:", err);
    return NextResponse.json({ error: "Einlösung fehlgeschlagen" }, { status: 500 });
  }
}
