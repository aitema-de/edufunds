export const dynamic = 'force-dynamic';

/**
 * Admin Logout API
 * 
 * POST /api/admin/logout
 * 
 * Löscht das Session-Cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession, getAdminFromRequest } from '@/lib/admin-auth';
import { getCorsHeaders, isOriginAllowed } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Aktuellen Admin ermitteln für Logging
  const admin = await getAdminFromRequest(request);
  
  // Session löschen
  await clearAdminSession();
  
  if (admin) {
    console.log(`[Admin Logout] Erfolgreich: ${admin.email}`);
  }
  
  return NextResponse.json(
    { success: true, message: 'Logout erfolgreich' },
    { status: 200, headers: getCorsHeaders(origin) }
  );
}
