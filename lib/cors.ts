/**
 * Zentrale CORS-Konfiguration für EduFunds API
 * 
 * SECURITY: Strikte CORS-Policy für Production
 * - Erlaubt nur edufunds.org und Subdomains
 * - Keine Wildcards in Production
 */

// Erlaubte Origins basierend auf Umgebung
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';
  
  // Production: Strikte Domain-Liste
  const productionOrigins = [
    'https://edufunds.org',
    'https://www.edufunds.org',
    'https://app.edufunds.org',
  ];
  
  // Additional origins from env (comma-separated)
  const additionalOrigins = process.env.ALLOWED_ORIGINS
    ?.split(',')
    .map(o => o.trim())
    .filter(Boolean) || [];
  
  // Development: Lokale Entwicklung
  const developmentOrigins = [
    'http://localhost:3000',
    'http://localhost:3101',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3101',
  ];
  
  if (env === 'production') {
    return [...productionOrigins, ...additionalOrigins];
  }
  
  // Development: Beide Listen erlauben
  return [...developmentOrigins, ...productionOrigins, ...additionalOrigins];
};

// Prüfe ob Origin erlaubt ist
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Exakte Übereinstimmung
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Subdomain-Matching für edufunds.org
  if (origin.endsWith('.edufunds.org') || 
      origin.endsWith('.edufunds.de')) {
    return true;
  }
  
  return false;
}

// CORS Headers für API-Routen
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'https://edufunds.org';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://edufunds.org',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 Stunden
    'Vary': 'Origin',
  };
}

// Preflight Options Response
export function getCorsPreflightResponse(request: Request): Response {
  const origin = request.headers.get('origin');
  
  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Legacy: CORS Headers Objekt (für einfache Verwendung)
// DEPRECATED: Use getCorsHeaders() with request origin
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://edufunds.org' 
    : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
