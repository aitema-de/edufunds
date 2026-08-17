/**
 * Health Check API Route
 * 
 * GET /api/health
 * 
 * Returns:
 * - Application status
 * - Database connectivity
 * - Version information
 * - Timestamp
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * MUSS dynamisch sein. Vorher stand hier `force-static` — damit hat Next die
 * Antwort beim BUILD einmal erzeugt und als Datei ausgeliefert
 * (.next/server/app/api/health.body). Belegt am 30.07.2026: bei komplett
 * abgeschalteter Datenbank antwortete der Endpunkt weiter
 *   HTTP 200 {"status":"healthy","checks":{"database":true, ...}}
 * mit dem eingefrorenen Build-Zeitstempel.
 *
 * Daran haengen drei Waechter, die damit alle blind waren:
 *   - Docker-Healthcheck    (docker-compose.prod.yml: wget .../api/health)
 *   - Traefik-Healthcheck   (loadbalancer.healthcheck.path=/api/health)
 *   - scripts/monitor.sh    (prueft https://edufunds.org/api/health)
 * Ein Container mit toter DB waere „healthy" geblieben, Traefik haette weiter
 * Traffic hingeschickt und das Monitoring nie alarmiert.
 *
 * Nebeneffekt der Reparatur: der Build braucht keine Datenbank mehr. Als
 * statische Route wurde der DB-Check zur Build-Zeit ausgefuehrt — war die DB
 * langsam oder weg, scheiterte der BUILD (Timeout nach 60 s, real erlebt).
 *
 * Das `Cache-Control: no-store` weiter unten stand im direkten Widerspruch zu
 * `force-static`: die Absicht war immer „immer frisch".
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const checks = {
    api: true,
    database: false,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  let status = 200;

  // Check database connectivity
  try {
    await query('SELECT 1');
    checks.database = true;
  } catch (error) {
    checks.database = false;
    status = 503;
    console.error('[Health Check] Database error:', error);
  }

  const healthy = checks.api && checks.database;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
    },
    { 
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
