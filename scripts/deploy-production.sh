#!/usr/bin/env bash
# Deploy aktueller main-Branch nach app.edufunds.org (Production).
#
# ACHTUNG: Diese Instanz ist live fuer externe Nutzer. NIE ohne
# erfolgreichen Staging-Smoke-Test deployen.
#
# Nutzung:
#   ./scripts/deploy-production.sh              # interaktiv, zweifache Bestaetigung
#   ./scripts/deploy-production.sh --yes        # ohne Frage (CI-Use)

set -euo pipefail

REMOTE=root@49.13.15.44
REMOTE_PATH=/home/edufunds/edufunds-app
BRANCH=main
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) YES=1; shift ;;
    -h|--help)
      sed -n '2,11p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unbekanntes Argument: $1" >&2; exit 2 ;;
  esac
done

echo "==> PRODUCTION-Deploy"
echo "    Remote:  $REMOTE"
echo "    Branch:  $BRANCH"
echo "    Ziel:    https://app.edufunds.org"
echo "    WARNUNG: Live-Instanz fuer Endnutzer."
echo

if [ "$YES" -ne 1 ]; then
  read -rp "Staging wurde erfolgreich smoke-getestet? (y/N) " ans1
  [[ "$ans1" =~ ^[Yy]$ ]] || { echo "Abgebrochen."; exit 1; }
  read -rp "Bist du sicher, dass du Production deployen willst? (deploy) " ans2
  [[ "$ans2" == "deploy" ]] || { echo "Abgebrochen."; exit 1; }
fi

ssh "$REMOTE" "bash -se" <<EOF
set -euo pipefail
cd $REMOTE_PATH
echo "==> git fetch + checkout $BRANCH"
git fetch origin
git checkout $BRANCH
git pull --ff-only origin $BRANCH

echo "==> docker build"
docker build -t edufunds:latest .

echo "==> Container swap"
docker stop edufunds-app 2>/dev/null || true
docker rm   edufunds-app 2>/dev/null || true
docker run -d --name edufunds-app \
  --network hetzner-stack_web \
  --restart unless-stopped \
  --env-file $REMOTE_PATH/.env.production \
  -v $REMOTE_PATH/data:/app/data:ro \
  --label 'traefik.enable=true' \
  --label 'traefik.docker.network=hetzner-stack_web' \
  --label 'traefik.http.routers.edufunds-app.rule=Host(\`app.edufunds.org\`)' \
  --label 'traefik.http.routers.edufunds-app.entrypoints=websecure' \
  --label 'traefik.http.routers.edufunds-app.tls=true' \
  --label 'traefik.http.routers.edufunds-app.tls.certresolver=letsencrypt' \
  --label 'traefik.http.services.edufunds-app.loadbalancer.server.port=3000' \
  edufunds:latest >/dev/null

echo "==> Healthcheck abwarten"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker inspect --format '{{.State.Health.Status}}' edufunds-app 2>/dev/null | grep -q healthy; then
    echo "    healthy nach \${i}0s"
    break
  fi
  sleep 10
done
EOF

echo
echo "==> Smoke-Test"
for path in / /foerderprogramme /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://app.edufunds.org$path" || true)
  echo "    https://app.edufunds.org$path -> $code"
done
echo
echo "==> Fertig. Bitte manuell in den Browser schauen."
