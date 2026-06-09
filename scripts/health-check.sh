#!/bin/bash
# Health Check für EduFunds

URL="https://edufunds.org"
EMAIL="office@aitema.de"
LOG_FILE="/home/edufunds/logs/health-check.log"

mkdir -p /home/edufunds/logs

# Check Website
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$HTTP_CODE" != "200" ]; then
    echo "[$TIMESTAMP] ⚠️ ALERT: Website returned HTTP $HTTP_CODE" >> $LOG_FILE
    # Send email alert (requires mail utils)
    echo "EduFunds is down! HTTP $HTTP_CODE at $TIMESTAMP" | mail -s "EduFunds ALERT" $EMAIL 2>/dev/null || true
else
    echo "[$TIMESTAMP] ✅ OK: Website healthy (HTTP 200)" >> $LOG_FILE
fi

# Keep only last 100 lines
 tail -100 $LOG_FILE > $LOG_FILE.tmp && mv $LOG_FILE.tmp $LOG_FILE
