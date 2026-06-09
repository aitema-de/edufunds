# Merkposten: Live-Betrieb Regeln (Notiert 2026-02-13)

## Automatische Datenbank-Pflege

### 1. Nahende Fristen (Newsletter)
- Programme mit Frist ≤60 Tage → eigene Newsletter-Rubrik "⚡ Schnell-Handlungsbedarf"
- Automatisch aus Datenbank extrahieren
- Wöchentlich im Newsletter anzeigen

### 2. Abgelaufene Programme
**Standard:** Automatisch aus Datenbank entfernen

**Ausnahme:** Neue Ausschreibungsrunde bekannt
- Programm bleibt drin
- Hinweis auf neuen Zeitraum
- Status: "neue Runde [Jahr]"

### 3. Neue Programme (Cron)
- Täglicher Scan (läuft bereits)
- Automatische Verifizierung
- Aufnahme nach Qualitätsprüfung

---
*Notiert für Live-Betrieb ab Launch*
