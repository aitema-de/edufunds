export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { bindAuthorEmail, createMagicLink } from "@/lib/wizard/identity";
import { buildMagicLinkEmail } from "@/lib/wizard/identity-mail";
import { trustedAppUrl } from "@/lib/app-url";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "EduFunds <noreply@aitema.de>";

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
    const resendApiKey = process.env.RESEND_API_KEY;
    const base = trustedAppUrl();
    if (resendApiKey && base) {
      try {
        const token = await createMagicLink(email);
        const verifyUrl = `${base}/api/antrag/verify?token=${token}`;
        const mail = buildMagicLinkEmail(verifyUrl);
        await new Resend(resendApiKey).emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      } catch (mailErr) {
        console.error("[api/antrag/bind-email] Mailversand fehlgeschlagen:", mailErr);
      }
    } else {
      console.warn(
        "[api/antrag/bind-email] RESEND_API_KEY oder NEXT_PUBLIC_APP_URL fehlt — kein Magic-Link versendet."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/antrag/bind-email] Fehler:", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
