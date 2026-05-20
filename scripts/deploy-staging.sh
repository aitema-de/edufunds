#!/usr/bin/env bash
# Deploy aktueller Staging-Branch nach staging.edufunds.org
#
# Flow: SSH zum Server → git pull auf Branch 'staging' → docker build
#       → Container swap → Smoke-Test. Kein Downtime-Bypass: Traefik
#       faengt ~2-3s Unavailability ab.
#
# Nutzung:
#   ./scripts/deploy-staging.sh                 # interaktive Bestaetigung
#   ./scripts/deploy-staging.sh --yes           # ohne Frage
#   ./scripts/deploy-staging.sh --branch feature/wizard-adaptive
#                                               # anderen Branch deployen (fuer Feature-Tests)

set -euo pipefail

REMOTE=root@49.13.15.44
REMOTE_PATH=/home/edufunds/edufunds-app
BRANCH=staging
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)      YES=1; shift ;;
    --branch)      BRANCH="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unbekanntes Argument: $1" >&2; exit 2 ;;
  esac
done

echo "==> Staging-Deploy vorbereiten"
echo "    Remote:  $REMOTE"
echo "    Branch:  $BRANCH"
echo "    Ziel:    https://staging.edufunds.org"
echo

if [ "$YES" -ne 1 ]; then
  read -rp "Fortfahren? (y/N) " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Abgebrochen."; exit 1; }
fi

ssh "$REMOTE" "bash -se" <<EOF
set -euo pipefail
cd $REMOTE_PATH
echo "==> git fetch + checkout $BRANCH"
git fetch origin
git checkout $BRANCH
git pull --ff-only origin $BRANCH

echo "==> docker build"
# Paywall-Dev-Mock fuer Staging/UAT einbacken (kein Stripe-Account aktiv).
# NEXT_PUBLIC_* muss zur Build-Zeit gesetzt sein — Client-Bundle-Inlining.
docker build --build-arg NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 -t edufunds:staging .

echo "==> Container swap"
docker stop edufunds-staging 2>/dev/null || true
docker rm   edufunds-staging 2>/dev/null || true
docker run -d --name edufunds-staging \
  --network hetzner-stack_web \
  --restart unless-stopped \
  --env-file $REMOTE_PATH/.env.production \
  -e NODE_ENV=production \
  -v $REMOTE_PATH/data:/app/data:ro \
  --label 'traefik.enable=true' \
  --label 'traefik.docker.network=hetzner-stack_web' \
  --label 'traefik.http.routers.edufunds-staging.rule=Host(\`staging.edufunds.org\`)' \
  --label 'traefik.http.routers.edufunds-staging.entrypoints=websecure' \
  --label 'traefik.http.routers.edufunds-staging.tls=true' \
  --label 'traefik.http.routers.edufunds-staging.tls.certresolver=letsencrypt' \
  --label 'traefik.http.services.edufunds-staging.loadbalancer.server.port=3000' \
  edufunds:staging >/dev/null

echo "==> Healthcheck abwarten"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker inspect --format '{{.State.Health.Status}}' edufunds-staging 2>/dev/null | grep -q healthy; then
    echo "    healthy nach ${i}0s"
    break
  fi
  sleep 10
done
EOF

echo
echo "==> Smoke-Test"
for path in / /foerderprogramme /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://staging.edufunds.org$path" || true)
  echo "    https://staging.edufunds.org$path -> $code"
done
echo
echo "==> Fertig."
