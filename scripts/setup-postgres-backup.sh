#!/bin/bash
# PostgreSQL Backup Setup
# Führt das erste Setup für automatische Backups durch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/postgres-backup.sh"

echo "=== PostgreSQL Backup Setup ==="
echo ""

# Prüfen ob Backup-Script existiert
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Fehler: Backup-Script nicht gefunden: $BACKUP_SCRIPT"
    exit 1
fi

# Backup-Verzeichnis festlegen
read -p "Backup-Verzeichnis [/backup oder $HOME/backup]: " BACKUP_DIR
BACKUP_DIR="${BACKUP_DIR:-$HOME/backup}"

# Verzeichnis erstellen (mit sudo falls nötig)
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Erstelle Backup-Verzeichnis: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" 2>/dev/null || sudo mkdir -p "$BACKUP_DIR"
    
    # Berechtigungen setzen
    if [[ "$BACKUP_DIR" == /backup* ]]; then
        sudo chmod 755 "$BACKUP_DIR"
        sudo chown $(whoami):$(whoami) "$BACKUP_DIR" 2>/dev/null || true
    fi
fi

echo "Backup-Verzeichnis: $BACKUP_DIR"
echo ""

# PostgreSQL Verbindungsdaten
echo "PostgreSQL Verbindungsdaten:"
read -p "  Host [localhost]: " PGHOST
PGHOST="${PGHOST:-localhost}"

read -p "  Port [5432]: " PGPORT
PGPORT="${PGPORT:-5432}"

read -p "  Benutzer [postgres]: " PGUSER
PGUSER="${PGUSER:-postgres}"

read -sp "  Passwort (leer für .pgpass oder trust-Auth): " PGPASSWORD
echo ""

# .pgpass erstellen falls Passwort angegeben
if [ -n "$PGPASSWORD" ]; then
    PGPASS_FILE="$HOME/.pgpass"
    echo "$PGHOST:$PGPORT:*:$PGUSER:$PGPASSWORD" >> "$PGPASS_FILE"
    chmod 600 "$PGPASS_FILE"
    echo "Passwort in ~/.pgpass gespeichert"
fi

read -p "  Spezifische Datenbank (leer für alle): " PGDATABASE
echo ""

# Cronjob einrichten
echo "Cronjob für tägliches Backup (2:30 Uhr):"
read -p "Cronjob einrichten? [J/n]: " SETUP_CRON
SETUP_CRON="${SETUP_CRON:-J}"

if [[ "$SETUP_CRON" =~ ^[Jj] ]]; then
    # Temporäre Cron-Datei
    CRON_TEMP=$(mktemp)
    crontab -l 2>/dev/null > "$CRON_TEMP" || true
    
    # Alten Backup-Cron entfernen
    grep -v "postgres-backup.sh" "$CRON_TEMP" > "$CRON_TEMP.tmp" || true
    mv "$CRON_TEMP.tmp" "$CRON_TEMP"
    
    # Neuen Cron hinzufügen
    echo "" >> "$CRON_TEMP"
    echo "# PostgreSQL tägliches Backup (2:30 Uhr)" >> "$CRON_TEMP"
    echo "30 2 * * * export BACKUP_DIR=\"$BACKUP_DIR\"; export PGHOST=\"$PGHOST\"; export PGPORT=\"$PGPORT\"; export PGUSER=\"$PGUSER\"; export PGDATABASE=\"$PGDATABASE\"; $BACKUP_SCRIPT >> $BACKUP_DIR/cron.log 2>&1" >> "$CRON_TEMP"
    
    crontab "$CRON_TEMP"
    rm "$CRON_TEMP"
    
    echo "✓ Cronjob eingerichtet (täglich um 2:30 Uhr)"
else
    echo "Cronjob übersprungen"
fi

echo ""
echo "=== Setup abgeschlossen ==="
echo ""
echo "Konfiguration:"
echo "  Backup-Verzeichnis: $BACKUP_DIR"
echo "  PostgreSQL Host: $PGHOST:$PGPORT"
echo "  Benutzer: $PGUSER"
echo "  Datenbank: ${PGDATABASE:-alle}"
echo ""
echo "Manueller Test:"
echo "  BACKUP_DIR=$BACKUP_DIR PGHOST=$PGHOST PGPORT=$PGPORT PGUSER=$PGUSER $BACKUP_SCRIPT"
echo ""
echo "Cronjobs anzeigen: crontab -l"
