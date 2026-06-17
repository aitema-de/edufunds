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
PAYWALL_BYPASS=0   # 0 = echte Zahlung (Go-Live). 1 = Pilot-Bypass (kostenlos freischalten).

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) YES=1; shift ;;
    --with-paywall-bypass) PAYWALL_BYPASS=1; shift ;;  # nur fuer Pilot-/UAT-Builds
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
if [ "$PAYWALL_BYPASS" -eq 1 ]; then
  echo "    PAYWALL:  BYPASS AKTIV (--with-paywall-bypass) — Antrag kostenlos freischaltbar, KEINE echte Zahlung."
else
  echo "    PAYWALL:  AUS = echte Zahlung aktiv (Go-Live-Modus)."
fi
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

# Go-Live-Schutz: Bypass AUS, aber Stripe-Key noch Test -> Checkout wuerde fuer
# echte Kunden brechen. Hart stoppen, bevor gebaut/deployt wird.
if [ "$PAYWALL_BYPASS" -eq 0 ] && grep -q '^STRIPE_SECRET_KEY=sk_test' .env.production; then
  echo "ABBRUCH: Paywall-Bypass ist AUS (Go-Live), aber STRIPE_SECRET_KEY ist noch ein Test-Key (sk_test)." >&2
  echo "         Erst Live-Keys setzen (scripts/set-stripe-live-env.sh) ODER Pilot mit --with-paywall-bypass deployen." >&2
  exit 1
fi

echo "==> docker build (Paywall-Bypass=$PAYWALL_BYPASS)"
# NEXT_PUBLIC_* wird zur Build-Zeit ins Bundle inlined — Client UND Server-Route
# lesen denselben Wert. =0 (Default) => echte Zahlung. =1 => Pilot-Bypass.
docker build --build-arg NEXT_PUBLIC_PAYWALL_DEV_MOCK=$PAYWALL_BYPASS -t edufunds:latest .

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
