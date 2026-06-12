/**
 * Gemeinsame Versandlogik für den Newsletter.
 *
 * Rendert pro Abonnent eine personalisierte Ausgabe (mit individuellem
 * Abmelde-Token + List-Unsubscribe-Header) und versendet sie gebatcht über
 * Resend. Wird sowohl vom Freigabe-Versand (Admin) als auch ggf. von Skripten
 * genutzt.
 *
 * Die externen Abhängigkeiten (Subscriber-Quelle, Mailversand) sind injizierbar
 * (`deps`), damit die Batching-/Fehlerlogik ohne DB und ohne echten Mailversand
 * unit-getestet werden kann.
 */

import { Resend } from 'resend';
import { getConfirmedNewsletterEntries, generateToken } from '@/lib/db';
import { generateNewsletter, type NewsletterData } from '@/lib/newsletter';

export interface DispatchSubscriber {
  email: string;
  unsubscribe_token: string;
}

export interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

export interface DispatchStats {
  total: number;
  successful: number;
  failed: number;
}

export interface DispatchOutcome {
  stats: DispatchStats;
  results: SendResult[];
}

export interface DispatchOptions {
  subject?: string;
  test?: boolean;
  testEmails?: string[];
  baseUrl?: string;
  batchSize?: number;
  /** Pause zwischen Batches in ms (Resend-Rate-Limit-Schonung). */
  batchDelayMs?: number;
}

export interface DispatchDeps {
  getSubscribers: () => Promise<DispatchSubscriber[]>;
  sendEmail: (params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo: string;
    headers: Record<string, string>;
  }) => Promise<{ ok: boolean; id?: string; error?: string }>;
}

function defaultDeps(): DispatchDeps {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return {
    getSubscribers: async () => {
      const entries = await getConfirmedNewsletterEntries();
      return entries.map((e) => ({
        email: e.email,
        unsubscribe_token: e.unsubscribe_token,
      }));
    },
    sendEmail: async (params) => {
      const { data, error } = await resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        headers: params.headers,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id };
    },
  };
}

export async function sendNewsletter(
  data: NewsletterData,
  opts: DispatchOptions = {},
  deps: DispatchDeps = defaultDeps()
): Promise<DispatchOutcome> {
  const baseUrl = (
    opts.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://edufunds.org'
  ).replace(/\/$/, '');
  const from = process.env.FROM_EMAIL || 'EduFunds <newsletter@edufunds.org>';
  const replyTo = process.env.ADMIN_EMAIL || 'office@aitema.de';
  const batchSize = opts.batchSize ?? 10;
  const batchDelayMs = opts.batchDelayMs ?? 1000;

  let subscribers: DispatchSubscriber[];
  if (opts.test && opts.testEmails && opts.testEmails.length > 0) {
    subscribers = opts.testEmails.map((email) => ({
      email,
      unsubscribe_token: generateToken(32),
    }));
  } else {
    subscribers = await deps.getSubscribers();
  }

  if (subscribers.length === 0) {
    return { stats: { total: 0, successful: 0, failed: 0 }, results: [] };
  }

  const results: SendResult[] = [];

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (sub): Promise<SendResult> => {
        try {
          const { html, text, subject } = generateNewsletter(
            data,
            baseUrl,
            sub.unsubscribe_token
          );
          const res = await deps.sendEmail({
            from,
            to: sub.email,
            subject: opts.subject || subject,
            html,
            text,
            replyTo,
            headers: {
              'List-Unsubscribe': `<${baseUrl}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}>`,
              Precedence: 'bulk',
            },
          });
          if (!res.ok) {
            return { email: sub.email, success: false, error: res.error };
          }
          return { email: sub.email, success: true };
        } catch (err) {
          return {
            email: sub.email,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );
    results.push(...batchResults);

    if (i + batchSize < subscribers.length && batchDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  const successful = results.filter((r) => r.success).length;
  return {
    stats: { total: subscribers.length, successful, failed: results.length - successful },
    results,
  };
}
