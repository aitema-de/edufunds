# EduFunds — Lokaler Dev-Workflow

## Einmaliges Setup (bereits erledigt)
- Repo: `/home/kolja/edufunds-app/` (GitHub: `Aitema-gmbh/edufunds`)
- Abhängigkeiten: `npm install`
- `.env.local` → Dev-Config inkl. `GEMINI_API_KEY`
- SSH-Tunnel-Skript: `scripts/dev-db-tunnel.sh`
- Server-Postgres auf `127.0.0.1:15432` veröffentlicht

## Täglicher Start
```bash
cd ~/edufunds-app
./scripts/dev-db-tunnel.sh --bg       # Tunnel zur Server-Postgres (läuft im Hintergrund)
npm run dev                            # Next.js auf http://localhost:3101
```

Health-Check:
```bash
curl http://localhost:3101/api/health            # muss {"status":"healthy"} liefern
```

## Branch-Strategie (Dev → Staging → Production)

| Schritt | Branch | Wohin | Wer |
|---------|--------|-------|-----|
| 1. Feature entwickeln | `feature/XYZ` (von `main` abgezweigt) | lokal auf `localhost:3101` | du |
| 2. Zum Testen teilen | Merge in `staging` + push | `staging.edufunds.org` (Auto-Deploy via GitHub Actions / manuell) | du |
| 3. Freigabe → Live | PR `staging` → `main`, merge | `app.edufunds.org` + Landing | du |

**Merke:** Niemals direkt auf `main` committen. Niemals ohne Staging-Check deployen.

## Deploy-Befehle (Server)

```bash
# Staging neu bauen + deployen (auf Server):
ssh root@49.13.15.44 'cd /home/edufunds/edufunds-app && git fetch && git checkout staging && git pull && docker build -t edufunds:staging . && docker stop edufunds-staging && docker rm edufunds-staging && docker run -d --name edufunds-staging [labels wie im recovery] edufunds:staging'

# Production deployen (nach Staging-Smoke-Test):
ssh root@49.13.15.44 'cd /home/edufunds/edufunds-app && git fetch && git checkout main && git pull && docker build -t edufunds:latest . && docker stop edufunds-app && docker rm edufunds-app && docker run -d --name edufunds-app [labels] edufunds:latest'
```
> TODO: In `scripts/deploy-staging.sh` und `scripts/deploy-production.sh` auslagern, sobald erste Änderung ansteht.

## Tunnel-Management
```bash
./scripts/dev-db-tunnel.sh --bg      # Start im Hintergrund
./scripts/dev-db-tunnel.sh --stop    # Stoppen
./scripts/dev-db-tunnel.sh           # Vordergrund (Ctrl+C zum Beenden)
```

## Bekannte Stolpersteine
- **Dev-Port ist 3101** (nicht 3000) — in `package.json` hartcodiert.
- **Lockfile-Warnung:** Next.js meckert, weil `/home/kolja/package-lock.json` existiert. Ignorierbar oder via `turbopack.root` in `next.config.js` stummschalten.
- **DB = Server-Postgres via Tunnel** — jede Änderung an Dev-Daten landet auf dem Server. Für isolierte Tests später eigenes Postgres-Volume erwägen.
- **Resend-Key fehlt** → Newsletter-Features nicht testbar, bis neuer Key eingetragen wird.
