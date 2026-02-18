# TODO — EduFunds Aufgabenliste

> Milo: Bei jedem Heartbeat diese Liste lesen. Offene Aufgaben abarbeiten.
> Eine Aufgabe ist erst erledigt wenn der Verifikationsbefehl PASSED zeigt.
> Erledigte Aufgaben mit [x] markieren und committen.

---

## Offene Aufgaben

- [ ] **CSP-Header: Google Fonts nicht aktiv (GitHub Actions in Setup)**
  Der CSP-Fix wurde committed (987e434), aber die Header sind noch alt.
  Problem: Docker-Build auf diesem Host ignoriert Code-Änderungen (Layer-Cache-Bug).
  Lösung: GitHub Actions Workflow erstellt (.github/workflows/build-deploy.yml)
  - Baut bei jedem Push zu main/staging
  - Push zu GitHub Container Registry (ghcr.io)
  - Frische Umgebung ohne Cache-Probleme
  Status: Workflow committed, muss auf GitHub getestet werden.
  VERIFIKATION: curl -sI https://app.edufunds.org | grep -c fonts.googleapis.com = 1

## Erledigte Aufgaben

- [x] **Google Fonts CSP-Fix (Code committed)** (18.02.)
  CSP-Header in next.config.js erweitert:
  - style-src: + https://fonts.googleapis.com
  - font-src: + https://fonts.gstatic.com
  Git-Commit: 987e434
  Hinweis: Deployment noch ausstehend → siehe offene Aufgabe

- [x] **404-Seite: altes dunkles Design ersetzen** (18.02.)
  404-Seite komplett neu gestaltet mit Parchment/Gold/Navy Design:
  - Hintergrund: #f8f5f0 (parchment)
  - Text: #0a1628 (navy)
  - Akzente: #c9a227 (gold)
  - Buttons im Gold-Gradient-Stil
  Deployed auf Staging + Production. Smoke-Test: PASSED (143/143)
  Verifikation: curl https://app.edufunds.org/diese-seite-gibt-es-nicht | grep -c f8f5f0 = 2 ✓

- [x] **Nav-Badge Programmzahl: 174 -> 130+** (18.02.)
  Alle Vorkommen von "174" geändert zu "130+" in:
  - components/Header.tsx (Nav-Badge)
  - components/HeroSection.tsx (Trust-Items)
  - app/registrieren/page.tsx (Benefits)
  Deployed auf Staging + Production.
  Verifikation: curl https://app.edufunds.org/ | grep -o 174 | wc -l = 0 ✓

- [x] **Background Patterns auf allen Unterseiten** (18.02.)
  CSS-Patterns (geometric-grid + dots-pattern) global in layout.tsx eingebunden.
  Deployed auf Staging + Production. Smoke-Test: PASSED (143/143)
  
- [x] Antrags-KI mit Gemini zum Laufen gebracht (17.02.)
- [x] Staging repariert + Container healthy (17.02.)
- [x] Design-Update Header/Footer/Features (17.02.)
- [x] Fonts: DM Serif Display + Plus Jakarta Sans auf Unterseiten (18.02.)
- [x] Programmzahl Stats-Card: 131 -> 130+ (18.02.)
- [x] Klaus Tschira Stiftung entfernt (18.02.)
- [x] 2 neue Foerderprogramme hinzugefuegt (18.02.)

---

## Deployment-Architektur (NICHT AENDERN\!)

### 3-Tier-Setup (Stand 18.02.2026)

| Container | Image | Domain | Funktion |
|-----------|-------|--------|----------|
| edufunds | nginx:alpine | edufunds.org | Marketing Landing Page (nginx proxy) |
| edufunds-app | edufunds:latest | app.edufunds.org | Next.js Platform |
| edufunds-staging | edufunds:staging | staging.edufunds.org | Staging-Clone |
| edufunds-postgres | postgres:15-alpine | intern | Datenbank |

### WICHTIGE REGELN:
1. edufunds-Container (nginx) NIEMALS ersetzen oder umbenennen\! Er serviert die Landing Page.
2. Beim Rebuild von edufunds-app IMMER diese Env-Vars uebergeben:
   - DATABASE_URL=postgresql://edufunds:edufunds_secure_2024@edufunds-postgres:5432/edufunds?sslmode=disable
   - GEMINI_API_KEY (aus bestehender Umgebung)
   - NODE_ENV=production
3. Traefik-Labels IMMER setzen inkl. traefik.docker.network=hetzner-stack_web
4. NIE docker run -p 80:80 oder -p 443:443 -- Traefik verwaltet TLS\!
5. Staging first: staging.edufunds.org testen, dann app.edufunds.org deployen
6. Smoke-Test URLs: app.edufunds.org (Platform), edufunds.org (Landing)

---

## Regeln
- Staging first: staging.edufunds.org testen, dann app.edufunds.org deployen
- index.html ist tabu (ausser Programmzahl im Stats-Card)
- Keine Stereotype in der Sprache
- Zahlen nie exakt, immer gerundet mit + auf Marketing-Seiten
