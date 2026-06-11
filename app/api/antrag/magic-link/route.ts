export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMagicLink } from "@/lib/wizard/identity";
import { buildMagicLinkEmail } from "@/lib/wizard/identity-mail";
import { trustedAppUrl, sanitizeNext } from "@/lib/app-url";
import { sendMail } from "@/lib/mail";

const bodySchema = z.object({
  email: z.string().trim().email("Gültige E-Mail-Adresse erforderlich").max(200),
  next: z.string().optional(), // lokales Redirect-Ziel nach dem Klick (z. B. Käufer-Dashboard)
  website: z.string().optional(), // Honeypot (muss leer sein)
  timestamp: z.number().optional(), // Ladezeit (>= 3s vor Absenden)
});

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
    const { email, next, website, timestamp } = parsed.data;

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

    // Link-Basis NUR aus vertrauenswürdiger Server-Config (kein Host-Header) —
    // fail-safe gegen Host-Header-Injection / Token-Diebstahl.
    const base = trustedAppUrl();
    if (base) {
      const token = await createMagicLink(email);
      const safeNext = sanitizeNext(next);
      const verifyUrl =
        `${base}/api/antrag/verify?token=${token}` +
        (safeNext ? `&next=${encodeURIComponent(safeNext)}` : "");
      const mail = buildMagicLinkEmail(verifyUrl);
      await sendMail(
        { to: email, subject: mail.subject, html: mail.html, text: mail.text },
        "antrag/magic-link"
      );
    } else {
      console.warn("[api/antrag/magic-link] NEXT_PUBLIC_APP_URL fehlt — kein Magic-Link versendet.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/antrag/magic-link] Fehler:", err);
    // Auch im Fehlerfall neutral antworten (keine Enumeration).
    return NextResponse.json({ ok: true });
  }
}
