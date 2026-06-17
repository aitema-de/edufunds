import { MetadataRoute } from 'next';

// Laufzeit-dynamisch, damit die Entscheidung indexierbar/nicht-indexierbar aus der
// Container-Env (ROBOTS_NOINDEX) kommt — ein Build, korrektes robots.txt je Umgebung.
export const dynamic = 'force-dynamic';

/**
 * robots.txt — umgebungsabhängig:
 *   - Staging / Pilot / Vorschau (ROBOTS_NOINDEX gesetzt): komplett `Disallow: /`,
 *     damit Test-/Pilot-Umgebungen NICHT in den Suchindex geraten.
 *   - Production (Flag NICHT gesetzt): öffentliche Seiten erlauben, private/technische
 *     Bereiche sperren, Sitemap verlinken.
 *
 * Die Basis-URL kommt aus NEXT_PUBLIC_APP_URL (pro Umgebung gesetzt), nie aus dem
 * Request-Host (Host-Header-Injection).
 */
export default function robots(): MetadataRoute.Robots {
  const noindex =
    process.env.ROBOTS_NOINDEX === '1' || process.env.ROBOTS_NOINDEX === 'true';

  if (noindex) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.edufunds.org').replace(
    /\/+$/,
    ''
  );

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/antrag/', '/kontingent/', '/registrieren'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
