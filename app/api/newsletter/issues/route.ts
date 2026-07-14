/**
 * Admin-API: Newsletter-Ausgaben.
 *
 *   GET  /api/newsletter/issues   → Liste aller Ausgaben + Abonnentenzahl
 *   POST /api/newsletter/issues   → manuell einen neuen Entwurf erzeugen
 *
 * Beide erfordern Admin-Login (Cookie-JWT, siehe lib/admin-auth.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { countNewsletterEntries } from '@/lib/db';
import { generateNewsletterDraft } from '@/lib/newsletter/generate-draft';
import {
  createIssue,
  getNextIssueNumber,
  getRecentProgramIds,
  hasSentIssue,
  listIssues,
} from '@/lib/newsletter/issues';
import { publicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const [issues, confirmedSubscribers] = await Promise.all([
      listIssues(50),
      countNewsletterEntries(true),
    ]);
    return NextResponse.json({ success: true, issues, confirmedSubscribers });
  } catch (err) {
    console.error('[api/newsletter/issues] GET Fehler:', err);
    return NextResponse.json(
      { success: false, message: 'Konnte Ausgaben nicht laden' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const baseUrl = publicAppUrl();
    const now = new Date();
    const [excludeProgramIds, issueNumber, alreadySent] = await Promise.all([
      getRecentProgramIds(3),
      getNextIssueNumber(),
      hasSentIssue(),
    ]);

    const draft = await generateNewsletterDraft({
      now,
      issueNumber,
      excludeProgramIds,
      baseUrl,
      // Erstausgabe (Kickoff), solange noch nichts versendet wurde.
      isKickoff: !alreadySent,
    });

    const issue = await createIssue({
      issueNumber: draft.data.issueNumber,
      data: draft.data,
      generatedBy: 'manual',
      llmProvider: draft.provider,
      programIds: draft.programIds,
    });

    return NextResponse.json({ success: true, issue });
  } catch (err) {
    console.error('[api/newsletter/issues] POST Fehler:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Entwurf konnte nicht erzeugt werden',
      },
      { status: 500 }
    );
  }
}
