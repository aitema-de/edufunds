# TODO — EduFunds Aufgabenliste

> Milo: Bei jedem Heartbeat diese Liste lesen. Offene Aufgaben abarbeiten.
> Eine Aufgabe ist erst erledigt wenn der Verifikationsbefehl PASSED zeigt.
> Erledigte Aufgaben mit [x] markieren und committen.

---

## Offene Aufgaben

- [ ] **Nav-Badge Programmzahl: 174 -> 130+**
  Der Header-Nav zeigt noch 174 als Badge neben Foerderprogramme.
  Korrekter Wert: 130+ (passend zur Stats-Card).
  VERIFIKATION: curl -s https://app.edufunds.org/ | grep -o 174 | wc -l (muss 0 sein)

- [ ] **404-Seite: altes dunkles Design ersetzen**
  Die 404-Seite nutzt noch slate/orange Farben statt Parchment/Gold/Navy.
  Anpassen an das neue Design (bg-[#f8f5f0], text-[#0a1628], accents #c9a227).
  VERIFIKATION: curl -s https://app.edufunds.org/diese-seite-gibt-es-nicht | grep -c f8f5f0 (muss > 0 sein)

## Erledigte Aufgaben

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
