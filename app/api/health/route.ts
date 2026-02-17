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

export const dynamic = 'force-static';

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
