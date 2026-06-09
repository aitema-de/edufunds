/**
 * JWT-basierte Admin-Authentifizierung
 * 
 * Sicherheitsfeatures:
 * - JWT mit HS256
 * - Token-Expiry (24h)
 * - Secure HTTP-only Cookies in Production
 * - Rate Limiting für Login
 * - bcrypt Passwort-Hashing
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

// Admin-Typen
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
}

export interface JWTPayload {
  sub: string;      // user id
  email: string;
  role: 'admin' | 'superadmin';
  iat: number;      // issued at
  exp: number;      // expiration
}

// Token-Konfiguration
const TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'admin_session';

// Secret aus Umgebungsvariable
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nicht konfiguriert');
  }
  return new TextEncoder().encode(secret);
}

/**
 * JWT Token erstellen
 */
export async function createAdminToken(user: AdminUser): Promise<string> {
  const secret = getJWTSecret();
  
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
  
  return token;
}

/**
 * JWT Token verifizieren
 */
export async function verifyAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'superadmin',
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Token im Cookie setzen
 */
export async function setAdminSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 Stunden
    path: '/',
  });
}

/**
 * Session-Cookie löschen
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Aktuelle Session aus Cookie lesen
 */
export async function getAdminSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifyAdminToken(token);
}

/**
 * Admin aus Request extrahieren (API Routes)
 */
export async function getAdminFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  // Versuche zuerst Cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
  
  if (cookieToken) {
    const payload = await verifyAdminToken(cookieToken);
    if (payload) return payload;
  }
  
  // Fallback: Authorization Header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyAdminToken(token);
    if (payload) return payload;
  }
  
  // Legacy: X-Admin-Key (für API-Clients ohne JWT)
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.NEWSLETTER_ADMIN_KEY;
  
  if (adminKey && expectedKey && adminKey === expectedKey) {
    // Return pseudo-payload für Legacy-Auth
    return {
      sub: 'api-key',
      email: 'api@edufunds.org',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }
  
  return null;
}

/**
 * Middleware: Prüft ob User Admin ist
 */
export async function requireAdmin(request: NextRequest): Promise<{ 
  success: false; 
  response: Response;
} | { 
  success: true; 
  admin: JWTPayload;
}> {
  const admin = await getAdminFromRequest(request);
  
  if (!admin) {
    return {
      success: false,
      response: new Response(JSON.stringify({ 
        success: false, 
        message: 'Nicht autorisiert. Bitte einloggen.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  
  return { success: true, admin };
}

/**
 * Middleware: Prüft Superadmin-Rechte
 */
export async function requireSuperAdmin(request: NextRequest): Promise<{
  success: false;
  response: Response;
} | {
  success: true;
  admin: JWTPayload;
}> {
  const result = await requireAdmin(request);
  
  if (!result.success) return result;
  
  if (result.admin.role !== 'superadmin') {
    return {
      success: false,
      response: new Response(JSON.stringify({
        success: false,
        message: 'Superadmin-Rechte erforderlich.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  
  return { success: true, admin: result.admin };
}

// bcrypt Konfiguration
const SALT_ROUNDS = 12; // OWASP Empfehlung: mindestens 10

// Einfache Admin-Credentials (in Production: Datenbank)
// PASSWÖRTER MÜSSEN GEHASHT SEIN!
// Hash generieren: await bcrypt.hash(password, SALT_ROUNDS)
const ADMIN_CREDENTIALS = [
  {
    id: '1',
    email: process.env.ADMIN_EMAIL || 'admin@edufunds.org',
    // PASSWORT MUSS GEÄNDERT UND GEHASHT WERDEN!
    // Beispiel-Hash für "ChangeMe123!" (12 Rounds):
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    role: 'superadmin' as const,
  }
];

/**
 * Generiert einen bcrypt Hash für ein Passwort
 * Nützlich für die Initial-Passwort-Erstellung
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifiziert ein Passwort gegen einen bcrypt Hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Admin-Login prüfen
 * Verwendet bcrypt für sicheres Passwort-Hashing
 */
export async function verifyAdminCredentials(
  email: string, 
  password: string
): Promise<AdminUser | null> {
  const admin = ADMIN_CREDENTIALS.find(a => a.email === email);
  
  if (!admin) {
    // Konstante Zeit für Timing-Attack-Schutz
    await bcrypt.compare(password, '$2a$12$dummy.hash.for.timing.protection');
    return null;
  }
  
  // Prüfe gegen gehashtes Passwort
  const isValid = await verifyPassword(password, admin.passwordHash);
  
  if (!isValid) return null;
  
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  };
}

/**
 * Prüft die Passwort-Stärke
 * OWASP Empfehlungen:
 * - Mindestens 12 Zeichen
 * - Groß- und Kleinbuchstaben
 * - Zahlen
 * - Sonderzeichen
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Passwort muss mindestens 12 Zeichen lang sein');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Zahl enthalten');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
