# Archiv-Sektion Dokumentation

## Übersicht

Die Archiv-Sektion zeigt abgelaufene Förderprogramme an. Diese sind weiterhin als Referenz verfügbar, können aber nicht mehr beantragt werden.

## Dateien

### `app/archiv/page.tsx`
Hauptseite des Archivs. Zeigt alle Programme mit `status: "abgelaufen"` an.

**Features:**
- Übersichtliche Karten-Ansicht aller abgelaufener Programme
- Detail-Tabelle mit Name, Fördergeber, letzte Frist, Fördersumme
- Grau/gedämpftes Design zur Unterscheidung von aktiven Programmen
- Keine "Jetzt beantragen" Buttons
- Hinweis: "Diese Programme sind abgelaufen. Neue Runden werden angekündigt."

### `app/archiv/layout.tsx`
Metadaten für SEO (Titel, Beschreibung, Robots).

### `components/Footer.tsx` (aktualisiert)
Neuer Link "Archiv" in der Produkt-Sektion des Footers.

## Aktuell abgelaufene Programme (Stand: Feb 2026)

| Programm | Fördergeber | Letzte Frist | Info |
|----------|-------------|--------------|------|
| MINT-Förderung Grundschule | Telekom Stiftung | 31.10.2025 | 5.000€ - 30.000€ |
| Town & Country Stiftungspreis | Town & Country Stiftung | 31.10.2025 | 1.000€ - 10.000€ |
| Erasmus+ Grundschulbildung | Europäische Kommission | 15.03.2025 | 5.000€ - 300.000€ |
| Makerspaces für Schulen | Bildungspartner Deutschland | unbekannt | Link nicht verfügbar |

## Datenstruktur

Programme werden im Archiv angezeigt, wenn sie in `data/foerderprogramme.json` den Status `"abgelaufen"` haben:

```json
{
  "id": "programm-id",
  "name": "Programmname",
  "status": "abgelaufen",
  "bewerbungsfristEnde": "2025-10-31",
  "bemerkung": "Frist abgelaufen..."
}
```

## Design-Richtlinien

- **Farben:** Grau-Töne statt Akzentfarben (slate-300, slate-400, slate-500)
- **Opazität:** 75% Standard, 100% bei Hover
- **Badges:** Gedämpfte Farben ohne Akzente
- **Keine CTA-Buttons:** Keine "Beantragen"-Buttons, nur Info-Links

## Pflege

Um ein Programm als abgelaufen zu markieren:

1. In `data/foerderprogramme.json` das Feld `status` auf `"abgelaufen"` setzen
2. Optional: `bemerkung` mit Hinweis zur nächsten Runde ergänzen
3. Das Programm erscheint automatisch im Archiv

## SEO

- **Title:** "Archiv - Abgelaufene Förderprogramme | EduFunds"
- **Description:** Übersicht abgelaufener Förderprogramme für Schulen
- **Canonical:** `/archiv`

## Navigation

Der Archiv-Link ist im Footer unter "Produkt" verfügbar:
- Förderprogramme
- Preise  
- KI-Antragsassistent
- **Archiv** ← Neu
