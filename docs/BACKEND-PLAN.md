# EduFunds Backend Plan

> **Status:** Planungsphase  
> **Letzte Aktualisierung:** 9. Februar 2026  
> **Zweck:** Technologie-Entscheidungen, API-Spezifikation, Implementierungs-Roadmap

---

## 1. Executive Summary

### Problemstellung
Alle API-Endpunkte im Frontend geben aktuell **405 Not Allowed** zurück, da kein Backend existiert. Das Frontend ist vorbereitet für API-Calls, aber es gibt keine entsprechenden Handler.

### Benötigte Endpunkte
| Endpunkt | Methode | Zweck |
|----------|---------|-------|
| `/api/newsletter` | POST | Newsletter-Anmeldung |
| `/api/contact` | POST | Kontaktformular |
| `/api/assistant` | POST | KI-Antragsgenerierung |
| `/api/generate-pdf` | POST | PDF-Generierung (Server-seitig) |
| `/api/programs` | GET | Förderprogramme (optional) |

---

## 2. Technologie-Optionen Evaluation

### Option A: Next.js API Routes (Serverless)

**Beschreibung:** Nutzung der eingebauten Next.js API Routes im `app/api` Verzeichnis.

**Pros:**
- ✅ Kein separates Backend nötig - alles in einem Codebase
- ✅ Einfache Deployment mit Next.js (Vercel, selbst gehostet)
- ✅ Automatisches Code-Sharing zwischen Frontend und API
- ✅ Built-in TypeScript Support
- ✅ Geringste Komplexität für aktuelles Setup

**Cons:**
- ❌ Begrenzte Ausführungszeit (Serverless Functions)
- ❌ Cold Start Latenz bei selten genutzten Endpunkten
- ❌ Eingeschränkte Persistenz-Optionen (kein lokales Dateisystem)
- ❌ Skalierungslimits bei sehr hohem Traffic

**Aufwand:** 🔵 **Niedrig** (1-2 Tage)

**Hosting-Anforderungen:**
- Vercel (optimal für Serverless)
- Node.js Server mit `next start`
- Docker Container mit Next.js

**Kosten:**
| Provider | Kosten (geschätzt) |
|----------|-------------------|
| Vercel Hobby | Kostenlos (mit Limits) |
| Vercel Pro | $20/Monat |
| Eigenes Hosting | Serverkosten (~5-20€/Monat) |

---

### Option B: Express.js Server (Node.js)

**Beschreibung:** Separater Express.js Server als eigenständiges Backend.

**Pros:**
- ✅ Vollständige Kontrolle über Server-Logik
- ✅ Langlaufende Prozesse möglich (z.B. für KI-Streaming)
- ✅ Einfache Integration von Middleware
- ✅ Bessere Persistenz-Optionen
- ✅ Entkopplung von Frontend-Deployment

**Cons:**
- ❌ Zwei separate Codebases zu warten
- ❌ Höhere Deployment-Komplexität
- ❌ CORS-Konfiguration notwendig
- ❌ Mehr Infrastruktur-Overhead

**Aufwand:** 🟡 **Mittel** (3-5 Tage)

**Hosting-Anforderungen:**
- Node.js Server (VPS oder Cloud)
- PM2 oder systemd für Process Management
- Reverse Proxy (nginx/traefik)

**Kosten:**
| Provider | Kosten (geschätzt) |
|----------|-------------------|
| Hetzner CX21 | 5,35€/Monat |
| DigitalOcean Droplet | $6/Monat |
| AWS EC2 t3.micro | ~$8/Monat |

---

### Option C: Python FastAPI

**Beschreibung:** Python-basiertes Backend mit FastAPI Framework.

**Pros:**
- ✅ Ausgezeichnete Performance (async/await)
- ✅ Automatische OpenAPI/Swagger Dokumentation
- ✅ Starke KI/ML-Ökosystem-Integration (OpenAI, etc.)
- ✅ Type Validation mit Pydantic
- ✅ Gute Wahl für KI-lastige Anwendungen

**Cons:**
- ❌ Andere Technologie als Frontend (React/Next.js)
- ❌ Zusätzliches Team-Know-how notwendig
- ❌ Separate Deployment-Pipeline
- ❌ KompLEXere lokale Entwicklungsumgebung

**Aufwand:** 🟡 **Mittel-Hoch** (4-6 Tage)

**Hosting-Anforderungen:**
- Python Server mit Uvicorn/Gunicorn
- Ähnlich wie Express.js Hosting

**Kosten:**
- Ähnlich wie Option B (~5-20€/Monat)

---

### Option D: Serverless Functions (Vercel, Netlify, AWS Lambda)

**Beschreibung:** Reine Serverless-Architektur ohne persistenten Server.

**Pros:**
- ✅ Keine Server-Verwaltung
- ✅ Automatische Skalierung
- ✅ Pay-per-Use (kosteneffektiv bei geringem Traffic)
- ✅ Globale Edge-Deployment-Optionen

**Cons:**
- ❌ Cold Start Problematik
- ❌ Begrenzte Ausführungszeit (API-Gateway: 30s, Lambda: 15min)
- ❌ Komplexere lokale Entwicklung
- ❌ Vendor Lock-in

**Aufwand:** 🔵 **Niedrig-Mittel** (2-3 Tage)

**Hosting-Anforderungen:**
- Vercel Functions
- Netlify Functions
- AWS Lambda + API Gateway

**Kosten:**
| Provider | Kosten (geschätzt) |
|----------|-------------------|
| Vercel | Kostenlos - $20/Monat |
| Netlify | Kostenlos - $19/Monat |
| AWS Lambda | ~$0.20 pro 1M Requests |

---

## 3. Empfohlene Entscheidung

### 🏆 Gewinner: Option A - Next.js API Routes

**Begründung:**
1. **Einfachheit:** Aktuelles Setup (Next.js) kann direkt erweitert werden
2. **Zeitersparnis:** Keine neue Infrastruktur notwendig
3. **Kosten:** Kann auf bestehendem Server laufen oder kostenlos bei Vercel
4. **Wartung:** Einheitliche Codebase, ein Deployment-Prozess
5. **Anforderungen:** Aktuelle Anforderungen (Newsletter, Kontakt, KI, PDF) sind gut handhabbar

**Alternative für später:** Wenn das Projekt stark wächst oder komplexe KI-Features hinzukommen, kann später auf Option B (Express.js) oder Option C (FastAPI) migriert werden.

---

## 4. Datenbank & Speicher

### 4.1 Newsletter-Einträge

**Entscheidung:** Speichern in SQLite (lokal) oder PostgreSQL (produktion)

**Struktur:**
```typescript
interface NewsletterEntry {
  id: string;           // UUID
  email: string;        // Validated email
  name?: string;        // Optional
  subscribedAt: Date;   // Timestamp
  source: string;       // 'homepage', 'footer', etc.
  confirmed: boolean;   // Double opt-in status
  ipAddress: string;    // For GDPR compliance
  userAgent: string;    // For analytics
}
```

**Speicher-Optionen:**
| Option | Use Case |
|--------|----------|
| SQLite | Lokal/Entwicklung, geringes Volumen |
| PostgreSQL | Produktion, hohe Zuverlässigkeit |
| Supabase | Managed PostgreSQL, kostenlos bis 500MB |

### 4.2 Kontaktanfragen

**Entscheidung:** Speichern in derselben Datenbank wie Newsletter

**Struktur:**
```typescript
interface ContactRequest {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: Date;
  status: 'new' | 'in_progress' | 'answered' | 'spam';
  ipAddress: string;
  userAgent: string;
}
```

### 4.3 Dateispeicher für PDFs

**Entscheidung:** Keine serverseitige Speicherung - PDFs werden clientseitig generiert und direkt heruntergeladen.

**Begründung:**
- Kein Persistenz-Bedarf (User lädt sofort herunter)
- Datenschutz (keine sensiblen Daten auf Server)
- Kosteneinsparung (kein S3/Storage nötig)

**Fallback:** Falls serverseitige Generierung nötig:
- Lokales Temp-Verzeichnis (bei Next.js API Routes)
- AWS S3 (bei größerem Bedarf)

---

## 5. Externe Services

### 5.1 E-Mail-Versand

**Optionen:**
| Service | Kosten | Vorteile | Nachteile |
|---------|--------|----------|-----------|
| **Resend** (Empfohlen) | 100/day free, dann $0.0001/email | Einfache Integration, gute Deliverability | Relativ neu |
| **SendGrid** | 100/day free, dann $14.95/Monat | Etabliert, umfangreiche Features | Komplexe API |
| **AWS SES** | $0.10 per 1000 emails | Sehr günstig bei Volumen | Komplexes Setup |
| **Mailgun** | 5000/month free (3 Monate) | Gute Dokumentation | Dann relativ teuer |

**Empfehlung:** Resend für den Start (kostenlos, einfach)

### 5.2 KI-Integration

**Optionen:**
| Service | Kosten | Use Case |
|---------|--------|----------|
| **OpenAI GPT-4** | ~$0.03-0.06/1K tokens | Hochwertige Textgenerierung |
| **OpenAI GPT-3.5** | ~$0.0015/1K tokens | Kostengünstige Alternative |
| **Anthropic Claude** | Ähnlich wie OpenAI | Alternative Qualität |
| **Local LLM (Ollama)** | Kostenlos (eigene Hardware) | Datenschutz, keine API-Kosten |

**Empfehlung:** OpenAI GPT-4 für Produktion, mit Fallback zu Mock-Generierung bei API-Fehlern

### 5.3 PDF-Generierung

**Optionen:**
| Lösung | Methode | Vor-/Nachteile |
|--------|---------|----------------|
| **Client-seitig (html2pdf.js)** | Browser-Rendering | ✅ Einfach, ✅ Kein Server-Load, ❌ Qualität variiert |
| **Puppeteer (Server)** | Chrome Headless | ✅ Hochqualität, ❌ Server-Load, ❌ Zeitlimit |
| **PDF-Lib** | Programmatisch | ✅ Schnell, ❌ Komplexes Layout |
| **Playwright** | Modernes Puppeteer | ✅ Aktuell, ❌ Höherer Ressourcenbedarf |

**Empfehlung:** Client-seitig beibehalten, serverseitige Option für komplexe Templates als Backup

---

## 6. Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EduFunds Architecture                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Client          │
│  (Next.js Frontend)  │
├──────────────────────┤
│ • React Components   │
│ • html2pdf.js        │
│ • Client-side state  │
└──────────┬───────────┘
           │ HTTP Requests
           ▼
┌──────────────────────┐
│   Next.js API Routes │  ◄── Empfohlene Architektur
├──────────────────────┤
│ • /api/newsletter    │     POST → DB + Email Service
│ • /api/contact       │     POST → DB + Email Service
│ • /api/assistant     │     POST → OpenAI API
│ • /api/generate-pdf  │     POST → Puppeteer (optional)
│ • /api/programs      │     GET  → JSON/DB
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌────────┐  ┌──────────────┐
│SQLite/ │  │External APIs │
│Postgres│  ├──────────────┤
└────────┘  │• OpenAI      │
            │• Resend      │
            │(SendGrid)    │
            └──────────────┘
```

### Datenfluss: Newsletter-Anmeldung

```
┌─────────┐    POST /api/newsletter    ┌──────────────┐
│  User   │ ──────────────────────────>│  API Route   │
│ Browser │    {email, name}           │  (Next.js)   │
└─────────┘                            └──────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
            │  Validation │          │  Database   │           │   Email     │
            │   (Zod)     │          │  (SQLite)   │           │  (Resend)   │
            └─────────────┘          └─────────────┘           └─────────────┘
                                              │                         │
                                              ▼                         ▼
                                       ┌─────────────┐           ┌─────────────┐
                                       │ Save Entry  │           │ Send Conf.  │
                                       └─────────────┘           └─────────────┘
```

---

## 7. API-Spezifikation

### 7.1 POST /api/newsletter

**Beschreibung:** Newsletter-Anmeldung mit Double Opt-in

**Request:**
```typescript
POST /api/newsletter
Content-Type: application/json

{
  "email": "max.mustermann@schule.de",
  "name": "Max Mustermann",           // optional
  "source": "homepage"                // optional, default: 'footer'
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bitte bestätigen Sie Ihre Anmeldung über den Link in der E-Mail.",
  "data": {
    "id": "uuid-here",
    "email": "max.mustermann@schule.de",
    "status": "pending_confirmation"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Ungültige E-Mail-Adresse",
  "code": "INVALID_EMAIL"
}
```

**Response (409 Conflict):**
```json
{
  "success": false,
  "error": "Diese E-Mail ist bereits angemeldet",
  "code": "ALREADY_SUBSCRIBED"
}
```

---

### 7.2 POST /api/contact

**Beschreibung:** Kontaktformular-Submission

**Request:**
```typescript
POST /api/contact
Content-Type: application/json

{
  "name": "Max Mustermann",
  "email": "max.mustermann@schule.de",
  "subject": "Anfrage zu Förderprogramm",
  "message": "Ich habe eine Frage zu...",
  "honeypot": ""                        // Spam-Falle (muss leer sein)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Ihre Nachricht wurde erfolgreich versendet. Wir melden uns bald bei Ihnen.",
  "data": {
    "ticketId": "CONT-2026-001"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Bitte füllen Sie alle Pflichtfelder aus",
  "code": "MISSING_FIELDS",
  "fields": ["message"]
}
```

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "error": "Zu viele Anfragen. Bitte warten Sie 5 Minuten.",
  "code": "RATE_LIMITED",
  "retryAfter": 300
}
```

---

### 7.3 POST /api/assistant

**Beschreibung:** KI-Antragsgenerierung

**Request:**
```typescript
POST /api/assistant
Content-Type: application/json

{
  "programId": "program-uuid",
  "projektDaten": {
    "schulname": "Gymnasium Musterstadt",
    "projekttitel": "Digitalisierung des MINT-Unterrichts",
    "kurzbeschreibung": "...",
    "ziele": "...",
    "zielgruppe": "...",
    "zeitraum": "01.09.2025 - 31.08.2026",
    "hauptaktivitaeten": "...",
    "ergebnisse": "...",
    "nachhaltigkeit": "...",
    "foerderbetrag": "50000"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "antrag": "# FÖRDERANTRAG\n\n## Digitalisierung des MINT-Unterrichts...",
    "model": "gpt-4-turbo-preview",
    "tokensUsed": 1250,
    "generationTime": 3.2
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "success": false,
  "error": "KI-Service temporär nicht verfügbar",
  "code": "AI_UNAVAILABLE",
  "fallback": true,
  "data": {
    "antrag": "... (Fallback-Generierung)"
  }
}
```

---

### 7.4 POST /api/generate-pdf

**Beschreibung:** Serverseitige PDF-Generierung (optional)

**Request:**
```typescript
POST /api/generate-pdf
Content-Type: application/json

{
  "content": "<html>...</html>",        // HTML-Inhalt
  "filename": "Foerderantrag_Projekt.pdf",
  "format": "A4",                       // optional
  "margin": {                           // optional
    "top": "20mm",
    "right": "20mm",
    "bottom": "20mm",
    "left": "20mm"
  }
}
```

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Foerderantrag_Projekt.pdf"

[Binary PDF Data]
```

---

### 7.5 GET /api/programs

**Beschreibung:** Förderprogramme abrufen (mit Filter-Optionen)

**Request:**
```typescript
GET /api/programs?category=mint&foerdergeberTyp=bund&limit=10
```

**Query Parameters:**
| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `category` | string | Filter nach Kategorie |
| `foerdergeberTyp` | string | bund, land, stiftung, eu |
| `search` | string | Volltext-Suche |
| `limit` | number | Maximale Ergebnisse (default: 50) |
| `offset` | number | Pagination Offset |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": "uuid",
        "name": "MINT-Förderung 2025",
        "foerdergeber": "BMBF",
        "foerdergeberTyp": "bund",
        "kategorien": ["mint", "digitalisierung"],
        "foerdersummeText": "bis 50.000 €",
        "bewerbungsfrist": "2025-06-30"
      }
    ],
    "total": 150,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 8. Implementierungs-Reihenfolge

### Phase 1: Foundation (Woche 1)
- [ ] **Task 1.1:** Datenbank-Setup (SQLite lokal, PostgreSQL für Prod)
- [ ] **Task 1.2:** Basis API-Route Struktur in `app/api/`
- [ ] **Task 1.3:** Zod Schema-Validierung für alle Endpunkte
- [ ] **Task 1.4:** Error Handling Middleware

### Phase 2: Newsletter & Kontakt (Woche 1-2)
- [ ] **Task 2.1:** POST /api/newsletter implementieren
- [ ] **Task 2.2:** E-Mail-Service Integration (Resend)
- [ ] **Task 2.3:** Double Opt-in Flow
- [ ] **Task 2.4:** POST /api/contact implementieren
- [ ] **Task 2.5:** Rate Limiting (5 Minuten pro IP)
- [ ] **Task 2.6:** Spam-Protection (Honeypot)

### Phase 3: KI-Integration (Woche 2)
- [ ] **Task 3.1:** POST /api/assistant implementieren
- [ ] **Task 3.2:** OpenAI API Integration
- [ ] **Task 3.3:** Prompt-Engineering Optimierung
- [ ] **Task 3.4:** Fallback zu Mock-Generierung bei API-Fehlern
- [ ] **Task 3.5:** Token-Usage Tracking

### Phase 4: PDF & Programme (Woche 2-3)
- [ ] **Task 4.1:** POST /api/generate-pdf (optional, serverseitig)
- [ ] **Task 4.2:** GET /api/programs implementieren
- [ ] **Task 4.3:** Pagination & Filterung
- [ ] **Task 4.4:** Caching für Programme (Redis/Node-Cache)

### Phase 5: Testing & Security (Woche 3)
- [ ] **Task 5.1:** Unit Tests für alle API Routes
- [ ] **Task 5.2:** Rate Limiting auf allen Endpunkten
- [ ] **Task 5.3:** Input Sanitization (XSS-Schutz)
- [ ] **Task 5.4:** CORS-Konfiguration
- [ ] **Task 5.5:** Security Headers (Helmet)

### Phase 6: Deployment (Woche 3-4)
- [ ] **Task 6.1:** Environment Variables Setup
- [ ] **Task 6.2:** Docker Compose Update
- [ ] **Task 6.3:** Backup-Strategie für Datenbank
- [ ] **Task 6.4:** Monitoring (Health Checks)
- [ ] **Task 6.5:** Dokumentation aktualisieren

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"                    # SQLite (Dev)
# DATABASE_URL="postgresql://..."               # PostgreSQL (Prod)

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@edufunds.org"
RESEND_FROM_NAME="EduFunds"

# AI (OpenAI)
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4-turbo-preview"
OPENAI_FALLBACK_MODEL="gpt-3.5-turbo"

# Security
API_RATE_LIMIT="100"                            # Requests per minute
API_SECRET="random-secret-for-internal-calls"

# Feature Flags
ENABLE_AI_ASSISTANT="true"
ENABLE_PDF_GENERATION="true"
ENABLE_NEWSLETTER="true"
```

---

## 10. Dateistruktur

```
app/
├── api/
│   ├── newsletter/
│   │   └── route.ts          # POST /api/newsletter
│   ├── contact/
│   │   └── route.ts          # POST /api/contact
│   ├── assistant/
│   │   └── route.ts          # POST /api/assistant
│   ├── generate-pdf/
│   │   └── route.ts          # POST /api/generate-pdf
│   └── programs/
│       └── route.ts          # GET /api/programs
lib/
├── db/
│   ├── index.ts              # Database connection
│   ├── schema.ts             # Database schema
│   └── migrations/           # Migration files
├── email/
│   ├── index.ts              # Email service
│   └── templates/
│       ├── newsletter-confirm.ts
│       └── contact-notification.ts
├── ai/
│   ├── index.ts              # OpenAI integration
│   ├── prompts.ts            # Prompt templates
│   └── fallback.ts           # Mock generation
├── pdf/
│   └── generator.ts          # PDF generation (optional)
├── validation/
│   └── schemas.ts            # Zod schemas
└── rate-limit/
    └── index.ts              # Rate limiting logic
```

---

## 11. Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| OpenAI API nicht verfügbar | Niedrig | Hoch | Fallback zu Mock-Generierung |
| Rate Limiting umgehen | Mittel | Mittel | IP-basiert + Honeypot |
| Datenbank wächst zu groß | Niedrig | Mittel | Regelmäßige Cleanup-Jobs |
| E-Mail Deliverability | Mittel | Mittel | SPF/DKIM konfigurieren |
| Cold Start (Serverless) | Hoch | Niedrig | Warm-up oder dedizierter Server |

---

## 12. Nächste Schritte

1. **Sofort:** Review & Diskussion dieses Plans
2. **Diese Woche:** Phase 1 umsetzen (Foundation)
3. **Branch:** Arbeit auf `staging` Branch
4. **Testing:** Jeder Endpunkt braucht Tests vor Merge

---

*Dokument erstellt am 9. Februar 2026*  
*Autor: Milo (AI Assistant)*  
*Version: 1.0*
