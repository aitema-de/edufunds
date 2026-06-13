export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin Login API
 * 
 * POST /api/admin/login
 * 
 * Body: { email: string; password: string }
 * Response: { success: boolean; token?: string; message?: string }
 * 
 * Setzt auch HTTP-only Cookie für Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAdminCredentials, 
  createAdminToken, 
  setAdminSession 
} from '@/lib/admin-auth';
import { getCorsHeaders, isOriginAllowed } from '@/lib/cors';

// Rate Limiting für Login
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; waitMinutes: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 Minuten
  const maxAttempts = 5;
  
  const entry = loginAttempts.get(ip);
  
  if (!entry || now > entry.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, waitMinutes: 0 };
  }
  
  if (entry.count >= maxAttempts) {
    const waitMinutes = Math.ceil((entry.resetTime - now) / 60000);
    return { allowed: false, waitMinutes };
  }
  
  entry.count++;
  return { allowed: true, waitMinutes: 0 };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIP || 'unknown';
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // CORS Check
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { success: false, message: 'Origin nicht erlaubt' },
      { status: 403, headers: getCorsHeaders(origin) }
    );
  }
  
  // Rate Limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        success: false, 
        message: `Zu viele Login-Versuche. Bitte warten Sie ${rateLimit.waitMinutes} Minuten.` 
      },
      { status: 429, headers: getCorsHeaders(origin) }
    );
  }
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validierung
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-Mail und Passwort erforderlich' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }
    
    // Credentials prüfen
    const admin = await verifyAdminCredentials(email, password);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Ungültige Anmeldedaten' },
        { status: 401, headers: getCorsHeaders(origin) }
      );
    }
    
    // JWT Token erstellen
    const token = await createAdminToken(admin);
    
    // Cookie setzen
    await setAdminSession(token);
    
    // Login-Versuche zurücksetzen
    loginAttempts.delete(clientIP);
    
    console.log(`[Admin Login] Erfolgreich: ${email} von ${clientIP}`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Login erfolgreich',
        token, // Für API-Clients
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        }
      },
      { 
        status: 200, 
        headers: getCorsHeaders(origin) 
      }
    );
    
  } catch (error) {
    console.error('[Admin Login] Fehler:', error);
    return NextResponse.json(
      { success: false, message: 'Interner Serverfehler' },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}
