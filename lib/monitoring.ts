/**
 * Monitoring-Modul für EduFunds
 * 
 * Bietet strukturiertes Logging, Metrik-Tracking und Alerting-Funktionalität.
 */

import { promises as fs } from 'fs';
import path from 'path';

// =============================================================================
// Konfiguration
// =============================================================================

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_RETENTION_DAYS = 30;
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =============================================================================
// Typen
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
  requestId?: string;
}

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  labels?: Record<string, string>;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  severity: AlertSeverity;
  message: string;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  dbStatus: 'connected' | 'disconnected' | 'error';
  dbLatency: number;
  apiLatency: number;
  errorRate: number;
  totalRequests: number;
  errorCount: number;
  activeUsers: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  acknowledged: boolean;
  metrics?: SystemMetrics;
}

export interface DashboardData {
  status: 'healthy' | 'warning' | 'critical';
  metrics: SystemMetrics;
  recentLogs: LogEntry[];
  activeAlerts: Alert[];
  apiCalls: ApiCallEntry[];
}

export interface ApiCallEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  latency: number;
  userAgent?: string;
  ip?: string;
  error?: string;
}

// =============================================================================
// In-Memory Storage für Echtzeit-Metriken
// =============================================================================

class MetricsStore {
  private apiCalls: ApiCallEntry[] = [];
  private alerts: Alert[] = [];
  private metrics: MetricData[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();

  // API Calls
  addApiCall(call: ApiCallEntry): void {
    this.apiCalls.unshift(call);
    this.requestCount++;
    if (call.statusCode >= 400) {
      this.errorCount++;
    }
    // Nur die letzten 100 Calls behalten
    if (this.apiCalls.length > 100) {
      this.apiCalls = this.apiCalls.slice(0, 100);
    }
  }

  getRecentApiCalls(limit = 10): ApiCallEntry[] {
    return this.apiCalls.slice(0, limit);
  }

  getErrorRate(timeWindow = 3600000): number {
    const cutoff = Date.now() - timeWindow;
    const recentCalls = this.apiCalls.filter(c => new Date(c.timestamp).getTime() > cutoff);
    if (recentCalls.length === 0) return 0;
    const errors = recentCalls.filter(c => c.statusCode >= 400).length;
    return (errors / recentCalls.length) * 100;
  }

  // Alerts
  addAlert(alert: Alert): void {
    this.alerts.unshift(alert);
    // Max 50 Alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Stats
  getStats(): { totalRequests: number; errorCount: number; uptime: number } {
    return {
      totalRequests: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime,
    };
  }
}

export const metricsStore = new MetricsStore();

// =============================================================================
// Logger Klasse
// =============================================================================

export class Logger {
  private source: string;

  constructor(source = 'app') {
    this.source = source;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOG_DIR, `app-${date}.log`);
      
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(logFile, line, 'utf-8');
    } catch (error) {
      console.error('[Logger] Failed to write to file:', error);
    }
  }

  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source: this.source,
    };
  }

  async log(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    const entry = this.createEntry(level, message, context);
    
    // Console output
    const consoleMethod = level === 'error' || level === 'critical' ? console.error : 
                          level === 'warn' ? console.warn : console.log;
    consoleMethod(`[${entry.timestamp}] [${level.toUpperCase()}] [${this.source}] ${message}`, context || '');
    
    // File output
    await this.writeToFile(entry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  critical(message: string, context?: Record<string, unknown>): void {
    this.log('critical', message, context);
  }
}

// Default Logger Instanz
export const logger = new Logger('monitoring');

// =============================================================================
// Metrik-Tracking
// =============================================================================

export async function collectSystemMetrics(): Promise<SystemMetrics> {
  const startTime = Date.now();
  
  // DB Latency check
  let dbStatus: SystemMetrics['dbStatus'] = 'disconnected';
  let dbLatency = 0;
  
  try {
    const { query } = await import('@/lib/db');
    const dbStart = Date.now();
    await query('SELECT 1');
    dbLatency = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
    dbLatency = -1;
  }

  // API Latency (simulated - last call average)
  const recentCalls = metricsStore.getRecentApiCalls(10);
  const apiLatency = recentCalls.length > 0 
    ? recentCalls.reduce((sum, c) => sum + c.latency, 0) / recentCalls.length 
    : 0;

  // Error rate (last hour)
  const errorRate = metricsStore.getErrorRate();

  // Stats
  const stats = metricsStore.getStats();

  // Memory Usage
  const memUsage = process.memoryUsage();
  const totalMem = require('os').totalmem();

  return {
    timestamp: new Date().toISOString(),
    uptime: stats.uptime,
    dbStatus,
    dbLatency,
    apiLatency,
    errorRate,
    totalRequests: stats.totalRequests,
    errorCount: stats.errorCount,
    activeUsers: 0, // Wird separat implementiert wenn nötig
    memoryUsage: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpuUsage: 0, // Erfordert komplexere Implementierung
  };
}

// =============================================================================
// Alerting System
// =============================================================================

const alertConfigs: AlertConfig[] = [
  {
    id: 'high-error-rate',
    name: 'Hohe Fehlerrate',
    condition: (m) => m.errorRate > 5,
    severity: 'warning',
    message: 'Die Fehlerrate liegt über 5%',
  },
  {
    id: 'db-disconnected',
    name: 'Datenbank nicht erreichbar',
    condition: (m) => m.dbStatus !== 'connected',
    severity: 'critical',
    message: 'Die Datenbankverbindung ist unterbrochen',
  },
  {
    id: 'high-db-latency',
    name: 'Hohe Datenbank-Latenz',
    condition: (m) => m.dbLatency > 1000,
    severity: 'warning',
    message: 'Die Datenbank-Latenz liegt über 1000ms',
  },
  {
    id: 'high-memory-usage',
    name: 'Hoher Speicherverbrauch',
    condition: (m) => m.memoryUsage.percentage > 90,
    severity: 'warning',
    message: 'Der Speicherverbrauch liegt über 90%',
  },
];

export function checkAlerts(metrics: SystemMetrics): Alert[] {
  const newAlerts: Alert[] = [];
  
  for (const config of alertConfigs) {
    if (config.condition(metrics)) {
      // Prüfe ob dieser Alert bereits aktiv ist
      const existingAlert = metricsStore.getActiveAlerts().find(a => a.id === config.id);
      if (!existingAlert) {
        const alert: Alert = {
          id: config.id,
          timestamp: new Date().toISOString(),
          severity: config.severity,
          title: config.name,
          message: config.message,
          acknowledged: false,
          metrics,
        };
        metricsStore.addAlert(alert);
        newAlerts.push(alert);
        
        // Loggen
        logger.warn(`Alert triggered: ${config.name}`, { alert, metrics });
      }
    }
  }
  
  return newAlerts;
}

// =============================================================================
// Log Rotation & Cleanup
// =============================================================================

export async function cleanupOldLogs(): Promise<void> {
  try {
    const files = await fs.readdir(LOG_DIR);
    const cutoff = Date.now() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      if (file.startsWith('app-') && file.endsWith('.log')) {
        const filePath = path.join(LOG_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          logger.info(`Deleted old log file: ${file}`);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup old logs', { error });
  }
}

export async function getRecentLogs(level?: LogLevel, limit = 100): Promise<LogEntry[]> {
  try {
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .sort()
      .reverse();
    
    const logs: LogEntry[] = [];
    
    for (const file of logFiles) {
      if (logs.length >= limit) break;
      
      const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
      const lines = content.trim().split('\n').reverse();
      
      for (const line of lines) {
        if (logs.length >= limit) break;
        
        try {
          const entry: LogEntry = JSON.parse(line);
          if (!level || entry.level === level) {
            logs.push(entry);
          }
        } catch {
          // Ungültige Zeile überspringen
        }
      }
    }
    
    return logs;
  } catch {
    return [];
  }
}

// =============================================================================
// E-Mail Alert Template
// =============================================================================

export function generateAlertEmail(alert: Alert): string {
  const severityColors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EduFunds System Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { background: #fef2f2; border-left: 4px solid ${severityColors[alert.severity]}; padding: 15px; margin: 20px 0; }
    .metric { display: inline-block; margin: 5px 10px 5px 0; padding: 5px 10px; background: #f3f4f6; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
    h1 { color: ${severityColors[alert.severity]}; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨 EduFunds System Alert</h1>
    
    <div class="alert-box">
      <h2>${alert.title}</h2>
      <p><strong>Schweregrad:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Zeitpunkt:</strong> ${new Date(alert.timestamp).toLocaleString('de-DE')}</p>
      <p><strong>Beschreibung:</strong> ${alert.message}</p>
    </div>
    
    ${alert.metrics ? `
    <h3>System-Metriken</h3>
    <div>
      <span class="metric">DB-Status: ${alert.metrics.dbStatus}</span>
      <span class="metric">DB-Latenz: ${alert.metrics.dbLatency}ms</span>
      <span class="metric">Fehlerrate: ${alert.metrics.errorRate.toFixed(2)}%</span>
      <span class="metric">Speicher: ${alert.metrics.memoryUsage.percentage}%</span>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Dies ist eine automatisierte Benachrichtigung vom EduFunds Monitoring-System.</p>
      <p>Dashboard: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3101'}/admin/dashboard">Zum Dashboard</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =============================================================================
// Dashboard Data API
// =============================================================================

export async function getDashboardData(): Promise<DashboardData> {
  const metrics = await collectSystemMetrics();
  
  // Status ermitteln
  let status: DashboardData['status'] = 'healthy';
  if (metrics.dbStatus !== 'connected' || metrics.errorRate > 10) {
    status = 'critical';
  } else if (metrics.errorRate > 5 || metrics.memoryUsage.percentage > 85) {
    status = 'warning';
  }
  
  // Alerts prüfen
  const activeAlerts = checkAlerts(metrics);
  
  // Letzte Logs holen
  const recentLogs = await getRecentLogs('error', 10);
  
  // API Calls
  const apiCalls = metricsStore.getRecentApiCalls(10);
  
  return {
    status,
    metrics,
    recentLogs,
    activeAlerts: metricsStore.getActiveAlerts(),
    apiCalls,
  };
}

// =============================================================================
// Middleware Helper für API-Tracking
// =============================================================================

export function trackApiCall(
  method: string,
  path: string,
  statusCode: number,
  latency: number,
  userAgent?: string,
  ip?: string,
  error?: string
): void {
  const call: ApiCallEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    method,
    path,
    statusCode,
    latency,
    userAgent,
    ip,
    error,
  };
  
  metricsStore.addApiCall(call);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  logger,
  metricsStore,
  collectSystemMetrics,
  getDashboardData,
  trackApiCall,
  checkAlerts,
  cleanupOldLogs,
  getRecentLogs,
  generateAlertEmail,
};
