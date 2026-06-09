# Verifizierungs-Report Iteration 8

**Datum:** 13. Februar 2026  
**Ziel:** 57/120 Programme verifiziert (47,5%)  
**Status:** 30/120 Programme verifiziert (25,0%) - Ziel noch nicht erreicht

---

## Zusammenfassung dieser Iteration

In Iteration 8 wurden **6 Programme** geprüft und aktualisiert:

| # | Programm | Status | Vorher → Nachher |
|---|----------|--------|------------------|
| 1 | **Ferry Porsche Challenge 2025** | ✅ VERIFIZIERT | Falscher Fördergeber (Porsche AG → Ferry-Porsche-Stiftung), Summen korrigiert (1.000-5.000€ → 2.500-75.000€), Gesamtpool: 1 Mio. € |
| 2 | **Heinrich-Böll-Stiftung Bildung** | 🔍 REVIEW_NEEDED | Keine direkte Förderung - nur Forschung/Politikberatung. Falscher Eintrag korrigiert. |
| 3 | **Niedersachsen Sportförderung** | ✅ VERIFIZIERT | Summen präzisiert (3.000-40.000€ → max. 400€/Jahr + Fördervereine 1.000€) |
| 4 | **Wissenschaft im Dialog** | 🔍 REVIEW_NEEDED | Keine Förderung möglich - nur kostenlose Teilnahme an Programmen |
| 5 | **Berdelle-Stiftung Naturwissenschaften** | ✅ VERIFIZIERT | Keine festen Fördersummen (diskretionär), projektbezogen |
| 6 | **Hessen MINT-freundliche Schule** | ✅ VERIFIZIERT | Keine Fördersumme - reine Auszeichnung/Titel |

---

## Detaillierte Verifizierungen

### 1. Ferry Porsche Challenge 2025 ✅

**Befund:** Programmeintrag war stark fehlerhaft

**Korrekturen:**
- Fördergeber: Porsche AG → **Ferry-Porsche-Stiftung**
- Fördersummen: 1.000-5.000€ → **Gesamt 1 Mio. € jährlich**
  - 1. Platz: 75.000€
  - 2. Platz: 50.000€  
  - 3. Platz: 25.000€
  - Finalist: 10.000€
  - Anschubpreis: 2.500€
- Bewerbungsfrist: Laufend → **Bewerbungsphase endete 11.04.2025** (jährlich)
- Antragstellung: **Durch Jugendliche (14-21 Jahre), nicht direkt durch Schulen**

**Quelle:** https://www.stiftungen.org/aktuelles/news-aus-stiftungen/detail/ferry-porsche-challenge-2025-1-million-euro-fuer-chancengerechtes-aufwachsen-14570.html

---

### 2. Heinrich-Böll-Stiftung 🔍

**Befund:** Programmeintrag war irreführend

**Erkenntnis:** Die Heinrich-Böll-Stiftung führt **keine direkte Projektförderung für Schulen** durch. Sie betreibt Forschung, politische Advocacy und gibt Rechtsgutachten in Auftrag.

**Status:** review_needed gesetzt, kiAntragGeeignet: false

**Quelle:** https://www.boell.de/de/themen/bildung

---

### 3. Niedersachsen Sportförderung ✅

**Befund:** Fördersummen waren stark überhöht

**Korrekturen:**
- Programmname ergänzt: "Sport Vernetzt"
- Fördersummen: 3.000-40.000€ → **5€ pro BE, max. 400€/Jahr**
- Fördervereine: max. **1.000€** (50% Eigenanteil)
- Leitervergütung: max. 20€/BE
- Voraussetzung: DOSB-Übungsleiter-Lizenz

**Quelle:** https://www.sportjugend-nds.de/schule-kita-verein/schule-sportverein

---

### 4. Wissenschaft im Dialog 🔍

**Befund:** Falsche Annahme über Förderfähigkeit

**Erkenntnis:** WiD bietet **keine finanzielle Förderung** für Schulen. Schulen können kostenlos an Programmen wie "I'm a Scientist" teilnehmen. Finanzierung erfolgt durch VW-Stiftung, BMBF, Klaus Tschira Stiftung.

**Status:** review_needed gesetzt, kiAntragGeeignet: false

**Quelle:** https://wissenschaft-im-dialog.de/projekte/

---

### 5. Berdelle-Stiftung ✅

**Befund:** Fördersummen waren spekulativ

**Korrekturen:**
- Keine festen Fördersummen - **projektbezogen und diskretionär**
- Fokus: Jugend forscht, Experimentierräume, Sachförderung
- Priorität für Rheinland-Pfalz
- Studentenstipendien als Referenz: bis 812€/Monat

**Quelle:** https://berdelle-stiftung.de/foerderung/

---

### 6. Hessen MINT-freundliche Schule ✅

**Befund:** Grundlegendes Missverständnis

**Erkenntnis:** "MINT-freundliche Schule" ist eine **reine Auszeichnung/Titel**, keine finanzielle Förderung!

**Details:**
- Auszeichnung durch Initiative "MINT Zukunft schaffen!"
- Schulen müssen 10 von 14 Kriterien erfüllen
- Gültigkeit: 3 Jahre
- 2025: 63 Schulen ausgezeichnet
- **KEINE Fördersumme verbunden**

**Quelle:** https://mintzukunftschaffen.de

---

## Gesamtstatistik

| Kategorie | Anzahl | Prozent |
|-----------|--------|---------|
| Gesamtprogramme | 120 | 100% |
| Verifiziert | 30 | 25,0% |
| Review needed | 11 | 9,2% |
| Mit Warnung (unverifiziert) | 54 | 45,0% |

---

## Empfehlungen für weitere Iterationen

### Priorität 1: Hohe Fördersummen (noch unverifiziert)
1. Z-LAB Bruchsal (75.000€) - Auerbach Stiftung
2. Sprungbrett Bildung Karlsruhe (75.000€) - Ferry-Porsche-Stiftung
3. PerspektivKita Schleswig-Holstein (20.000-50.000€) - Aber: nur für Kitas!
4. HECTOR Kinderakademien (10.000-50.000€) - Aber: keine Einzelanträge

### Priorität 2: Bund/Land-Programme
- BfN Projekte für Artenvielfalt (3.000-25.000€)
- BMBF-Programme
- Landesprogramme Digitalisierung

### Priorität 3: Fehlerhafte Einträge korrigieren
Weitere Programme mit vermutlich falschen Fördersummen identifizieren und prüfen.

---

## Änderungen in der JSON-Datei

Alle 6 Programme wurden aktualisiert mit:
- ✅ Korrekten Fördersummen
- ✅ Aktuellen Informationen zur Antragsmöglichkeit
- ✅ Verifizierungsdatum und -quelle
- ✅ Bemerkungen zu Einschränkungen

**Wichtige Erkenntnis:** Viele Einträge enthielten überhöhte oder falsche Fördersummen. Eine sorgfältige Recherche ist essentiell.
