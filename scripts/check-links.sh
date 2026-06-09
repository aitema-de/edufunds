#!/bin/bash

JSON_FILE="/home/edufunds/edufunds-app/data/foerderprogramme.json"
RESULT_FILE="/home/edufunds/edufunds-app/data/link-check-results.json"
BROKEN_FILE="/home/edufunds/edufunds-app/data/broken-links.json"

# Extrahiere alle Links mit IDs und Namen
echo "Extrahiere Links aus JSON..."

# Arrays für Ergebnisse
declare -a WORKING_IDS=()
declare -a WORKING_URLS=()
declare -a WORKING_STATUS=()
declare -a BROKEN_IDS=()
declare -a BROKEN_NAMES=()
declare -a BROKEN_URLS=()
declare -a BROKEN_ERRORS=()

# Zähler
TOTAL=0
WORKING_COUNT=0
BROKEN_COUNT=0

# Lese die JSON-Datei und extrahiere Links
LINKS=$(cat "$JSON_FILE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    print(f\"{item['id']}|{item['name']}|{item['infoLink']}\")
")

TOTAL=$(echo "$LINKS" | wc -l)
echo "Gefunden: $TOTAL Links"
echo ""

# Prüfe jeden Link
COUNTER=0
echo "$LINKS" | while IFS='|' read -r ID NAME URL; do
    COUNTER=$((COUNTER + 1))
    printf "[%3d/%d] %-55s" "$COUNTER" "$TOTAL" "${NAME:0:50}"
    
    # curl mit Timeout und folge Redirects
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 15 \
        --connect-timeout 10 \
        -L \
        -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
        "$URL" 2>&1)
    
    CURL_EXIT=$?
    
    if [ $CURL_EXIT -eq 0 ]; then
        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "308" ]; then
            echo " → HTTP $HTTP_STATUS ✓"
        elif [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "410" ]; then
            echo " → HTTP $HTTP_STATUS ✗ (NICHT GEFUNDEN)"
            echo "BROKEN|$ID|$NAME|$URL|HTTP $HTTP_STATUS" >> /tmp/broken_links.txt
        elif [ "$HTTP_STATUS" -ge 500 ]; then
            echo " → HTTP $HTTP_STATUS ✗ (SERVER FEHLER)"
            echo "BROKEN|$ID|$NAME|$URL|HTTP $HTTP_STATUS" >> /tmp/broken_links.txt
        else
            echo " → HTTP $HTTP_STATUS (?)"
        fi
    else
        echo " → FEHLER (Exit: $CURL_EXIT)"
        echo "BROKEN|$ID|$NAME|$URL|CURL_ERROR_$CURL_EXIT" >> /tmp/broken_links.txt
    fi
    
    # Rate limiting - 300ms Pause
    sleep 0.3
done

echo ""
echo "=== ZUSAMMENFASSUNG ==="
if [ -f /tmp/broken_links.txt ]; then
    BROKEN_COUNT=$(wc -l < /tmp/broken_links.txt)
    echo "Defekte Links gefunden: $BROKEN_COUNT"
    cat /tmp/broken_links.txt
else
    echo "Keine defekten Links gefunden!"
    BROKEN_COUNT=0
fi

# Berechne funktionierende Links
WORKING_COUNT=$((TOTAL - BROKEN_COUNT))
echo ""
echo "Funktionierende Links: $WORKING_COUNT"
echo "Gesamt: $TOTAL"

# Aufräumen
rm -f /tmp/broken_links.txt
