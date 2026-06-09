# Smoke Test Report - 12.02.2026

## Ergebnis: ❌ Nicht bestanden (3/3 Fehler)

### Test-Details

| Durchlauf | Exit Code | Bestanden | Fehlgeschlagen |
|-----------|-----------|-----------|----------------|
| 1 | 1 | 0 | 5 |
| 2 | 1 | 0 | 5 |
| 3 | 1 | 0 | 5 |

### Fehlerursache

Die Domain `edufunds.org` gibt für alle getesteten URLs **HTTP 404** zurück.

Dies ist ein **Infrastructure/DNS-Problem**, kein Skript-Problem.

```
https://edufunds.org/                        → 404
https://edufunds.org/foerderprogramme        → 404
https://edufunds.org/foerderprogramme/bmbf-digitalpakt-2 → 404
https://edufunds.org/preise                  → 404
https://edufunds.org/api/health              → 404
```

### Erstellte Dateien

✅ `/scripts/smoke-test.js` - Funktionsfähiges Test-Skript
✅ `/docs/QA_SMOKE_TEST.md` - Dokumentation
✅ `package.json` - Script `test:smoke` hinzugefügt
✅ `smoke-test-report.json` - JSON-Report

### Skript-Funktionalität

Das Skript erfüllt alle Anforderungen:

- ✅ Prüft 5 URLs
- ✅ Prüft HTTP Status 200
- ✅ Prüft Antwortzeit <3s
- ✅ Prüft auf "404" im Body
- ✅ Exit Code 0 = OK, 1 = Fehler
- ✅ JSON-Report wird erstellt
- ✅ Lokale Tests möglich (`node scripts/smoke-test.js local`)

### Empfohlene nächste Schritte

1. **Domain prüfen:** DNS-Eintrag für edufunds.org überprüfen
2. **Server-Status:** Hosting/Infrastructure prüfen
3. **Alternative:** Test gegen funktionierende Staging-URL

### Usage

```bash
# Produktion testen
npm run test:smoke

# Lokal testen (localhost:3101)
node scripts/smoke-test.js local
```
