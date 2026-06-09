'use client';

/**
 * Admin Monitoring Dashboard
 * 
 * Zeigt System-Health-Metriken in Echtzeit an:
 * - System-Status (Grün/Gelb/Rot)
 * - Letzte 10 API-Calls mit Latenz
 * - Fehler-Log (letzte 24h)
 * - Auto-Refresh alle 30 Sekunden
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Server,
  Zap,
  RefreshCw,
  Users,
  FileText,
  AlertOctagon,
  Bell,
  Mail,
} from 'lucide-react';

// =============================================================================
// Typen
// =============================================================================

interface SystemMetrics {
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

interface Alert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  acknowledged: boolean;
}

interface ApiCallEntry {
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

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

interface DashboardData {
  status: 'healthy' | 'warning' | 'critical';
  statusCode: number;
  timestamp: string;
  metrics: SystemMetrics;
  alerts: Alert[];
  apiCalls: ApiCallEntry[];
  logs: LogEntry[];
}

// =============================================================================
// Helper Funktionen
// =============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function getStatusColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusBgColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/10 border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/10 border-amber-500/30';
    case 'critical':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-gray-500/10 border-gray-500/30';
  }
}

function getHttpStatusColor(code: number): string {
  if (code < 300) return 'text-emerald-400';
  if (code < 400) return 'text-amber-400';
  if (code < 500) return 'text-[#c9a227]';
  return 'text-red-400';
}

function getLogLevelColor(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'error':
      return 'bg-red-400/20 text-red-400';
    case 'warn':
      return 'bg-amber-400/20 text-amber-400';
    case 'info':
      return 'bg-blue-400/20 text-blue-400';
    default:
      return 'bg-gray-400/20 text-gray-400';
  }
}

// =============================================================================
// Komponenten
// =============================================================================

function StatusCard({ 
  title, 
  value, 
  icon: Icon, 
  status,
  subtitle,
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType;
  status: 'healthy' | 'warning' | 'critical';
  subtitle?: string;
}) {
  return (
    <div className={`p-6 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.02] ${getStatusBgColor(status)}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${getStatusColor(status)} bg-opacity-20`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  unit,
  trend,
  threshold,
}: { 
  label: string; 
  value: number; 
  unit: string;
  trend?: 'up' | 'down' | 'neutral';
  threshold?: { warning: number; critical: number };
}) {
  let colorClass = 'text-white';
  if (threshold) {
    if (value >= threshold.critical) colorClass = 'text-red-400';
    else if (value >= threshold.warning) colorClass = 'text-amber-400';
    else colorClass = 'text-emerald-400';
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl font-bold ${colorClass}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

function ApiCallsTable({ calls }: { calls: ApiCallEntry[] }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          Letzte API Calls
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Zeit</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Methode</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Pfad</th>
              <th className="px-4 py-3 text-center text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Latenz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {calls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 text-gray-400">
                  {formatTime(call.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    call.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                    call.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                    call.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {call.method}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[200px]">
                  {call.path}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-mono font-medium ${getHttpStatusColor(call.statusCode)}`}>
                    {call.statusCode}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${
                  call.latency > 1000 ? 'text-red-400' :
                  call.latency > 500 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {call.latency}ms
                </td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Keine API Calls vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ErrorLogTable({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Fehler-Log (24h)
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Zeit</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Level</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Nachricht</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Quelle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 max-w-[400px] truncate" title={log.message}>
                  {log.message}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {log.source || 'app'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Keine Fehler vorhanden 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, onAcknowledge }: { 
  alerts: Alert[]; 
  onAcknowledge?: (id: string) => void;
}) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          Aktive Alerts
          {alerts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {alerts.length}
            </span>
          )}
        </h3>
      </div>
      <div className="divide-y divide-gray-700">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`p-4 border-l-4 ${getSeverityClass(alert.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div>
                  <h4 className="font-medium text-white">{alert.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.timestamp).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
              {onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Bestätigen
                </button>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            Keine aktiven Alerts
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Hauptkomponente
// =============================================================================

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health/dashboard?format=full&logs=10');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh alle 30 Sekunden
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleAcknowledge = useCallback(async (alertId: string) => {
    // Hier könnte ein API-Call zum Bestätigen des Alerts erfolgen
    console.log('Acknowledging alert:', alertId);
    // Optimistische UI-Update
    if (data) {
      setData({
        ...data,
        alerts: data.alerts.filter(a => a.id !== alertId),
      });
    }
  }, [data]);

  // Loading State
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Fehler beim Laden</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { status, metrics, alerts, apiCalls, logs } = data;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-white">EduFunds Monitoring</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {status === 'healthy' ? 'System Gesund' :
                 status === 'warning' ? 'Warnung' : 'Kritisch'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Letzte Aktualisierung: {lastRefresh.toLocaleTimeString('de-DE')}</span>
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                Auto-Refresh (30s)
              </label>
              
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatusCard
            title="System-Status"
            value={status === 'healthy' ? 'Gesund' : status === 'warning' ? 'Warnung' : 'Kritisch'}
            icon={status === 'healthy' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle}
            status={status}
            subtitle={`Uptime: ${formatDuration(metrics.uptime)}`}
          />
          
          <StatusCard
            title="Datenbank"
            value={metrics.dbStatus === 'connected' ? 'Verbunden' : 'Fehler'}
            icon={Database}
            status={metrics.dbStatus === 'connected' ? 'healthy' : 'critical'}
            subtitle={`Latenz: ${metrics.dbLatency}ms`}
          />
          
          <StatusCard
            title="Fehlerrate"
            value={`${metrics.errorRate.toFixed(2)}%`}
            icon={TrendingUp}
            status={metrics.errorRate > 5 ? 'critical' : metrics.errorRate > 2 ? 'warning' : 'healthy'}
            subtitle={`${metrics.errorCount} Fehler total`}
          />
          
          <StatusCard
            title="API Calls"
            value={metrics.totalRequests.toLocaleString()}
            icon={Server}
            status="healthy"
            subtitle={`Ø Latenz: ${Math.round(metrics.apiLatency)}ms`}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Speicherverbrauch"
            value={metrics.memoryUsage.percentage}
            unit="%"
            threshold={{ warning: 70, critical: 90 }}
          />
          <MetricCard
            label="Heap Used"
            value={metrics.memoryUsage.used}
            unit="MB"
          />
          <MetricCard
            label="API Latenz"
            value={metrics.apiLatency}
            unit="ms"
            threshold={{ warning: 500, critical: 1000 }}
          />
          <MetricCard
            label="DB Latenz"
            value={metrics.dbLatency}
            unit="ms"
            threshold={{ warning: 100, critical: 500 }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - API Calls */}
          <div className="lg:col-span-2">
            <ApiCallsTable calls={apiCalls} />
          </div>

          {/* Right Column - Alerts */}
          <div>
            <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
          </div>
        </div>

        {/* Error Logs */}
        <div className="mt-8">
          <ErrorLogTable logs={logs} />
        </div>

        {/* System Info Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400">
            <div>
              <h4 className="font-medium text-white mb-2">System</h4>
              <p>Node.js: {process.env.NEXT_PUBLIC_NODE_VERSION || 'N/A'}</p>
              <p>Environment: {process.env.NODE_ENV || 'development'}</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Version</h4>
              <p>App: {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</p>
              <p>Next.js: 16.x</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Links</h4>
              <a 
                href="/api/health" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 block"
              >
                Health API →
              </a>
              <a 
                href="/api/health/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 block mt-1"
              >
                Dashboard API →
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
