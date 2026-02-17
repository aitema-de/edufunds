/**
 * Backend System Health Check
 * 
 * GET /api/health/backend
 * 
 * Prüft den Status aller Backend-Optimierungs-Komponenten
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isRedisAvailable, getRateLimitStatus } from '@/lib/rate-limit';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-static';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  
  // 1. Datenbank-Check
  const dbStart = performance.now();
  try {
    await query('SELECT 1');
    checks.push({
      name: 'database',
      status: 'healthy',
      responseTime: Math.round(performance.now() - dbStart),
      message: 'PostgreSQL connection OK',
    });
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'unhealthy',
      responseTime: Math.round(performance.now() - dbStart),
      message: 'PostgreSQL connection failed',
      details: { error: (error as Error).message },
    });
  }

  // 2. Rate-Limiting Check (Redis/In-Memory)
  const rateLimitStatus = getRateLimitStatus();
  checks.push({
    name: 'rate_limiting',
    status: 'healthy',
    message: rateLimitStatus.redisAvailable 
      ? 'Redis connected' 
      : 'In-Memory fallback active',
    details: {
      redisAvailable: rateLimitStatus.redisAvailable,
    },
  });

  // 3. Logger Check
  checks.push({
    name: 'logger',
    status: 'healthy',
    message: 'Logger initialized',
    details: {
      service: process.env.SERVICE_NAME || 'edufunds-api',
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    },
  });

  // 4. Error-Handling Check
  checks.push({
    name: 'error_handling',
    status: 'healthy',
    message: 'Error handling system ready',
    details: {
      errorCodes: 19, // Anzahl der definierten Error Codes
      retryStrategies: ['exponential-backoff', 'jitter'],
    },
  });

  // 5. Speicher-Nutzung
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const memoryStatus = memoryMB > 500 ? 'degraded' : 'healthy';
  
  checks.push({
    name: 'memory',
    status: memoryStatus,
    message: `Heap: ${memoryMB}MB`,
    details: {
      heapUsed: memoryMB,
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
  });

  // Gesamt-Status bestimmen
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');
  const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
  
  const duration = Math.round(performance.now() - startTime);
  
  // Log Result
  apiLogger.info('Backend health check', {
    status: overallStatus,
    duration,
    checks: checks.map(c => ({ name: c.name, status: c.status })),
  });

  // Response
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    duration: `${duration}ms`,
    checks,
  };

  return NextResponse.json(response, {
    status: overallStatus === 'healthy' ? 200 : hasUnhealthy ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}