---
created: 2026-05-27
source: BEFUND-1 aus E2E-Verifikation Phase 6 (Session 6dcdac50-…)
priority: medium
estimated_minutes: 45
blocks: bessere Antrag-Qualitaet fuer Top-1-Pick "Lesen macht stark" / "Gemeinsam Digital! Kreativ mit Medien" (dbv-Linie in Kultur macht stark)
---

# TODO: Richtlinien-Dossier fuer `lesen-macht-stark` schreiben

## Was zu tun ist

`data/richtlinien/lesen-macht-stark.json` anlegen — das Dossier fuer die dbv-Linie
"Gemeinsam Digital! Kreativ mit Medien" innerhalb von "Kultur macht stark"
(BMBFSFJ). Aktueller Wizard-Run mit diesem Programm faellt auf "Keine Richtlinie
erfasst — generische Struktur" zurueck, weil die JSON-Datei fehlt.

## Loesungs-Pfade

**Pfad A (schnell, Kolja entscheidet):** `data/richtlinien/kultur-macht-stark.json`
klonen als `lesen-macht-stark.json` und an dbv-Spezifika anpassen:
- Foerdersumme: 2.000-50.000 EUR pro Antrag und Jahr (vs. variabel im Dach-Programm)
- Frist: 15.03.-15.04.2026 (Projekte 09/2026-06/2027)
- Pflicht-Buendnis: mind. 3 lokale Partner (Bibliothek + Bildung + Kultur/Soziales)
  — das ist die dbv-Konkretisierung der "Kultur macht stark"-Buendnislogik
- foerdergeber: "Deutscher Bibliotheksverband (dbv) — Programmpartner in Kultur macht stark (BMBFSFJ)"

Vorteil: Antragsstruktur-Pflichtabschnitte + Best-Practices + Reject-Gruende sind
inhaltlich auf das Dach-Programm zugeschnitten und gelten auch fuer dbv-Linie.
~30-45 Min Aufwand inkl. Validator-Lauf.

**Pfad B (sauber, frische Extraktion):** `scripts/extract-richtlinie.ts lesen-macht-stark`
mit den offiziellen dbv-URLs:
- https://www.lesen-und-digitale-medien.de/projektfoerderung/
- https://www.dbv.eu/foerderung/projektfoerderung
- https://www.kultur-macht-stark.de/programmpartner/dbv/

Vorteil: Saubere LLM-Extraktion, neues Dossier ohne Hand-Anpassung. Nachteil:
~10 Min DeepSeek-Cost (~5-10 Cent) + Substanz-Guard kann blocken, falls die
URLs zu wenig harte Informationen liefern.

## Verifikation nach dem Fix

1. `npx tsx --env-file=.env.local scripts/validate-richtlinien.ts` — strict-Modus, `lesen-macht-stark.json` muss 0 Issues haben.
2. Lokaler Wizard-Smoke: `npm run dev` → `localhost:3101/antrag/lesen-macht-stark/wizard?session=<token>` → Page-Banner darf NICHT mehr "Keine Richtlinie erfasst" zeigen.
3. Optional: voller Pipeline-Re-Run mit gleichen UAT-Antworten wie Session `6dcdac50-…`, Vergleich `finalText`-Qualitaet (programm-spezifische Pflichtabschnitte sollten jetzt anders strukturiert sein).

## Pilot-Relevanz

"Lesen macht stark" / "Gemeinsam Digital! Kreativ mit Medien" wird vom Matcher
als Top-1 fuer Anliegen wie "Lesepaten-Programm", "Sprachfoerderung Grundschule",
"Kinderbuecher" gerankt (Score 92 in der UAT-Verifikation). Wenn ein Pilot dieses
Programm waehlt, ist die Antrag-Qualitaet ohne Dossier merklich generischer.
**Empfehlung:** vor Pilot-Run-Start fixen, mind. Pfad A.
