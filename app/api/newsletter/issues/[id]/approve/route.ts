/**
 * Admin-API: Newsletter-Ausgabe freigeben.
 *
 *   POST /api/newsletter/issues/:id/approve
 *
 * Setzt status 'draft' → 'approved'. Erst danach ist der Live-Versand möglich.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { approveIssue } from '@/lib/newsletter/issues';

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

  const approvedBy =
    (auth.admin.email as string | undefined) ||
    (auth.admin.sub as string | undefined) ||
    'admin';

  const issue = await approveIssue(id, approvedBy);
  if (!issue) {
    return NextResponse.json(
      { success: false, message: 'Nur Entwürfe können freigegeben werden (oder nicht gefunden)' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, issue });
}
