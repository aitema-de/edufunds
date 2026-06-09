import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, logSuspiciousActivity } from '@/lib/rate-limit';

// Mapping von alten/falschen URLs zu korrekten IDs
const REDIRECT_MAP: Record<string, string> = {
  'digitalpakt-2': 'bmbf-digitalpakt-2',
  'startchancen': 'bmbf-startchancen',
  // Weitere Mappings hier hinzufügen
};

// Security Headers
const SECURITY_HEADERS = {
  // Verhindert Clickjacking
  'X-Frame-Options': 'DENY',
  // Verhindert MIME-Type Sniffing
  'X-Content-Type-Options': 'nosniff',
  // XSS-Schutz (Legacy, aber hilfreich für alte Browser)
  'X-XSS-Protection': '1; mode=block',
  // HTTPS erzwingen
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Content Security Policy (mit Google Fonts für DM Serif Display + Plus Jakarta Sans)
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.google-analytics.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  // Referrer-Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions-Policy (Feature-Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 1. Rate-Limiting für API-Routen
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = rateLimit(request);
    
    if (!rateLimitResult.allowed) {
      // Logge verdächtige Aktivität
      logSuspiciousActivity(request, 'Rate-Limit überschritten');
      
      // Gebe Rate-Limit-Response zurück
      if (rateLimitResult.response) {
        return rateLimitResult.response;
      }
    }
  }
  
  // 2. URL-Redirects für alte Programm-IDs
  const match = pathname.match(/^\/foerderprogramme\/(.+)$/);
  if (match) {
    const programmId = match[1];
    const correctId = REDIRECT_MAP[programmId];
    
    if (correctId) {
      // Redirect zur korrekten URL
      const newUrl = new URL(`/foerderprogramme/${correctId}`, request.url);
      const response = NextResponse.redirect(newUrl, 301);
      
      // Füge Security-Headers hinzu
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
  }
  
  // 3. Standard-Response mit Security-Headers
  const response = NextResponse.next();
  
  // Füge Security-Headers zu allen Responses hinzu
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
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
