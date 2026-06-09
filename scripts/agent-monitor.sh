#!/bin/bash
# Agenten-Kontrollsystem - Frühwarnung bei inaktiven Agenten

WORKSPACE="/home/edufunds/edufunds-app"
LOG_DIR="$WORKSPACE/logs"
ALERT_LOG="$LOG_DIR/agent-alerts.log"
CHECK_LOG="$LOG_DIR/agent-checks.log"
NOW=$(date +%s)

mkdir -p $LOG_DIR

echo "$(date '+%Y-%m-%d %H:%M:%S') - Agenten-Check gestartet" >> $CHECK_LOG

# Funktion: Alarm senden
send_alert() {
    local agent=$1
    local status=$2
    local minutes=$3
    local message="🚨 Agenten-Alarm: $agent ist $status seit $minutes Minuten!"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> $ALERT_LOG
    echo "$message"
}

# Funktion: Warnung senden
send_warning() {
    local agent=$1
    local minutes=$2
    local message="⚠️  Agenten-Warnung: $agent inaktiv seit $minutes Minuten"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> $CHECK_LOG
    echo "$message"
}

# Prüfe aktive Agenten-Sessions
for session_file in /home/edufunds/.clawdbot/agents/main/sessions/*.jsonl; do
    if [ -f "$session_file" ]; then
        filename=$(basename "$session_file")
        last_mod=$(stat -c %Y "$session_file" 2>/dev/null || echo "0")
        
        if [ "$last_mod" -gt 0 ]; then
            diff_min=$(( (NOW - last_mod) / 60 ))
            
            if [ $diff_min -gt 30 ]; then
                send_alert "$filename" "BLOCKIERT" "$diff_min"
            elif [ $diff_min -gt 20 ]; then
                send_warning "$filename" "$diff_min"
            fi
        fi
    fi
done

# Prüfe auf hängende Sub-Agent-Prozesse
for pid_dir in /proc/[0-9]*; do
    if [ -d "$pid_dir" ]; then
        pid=$(basename "$pid_dir")
        cmdline=$(cat "$pid_dir/cmdline" 2>/dev/null | tr '\0' ' ')
        
        # Prüfe auf sehr alte Node/Agent-Prozesse (>2h)
        if echo "$cmdline" | grep -q "subagent"; then
            start_time=$(stat -c %Y "$pid_dir" 2>/dev/null || echo "0")
            if [ "$start_time" -gt 0 ]; then
                runtime_min=$(( (NOW - start_time) / 60 ))
                if [ $runtime_min -gt 120 ]; then
                    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️  Laufender Agent seit ${runtime_min}min: PID $pid" >> $CHECK_LOG
                fi
            fi
        fi
    fi
done

echo "$(date '+%Y-%m-%d %H:%M:%S') - Agenten-Check beendet" >> $CHECK_LOG
