export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyIdentity, identityConfigured, IDENTITY_COOKIE } from "@/lib/wizard/identity";
import { listBuyerCodes } from "@/lib/payments/buyer";

/**
 * Käufer-Dashboard (B5): liefert die an die verifizierte E-Mail gebundenen
 * Kontingent-Codes inkl. Verbrauch und Einlösungen. Identität wie B4
 * (Identity-Cookie aus Magic-Link). Ohne gültigen Cookie -> 401.
 */
export async function GET(req: NextRequest) {
  if (!identityConfigured()) {
    return NextResponse.json(
      { error: "Funktion nicht konfiguriert" },
      { status: 503 }
    );
  }

  const cookie = req.cookies.get(IDENTITY_COOKIE)?.value;
  const identity = verifyIdentity(cookie);
  if (!identity) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const codes = await listBuyerCodes(identity.email);
    return NextResponse.json({ email: identity.email, codes });
  } catch (err) {
    console.error("[api/kontingent/dashboard] Fehler:", err);
    return NextResponse.json(
      { error: "Übersicht konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}
