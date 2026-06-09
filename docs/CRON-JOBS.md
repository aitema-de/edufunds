# Automatisierte Cron-Jobs

Diese Datei dokumentiert alle eingerichteten Cron-Jobs für EduFunds.

## Aktive Jobs

### 1. Täglicher Förderprogramm-Scan
- **ID:** foerderprogramm-scan-daily
- **Zeit:** 07:00 Uhr täglich
- **Aufgabe:** Kurzer Check nach brandneuen Förderprogramm-Ausschreibungen
- **Ziel:** Neue Programme schnell identifizieren

### 2. Wöchentlicher Förderprogramm-Scan
- **ID:** foerderprogramm-scan-weekly
- **Zeit:** Montag 06:00 Uhr
- **Aufgabe:** Tiefere Suche nach Förderprogrammen, Aktualisierung bestehender
- **Ziel:** Vollständige Datenbank-Pflege

### 3. Monatliche Link-Validierung ⭐ NEU
- **ID:** 0e219d17-f1d8-49e1-9428-06dab4b7a20c
- **Zeit:** 1. jeden Monats 06:00 Uhr
- **Aufgabe:** Validierung aller 129 Förderprogramm-Links
- **Ziel:** Tote Links erkennen und korrigieren
- **Erste Ausführung:** 01.03.2026

## Warum monatliche Link-Validierung?

Ergebnis der manuellen Validierung am 19.02.2026:
- 129 Programme geprüft
- 5 tote Links gefunden (4% Fehlerrate)
- Ursachen: Website-Relaunches, Domain-Änderungen, abgelaufene Projekte

Ohne regelmäßige Prüfung entsteht "Link-Rost" → Nutzer landen auf 404-Seiten.

## Manuelle Ausführung

```bash
# Cron-Job sofort ausführen
moltbot cron run <job-id>

# Liste aller Jobs
moltbot cron list
```

---
*Zuletzt aktualisiert: 19. Februar 2026*
