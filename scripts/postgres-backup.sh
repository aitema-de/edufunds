#!/bin/bash
# PostgreSQL Backup Script mit Rotation
# Erstellt tägliche Dumps mit 7-Tage Rotation

# Konfiguration
BACKUP_DIR="${BACKUP_DIR:-$HOME/backup}"  # Standard: ~/backup oder /backup
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Montag, 7=Sonntag
RETENTION_DAYS=7

# PostgreSQL Verbindungsdaten (anpassen oder via Environment Variables)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
# PGPASSWORD sollte via Environment oder .pgpass gesetzt werden

# Logging
LOGFILE="$BACKUP_DIR/backup.log"

# Funktionen
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR" || error_exit "Konnte Backup-Verzeichnis nicht erstellen: $BACKUP_DIR"

log "=== PostgreSQL Backup gestartet ==="

# Prüfen ob pg_dump verfügbar
if ! command -v pg_dump &> /dev/null; then
    error_exit "pg_dump nicht gefunden. Bitte postgresql-client installieren."
fi

# Datenbanken abrufen
if [ -n "$PGDATABASE" ]; then
    # Nur eine spezifische Datenbank sichern
    DATABASES="$PGDATABASE"
    log "Sichere einzelne Datenbank: $PGDATABASE"
else
    # Alle Datenbanken außer System-DBs
    DATABASES=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Atc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template0', 'template1');" 2>/dev/null)
    
    if [ -z "$DATABASES" ]; then
        # Fallback: alle Datenbanken
        DATABASES=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Atc "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null)
    fi
    log "Gefundene Datenbanken: $(echo $DATABASES | wc -w)"
fi

if [ -z "$DATABASES" ]; then
    error_exit "Keine Datenbanken gefunden oder Verbindung fehlgeschlagen"
fi

# Backup-Counter
SUCCESS=0
FAILED=0

for DB in $DATABASES; do
    BACKUP_FILE="$BACKUP_DIR/${DB}_${DATE}.sql.gz"
    
    log "Sichere Datenbank: $DB -> $(basename $BACKUP_FILE)"
    
    if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Fc "$DB" 2>/dev/null | gzip > "$BACKUP_FILE"; then
        # Dateigröße prüfen
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "  ✓ Erfolgreich ($SIZE)"
        SUCCESS=$((SUCCESS + 1))
        
        # Tägliches Backup mit Wochentag (für schnellen Zugriff)
        DAILY_LINK="$BACKUP_DIR/${DB}_latest.sql.gz"
        rm -f "$DAILY_LINK"
        ln -s "$BACKUP_FILE" "$DAILY_LINK" 2>/dev/null || true
        
        # Wochentag-Backup (7 Tage Rotation)
        WEEKLY_LINK="$BACKUP_DIR/${DB}_day${DAY_OF_WEEK}.sql.gz"
        rm -f "$WEEKLY_LINK"
        cp "$BACKUP_FILE" "$WEEKLY_LINK" 2>/dev/null || true
    else
        log "  ✗ Fehlgeschlagen"
        rm -f "$BACKUP_FILE"
        FAILED=$((FAILED + 1))
    fi
done

# Alte Backups löschen (älter als RETENTION_DAYS)
log "Bereinige alte Backups (älter als $RETENTION_DAYS Tage)..."
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -print -delete 2>/dev/null | wc -l)
log "  $DELETED alte Backup-Dateien gelöscht"

# Speicherplatz anzeigen
DISK_USAGE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "Backup-Verzeichnis: $DISK_USAGE"

log "=== Backup abgeschlossen: $SUCCESS erfolgreich, $FAILED fehlgeschlagen ==="

# Exit-Code
[ $FAILED -eq 0 ] && exit 0 || exit 1
