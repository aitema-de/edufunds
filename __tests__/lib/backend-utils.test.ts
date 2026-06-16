/**
 * @jest-environment node
 *
 * Tests für Error-Handling (APIError, Errors-Factory, withRetry,
 * Error-Code-Mappings).
 *
 * Node-Umgebung notwendig: `lib/errors.ts` importiert `NextResponse` aus
 * 'next/server'. Dessen Modul-Initialisierung benoetigt den nativen
 * `Request`-Global, der in jsdom fehlt (Node >=18 stellt ihn bereit). Gleiche
 * Konvention wie die uebrigen Route-/next-server-Tests im Repo.
 */

// Hinweis: Test-Runner ist Jest (nicht Vitest). describe/it/expect/beforeEach sind
// global verfuegbar; fuer Mocks/Fake-Timers wird `jest` statt `vi` verwendet.
import {
  APIError,
  Errors,
  withRetry,
  ERROR_STATUS_CODES,
  USER_MESSAGES,
} from '@/lib/errors';
// HINWEIS: Die urspruenglichen Rate-Limiting-Tests importierten `checkRateLimit`
// und `RATE_LIMIT_CONFIGS` aus '@/lib/rate-limit'. Diese Symbole existieren dort
// NICHT (mehr): `lib/rate-limit.ts` exportiert nur `rateLimit`,
// `checkEndpointRateLimit`, `logSuspiciousActivity`, `isRedisAvailable` und
// `getRateLimitStatus`. `checkRateLimit` ist eine modul-private Funktion mit
// abweichender Signatur (synchron, Config mit `windowMs`/`maxRequests`), und
// `RATE_LIMIT_CONFIGS` gibt es im gesamten Repo nicht. Die betroffenen
// Rate-Limiting-Testbloecke wurden daher entfernt, statt nicht vorhandene
// Symbole zu erfinden oder Anwendungs-Code anzupassen.

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  describe('APIError', () => {
    it('sollte einen Fehler mit korrektem Status Code erstellen', () => {
      const error = new APIError('VALIDATION_ERROR', 'Test validation error');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.userMessage).toBe(USER_MESSAGES.VALIDATION_ERROR);
      expect(error.isRetryable).toBe(false);
    });

    it('sollte retryable Fehler korrekt markieren', () => {
      const rateLimitError = new APIError('RATE_LIMITED', 'Too many requests');
      const validationError = new APIError('VALIDATION_ERROR', 'Invalid');
      
      expect(rateLimitError.isRetryable).toBe(true);
      expect(validationError.isRetryable).toBe(false);
    });

    it('sollte Details korrekt speichern', () => {
      const error = new APIError('VALIDATION_ERROR', 'Test', {
        details: { fields: [{ field: 'email', message: 'Invalid' }] }
      });
      
      expect(error.details).toEqual({
        fields: [{ field: 'email', message: 'Invalid' }]
      });
    });

    it('sollte zu JSON konvertierbar sein', () => {
      const error = new APIError('NOT_FOUND', 'User not found', {
        requestId: 'test-123'
      });
      
      const json = error.toJSON();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toBe(USER_MESSAGES.NOT_FOUND);
      expect(json.error.requestId).toBe('test-123');
    });
  });

  describe('Error Factory Functions', () => {
    it('sollte Validation Error erstellen', () => {
      const error = Errors.validation('Field required', { field: 'email' });
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('sollte Not Found Error erstellen', () => {
      const error = Errors.notFound('User', '123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('User nicht gefunden: 123');
    });

    it('sollte Rate Limit Error erstellen', () => {
      const error = Errors.rateLimit(60);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('withRetry', () => {
    // HINWEIS: Die Backoff-Wartezeiten von `withRetry` nutzen `setTimeout` mit
    // `Math.random()`-Jitter. Statt Fake-Timers (die mit dem internen
    // await-sleep-Loop verzahnt sind und nicht-deterministisch flushen) werden
    // hier echte Timer mit sehr kleinen `initialDelayMs` (1 ms) verwendet — die
    // Tests bleiben dadurch schnell UND deterministisch.

    it('sollte erfolgreiche Operation ohne Retry ausführen', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    // HINWEIS zur tatsaechlichen `withRetry`-Semantik (lib/errors.ts):
    // Es wird NICHT pauschal jeder Fehler wiederholt. `shouldRetry` retryed nur
    // (a) `APIError` mit `isRetryable=true`, (b) Fehler mit einem
    // `statusCode`/`status` aus `retryableStatusCodes` (408/429/500/502/503/504)
    // oder (c) Fehler mit einem `code` aus `retryableErrors`
    // (ECONNRESET/ETIMEDOUT/...). Ein nackter `new Error('...')` wird daher sofort
    // durchgereicht. Die folgenden Tests verwenden deshalb bewusst einen
    // retryable Fehler (HTTP-Status 503), um den Retry-Pfad zu treffen.
    const makeRetryableError = (message: string) => {
      const err = new Error(message) as Error & { status: number };
      err.status = 503; // SERVICE_UNAVAILABLE -> in retryableStatusCodes
      return err;
    };

    it('sollte bei Fehler retryen und schließlich erfolgreich sein', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(makeRetryableError('Temporary error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 1,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('sollte nach maxRetries aufgeben', async () => {
      const operation = jest.fn().mockRejectedValue(makeRetryableError('Persistent error'));

      await expect(
        withRetry(operation, { maxRetries: 2, initialDelayMs: 1 })
      ).rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 Retries
    });

    it('sollte APIError isRetryable respektieren', async () => {
      const validationError = new APIError('VALIDATION_ERROR', 'Invalid');
      const operation = jest.fn().mockRejectedValue(validationError);

      await expect(withRetry(operation, { maxRetries: 3 }))
        .rejects.toThrow(validationError);

      // Sollte keinen Retry versuchen da nicht retryable
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Rate Limiting Tests — ENTFERNT
// =============================================================================
// Die urspruenglichen Rate-Limiting-Bloecke ("Rate Limiting" + "Rate Limit
// Configs") testeten eine API, die im Anwendungs-Code nicht existiert:
//   - `checkRateLimit(key, config)` als exportierte, async Funktion mit
//     Rueckgabe `{ allowed, limit, remaining, retryAfter }` und einer Config
//     mit `windowSeconds`.
//   - `RATE_LIMIT_CONFIGS` mit Keys wie `default`, `aiGeneration`, `contact`,
//     `newsletter`.
// Tatsaechlich exportiert `lib/rate-limit.ts` nur `rateLimit`,
// `checkEndpointRateLimit`, `logSuspiciousActivity`, `isRedisAvailable` und
// `getRateLimitStatus`. `checkRateLimit` ist dort modul-privat, synchron und
// hat eine andere Signatur (Config mit `windowMs`); `RATE_LIMIT_CONFIGS` und
// die getesteten Werte (z. B. `windowSeconds`, `aiGeneration`, `contact`)
// existieren im gesamten Repo nicht. Da Anwendungs-Code nicht angefasst werden
// darf und keine Symbole erfunden werden sollen, wurden diese Bloecke entfernt.

// =============================================================================
// Error Codes Mapping Tests
// =============================================================================

describe('Error Code Mappings', () => {
  it('sollte alle Error Codes einen HTTP Status haben', () => {
    const errorCodes = Object.keys(ERROR_STATUS_CODES) as Array<keyof typeof ERROR_STATUS_CODES>;
    
    errorCodes.forEach(code => {
      const status = ERROR_STATUS_CODES[code];
      expect(typeof status).toBe('number');
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThanOrEqual(599);
    });
  });

  it('sollte alle Error Codes eine User-Message haben', () => {
    const errorCodes = Object.keys(USER_MESSAGES) as Array<keyof typeof USER_MESSAGES>;
    
    errorCodes.forEach(code => {
      const message = USER_MESSAGES[code];
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('sollte konsistente Mappings haben', () => {
    const statusCodes = Object.keys(ERROR_STATUS_CODES);
    const userMessages = Object.keys(USER_MESSAGES);
    
    expect(statusCodes.sort()).toEqual(userMessages.sort());
  });
});