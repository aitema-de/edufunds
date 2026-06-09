# Backend Quick Reference

> One-Page Übersicht für die Backend-Implementierung

---

## 🏗️ Architektur-Entscheidung

| Aspekt | Entscheidung |
|--------|--------------|
| **Framework** | Next.js API Routes (App Router) |
| **Datenbank** | SQLite (Dev) → PostgreSQL (Prod) |
| **E-Mail** | Resend (100/day free) |
| **KI** | OpenAI GPT-4 mit Fallback |
| **PDF** | Client-seitig (html2pdf.js) |

---

## 📡 API Endpunkte

```
POST   /api/newsletter      → Newsletter-Anmeldung + Double Opt-in
POST   /api/contact         → Kontaktformular + E-Mail-Benachrichtigung
POST   /api/assistant       → KI-Antragsgenerierung (OpenAI)
POST   /api/generate-pdf    → PDF-Generierung (optional)
GET    /api/programs        → Förderprogramme mit Filter/Pagination
```

---

## 📋 Request/Response Beispiele

### Newsletter Anmeldung
```bash
curl -X POST http://localhost:3101/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schule.de","name":"Max"}'
```

```json
{
  "success": true,
  "message": "Bitte bestätigen Sie Ihre Anmeldung...",
  "data": { "id": "uuid", "status": "pending" }
}
```

### KI-Antragsgenerierung
```bash
curl -X POST http://localhost:3101/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "programId": "uuid",
    "projektDaten": {
      "schulname": "Gymnasium Musterstadt",
      "projekttitel": "Digitalisierung...",
      ...
    }
  }'
```

---

## 🔧 Environment Variables

```bash
# .env.local (Entwicklung)
DATABASE_URL="file:./dev.db"
RESEND_API_KEY="re_xxx"
OPENAI_API_KEY="sk-xxx"
API_RATE_LIMIT="100"
```

---

## 📁 Dateistruktur

```
app/api/
├── newsletter/route.ts
├── contact/route.ts
├── assistant/route.ts
├── generate-pdf/route.ts
└── programs/route.ts

lib/
├── db/           # Database + Schema
├── email/        # Resend Integration
├── ai/           # OpenAI Integration
├── validation/   # Zod Schemas
└── rate-limit/   # Rate Limiting
```

---

## 🚀 Implementierungs-Reihenfolge

| Phase | Tasks | Zeit |
|-------|-------|------|
| **1** | DB Setup + API Struktur + Validation | 2-3 Tage |
| **2** | Newsletter + Kontakt + E-Mail | 2-3 Tage |
| **3** | KI-Integration (OpenAI) | 2-3 Tage |
| **4** | PDF + Programme API | 2 Tage |
| **5** | Testing + Security | 2-3 Tage |
| **6** | Deployment + Monitoring | 2 Tage |

**Gesamtschätzung: 3-4 Wochen**

---

## 🛡️ Security Checklist

- [ ] Rate Limiting (5 Minuten pro IP für Kontakt)
- [ ] Honeypot Feld (Spam-Schutz)
- [ ] Zod Validation auf allen Inputs
- [ ] SQL Injection Schutz (Prepared Statements)
- [ ] XSS-Schutz (Output Encoding)
- [ ] CORS konfiguriert
- [ ] Security Headers (Helmet)
- [ ] API Secrets für interne Calls

---

## 📊 Kosten-Schätzung (Monatlich)

| Posten | Kosten |
|--------|--------|
| Server (Hetzner CX21) | 5,35€ |
| Resend E-Mail (1.000/Monat) | Kostenlos |
| OpenAI API (~500 Calls) | ~5-10€ |
| **Gesamt** | **~10-15€/Monat** |

---

## 🔄 Fallback-Strategien

| Service | Fallback |
|---------|----------|
| OpenAI API | Mock-Generierung (`generateMockAntrag`) |
| Resend | Console Logging (Dev) / Queue (Prod) |
| Datenbank | In-Memory Cache (Dev) |

---

## 📞 Wichtige Links

- [Vollständiger Plan](./BACKEND-PLAN.md)
- [API Schemas](./API-SCHEMAS.md)
- [Resend Docs](https://resend.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

*Letzte Aktualisierung: 9. Februar 2026*
