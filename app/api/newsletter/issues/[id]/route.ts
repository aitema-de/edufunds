/**
 * Admin-API: einzelne Newsletter-Ausgabe.
 *
 *   GET   /api/newsletter/issues/:id   → Ausgabe + gerenderte HTML-Vorschau
 *   PATCH /api/newsletter/issues/:id   → Inhalt/Betreff bearbeiten
 *
 * Ein Edit setzt eine freigegebene Ausgabe zurück auf 'draft' (Re-Freigabe nötig).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getIssueById, updateIssueData } from '@/lib/newsletter/issues';
import { newsletterDataSchema } from '@/lib/newsletter/schema';
import { generateNewsletter } from '@/lib/newsletter';
import { publicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const id = parseId((await ctx.params).id);
  if (id === null) {
    return NextResponse.json({ success: false, message: 'Ungültige ID' }, { status: 400 });
  }

  const issue = await getIssueById(id);
  if (!issue) {
    return NextResponse.json({ success: false, message: 'Nicht gefunden' }, { status: 404 });
  }

  const baseUrl = publicAppUrl();
  let preview: { html: string; subject: string } | null = null;
  try {
    const rendered = generateNewsletter(issue.data, baseUrl, 'preview-token');
    preview = { html: rendered.html, subject: rendered.subject };
  } catch (err) {
    console.error('[api/newsletter/issues/:id] Render-Fehler:', err);
  }

  return NextResponse.json({ success: true, issue, preview });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const id = parseId((await ctx.params).id);
  if (id === null) {
    return NextResponse.json({ success: false, message: 'Ungültige ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Ungültiges JSON' }, { status: 400 });
  }

  const { data, subject } = (body ?? {}) as {
    data?: unknown;
    subject?: string | null;
  };

  const parsed = newsletterDataSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Ungültige Newsletter-Daten', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updated = await updateIssueData(id, parsed.data, subject ?? undefined);
  if (!updated) {
    return NextResponse.json(
      { success: false, message: 'Ausgabe nicht editierbar (bereits versendet?) oder nicht gefunden' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, issue: updated });
}
