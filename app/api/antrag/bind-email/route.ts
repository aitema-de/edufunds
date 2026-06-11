export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bindAuthorEmail, createMagicLink } from "@/lib/wizard/identity";
import { buildMagicLinkEmail } from "@/lib/wizard/identity-mail";
import { trustedAppUrl } from "@/lib/app-url";
import { sendMail } from "@/lib/mail";

const bodySchema = z.object({
  sessionToken: z.string().min(8, "sessionToken erforderlich"),
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich").max(200),
});

/**
 * Opt-in im Wizard: bindet den aktuellen Antrag an die E-Mail des Autors und
 * schickt einen Magic-Link, mit dem die Anträge geräteübergreifend abrufbar sind.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Eingaben unvollständig" },
        { status: 400 }
      );
    }
    const { sessionToken, email } = parsed.data;

    const bound = await bindAuthorEmail(sessionToken, email);
    if (!bound) {
      return NextResponse.json({ error: "Antrag nicht gefunden" }, { status: 404 });
    }

    // Magic-Link senden (best-effort — Bindung ist bereits persistiert).
    // Die Link-Basis kommt NUR aus vertrauenswürdiger Server-Config (kein
    // Host-Header) — sonst kein Versand (fail-safe gegen Host-Header-Injection).
    const base = trustedAppUrl();
    if (base) {
      const token = await createMagicLink(email);
      const verifyUrl = `${base}/api/antrag/verify?token=${token}`;
      const mail = buildMagicLinkEmail(verifyUrl);
      await sendMail(
        { to: email, subject: mail.subject, html: mail.html, text: mail.text },
        "antrag/bind-email"
      );
    } else {
      console.warn("[api/antrag/bind-email] NEXT_PUBLIC_APP_URL fehlt — kein Magic-Link versendet.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/antrag/bind-email] Fehler:", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
