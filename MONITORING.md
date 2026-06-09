# Monitoring Dashboard - Implementierung

## Übersicht

Ein umfassendes Monitoring-Dashboard für EduFunds, das System-Health-Metriken in Echtzeit anzeigt.

## Erstellte Dateien

### 1. `lib/monitoring.ts`
Zentrale Monitoring-Bibliothek mit:
- **Logger**: Strukturiertes Logging mit Datei-Rotation
- **MetricsStore**: In-Memory Speicher für API-Calls und Metriken
- **Alerting**: Automatische Erkennung von Problemen (DB-Down, hohe Fehlerrate, etc.)
- **System Metrics**: Uptime, Latenz, Speicherverbrauch
- **E-Mail Templates**: Vorbereitete Alert-E-Mails

Features:
- Tägliche Log-Rotation
- 30 Tage Log-Aufbewahrung
- Alert bei Error-Rate > 5%
- Alert bei DB nicht erreichbar (Kritisch)

### 2. `app/api/health/dashboard/route.ts`
API Endpoint: `GET /api/health/dashboard`

Query Parameter:
- `format`: 'full' | 'metrics' (default: 'full')
- `logs`: Anzahl der Logs (default: 10)

Response:
```json
{
  "status": "healthy|warning|critical",
  "statusCode": 200,
  "timestamp": "2026-02-13T14:17:00.202Z",
  "metrics": {
    "uptime": 40000,
    "dbStatus": "connected|disconnected|error",
    "dbLatency": 15,
    "apiLatency": 45,
    "errorRate": 2.5,
    "totalRequests": 1500,
    "errorCount": 37,
    "memoryUsage": { "used": 54, "total": 70, "percentage": 77 }
  },
  "alerts": [...],
  "apiCalls": [...],
  "logs": [...]
}
```

### 3. `app/admin/dashboard/page.tsx`
Dashboard UI unter `/admin/dashboard`

Features:
- **Status Cards**: System-Status, DB-Status, Fehlerrate, API Calls
- **Metriken**: Speicherverbrauch, Latenzen
- **API Calls Tabelle**: Letzte 10 Calls mit Methoden, Pfaden, Statuscodes
- **Fehler-Log**: Letzte Fehler mit Level und Zeitstempel
- **Active Alerts**: Anzeige und Bestätigung von Alerts
- **Auto-Refresh**: Alle 30 Sekunden
- **Responsive Design**: Funktioniert auf allen Bildschirmgrößen

## Status-Farben

| Status | Bedingung | Farbe |
|--------|-----------|-------|
| Gesund | DB verbunden & Error-Rate < 5% | Grün |
| Warnung | Error-Rate 5-10% oder Memory > 85% | Gelb |
| Kritisch | DB nicht verbunden oder Error-Rate > 10% | Rot |

## Verwendung

### Dashboard aufrufen
```
http://localhost:3101/admin/dashboard
```

### API abfragen
```bash
# Vollständige Daten
curl http://localhost:3101/api/health/dashboard

# Nur Metriken
curl http://localhost:3101/api/health/dashboard?format=metrics

# Mit mehr Logs
curl http://localhost:3101/api/health/dashboard?logs=50
```

### Logging im Code
```typescript
import { logger } from '@/lib/monitoring';

logger.info('Nachricht', { context: 'value' });
logger.error('Fehler aufgetreten', { error: err.message });
```

### API Calls tracken
```typescript
import { trackApiCall } from '@/lib/monitoring';

// Am Ende eines API Handlers
trackApiCall('GET', '/api/users', 200, 45, userAgent, ip);
```

## Log-Verzeichnis

Logs werden gespeichert in:
```
./logs/app-YYYY-MM-DD.log
```

Format (JSON):
```json
{
  "timestamp": "2026-02-13T14:17:00.202Z",
  "level": "error",
  "message": "Database connection failed",
  "context": { "error": "..." },
  "source": "monitoring"
}
```

## Alert-Konfiguration

Aktive Alerts:

| ID | Bedingung | Schweregrad |
|----|-----------|-------------|
| high-error-rate | Fehlerrate > 5% | Warning |
| db-disconnected | DB nicht erreichbar | Critical |
| high-db-latency | DB Latenz > 1000ms | Warning |
| high-memory-usage | Memory > 90% | Warning |

## Nächste Schritte (Optional)

1. **Authentifizierung**: Admin-Login für Dashboard-Zugriff
2. **Datenbank**: API-Calls in PostgreSQL persistieren
3. **E-Mail-Versand**: Resend-Integration für Alert-E-Mails
4. **Historie**: Metriken über Zeit speichern (Prometheus/InfluxDB)
5. **Grafana**: Externe Dashboard-Integration

## Erfolgskriterien ✅

- [x] Dashboard erreichbar unter `/admin/dashboard`
- [x] Alle Metriken werden angezeigt
- [x] Auto-Refresh funktioniert (30s)
- [x] Fehler werden rot markiert
- [x] API liefert JSON-Daten
- [x] Logging in Dateien
- [x] Alert-System implementiert
