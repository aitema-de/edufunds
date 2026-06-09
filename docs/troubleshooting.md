# Troubleshooting-Guide: KI-Antragsgenerator

Dieser Guide hilft bei der Lösung häufiger Probleme mit dem KI-Antragsgenerator.

## Inhalt

1. [API-Verbindungsprobleme](#api-verbindungsprobleme)
2. [Qualitätsprobleme](#qualitätsprobleme)
3. [Performance-Probleme](#performance-probleme)
4. [Fehlermeldungen](#fehlermeldungen)

---

## API-Verbindungsprobleme

### Problem: "KI-API nicht konfiguriert"

**Symptom:**
```json
{
  "error": "KI-API nicht konfiguriert. Bitte GEMINI_API_KEY setzen."
}
```

**Ursachen & Lösungen:**

1. **Kein API-Key gesetzt**
   ```bash
   # Prüfen
   echo $GEMINI_API_KEY
   
   # Lösung: In .env.local eintragen
   echo "GEMINI_API_KEY=dein-key-hier" >> .env.local
   ```

2. **Umgebungsvariable nicht geladen**
   ```bash
   # Server neu starten
   npm run dev
   ```

3. **Falscher Key-Format**
   - Muss mit `AIzaSy` beginnen
   - Keine Leerzeichen oder Anführungszeichen

### Problem: "Rate limit exceeded"

**Symptom:**
```json
{
  "error": "Zu viele Anfragen. Bitte warte einen Moment.",
  "code": "API_RATE_LIMIT"
}
```

**Ursachen & Lösungen:**

1. **Gemini Rate-Limit**
   - Free Tier: 1.500 Anfragen/Tag
   - Warte 60 Sekunden zwischen Anfragen
   - Oder: API-Key für höheres Limit upgraden

2. **Eigenes Rate-Limit**
   - Unsere API: 10 Anfragen/Minute pro IP
   - Warte bis `Retry-After` Header

**Workaround:**
```javascript
// Warte 10 Sekunden zwischen Anfragen
await new Promise(r => setTimeout(r, 10000));
```

### Problem: "KI-Service temporär nicht verfügbar"

**Symptom:**
```json
{
  "error": "Der KI-Service ist temporär nicht verfügbar.",
  "code": "API_UNAVAILABLE"
}
```

**Ursachen & Lösungen:**

1. **Gemini Service Down**
   - Prüfe: https://status.cloud.google.com/
   - Warte und versuche später erneut
   - Retry-Logik ist automatisch aktiv (3 Versuche)

2. **Netzwerkprobleme**
   ```bash
   # Verbindung testen
   curl https://generativelanguage.googleapis.com/v1beta/models
   ```

3. **DNS/Proxy-Probleme**
   - Firewall-Regeln prüfen
   - Proxy-Konfiguration überprüfen

### Problem: "Timeout bei der Generierung"

**Symptom:**
Generierung bricht nach 30+ Sekunden ab

**Ursachen & Lösungen:**

1. **Zu viele Stichworte**
   - Reduziere auf 5-10 Stichworte
   - Weniger ist oft mehr!

2. **Komplexe Programme**
   - BMBF DigitalPakt braucht länger
   - Versuche zuerst einfachere Programme (Telekom MINT)

3. **API-Timeout**
   ```javascript
   // In route.ts: Timeout erhöhen
   export const maxDuration = 300; // 5 Minuten
   ```

---

## Qualitätsprobleme

### Problem: Antrag klingt generisch

**Symptom:**
- Viele Floskeln ("zukunftsweisend", "innovativ")
- Wenig spezifische Details
- Könnte für jedes Projekt gelten

**Lösungen:**

1. **Mehr spezifische Stichworte**
   ```
   ❌ "Digitale Bildung", "Schule"
   ✅ "KI-gestützte Leseanalyse", "Grundschule Klassen 1-4", "120 Risikokinder"
   ```

2. **Zahlen und Daten einfügen**
   ```
   ❌ "Viele Kinder"
   ✅ "120 Kinder", "3 Klassenstufen", "20 Wörter/Minute"
   ```

3. **Konkrete Methoden nennen**
   ```
   ❌ "Moderne Methoden"
   ✅ "Reciprocal Teaching", "Peer-Feedback", "Metakognitionstraining"
   ```

### Problem: Zu viele Adjektive

**Symptom:**
```
"Wir entwickeln ein hochinnovatives, außergewöhnlich 
wirkungsvolles und wunderbar nachhaltiges Projekt..."
```

**Lösung:**
- Maximal 1 Adjektiv pro Satz
- Stattdessen: Fakten, Daten, Belege

**Prompt-Optimierung:**
```
// In Stichworten vermeiden:
"innovativ", "hervorragend", "exzellent", "großartig"

// Stattdessen verwenden:
"KI-gestützt", "evidenzbasiert", "wissenschaftlich begleitet"
```

### Problem: Konjunktiv-Formulierungen

**Symptom:**
```
"Das Projekt könnte helfen..."
"Es wäre wünschenswert..."
"Wenn mehr Kinder teilnehmen würden..."
```

**Lösung:**
Immer aktive, planende Sprache:
```
"Das Projekt fördert..."
"Wir erreichen..."
"Wir rekrutieren 120 Kinder durch..."
```

### Problem: Fehlende Quantifizierung

**Symptom:**
```
"Viele Kinder werden profitieren"
"Einige Lehrer werden geschult"
"Das Budget ist angemessen"
```

**Lösung:**
```
"120 Kinder in Klassen 1-4"
"Alle 18 Lehrkräfte (Klasse 1-4)"
"45.000€ (Hardware: 28.000€, Software: 8.000€...)"
```

### Problem: Budget nicht nachvollziehbar

**Symptom:**
```
"Wir benötigen 50.000€ für digitale Ausstattung"
```

**Lösung:**
Stichworte mit Budget-Details:
```
"15 Tablets (12.000€)", "Ladeschrank (3.500€)", 
"Software-Lizenzen (8.000€)", "Fortbildung (6.000€)"
```

---

## Performance-Probleme

### Problem: Generierung dauert zu lange

**Symptom:**
- > 30 Sekunden für einen Antrag
- Nutzer wird ungeduldig

**Ursachen & Lösungen:**

1. **Zu viele API-Calls**
   - Aktuell: ~8-12 Calls pro Antrag
   - Jede Sektion = 1 Call
   - Review = 1 Call
   - Revisionen = 1-3 Calls

2. **Optimierung:**
   ```javascript
   // In generate-antrag/route.ts
   // Skip Revision wenn Score > 80
   if (antrag.self_review.overall_score >= 80) {
     skipRevision = true;
   }
   ```

3. **Caching implementieren**
   ```javascript
   // Gleiche Keywords = gecachtes Ergebnis
   // Redis oder In-Memory Cache
   ```

### Problem: Hohe API-Kosten

**Symptom:**
- Kosten steigen schnell
- Free Tier wird überschritten

**Analyse:**
```
Typischer Antrag:
- Tokens: ~4.000 Input + ~3.000 Output = 7.000 Tokens
- Kosten: ~$0.0005 pro Antrag
- 1.500 Free Requests/Tag = ~$0,75/Tag möglich
```

**Optimierungen:**

1. **Kürzere Prompts**
   - Prompt-Template optimieren
   - Weniger Beispiele

2. **Kürzere Outputs**
   - `maxOutputTokens` reduzieren
   - Nur wichtige Sektionen generieren

3. **Caching**
   - Gleiche Stichwort-Kombinationen cachen
   - TTL: 24 Stunden

4. **Budget-Limits**
   ```javascript
   // Max X Anträge pro Nutzer/Tag
   const DAILY_LIMIT = 10;
   ```

---

## Fehlermeldungen

### Fehlercode-Referenz

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `API_KEY_MISSING` | Kein GEMINI_API_KEY | .env.local erstellen |
| `API_RATE_LIMIT` | Zu viele Anfragen | Warten oder upgraden |
| `API_UNAVAILABLE` | Gemini down | Später erneut versuchen |
| `API_TIMEOUT` | Timeout | Weniger Stichworte |
| `INVALID_RESPONSE` | Leere/unvollständige Antwort | Erneut versuchen |
| `SCHEMA_NOT_FOUND` | Programm nicht gefunden | Programm-ID prüfen |
| `VALIDATION_ERROR` | Ungültige Eingaben | JSON-Format prüfen |
| `PIPELINE_ERROR` | Interner Fehler | Logs prüfen, retry |

### Debugging

**Logs aktivieren:**
```bash
# Entwicklung
DEBUG=* npm run dev

# Production
docker logs edufunds-app
```

**Netzwerk-Test:**
```bash
# API erreichbar?
curl -I https://generativelanguage.googleapis.com/v1beta/models

# Key valid?
curl "https://generativelanguage.googleapis.com/v1beta/models?key=DEIN_KEY"
```

**Manueller API-Test:**
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=DEIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Say hello"}]
    }]
  }'
```

---

## Best Practices

### Für Entwickler

1. **Immer Retry-Logik nutzen**
   ```typescript
   // Automatisch in Pipeline implementiert
   // 3 Versuche mit exponentiellem Backoff
   ```

2. **Graceful Degradation**
   ```typescript
   // Fallback-Modus wenn KI nicht verfügbar
   if (!apiKey) {
     return generateFallbackAntrag(...);
   }
   ```

3. **Monitoring**
   ```typescript
   // Metriken tracken
   console.log(`Tokens: ${tokens}, Cost: ${cost}, Time: ${duration}ms`);
   ```

### Für Nutzer

1. **5-10 Stichworte sind optimal**
   - Zu wenig = generisch
   - Zu viel = verwirrend für KI

2. **Konkret statt abstrakt**
   - ❌ "Gute Bildung"
   - ✅ "Lesegeschwindigkeit +20 Wörter/Min"

3. **Fakten statt Adjektive**
   - ❌ "Innovativ"
   - ✅ "KI-gestützt mit 85% Erfolgsquote"

---

## Support

Bei nicht lösbaren Problemen:

1. Logs sammeln
2. Stichworte notieren
3. Fehlermeldung kopieren
4. Issue erstellen mit:
   - Programm-ID
   - Stichworte
   - Erwartetes Verhalten
   - Tatsächliches Verhalten
   - Logs

---

*Letzte Aktualisierung: 2025-02-12*
