#!/usr/bin/env bash
# Deploy aktueller main-Branch nach Production.
#
# ACHTUNG: Diese Instanz ist live fuer externe Nutzer. NIE ohne
# erfolgreichen Staging-Smoke-Test deployen.
#
# Nutzung:
#   ./scripts/deploy-production.sh              # interaktiv, zweifache Bestaetigung
#   ./scripts/deploy-production.sh --yes        # ohne Frage (CI-Use)
#   ./scripts/deploy-production.sh --apex       # Cutover Phase 2: App bedient edufunds.org
#
# --apex (Runbook Abschnitt 9.4): haengt den Traefik-Router von app.edufunds.org
# auf die Apex-Domain um und legt einen 301-Redirect-Router (www./app. -> Apex) an.
# Dieses Skript ist die authoritative Quelle der Container-Labels — ein Umhaengen
# nur am Container haelt nicht, der naechste Deploy wuerde es zuruecksetzen.
# NACH dem Apex-Switch gehoert --apex daher in JEDEN weiteren Prod-Deploy.

set -euo pipefail

REMOTE=root@49.13.15.44
REMOTE_PATH=/home/edufunds/edufunds-app
BRANCH=main
YES=0
PAYWALL_BYPASS=0   # 0 = echte Zahlung (Go-Live). 1 = Pilot-Bypass (kostenlos freischalten).
APEX=0             # 1 = App bedient edufunds.org (Cutover Phase 2)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) YES=1; shift ;;
    --with-paywall-bypass) PAYWALL_BYPASS=1; shift ;;  # nur fuer Pilot-/UAT-Builds
    --apex) APEX=1; shift ;;                           # Cutover Phase 2
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unbekanntes Argument: $1" >&2; exit 2 ;;
  esac
done

if [ "$APEX" -eq 1 ]; then
  ZIEL="https://edufunds.org (Apex; www./app. -> 301)"
else
  ZIEL="https://app.edufunds.org"
fi

echo "==> PRODUCTION-Deploy"
echo "    Remote:  $REMOTE"
echo "    Branch:  $BRANCH"
echo "    Ziel:    $ZIEL"
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

# Oeffentliche Basis-URL aus der Env-Datei ziehen (eine Quelle der Wahrheit) und
# als Build-Arg durchreichen: NEXT_PUBLIC_* wird zur Build-Zeit ins Client-Bundle
# inlined — der Laufzeit-Wert aus --env-file erreicht den Client sonst NICHT.
set -a; source <(grep -E '^NEXT_PUBLIC_APP_URL=' .env.production || true); set +a
APP_URL="\${NEXT_PUBLIC_APP_URL:-https://edufunds.org}"

echo "==> docker build (Paywall-Bypass=$PAYWALL_BYPASS, APP_URL=\$APP_URL)"
# NEXT_PUBLIC_* wird zur Build-Zeit ins Bundle inlined — Client UND Server-Route
# lesen denselben Wert. =0 (Default) => echte Zahlung. =1 => Pilot-Bypass.
docker build \
  --build-arg NEXT_PUBLIC_PAYWALL_DEV_MOCK=$PAYWALL_BYPASS \
  --build-arg NEXT_PUBLIC_APP_URL="\$APP_URL" \
  -t edufunds:latest .

# Traefik-Router: Default app.edufunds.org, mit --apex die Apex-Domain + 301-Router.
# Rule bewusst OHNE Leerzeichen um '||' (Word-Splitting-Falle bei Label-Expansion).
#
# ⚠️ Alle Label-Werte mit Backticks MUESSEN einfach gequotet sein ('...'), nie doppelt.
# Dieser Block laeuft via unquoted Heredoc auf dem Remote: \` kommt dort als echter
# Backtick an. In "..." macht die Remote-Shell daraus eine Kommandosubstitution
# ("www.edufunds.org: command not found"), der Rueckgabewert 127 loest `set -e` aus und
# der Deploy stirbt NACH dem Build, aber VOR dem Container-Tausch — sichtbar nur an zwei
# Fehlerzeilen. In '...' bleibt der Backtick literal, was Traefik braucht.
# (Bug gefunden+behoben 17.07.2026 beim ersten echten --apex-Deploy.)
if [ "$APEX" -eq 1 ]; then
  ROUTER_RULE='Host(\`edufunds.org\`)'
  EXTRA_LABELS=(
    --label 'traefik.http.routers.edufunds-redir.rule=Host(\`www.edufunds.org\`)||Host(\`app.edufunds.org\`)'
    --label 'traefik.http.routers.edufunds-redir.entrypoints=websecure'
    --label 'traefik.http.routers.edufunds-redir.tls=true'
    --label 'traefik.http.routers.edufunds-redir.tls.certresolver=letsencrypt'
    --label 'traefik.http.routers.edufunds-redir.middlewares=edufunds-apex'
    --label 'traefik.http.middlewares.edufunds-apex.redirectregex.regex=^https?://(www\.|app\.)edufunds\.org/(.*)'
    --label 'traefik.http.middlewares.edufunds-apex.redirectregex.replacement=https://edufunds.org/\${2}'
    --label 'traefik.http.middlewares.edufunds-apex.redirectregex.permanent=true'
  )
else
  ROUTER_RULE='Host(\`app.edufunds.org\`)'
  EXTRA_LABELS=()
fi

echo "==> Container swap (Router: \$ROUTER_RULE)"
docker stop edufunds-app 2>/dev/null || true
docker rm   edufunds-app 2>/dev/null || true
docker run -d --name edufunds-app \
  --network hetzner-stack_web \
  --restart unless-stopped \
  --env-file $REMOTE_PATH/.env.production \
  -v $REMOTE_PATH/data:/app/data:ro \
  --label 'traefik.enable=true' \
  --label 'traefik.docker.network=hetzner-stack_web' \
  --label "traefik.http.routers.edufunds-app.rule=\$ROUTER_RULE" \
  --label 'traefik.http.routers.edufunds-app.entrypoints=websecure' \
  --label 'traefik.http.routers.edufunds-app.tls=true' \
  --label 'traefik.http.routers.edufunds-app.tls.certresolver=letsencrypt' \
  --label 'traefik.http.services.edufunds-app.loadbalancer.server.port=3000' \
  "\${EXTRA_LABELS[@]}" \
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
if [ "$APEX" -eq 1 ]; then SMOKE_BASE="https://edufunds.org"; else SMOKE_BASE="https://app.edufunds.org"; fi
for path in / /foerderprogramme /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$SMOKE_BASE$path" || true)
  echo "    $SMOKE_BASE$path -> $code"
done
# Solange die Wartungsseite (Traefik-Prio 1000) laeuft, antwortet hier die
# Coming-Soon-Seite mit 200 — nicht die App. Echte App-Verifikation: Runbook 3.4.
echo
echo "==> Fertig. Bitte manuell in den Browser schauen."
