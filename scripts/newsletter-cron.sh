#!/usr/bin/env bash
#
# Monatlicher Newsletter-Cron-Anstoß.
#
# Ruft den geschützten Cron-Endpoint auf, der einen Newsletter-Entwurf erzeugt,
# als 'draft' speichert und eine Admin-Mail verschickt. Versendet NICHTS an
# Abonnenten — das erfordert manuelle Freigabe im Admin-Bereich.
#
# Zusätzlich (optional) wird Kolja per Telegram informiert, sofern `notify-kolja`
# in der ausführenden Umgebung verfügbar ist (Bridge-Binary lebt in Koljas WSL,
# nicht im Container — daher geschieht die Telegram-Meldung hier im Wrapper).
#
# Crontab-Beispiel (am 1. jedes Monats, 08:00):
#   0 8 1 * * /home/kolja/edufunds-app/scripts/newsletter-cron.sh >> /var/log/edufunds-newsletter.log 2>&1
#
# Erwartete Umgebungsvariablen (oder im Skript unten setzen):
#   EDUFUNDS_BASE_URL   z.B. https://edufunds.org   (Default: aus .env.local)
#   CRON_SECRET         Shared Secret für den Endpoint   (Default: aus .env.local)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# CRON_SECRET + URL aus der passenden Env-Datei laden (Prod zuerst, dann Dev),
# falls nicht bereits gesetzt. Nur diese zwei Variablen werden gegrept — andere
# Werte (z.B. FROM_EMAIL mit Leerzeichen/<>) würden beim Sourcen brechen.
for ENVF in "$APP_DIR/.env.production" "$APP_DIR/.env.local"; do
  if [[ -f "$ENVF" ]]; then
    # shellcheck disable=SC1090
    set -a; source <(grep -E '^(CRON_SECRET|NEXT_PUBLIC_APP_URL)=' "$ENVF" || true); set +a
    break
  fi
done

BASE_URL="${EDUFUNDS_BASE_URL:-${NEXT_PUBLIC_APP_URL:-https://edufunds.org}}"
SECRET="${CRON_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "[newsletter-cron] CRON_SECRET nicht gesetzt — Abbruch." >&2
  exit 1
fi

echo "[newsletter-cron] $(date -Is) → POST $BASE_URL/api/cron/newsletter"
RESPONSE="$(curl -fsS -X POST "$BASE_URL/api/cron/newsletter" \
  -H "x-cron-key: $SECRET" \
  -H "Content-Type: application/json" || true)"

echo "[newsletter-cron] Antwort: $RESPONSE"

# Telegram-Benachrichtigung (best effort).
if command -v notify-kolja >/dev/null 2>&1; then
  # telegramMessage aus der JSON-Antwort extrahieren (ohne jq-Abhängigkeit via node).
  MSG="$(node -e 'try{const r=JSON.parse(process.argv[1]||"{}");process.stdout.write(r.notification&&r.notification.telegramMessage?r.notification.telegramMessage:(r.skipped?"Newsletter-Entwurf für diesen Monat existiert bereits.":""))}catch(e){}' "$RESPONSE" 2>/dev/null || true)"
  if [[ -n "$MSG" ]]; then
    notify-kolja "$MSG" || echo "[newsletter-cron] notify-kolja fehlgeschlagen (ignoriert)."
  fi
fi

echo "[newsletter-cron] fertig."
