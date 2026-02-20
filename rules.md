# EduFunds - Arbeitsregeln

> **VERBINDLICHE REGELN - Stand: 19. Februar 2026**
> 
> **Diese Regeln haben ABSOLUTE PRIORITAET. Verstoesse koennen ALLE Websites down bringen!**

---

## 0. DEPLOYMENT-CONTAINER — ABSOLUTES VERBOT (HOECHSTE PRIORITAET)

### Du deployst NUR zu diesen Containern:
| Container | Domain | Du darfst |
|-----------|--------|-----------|
| edufunds-app | app.edufunds.org | Stoppen, neu erstellen, redeployen |
| edufunds-staging | staging.edufunds.org | Stoppen, neu erstellen, redeployen |

### VERBOTEN — bei Verstoss wird Landing Page zerstoert:
| Container | Domain | Regel |
|-----------|--------|-------|
| edufunds-landing | edufunds.org | NIEMALS anfassen! Marketing Landing Page (nginx) |
| edufunds-postgres | intern | NIEMALS anfassen! Datenbank |

### ABSOLUT VERBOTEN:
- **Einen Container namens "edufunds" erstellen** → Traefik-Konflikt zerstoert Landing Page!
- **docker run ohne --name** → unkontrollierter Container
- **docker run -p 80:80 oder -p 443:443** → blockiert Traefik, ALLE Sites down!
- **docker stop/rm auf edufunds-landing oder edufunds-postgres**

### Korrektes Deployment (edufunds-app):
```bash
docker stop edufunds-app && docker rm edufunds-app
docker run -d   --name edufunds-app   --network hetzner-stack_web   --restart unless-stopped   -e 'DATABASE_URL=postgresql://edufunds:edufunds_secure_2024@edufunds-postgres:5432/edufunds?sslmode=disable'   -e GEMINI_API_KEY=$GEMINI_API_KEY   -e NODE_ENV=production   -l 'traefik.enable=true'   -l 'traefik.docker.network=hetzner-stack_web'   -l 'traefik.http.routers.edufunds-app.rule=Host(`app.edufunds.org`)'   -l 'traefik.http.routers.edufunds-app.entrypoints=websecure'   -l 'traefik.http.routers.edufunds-app.tls=true'   -l 'traefik.http.routers.edufunds-app.tls.certresolver=letsencrypt'   -l 'traefik.http.routers.edufunds-app.service=edufunds-app-service'   -l 'traefik.http.services.edufunds-app-service.loadbalancer.server.port=3000'   edufunds:latest
```

### VOR JEDEM docker run:
1. Ist --name edufunds-app oder edufunds-staging? (Sonst STOPP!)
2. Ist --network hetzner-stack_web gesetzt?
3. Sind ALLE Traefik-Labels gesetzt?
4. Ist KEIN -p Flag drin?

---

## 1. STAGING-FIRST — KEINE AUSNAHMEN

**Grundregel:** JEDE Aenderung wird ZUERST auf Staging deployed.

### Workflow:
1. Aenderungen machen und testen
2. Build + Deploy auf edufunds-staging
3. Testen ob staging.edufunds.org funktioniert
4. Wenn OK: Deploy auf edufunds-app
5. Testen ob app.edufunds.org funktioniert

**Verboten:**
- Nie direkt auf Production (edufunds-app) deployen ohne Staging-Test
- Keine Ausnahmen, keine Ausreden

---

## 2. GIT COMMIT + PUSH — IMMER

Nach JEDER Entwicklungsarbeit:
```bash
git add <geaenderte-dateien>
git commit -m type: beschreibung
git push origin <branch>
```

Conventional Commits: feat, fix, docs, refactor, test, chore

---

## 3. DOKUMENTATION AKTUELL HALTEN

| Datei | Wann aktualisieren |
|-------|-------------------|
| current_state.md | IMMER nach jeder Session |
| MEMORY.md | Bei Entscheidungen, Learnings |
| rules.md | Wenn neue Regeln hinzukommen |

---

## 4. SERVER-INFRASTRUKTUR

### Container-Uebersicht (AKTUELL 19.02.2026):
| Container | Image | Domain | Funktion | Anfassen? |
|-----------|-------|--------|----------|-----------|
| edufunds-landing | nginx:alpine | edufunds.org | Marketing Landing Page | NEIN! |
| edufunds-app | edufunds:latest | app.edufunds.org | Next.js Platform | JA |
| edufunds-staging | edufunds:staging | staging.edufunds.org | Staging | JA |
| edufunds-postgres | postgres:15-alpine | intern | Datenbank | NEIN! |
| traefik | traefik:v3.6 | - | Reverse Proxy | NEIN! |

### Netzwerk: IMMER hetzner-stack_web

---

## 5. NOTFALL-PLAN

Falls versehentlich falscher Container erstellt:
```bash
docker stop <falscher-container>
docker rm <falscher-container>
```

Falls edufunds.org kaputt (zeigt Next.js statt Landing Page):
→ Du hast wahrscheinlich einen Container namens "edufunds" erstellt!
→ Sofort stoppen und entfernen.

---

## 6. KOMMUNIKATION

- Zeitversprechen sind verbindlich
- Bei Fehler-Schleifen: Eskalieren nach 3 Versuchen
- Lieber ehrlich als optimistisch bei Zeitangaben

---

*Stand: 19. Februar 2026*
*Ersteller: Kolja Schumann*
