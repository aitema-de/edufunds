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
 * - KI-Generierung: 5 Requests / Stunde pro IP
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
  // KI-Generierung (teuer)
  ai: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 5,
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
  if (pathname.includes('/api/generate-antrag') || pathname.includes('/api/assistant/generate')) {
    return 'ai';
  }
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

  // Bestimme Rate-Limit-Typ
  const limitType = getRateLimitType(pathname);
  const config = RATE_LIMITS[limitType];

  // Erstelle eindeutigen Identifier (IP + Route-Typ)
  const clientIP = getClientIP(request);
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
  type: 'auth' | 'ai' | 'newsletter' | 'default' = 'default'
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
