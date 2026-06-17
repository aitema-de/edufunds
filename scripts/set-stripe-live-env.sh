#!/usr/bin/env bash
# Stripe Live-Cutover: .env.production auf dem Prod-Server auf Live-Keys umstellen.
#
# Setzt STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET und STRIPE_PRICE_EINZELANTRAG
# in /home/edufunds/edufunds-app/.env.production. Geheimnisse werden versteckt
# eingelesen (read -rsp) und NUR ueber ssh-stdin uebertragen — nie als Argument
# (kein Eintrag in Shell-History, ps/argv oder Chat). Idempotent + Backup.
#
# Nutzung:  ./scripts/set-stripe-live-env.sh
#           (danach: ./scripts/deploy-production.sh)
#
# Rollback: das beim Lauf angelegte .env.production.bak-<ts> zuruecksichern.

set -euo pipefail

REMOTE=root@49.13.15.44
ENVFILE=/home/edufunds/edufunds-app/.env.production
LIVE_PRICE_DEFAULT="price_1ThRcARbKUcSBRFKwVaNcYHr"   # EduFunds-Live-Einzelantrag (bestaetigt)

echo "==> Stripe Live-Cutover: .env.production umstellen"
echo "    Server: $REMOTE"
echo "    Datei:  $ENVFILE"
echo "    (Werte werden versteckt eingegeben und nur via ssh-stdin uebertragen)"
echo

# --- Eingaben (versteckt, mit Format-Pruefung) ---
read -rsp "1) Live Secret Key (sk_live_...): " SK; echo
[[ "$SK" == sk_live_* ]] || { echo "FEHLER: muss mit 'sk_live_' beginnen. Abgebrochen."; exit 1; }

read -rsp "2) Live Webhook-Secret (whsec_...): " WH; echo
[[ "$WH" == whsec_* ]]   || { echo "FEHLER: muss mit 'whsec_' beginnen. Abgebrochen."; exit 1; }

read -rp  "3) Live Price-ID [Enter = $LIVE_PRICE_DEFAULT]: " PR
PR="${PR:-$LIVE_PRICE_DEFAULT}"
[[ "$PR" == price_* ]]   || { echo "FEHLER: muss mit 'price_' beginnen. Abgebrochen."; exit 1; }

echo
echo "==> Uebertrage an Server (Backup wird angelegt) ..."

# Werte via stdin (drei Zeilen). Das Remote-Skript steht im doppelt gequoteten
# Kommandostring: lokal expandiert nur $ENVFILE (kein Geheimnis); alles mit \$
# laeuft remote. Die Secrets erreichen den Server ausschliesslich ueber stdin.
printf '%s\n%s\n%s\n' "$SK" "$WH" "$PR" | ssh "$REMOTE" "
  set -euo pipefail
  ENVFILE='$ENVFILE'
  read -r SK; read -r WH; read -r PR
  [ -f \"\$ENVFILE\" ] || { echo 'FEHLER: .env.production nicht gefunden' >&2; exit 1; }
  ts=\$(date +%Y%m%d-%H%M%S)
  cp \"\$ENVFILE\" \"\$ENVFILE.bak-\$ts\"
  set_kv() {
    local k=\"\$1\" v=\"\$2\"
    if grep -q \"^\$k=\" \"\$ENVFILE\"; then
      # | als sed-Delimiter; Stripe-Keys enthalten kein |
      sed -i \"s|^\$k=.*|\$k=\$v|\" \"\$ENVFILE\"
    else
      printf '%s=%s\n' \"\$k\" \"\$v\" >> \"\$ENVFILE\"
    fi
  }
  set_kv STRIPE_SECRET_KEY      \"\$SK\"
  set_kv STRIPE_WEBHOOK_SECRET  \"\$WH\"
  set_kv STRIPE_PRICE_EINZELANTRAG \"\$PR\"
  echo \"OK — Backup: \$ENVFILE.bak-\$ts\"
  echo 'Kontrolle (maskiert):'
  grep -E '^STRIPE_(SECRET_KEY|WEBHOOK_SECRET|PRICE_EINZELANTRAG)=' \"\$ENVFILE\" \
    | sed -E 's/=(.{10}).*/=\1.../'
"

echo
echo "==> Fertig. Naechster Schritt:"
echo "    ./scripts/deploy-production.sh      # baut OHNE Bypass = echte Zahlung"
