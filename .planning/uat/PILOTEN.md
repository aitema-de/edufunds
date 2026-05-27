# UAT-Piloten — Phase-6-Kandidaten

**Stand:** 2026-05-27 — Wizard ist deployed + verifiziert (Session `6dcdac50-…`), Pilot-Anleitung versandbereit, Anschreiben-Vorlagen vorhanden. **Offen:** Kolja trägt Namen aus seinem Netzwerk ein.

**Hinweis:** Alle Datenzellen sind leer. Kolja füllt aus seinem Netzwerk (Schulen, Schulfördervereines, persönliche Kontakte). Keine realen Personen durch Claude recherchiert.

---

## Pilot-Kandidaten (Kolja füllt aus)

| # | Name | Rolle | Schule | Bundesland | Schul-Typ | Kontakt | Warum geeignet | Du- oder Sie-Form | Status |
|---|------|-------|--------|------------|-----------|---------|----------------|-------------------|--------|
| 1 | | | | | | | | | nicht angeschrieben |
| 2 | | | | | | | | | nicht angeschrieben |
| 3 | | | | | | | | | nicht angeschrieben |
| 4 | | | | | | | | | nicht angeschrieben |
| 5 | | | | | | | | | nicht angeschrieben |

**Spalten-Erklärung:**
- **Rolle:** z. B. Schulleiterin, Schatzmeister Schulförderverein, Sekretariat, Lehrkraft
- **Schul-Typ:** z. B. Grundschule, Gesamtschule, Gymnasium, Berufsschule, Förderschule
- **Kontakt:** E-Mail oder Telefon (verschlüsselt falls nötig)
- **Warum geeignet:** z. B. „kennt DigitalPakt 2.0 schon, will neuen Antrag schreiben" oder „hat noch nie einen Antrag gestellt (UX-Stress-Test)"
- **Du- oder Sie-Form:** entscheidet, welche Anschreiben-Vorlage aus `UAT-ANSCHREIBEN.md` verwendet wird
- **Status:** nicht angeschrieben → angeschrieben → Erinnerung-3-Tage → zugesagt → Anleitung-verschickt → Session-durch → Rückmeldung-erhalten / abgesagt / Ghost

---

## Auswahl-Kriterien

- Mindestens 2 Schulträger-Typen (Schule UND Schulförderverein)
- Mindestens 2 Bundesländer (Föderalismus-Sicht — Förderrichtlinien unterscheiden sich je nach Land)
- Mindestens 1 Pilot mit konkretem Antrag-Wunsch (Programm bereits ausgewählt, z. B. DigitalPakt 2.0, Lesen-macht-stark / „Gemeinsam Digital", Demokratisch Handeln)
- Mindestens 1 Pilot ohne IT-Affinität (UX-Stress-Test — wo hakt der Wizard für technisch weniger versierte Nutzerinnen?)

---

## Workflow je Pilot — wenn Kolja jemanden angesprochen hat

### Schritt 1 — Anschreiben raus
Aus `UAT-ANSCHREIBEN.md` die passende Vorlage (Du- oder Sie-Form) kopieren, persönlich anpassen, abschicken. Status in der Tabelle auf **angeschrieben** setzen + Datum in eine eigene Notizenspalte.

### Schritt 2 — Zusage abwarten + ggf. erinnern
Nach 3 Tagen ohne Antwort: Follow-Up-Vorlage aus `UAT-ANSCHREIBEN.md` schicken. Falls nach weiteren 4–5 Tagen immer noch keine Antwort: Status **Ghost** setzen, nächsten Kandidaten anschreiben.

### Schritt 3 — Bei Zusage: Anleitung + Rückmelde-Template senden
Sobald Pilot zusagt, eine zweite Mail mit zwei Anlagen:
- `UAT-PILOT-ANLEITUNG.md` (URL + Schritte, **versandbereit**, keine Platzhalter mehr)
- `UAT-PILOT-RUECKMELDUNG-TEMPLATE.md` (Pilot füllt nach dem Test aus)

Status auf **Anleitung-verschickt** setzen.

### Schritt 4 — Pilot testet selbständig
Kein Termin nötig, kein Screen-Sharing. Pilot meldet sich nach Abschluss mit dem ausgefüllten Rückmelde-Template per Mail an `office@aitema.de`. Status: **Session-durch**.

### Schritt 5 — Rückmeldung verarbeiten
GSD verwandelt das laienfreundliche Pilot-Rückmelde-Template + den DB-Snapshot der Session (via Session-URL aus der Pilot-Rückmeldung) in `UAT-BEFUNDE-{PILOT-X}.md`. Befunde werden in der konsolidierten Bug-Fix-Welle (Plan 06-03) gebündelt adressiert.

### Schritt 6 — Pilot-Bonus einlösen
Sobald EduFunds live ist (Production-Migration nach `main`, Stripe-Account aktiv): Pilot bekommt einen kostenlosen Antrag als Dank — pro Pilot 1× kostenlose Antrag-Nutzung (29 €).

---

## Session-Tracking (wird gefüllt, sobald erste Pilot-Session läuft)

| # | Pilot | Session-Token | Programm | Test-Datum | Antrag-Volltext-Zeichen | Finanzplan-Summe | Findings (high/mittel/niedrig) | Rückmeldung-Datum | Befunde-Dok |
|---|-------|---------------|----------|------------|--------------------------|------------------|-------------------------------|-------------------|-------------|
| | | | | | | | | | |

Session-Token kann aus der Wizard-URL kopiert werden (siehe Pilot-Rückmelde-Template).

---

## Notizen / Lessons (gesammelt während Phase 6)

*Wird gefüllt sobald erste Befunde da sind.*
