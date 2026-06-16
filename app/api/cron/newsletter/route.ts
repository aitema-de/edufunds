/**
 * Cron-Endpoint: monatlicher Newsletter-Entwurf.
 *
 * Wird von einem externen Scheduler aufgerufen (z.B. scripts/newsletter-cron.sh
 * im Crontab am 1. des Monats). Erzeugt einen Entwurf, persistiert ihn als
 * 'draft' und benachrichtigt den Admin. Es wird NICHTS automatisch versendet —
 * der Versand erfordert manuelle Freigabe im Admin-Bereich.
 *
 * Geschützt über `CRON_SECRET` (Header `x-cron-key` oder `Authorization: Bearer`).
 * Idempotent pro Kalendermonat: ein zweiter Aufruf im selben Monat liefert den
 * bestehenden Entwurf zurück, statt einen weiteren zu erzeugen.
 *
 *   POST /api/cron/newsletter            → Entwurf erzeugen + benachrichtigen
 *   POST /api/cron/newsletter?dryRun=1   → nur generieren, nichts speichern
 *   GET  /api/cron/newsletter?dryRun=1   → bequemer Dry-Run-Check
 */

import { NextResponse } from 'next/server';
import { secureEquals } from '@/lib/secure-compare';
import { generateNewsletterDraft } from '@/lib/newsletter/generate-draft';
import {
  createIssue,
  getCronIssueForMonth,
  getNextIssueNumber,
  getRecentProgramIds,
  hasSentIssue,
} from '@/lib/newsletter/issues';
import { notifyDraftReady } from '@/lib/newsletter/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerKey = request.headers.get('x-cron-key');
  const auth = request.headers.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : undefined;
  return secureEquals(headerKey, secret) || secureEquals(bearer, secret);
}

async function handle(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/newsletter] CRON_SECRET nicht konfiguriert');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  const now = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edufunds.org';

  try {
    // Idempotenz: pro Monat nur ein Cron-Entwurf.
    if (!dryRun) {
      const existing = await getCronIssueForMonth(now);
      if (existing) {
        console.log(
          `[cron/newsletter] Entwurf für diesen Monat existiert bereits (#${existing.id})`
        );
        return NextResponse.json({ skipped: true, reason: 'already_exists', issue: existing });
      }
    }

    const excludeProgramIds = dryRun ? [] : await getRecentProgramIds(3);
    const issueNumber = dryRun ? 0 : await getNextIssueNumber();
    // Erstausgabe (Kickoff mit Gründungsgeschichte), solange nichts versendet wurde.
    const alreadySent = await hasSentIssue();

    const draft = await generateNewsletterDraft({
      now,
      issueNumber: issueNumber || 1,
      excludeProgramIds,
      baseUrl,
      isKickoff: !alreadySent,
    });

    if (dryRun) {
      return NextResponse.json({ dryRun: true, data: draft.data, programIds: draft.programIds });
    }

    const issue = await createIssue({
      issueNumber: draft.data.issueNumber,
      data: draft.data,
      generatedBy: 'cron',
      llmProvider: draft.provider,
      programIds: draft.programIds,
    });

    const notification = await notifyDraftReady(issue, { baseUrl });
    console.log(
      `[cron/newsletter] Entwurf #${issue.id} erstellt (${draft.provider}), ` +
        `Admin-Mail=${notification.emailSent}`
    );

    return NextResponse.json({
      success: true,
      issueId: issue.id,
      issueNumber: issue.issueNumber,
      notification,
    });
  } catch (err) {
    console.error('[cron/newsletter] Fehler:', err);
    return NextResponse.json(
      { error: 'generation_failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
