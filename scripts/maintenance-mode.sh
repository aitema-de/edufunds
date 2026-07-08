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
  echo "==> Wartungsseite + nginx-Config auf Server kopieren"
  ssh "$REMOTE" "mkdir -p $REMOTE_PATH/ops/maintenance"
  scp -q ops/maintenance/index.html "$REMOTE:$REMOTE_PATH/ops/maintenance/index.html"
  scp -q ops/maintenance/nginx.conf "$REMOTE:$REMOTE_PATH/ops/maintenance/nginx.conf"
fi

ssh "$REMOTE" "MODE=$MODE REMOTE_PATH=$REMOTE_PATH NET=$NET bash -se" <<'EOF'
set -euo pipefail

router_labels() {
  # Eigener Router-Name 'edufunds-maint' mit HOHER Prioritaet, damit er den
  # (weiterhin existierenden) catch-all 'edufunds-app'-Router ueberlagert.
  # edufunds-app bleibt absichtlich LAUFEND als interner Proxy-Backend fuer
  # /api/newsletter + /admin (siehe ops/maintenance/nginx.conf) — wird aber extern
  # nie direkt erreicht, weil dieser Router (Prio 1000) alles Eingehende gewinnt.
  # Deckt jetzt die FINALE Plattform-Domain edufunds.org ab (+ www/app, die in der
  # nginx per Host-301 auf edufunds.org umgeleitet werden). Go-Live = 'off' → der
  # edufunds-app-Router (dann Host edufunds.org) uebernimmt.
  echo "--label traefik.enable=true"
  echo "--label traefik.docker.network=$NET"
  echo "--label traefik.http.routers.edufunds-maint.rule=Host(\`edufunds.org\`) || Host(\`www.edufunds.org\`) || Host(\`app.edufunds.org\`)"
  echo "--label traefik.http.routers.edufunds-maint.priority=1000"
  echo "--label traefik.http.routers.edufunds-maint.entrypoints=websecure"
  echo "--label traefik.http.routers.edufunds-maint.tls=true"
  echo "--label traefik.http.routers.edufunds-maint.tls.certresolver=letsencrypt"
  echo "--label traefik.http.routers.edufunds-maint.service=edufunds-maint"
  echo "--label traefik.http.services.edufunds-maint.loadbalancer.server.port=80"
}

case "$MODE" in
  on)
    # WICHTIG: Wartungs-Container (Prio 1000) ZUERST, damit kein Fenster entsteht,
    # in dem der catch-all edufunds-app-Router die volle App (Live-Stripe!) exponiert.
    echo "==> Wartungs-Container starten (nginx:alpine, eigener Router Prio 1000)"
    docker rm -f edufunds-maintenance 2>/dev/null || true
    docker run -d --name edufunds-maintenance \
      --network "$NET" \
      --restart unless-stopped \
      -v "$REMOTE_PATH/ops/maintenance/index.html:/usr/share/nginx/html/index.html:ro" \
      -v "$REMOTE_PATH/ops/maintenance/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
      $(router_labels) \
      nginx:alpine >/dev/null
    sleep 2
    echo "==> Live-App starten (laeuft als interner /api/newsletter-Proxy-Backend, extern verborgen)"
    docker start edufunds-app 2>/dev/null || echo "    WARN: edufunds-app existiert nicht — Newsletter-Proxy liefert 503 bis Deploy."
    echo "==> Wartungsmodus AKTIV (Seite live, /api/newsletter funktional, Rest verborgen)"
    ;;
  off)
    echo "==> Wartungs-Container entfernen (edufunds-app-Router uebernimmt wieder)"
    docker rm -f edufunds-maintenance 2>/dev/null || true
    echo "==> Live-App sicherstellen"
    docker start edufunds-app 2>/dev/null || { echo "edufunds-app existiert nicht mehr — bitte ./scripts/deploy-production.sh"; }
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
