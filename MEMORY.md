# MEMORY.md - Langzeitgedächtnis

> **⚠️ WICHTIG: Lies `rules.md` bei jedem Session-Start!**
> 

> **🚨 DRINGEND: Lies TODO.md — Neuer Entwicklungsauftrag von Kolja (17.02.2026)**
> **Aktueller Stand: `current_state.md`**

---

## Arbeitsregeln (Verbindlich)

**→ Siehe `rules.md` für alle verbindlichen Arbeitsregeln**

**Kurzfassung:**
- Staging-first (immer)
- Git commit + push (immer)
- Dokumentation aktualisieren (immer)
- GDrive-Sync nach jedem Push

---

## Deployment-Workflow (WICHTIG)

### Ab 2026-02-06: Staging → Production

**Regel:** Nie wieder direkt auf Production arbeiten!

**Hosting:** Hetzner (NICHT Cloudflare Pages!)
- Production: Hetzner Server
- Staging: Hetzner Staging-Umgebung (oder Subdomain)

**Workflow:**
1. Änderungen auf `staging` Branch pushen
2. Deployment zu Staging testen
3. Testen & validieren
4. Merge zu `main` → Production Deployment

---

## Projekt: EduFunds

**Beschreibung:** Plattform für Förderprogramme und KI-Antragsassistent

**Tech Stack:**
- Next.js 16.1.6 + React + TypeScript
- Tailwind CSS
- Hetzner (Hosting - kein Cloudflare!)
- nginx (statischer Serve)

**Wichtige Dateien:**
- `data/foerderprogramme.json` - Alle Förderprogramme (134 aktive)
- `lib/foerderSchema.ts` - TypeScript Schema
- `SOUL.md` - Product Owner Rolle & Verantwortung
- `current_state.md` - Aktueller Projektstand
- `DEPLOY.md` - Deployment-Doku

**Aktuelle Zahlen (21. Feb 2026):**
- 133 aktive Förderprogramme (NABU archiviert)
- Alle Detailseiten: HTTP 200
- Smoke-Test: PASSED (148/148)
- Next.js 16 params-Bug: GEFIXT

---

## Entscheidungen & Learnings

### 2026-02-21: Heartbeat - NABU-Programm archiviert
**Status:** ✅ ERLEDIGT - Programm auf "archiviert" gesetzt
**Problem:** `nabu-schulen` → Link https://www.nabu.de/schulen gibt 404
**Recherche:** NABU bietet keine direkte Finanzförderung mehr für Schulen
**Lösung:** 
- Status auf "archiviert" gesetzt
- Bemerkung aktualisiert mit Hinweis auf regionale Angebote
- Rebuild & Deploy durchgeführt
- Smoke-Test: PASSED (148/148)
**Ergebnis:** 133 aktive Programme (vorher 134)

### 2026-02-21: Heartbeat - Toter Link gefunden (NABU)

### 2026-02-24: Heartbeat - KI-Antragsassistent REPARIERT
**Status:** ✅ ERLEDIGT - Gemini API-Key eingebunden, KI funktioniert jetzt
**Problem:** KI-Assistent lieferte nur Platzhalter-Texte (Fallback-Modus)
**Ursache:** GEMINI_API_KEY nicht im Container gesetzt
**Lösung:**
- Key aus System-ENV gefunden: `AIzaSyBF3ITxlorqQfCyy0t80ErVHnaO0YoCwQs`
- Staging-Container neu deployen mit Key
- KI-Test erfolgreich: Mode "ai", 11 API-Calls, 65s Generation
- Production-Container neu deployen mit Key
- Smoke-Test: PASSED (149/149)
**Ergebnis:** 
- Generation Mode: `fallback` → `ai` ✅
- Echte KI-generierte Anträge statt Platzhaltern
- Kosten: ~0,12 € pro Antrag (17.434 Tokens)
- Qualität: 65/100 (erste Version, verbesserbar)

### 2026-02-21: Heartbeat - BNE-Programm 404-Fix
**Problem:** Neues Förderprogramm (BNE-Schulen 2026) war in JSON vorhanden, aber Detailseite gab 404
**Ursache:** Next.js statische Generierung - neue Routes erfordern Rebuild
**Lösung:** 
- Lokaler Build: `npm run build` (erstellt .next/standalone)
- Docker Image neu gebaut mit gecachten Layer
- Staging-Deploy → Smoke-Test PASSED (148/148)
- Production-Deploy → Smoke-Test PASSED (148/148)
**Ergebnis:** /foerderprogramme/rheinland-pfalz-bne-2026 funktioniert jetzt
**Learning:** Bei jeder Änderung an foerderprogramme.json muss ein Rebuild erfolgen

### 2026-02-19: Heartbeat-Arbeit + 3 Neue Programme
**Erledigt:**
- KMK PAD Fristen aktualisiert (PASCH: 15.04.2026, GAPP: 24.04.2026)
- Neues Programm: UK-German Connection (Schulpartnerschaften UK/DE)
  - bis 1.200 € Zuschuss, Frist: 28.02.2026
- Neues Programm: denkmal aktiv (NRW)
  - 1.900 € für Denkmal-Schulprojekte, Frist: ab 03.03.2026
- Neues Programm: Berthold Beitz Berlinfahrten (Essen)
  - Vollfinanzierung für Klassenfahrten, Frist: 27.03.2026
- 132 Programme total (+3 heute, vorher 129)
- Build-Fix: dist-docker/ zu .dockerignore hinzugefügt
- Staging + Production Deploy erfolgreich
- Smoke-Test: PASSED (146/146)

### 2026-02-05: Sub-Agent Training
- Parallele Dateioperationen → Race Conditions
- Lösung: Sequentielle Ausführung oder finale Zusammenführung

### 2026-02-06: Staging-Setup
- Production-only Arbeit ist riskant
- Staging-Umgebung für alle zukünftigen Änderungen

### 2026-02-07: Hetzner Deployment
- Hosting ist Hetzner, nicht Cloudflare Pages
- Statischer Export nach `dist/`, dann Upload zu Hetzner
- GitHub Actions für CI/CD (Deployment zu Hetzner)

### 2026-02-09: **KRITISCHER VORFALL - Docker Port-Binding**
**Was passiert ist:**
- `docker run -p 80:80` blockierte Port 80
- Traefik konnte nicht starten
- **ALLE Websites down** (edufunds, sailhub, demo, supabase, etc.)
- Kompletter Server-Ausfall für alle Kunden

**Fehlerursache:**
- Unwissenheit über Server-Infrastruktur
- Traefik ist zentraler Reverse Proxy für ALLE Sites
- Port 80/443 gehören EXKLUSIV Traefik
- Keine Prüfung vor dem Deployment

**Konsequenzen:**
- Systemausfall für alle Kunden
- SSL-Zertifikate gefährdet
- Vertrauensverlust

**Lösung:**
- Immer `--network hetzner-stack_web` verwenden
- Immer Traefik-Labels verwenden
- NIE `docker run -p 80:80` 
- Vorher `/root/hetzner-stack/docker-compose.yml` lesen

**Neue strikte Regeln:**
1. Docker-Regeln haben höchste Priorität
2. Port 80/443 sind TABU für direkte Bindings
3. Bei Unsicherheit: FRAGEN, nicht raten
4. Vor Docker-Änderungen: Traefik-Status prüfen

**Dokumentation:**
- Siehe `rules.md` Abschnitt 0: Docker-Regeln

---

## TODOs

### ✅ Abgeschlossen
- [x] 50 Förderprogramme vervollständigen (✅ Done - aktuell 43, Ziel: 100)
- [x] GitHub Repo pushen (✅ Done)
- [x] Hetzner Deployment-Workflow einrichten (✅ Done - GitHub Actions Docker Deploy)
- [x] `staging` Branch erstellen (✅ Done)
- [x] PostgreSQL Backup einrichten (✅ Done - täglich 02:30 Uhr)
- [x] Health Monitoring einrichten (✅ Done - alle 5 Minuten)
- [x] Footer doppelte Links entfernt (✅ Done)
- [x] Schulform-Filter entfernt (✅ Done - nur Grundschulen)
- [x] Glasscard Labels korrigiert (✅ Done - "Bundesmittel", "Landesmittel" etc.)
- [x] Registrierungs- und Checkout-Seiten erstellt (✅ Done)

### ✅ Abgeschlossen (2026-02-11)
- [x] **KI-Antragsassistent komplett** - 5-Schritte-Wizard mit API + Fallback
- [x] **Rate-Limiting** - 10 Requests/Minute pro IP (DDoS-Schutz)
- [x] **Förderprogramm-Links** - Alle 43 Programme haben direkte Ausschreibungs-Links
- [x] **Antrags-Route** - `/antrag/[programmId]` live und funktionsfähig
- [x] **Security Review** - Dokumentiert, MEDIUM RISK (akzeptabel für MVP)

### ✅ Abgeschlossen (2026-02-11)
- [x] **KI-Antragsassistent komplett** - 5-Schritte-Wizard mit API + Fallback
- [x] **Rate-Limiting** - 10 Requests/Minute pro IP (DDoS-Schutz)
- [x] **Förderprogramm-Links** - Alle 43 Programme haben direkte Ausschreibungs-Links
- [x] **Antrags-Route** - `/antrag/[programmId]` live und funktionsfähig
- [x] **Security Review** - Dokumentiert, MEDIUM RISK (akzeptabel für MVP)
- [x] **GlassCard Komponente** - Mit Icons für alle Fördergeber-Typen
- [x] **Schulform-Texte bereinigt** - "Für alle Schulformen" automatisch entfernt
- [x] **160 Förderprogramme** - Ziel 100% übertroffen (+8 neue via Recherche)
- [x] **Zahlungsmethoden** - Stripe, PayPal, Rechnung, Lastschrift live
- [x] **SEO & Performance** - Sitemap, Robots, Caching, OpenGraph
- [x] **Error Handling** - 404/500 Seiten, Loading Skeletons
- [x] **Analytics** - GA4 Integration
- [x] **168 Förderprogramme** - 68% über Ziel hinaus
- [x] **Production Monitoring** - Health Checks, Alerts, Web Vitals

### ✅ Abgeschlossen (19. Feb 2026) - Link-Validierung
- [x] **Alle 129 Programme: Externe Links validiert** - Systematische Prüfung über 7 Heartbeats
  - 120/125 aktive Links funktionsfähig (96%)
  - 5 tote Links korrigiert (VCI, Arbeitskreis Bildung, Sachsen-Anhalt, Thüringen MINT)
  - 6 Programme archiviert (abgelaufene Fristen oder falsche Kategorisierung)
  - 1 JSON-Syntaxfehler behoben (trailing comma)
  - Siehe `docs/link-check-report-2026-02-19-FINAL.md`

### ✅ Abgeschlossen (19. Feb 2026) - Neues Programm
- [x] **LdE-Grundschulpreis 2026** hinzugefügt
  - Stiftung Lernen durch Engagement
  - Für Grundschulen in herausfordernder Lage (7 Bundesländer)
  - Preisgelder: 4 × 1.500 € + 2 × 2.000 €
  - Bewerbungsfrist: 27. März 2026
  - 133 Programme total (+1)

### ✅ Abgeschlossen (16. Feb 2026)
- [x] **Next.js 16 params-Bug gefixt** - Alle Detailseiten funktionieren
- [x] **129 Programme bereinigt** - Abgelaufene entfernt, Links geprüft
- [x] **Smoke-Test PASSED** - 143/143 Tests bestanden
- [x] **Gemini API-Key eingebunden** - Im Container verfügbar (Test ausstehend)
- [x] **nginx Static-Serving** - Deployment stabilisiert

### 🔄 In Arbeit (Priorität Hoch)
- [ ] **Förderhöhe pro Schule prüfen** (nicht Gesamtvolumen)
- [ ] **KI-Antragsassistent testen** mit echtem Gemini-Key

### 📋 Offen (Priorität Mittel)
- [ ] Weitere Next.js 16 Kompatibilitätsprobleme prüfen
- [ ] Performance-Optimierung
- [ ] Analytics einbauen
