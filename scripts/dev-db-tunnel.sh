#!/usr/bin/env bash
# SSH-Tunnel zum Server-Postgres für lokale Entwicklung
# Port 5433 lokal → 127.0.0.1:15432 auf Server (edufunds-postgres Container-Publish)
#
# Usage:
#   ./scripts/dev-db-tunnel.sh           # Foreground (Ctrl+C zum Beenden)
#   ./scripts/dev-db-tunnel.sh --bg      # Hintergrund, PID in /tmp/edufunds-tunnel.pid
#   ./scripts/dev-db-tunnel.sh --stop    # Hintergrund-Tunnel beenden

set -euo pipefail

PIDFILE=/tmp/edufunds-tunnel.pid
REMOTE=root@49.13.15.44
LOCAL_PORT=5433
REMOTE_HOST=127.0.0.1
REMOTE_PORT=15432

case "${1:-}" in
  --stop)
    if [ -f "$PIDFILE" ]; then
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo "Tunnel gestoppt."
    else
      echo "Kein Tunnel läuft."
    fi
    ;;
  --bg)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "Tunnel läuft bereits (PID $(cat "$PIDFILE"))."
      exit 0
    fi
    ssh -fN -L "$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" "$REMOTE"
    pgrep -f "ssh -fN -L $LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" > "$PIDFILE"
    echo "Tunnel im Hintergrund gestartet (PID $(cat "$PIDFILE"))."
    echo "Verbindung: postgresql://edufunds:***@localhost:$LOCAL_PORT/edufunds"
    ;;
  *)
    echo "Öffne Tunnel localhost:$LOCAL_PORT → $REMOTE_HOST:$REMOTE_PORT"
    echo "Ctrl+C zum Beenden."
    exec ssh -N -L "$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" "$REMOTE"
    ;;
esac
