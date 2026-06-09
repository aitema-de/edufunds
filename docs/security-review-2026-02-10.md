# Security Review Report - EduFunds

## Datum: 2026-02-10
## Reviewer: Milo (autonom)

---

## 1. Code-Review: API-Endpunkte

### `/api/assistant/generate`
**Status:** ✅ SICHER

**Geprüft:**
- [x] Input-Validierung vorhanden (programm && projektDaten check)
- [x] Keine SQL-Injection (keine DB-Queries)
- [x] Keine XSS (JSON-Response, kein HTML)
- [x] API-Key nicht exponiert (nur Server-Side)
- [x] Error-Handling vorhanden

**Empfehlung:** Rate-Limiting hinzufügen (siehe unten)

---

## 2. Code-Review: Frontend

### KI-Antragsassistent
**Status:** ✅ SICHER

**Geprüft:**
- [x] Keine eval() oder dangerouslySetInnerHTML
- [x] User-Input wird escaped
- [x] PDF/Doc-Export client-seitig (kein Server)

---

## 3. Environment Variables

**Geprüft:**
- [x] GEMINI_API_KEY nur Server-Side
- [x] DATABASE_URL nur Server-Side
- [x] Keine Secrets im Frontend-Code

**Issue:** GEMINI_API_KEY ist im Container leer → Fallback funktioniert

---

## 4. Docker/Deployment Security

**Geprüft:**
- [x] Nicht-root User (nextjs:nodejs)
- [x] Keine unnötigen Ports exposed
- [x] Restart-Policy vorhanden
- [ ] Health-Check könnte robuster sein

---

## 5. OWASP Top 10 Check

| Risiko | Status | Bemerkung |
|--------|--------|-----------|
| Injection | ✅ OK | Keine SQL-Queries in API |
| Broken Auth | ⚠️ N/A | Noch kein Auth-System |
| Sensitive Data Exposure | ✅ OK | Keys nicht exponiert |
| XML External Entities | ✅ OK | Kein XML-Parsing |
| Broken Access Control | ⚠️ N/A | Noch keine User-Accounts |
| Security Misconfiguration | ✅ OK | Standard-Next.js Config |
| XSS | ✅ OK | Keine unsicheren Renderings |
| Insecure Deserialization | ✅ OK | Keine Deserialization |
| Using Components with Known Vulnerabilities | ⚠️ CHECK | npm audit ausstehend |
| Insufficient Logging | ⚠️ CHECK | Logging könnte erweitert werden |

---

## 6. Empfohlene Maßnahmen

### Kurzfristig (heute Nacht):
1. Rate-Limiting für `/api/assistant/generate` (z.B. 10 Requests/Minute pro IP)
2. API-Key korrekt in Container übergeben
3. npm audit durchführen

### Mittelfristig (nächste Woche):
1. Content Security Policy (CSP) Header
2. Traefik Security-Headers konfigurieren
3. Logging für API-Calls
4. Input-Sanitization erweitern

### Langfristig:
1. Authentifizierung für Antragsgenerierung
2. API-Key Rotation
3. Penetration Testing durch externe Firma

---

## 7. Test: Rate-Limiting

**Manueller Test:**
```bash
for i in {1..20}; do
  curl -s -X POST https://edufunds.org/api/assistant/generate \
    -H "Content-Type: application/json" \
    -d '{"test":"test"}' | head -1
  echo "Request $i"
done
```

**Erwartet:** Nach ~10 Requests sollte 429 (Too Many Requests) kommen

**Aktueller Status:** ❌ Kein Rate-Limiting aktiv

---

## 8. Fazit

**Gesamt-Status:** 🟡 MEDIUM RISK

Die Anwendung ist grundlegend sicher, aber:
- Rate-Limiting fehlt (DDoS-Risiko)
- API-Key nicht korrekt gesetzt
- Kein Auth-System (aber für MVP akzeptabel)

**Empfohlene Aktionen vor Production:**
1. Rate-Limiting implementieren
2. API-Key fixen
3. npm audit --fix
4. CSP Header hinzufügen
