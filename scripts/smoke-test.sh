#!/bin/bash
# EduFunds Smoke Test — Funktionaler URL-Test
# Milo MUSS dieses Script nach jedem Deploy ausführen.
#
# Usage: ./scripts/smoke-test.sh [base_url]
# Default: https://edufunds.org

set -euo pipefail

BASE_URL="${1:-https://edufunds.org}"
FAIL=0
PASS=0
TOTAL=0
ERRORS=()

echo "========================================"
echo "EduFunds Smoke Test"
echo "Base URL: $BASE_URL"
echo "Datum: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo

# 1. Statische Seiten
echo "--- Statische Seiten ---"
for path in / /foerderprogramme /ueber-uns /kontakt /impressum /datenschutz /agb /preise; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${path}" --max-time 10 2>/dev/null || echo 'TIMEOUT')
  TOTAL=$((TOTAL+1))
  if [ "$STATUS" = "200" ]; then
    PASS=$((PASS+1))
    echo "  ✓ $path → $STATUS"
  else
    FAIL=$((FAIL+1))
    ERRORS+=("SEITE $path → $STATUS")
    echo "  ✗ $path → $STATUS"
  fi
done

echo

# 2. Alle Förderprogramm-Detailseiten
echo "--- Förderprogramm-Detailseiten ---"
DATA_FILE="/home/edufunds/edufunds-app/data/foerderprogramme.json"
if [ -f "$DATA_FILE" ]; then
  IDS=$(python3 -c "import json; d=json.load(open('$DATA_FILE')); [print(p['id']) for p in d]")
  PROGRAM_TOTAL=0
  PROGRAM_FAIL=0
  while IFS= read -r id; do
    [ -z "$id" ] && continue
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/foerderprogramme/${id}" --max-time 10 2>/dev/null || echo 'TIMEOUT')
    TOTAL=$((TOTAL+1))
    PROGRAM_TOTAL=$((PROGRAM_TOTAL+1))
    if [ "$STATUS" = "200" ]; then
      PASS=$((PASS+1))
    else
      FAIL=$((FAIL+1))
      PROGRAM_FAIL=$((PROGRAM_FAIL+1))
      ERRORS+=("PROGRAMM /foerderprogramme/$id → $STATUS")
      echo "  ✗ /foerderprogramme/$id → $STATUS"
    fi
  done <<< "$IDS"
  
  if [ $PROGRAM_FAIL -eq 0 ]; then
    echo "  ✓ Alle $PROGRAM_TOTAL Detailseiten OK"
  else
    echo "  ✗ $PROGRAM_FAIL von $PROGRAM_TOTAL Detailseiten fehlerhaft"
  fi
else
  echo "  ⚠ foerderprogramme.json nicht gefunden — Detailseiten nicht getestet"
fi

echo

# 3. API-Endpoints
echo "--- API-Endpoints ---"
for path in /api/foerderprogramme; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${path}" --max-time 10 2>/dev/null || echo 'TIMEOUT')
  TOTAL=$((TOTAL+1))
  if [ "$STATUS" = "200" ]; then
    PASS=$((PASS+1))
    echo "  ✓ $path → $STATUS"
  else
    FAIL=$((FAIL+1))
    ERRORS+=("API $path → $STATUS")
    echo "  ✗ $path → $STATUS"
  fi
done

echo

# 4. Externe Förderprogramm-Links prüfen (Stichprobe: erste 5)
echo "--- Externe Links (Stichprobe) ---"
if [ -f "$DATA_FILE" ]; then
  LINKS=$(python3 -c "
import json
d=json.load(open('$DATA_FILE'))
for p in d[:5]:
    link = p.get('infoLink', '')
    if link:
        print(p['id'] + '|' + link)
")
  while IFS='|' read -r id link; do
    [ -z "$link" ] && continue
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$link" --max-time 15 -L 2>/dev/null || echo 'TIMEOUT')
    TOTAL=$((TOTAL+1))
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
      PASS=$((PASS+1))
      echo "  ✓ $id → $STATUS"
    else
      FAIL=$((FAIL+1))
      ERRORS+=("EXTERNER LINK $id ($link) → $STATUS")
      echo "  ✗ $id → $STATUS ($link)"
    fi
  done <<< "$LINKS"
fi

echo
echo "========================================"
echo "ERGEBNIS: $PASS/$TOTAL bestanden, $FAIL fehlgeschlagen"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo
  echo "FEHLER:"
  for err in "${ERRORS[@]}"; do
    echo "  ✗ $err"
  done
  echo
  echo "STATUS: FAILED"
  exit 1
else
  echo
  echo "STATUS: PASSED"
  exit 0
fi
