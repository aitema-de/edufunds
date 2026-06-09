#!/bin/bash
# Security Penetration Test Script for EduFunds
# Automatisierte und manuelle Tests

echo "🛡️  EduFunds Penetration Test Suite"
echo "===================================="
echo ""

# Konfiguration
BASE_URL="http://localhost:3101"
API_URL="$BASE_URL/api"
TEST_OUTPUT="/home/edufunds/edufunds-app/test-results"

mkdir -p "$TEST_OUTPUT"

echo "📋 Phase 1: Automatisierte Scans"
echo "=================================="

# Check if server is running
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "⚠️  Server läuft nicht auf $BASE_URL"
    echo "Starte Server..."
    exit 1
fi

echo "✅ Server erreichbar"
echo ""

# Test 1: Security Headers Check
echo "Test 1: Security Headers"
echo "------------------------"
curl -s -I "$BASE_URL" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security|Content-Security-Policy|Referrer-Policy)" || echo "⚠️  Einige Security-Headers fehlen"
echo ""

# Test 2: API Endpoints Enumeration
echo "Test 2: API Endpoints"
echo "---------------------"
ENDPOINTS=(
    "/api/health"
    "/api/contact"
    "/api/newsletter"
    "/api/stripe/checkout"
    "/api/paypal"
    "/api/generate-antrag"
    "/api/assistant/generate"
    "/api/admin/login"
)

for endpoint in "${ENDPOINTS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    echo "$endpoint: HTTP $status"
done
echo ""

# Test 3: CORS Policy Check
echo "Test 3: CORS Policy"
echo "-------------------"
curl -s -X OPTIONS -H "Origin: https://evil.com" -H "Access-Control-Request-Method: POST" \
    "$BASE_URL/api/contact" -I | grep -E "(Access-Control-Allow-Origin|Access-Control-Allow-Methods)" || echo "✅ Keine CORS-Header gesetzt (gut)"
echo ""

# Test 4: SQL Injection Tests
echo "Test 4: SQL Injection Tests"
echo "---------------------------"
SQL_PAYLOADS=(
    "' OR '1'='1"
    "'; DROP TABLE users; --"
    "' UNION SELECT * FROM users --"
    "1' AND 1=1 --"
    "admin'--"
)

for payload in "${SQL_PAYLOADS[@]}"; do
    response=$(curl -s -X POST "$BASE_URL/api/contact" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$payload\",\"email\":\"test@test.com\",\"subject\":\"Test\",\"message\":\"Test message\",\"datenschutz\":true}" \
        -w "\nHTTP_CODE:%{http_code}")
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if echo "$response" | grep -q "SQL\|sql\|database\|Database"; then
        echo "⚠️  Mögliche SQL Injection bei: $payload"
    else
        echo "✅ Keine SQL Injection erkannt bei: $payload"
    fi
done
echo ""

# Test 5: XSS Tests
echo "Test 5: XSS Tests"
echo "-----------------"
XSS_PAYLOADS=(
    "<script>alert('XSS')</script>"
    "<img src=x onerror=alert('XSS')>"
    "javascript:alert('XSS')"
    "<body onload=alert('XSS')>"
    "<iframe src=javascript:alert('XSS')>"
)

for payload in "${XSS_PAYLOADS[@]}"; do
    response=$(curl -s -X POST "$BASE_URL/api/contact" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$payload\",\"email\":\"test@test.com\",\"subject\":\"Test\",\"message\":\"Test\",\"datenschutz\":true}")
    
    if echo "$response" | grep -q "<script>\|onerror\|onload"; then
        echo "⚠️  Mögliche XSS bei: $payload"
    else
        echo "✅ Keine XSS erkannt bei: $payload"
    fi
done
echo ""

# Test 6: Rate Limiting Check
echo "Test 6: Rate Limiting"
echo "---------------------"
echo "Sende 15 schnelle Requests an /api/newsletter..."
for i in {1..15}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/newsletter" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"test$i@test.com\"}")
    if [ "$status" == "429" ]; then
        echo "✅ Rate Limiting funktioniert (HTTP 429 nach $i Requests)"
        break
    fi
done
echo ""

# Test 7: Input Validation
echo "Test 7: Input Validation"
echo "------------------------"
# Test mit leeren Feldern
response=$(curl -s -X POST "$BASE_URL/api/contact" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"\",\"email\":\"invalid-email\",\"subject\":\"AB\",\"message\":\"Hi\",\"datenschutz\":false}")
if echo "$response" | grep -q "error\|Validierungsfehler"; then
    echo "✅ Validierung funktioniert"
else
    echo "⚠️  Validierung möglicherweise unvollständig"
fi
echo ""

echo "📊 Zusammenfassung"
echo "=================="
echo "Tests abgeschlossen. Siehe Test-Protokoll für Details."
