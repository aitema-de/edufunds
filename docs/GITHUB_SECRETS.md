# GitHub Actions Secrets (Hetzner Deployment)

Diese Secrets müssen in den GitHub Repository Settings hinterlegt werden:

## Erforderliche Secrets

| Secret Name | Beschreibung | Woher |
|-------------|--------------|-------|
| `HETZNER_SSH_KEY` | Privater SSH-Key für Server-Zugriff | `~/.ssh/id_rsa` auf dem Server |
| `HETZNER_HOST` | Server IP-Adresse | `49.13.15.44` |
| `HETZNER_USER` | SSH Username | `root` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://edufunds:PASSWORD@edufunds-postgres:5432/edufunds?sslmode=disable` |

## Einrichtung

### 1. SSH Key erstellen (falls nicht vorhanden)
```bash
# Auf dem Hetzner Server oder lokal
ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
# Public Key zum Server hinzufügen:
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
# Private Key für GitHub:
cat ~/.ssh/github-actions
```

### 2. Secrets in GitHub hinterlegen
1. GitHub Repo öffnen → Settings → Secrets and variables → Actions
2. "New repository secret" für jeden der obigen Werte

### 3. Testen
```bash
git push origin main
# Oder manuell in GitHub Actions → Deploy to Production → Run workflow
```

## Was passiert beim Deployment?

1. **Build**: Next.js App wird gebaut
2. **Docker**: Image wird erstellt und geexportiert
3. **Transfer**: Image wird per SCP zum Server kopiert
4. **Deploy**: Container wird gestoppt, neues Image geladen, Container gestartet
5. **Health Check**: Website wird auf Erreichbarkeit geprüft
