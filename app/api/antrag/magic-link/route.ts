export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createMagicLink } from "@/lib/wizard/identity";
import { buildMagicLinkEmail } from "@/lib/wizard/identity-mail";

const FROM_EMAIL = process.env.FROM_EMAIL ?? "EduFunds <noreply@aitema.de>";

const bodySchema = z.object({
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich").max(200),
  website: z.string().optional(), // Honeypot (muss leer sein)
  timestamp: z.number().optional(), // Ladezeit (>= 3s vor Absenden)
});

function appUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    `${new URL(req.url).protocol}//${req.headers.get("host")}`
  );
}

/**
 * „Anträge geräteübergreifend abrufen": verschickt einen Magic-Link an die
 * angegebene E-Mail. Antwortet IMMER mit { ok: true } (keine Auskunft, ob zu
 * der Adresse Anträge existieren — verhindert E-Mail-Enumeration).
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
    const { email, website, timestamp } = parsed.data;

    // Honeypot: gefuelltes verstecktes Feld -> stiller Erfolg (Bot abweisen).
    if (website && website.trim() !== "") {
      return NextResponse.json({ ok: true });
    }
    if (typeof timestamp === "number" && Date.now() - timestamp < 3000) {
      return NextResponse.json(
        { error: "Bitte einen Moment warten und erneut senden." },
        { status: 429 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const token = await createMagicLink(email);
        const verifyUrl = `${appUrl(req)}/api/antrag/verify?token=${token}`;
        const mail = buildMagicLinkEmail(verifyUrl);
        await new Resend(resendApiKey).emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      } catch (mailErr) {
        console.error("[api/antrag/magic-link] Mailversand fehlgeschlagen:", mailErr);
      }
    } else {
      console.warn("[api/antrag/magic-link] RESEND_API_KEY fehlt — kein Magic-Link versendet.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/antrag/magic-link] Fehler:", err);
    // Auch im Fehlerfall neutral antworten (keine Enumeration).
    return NextResponse.json({ ok: true });
  }
}
