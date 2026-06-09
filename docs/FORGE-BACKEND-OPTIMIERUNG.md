# FORGE Backend-Optimierung

## Übersicht

Diese Dokumentation beschreibt die Backend-Optimierungen für das EduFunds-Projekt, die im Rahmen des FORGE-Sprints implementiert wurden.

---

## 1. Logging-System (`lib/logger.ts`)

### Features

- **Strukturierte Logs** im JSON-Format für Produktion
- **Farbige Konsolenausgaben** für Entwicklung
- **Log-Levels**: debug, info, warn, error, fatal
- **Request-Korrelation** über `requestId`
- **Automatische Performance-Messung**

### Verwendung

```typescript
import { createLogger, withTiming } from '@/lib/logger';

// Logger erstellen
const logger = createLogger('MyService');

// Mit Kontext
const requestLogger = logger.withContext({ userId: '123', requestId: 'abc' });

// Logging Levels
logger.debug('Debug Information');
logger.info('User logged in', { userId: '123' });
logger.warn('Rate limit approaching', { current: 95, limit: 100 });
logger.error('Database connection failed', { host: 'db.example.com' }, error);

// Request/Response Logging
logger.request('POST', '/api/contact', { ip: '1.2.3.4' });
logger.response('POST', '/api/contact', 200, 150, { userId: '123' });

// Performance-Messung
const result = await withTiming(
  'databaseQuery',
  () => db.query('SELECT * FROM users'),
  logger,
  { table: 'users' }
);
```

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `LOG_LEVEL` | Minimales Log-Level | `debug` (dev), `info` (prod) |
| `SERVICE_NAME` | Service-Name in Logs | `edufunds-api` |

### Log-Formate

**Entwicklung (farbige Ausgabe):**
```
14:32:15.123 INFO  [API] POST /api/contact 200 150ms
14:32:15.456 WARN  [DB] Slow query detected {"duration": 2345}
```

**Produktion (JSON für ELK/CloudWatch):**
```json
{
  "timestamp": "2024-01-15T14:32:15.123Z",
  "level": "info",
  "message": "[API] POST /api/contact",
  "service": "edufunds-api",
  "environment": "production",
  "metadata": {
    "method": "POST",
    "path": "/api/contact",
    "status": 200,
    "duration": 150
  }
}
```

---

## 2. Error-Handling (`lib/errors.ts`)

### Features

- **Strukturierte API-Errors** mit einheitlichem Format
- **HTTP-Status Code Mapping**
- **Nutzerfreundliche Fehlermeldungen**
- **Retry-Logik** für externe APIs
- **Request-ID Tracking** für Debugging

### Error Codes

| Code | HTTP Status | Bedeutung |
|------|-------------|-----------|
| `VALIDATION_ERROR` | 400 | Ungültige Eingabedaten |
| `UNAUTHORIZED` | 401 | Nicht angemeldet |
| `FORBIDDEN` | 403 | Keine Berechtigung |
| `NOT_FOUND` | 404 | Ressource nicht gefunden |
| `CONFLICT` | 409 | Konflikt (z.B. Duplicate) |
| `RATE_LIMITED` | 429 | Zu viele Anfragen |
| `SERVICE_UNAVAILABLE` | 503 | Service nicht verfügbar |
| `AI_UNAVAILABLE` | 503 | KI-Service nicht verfügbar |
| `AI_RATE_LIMIT` | 429 | KI-Rate-Limit erreicht |
| `DB_CONNECTION_ERROR` | 503 | Datenbank-Verbindungsfehler |

### Verwendung

```typescript
import { APIError, Errors, withRetry, createErrorResponse } from '@/lib/errors';

// Factory-Funktionen nutzen
throw Errors.validation('Email ungültig', { fields: [{ field: 'email', message: '...' }] });
throw Errors.notFound('Förderprogramm', 'bmbf-123');
throw Errors.rateLimit(60); // Retry-After: 60s
throw Errors.aiUnavailable(originalError);

// Custom APIError
throw new APIError('VALIDATION_ERROR', 'Spezifischer Fehler', {
  details: { custom: 'data' },
  requestId: 'req-123',
  isRetryable: false
});

// Retry-Logik für externe APIs
const result = await withRetry(
  async () => {
    return await fetchExternalAPI(data);
  },
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} nach ${delay}ms: ${error.message}`);
    }
  }
);

// Error Response erstellen
return createErrorResponse(error, requestId, corsHeaders);
```

### Retry-Strategie

- **Exponentieller Backoff**: 1s, 2s, 4s, ...
- **Jitter**: +0-20% Zufall um Thundering Herd zu vermeiden
- **Max Delay**: 30s
- **Retryable Status Codes**: 408, 429, 500, 502, 503, 504
- **Retryable Errors**: ECONNRESET, ETIMEDOUT, ECONNREFUSED, ENOTFOUND

---

## 3. Rate-Limiting (`lib/rate-limit.ts`)

### Features

- **Redis-basiert** für verteilte Systeme
- **In-Memory Fallback** wenn Redis nicht verfügbar
- **Sliding Window Algorithmus**
- **Flexible Konfiguration** pro Endpoint
- **IP-basiert oder User-basiert**

### Standard-Konfigurationen

| Endpoint | Max Requests | Window | Beschreibung |
|----------|-------------|--------|--------------|
| `default` | 100 | 60s | Generische API |
| `aiGeneration` | 5 | 60s | KI-Generierung (ressourcenintensiv) |
| `contact` | 3 | 300s | Kontaktformular (5 Min) |
| `newsletter` | 5 | 3600s | Newsletter (1 Stunde) |
| `payment` | 10 | 60s | Zahlungen |
| `admin` | 30 | 60s | Admin-Endpoints |

### Umgebungsvariablen

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `REDIS_URL` | Redis Connection String | `redis://localhost:6379` |

### Verwendung

```typescript
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS, withRateLimit } from '@/lib/rate-limit';

// In API Route
export async function POST(request: NextRequest) {
  // Rate-Limit Check
  const { allowed, result, headers } = await rateLimitMiddleware(request, {
    configName: 'contact', // Nutze vordefinierte Config
  });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
      { status: 429, headers }
    );
  }

  // ... Handler Logik
  
  // Headers zum Response hinzufügen
  const response = NextResponse.json({ success: true });
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Mit Decorator
export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Handler Logik
    return NextResponse.json({ success: true });
  },
  { configName: 'aiGeneration' }
);

// Custom Config
const customConfig = {
  maxRequests: 10,
  windowSeconds: 120,
  keyPrefix: 'custom',
  keyGenerator: (req) => req.headers.get('x-api-key') || 'anonymous'
};
```

### Rate-Limit Headers

Jede Response enthält:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
Retry-After: 45  (nur bei 429)
```

### Fallback-Verhalten

Falls Redis nicht verfügbar ist:
1. Automatisches Fallback auf In-Memory Store
2. Warnung im Log
3. Kein Datenverlust zwischen Instanzen (erwartetes Verhalten)
4. Automatischer Wechsel zurück zu Redis wenn verfügbar

---

## 4. Beispiel-Implementierung

Siehe `app/api/contact/route-refactored.ts` für eine vollständige Beispiel-Implementierung mit:

- ✅ Logger-Nutzung
- ✅ Error-Handling
- ✅ Rate-Limiting
- ✅ Retry-Logik
- ✅ CORS-Handling
- ✅ Spam-Schutz (Honeypot)

### Migration bestehender Routes

1. **Importe hinzufügen:**
```typescript
import { createLogger } from '@/lib/logger';
import { Errors, withRetry, createErrorResponse, createCorsHeaders } from '@/lib/errors';
import { rateLimitMiddleware } from '@/lib/rate-limit';
```

2. **Logger initialisieren:**
```typescript
const logger = createLogger('ServiceName');
```

3. **Rate-Limiting hinzufügen:**
```typescript
const { allowed, result, headers } = await rateLimitMiddleware(request, {
  configName: 'default',
});
if (!allowed) { /* ... */ }
```

4. **Error-Handling verbessern:**
```typescript
try {
  // ...
} catch (error) {
  logger.error('Operation failed', {}, error as Error);
  return createErrorResponse(error, requestId, corsHeaders);
}
```

---

## 5. Test-Abdeckung

Die Tests befinden sich in `__tests__/lib/backend-utils.test.ts`:

```bash
# Alle Tests ausführen
npm test

# Spezifische Tests
npm test backend-utils
```

### Test-Kategorien

- **Error Handling**: APIError Erstellung, Factory Functions, Retry-Logik
- **Rate Limiting**: Check-Logik, Limits, Isolation
- **Error Code Mappings**: Konsistenzprüfungen

---

## 6. Checkliste für neue API Routes

- [ ] Logger initialisiert
- [ ] Rate-Limiting konfiguriert
- [ ] Error-Handling mit `createErrorResponse`
- [ ] CORS-Headers gesetzt
- [ ] Retry-Logik für externe APIs
- [ ] Performance-Logging mit `withTiming`
- [ ] Request-ID Tracking
- [ ] Tests geschrieben

---

## 7. Monitoring & Alerting

### Wichtige Metriken

| Metrik | Warnung | Kritisch |
|--------|---------|----------|
| Error Rate | > 5% | > 10% |
| P95 Response Time | > 500ms | > 1000ms |
| Rate Limit Hits | > 10/min | > 50/min |
| Redis Connection Errors | > 0 | > 5/h |

### Log-Queries (CloudWatch/ELK)

```json
// Alle Errors
{ "level": "error" }

// Rate Limiting Events
{ "message": "*Rate limit*" }

// Langsame Queries
{ "duration": { "$gt": 1000 } }

// Retry-Events
{ "message": "*Retry*" }
```

---

## 8. Zusammenfassung

| Feature | Datei | Status |
|---------|-------|--------|
| Logger | `lib/logger.ts` | ✅ Implementiert |
| Error-Handling | `lib/errors.ts` | ✅ Implementiert |
| Rate-Limiting | `lib/rate-limit.ts` | ✅ Implementiert |
| Beispiel-Route | `app/api/contact/route-refactored.ts` | ✅ Implementiert |
| Tests | `__tests__/lib/backend-utils.test.ts` | ✅ Implementiert |
| Dokumentation | `docs/FORGE-BACKEND-OPTIMIERUNG.md` | ✅ Fertig |

### Nächste Schritte

1. Bestehende API-Routes nach und nach migrieren
2. Redis für Produktion einrichten
3. Monitoring-Dashboard erstellen
4. Alerting konfigurieren