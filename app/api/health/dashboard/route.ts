/**
 * Health Dashboard API Route
 * 
 * GET /api/health/dashboard
 * 
 * Returns comprehensive system health data for the monitoring dashboard:
 * - System metrics (DB status, latency, error rate, uptime)
 * - Recent API calls with latency
 * - Recent error logs
 * - Active alerts
 * - Overall system status
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getDashboardData, 
  collectSystemMetrics,
  metricsStore,
  getRecentLogs,
  logger,
} from '@/lib/monitoring';

export const dynamic = 'force-static';

// CORS Headers für Dashboard
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

/**
 * GET /api/health/dashboard
 * 
 * Query Parameters:
 * - format: 'full' | 'metrics' (default: 'full')
 * - logs: number (Anzahl der Logs, default: 10)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Query Parameter parsen
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full';
    const logCount = parseInt(searchParams.get('logs') || '10', 10);
    
    // Basis-Metriken sammeln
    const metrics = await collectSystemMetrics();
    
    // Response zusammenbauen
    const response: {
      status: string;
      statusCode: number;
      timestamp: string;
      metrics: typeof metrics;
      alerts?: ReturnType<typeof metricsStore.getActiveAlerts>;
      apiCalls?: ReturnType<typeof metricsStore.getRecentApiCalls>;
      logs?: Awaited<ReturnType<typeof getRecentLogs>>;
    } = {
      status: metrics.dbStatus === 'connected' && metrics.errorRate < 5 ? 'healthy' :
              metrics.dbStatus !== 'connected' ? 'critical' : 'warning',
      statusCode: metrics.dbStatus === 'connected' ? 200 : 503,
      timestamp: new Date().toISOString(),
      metrics,
    };
    
    // Vollständiges Format
    if (format === 'full') {
      const [alerts, apiCalls, logs] = await Promise.all([
        Promise.resolve(metricsStore.getActiveAlerts()),
        Promise.resolve(metricsStore.getRecentApiCalls(10)),
        getRecentLogs('error', logCount),
      ]);
      
      response.alerts = alerts;
      response.apiCalls = apiCalls;
      response.logs = logs;
    }
    
    // API Latenz tracken
    const latency = Date.now() - startTime;
    metricsStore.addApiCall({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      method: 'GET',
      path: '/api/health/dashboard',
      statusCode: response.statusCode,
      latency,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || undefined,
    });
    
    return NextResponse.json(response, {
      status: response.statusCode,
      headers: corsHeaders,
    });
    
  } catch (error) {
    logger.error('Health dashboard API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      path: '/api/health/dashboard',
    });
    
    return NextResponse.json(
      {
        status: 'error',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Internal server error',
        metrics: null,
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * OPTIONS Handler für CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
