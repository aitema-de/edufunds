#!/bin/bash
# =============================================================================
# EduFunds Health Check & Alerting Script
# =============================================================================
# Dieses Script überwacht die EduFunds-Production und sendet Alerts bei Problemen
# 
# Verwendung:
#   ./scripts/monitor.sh [check|alert|report]
#
# Cron-Setup (alle 5 Minuten):
#   */5 * * * * /home/edufunds/edufunds-app/scripts/monitor.sh check
# =============================================================================

set -e

# Konfiguration
CONTAINER_NAME="edufunds"
HEALTH_URL="https://edufunds.org/api/health"
LOG_FILE="/var/log/edufunds/monitor.log"
ALERT_STATE_FILE="/var/lib/edufunds/alert.state"
MAX_RESPONSE_TIME=5000  # ms
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-619553447}"

# Farben für Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Telegram Alert senden
send_telegram_alert() {
    local message="$1"
    local priority="${2:-normal}"
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        log "WARN: TELEGRAM_BOT_TOKEN nicht gesetzt"
        return 1
    fi
    
    local emoji="🚨"
    [ "$priority" = "high" ] && emoji="🔥"
    [ "$priority" = "low" ] && emoji="⚠️"
    
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${emoji} ${message}" \
        -d "parse_mode=HTML" > /dev/null || true
}

# Health Check durchführen
check_health() {
    local start_time=$(date +%s%N)
    local http_code
    local response
    local response_time
    
    # HTTP Request mit Timeout
    response=$(curl -s -w "\n%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | head -n-1)
    
    local end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to ms
    
    # Ergebnis prüfen
    if [ "$http_code" != "200" ]; then
        echo "CRITICAL: HTTP $http_code"
        return 1
    fi
    
    if [ "$response_time" -gt "$MAX_RESPONSE_TIME" ]; then
        echo "WARNING: Slow response (${response_time}ms)"
        return 2
    fi
    
    # JSON Response prüfen
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo "OK: ${response_time}ms"
        return 0
    else
        echo "WARNING: Unhealthy status"
        return 2
    fi
}

# Docker Container Status prüfen
check_container() {
    local status
    status=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>/dev/null || echo "not found")
    
    if echo "$status" | grep -q "healthy"; then
        echo "OK: healthy"
        return 0
    elif echo "$status" | grep -q "Up"; then
        echo "WARNING: running but not healthy"
        return 2
    else
        echo "CRITICAL: $status"
        return 1
    fi
}

# Disk Space prüfen
check_disk() {
    local usage
    usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        echo "CRITICAL: ${usage}% used"
        return 1
    elif [ "$usage" -gt 80 ]; then
        echo "WARNING: ${usage}% used"
        return 2
    else
        echo "OK: ${usage}% used"
        return 0
    fi
}

# Memory prüfen
check_memory() {
    local usage
    usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$usage" -gt 90 ]; then
        echo "CRITICAL: ${usage}% used"
        return 1
    elif [ "$usage" -gt 80 ]; then
        echo "WARNING: ${usage}% used"
        return 2
    else
        echo "OK: ${usage}% used"
        return 0
    fi
}

# Haupt-Check Funktion
run_checks() {
    local exit_code=0
    local alerts=()
    
    log "=== Starting Health Checks ==="
    
    # 1. Container Check
    log "Checking container..."
    result=$(check_container)
    container_status=$?
    log "Container: $result"
    
    if [ $container_status -eq 1 ]; then
        alerts+=("Container CRITICAL")
        exit_code=1
    elif [ $container_status -eq 2 ]; then
        alerts+=("Container WARNING")
        [ $exit_code -eq 0 ] && exit_code=2
    fi
    
    # 2. HTTP Health Check
    log "Checking HTTP health..."
    result=$(check_health)
    health_status=$?
    log "Health: $result"
    
    if [ $health_status -eq 1 ]; then
        alerts+=("HTTP CRITICAL")
        exit_code=1
    elif [ $health_status -eq 2 ]; then
        alerts+=("HTTP WARNING")
        [ $exit_code -eq 0 ] && exit_code=2
    fi
    
    # 3. Disk Space
    log "Checking disk space..."
    result=$(check_disk)
    disk_status=$?
    log "Disk: $result"
    
    if [ $disk_status -eq 1 ]; then
        alerts+=("Disk CRITICAL")
        exit_code=1
    elif [ $disk_status -eq 2 ]; then
        alerts+=("Disk WARNING")
        [ $exit_code -eq 0 ] && exit_code=2
    fi
    
    # 4. Memory
    log "Checking memory..."
    result=$(check_memory)
    memory_status=$?
    log "Memory: $result"
    
    if [ $memory_status -eq 1 ]; then
        alerts+=("Memory CRITICAL")
        exit_code=1
    elif [ $memory_status -eq 2 ]; then
        alerts+=("Memory WARNING")
        [ $exit_code -eq 0 ] && exit_code=2
    fi
    
    # Alerts senden bei Problemen
    if [ ${#alerts[@]} -gt 0 ]; then
        local alert_msg="<b>EduFunds Alert</b>\n\n"
        for alert in "${alerts[@]}"; do
            alert_msg+="• $alert\n"
        done
        alert_msg+="\nTime: $(date '+%H:%M:%S')"
        
        # Nur senden wenn Status sich geändert hat
        local current_state=$(printf '%s\n' "${alerts[@]}" | sort | md5sum | cut -d' ' -f1)
        local previous_state=""
        
        [ -f "$ALERT_STATE_FILE" ] && previous_state=$(cat "$ALERT_STATE_FILE")
        
        if [ "$current_state" != "$previous_state" ]; then
            local priority="normal"
            [ $exit_code -eq 1 ] && priority="high"
            
            send_telegram_alert "$alert_msg" "$priority"
            echo "$current_state" > "$ALERT_STATE_FILE"
            log "Alert sent with priority: $priority"
        fi
    else
        # State zurücksetzen bei OK
        [ -f "$ALERT_STATE_FILE" ] && rm "$ALERT_STATE_FILE"
        log "All checks passed"
    fi
    
    log "=== Checks completed with exit code $exit_code ==="
    return $exit_code
}

# Täglicher Report
daily_report() {
    local container_uptime
    local request_count
    local avg_response_time
    
    container_uptime=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}" 2>/dev/null || echo "N/A")
    
    local report="<b>📊 EduFunds Daily Report</b>\n\n"
    report+="<b>System Status:</b>\n"
    report+="• Container: $container_uptime\n"
    report+="• Health: $(check_health | cut -d: -f1)\n"
    report+="• Disk: $(check_disk | cut -d: -f1)\n"
    report+="• Memory: $(check_memory | cut -d: -f1)\n\n"
    report+="<b>Programme:</b> 160\n"
    report+="<b>Version:</b> 160prog\n"
    report+="<b>Time:</b> $(date '+%Y-%m-%d %H:%M')"
    
    send_telegram_alert "$report" "low"
}

# Main
case "${1:-check}" in
    check)
        run_checks
        ;;
    report)
        daily_report
        ;;
    test-alert)
        send_telegram_alert "<b>Test Alert</b>\nMonitoring system is working!" "low"
        log "Test alert sent"
        ;;
    *)
        echo "Usage: $0 [check|report|test-alert]"
        exit 1
        ;;
esac
