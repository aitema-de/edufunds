# KI-Prompt-Optimierung

## Zusammenfassung

Dokumentation der Prompt-Optimierung für den KI-Antragsgenerator.

## Änderungen

### 1. Token-Reduktion

| Metrik | Vorher | Nachher | Reduktion |
|--------|--------|---------|-----------|
| Prompt-Länge | ~2600 Token | ~1000-1200 Token | ~55% |
| maxOutputTokens | 4000 | 2500 | 37.5% |
| Geschätzte Gesamtkosten | ~$0.20/Aufruf | ~$0.12/Aufruf | 40% |

### 2. System-Prompt Optimierung

**Vorher (~800 Token):**
```
Du bist ein erfahrener Fördermittelberater mit 15 Jahren Erfahrung...
[Sehr lange Beschreibung mit vielen Details]
```

**Nachher (~80 Token):**
```
Antragsberater für Bildungsförderung. Stil: sachlich, präzise, aktiv. 
Regeln: 1 Adjektiv/Satz, konkrete Daten, These→Beleg→Nutzen.
```

### 3. Struktur-Optimierung

**Vorher:**
- Ausführliche Markup-Struktur mit vielen Überschriften
- Wiederholte Informationen
- Lange Feld-Beschreibungen

**Nachher:**
- Kompakte Key-Value Darstellung
- Keine Redundanz
- Fokus auf essentielle Informationen

### 4. Prompt-Template Vergleich

**Vorher (~2600 Token):**
```typescript
`Du bist ein erfahrener Antragsberater für schulische Förderprogramme...
## PROGRAMMDETAILS
- Programm: ${programm.name}
- Fördergeber: ${programm.foerdergeber}
...
## ANFORDERUNGEN AN DEN ANTRAG
Erstelle einen vollständigen Förderantrag...
1. **EINLEITUNG UND PROJEKTÜBERSICHT** (150-200 Wörter)
...`
```

**Nachher (~1000 Token):**
```typescript
const SYSTEM_PROMPT_KURZ = `Antragsberater für Bildungsförderung. Stil: sachlich, präzise, aktiv. Regeln: 1 Adjektiv/Satz, konkrete Daten, These→Beleg→Nutzen.`;

`${SYSTEM_PROMPT_KURZ}

PROGRAMM: ${programm.name} | ${programm.foerdergeber} (${programm.foerdergeberTyp})
Frist: ...
PROJEKT: ${projektDaten.projekttitel} | ${projektDaten.schulname}
...
STRUKTUR (Markdown):
1. Einleitung (150W)
...
ZIEL: 1200-1500 Wörter, professionell, überzeugend.`
```

## Technische Änderungen

### API-Konfiguration
```typescript
generationConfig: {
  temperature: 0.3,
  maxOutputTokens: 2500,  // Reduziert von 4000
}
```

### Retry-Mechanismus
```typescript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    // API-Aufruf
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}
```

## Qualitätssicherung

### Beibehaltene Qualitätskriterien
- ✅ Struktur: These → Beleg → Nutzen
- ✅ Aktive Sprache
- ✅ Konkrete Daten statt Adjektive
- ✅ Professioneller Ton
- ✅ Vollständige Antragsstruktur (8 Abschnitte)

### Neue Validierungen
- ✅ Mindestlänge: 500 Zeichen
- ✅ Retry bei zu kurzer Antwort
- ✅ Graceful Degradation bei Fehlern

## Fehlerbehandlung

### Implementierte Fehler-Codes

| Code | Bedeutung | Nutzer-Nachricht |
|------|-----------|------------------|
| RATE_LIMIT | Zu viele Anfragen | "Bitte warte 1-2 Minuten" |
| SERVICE_UNAVAILABLE | API nicht erreichbar | "Template-basierter Antrag wird erstellt" |
| VALIDATION_ERROR | Ungültige Daten | "Bitte überprüfe deine Eingaben" |
| TIMEOUT | Zeitüberschreitung | "Bitte versuche es mit kürzeren Daten" |

### Fallback-Strategie
1. Bei API-Fehler → Template-basierter Antrag
2. Status 200 mit `isFallback: true`
3. Klare Kommunikation im UI möglich

## Test-Ergebnisse

Siehe: `/docs/KI_STABILITÄT_TEST.json`

## Migration

Keine Breaking Changes:
- API-Response enthält neue Felder (`stats`, `config`, `isFallback`)
- Bestehende Clients funktionieren unverändert
- Neue Features optional nutzbar

## Nächste Schritte

- [ ] A/B-Testing mit reduziertem Prompt
- [ ] Messung der tatsächlichen Token-Ersparnis
- [ ] Feintuning der Temperature bei 2500 Tokens

---
Erstellt: $(date +%Y-%m-%d)
