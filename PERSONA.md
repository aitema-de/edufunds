# PERSONA.md - Milo | EduFunds Projektkontext

## Projekt: EduFunds

**Mission:** Schulen in Deutschland dabei helfen, passende Förderprogramme zu finden und erfolgreiche Anträge zu stellen - unterstützt durch KI.

**Zielgruppe:** Schulleiter:innen, Verwaltungspersonal, Lehrkräfte die Fördermittel beantragen wollen.

---

## Infrastruktur

| Komponente | Details |
|------------|---------|
| **Production** | https://edufunds.org (Hetzner Server 49.13.15.44) |
| **Staging** | /opt/edufunds-staging/html/ |
| **Deployment** | /opt/edufunds/html/ (Prod), via Traefik |
| **Datenbank** | PostgreSQL localhost:5432, DB: `edufunds` |
| **Workspace** | /home/edufunds/edufunds-app/ (Next.js 14) |
| **Gateway** | Port 18791 (edufunds-gateway.service) |
| **Telegram** | @sailhub_Platform_bot (EduFunds Bot) |
| **Modell** | moonshot/kimi-k2.5 (via OpenRouter) |
| **Web Search** | Perplexity Sonar Pro (via OpenRouter) |

---

## Aktueller Stand

### Was funktioniert:
- Statische HTML-Seiten mit ~45 Förderprogrammen
- AI Application Assistant (5-Schritte-Wizard mit API + Fallback)
- Rate Limiting (10 req/min pro IP)
- Alle Programme mit Direktlinks
- Antragsroute `/antrag/[programmId]`
- PostgreSQL mit Backups und Health-Monitoring
- Registrierung und Checkout-Seiten
- Tägliche + wöchentliche Förderprogramm-Scans (Cron)

### Offene Aufgaben (nach Priorität):
1. **Gemini API Key** - Für echte KI-Antragsunterstützung (aktuell Fallback) → Kolja fragen
2. **Icons in Glasscards** - Werden nicht angezeigt
3. **"Für alle Schulformen"** - Text aus Beschreibungen entfernen
4. **57 weitere Programme** - Via Web-Recherche ergänzen
5. **DNS: www.edufunds.org** - Weiterleitung einrichten → Kolja
6. **Payment-Integration** - Stripe/PayPal → Phase 4

---

## Roadmap

### Phase 1: Database + Backend API ✅ (größtenteils fertig)
- PostgreSQL-Schema mit Förderprogramm-Tabellen
- REST-Endpoints für CRUD-Operationen
- Migration der statischen Programme in DB

### Phase 2: AI Application Assistant 🔄 (in Arbeit)
- 5-Schritte-Wizard für Antragsunterstützung
- Prompt-Engineering für Fördermittel-Kontext
- Gemini als primäres Modell (wartet auf API-Key)
- Fallback-System für Verfügbarkeit

### Phase 3: UI/UX auf Production-Level
- Framework-Migration (Astro oder Next.js)
- Design-System implementieren
- Verbesserter Programm-Finder mit Filtern
- Responsive Design optimieren

### Phase 4: Security & Hardening
- Input-Validation verschärfen
- CORS richtig konfigurieren
- Prepared Statements durchgehend
- Payment-Integration (Stripe/PayPal)
- Automatisierte Backups erweitern

---

## Design-Sprache

- **Hintergrund:** Dunkel (#0f172a Slate-900)
- **Akzentfarben:** Orange/Amber (#f59e0b, #d97706)
- **Style:** Glassmorphism, abgerundete Ecken, subtile Schatten
- **Ton:** Professionell, vertrauenswürdig, einladend
- **Schrift:** System-Stack (Inter wenn verfügbar)

---

## Förderprogramm-Recherche

### Suchstrategie:
1. **Bundesweite Programme:** BMBF, KfW, Digitalpakt, EU-Bildungsprogramme
2. **Landesförderung:** Pro Bundesland spezifische Programme
3. **Stiftungen:** Deutsche Telekom Stiftung, Bosch Stiftung, Bertelsmann, etc.
4. **Thematisch:** Digitalisierung, Inklusion, Nachhaltigkeit, MINT, Sprachförderung

### Programm-Datenformat:
```
Name | Geber | Fördersumme | Frist | Schulformen | Bundesland | Link | Beschreibung
```

### Scan-Berichte:
- Wöchentlich: `/home/edufunds/edufunds-app/docs/foerderprogramm-scan-DATUM.md`
- Neue Funde: `/home/edufunds/edufunds-app/docs/neue-programme-DATUM.md`

---

## Technische Richtlinien

### Stack:
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, PostgreSQL
- **AI:** Gemini (primary), Fallback-System
- **Deployment:** Docker + Traefik (→ rules.md beachten!)

### Code-Standards:
- TypeScript bevorzugt, JavaScript akzeptiert
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- Staging-first, immer testen vor Production
- Error Handling: Graceful degradation, Fallbacks

### Wichtige Pfade:
```
/home/edufunds/edufunds-app/          → Workspace (Next.js)
/opt/edufunds/html/                    → Production Build
/opt/edufunds-staging/html/            → Staging Build
/home/edufunds/.moltbot/moltbot.json   → Gateway-Config
/home/edufunds/.clawdbot/              → Runtime-Daten (Cron, Sessions)
```

---

## Kolja kontaktieren

- **Telegram Chat-ID:** 498349591
- **Wann:** Siehe SOUL.md → Entscheidungsmatrix, Stufe 3 (ASK)
- **Wie:** Konkreter Vorschlag, nicht offene Frage
- **Ergebnis-Updates:** Via Telegram nach Abschluss wichtiger Features
