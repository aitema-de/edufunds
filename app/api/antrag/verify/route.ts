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
 * Magic-Link-Einlösung.
 *
 * WICHTIG (Scanner-Schutz): E-Mail-Sicherheitsdienste (Microsoft Safe Links,
 * Mimecast, …) rufen Links in E-Mails VORAB per GET ab, um sie zu scannen. Würde
 * der GET den Single-Use-Token einlösen, wäre er verbraucht, bevor der Mensch
 * klickt („Link bereits benutzt"). Deshalb: GET zeigt nur eine Bestätigungsseite,
 * eingelöst wird erst per POST (menschlicher Button-Klick).
 *
 * Redirect-Ziel kommt aus trustedAppUrl (öffentlicher Host), `next` nur lokale
 * Pfade (sanitizeNext → kein Open-Redirect).
 */
function redirectTo(target: string, flag: string, status = 307): NextResponse {
  const base = trustedAppUrl();
  const path = `${target}?${flag}`;
  if (base) {
    return NextResponse.redirect(`${base}${path}`, status);
  }
  return new NextResponse(null, { status, headers: { Location: path } });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confirmPage(token: string, next: string): string {
  const t = escapeHtml(token);
  const n = escapeHtml(next);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Anmeldung bestätigen — EduFunds</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#faf7f0;color:#1e3b2a;margin:0;
       display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid rgba(10,22,40,.1);border-radius:16px;padding:32px;
        max-width:420px;text-align:center;box-shadow:0 8px 24px rgba(10,22,40,.06)}
  h1{font-size:22px;margin:0 0 8px}
  p{color:#6b6457;font-size:15px;line-height:1.5;margin:0 0 24px}
  button{background:#1e3b2a;color:#f5efe0;font-weight:bold;font-size:16px;border:0;
         border-radius:10px;padding:14px 28px;cursor:pointer}
</style></head>
<body>
  <div class="card">
    <h1>Anmeldung bestätigen</h1>
    <p>Klicken Sie auf den Button, um sich anzumelden und Ihre Anträge bzw. Kontingente zu sehen.</p>
    <form method="post" action="/api/antrag/verify">
      <input type="hidden" name="token" value="${t}">
      <input type="hidden" name="next" value="${n}">
      <button type="submit">Jetzt anmelden</button>
    </form>
  </div>
</body></html>`;
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

  // Token NICHT hier einlösen (Scanner-Schutz) — Bestätigungsseite zeigen.
  return new NextResponse(confirmPage(token, target), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("token")?.toString() ?? null;
  const target = sanitizeNext(form?.get("next")?.toString() ?? null) ?? DEFAULT_TARGET;

  if (!identityConfigured()) {
    return redirectTo(target, "error=config", 303);
  }
  if (!token) {
    return redirectTo(target, "error=link", 303);
  }

  const result = await consumeMagicLink(token).catch(() => null);
  if (!result) {
    return redirectTo(target, "error=link", 303);
  }

  // 303 See Other: Browser folgt dem Redirect per GET (nicht erneut POST).
  const res = redirectTo(target, "verified=1", 303);
  res.cookies.set(IDENTITY_COOKIE, signIdentity(result.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
