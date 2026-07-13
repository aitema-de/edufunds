/**
 * Admin-API: freigegebene Newsletter-Ausgabe versenden.
 *
 *   POST /api/newsletter/issues/:id/send
 *   Body: { test?: boolean; testEmails?: string[] }
 *
 * - Testversand (test=true): sendet an testEmails, ändert den Status NICHT.
 * - Live-Versand: nur bei status='approved'. Setzt atomar 'sending' (verhindert
 *   Doppelversand), versendet an alle bestätigten Abonnenten und markiert
 *   anschließend 'sent' (mit Statistik) bzw. 'failed'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getIssueById,
  markFailed,
  markSending,
  markSent,
} from '@/lib/newsletter/issues';
import { sendNewsletter } from '@/lib/newsletter/dispatch';
import { publicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ success: false, message: 'Ungültige ID' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'RESEND_API_KEY nicht konfiguriert' },
      { status: 503 }
    );
  }

  let body: { test?: boolean; testEmails?: string[] } = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    /* leerer Body = Live-Versand */
  }
  const isTest = body.test === true;
  const baseUrl = publicAppUrl();

  const issue = await getIssueById(id);
  if (!issue) {
    return NextResponse.json({ success: false, message: 'Nicht gefunden' }, { status: 404 });
  }

  // --- Testversand: kein Statuswechsel ---
  if (isTest) {
    const testEmails = (body.testEmails ?? []).filter((e) => typeof e === 'string' && e.includes('@'));
    if (testEmails.length === 0) {
      return NextResponse.json(
        { success: false, message: 'testEmails erforderlich für Testversand' },
        { status: 400 }
      );
    }
    const outcome = await sendNewsletter(
      issue.data,
      { subject: issue.subject ?? undefined, test: true, testEmails, baseUrl },
    );
    const ok = outcome.stats.successful > 0;
    const firstError = outcome.results.find((r) => !r.success)?.error;
    return NextResponse.json(
      { success: ok, test: true, stats: outcome.stats, error: ok ? undefined : firstError },
      { status: ok ? 200 : 502 }
    );
  }

  // --- Live-Versand: nur freigegeben, atomarer Übergang nach 'sending' ---
  const claimed = await markSending(id);
  if (!claimed) {
    return NextResponse.json(
      {
        success: false,
        message:
          issue.status === 'sent'
            ? 'Diese Ausgabe wurde bereits versendet.'
            : issue.status === 'sending'
              ? 'Versand läuft bereits.'
              : 'Ausgabe muss erst freigegeben werden.',
        status: issue.status,
      },
      { status: 409 }
    );
  }

  try {
    const outcome = await sendNewsletter(
      claimed.data,
      { subject: claimed.subject ?? undefined, baseUrl },
    );

    if (outcome.stats.total > 0 && outcome.stats.successful === 0) {
      await markFailed(id);
      return NextResponse.json(
        { success: false, message: 'Versand fehlgeschlagen (0 erfolgreich)', stats: outcome.stats },
        { status: 502 }
      );
    }

    const sent = await markSent(id, outcome.stats);
    return NextResponse.json({ success: true, stats: outcome.stats, issue: sent });
  } catch (err) {
    await markFailed(id);
    console.error('[api/newsletter/issues/:id/send] Fehler:', err);
    return NextResponse.json(
      { success: false, message: 'Versandfehler' },
      { status: 500 }
    );
  }
}
