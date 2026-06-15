/**
 * Globale Rate-Limiting Middleware für Next.js
 * 
 * Schützt alle API-Routen vor:
 * - Brute-Force Angriffen
 * - DDoS-Angriffen
 * - API-Abusus
 * 
 * Konfiguration:
 * - Allgemeine API: 100 Requests / 15 Minuten pro IP
 * - Auth-Endpunkte: 10 Requests / 15 Minuten pro IP
 * - Wizard-Interview: 60 Requests / Stunde pro IP (Frage-Antwort-Cycles)
 * - KI-Generierung: 5 Requests / Stunde pro IP (volle Pipeline-Laeufe, teuer)
 *
 * Dev-Bypass: localhost wird im NODE_ENV=development nicht limitiert,
 * damit UAT-Sessions nicht blockiert werden.
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate Limit Konfiguration
interface RateLimitConfig {
  windowMs: number;      // Zeitfenster in Millisekunden
  maxRequests: number;   // Maximale Requests im Zeitfenster
  skipSuccessfulRequests?: boolean; // Erfolgreiche Requests nicht zählen
}

// Konfiguration pro Route-Typ
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Standard-API-Endpunkte
  default: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 100,
  },
  // Authentifizierungs-Endpunkte
  auth: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 10,
  },
  // KI-Pipeline-Generierung (sehr teuer — 1 Aufruf = ~9 LLM-Calls)
  ai: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 5,
  },
  // Wizard-Interview-Endpoints (start, answer, edit-answer, generate-question, ...)
  // Realistischer Antrag: 12 Frage-Antwort-Cycles + Edits + ggf. Reload — daher 60/h
  wizard: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 60,
  },
  // Newsletter (kostenlos, aber Spam-Gefahr)
  newsletter: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 5,
  },
};

// Speicher für Rate-Limit-Daten (in Production: Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
  timestamps: number[]; // Für Sliding Window
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup-Interval (alle 5 Minuten)
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Extrahiert die Client-IP aus dem Request
 */
function getClientIP(request: NextRequest): string {
  // Versuche zuerst X-Forwarded-For (hinter Proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Dann X-Real-IP
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Bestimmt den Rate-Limit-Typ basierend auf der URL
 */
function getRateLimitType(pathname: string): string {
  if (pathname.includes('/api/admin/login') || pathname.includes('/api/auth')) {
    return 'auth';
  }
  // Pipeline-Generierung VOR der allgemeinen /api/wizard/-Klausel pruefen,
  // damit /api/wizard/generate als 'ai' (5/h, teuer) gilt, nicht als 'wizard' (60/h).
  if (pathname.includes('/api/assistant/generate') || pathname.includes('/api/wizard/generate')) {
    return 'ai';
  }
  if (pathname.includes('/api/wizard/')) {
    return 'wizard';
  }
  // Admin-Newsletter-Routen (cookie-auth) NICHT mit dem öffentlichen Spam-Limit
  // (5/h) belegen — sonst blockiert normale Admin-Nutzung (Liste/Öffnen/Freigabe/
  // Versand) sofort. Diese Routen sind durch requireAdmin geschützt.
  if (
    pathname.includes('/api/newsletter/issues') ||
    pathname.includes('/api/newsletter/send') ||
    pathname.includes('/api/newsletter/preview')
  ) {
    return 'default';
  }
  // Öffentliche An-/Abmeldung: strenges Anti-Spam-Limit.
  if (pathname.includes('/api/newsletter')) {
    return 'newsletter';
  }
  return 'default';
}

/**
 * Prüft ob das Rate-Limit überschritten wurde
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Neue Zeitfenster
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      timestamps: [now],
    };
    rateLimitStore.set(identifier, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Prüfe Limit
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Inkrementiere Counter
  entry.count++;
  entry.timestamps.push(now);
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Haupt-Rate-Limiting Funktion für Middleware
 */
export function rateLimit(request: NextRequest): {
  allowed: boolean;
  response?: NextResponse;
  headers?: Record<string, string>;
} {
  // Nur API-Routen schützen
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) {
    return { allowed: true };
  }

  // Health-Check von Rate-Limiting ausschließen
  if (pathname === '/api/health') {
    return { allowed: true };
  }

  // Pilot-Freischaltung (Dev-Mock, kostenlos, kein echtes Geld) nicht limitieren.
  // Sonst blockiert intensives UAT-Testen den Unlock-Button mit 429. Die Route
  // ist ohnehin durch NEXT_PUBLIC_PAYWALL_DEV_MOCK==="1" + 403 abgesichert.
  if (pathname === '/api/wizard/checkout/dev-mock') {
    return { allowed: true };
  }

  // Bestimme Rate-Limit-Typ
  const limitType = getRateLimitType(pathname);
  const baseConfig = RATE_LIMITS[limitType];
  // Pilot/UAT (Dev-Mock aktiv): grosszuegigere Limits (x10), damit intensives
  // Testen nicht staendig in 429 laeuft (Freischalten, Resume-Link, viele
  // Wizard-Calls). Ohne die Flag gelten wieder die strikten Produktions-Limits.
  const pilotMode = process.env.NEXT_PUBLIC_PAYWALL_DEV_MOCK === '1';
  const config = pilotMode
    ? { ...baseConfig, maxRequests: baseConfig.maxRequests * 10 }
    : baseConfig;

  // Erstelle eindeutigen Identifier (IP + Route-Typ)
  const clientIP = getClientIP(request);

  // Dev-Bypass: Localhost-Requests in development nicht limitieren — UAT-Sessions
  // wuerden sonst dauernd in das Wizard- oder AI-Limit laufen. In Production
  // laeuft alles hinter Reverse-Proxy mit echter Client-IP, der Bypass greift dort
  // nicht (NODE_ENV=production + Header gesetzt).
  if (
    process.env.NODE_ENV === 'development' &&
    (clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'unknown')
  ) {
    return { allowed: true };
  }

  const identifier = `${clientIP}:${limitType}`;

  // Prüfe Rate-Limit
  const result = checkRateLimit(identifier, config);

  // Headers für Rate-Limit-Info
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };

  if (!result.allowed) {
    // Rate-Limit überschritten
    const retryAfter = result.retryAfter || 60;
    headers['Retry-After'] = String(retryAfter);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
        retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );

    return { allowed: false, response, headers };
  }

  return { allowed: true, headers };
}

/**
 * Rate-Limiting für spezifische Endpunkte (in API-Routen verwenden)
 */
export async function checkEndpointRateLimit(
  request: NextRequest,
  type: 'auth' | 'ai' | 'wizard' | 'newsletter' | 'default' = 'default'
): Promise<{
  allowed: boolean;
  response?: NextResponse;
}> {
  const config = RATE_LIMITS[type];
  const clientIP = getClientIP(request);
  const identifier = `${clientIP}:${type}`;

  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: `Zu viele Anfragen. Bitte warten Sie ${Math.ceil((result.retryAfter || 60) / 60)} Minuten.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter || 60),
          },
        }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Logging für verdächtige Aktivitäten
 */
export function logSuspiciousActivity(
  request: NextRequest,
  reason: string
): void {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const pathname = request.nextUrl.pathname;

  console.warn('[SECURITY] Verdächtige Aktivität erkannt:', {
    ip: clientIP,
    path: pathname,
    reason,
    userAgent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Prüft Redis-Verfügbarkeit (für Health Checks)
 */
export async function isRedisAvailable(): Promise<boolean> {
  // Aktuell nur In-Memory Speicher verwendet
  // In Produktion: Redis-Verbindung prüfen
  return false;
}

/**
 * Gibt Rate-Limit-Status zurück (für Health Checks)
 */
export function getRateLimitStatus(): {
  storeSize: number;
  redisAvailable: boolean;
} {
  return {
    storeSize: rateLimitStore.size,
    redisAvailable: false,
  };
}

export default rateLimit;
