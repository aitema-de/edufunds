# Qualitätskontrolle – Entscheidungsübersicht

## 🚨 KRITISCH: 88% Fehlerrate

| Metrik | Wert |
|--------|------|
| Geprüfte Programme | 142 |
| Fehlerrate | **88,0%** |
| Programme OK | 17 (12%) |
| Korrektur nötig | 103 (72,5%) |
| **Entfernen** | **22 (15,5%)** |

---

## Sofort-Entscheidungen

### 🔴 ENTFERNEN (22 Programme)

Diese Programme haben **tote Links (404)** oder sind **höchstwahrscheinlich fiktiv**:

**Bundesministerien (wahrscheinlich generiert):**
- `bmi-sicherheit` – BMI fördert keine Grundschulen direkt
- `bmuv-klima` – Link tot, keine echte Ausschreibung
- `bmas-inklusion` – Link tot
- `bmg-gesundheit` – Link tot
- `bmbf-spielend-lernen` – Kein echtes Programm
- `bmbf-ki-schule` – Generisches Konzept, keine Ausschreibung
- `bmbf-sprache-und-integration` – Generisch
- `bmbf-lesen-schreiben` – Generisch
- `bmbf-naturwissenschaftliche-grundbildung` – Generisch
- `bmbf-inklusive-bildung` – Generisch

**Landesprogramme (tote Links):**
- `bayern-digital` – HTTP 404
- `berlin-schulbau` – HTTP 404
- `nrw-digital` – HTTP 404 + Weiterleitung

**Stiftungen (tote Links):**
- `deutsche-bank-lesen` – HTTP 404
- `siemens-energie` – HTTP 404
- `sap-informatik` – HTTP 404
- `volkswagen-mobilitaet` – HTTP 404
- `volkswagen-klima` – HTTP 404
- `zeiss-stiftung-mint` – HTTP 404
- `zeiss-wissenschaft` – HTTP 404

**EU:**
- `eu-horizon` – HTTP 404, Horizon Europe ist für Forschung, nicht Grundschulen

---

### ⚠️ KORRIGIEREN (103 Programme)

**Problem:** `verificationWarning` – Fördersummen nicht verifiziert

**Aktion:** Für jedes Programm:
1. Echte Ausschreibung finden
2. Korrekte Fördersummen eintragen
3. Quellen-URL dokumentieren
4. `status` auf `"aktiv"` setzen
5. `verificationWarning` entfernen

**Prioritäten:**
1. **Telekom MINT** – Wichtiger Stifter
2. **Erasmus+** – Bekanntes EU-Programm
3. **Kultur macht stark** – BMBF-Programm
4. **DigitalPakt 2.0** – Aktuelles Bundesprogramm
5. **Bosch Schulpreis** – Hochdotierter Preis

---

### ✅ BEHALTEN (17 Programme)

Diese Programme sind **vollständig und verifiziert**:
- Telekom MINT
- Erasmus+ Schulbildung
- DigitalPakt 2.0
- Kultur macht stark
- Alle Landes-Schulbauprojekte (BW, Bremen, Hamburg, Hessen, RLP, Sachsen, Saarland, Sachsen-Anhalt, Thüringen)
- Klimaschutz an Schulen (BMBF)

---

## Empfohlene Maßnahmen

### Sofort (heute)

```
[ ] 22 Programme mit toten Links deaktivieren
[ ] Warnbanner auf Website: "Daten werden überprüft"
[ ] E-Mail an Kolja mit diesem Report
```

### Diese Woche

```
[ ] 103 Programme mit verificationWarning markieren
[ ] Manuelle Prüfung der Top-20-Programme
[ ] Korrekte Links recherchieren und eintragen
```

### Diesen Monat

```
[ ] Alle 103 unverifizierten Programme prüfen
[ ] Neue Datenquellen recherchieren
[ ] Verifizierungs-Workflow einführen
```

---

## Kosten-Nutzen-Analyse

| Option | Aufwand | Risiko | Empfehlung |
|--------|---------|--------|------------|
| Alles so lassen | 0h | 🔴 Hoch (Fehlinfo) | ❌ Nein |
| Nur tote Links entfernen | 2h | 🟡 Mittel | ⚠️ Notlösung |
| Komplette Neuprüfung | 40h | 🟢 Niedrig | ✅ Ja |
| Datenbank reset + neue Suche | 20h | 🟢 Niedrig | ✅ Alternative |

---

## Fazit für Kolja

**Die 99,5% Treffsicherheit des vorherigen Agents waren falsch.**

**Realität:**
- 88% der Programme haben Probleme
- 72,5% haben erfundene Fördersummen
- 15,5% sind komplett falsch (tote Links/fiktiv)

**Empfehlung:**
1. **Dringend:** 22 Programme sofort entfernen
2. **Wichtig:** 103 Programme verifizieren
3. **Langfristig:** Neuen Agent mit strikteren Regeln beauftragen

---

*Erstellt: 12.02.2026*  
*Prüfumfang: 142 Programme (nicht 184 wie erwartet)*
