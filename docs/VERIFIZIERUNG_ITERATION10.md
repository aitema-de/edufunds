# Verifizierung Iteration 10 - Report

**Datum:** 13. Februar 2026  
**Ziel:** 6 Programme mit `verificationWarning` verifizieren  
**Status:** ✅ Abgeschlossen

---

## Übersicht

| # | Programm | Status | Fördersumme (korrigiert) |
|---|----------|--------|-------------------------|
| 1 | Reinhold-Beitlich-Stiftung | ✅ Verifiziert | Keine Obergrenze (Einzelfall) |
| 2 | FIRST LEGO League Sachsen | ✅ Verifiziert | Materialien + Robotik-Sets |
| 3 | Makerspaces für Schulen | ⚠️ Review needed | Quelle nicht verifizierbar |
| 4 | Sparkassenstiftung Lübeck | ⚠️ Review needed | Keine Schulförderung |
| 5 | Sparkassenstiftung Elbe-Elster | ✅ Verifiziert | Bis 5.000€ (statt 500-2.000€) |
| 6 | BayWa Schulgartenprojekt | ✅ Verifiziert | Hochbeet-Set + 50€/Jahr |

---

## Detaillierte Ergebnisse

### ✅ 1. Reinhold-Beitlich-Stiftung - Erziehung und Bildung

**Korrekturen:**
- Fördersumme: Keine feste Obergrenze (statt 2.000-20.000€)
- Einzelfallentscheidung ohne Obergrenze
- Ca. 250 Projekte/Jahr mit 14+ Mio. € Gesamtvolumen

**Quelle:** https://www.reinhold-beitlich-stiftung.de/foerderrichtlinien/

**Neue Felder:**
- `verifiziertAm`: 2026-02-13
- `verifiziertVon`: Web-Recherche Reinhold-Beitlich-Stiftung
- `quelleUrl`: https://www.reinhold-beitlich-stiftung.de/foerderrichtlinien/

---

### ✅ 2. FIRST LEGO League Sachsen (Sächsische Aufbaubank)

**Korrekturen:**
- Fördergeber korrekt: "Sächsische Aufbaubank (SAB)"
- 25 Challenge-Klassen + 45 Explore-Klassen
- Materialien: Challenge-Sets, SPIKE Prime/Essential
- Bewerbungsfrist: bis 19.04.2026

**Quelle:** https://www.first-lego-league.org/files/Dateiverwaltung%20NEU/Fotos/F%C3%B6rderprogramme/F%C3%B6rderrichtlinien_SAB_2025-26_Website.pdf

**Neue Felder:**
- `verifiziertAm`: 2026-02-13
- `verifiziertVon`: Web-Recherche Sächsische Aufbaubank
- `bewerbungsfristStart`: 2025-09-01
- `bewerbungsfristEnde`: 2026-04-19

---

### ⚠️ 3. Makerspaces für Schulen - Review Needed

**Problem:**
- Organisation "Bildungspartner Deutschland" mit diesem Programm nicht auffindbar
- URL bildungspartner.de nicht verifizierbar

**Alternative Förderer für Makerspaces:**
| Förderer | Summe | Link |
|----------|-------|------|
| Zukunft Mitgemacht (DKHW/ROSSMANN/P&G) | 10.000€ | https://www.dkhw.de/foerderung-und-hilfe/projektfoerderung/sonderfonds-zukunft-mitgemacht-aktion-maker-spaces/ |
| BildungsChancen | bis 20.000€ | https://www.bildungschancen.de |
| Stiftung Bildung | bis 5.000€ | https://www.stiftungbildung.org |

**Neue Felder:**
- `status`: review_needed
- `reviewNotiz`: Ursprüngliche Quelle nicht verifizierbar

---

### ⚠️ 4. Sparkassenstiftung Lübeck (Überholspur) - Review Needed

**Problem:**
- Keine direkte Förderung für Schulen
- Programm richtet sich an Schüler:innen (Klassen 9-10, nicht Grundschule!)
- Schüler können sich nicht selbst bewerben, Kooperation über Schulen

**Korrekturen:**
- Zielgruppe: Sekundarstufe (nicht Grundschule)
- Keine Fördersumme für Schulen
- Kostenlos für teilnehmende Schüler:innen

**Quelle:** https://www.gemeinnuetzige-sparkassenstiftung-luebeck.de/initiativen-preise-verborgen/nachhilfeprojekt-ueberholspur

**Neue Felder:**
- `status`: review_needed
- `kiAntragGeeignet`: false
- `reviewNotiz`: Grundlegende Fehler: Zielgruppe ist Sekundarstufe, nicht Grundschule

---

### ✅ 5. Sparkassenstiftung Elbe-Elster - Auslandsstipendien

**Korrekturen:**
- Fördersumme: Bis 5.000€ (statt 500-2.000€)
- Deckt bis zu 50% der Kosten
- Frist: jährlich bis 31.01. (statt 31.05.)
- Seit 2001 über 118 Jugendliche gefördert

**Quelle:** https://www.spk-elbe-elster.de/de/home/ihre-sparkasse/Sparkassenstiftung/foerderung/auslandsstipendium.html

**Neue Felder:**
- `verifiziertAm`: 2026-02-13
- `verifiziertVon`: Web-Recherche Sparkassenstiftung Elbe-Elster
- `bewerbungsfristStart`: 2025-01-01
- `bewerbungsfristEnde`: 2026-01-31

---

### ✅ 6. BayWa Stiftung - Schulgartenprojekt

**Korrekturen:**
- Vollständiger Name: "Gemüse pflanzen. Gesundheit ernten."
- 120 Schulen/Jahr erhalten Komplett-Set
- Hochbeet(e), Werkzeuge, 50€/Jahr für Saatgut
- Seit 2013 aktiv

**Quelle:** https://www.baywastiftung.de/projekte/schulgarten

**Neue Felder:**
- `verifiziertAm`: 2026-02-13
- `verifiziertVon`: Web-Recherche BayWa Stiftung
- `quelleUrl`: https://www.baywastiftung.de/projekte/schulgarten

---

## Zusammenfassung

| Metrik | Anzahl |
|--------|--------|
| Verifiziert | 4 Programme |
| Review needed | 2 Programme |
| Gesamt bearbeitet | 6 Programme |

### Verifizierte Programme (4):
1. Reinhold-Beitlich-Stiftung
2. FIRST LEGO League Sachsen
3. Sparkassenstiftung Elbe-Elster
4. BayWa Schulgartenprojekt

### Review Needed (2):
1. Makerspaces für Schulen (Quelle nicht verifizierbar)
2. Sparkassenstiftung Lübeck (Keine Schulförderung, falsche Zielgruppe)

---

## Änderungen in der JSON

Alle Programme wurden aktualisiert:
- `verificationWarning` entfernt
- `verifiziertAm` und `verifiziertVon` hinzugefügt
- `quelleUrl` hinzugefügt (wo verfügbar)
- `status` auf "aktiv" oder "review_needed" gesetzt
- `updatedAt` aktualisiert

---

## Nächste Schritte

1. **Für "Makerspaces für Schulen":** Recherche nach korrekten Alternativen oder Löschung
2. **Für "Sparkassenstiftung Lübeck":** Entscheidung über Beibehaltung (als Schülerprogramm) oder Löschung
3. **Fortschritt aktualisieren:** 47.5% → 52.5% Verifizierungsquote

---

*Report erstellt am 13. Februar 2026*
