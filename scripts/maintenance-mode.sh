#!/usr/bin/env bash
# Schaltet app.edufunds.org zwischen Live-App und "Bald verfügbar"-Wartungsseite um.
#
# Mechanik (ohne Rebuild, voll reversibel):
#   on  : html auf Server kopieren -> nginx-Container 'edufunds-maintenance' mit
#         dem app.edufunds.org-Traefik-Router starten, dann 'edufunds-app' STOPPEN
#         (Container bleibt erhalten, nur gestoppt -> seine Traefik-Labels verschwinden).
#   off : 'edufunds-maintenance' stoppen/entfernen, 'edufunds-app' wieder starten.
#
# Nutzung:
#   ./scripts/maintenance-mode.sh on
#   ./scripts/maintenance-mode.sh off
#   ./scripts/maintenance-mode.sh status

set -euo pipefail

REMOTE=root@49.13.15.44
REMOTE_PATH=/home/edufunds/edufunds-app
NET=hetzner-stack_web
MODE="${1:-status}"

case "$MODE" in
  on|off|status) ;;
  *) echo "Nutzung: $0 on|off|status" >&2; exit 2 ;;
esac

if [ "$MODE" = "on" ]; then
  echo "==> Wartungsseite auf Server kopieren"
  ssh "$REMOTE" "mkdir -p $REMOTE_PATH/ops/maintenance"
  scp -q ops/maintenance/index.html "$REMOTE:$REMOTE_PATH/ops/maintenance/index.html"
fi

ssh "$REMOTE" "MODE=$MODE REMOTE_PATH=$REMOTE_PATH NET=$NET bash -se" <<'EOF'
set -euo pipefail

router_labels() {
  # $1 = service-name, $2 = port
  echo "--label traefik.enable=true"
  echo "--label traefik.docker.network=$NET"
  echo "--label traefik.http.routers.edufunds-app.rule=Host(\`app.edufunds.org\`)"
  echo "--label traefik.http.routers.edufunds-app.entrypoints=websecure"
  echo "--label traefik.http.routers.edufunds-app.tls=true"
  echo "--label traefik.http.routers.edufunds-app.tls.certresolver=letsencrypt"
  echo "--label traefik.http.routers.edufunds-app.service=$1"
  echo "--label traefik.http.services.$1.loadbalancer.server.port=$2"
}

case "$MODE" in
  on)
    echo "==> Live-App stoppen (bleibt erhalten, nur gestoppt)"
    docker stop edufunds-app 2>/dev/null || true
    echo "==> Wartungs-Container starten (nginx:alpine)"
    docker rm -f edufunds-maintenance 2>/dev/null || true
    docker run -d --name edufunds-maintenance \
      --network "$NET" \
      --restart unless-stopped \
      -v "$REMOTE_PATH/ops/maintenance/index.html:/usr/share/nginx/html/index.html:ro" \
      $(router_labels edufunds-maintenance 80) \
      nginx:alpine >/dev/null
    echo "==> Wartungsmodus AKTIV"
    ;;
  off)
    echo "==> Live-App wieder starten"
    docker start edufunds-app 2>/dev/null || { echo "edufunds-app existiert nicht mehr — bitte ./scripts/deploy-production.sh"; }
    echo "==> Wartungs-Container entfernen"
    docker rm -f edufunds-maintenance 2>/dev/null || true
    echo "==> Wartungsmodus AUS — App wieder live"
    ;;
  status)
    echo "edufunds-app:         $(docker inspect -f '{{.State.Status}}' edufunds-app 2>/dev/null || echo 'fehlt')"
    echo "edufunds-maintenance: $(docker inspect -f '{{.State.Status}}' edufunds-maintenance 2>/dev/null || echo 'fehlt')"
    ;;
esac
EOF

echo
echo "==> Smoke"
sleep 3
code=$(curl -s -o /dev/null -w '%{http_code}' https://app.edufunds.org/ || true)
echo "    https://app.edufunds.org/ -> $code"
