import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, logSuspiciousActivity } from '@/lib/rate-limit';
import { logSecretStatusOnce } from '@/lib/secret-check';

// Mapping von alten/falschen URLs zu korrekten IDs
const REDIRECT_MAP: Record<string, string> = {
  'digitalpakt-2': 'bmbf-digitalpakt-2',
  'startchancen': 'bmbf-startchancen',
  // Weitere Mappings hier hinzufügen
};

// Statische Security-Headers (ohne CSP — die ist per-Request mit Nonce, s. u.).
const SECURITY_HEADERS = {
  // Verhindert Clickjacking
  'X-Frame-Options': 'DENY',
  // Verhindert MIME-Type Sniffing
  'X-Content-Type-Options': 'nosniff',
  // XSS-Schutz (Legacy, aber hilfreich für alte Browser)
  'X-XSS-Protection': '1; mode=block',
  // HTTPS erzwingen
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Referrer-Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions-Policy (Feature-Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

/** Kryptografisch zufälliger Nonce (Base64) für die per-Request-CSP. Edge-Runtime:
 *  Web-Crypto ist verfügbar, Buffer NICHT → getRandomValues + btoa. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Nonce-basierte CSP (Go-Live-Härtung). KONSERVATIV:
 *  - script-src: 'unsafe-inline'/'unsafe-eval' RAUS, stattdessen 'nonce-…'. 'self'
 *    bleibt (gleicher-Origin-Chunks); KEIN 'strict-dynamic' (weniger Third-Party-
 *    Bruchrisiko). googletagmanager für GA. object-src 'none', worker-src blob:
 *    (html2pdf/html2canvas).
 *  - style-src: 'unsafe-inline' BLEIBT (Next/Tailwind injizieren Inline-Styles;
 *    Style-XSS ist deutlich weniger gefährlich) — bewusst konservativ.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://www.googletagmanager.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ') + ';';
}

export function middleware(request: NextRequest) {
  // Go-Live-Härtung: fehlende kritische Secrets einmalig laut loggen (nur prod).
  logSecretStatusOnce();

  const pathname = request.nextUrl.pathname;

  // Per-Request-Nonce + CSP einmal berechnen (für alle Response-Zweige).
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const applyStaticHeaders = (response: NextResponse) => {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };

  // 1. Rate-Limiting für API-Routen
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = rateLimit(request);

    if (!rateLimitResult.allowed) {
      logSuspiciousActivity(request, 'Rate-Limit überschritten');
      if (rateLimitResult.response) {
        return rateLimitResult.response;
      }
    }
  }

  // 2. URL-Redirects für alte Programm-IDs
  const match = pathname.match(/^\/foerderprogramme\/(.+)$/);
  if (match) {
    const correctId = REDIRECT_MAP[match[1]];
    if (correctId) {
      const newUrl = new URL(`/foerderprogramme/${correctId}`, request.url);
      return applyStaticHeaders(NextResponse.redirect(newUrl, 301));
    }
  }

  // 3. Standard-Response: Nonce + CSP auch in die REQUEST-Header schreiben, damit
  //    Next die eigenen (Hydration-/next-script-)Script-Tags automatisch mit dem
  //    Nonce versieht. x-nonce reicht die Server-Komponente (layout) für das
  //    manuelle JSON-LD-Script durch.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyStaticHeaders(response);
}

export const config = {
  matcher: [
    // Förderprogramm-Redirects
    '/foerderprogramme/:path*',
    // API-Routen für Rate-Limiting
    '/api/:path*',
    // Alle anderen Routen für Security-Headers
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
