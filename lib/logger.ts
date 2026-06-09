/**
 * EduFunds Logger-System
 * 
 * Bietet strukturiertes Logging mit:
 * - JSON-Format für Produktion
 * - Farbige Ausgaben für Entwicklung
 * - Log-Level (debug, info, warn, error, fatal)
 * - Request-Korrelation über requestId
 * - Automatische Log-Rotation
 */

// Log-Level Definitionen
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Strukturierte Log-Metadaten
interface LogMetadata {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  duration?: number;
  [key: string]: unknown;
}

// Log-Eintrag Struktur
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// Konfiguration
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const SERVICE_NAME = process.env.SERVICE_NAME || 'edufunds-api';

// ANSI Farbcodes für Entwicklung
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[32m',     // Grün
  warn: '\x1b[33m',     // Gelb
  error: '\x1b[31m',    // Rot
  fatal: '\x1b[35m',    // Magenta
};

/**
 * Prüft ob ein Log-Level aktiviert ist
 */
function isLevelEnabled(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL as LogLevel];
}

/**
 * Formatiert einen Log-Eintrag für die Konsole (farbige Ausgabe)
 */
function formatConsole(entry: LogEntry): string {
  const color = COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const timestamp = entry.timestamp.slice(11, 23); // HH:mm:ss.ms
  
  let output = `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${levelStr}${COLORS.reset} ${entry.message}`;
  
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    const meta = { ...entry.metadata };
    delete meta.timestamp; // Doppelt
    if (Object.keys(meta).length > 0) {
      output += ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}`;
    }
  }
  
  if (entry.error) {
    output += `\n  ${COLORS.error}Error: ${entry.error.message}${COLORS.reset}`;
    if (entry.error.stack && process.env.NODE_ENV !== 'production') {
      const stack = entry.error.stack.split('\n').slice(1, 4).join('\n  ');
      output += `\n  ${COLORS.dim}${stack}${COLORS.reset}`;
    }
  }
  
  return output;
}

/**
 * Formatiert einen Log-Eintrag als JSON (für Produktion)
 */
function formatJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Schreibt einen Log-Eintrag
 */
function writeLog(entry: LogEntry): void {
  if (process.env.NODE_ENV === 'production') {
    // In Produktion: JSON für ELK/CloudWatch
    console.log(formatJSON(entry));
  } else {
    // In Entwicklung: Farbige Konsolenausgabe
    console.log(formatConsole(entry));
  }
}

/**
 * Erstellt einen neuen Logger mit Kontext
 */
export function createLogger(context: string, defaultMetadata?: LogMetadata) {
  
  function log(level: LogLevel, message: string, meta?: LogMetadata, error?: Error) {
    if (!isLevelEnabled(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `[${context}] ${message}`,
      service: SERVICE_NAME,
      environment: process.env.NODE_ENV || 'development',
      metadata: {
        ...defaultMetadata,
        ...meta,
      },
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        code: (error as any).code,
      };
    }
    
    writeLog(entry);
  }
  
  return {
    debug: (msg: string, meta?: LogMetadata) => log('debug', msg, meta),
    info: (msg: string, meta?: LogMetadata) => log('info', msg, meta),
    warn: (msg: string, meta?: LogMetadata, error?: Error) => log('warn', msg, meta, error),
    error: (msg: string, meta?: LogMetadata, error?: Error) => log('error', msg, meta, error),
    fatal: (msg: string, meta?: LogMetadata, error?: Error) => log('fatal', msg, meta, error),
    
    // Für API-Request-Logging
    request: (method: string, path: string, metadata?: LogMetadata) => {
      log('info', `${method} ${path}`, { method, path, ...metadata });
    },
    
    response: (method: string, path: string, status: number, duration: number, metadata?: LogMetadata) => {
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      log(level, `${method} ${path} ${status} ${duration}ms`, { 
        method, path, status, duration, ...metadata 
      });
    },
    
    // Mit erweitertem Kontext
    withContext: (additionalContext: Partial<LogMetadata>) => {
      return createLogger(context, { ...defaultMetadata, ...additionalContext });
    },
  };
}

/**
 * Globaler Logger für den API-Layer
 */
export const apiLogger = createLogger('API');

/**
 * Logger für Datenbank-Operationen
 */
export const dbLogger = createLogger('DB');

/**
 * Logger für externe API-Integrationen
 */
export const externalApiLogger = createLogger('ExternalAPI');

/**
 * Logger für Authentifizierung/Autorisierung
 */
export const authLogger = createLogger('Auth');

/**
 * Logger für Business-Logik
 */
export const businessLogger = createLogger('Business');

/**
 * Request-Logging Middleware für Next.js API Routes
 */
export function logRequest(request: Request, requestId: string) {
  const url = new URL(request.url);
  const logger = createLogger('Request', { requestId });
  
  logger.request(request.method, url.pathname, {
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
  });
  
  return logger;
}

/**
 * Misst die Dauer einer Operation und loggt sie
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  logger = apiLogger,
  metadata?: LogMetadata
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    logger.debug(`${operation} completed`, { ...metadata, duration });
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(`${operation} failed`, { ...metadata, duration }, error as Error);
    throw error;
  }
}

// Default Export
export default createLogger;