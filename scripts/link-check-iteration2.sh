#!/bin/bash
# Link-Prüfung für alle Förderprogramme

echo "=== COMPASS Link-Check Iteration 2 ==="
echo "Starte Prüfung aller Links..."
echo ""

# Extrahiere alle infoLink URLs aus der JSON
links=$(cat data/foerderprogramme.json | grep -o '"infoLink": "[^"]*"' | cut -d'"' -f4)

total=0
success=0
failed=0
dns_errors=0
timeout_errors=0

# DNS/Timeout-Problem-Liste
rm -f /tmp/link_problems.txt
rm -f /tmp/link_success.txt

for link in $links; do
    total=$((total + 1))
    echo -n "[$total] Prüfe: $link ... "
    
    # Curl mit Timeout und Folge-Redirects
    response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" --max-time 15 -L "$link" 2>&1)
    status=$(echo "$response" | cut -d'|' -f1)
    time=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$status" = "200" ]; then
        echo "✓ OK (${time}s)"
        echo "$link|200|$time" >> /tmp/link_success.txt
        success=$((success + 1))
    elif echo "$response" | grep -q "Could not resolve host\|Name or service not known"; then
        echo "✗ DNS ERROR"
        echo "$link|DNS|Konnte Host nicht auflösen" >> /tmp/link_problems.txt
        dns_errors=$((dns_errors + 1))
        failed=$((failed + 1))
    elif echo "$response" | grep -q "Connection timed out\|Operation timed out"; then
        echo "✗ TIMEOUT"
        echo "$link|TIMEOUT|Verbindung Zeitüberschreitung" >> /tmp/link_problems.txt
        timeout_errors=$((timeout_errors + 1))
        failed=$((failed + 1))
    else
        echo "✗ HTTP $status"
        echo "$link|HTTP $status|Fehler" >> /tmp/link_problems.txt
        failed=$((failed + 1))
    fi
done

echo ""
echo "=== ERGEBNIS ==="
echo "Gesamt: $total"
echo "Erfolgreich (200): $success"
echo "Fehlgeschlagen: $failed"
echo "  - DNS-Fehler: $dns_errors"
echo "  - Timeouts: $timeout_errors"
echo "  - Andere HTTP-Fehler: $((failed - dns_errors - timeout_errors))"
echo ""
echo "Erfolgsquote: $((success * 100 / total))%"

if [ -f /tmp/link_problems.txt ]; then
    echo ""
    echo "=== PROBLEMATISCHE LINKS ==="
    cat /tmp/link_problems.txt
fi
