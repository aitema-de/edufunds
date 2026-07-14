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
  echo "==> Wartungsseite (html/ inkl. Schriften) + nginx-Config auf Server kopieren"
  ssh "$REMOTE" "mkdir -p $REMOTE_PATH/ops/maintenance"
  # VERZEICHNISSE kopieren, nicht Einzeldateien: Die Mounts unten sind Verzeichnis-
  # Mounts. Das ist Absicht — ein Einzeldatei-Bind-Mount haengt am INODE, und ein
  # 'scp' ersetzt die Datei (neuer Inode). Der Container haelt dann den alten und
  # liefert stur die ALTE Seite aus, mit HTTP 200 und ohne Fehlermeldung.
  # Verzeichnis-Mounts folgen dem Pfad — Dateien darin lassen sich frei ersetzen.
  scp -qr ops/maintenance/html "$REMOTE:$REMOTE_PATH/ops/maintenance/"
  scp -qr ops/maintenance/conf "$REMOTE:$REMOTE_PATH/ops/maintenance/"
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
  # WICHTIG: keine Leerzeichen um || — router_labels wird unquotiert per $(...)
  # expandiert; Leerzeichen im Label-Wert werden word-gesplittet ("docker: invalid
  # reference format"). Traefik akzeptiert || auch ohne umgebende Leerzeichen.
  echo "--label traefik.http.routers.edufunds-maint.rule=Host(\`edufunds.org\`)||Host(\`www.edufunds.org\`)||Host(\`app.edufunds.org\`)"
  echo "--label traefik.http.routers.edufunds-maint.priority=1000"
  echo "--label traefik.http.routers.edufunds-maint.entrypoints=websecure"
  echo "--label traefik.http.routers.edufunds-maint.tls=true"
  echo "--label traefik.http.routers.edufunds-maint.tls.certresolver=letsencrypt"
  echo "--label traefik.http.routers.edufunds-maint.service=edufunds-maint"
  echo "--label traefik.http.services.edufunds-maint.loadbalancer.server.port=80"
}

case "$MODE" in
  on)
    # ┌─ SICHERHEIT: Reihenfolge ist NICHT beliebig ──────────────────────────────┐
    # │ 'docker rm -f edufunds-maintenance' nimmt den Router mit Prio 1000 weg.   │
    # │ Laeuft edufunds-app zu diesem Zeitpunkt (z.B. weil 'on' ein ZWEITES Mal   │
    # │ aufgerufen wird, um nur den Seitentext zu aktualisieren), gewinnt in dem  │
    # │ Fenster sein catch-all-Router — und Traefik liefert fuer ein paar Sekunden│
    # │ die VOLLE App unter edufunds.org aus (Live-Stripe, ungeprueft Rechtstexte)│
    # │ Deshalb: App ZUERST stoppen. Ohne sie gibt es keinen konkurrierenden      │
    # │ Router; im schlimmsten Fall ist die Seite kurz nicht erreichbar (503) —   │
    # │ das ist harmlos, ein Leck waere es nicht.                                 │
    # └───────────────────────────────────────────────────────────────────────────┘
    echo "==> edufunds-app stoppen (nimmt den konkurrierenden catch-all-Router aus Traefik)"
    docker stop edufunds-app >/dev/null 2>&1 && echo "    gestoppt" || echo "    laeuft nicht — ok"

    # Der Neuaufbau des Containers ist auch aus einem zweiten Grund noetig:
    # index.html/nginx.conf sind EINZELDATEI-Bind-Mounts. Docker bindet die an den
    # INODE. Ein 'scp' ersetzt die Datei (neuer Inode) -> der laufende Container
    # haelt den alten und liefert stur die ALTE Seite aus, bei identischem Pfad und
    # ohne jede Fehlermeldung. Nur ein neu erstellter Container loest den Mount neu auf.
    echo "==> Wartungs-Container starten (nginx:alpine, eigener Router Prio 1000)"
    docker rm -f edufunds-maintenance 2>/dev/null || true
    docker run -d --name edufunds-maintenance \
      --network "$NET" \
      --restart unless-stopped \
      -v "$REMOTE_PATH/ops/maintenance/html:/usr/share/nginx/html:ro" \
      -v "$REMOTE_PATH/ops/maintenance/conf:/etc/nginx/conf.d:ro" \
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

if [ "$MODE" = "on" ]; then
  # HTTP 200 allein beweist NICHTS: Bei einem Inode-verwaisten Bind-Mount liefert der
  # Container die ALTE Seite mit 200 aus. Deshalb gegen den Inhalt pruefen — die
  # lokale Datei muss das sein, was auch ankommt.
  marker=$(grep -oE '<h1>[^<]*' ops/maintenance/html/index.html | head -1 | sed 's/<h1>//' | cut -c1-18)
  live=$(curl -s --max-time 15 https://edufunds.org/ || true)
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://edufunds.org/ || true)
  echo "    https://edufunds.org/ -> $code"
  if [ -n "$marker" ] && printf '%s' "$live" | grep -qF "$marker"; then
    echo "    Inhalt: aktuelle Fassung wird ausgeliefert (\"$marker...\")"
  else
    echo "    FEHLER: Die ausgelieferte Seite ist NICHT die lokale Fassung!" >&2
    echo "            Erwartet: \"$marker...\" — vermutlich haelt der Container einen" >&2
    echo "            verwaisten Inode (Einzeldatei-Bind-Mount). Container neu erstellen." >&2
    exit 1
  fi
  # Gegenprobe: Die App darf NICHT durchscheinen.
  if printf '%s' "$live" | grep -qiE 'Jetzt starten|29,90|Wizard'; then
    echo "    ALARM: Unter edufunds.org scheint die APP durch — sofort pruefen!" >&2
    exit 1
  fi
  echo "    App ist verborgen (Coming-Soon liefert alle Pfade)"

  # DATENSCHUTZ: Die Seite darf KEINE externen Hosts laden. Am 14.07.2026 hing hier
  # eine Google-Fonts-Einbindung — sie uebertrug die IP jedes Besuchers ohne
  # Einwilligung an Google (USA) und widersprach der Datenschutzerklaerung, die
  # Schriften "vom eigenen Server" zusagt (abmahnfaehig, vgl. LG Muenchen I 3 O 17493/20).
  # w3.org ist nur der SVG-Namespace im Markup, kein Request.
  extern=$(printf '%s' "$live" | grep -oE 'https?://[a-z0-9.-]+' | grep -viE 'w3\.org|edufunds\.org' | sort -u || true)
  if [ -n "$extern" ]; then
    echo "    ALARM: Die Seite laedt von EXTERNEN Hosts — Datenschutzverstoss!" >&2
    printf '            %s\n' $extern >&2
    exit 1
  fi
  echo "    Keine externen Hosts (Schriften self-hosted)"

  # Schriften muessen auch wirklich ausgeliefert werden (sonst faellt die Seite still
  # auf eine Systemschrift zurueck und niemand merkt es).
  for f in ops/maintenance/html/fonts/*.woff2; do
    [ -e "$f" ] || continue
    fc=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://edufunds.org/fonts/$(basename "$f")" || true)
    [ "$fc" = "200" ] || { echo "    FEHLER: /fonts/$(basename "$f") -> $fc" >&2; exit 1; }
  done
  echo "    Schriften werden ausgeliefert"
else
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://edufunds.org/ || true)
  echo "    https://edufunds.org/ -> $code"
fi
