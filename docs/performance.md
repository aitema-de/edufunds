# Performance Optimierungen

## Caching Strategie

### Statische Assets (JS/CSS)
- **Cache-Control:** `public, max-age=31536000, immutable`
- **Dauer:** 1 Jahr
- **Grund:** Hashed filenames bei Next.js builds

### Bilder
- **Cache-Control:** `public, max-age=86400, stale-while-revalidate=604800`
- **Dauer:** 24h mit 7 Tagen stale-while-revalidate
- **Grund:** Bilder können sich ändern, aber nicht oft

### HTML Seiten
- **Cache-Control:** `public, max-age=60, stale-while-revalidate=300`
- **Dauer:** 1min mit 5min stale-while-revalidate
- **Grund:** Content kann sich ändern (Programme, Preise)

### API Routes
- **Cache-Control:** `no-store, must-revalidate`
- **Grund:** Dynamische Daten, keine Caching

## Image Optimization

### Formate
- WebP (primär)
- AVIF (fallback für bessere Browser)
- JPEG/PNG (legacy fallback)

### Größen
- Device Sizes: 640, 750, 828, 1080, 1200px
- Image Sizes: 16, 32, 48, 64, 96, 128, 256, 384px

## Core Web Vitals Ziele

| Metrik | Ziel | Status |
|--------|------|--------|
| LCP | < 2.5s | 🔄 Messung |
| FID | < 100ms | ✅ Gut |
| CLS | < 0.1 | ✅ Gut |
| TTFB | < 600ms | ✅ Gut |
| FCP | < 1.8s | 🔄 Messung |

## Monitoring

### Tools
- Google PageSpeed Insights
- Web Vitals Extension
- Chrome DevTools Lighthouse

### Automatische Checks
- Build-time: Bundle Size Analysis
- Runtime: Web Vitals Reporting (TODO)
