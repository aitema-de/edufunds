/**
 * Mailtext fuer den Magic-Link (B4). Wird sowohl beim Opt-in im Wizard
 * (bind-email) als auch bei „Anträge geräteübergreifend abrufen" (magic-link)
 * versendet. UTF-8 / deutsche Rechtschreibung.
 */
export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMagicLinkEmail(verifyUrl: string): MailContent {
  const subject = 'EduFunds — dein Link zu „Meine Anträge"';

  const text = [
    `Hallo,`,
    ``,
    `mit diesem Link öffnest du deine Anträge geräteübergreifend:`,
    verifyUrl,
    ``,
    `Der Link ist 30 Minuten gültig und kann einmal verwendet werden.`,
    `Falls du das nicht angefordert hast, ignoriere diese E-Mail einfach.`,
    ``,
    `EduFunds`,
  ].join("\n");

  const safeUrl = escapeHtml(verifyUrl);
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e3b2a;max-width:520px;margin:0 auto;line-height:1.5">
    <h2 style="color:#1e3b2a">Deine Anträge öffnen</h2>
    <p>Mit diesem Link siehst du deine begonnenen und fertigen Anträge auf jedem Gerät.</p>
    <p style="margin:24px 0">
      <a href="${safeUrl}"
         style="display:inline-block;background:#1e3b2a;color:#f5efe0;font-weight:bold;
                text-decoration:none;padding:12px 22px;border-radius:10px">
        Meine Anträge öffnen
      </a>
    </p>
    <p style="font-size:13px;color:#6b6457">
      Der Link ist 30 Minuten gültig und nur einmal verwendbar. Falls du das nicht
      angefordert hast, kannst du diese E-Mail ignorieren.
    </p>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all">${safeUrl}</p>
  </div>`;

  return { subject, html, text };
}
