# UAT-Session-Plan: {Schul-Name / Pilot-Code}

**Datum:** {YYYY-MM-DD HH:MM}
**Pilotperson:** {Vorname Nachname, Funktion}
**Schule:** {Name, Bundesland, Schultyp, Schülerzahl}
**Ziel-Programm:** {z. B. DigitalPakt 2.0 / "Demokratisch Handeln" — frei aus Katalog}
**Dauer:** 45 Min Screen-Sharing

---

## Vor der Session

- [ ] Pilotperson hat Mail-Vorlage (UAT-ANSCHREIBEN.md) erhalten
- [ ] Datenschutz-Hinweis-Block bestätigt (Aufzeichnung ja/nein)
- [ ] Test-DB-Stand notiert (`SELECT MAX(updated_at) FROM ki_antraege`)
- [ ] Browser-Setup geklärt (welcher Browser, welches OS)
- [ ] Dev-Mock aktiv (`NEXT_PUBLIC_PAYWALL_DEV_MOCK=1` in `.env.local`)
- [ ] Lokale Dev-Umgebung läuft (`npm run dev` auf Port 3101)

---

## Begrüßungs-Skript (5 Min)

"Vielen Dank, dass du dir Zeit nimmst. Ich begleite dich heute durch EduFunds — eine Plattform, die KI nutzt, um Schul-Förderanträge zu schreiben. Du bist eine von ~5 Pilotpersonen. Wir wollen herausfinden, wo der Wizard gut funktioniert und wo er hängt. Das Ziel ist NICHT, einen perfekten Antrag zu schreiben — sondern dass ich dir zugucke, wie du dich durchklickst, und dann besser machen kann.

Ich werde während der Session schweigen, außer du blockst komplett. Sag bei jedem Schritt laut, was du denkst — auch wenn es banal klingt. Das ist die wertvollste Information, die ich kriegen kann."

**Vor Aufzeichnung vorlesen:** → Datenschutz-Hinweis-Block (siehe unten)

---

## Critical-Paths-Beobachtungsliste

- [ ] **Anliegen schildern** (`/antrag/start`) — wie lange braucht die Pilotperson für die Eingabe? Versteht sie den "Mindestens 20 Zeichen"-Hinweis?
- [ ] **Match-Auswahl** — wie viele Treffer erscheinen? Schaut sie sich `passt-weil` und `achtung-bei` an? Erscheint eine Klärungsfrage?
- [ ] **Wizard-Fragen 1–6** — versteht sie die Fragen? Beantwortet sie knapp oder ausführlich?
- [ ] **Generating-Stage** — versteht sie die Stage-Liste? Verlässt sie die Seite während des Ladens?
- [ ] **Antrag-Lesemodus** — scrollt sie? Nutzt sie die Sektions-Navigation? Versteht sie den Edit-Button?
- [ ] **Paywall** — wie reagiert sie auf den 29-€-Block? (Im UAT: Dev-Mock aktiv, Bezahlung simuliert)

**Beobachtungs-Notizen (live mitschreiben):**

| Schritt | Beobachtung | Zeitstempel |
|---------|-------------|-------------|
| Anliegen | | |
| Match | | |
| Wizard | | |
| Generating | | |
| Antrag lesen | | |
| Paywall | | |

---

## Erfolgs-Kriterien (Session-Level)

- [ ] Pilotperson hat ohne Hilfe vom Anliegen bis zum gerenderten Antrag durchgeklickt (Critical-Path-Coverage)
- [ ] Mindestens ein "ach so"-Moment dokumentiert (Lerneffekt sichtbar)
- [ ] Kein Crash, keine 500er, kein UI-Hänger länger als 10 s
- [ ] Befunde-Template ausgefüllt (UAT-BEFUNDE-TEMPLATE.md kopiert und befüllt)

---

## Abbruch-Kriterien (Session-Level)

- [ ] Pipeline crasht (5xx) — Session beenden, Bug aufnehmen, neue Session terminieren
- [ ] Pilotperson ist überfordert und stagniert > 3 Min ohne Klärung — Hinweis geben, danach weitermachen, Bug aufnehmen
- [ ] Stripe-Mock-Bezahlung scheitert — Session beenden, technisch klären

---

## Datenschutz-Hinweis-Block (zum Vorlesen vor Aufzeichnung)

"Ich nehme das Screen-Sharing auf, um es später zu reviewen. Die Aufzeichnung bleibt bei mir, wird nicht öffentlich. Wenn du echte Schul-Daten eingibst (Name, Schülerzahl, etc.) — die landen in unserer Dev-Datenbank, die nicht öffentlich ist. Wenn du das nicht willst, sag Bescheid, dann nutzen wir nur erfundene Daten."

**Bestätigung der Pilotperson:** [ ] Aufzeichnung OK  [ ] Nur fiktive Daten

---

## Nach der Session — Sofortmaßnahmen

- [ ] Aufzeichnung sichern: `~/edufunds-uat/{datum}-{pilot}.mp4`
- [ ] DB-Snapshot: `SELECT * FROM ki_antraege WHERE updated_at > '{session-start}'` als JSON sichern
- [ ] Befunde in `UAT-BEFUNDE-{datum}-{pilot}.md` erfassen (Template kopieren aus `UAT-BEFUNDE-TEMPLATE.md`)
- [ ] Danke-Nachricht an Pilotperson senden
- [ ] Pilot-Status in `PILOTEN.md` auf "Session-durch" setzen
