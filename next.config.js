/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Turbopack-Workspace-Root explizit setzen, sonst pickt Next den
  // Eltern-Ordner /home/kolja/ als Root (dort liegen verirrte package*.json).
  turbopack: { root: __dirname },
  images: { 
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  serverExternalPackages: ['pg'],
  // Alt-URLs der abgeschalteten statischen Landing (separates Repo). Nur die
  // Startseite war indexiert, die Unterseiten liefern seit dem Abschalten 502 —
  // die 301 sind Absicherung fuer etwaige Backlinks.
  async redirects() {
    return [
      // Alt-Bestand: 128 statische Programm-Seiten lagen bis 22.07.2026 unter
      // public/foerderprogramme/<id>.html (Stand Feb 2026). Sie standen in
      // KEINER Sitemap und waren nirgends verlinkt, wurden von Next aber weiter
      // ausgeliefert — mit dem Stand von damals, inklusive der Zusage
      // "128 Foerderprogramme" in jeder Meta-Description. Damit waren sie
      // zugleich Duplicate Content zur App-Route und eine falsche Zahl.
      // Dateien entfernt, URLs bleiben per 301 gueltig.
      //
      // Diese acht IDs gibt es im Katalog nicht mehr (umbenannt/entfernt) —
      // sie gehen bewusst auf den Finder statt auf eine geratene ID, damit
      // niemand auf dem falschen Programm landet.
      ...[
        'digitalpakt-20',
        'eit-higher-education-2026',
        'erasmus-alliances-innovation',
        'ferry-porsche-challenge-2025',
        'klaus-tschira-mint',
        'sprungbrett-bildung-karlsruhe',
        'tschira-stiftung',
        'z-lab-bruchsal',
      ].map((id) => ({
        source: `/foerderprogramme/${id}.html`,
        destination: '/foerderprogramme',
        permanent: true,
      })),
      // Alle uebrigen .html-Altlasten auf ihre App-Route.
      {
        source: '/foerderprogramme/:id.html',
        destination: '/foerderprogramme/:id',
        permanent: true,
      },

      { source: '/programme.html', destination: '/foerderprogramme', permanent: true },
      { source: '/ueber-uns.html', destination: '/ueber-uns', permanent: true },
      { source: '/kontakt.html', destination: '/kontakt', permanent: true },
      { source: '/impressum.html', destination: '/impressum', permanent: true },
      { source: '/datenschutz.html', destination: '/datenschutz', permanent: true },
      { source: '/agb.html', destination: '/agb', permanent: true },
    ];
  },
  // Der Förderlücken-Rechner (Sommer-Kampagne, beworben als /foerderrechner/ in
  // OG-Tags und Bio-Links) liegt als statisches Bundle unter public/foerderrechner/.
  // Next serviert public-Verzeichnisse NICHT als Index: /foerderrechner/ wird per
  // 308 auf /foerderrechner normalisiert, und das war ein 404. Der Rewrite biegt
  // den Pfad auf die index.html um (Asset-Referenzen im Bundle sind absolut).
  async rewrites() {
    return [
      { source: '/foerderrechner', destination: '/foerderrechner/index.html' },
    ];
  },
  async headers() {
    return [
      // Statische Assets mit langem Cache
      {
        source: '/:path*.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.css',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // API-Routen mit Cache (außer auth-relevante)
      {
        source: '/api/foerderprogramme',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      // HTML-Seiten mit kurzem Cache
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // CSP wird per-Request MIT Nonce in middleware.ts gesetzt (nonce-basiert,
          // ohne unsafe-inline/-eval für Scripts). Kein statischer CSP-Header hier,
          // sonst überschriebe er die Nonce-CSP.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
