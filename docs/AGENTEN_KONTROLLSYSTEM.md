# AGENTEN-KONTROLLSYSTEM

## 🎯 Ziel
Früherkennung von blockierten/inaktiven Agenten (nicht erst nach 2,5h)

## 🔄 Überwachungs-Workflow

### 1. Automatische Checks (alle 10 Min)

```bash
# Cron-Job oder Heartbeat-Check
*/10 * * * * /home/edufunds/edufunds-app/scripts/agent-check.sh
```

**Was geprüft wird:**
- Letzte Aktivität des Agents (Timestamp)
- Offene Sessions ohne Fortschritt
- Blockierte Prozesse (hängende exec/process calls)

### 2. Frühwarn-System

| Status | Zeit ohne Update | Aktion |
|--------|------------------|--------|
| 🟢 Normal | <10 Min | Nichts |
| 🟡 Warnung | 10-20 Min | Status-Abfrage an Agent |
| 🟠 Kritisch | 20-30 Min | Main Agent informieren |
| 🔴 Blockiert | >30 Min | Agent killen + Neustart |

### 3. Status-Tracking pro Agent

**Datei:** `/logs/agent-status.json`

```json
{
  "agents": {
    "Newsletter-Expert": {
      "status": "running",
      "lastActivity": "2026-02-12T16:00:00Z",
      "taskProgress": "45%",
      "expectedDuration": "90min",
      "alerts": []
    }
  }
}
```

### 4. Automatische Interventionen

**Bei Inaktivität >20 Min:**
1. Agent wird gepingt ("Status?")
2. Keine Antwort nach 5 Min → Main Agent alarmiert
3. Main Agent entscheidet: Warten / Kill / Neustart

**Bei Blockade (gleicher Fehler 3x):**
1. Automatischer Kill
2. Fehler-Log speichern
3. Main Agent informiert mit Fehler-Details

## 🛠️ Implementierung

### Script: agent-check.sh

```bash
#!/bin/bash
# Prüft alle aktiven Agenten

AGENTS_DIR="/home/edufunds/.clawdbot/agents"
LOG_FILE="/home/edufunds/edufunds-app/logs/agent-check.log"
NOW=$(date +%s)

for agent in $(find $AGENTS_DIR -name "*.jsonl" -mmin +10); do
  LAST_MOD=$(stat -c %Y $agent)
  DIFF=$(( (NOW - LAST_MOD) / 60 ))
  
  if [ $DIFF -gt 30 ]; then
    echo "$(date): ALARM - Agent inaktiv seit ${DIFF}min: $agent" >> $LOG_FILE
    # Main Agent informieren
    notify-main-agent "$agent" "inactive" "$DIFF"
  elif [ $DIFF -gt 20 ]; then
    echo "$(date): WARNUNG - Agent inaktiv seit ${DIFF}min: $agent" >> $LOG_FILE
  fi
done
```

### Script: notify-main-agent.sh

```bash
#!/bin/bash
# Sendet Alarm an Main Agent

AGENT=$1
STATUS=$2
MINUTES=$3

MESSAGE="🚨 Agenten-Alarm: $AGENT ist $STATUS seit $MINUTES Minuten!"

# Via Telegram oder Log
logger -t "AgentMonitor" "$MESSAGE"
echo "$MESSAGE" >> /home/edufunds/edufunds-app/logs/alerts.log
```

## 📊 Dashboard

**Datei:** `/logs/agent-dashboard.html`

Einfache HTML-Seite mit:
- Aktive Agenten + Status
- Letzte Aktivität (Timeline)
- Alerts/Warnungen
- Durchschnittliche Bearbeitungszeit

## 🔄 Integration in Agent-Briefings

Jeder Agent bekommt zusätzlich:

```markdown
### Pflicht-Status-Updates
- Alle 15 Min: "Status: [X]% fertig, aktuell: [Task]"
- Bei Blockade >5 Min: Sofort melden!
- Vor Fertig: Letzter Check aller Anforderungen

### Automatische Kill-Bedingungen
- Kein Status-Update >30 Min → Kill
- Gleicher Fehler 3x → Kill
- Offensichtlich Off-Topic → Kill
```

## 🎯 Manuelle Checks (Main Agent)

**Jede Stunde:**
1. `sessions_list` abrufen
2. Prüfen: Welche Agenten länger als erwartet?
3. Bei Verdacht: History checken
4. Entscheiden: Warten / Intervenieren / Killen

**Abend-Review (18:00):**
- Tägliche Agenten-Statistik
- Erfolgsquote pro Agent
- Durchschnittliche Bearbeitungszeit
- Fehler-Analysis

## 📝 Logging

**Struktur:**
```
/logs/
├── agent-check.log       # Automatische Checks
├── agent-alerts.log      # Warnungen & Alarme
├── agent-performance.log # Metriken pro Agent
└── agent-dashboard.html  # Live-Übersicht
```

## 🚀 Sofort-Maßnahmen

**Ab jetzt:**
1. ✅ Agenten müssen alle 15 Min Status melden
2. ✅ Ich prüfe alle 30 Min aktiv
3. ✅ Bei Inaktivität >20 Min: Sofort Eingreifen
4. ✅ Automatische Alarmschwelle bei >30 Min

**Nächste Schritte:**
- [ ] Cron-Job einrichten (alle 10 Min)
- [ ] Alert-System testen
- [ ] Dashboard erstellen

---

*System aktiv ab: 2026-02-12*
