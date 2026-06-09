# Zusätzliche Anforderungen für KI-Antrag-Generator

## ERWEITERUNG Phase 2/3:

### 1. Antragsprosa-Guide erstellen

Datei: `/data/antragsprosa-guide.json`

```json
{
  "struktur_regeln": [
    "Jeder Absatz: These → Beleg → Nutzen",
    "Aktive Sprache, keine Konjunktive",
    "Messbare Ziele statt vager Absichten"
  ],
  "buzzword_kategorien": {
    "innovation": ["digital", "zukunftsweisend", "nachhaltig", "innovativ", "pionierend", "wegbereitend"],
    "wirkung": ["Breitenwirkung", "Transferpotenzial", "Skalierbarkeit", "Multiplikatoreffekt", "nachhaltige Wirkung"],
    "qualitaet": ["evidenzbasiert", "wissenschaftlich begleitet", "evaluiert", "kriteriengeleitet", "qualitaetsgesichert"]
  },
  "anti_patterns": [
    "Zu viele Adjektive",
    "Fehlende Quantifizierung",
    "Keine klare Zielgruppe",
    "Passive Sprache",
    "Konjunktive (würde, könnte, sollte)",
    "Vage Formulierungen"
  ],
  "satz_templates": {
    "projektziel": "Das Projekt {name} verfolgt das Ziel, {ziel} durch {methode} zu erreichen und damit {wirkung} für {zielgruppe} zu erzielen.",
    "innovation": "Der innovative Ansatz besteht in {innovation}, wodurch erstmals {neuheit} ermöglicht wird.",
    "nachhaltigkeit": "Die Nachhaltigkeit des Projekts wird durch {aspekt} sichergestellt, um {langfristiger_nutzen} zu gewährleisten.",
    "umsetzung": "Die Umsetzung erfolgt in {zeitraum} durch {akteure} unter Einbindung von {ressourcen}."
  }
}
```

**SUCCESS CRITERIA:** Generierte Anträge klingen professionell, nicht nach KI. Blind-Test: Antrag lesen ohne zu wissen dass KI → "könnte von Berater sein"

---

## PHASE 4: Iterationsschleife

Nachdem Phase 1-3 implementiert sind:

### Schritte:

1. **Test-Generierung:**
   - Generiere für JEDES der 3 Programme je 3 Anträge mit verschiedenen Stichworten
   - Total: 9 Test-Anträge

2. **Self-Review:**
   - Bewerte jeden mit dem Self-Review (Phase 2, Schritt 3)
   - Dokumentiere Scores pro Sektion

3. **Analyse:**
   - Welche Sektionen scoren schlecht (< 70)?
   - Warum? (Prompt zu schwach? Fehlender Kontext?)
   - Muster erkennen

4. **Verbesserung:**
   - System-Prompts anpassen basierend auf Erkenntnissen
   - Mehr Kontext hinzufügen
   - Bessere Beispiele einbinden

5. **Validierung:**
   - Generiere erneut
   - Vergleiche Scores
   - Dokumentiere Verbesserung

6. **Dokumentation:**
   - Jede Iteration in `/docs/antrag-iteration-log.md`
   - Vorher/Nachher Vergleich
   - Gelernte Erkenntnisse

### Ziel:
- Durchschnittlicher Score > 85
- Alle Sektionen > 70
- Professionelle Qualität

---

## BOUNDARIES (WICHTIG!)

⚠️ **Staging-first:**
- Kein Production-Deploy ohne Freigabe von Kolja!
- Teste auf Staging oder lokal

💰 **API-Kosten:**
- Tracke Gemini-Calls pro Antrag
- Maximale Kosten: 5€/Tag
- Dokumentiere in `/docs/api-costs.md`

🚫 **Keine echten Anträge:**
- Nur Test-Generierung
- Nichts einreichen!
- Markiere Test-Anträge deutlich

💾 **Git Commits:**
- Nach jeder abgeschlossenen Phase commiten
- Conventional Commits verwenden
- Nachrichten: "feat(ki-antrag): Phase X abgeschlossen"

---

## KOMMUNIKATION

Melde dich nach **jeder Phase** bei Kolja via Telegram:

**Format:**
```
🔥 Phase X abgeschlossen

Ergebnisse:
- Was wurde erreicht?
- Welche Dateien wurden erstellt/geändert?
- Success Criteria erfüllt? (Ja/Nein)
- API-Kosten bisher: X€

Nächster Schritt:
- Phase X+1 beginnen
- Oder: Rückfrage wegen [Problem]

Fragen an Kolja:
- [Falls vorhanden]
```

---

## Zeitplan

| Phase | Geschätzte Zeit | Status |
|-------|-----------------|--------|
| 1 - Schema | 2h | 🔄 In Arbeit |
| 2 - Pipeline | 2h | ⏳ Wartet |
| 3 - Qualität | 1h | ⏳ Wartet |
| 4 - Iteration | 1-2h | ⏳ Wartet |
| **Total** | **6-7h** | |

---

*Diese Anforderungen wurden am 2026-02-11 hinzugefügt.*
