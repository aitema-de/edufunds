# Verifizierungsbericht Iteration 11

**Datum:** 12. Februar 2026  
**Zeitaufwand:** ~45 Minuten  
**Ziel:** 12 Programme verifizieren (52,5% → 100% Gesamtfortschritt)

---

## Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| Verifiziert | 10 |
| Review Needed | 2 |
| **Gesamt** | **12** |

---

## Verifizierte Programme (10)

### 1. bmbf-digitalpakt-2 ✅
- **Fördersumme:** 5 Mrd. € (2,5 Mrd. Bund + 2,5 Mrd. Länder)
- **Quelle:** https://www.bmbfsfj.bund.de/bmbfsfj/themen/bildung/schule/digitalisierung-der-bildung-274788
- **Status:** Gesamtvolumen bestätigt, Laufzeit 2026-2030, rückwirkend ab 01.01.2025

### 2. telekom-stiftung-jia ⚠️ (KORRIGIERT)
- **Fördersumme:** Bis 10.000€
- **Quelle:** https://www.telekom-stiftung.de/aktivitaeten/junior-ingenieur-akademie
- **Status:** WICHTIGE KORREKTUR - JIA ist **NICHT für Grundschulen**! Nur gymnasiale Mittelstufe (Klassen 8-10)
- **Schulformen korrigiert:** gymnasium, gesamtschule

### 3. bosch-schulpreis ✅
- **Fördersumme:** 100.000€ (Hauptpreis), 5×30.000€, Themenpreis 30.000€, Anerkennung 5.000€
- **Quelle:** https://www.bosch-stiftung.de/de/projekt/deutscher-schulpreis
- **Status:** Gewinner 2025 (Maria-Leo-Grundschule Berlin) bestätigt

### 4. ferry-porsche-challenge ✅
- **Fördersumme:** 2025: 1 Mio. € Gesamt (1. Platz: 75.000€), 2026: 500.000€ Gesamt (1. Platz: 50.000€)
- **Quelle:** https://ferry-porsche-stiftung.de/news/ferry-porsche-challenge-2025-1-million-euro-fur-chancengerechtes-aufwachsen
- **Status:** Nur für BW & Sachsen (2026), Motto: "Gemeinsam älter – gemeinsam stärker"

### 5. berlin-startchancen ✅
- **Fördersumme:** 460 Mio. € über 10 Jahre (ca. 255.000€/Schule/Jahr theoretisch, bisher <5.000€/Schule)
- **Quelle:** https://www.berlin.de/sen/bildung/unterstuetzung/startchancen-programm/
- **Status:** Aktuell 59 teilnehmende Schulen, Ausbau auf 180 geplant (fast 100 Grundschulen)

### 6. hessen-mint-freundlich ✅
- **Fördersumme:** Keine (reine Auszeichnung)
- **Quelle:** https://mintzukunftschaffen.de
- **Status:** 10 von 14 Kriterien nötig, Gültigkeit 3 Jahre, 55 Schulen 2024 ausgezeichnet

### 7. sh-ganztag-196mio ✅
- **Fördersumme:** 196 Mio. € Gesamt (85% Zuschuss für Investitionen)
- **Quelle:** https://www.ib-sh.de/produkt/investitionsprogramm-ganztagsausbau-ggsk-ii/
- **Status:** Rechtsanspruch Ganztag ab 2026/27 (Klasse 1), Betriebskosten: 700€-1.400€/Platz/Jahr

### 8. erasmus-schulentwicklung ✅
- **Fördersumme:** 400.000€ pauschal (36 Monate)
- **Quelle:** https://erasmusplus.schule/foerderung/europaeische-partnerschaft-fuer-die-schulentwicklung
- **Status:** Für Koordinierungsschulen (Schulbehörden), nicht direkt für Einzelschulen

### 9. aktion-mensch ✅ (NEU HINZUGEFÜGT)
- **Fördersumme:** Bis 350.000€ (mind. 10% Eigenanteil)
- **Quelle:** https://www.aktion-mensch.de/inklusion/bildung/foerderung/schul-kooperationen
- **Status:** Laufzeit bis zu 5 Jahre, Fokus auf Inklusion und benachteiligte Gruppen

### 10. playmobil-hobpreis ✅
- **Fördersumme:** 250.000€ Gesamt (2×25.000€ + 20×10.000€)
- **Quelle:** https://www.kinderstiftung-playmobil.de/hob-preis
- **Status:** Thema 2025/26: "Bildungsgerechtigkeit schaffen", für Klassen 1-4

---

## Review Needed (2)

### 11. klaus-tschira-mint ⚠️
- **Fördersumme:** 50.000-400.000€ (korrigiert von 25.000€)
- **Quelle:** https://klaus-tschira-stiftung.de/foerderungen/
- **Problem:** 2026 KEINE Ausschreibung in der MINT-Bildungslinie
- **Status:** Alternative "Komm MINT aufs Land" bis 13.04.2026 (350.000€)

### 12. volkswagen-belegschaftsstiftung ⚠️
- **Fördersumme:** Nicht verifiziert (keine 545.000€ gefunden)
- **Quelle:** https://www.volkswagen-belegschaftsstiftung.de/projekte
- **Problem:** Keine festen Fördersummen, keine direkte Antragsmöglichkeit für Einzelschulen
- **Projektbeispiele:** Höhrclubs (118.200€), Mentoring (61 Schulen), Stipendien

---

## Wichtige Erkenntnisse

1. **telekom-stiftung-jia:** Grundlegende Fehlerkorrektur - JIA ist NICHT für Grundschulen geeignet
2. **volkswagen-belegschaftsstiftung:** Fördersumme von 545.000€ nicht nachweisbar
3. **klaus-tschira-mint:** Fördersumme korrigiert (50.000-400.000€), aber 2026 keine Ausschreibung
4. **berlin-startchancen:** Tatsächliche Auszahlungen deutlich niedriger als theoretisches Maximum

---

## JSON-Validierung

```bash
python3 -c "import json; json.load(open('data/foerderprogramme.json'))"
```
✅ Datei ist valides JSON

---

## Nächste Schritte

- Iteration 12: Weitere 12 Programme verifizieren
- Fokus auf Landesprogramme und Stiftungen
- Besondere Aufmerksamkeit bei "review_needed" Einträgen
