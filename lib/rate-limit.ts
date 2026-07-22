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
  // Passagen-Reformulierung (P4-A): 1 LLM-Call pro Aufruf, deutlich billiger als
  // die Voll-Pipeline ('ai'), aber teurer als reine Interview-Cycles. Eigener
  // moderater Bucket, damit On-Demand-Umformulierungen das Interview-Budget
  // (wizard 200/h) nicht aufzehren und Missbrauch gedeckelt bleibt.
  reformulieren: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 40,
  },
  // KI-Pipeline-Generierung (sehr teuer — 1 Aufruf = ~9 LLM-Calls)
  ai: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 5,
  },
  // Wizard-Interview-Endpoints (start, answer, edit-answer, readiness, [token]-Reload, ...)
  // Ein gruendlicher Antrag erzeugt VIELE Calls: ~12 Frage-Antwort-Cycles, je mit
  // readiness-Check + Session-Reload (/api/wizard/[token]), plus Edits/Textvorschlaege.
  // 60/h war zu knapp (loeste 429 schon WAEHREND eines normalen Antrags aus, sobald
  // der Pilot-x10-Bonus weg ist) -> 200/h. Missbrauch (>200 Wizard-Calls/h pro IP)
  // wird weiter geblockt; der Bezahl-Klick liegt ohnehin im separaten 'checkout'-Bucket.
  wizard: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 200,
  },
  // Checkout/Bezahlung: bewusst NICHT im strengen wizard-Bucket — der Bezahl-Klick
  // darf NIE durch vorherige Interview-Aktivitaet (429) blockiert werden, sonst
  // verliert man die Conversion am teuersten Punkt. Erzeugt nur eine Stripe-Session.
  checkout: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 30,
  },
  // Newsletter (kostenlos, aber Spam-Gefahr)
  newsletter: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 5,
  },
  // Web-Vitals-Telemetrie (/api/vitals): EIGENER Bucket, damit Telemetrie NIE
  // das default-Budget funktionaler Routen derselben IP aufzehrt. Genau das ist
  // am 22.07.2026 auf Prod passiert: Ein Observer-Leak im Client hat >2.500
  // Vitals-POSTs in 29 Minuten geschickt, das default-Limit (100/15min) der IP
  // ausgeschoepft und damit /api/match + /api/antrag/list blockiert („KI
  // ueberlastet"). Der Client ist gefixt (Beacon nur noch beim Seiten-Verlassen),
  // der getrennte Bucket ist die Verteidigung in der Tiefe.
  vitals: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 60,
  },
  // Kauf auf Rechnung (/api/wizard/invoice, /api/kontingent/order): schaltet die
  // Leistung SOFORT frei, bevor Geld geflossen ist — beim Kontingent bis 459,90 EUR.
  // Der einzige Schutz war bisher ein Honeypot + 3-Sekunden-Timer und der
  // 'default'-Bucket (100/15min): damit haette ein Skript am Tag hunderte
  // Gratis-Kontingente ziehen koennen. Bewusst streng — ein echter Kunde bestellt
  // nicht dreimal pro Tag auf Rechnung. Greift zusaetzlich zur Begrenzung offener
  // unbezahlter Bestellungen pro E-Mail (siehe countOpenInvoiceOrders).
  invoice: {
    windowMs: 24 * 60 * 60 * 1000, // 24 Stunden
    maxRequests: 3,
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
/** Private/lokale Adressbereiche — das sind unsere eigenen Proxys, nie ein Client. */
function isPrivateIP(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || // 172.16.0.0/12 — Docker-Netze
    /^127\./.test(ip) ||
    ip === '::1' ||
    /^f[cd]/i.test(ip) || // fc00::/7 (ULA)
    /^fe80:/i.test(ip)
  );
}

/**
 * Extrahiert die Client-IP aus dem Request.
 *
 * ⚠️ NIE den ERSTEN X-Forwarded-For-Eintrag nehmen. Der stammt vom Client und ist
 * frei erfindbar — unser Traefik laeuft mit `forwardedHeaders.insecure=true`,
 * uebernimmt also einen mitgeschickten Header und haengt die echte Peer-IP nur an.
 * Wer `X-Forwarded-For: 1.2.3.4` schickt, bekommt sonst fuer jede erfundene IP ein
 * frisches Rate-Limit-Budget — und damit waeren Login-Bruteforce-Schutz, das
 * KI-Kostenlimit und die Missbrauchsbremse beim Rechnungskauf allesamt wirkungslos.
 *
 * Richtig ist der Eintrag, den die aeusserste vertrauenswuerdige Instanz angehaengt
 * hat: also von RECHTS lesen und private Adressen ueberspringen. Das deckt beide
 * Konstellationen ab — direkt hinter Traefik (nach Go-Live) und mit der
 * Wartungs-nginx davor (Coming-Soon-Phase), die eine weitere interne IP anhaengt.
 */
// Nimmt bewusst nur das, was gebraucht wird (Header-Lesezugriff), statt NextRequest.
// NextRequest erfuellt das strukturell — aber so ist die Funktion ohne Next-Runtime
// testbar, und genau diese Funktion MUSS Tests haben (siehe Kommentar oben).
export function getClientIP(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    // Von rechts nach links: die erste oeffentliche Adresse ist der echte Client.
    for (let i = chain.length - 1; i >= 0; i--) {
      if (!isPrivateIP(chain[i])) return chain[i];
    }
    // Nur private Adressen (lokale Entwicklung, Health-Checks aus dem Docker-Netz):
    // den letzten Eintrag nehmen — nie den ersten, der bleibt client-kontrolliert.
    if (chain.length > 0) return chain[chain.length - 1];
  }

  // X-Real-IP setzt unsere nginx selbst ($remote_addr) — vertrauenswuerdiger als
  // ein durchgereichter XFF, aber ebenfalls nur, wenn er von uns stammt.
  const realIP = request.headers.get('x-real-ip')?.trim();
  if (realIP) return realIP;

  return 'unknown';
}

/**
 * Bestimmt den Rate-Limit-Typ basierend auf der URL
 */
function getRateLimitType(pathname: string): string {
  if (pathname.includes('/api/admin/login') || pathname.includes('/api/auth')) {
    return 'auth';
  }
  // Telemetrie strikt vom Rest isolieren (s. Kommentar am 'vitals'-Bucket).
  if (pathname === '/api/vitals') {
    return 'vitals';
  }
  // Rechnungskauf VOR allen /api/wizard/-Klauseln: schaltet ohne Zahlung frei und
  // braucht deshalb das strengste Limit (3/24h), nicht das grosszuegige 'wizard'.
  if (
    pathname.includes('/api/wizard/invoice') ||
    pathname.includes('/api/kontingent/order')
  ) {
    return 'invoice';
  }
  // Pipeline-Generierung VOR der allgemeinen /api/wizard/-Klausel pruefen,
  // damit /api/wizard/generate als 'ai' (5/h, teuer) gilt, nicht als 'wizard'.
  if (pathname.includes('/api/wizard/generate')) {
    return 'ai';
  }
  // Checkout VOR der allgemeinen /api/wizard/-Klausel: eigener großzügiger Bucket,
  // damit der Bezahl-Klick nie am ausgeschoepften Interview-Limit scheitert.
  if (pathname.includes('/api/wizard/checkout')) {
    return 'checkout';
  }
  // Reformulierung VOR der generischen /api/wizard/-Klausel: eigener LLM-Bucket,
  // damit Umformier-Calls nicht das Interview-Limit (wizard) belasten.
  if (pathname.includes('/api/wizard/reformulieren')) {
    return 'reformulieren';
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
