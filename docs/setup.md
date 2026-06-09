# Setup-Anleitung: KI-Antragsgenerator

Diese Anleitung beschreibt die Einrichtung des KI-Antragsgenerators für EduFunds.

## Schnellstart

### 1. Umgebungsvariablen konfigurieren

Kopiere die Beispiel-Datei und füge deinen API-Key ein:

```bash
cp .env.example .env.local
```

Bearbeite `.env.local` und füge deinen Gemini API-Key ein:

```env
GEMINI_API_KEY=AIzaSyDeinEchterApiKeyHier
```

### 2. API-Key besorgen

1. Besuche [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Melde dich mit deinem Google-Konto an
3. Klicke auf "Create API Key"
4. Kopiere den Key und füge ihn in `.env.local` ein

**Kosten:**
- Kostenlos: 1.500 Anfragen/Tag
- Danach: ~$0.075 pro 1 Million Tokens
- Typischer Antrag: ~2.000-4.000 Tokens (~$0.0003 pro Anfrage)

### 3. Server neu starten

```bash
npm run dev
```

Du solltest in der Konsole sehen:
```
[API] KI-Antragsgenerator Status: ✅ API-Key konfiguriert
```

## Konfigurationsoptionen

### Fallback-Modus

Wenn kein `GEMINI_API_KEY` gesetzt ist, wird automatisch der **Fallback-Modus** verwendet:

- **Funktion:** Template-basierte Antragserstellung (ohne KI)
- **Qualität:** Gut strukturiert, aber weniger individualisiert
- **Kosten:** Keine

Der Fallback-Modus ist nützlich für:
- Entwicklung/Testing ohne API-Key
- Offline-Entwicklung
- Kosteneinsparung bei hohem Volumen

### Umgebungsvariablen

| Variable | Erforderlich | Beschreibung | Standard |
|----------|--------------|--------------|----------|
| `GEMINI_API_KEY` | Nein | Google Gemini API Key | - (Fallback) |
| `NODE_ENV` | Ja | Umgebung (development/production) | development |
| `PORT` | Nein | Server-Port | 3000 |

## API-Endpunkte

### POST /api/generate-antrag

Generiert einen Förderantrag basierend auf Stichworten.

**Request:**
```json
{
  "programmId": "bmbf-digitalpakt-2",
  "keywords": ["Tablets", "Grundschule", "Inklusion", "120 Kinder"],
  "options": {
    "skipRevision": false,
    "targetScore": 85
  }
}
```

**Response (mit API-Key):**
```json
{
  "success": true,
  "generation_mode": "ai",
  "antrag": { ... },
  "zusammenfassung": {
    "programm": "bmbf-digitalpakt-2",
    "qualitaetsscore": 87,
    "mode": "KI-generiert"
  }
}
```

**Response (Fallback):**
```json
{
  "success": true,
  "generation_mode": "fallback",
  "antrag": { ... },
  "zusammenfassung": {
    "programm": "bmbf-digitalpakt-2",
    "qualitaetsscore": 72,
    "mode": "Template-basiert (Fallback)"
  }
}
```

### GET /api/generate-antrag

Listet alle verfügbaren Programm-Schemas auf.

**Response:**
```json
{
  "verfuegbare_programme": [
    {
      "id": "bmbf-digitalpakt-2",
      "name": "DigitalPakt Schule 2.0 (BMBF)",
      "komplexitaet": "hoch"
    }
  ]
}
```

## Verfügbare Programme

| Programm-ID | Name | Komplexität |
|-------------|------|-------------|
| `bmbf-digitalpakt-2` | DigitalPakt Schule 2.0 | hoch |
| `telekom-mint` | Telekom Stiftung MINT | mittel |
| `nrw-digital` | Digital.Schule.NRW | mittel |

## Fehlerbehebung

### "KI-API nicht konfiguriert"

**Lösung:** API-Key in `.env.local` setzen:
```env
GEMINI_API_KEY=dein-key-hier
```

### "Invalid API Key"

**Ursachen:**
- Key ist abgelaufen
- Falsches Konto (mehrere Google-Konten?)
- Key wurde widerrufen

**Lösung:** Neuen Key in [Google AI Studio](https://makersuite.google.com/app/apikey) erstellen

### Rate Limit überschritten

**Fehler:** `429 Too Many Requests`

**Lösung:** 
- Warte 1 Minute (Limit: 10 Anfragen/Minute)
- Oder: Verwende Fallback-Modus temporär

## Production Deployment

### Docker

Füge den Key als Environment Variable hinzu:

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
```

Oder als Secret:

```bash
# .env auf Production-Server
echo "GEMINI_API_KEY=dein-key" >> .env
```

### Hetzner (Production)

1. Auf Server einloggen
2. `.env` Datei bearbeiten:
   ```bash
   cd /root/hetzner-stack
   nano .env
   ```
3. Key hinzufügen und speichern
4. Container neu starten:
   ```bash
   docker-compose restart edufunds
   ```

## Monitoring

### Logs prüfen

```bash
# Lokale Entwicklung
npm run dev

# Docker
docker logs edufunds-app
```

Erwartete Logs:
```
[API] KI-Antragsgenerator Status: ✅ API-Key konfiguriert
[API] Generiere Antrag für bmbf-digitalpakt-2 | Modus: KI-generiert
[API] Erfolgreich generiert in 3245ms
```

### Status prüfen

```bash
curl http://localhost:3000/api/generate-antrag
```

## Support

Bei Problemen:
1. Prüfe Logs: `docker logs edufunds-app`
2. Verifiziere API-Key: [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Teste Fallback-Modus (Key entfernen)
4. Erstelle Issue mit Log-Auszug

---

**Letzte Aktualisierung:** 2025-02-11  
**Version:** 1.0.0
