# PostgreSQL Backup

Automatische tägliche PostgreSQL Backups mit 7-Tage Rotation.

## Features

- ✅ Tägliche automatische Backups
- ✅ 7-Tage Rotation (alte Backups werden automatisch gelöscht)
- ✅ Gzip-Komprimierung
- ✅ Custom Format (pg_dump custom) für schnelleres Restore
- ✅ Wochentag-Backups (schneller Zugriff auf letzte 7 Tage)
- ✅ Unterstützung für alle Datenbanken oder einzelne DB

## Schnellstart

```bash
# Setup ausführen
./scripts/setup-postgres-backup.sh
```

Das Setup fragt nach:
- Backup-Verzeichnis (z.B. `/backup` oder `~/backup`)
- PostgreSQL Verbindungsdaten
- Ob ein Cronjob eingerichtet werden soll

## Manuelle Nutzung

```bash
# Mit Standard-Einstellungen
./scripts/postgres-backup.sh

# Mit benutzerdefinierten Parametern
BACKUP_DIR=/backup PGHOST=localhost PGUSER=postgres ./scripts/postgres-backup.sh

# Nur eine Datenbank
PGDATABASE=mydb ./scripts/postgres-backup.sh
```

## Backup-Dateien

- `DBNAME_YYYYMMDD_HHMMSS.sql.gz` - Zeitstempel-Backups
- `DBNAME_latest.sql.gz` - Symlink zum letzten Backup
- `DBNAME_day1.sql.gz` bis `DBNAME_day7.sql.gz` - Wochentag-Backups (Rotation)

## Restore

```bash
# Mit pg_restore (custom format)
gunzip < DBNAME_20250115_023000.sql.gz | pg_restore -h localhost -U postgres -d DBNAME

# Oder für SQL-Format (falls geändert)
gunzip < backup.sql.gz | psql -h localhost -U postgres -d DBNAME
```

## Systemd Timer (Alternative zu Cron)

```bash
# Service und Timer kopieren
sudo cp scripts/postgres-backup.service /etc/systemd/system/
sudo cp scripts/postgres-backup.timer /etc/systemd/system/

# Konfiguration anpassen (Pfade, Credentials)
sudo systemctl edit postgres-backup.service

# Timer aktivieren
sudo systemctl daemon-reload
sudo systemctl enable postgres-backup.timer
sudo systemctl start postgres-backup.timer

# Status prüfen
sudo systemctl list-timers postgres-backup.timer
```

## Cronjob (manuell)

```bash
# Cronjob bearbeiten
crontab -e

# Diese Zeile hinzufügen (täglich 2:30 Uhr)
30 2 * * * /home/edufunds/edufunds-app/scripts/postgres-backup.sh >> /backup/cron.log 2>&1
```

## Authentifizierung

Option 1: `.pgpass` Datei (empfohlen)
```bash
echo "localhost:5432:*:postgres:DEIN_PASSWORT" > ~/.pgpass
chmod 600 ~/.pgpass
```

Option 2: Environment Variable
```bash
export PGPASSWORD="dein_passwort"
```

Option 3: PostgreSQL trust-Authentifizierung (lokal, sicher)

## Verzeichnisstruktur

```
/backup/
├── backup.log              # Backup-Log
├── cron.log                # Cron-Ausgabe
├── mydb_20250115_023000.sql.gz
├── mydb_20250116_023000.sql.gz
├── mydb_latest.sql.gz -> mydb_20250116_023000.sql.gz
├── mydb_day1.sql.gz        # Montag
├── mydb_day2.sql.gz        # Dienstag
...
└── mydb_day7.sql.gz        # Sonntag
```
