export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  consumeMagicLink,
  signIdentity,
  identityConfigured,
  IDENTITY_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
} from "@/lib/wizard/identity";

/**
 * Magic-Link-Einlösung: Token aus der E-Mail prüfen, Identity-Cookie setzen und
 * auf „Meine Anträge" weiterleiten. GET, weil aus einem E-Mail-Link aufgerufen.
 */
export async function GET(req: NextRequest) {
  const meine = (suffix: string) => new URL(`/antrag/meine${suffix}`, req.url);

  if (!identityConfigured()) {
    return NextResponse.redirect(meine("?error=config"));
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(meine("?error=link"));
  }

  const result = await consumeMagicLink(token).catch(() => null);
  if (!result) {
    // Abgelaufen, schon benutzt oder unbekannt.
    return NextResponse.redirect(meine("?error=link"));
  }

  const res = NextResponse.redirect(meine("?verified=1"));
  res.cookies.set(IDENTITY_COOKIE, signIdentity(result.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
