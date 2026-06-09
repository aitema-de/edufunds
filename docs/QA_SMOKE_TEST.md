# QA Smoke Test Dokumentation

## Überblick

Der Smoke-Test prüft die Verfügbarkeit kritischer EduFunds-URLs.

## Getestete URLs

1. `https://edufunds.org/` - Startseite
2. `https://edufunds.org/foerderprogramme` - Förderprogramme-Übersicht
3. `https://edufunds.org/foerderprogramme/bmbf-digitalpakt-2` - Detailseite
4. `https://edufunds.org/preise` - Preisübersicht
5. `https://edufunds.org/api/health` - Health-Check API

## Prüfkriterien

Für jede URL wird geprüft:
- **HTTP Status 200** - Seite erreichbar
- **Antwortzeit <3s** - Performance OK
- **Kein "404" im Body** - Keine Fehlerseite

## Ausführung

### Manuell
```bash
node scripts/smoke-test.js
```

### Via npm
```bash
npm run test:smoke
```

## Exit Codes

- `0` - Alle Tests bestanden ✅
- `1` - Mindestens ein Test fehlgeschlagen ❌

## Output

### Konsole
Zeigt für jede URL:
- Status (✅/❌)
- HTTP Status Code
- Antwortzeit in ms
- Fehler (falls vorhanden)

### JSON-Report
`smoke-test-report.json` im Projekt-Root:
```json
{
  "timestamp": "2025-02-12T15:30:00.000Z",
  "total": 5,
  "passed": 5,
  "failed": 0,
  "tests": [...]
}
```

## Integration

### CI/CD (GitHub Actions)
```yaml
- name: Smoke Test
  run: npm run test:smoke
```

### Pre-Deploy
```bash
npm run test:smoke && npm run deploy
```

## Wartung

Neue URLs hinzufügen in `scripts/smoke-test.js`:
```javascript
const URLS = [
  'https://edufunds.org/',
  // ... weitere URLs
];
```

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Timeout | Prüfe Netzwerkverbindung |
| 404 Fehler | URL korrigieren oder Seite prüfen |
| SSL Fehler | System-Zertifikate aktualisieren |
