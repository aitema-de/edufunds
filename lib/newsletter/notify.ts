/**
 * Admin-Benachrichtigung, wenn ein neuer Newsletter-Entwurf bereitsteht.
 *
 * - Sendet eine E-Mail an die Admin-Adresse (funktioniert serverseitig im
 *   Container über Resend).
 * - Liefert zusätzlich einen kompakten Telegram-Text + Review-Link zurück, den
 *   der Cron-Wrapper (scripts/newsletter-cron.sh) per `notify-kolja` verschickt
 *   (das Bridge-Binary lebt in Koljas Umgebung, nicht im Container).
 */

import { sendMail } from '@/lib/mail';
import type { NewsletterIssue } from './issues';

export interface DraftNotification {
  reviewUrl: string;
  telegramMessage: string;
  emailSent: boolean;
}

export async function notifyDraftReady(
  issue: NewsletterIssue,
  opts: { baseUrl?: string } = {}
): Promise<DraftNotification> {
  const baseUrl = (
    opts.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://app.edufunds.org'
  ).replace(/\/$/, '');
  const reviewUrl = `${baseUrl}/admin/newsletter?issue=${issue.id}`;
  const lead = issue.data.leadTitle;
  const programCount = issue.data.programs.length;

  const telegramMessage =
    `📰 Neuer EduFunds-Newsletter-Entwurf bereit zur Freigabe\n\n` +
    `${issue.issueNumber}: „${lead}"\n` +
    `${programCount} Förderprogramme · Tipp · Insight · ${issue.data.newsItems.length} News\n\n` +
    `Prüfen & freigeben: ${reviewUrl}`;

  const adminEmail = process.env.ADMIN_EMAIL || 'office@aitema.de';
  const html =
    `<p>Ein neuer Newsletter-Entwurf wurde automatisch erstellt und wartet auf deine Freigabe.</p>` +
    `<p><strong>${escapeHtml(issue.issueNumber)}: ${escapeHtml(lead)}</strong><br>` +
    `${programCount} Förderprogramme · Praxis-Tipp · Insight · ${issue.data.newsItems.length} Kurzmeldungen</p>` +
    `<p><a href="${reviewUrl}">Im Admin-Bereich prüfen, bearbeiten und freigeben →</a></p>` +
    `<p style="color:#888;font-size:12px">Es wird nichts versendet, bevor du freigibst.</p>`;
  const text =
    `Neuer Newsletter-Entwurf bereit zur Freigabe.\n\n` +
    `${issue.issueNumber}: ${lead}\n` +
    `${programCount} Förderprogramme · Praxis-Tipp · Insight · ${issue.data.newsItems.length} News\n\n` +
    `Prüfen & freigeben: ${reviewUrl}\n\nEs wird nichts versendet, bevor du freigibst.`;

  const emailSent = await sendMail(
    {
      to: adminEmail,
      subject: `📰 Newsletter-Entwurf bereit: ${issue.issueNumber}`,
      html,
      text,
    },
    'newsletter-notify'
  );

  return { reviewUrl, telegramMessage, emailSent };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
