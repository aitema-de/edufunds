# EduFunds Qualitäts-Messframework

## Ziel: 5% Verbesserung pro Iteration

### Aktuelle Baseline (2026-02-12)

| Metrik | Stand | Ziel (nächste Iteration) |
|--------|-------|--------------------------|
| **Programm-Qualität** | | |
| Verifizierte Programme | 17/120 (14%) | +6 Programme (20%) |
| Fiktive/unverifizierte | 0 (nach Cleanup) | 0 (halten) |
| Mit Fördersummen-Warnung | 103/120 (86%) | <80% |
| **Link-Qualität** | | |
| Treffsicherheit | 99.5% (gemessen) | 100% |
| Tote Links | 0 | 0 |
| **Code-Qualität** | | |
| Build-Fehler | 0 | 0 |
| TypeScript-Fehler | 0 | 0 |
| **User Experience** | | |
| 404-Fehler (User) | 0 | 0 |
| Vertrauenswürdigkeit | Verbesserung nötig | +5% |

---

## Iterations-Log

### Iteration 1: Cleanup (2026-02-12)
- **Aktion:** 22 fiktive Programme entfernt
- **Ergebnis:** 142 → 120 Programme
- **Verbesserung:** 100% (keine fiktiven Programme mehr)
- **Status:** ✅ Abgeschlossen

### Iteration 2: Fördersummen-Verifizierung (2026-02-12)
- **Aktion:** 103 Programme mit Warnungen prüfen
- **Ziel:** Mindestens 6 Programme verifizieren (20% der Warnungen)
- **Methode:** Web-Recherche, Quellen prüfen, korrigieren
- **Status:** 🔄 In Arbeit

---

## Definition of Done (DoD)

Ein Programm gilt als "verifiziert", wenn:
1. ✅ Fördersumme aus offizieller Quelle
2. ✅ Antragsfrist aktuell
3. ✅ Link direkt zur Ausschreibung
4. ✅ Für Schulen relevant
5. ✅ Direkt beantragbar

---

## Messmethodik

**Automatisch messbar:**
- Anzahl Programme (Counter)
- HTTP-Status (Script)
- Build-Status (CI/CD)

**Manuell prüfen (Agent):**
- Fördersummen-Quellen
- Antragbarkeit
- Inhaltliche Korrektheit

**User-Feedback:**
- Fehlermeldungen
- Support-Anfragen
- Conversion-Rates

---

## 5%-Regel

Pro Iteration muss mindestens eine Metrik um 5% verbessert werden:
- Entweder 6 Programme mehr verifiziert (von 120)
- Oder Fehlerquote um 5% reduzieren
- Oder User-Trust-Score um 5% steigern

---

*Letztes Update: 2026-02-12*
*Nächste Messung: Nach Iteration 2*
