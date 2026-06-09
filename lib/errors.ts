/**
 * EduFunds Error-Handling System
 * 
 * Bietet:
 * - Strukturierte API-Error-Klassen
 * - HTTP-Status Code Mapping
 * - Nutzerfreundliche Fehlermeldungen
 * - Retry-Logik für externe APIs
 */

import { NextResponse } from 'next/server';

// =============================================================================
// Error Codes
// =============================================================================

export type ErrorCode = 
  // Allgemeine Fehler
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  // KI/API-Fehler
  | 'AI_UNAVAILABLE'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_RESPONSE'
  // Datenbank-Fehler
  | 'DB_CONNECTION_ERROR'
  | 'DB_QUERY_ERROR'
  | 'DB_UNIQUE_VIOLATION'
  // Zahlungs-Fehler
  | 'PAYMENT_ERROR'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_TIMEOUT';

// =============================================================================
// HTTP Status Code Mapping
// =============================================================================

export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  INTERNAL_ERROR: 500,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504,
  AI_UNAVAILABLE: 503,
  AI_RATE_LIMIT: 429,
  AI_TIMEOUT: 504,
  AI_INVALID_RESPONSE: 502,
  DB_CONNECTION_ERROR: 503,
  DB_QUERY_ERROR: 500,
  DB_UNIQUE_VIOLATION: 409,
  PAYMENT_ERROR: 400,
  PAYMENT_DECLINED: 400,
  PAYMENT_TIMEOUT: 504,
};

// =============================================================================
// Nutzerfreundliche Fehlermeldungen
// =============================================================================

export const USER_MESSAGES: Record<ErrorCode, string> = {
  INTERNAL_ERROR: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
  VALIDATION_ERROR: 'Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.',
  NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden.',
  UNAUTHORIZED: 'Sie sind nicht angemeldet. Bitte melden Sie sich an.',
  FORBIDDEN: 'Sie haben keine Berechtigung für diese Aktion.',
  CONFLICT: 'Die Aktion kann nicht durchgeführt werden, da ein Konflikt besteht.',
  RATE_LIMITED: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
  SERVICE_UNAVAILABLE: 'Der Service ist temporär nicht verfügbar. Bitte versuchen Sie es später.',
  TIMEOUT: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
  AI_UNAVAILABLE: 'Der KI-Service ist temporär nicht verfügbar. Wir erstellen einen qualitativen Antrag alternativ.',
  AI_RATE_LIMIT: 'Zu viele KI-Anfragen. Bitte warten Sie einen Moment.',
  AI_TIMEOUT: 'Die KI-Anfrage hat zu lange gedauert. Bitte versuchen Sie es mit kürzeren Eingaben.',
  AI_INVALID_RESPONSE: 'Die KI-Antwort war ungültig. Bitte versuchen Sie es erneut.',
  DB_CONNECTION_ERROR: 'Datenbank-Verbindung fehlgeschlagen. Bitte versuchen Sie es später.',
  DB_QUERY_ERROR: 'Datenbankfehler aufgetreten. Bitte kontaktieren Sie den Support.',
  DB_UNIQUE_VIOLATION: 'Dieser Eintrag existiert bereits.',
  PAYMENT_ERROR: 'Fehler bei der Zahlungsverarbeitung.',
  PAYMENT_DECLINED: 'Die Zahlung wurde abgelehnt.',
  PAYMENT_TIMEOUT: 'Zeitüberschreitung bei der Zahlung.',
};

// =============================================================================
// API Error Klasse
// =============================================================================

export class APIError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      requestId?: string;
      isRetryable?: boolean;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'APIError';
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code];
    this.userMessage = USER_MESSAGES[code];
    this.details = options?.details;
    this.requestId = options?.requestId;
    this.isRetryable = options?.isRetryable ?? this.getDefaultRetryable(code);
  }

  private getDefaultRetryable(code: ErrorCode): boolean {
    const retryableCodes: ErrorCode[] = [
      'INTERNAL_ERROR',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE',
      'TIMEOUT',
      'AI_UNAVAILABLE',
      'AI_RATE_LIMIT',
      'AI_TIMEOUT',
      'DB_CONNECTION_ERROR',
      'PAYMENT_TIMEOUT',
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Konvertiert den Fehler in eine JSON-Response
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        status: this.statusCode,
        ...(this.details && { details: this.details }),
        ...(this.requestId && { requestId: this.requestId }),
        ...(process.env.NODE_ENV !== 'production' && { 
          debug: {
            message: this.message,
            stack: this.stack?.split('\n').slice(0, 5),
          }
        }),
      },
    };
  }
}

// =============================================================================
// Factory-Funktionen für häufige Fehler
// =============================================================================

export const Errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new APIError('VALIDATION_ERROR', message, { details }),

  notFound: (resource: string, id?: string) =>
    new APIError('NOT_FOUND', `${resource} nicht gefunden${id ? `: ${id}` : ''}`),

  unauthorized: (message = 'Nicht angemeldet') =>
    new APIError('UNAUTHORIZED', message),

  forbidden: (message = 'Zugriff verweigert') =>
    new APIError('FORBIDDEN', message),

  rateLimit: (retryAfter?: number) =>
    new APIError('RATE_LIMITED', 'Rate limit überschritten', {
      details: retryAfter ? { retryAfter } : undefined,
    }),

  aiUnavailable: (cause?: Error) =>
    new APIError('AI_UNAVAILABLE', 'KI-Service nicht verfügbar', { 
      cause,
      isRetryable: true,
    }),

  aiRateLimit: (retryAfter?: number) =>
    new APIError('AI_RATE_LIMIT', 'KI-Rate-Limit erreicht', {
      details: retryAfter ? { retryAfter } : undefined,
      isRetryable: true,
    }),

  dbError: (message: string, cause?: Error) =>
    new APIError('DB_QUERY_ERROR', message, { cause }),

  internal: (message: string, cause?: Error) =>
    new APIError('INTERNAL_ERROR', message, { cause }),
};

// =============================================================================
// Retry-Logik für externe APIs
// =============================================================================

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'],
  onRetry: () => {},
};

/**
 * Führt eine Funktion mit Retry-Logik aus
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Letzter Versuch fehlgeschlagen
      if (attempt === opts.maxRetries) {
        break;
      }

      // Prüfe ob Retry sinnvoll ist
      if (!shouldRetry(error as Error, opts)) {
        throw error;
      }

      // Berechne Wartezeit mit exponentiellem Backoff
      const delay = calculateDelay(attempt, opts);
      
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, lastError, delay);
      }

      if (context) {
        console.log(`[${context}] Retry ${attempt + 1}/${opts.maxRetries} nach ${delay}ms...`);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

function shouldRetry(error: Error, opts: Required<RetryOptions>): boolean {
  // Prüfe auf APIError mit isRetryable Flag
  if (error instanceof APIError) {
    return error.isRetryable;
  }

  // Prüfe auf HTTP Status Code (falls verfügbar)
  const statusCode = (error as any).statusCode || (error as any).status;
  if (statusCode && opts.retryableStatusCodes.includes(statusCode)) {
    return true;
  }

  // Prüfe auf bekannte retryable Error-Codes
  const errorCode = (error as any).code;
  if (errorCode && opts.retryableErrors.includes(errorCode)) {
    return true;
  }

  // Standard: Kein Retry
  return false;
}

function calculateDelay(attempt: number, opts: Required<RetryOptions>): number {
  const exponentialDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
  // Füge Jitter hinzu (0-20% Zufall) um Thundering Herd zu vermeiden
  const jitter = exponentialDelay * 0.2 * Math.random();
  return Math.min(exponentialDelay + jitter, opts.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Error Response Helper
// =============================================================================

/**
 * Erstellt eine konsistente Error-Response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string,
  corsHeaders?: Record<string, string>
): NextResponse {
  let apiError: APIError;

  if (error instanceof APIError) {
    apiError = error;
  } else if (error instanceof Error) {
    apiError = new APIError('INTERNAL_ERROR', error.message, { 
      cause: error,
      requestId,
    });
  } else {
    apiError = new APIError('INTERNAL_ERROR', 'Unbekannter Fehler', { requestId });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestId && { 'X-Request-ID': requestId }),
    ...corsHeaders,
  };

  // Füge Retry-After Header bei Rate-Limiting hinzu
  if (apiError.code === 'RATE_LIMITED' || apiError.code === 'AI_RATE_LIMIT') {
    const retryAfter = apiError.details?.retryAfter as number | undefined;
    if (retryAfter) {
      headers['Retry-After'] = String(retryAfter);
    }
  }

  return NextResponse.json(apiError.toJSON(), {
    status: apiError.statusCode,
    headers,
  });
}

/**
 * Wrapper für API Route Handler mit zentralem Error-Handling
 */
export function withErrorHandler<TArgs extends any[], TReturn>(
  handler: (...args: TArgs) => Promise<TReturn>,
  options?: {
    corsHeaders?: Record<string, string>;
    logErrors?: boolean;
  }
): (...args: TArgs) => Promise<TReturn | NextResponse> {
  return async (...args: TArgs) => {
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      return await handler(...args);
    } catch (error) {
      if (options?.logErrors !== false) {
        console.error(`[API Error] RequestID: ${requestId}`, error);
      }
      
      return createErrorResponse(error, requestId, options?.corsHeaders) as any;
    }
  };
}

// =============================================================================
// CORS Headers Helper
// =============================================================================

export const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

/**
 * Erstellt CORS-Headers mit optionaler Request-ID
 */
export function createCorsHeaders(requestId?: string): Record<string, string> {
  return {
    ...DEFAULT_CORS_HEADERS,
    ...(requestId && { 'X-Request-ID': requestId }),
  };
}

export default APIError;