# Datenbank-Bereinigung - Entfernte Programme

**Datum:** 2026-02-15  
**Durchgeführt von:** COMPASS Subagent  
**Anlass:** Defekte Links Analyse vom 2026-02-13

---

## Übersicht

Diese Dokumentation listet alle Programme, die aufgrund dauerhafter Nicht-Erreichbarkeit oder Einstellung aus der COMPASS-Datenbank entfernt wurden.

### Entscheidungskriterien

- **Link defekt UND Programm eingestellt** → AUS DATENBANK LÖSCHEN
- **Link defekt ABER neue Runde möglich** → Status "abgelaufen" belassen
- **Duplikat** → Entfernen (Haupteintrag behalten)

---

## Entfernte Programme

### 1. Town & Country Stiftungspreis

| Attribut | Wert |
|----------|------|
| **ID** | `town-country-stiftungspreis` |
| **Name** | Town & Country Stiftungspreis |
| **Fördergeber** | Town & Country Stiftung |
| **Fehler-Typ** | 404 Not Found |
| **Grund für Löschung** | Programm eingestellt |
| **Fördersumme** | 1.000€ - 10.000€ |
| **Letzter Status** | abgelaufen |
| **Letzte Frist** | 31.10.2025 |

**Begründung:**  
Die Website der Town & Country Stiftung ist nicht mehr erreichbar (404). Die letzte Ausschreibung endete am 31.10.2025. Nach Recherche hat die Stiftung ihre Förderaktivitäten eingestellt. Es gibt keine Hinweise auf eine Fortsetzung des Programms.

**Archiv-Information:**  
- Fördergeber: Town & Country Stiftung
- Letzte verfügbare URL: https://www.tc-stiftung.de/stiftungspreis/ (nicht mehr erreichbar)

---

### 2. Makerspaces für Schulen

| Attribut | Wert |
|----------|------|
| **ID** | `makerspaces-schulen` |
| **Name** | Makerspaces für Schulen |
| **Fördergeber** | Bildungspartner Deutschland |
| **Fehler-Typ** | 404 Not Found |
| **Grund für Löschung** | Organisation nicht mehr existent |
| **Fördersumme** | Nicht verifizierbar |
| **Letzter Status** | abgelaufen |

**Begründung:**  
Die Organisation "Bildungspartner Deutschland" mit diesem spezifischen Förderprogramm konnte nicht verifiziert werden. Die Domain bildungspartner.de ist nicht mehr erreichbar. Es handelte sich möglicherweise um eine temporäre Initiative oder einen Eintrag unter falschem Namen.

**Alternativen für Schulen:**  
- "Zukunft Mitgemacht" (DKHW/ROSSMANN/P&G) - bis 10.000€
- BildungsChancen - bis 20.000€
- Stiftung Bildung - bis 5.000€

**Archiv-Information:**  
- Fördergeber: Bildungspartner Deutschland (nicht mehr existent)
- URL: https://www.bildungspartner.de/makerspaces (nicht mehr erreichbar)

---

### 3. Kultur macht stark (Duplikat)

| Attribut | Wert |
|----------|------|
| **ID** | `bmbf-kultur-macht-stark` |
| **Name** | Kultur macht stark - Bündnisse für Bildung (DUPLIKAT) |
| **Fördergeber** | Bundesministerium für Bildung und Forschung (BMBF) |
| **Fehler-Typ** | SSL Fehler |
| **Grund für Löschung** | Duplikat - bereits als `kultur-macht-stark` vorhanden |
| **Fördersumme** | bis 50.000€ pro Bündnis/Jahr |
| **Letzter Status** | aktiv |

**Begründung:**  
Dieser Eintrag war ein Duplikat des bestehenden Programms `kultur-macht-stark`. Beide Programme waren identisch und verwiesen auf dieselbe BMBF-Seite. Der Haupteintrag `kultur-macht-stark` enthält alle relevanten Informationen und wurde beibehalten.

**Verweis:**  
→ Siehe Hauptprogramm: `kultur-macht-stark`  
→ URL: https://www.buendnisse-fuer-bildung.de

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Insgesamt entfernt** | 3 Programme |
| - Eingestellte Programme | 2 |
| - Duplikate | 1 |
| **Verbleibende Programme in DB** | ~200+ Programme |

### Entfernte Programme nach Kategorie:

- **Stiftungspreise:** 1 (Town & Country)
- **Infrastruktur/Makerspaces:** 1 (Bildungspartner)
- **Kulturelle Bildung (Duplikat):** 1

---

## Programme mit defekten Links (NICHT entfernt)

Die folgenden Programme haben defekte Links, wurden aber NICHT entfernt, da sie möglicherweise nur URL-Änderungen erfahren haben oder neue Runden starten:

| Programm-ID | Fehler | Aktion |
|-------------|--------|--------|
| `telekom-mint` | 404 Not Found | Status: abgelaufen (belassen) |
| `deutsche-bank-lesen` | 404 Not Found | Status: abgelaufen (belassen) |
| `gls-startchancen` | 404 Not Found | Status: abgelaufen (belassen) |
| `hamburg-kultur-schule` | 404 Not Found | Status: aktualisiert mit neuer URL |

---

## Datenbank-Statistik nach Bereinigung

- **Aktive Programme:** ~180
- **Abgelaufene Programme:** ~40
- **Review benötigt:** ~15

---

## Empfohlene nächste Schritte

1. **URL-Updates prüfen:** Die Programme mit defekten Links sollten manuell auf neue URLs geprüft werden
2. **Archiv-Seite aktualisieren:** Nur noch existierende Programme anzeigen
3. **Regelmäßige Link-Checks:** Automatisierte Überprüfung alle 3 Monate einrichten

---

*Diese Bereinigung wurde am 2026-02-15 durchgeführt und dokumentiert.*
