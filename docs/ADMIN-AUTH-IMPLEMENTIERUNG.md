# Admin-Auth Implementierung

## Übersicht

JWT-basierte Admin-Authentifizierung mit sicheren HTTP-only Cookies für die EduFunds-Plattform.

## Security-Features

- **HS256 JWT Tokens** mit 24h Ablaufzeit
- **HTTP-only, Secure Cookies** (SameSite=strict)
- **Rate Limiting**: 5 Login-Versuche pro 15 Minuten
- **CORS-Protection**: Strikte Origin-Validierung
- **Legacy-Support**: API-Keys für bestehende Integrationen

## API-Endpunkte

### POST /api/admin/login

Admin-Login mit E-Mail und Passwort.

**Request:**
```json
{
  "email": "admin@edufunds.org",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login erfolgreich",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "1",
    "email": "admin@edufunds.org",
    "role": "superadmin"
  }
}
```

**Fehler:**
- 400: Fehlende Anmeldedaten
- 401: Ungültige Anmeldedaten
- 429: Zu viele Versuche (Rate Limit)

### POST /api/admin/logout

Löscht die Session.

**Response:**
```json
{
  "success": true,
  "message": "Logout erfolgreich"
}
```

### Geschützte Routen

Admin-Routen erfordern gültige Authentifizierung:

```typescript
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }
  
  // Admin ist authResult.admin
  // ... Route-Logik
}
```

## Konfiguration

### Umgebungsvariablen (.env)

```bash
# JWT Secret (mindestens 32 Zeichen)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Admin Credentials (für Demo - in Production: Datenbank)
ADMIN_EMAIL=admin@edufunds.org
ADMIN_PASSWORD=change-me-in-production

# Legacy API Key (für bestehende Integrationen)
NEWSLETTER_ADMIN_KEY=your-secure-api-key
```

### CORS-Konfiguration

```bash
# Production Origins
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## CORS-Policy

### Erlaubte Origins

**Production:**
- `https://edufunds.org`
- `https://www.edufunds.org`
- `https://app.edufunds.org`
- `*.edufunds.org` (Subdomains)

**Development:**
- `http://localhost:3000`
- `http://localhost:3101`

### Implementierung

```typescript
import { getCorsHeaders, isOriginAllowed } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // ... Route-Logik
  
  return NextResponse.json(data, { headers: corsHeaders });
}
```

## Auth-Methoden (Priorität)

1. **JWT Cookie** (`admin_session`)
2. **Authorization Header** (`Bearer <token>`)
3. **Legacy API Key** (`X-Admin-Key`)

## Frontend-Integration

### Login

```typescript
const login = async (email: string, password: string) => {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // Wichtig für Cookies
  });
  
  return response.json();
};
```

### Geschützte Requests

```typescript
const fetchData = async () => {
  const response = await fetch('/api/admin/data', {
    credentials: 'include', // Cookie automatisch mitsenden
  });
  
  if (response.status === 401) {
    // Redirect to login
  }
  
  return response.json();
};
```

## Security-Hinweise

### Vor Production

1. **JWT_SECRET** setzen (mindestens 32 Zeichen, zufällig)
2. **ADMIN_PASSWORD** ändern
3. **NEWSLETTER_ADMIN_KEY** rotieren
4. **Datenbank-Integration** implementieren (statt harcodierter Credentials)
5. **Passwort-Hashing** mit bcrypt hinzufügen

### Monitoring

Login-Versuche werden geloggt:
```
[Admin Login] Erfolgreich: admin@edufunds.org von 192.168.1.1
[Admin Login] Fehlgeschlagen: invalid@example.com von 192.168.1.1
```

## Migration von API-Keys zu JWT

Bestehende API-Keys funktionieren weiterhin über den `X-Admin-Key` Header:

```bash
curl -H "X-Admin-Key: your-api-key" \
     https://edufunds.org/api/newsletter/send
```

Für neue Integrationen wird JWT empfohlen:

```bash
# Login
curl -c cookies.txt \
     -d '{"email":"admin@edufunds.org","password":"..."}' \
     https://edufunds.org/api/admin/login

# Geschützte Route
curl -b cookies.txt \
     https://edufunds.org/api/newsletter/send
```

## Dateien

- `lib/admin-auth.ts` - Auth-Logik
- `lib/cors.ts` - CORS-Konfiguration
- `app/api/admin/login/route.ts` - Login-Endpoint
- `app/api/admin/logout/route.ts` - Logout-Endpoint
