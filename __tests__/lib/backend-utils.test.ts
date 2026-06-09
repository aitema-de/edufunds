/**
 * Tests für Logger, Error-Handling und Rate-Limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  APIError, 
  Errors, 
  withRetry, 
  ERROR_STATUS_CODES,
  USER_MESSAGES 
} from '../lib/errors';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../lib/rate-limit';

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
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('sollte erfolgreiche Operation ohne Retry ausführen', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('sollte bei Fehler retryen und schließlich erfolgreich sein', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce('success');
      
      const retryPromise = withRetry(operation, { 
        maxRetries: 3, 
        initialDelayMs: 1000 
      });
      
      // Erster Versuch schlägt fehl
      await vi.advanceTimersByTimeAsync(0);
      
 // Retry nach 1s
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await retryPromise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('sollte nach maxRetries aufgeben', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
      
      const retryPromise = withRetry(operation, { 
        maxRetries: 2, 
        initialDelayMs: 100 
      });
      
      // Alle Retries durchlaufen lassen
      await vi.advanceTimersByTimeAsync(500);
      
      await expect(retryPromise).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 Retries
    });

    it('sollte APIError isRetryable respektieren', async () => {
      const validationError = new APIError('VALIDATION_ERROR', 'Invalid');
      const operation = vi.fn().mockRejectedValue(validationError);
      
      await expect(withRetry(operation, { maxRetries: 3 }))
        .rejects.toThrow(validationError);
      
      // Sollte keinen Retry versuchen da nicht retryable
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Rate Limiting Tests
// =============================================================================

describe('Rate Limiting', () => {
  describe('checkRateLimit', () => {
    it('sollte ersten Request erlauben', async () => {
      const result = await checkRateLimit('test-ip-1', RATE_LIMIT_CONFIGS.default);
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
    });

    it('sollte Count inkrementieren', async () => {
      const config = { maxRequests: 5, windowSeconds: 60 };
      
      // 3 Requests
      await checkRateLimit('test-ip-2', config);
      await checkRateLimit('test-ip-2', config);
      const result = await checkRateLimit('test-ip-2', config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('sollte Limit blockieren', async () => {
      const config = { maxRequests: 2, windowSeconds: 60 };
      
      await checkRateLimit('test-ip-3', config);
      await checkRateLimit('test-ip-3', config);
      const result = await checkRateLimit('test-ip-3', config);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('sollte verschiedene Keys isolieren', async () => {
      const config = { maxRequests: 2, windowSeconds: 60 };
      
      // User A maxed out
      await checkRateLimit('user-a', config);
      await checkRateLimit('user-a', config);
      const resultA = await checkRateLimit('user-a', config);
      
      // User B sollte noch Zugriff haben
      const resultB = await checkRateLimit('user-b', config);
      
      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
      expect(resultB.remaining).toBe(1);
    });
  });

  describe('Rate Limit Configs', () => {
    it('sollte AI Generation Limits haben', () => {
      expect(RATE_LIMIT_CONFIGS.aiGeneration.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.aiGeneration.windowSeconds).toBe(60);
    });

    it('sollte Contact Limits haben', () => {
      expect(RATE_LIMIT_CONFIGS.contact.maxRequests).toBe(3);
      expect(RATE_LIMIT_CONFIGS.contact.windowSeconds).toBe(300);
    });

    it('sollte Newsletter Limits haben', () => {
      expect(RATE_LIMIT_CONFIGS.newsletter.maxRequests).toBe(5);
      expect(RATE_LIMIT_CONFIGS.newsletter.windowSeconds).toBe(3600);
    });
  });
});

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