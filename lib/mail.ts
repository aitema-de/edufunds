/**
 * Zentraler Resend-Mailversand.
 *
 * WICHTIG: Das Resend-SDK WIRFT bei API-Fehlern (z. B. nicht autorisierter
 * Absender-Domain) NICHT — es liefert `{ data, error }`. Frühere Aufrufer prüften
 * nur auf geworfene Exceptions und verschluckten so 4xx-Fehler still (Mails kamen
 * nie an, ohne Log). Dieser Helper prüft `error` und loggt ihn.
 *
 * Best-effort: wirft nicht, liefert true/false. RESEND_API_KEY + FROM_EMAIL werden
 * zur LAUFZEIT gelesen (nicht beim Modul-Load), damit Env-Änderungen ohne Rebuild
 * greifen und Tests sie setzen können.
 */
import { Resend } from "resend";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

function fromEmail(): string {
  return process.env.FROM_EMAIL ?? "EduFunds <noreply@aitema.de>";
}

export async function sendMail(input: SendMailInput, ctx = "mail"): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[${ctx}] RESEND_API_KEY fehlt — keine Mail an ${input.to} versendet.`);
    return false;
  }
  try {
    const res = await new Resend(key).emails.send({
      from: fromEmail(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (res.error) {
      console.error(
        `[${ctx}] Resend-Fehler an ${input.to}: ${res.error.name ?? ""} — ${res.error.message ?? res.error}`
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[${ctx}] Mailversand warf (${input.to}):`, e instanceof Error ? e.message : e);
    return false;
  }
}
