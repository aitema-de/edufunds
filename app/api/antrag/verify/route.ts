export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  consumeMagicLink,
  signIdentity,
  identityConfigured,
  IDENTITY_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
} from "@/lib/wizard/identity";
import { trustedAppUrl, sanitizeNext } from "@/lib/app-url";

const DEFAULT_TARGET = "/antrag/meine";

/**
 * Magic-Link-Einlösung: Token aus der E-Mail prüfen, Identity-Cookie setzen und
 * auf ein lokales Ziel weiterleiten (default „Meine Anträge", per ?next= z. B.
 * das Käufer-Dashboard). GET, weil aus einem E-Mail-Link aufgerufen.
 *
 * Das Redirect-Ziel kommt aus der vertrauenswürdigen öffentlichen Basis-URL
 * (trustedAppUrl) — NICHT aus req.url, das hinter dem Reverse-Proxy auf den
 * internen Container-Host (0.0.0.0:3000) zeigen würde. `next` ist auf lokale
 * Pfade beschränkt (sanitizeNext) → kein Open-Redirect.
 */
function redirectTo(target: string, flag: string): NextResponse {
  const base = trustedAppUrl();
  const path = `${target}?${flag}`;
  if (base) {
    return NextResponse.redirect(`${base}${path}`);
  }
  // Fallback ohne Config: relatives Location (Browser löst gegen den echten Host auf).
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET(req: NextRequest) {
  const target = sanitizeNext(req.nextUrl.searchParams.get("next")) ?? DEFAULT_TARGET;

  if (!identityConfigured()) {
    return redirectTo(target, "error=config");
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return redirectTo(target, "error=link");
  }

  const result = await consumeMagicLink(token).catch(() => null);
  if (!result) {
    // Abgelaufen, schon benutzt oder unbekannt.
    return redirectTo(target, "error=link");
  }

  const res = redirectTo(target, "verified=1");
  res.cookies.set(IDENTITY_COOKIE, signIdentity(result.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
