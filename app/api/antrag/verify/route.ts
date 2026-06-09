export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  consumeMagicLink,
  signIdentity,
  identityConfigured,
  IDENTITY_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
} from "@/lib/wizard/identity";
import { trustedAppUrl } from "@/lib/app-url";

/**
 * Magic-Link-Einlösung: Token aus der E-Mail prüfen, Identity-Cookie setzen und
 * auf „Meine Anträge" weiterleiten. GET, weil aus einem E-Mail-Link aufgerufen.
 *
 * Das Redirect-Ziel kommt aus der vertrauenswürdigen öffentlichen Basis-URL
 * (trustedAppUrl) — NICHT aus req.url, das hinter dem Reverse-Proxy auf den
 * internen Container-Host (0.0.0.0:3000) zeigen würde.
 */
function redirectToMeine(req: NextRequest, suffix: string): NextResponse {
  const base = trustedAppUrl();
  if (base) {
    return NextResponse.redirect(`${base}/antrag/meine${suffix}`);
  }
  // Fallback ohne Config: relatives Location (Browser löst gegen den echten Host auf).
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/antrag/meine${suffix}` },
  });
}

export async function GET(req: NextRequest) {
  if (!identityConfigured()) {
    return redirectToMeine(req, "?error=config");
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return redirectToMeine(req, "?error=link");
  }

  const result = await consumeMagicLink(token).catch(() => null);
  if (!result) {
    // Abgelaufen, schon benutzt oder unbekannt.
    return redirectToMeine(req, "?error=link");
  }

  const res = redirectToMeine(req, "?verified=1");
  res.cookies.set(IDENTITY_COOKIE, signIdentity(result.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
