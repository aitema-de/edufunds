#!/bin/bash
# Batch link checker - simpler and faster

check_url() {
    local id="$1"
    local url="$2"
    local pstatus="$3"
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 -L "$url" 2>/dev/null || echo "000")
    echo "|$id|$url|$pstatus|$code|"
}

export -f check_url

# Extract links and process
cat << 'LINKDATA' | while IFS='|' read -r id url pstatus; do
    check_url "$id" "$url" "$pstatus"
LINKDATA
