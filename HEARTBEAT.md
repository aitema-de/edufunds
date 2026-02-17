# HEARTBEAT.md — Milo Autonomer Arbeitsrhythmus

## Bei jedem Heartbeat:

1. **Health-Check:** Smoke-Test ausfuehren: bash scripts/smoke-test.sh https://edufunds.org
2. **TODO.md lesen:** Lies /home/edufunds/edufunds-app/TODO.md — dort stehen deine aktuellen Arbeitsauftraege
3. **Arbeiten:** Das naechste offene TODO aus TODO.md umsetzen (50 Minuten arbeiten!)
4. **Committen:** Aenderungen committen und current_state.md aktualisieren
5. **Status:** Fortschritt via Telegram an Kolja melden (Chat-ID 498349591)

## ACHTUNG: HEARTBEAT_OK ist KEINE gueltige Antwort wenn TODO.md offene Aufgaben enthaelt!
Wenn TODO.md existiert und offene Aufgaben hat, musst du daran ARBEITEN, nicht nur Smoke-Test laufen lassen.

---

## AKTUELLE AUFGABEN (17.02.2026) — von Kolja

### PRIORITAET 1: Antrags-KI zum Laufen bringen
- API-Route ist auf force-dynamic gefixt (gut!)
- GEMINI_API_KEY ist im Staging-Container konfiguriert
- JETZT: End-to-End testen! Auf Staging (http://localhost:3005) den KI-Antragsassistenten aufrufen und pruefen ob er echte Antraege generiert statt Fallback-Templates
- Wenn Fallback: Debuggen warum der API-Key nicht ankommt
- Ziel: User gibt Schulprofil + Projektidee ein → KI generiert kompletten Foerderantrag

### PRIORITAET 2: Design aller Unterseiten angleichen
- Referenz: /home/edufunds/edufunds-app/dist/index.html (NICHT aendern!)
- Parchment #f8f5f0, Gold #c9a227, Navy #0a1628
- DM Serif Display + Plus Jakarta Sans
- Header und Footer hast du schon angepasst — jetzt die restlichen Seiten:
  impressum, datenschutz, agb, kontakt, ueber-uns, preise, foerderprogramme-Detailseiten, 404

### PRIORITAET 3: Programmzahl in Landing Page korrigieren
- index.html zeigt 50+ — du hast 129 Programme
- Aendere NUR die Zahl auf 120+ im Stats-Card und Nav-Badge
- SONST NICHTS an index.html aendern!

### PRIORITAET 4: Klaus Tschira Stiftung entfernen
- Kein spezifisches Foerderprogramm fuer Schulen, nur Redirect zur allgemeinen Seite
- Aus der Programmliste entfernen

---

## Regeln
- Staging first (http://localhost:3005), Production erst nach Smoke-Test
- index.html ist tabu (ausser Programmzahl)
- Keine Stereotype (Fachchinesisch → Behördendeutsch)
- Zahlen nie erfinden — nur echte Daten
