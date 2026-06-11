export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  verifyIdentity,
  listSessionsByEmail,
  identityConfigured,
  IDENTITY_COOKIE,
} from "@/lib/wizard/identity";

/**
 * Geräteübergreifende Antragsliste: liest die verifizierte E-Mail aus dem
 * Identity-Cookie (per Magic-Link gesetzt) und liefert die an sie gebundenen
 * Anträge. Ohne gültigen Cookie -> 401.
 */
export async function GET(req: NextRequest) {
  if (!identityConfigured()) {
    return NextResponse.json(
      { error: "Identitäts-Funktion nicht konfiguriert" },
      { status: 503 }
    );
  }

  const cookie = req.cookies.get(IDENTITY_COOKIE)?.value;
  const identity = verifyIdentity(cookie);
  if (!identity) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const sessions = await listSessionsByEmail(identity.email);
    return NextResponse.json({ email: identity.email, sessions });
  } catch (err) {
    console.error("[api/antrag/list] Fehler:", err);
    return NextResponse.json({ error: "Liste konnte nicht geladen werden" }, { status: 500 });
  }
}
