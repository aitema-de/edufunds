#!/usr/bin/env bash
#
# Setzt das Admin-Passwort für app.edufunds.org (ADMIN_PASSWORD_HASH in der
# Prod-Env) — interaktiv und sicher:
#   - Passwort wird versteckt eingelesen (read -rsp), landet NICHT in der History
#   - Hashing passiert im Prod-Container (bcrypt), Passwort reist nur per SSH-stdin
#   - nur der Hash (Einweg) wird in .env.production geschrieben
#   - Container wird neu gestartet, damit die neue Env greift
#
# Login danach: https://app.edufunds.org/admin/login  (E-Mail: office@aitema.de)
#
# Nutzung:  ./scripts/set-admin-password.sh

set -euo pipefail

REMOTE=root@49.13.15.44
REMOTE_PATH=/home/edufunds/edufunds-app
CONTAINER=edufunds-app
IMAGE=edufunds:latest

echo "== Admin-Passwort für app.edufunds.org setzen =="
read -rsp "Neues Passwort (min. 10 Zeichen): " PW1; echo
read -rsp "Passwort wiederholen:             " PW2; echo

[ "$PW1" = "$PW2" ] || { echo "FEHLER: Passwörter stimmen nicht überein."; exit 1; }
[ "${#PW1}" -ge 10 ] || { echo "FEHLER: mindestens 10 Zeichen."; exit 1; }

echo "==> Hash im Container erzeugen (Passwort wird nicht gespeichert)…"
HASH=$(printf '%s' "$PW1" | ssh "$REMOTE" "docker exec -i $CONTAINER node -e '
let d=\"\";
process.stdin.on(\"data\",c=>d+=c).on(\"end\",()=>{
  const pw=d.replace(/\r?\n+\$/,\"\");
  process.stdout.write(require(\"bcryptjs\").hashSync(pw,12));
});'")
unset PW1 PW2

case "$HASH" in
  '$2'*) : ;;  # plausibler bcrypt-Hash
  *) echo "FEHLER: Hash sieht nicht wie bcrypt aus: ${HASH:0:12}…"; exit 1 ;;
esac

echo "==> .env.production aktualisieren + Container neu starten…"
ssh "$REMOTE" "ADMIN_HASH='$HASH' bash -s" <<REMOTE
set -euo pipefail
cd $REMOTE_PATH
# alte Zeile entfernen, neuen Hash literal anhängen
grep -v '^ADMIN_PASSWORD_HASH=' .env.production > .env.production.tmp || true
printf 'ADMIN_PASSWORD_HASH=%s\n' "\$ADMIN_HASH" >> .env.production.tmp
mv .env.production.tmp .env.production

# Container neu erzeugen (Env wird nur beim Start gelesen)
docker stop $CONTAINER >/dev/null 2>&1 || true
docker rm   $CONTAINER >/dev/null 2>&1 || true
docker run -d --name $CONTAINER \\
  --network hetzner-stack_web \\
  --restart unless-stopped \\
  --env-file $REMOTE_PATH/.env.production \\
  -v $REMOTE_PATH/data:/app/data:ro \\
  --label 'traefik.enable=true' \\
  --label 'traefik.docker.network=hetzner-stack_web' \\
  --label 'traefik.http.routers.edufunds-app.rule=Host(\`app.edufunds.org\`)' \\
  --label 'traefik.http.routers.edufunds-app.entrypoints=websecure' \\
  --label 'traefik.http.routers.edufunds-app.tls=true' \\
  --label 'traefik.http.routers.edufunds-app.tls.certresolver=letsencrypt' \\
  --label 'traefik.http.services.edufunds-app.loadbalancer.server.port=3000' \\
  $IMAGE >/dev/null

echo "Warte auf Healthcheck…"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker inspect --format '{{.State.Health.Status}}' $CONTAINER 2>/dev/null | grep -q healthy; then
    echo "  healthy."; break
  fi
  sleep 5
done
REMOTE

echo
echo "== Fertig. =="
echo "Login: https://app.edufunds.org/admin/login"
echo "E-Mail: office@aitema.de  (Passwort = das eben gesetzte)"
