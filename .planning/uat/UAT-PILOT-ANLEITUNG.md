<!-- KOLJA: Vor dem Versand zwei Platzhalter ersetzen:
     1. {STAGING-URL}  -> echte URL nach dem Staging-Deploy (vermutlich https://staging.edufunds.org)
     2. {ANTWORT-MAIL} -> die Mail-Adresse, an die Piloten die Rueckmeldung schicken sollen
     Diese Anleitung gibst du dem Piloten zusammen mit UAT-PILOT-RUECKMELDUNG-TEMPLATE.md mit. -->

# EduFunds testen — deine Anleitung

Danke, dass du dir Zeit nimmst! Diese Anleitung führt dich Schritt für Schritt durch einen Test-Lauf. Du machst das **allein und wann es dir passt** — du brauchst dafür keinen Termin mit mir.

**Zeitaufwand:** ca. 30–45 Minuten für den Test + ca. 10 Minuten für die Rückmeldung.

---

## Worum geht es?

EduFunds ist eine neue Plattform, die mit KI **Förderanträge für Schulen** schreibt — den kompletten Antragstext plus Finanzplan, passend zum jeweiligen Förderprogramm. Du testest den sogenannten Wizard von Anfang bis Ende.

**Worum es NICHT geht:** einen perfekten Antrag zu produzieren. Es geht darum, dass wir sehen, **wo es rund läuft und wo es hakt**. Jede Stelle, an der du stockst, dich wunderst oder etwas nicht verstehst, ist für uns Gold wert.

---

## Wichtig vorab: bitte erfundene Daten verwenden

Bitte benutze beim Test **nur fiktive Schul-Daten** — also einen ausgedachten Schulnamen, eine erfundene Schülerzahl und einen erfundenen Ort.

> Beispiel: *„Muster-Grundschule Beispielhausen, 320 Schüler, Musterstadt"*

Grund: Die Testdaten landen in unserer Entwicklungs-Datenbank. Mit erfundenen Daten entsteht gar kein Datenschutz-Thema — für dich und für deine Schule. Echte Daten bitte **nicht** eingeben.

---

## Was du brauchst

- einen Computer oder Laptop (Handy/Tablet geht zur Not auch, ist aber unbequemer)
- einen aktuellen Browser (Chrome, Firefox, Edge oder Safari)
- ~30–45 Minuten am Stück, möglichst ungestört
- optional: ein erfundenes Schul-Anliegen, das du fördern lassen würdest (z. B. „Tablets für den Matheunterricht", „Schulgarten anlegen", „Demokratie-Projektwoche"). Du kannst dir das auch unterwegs ausdenken.

---

## So testest du — Schritt für Schritt

**Starte hier:** {STAGING-URL}/antrag/start

### Schritt 1 — Anliegen schildern
Beschreib in eigenen Worten, was deine (fiktive) Schule fördern lassen möchte. Schreib so, wie du es einem Kollegen erzählen würdest. Das Feld verlangt mindestens ein paar Sätze.
→ *Achte darauf: Ist dir klar, wie viel du schreiben sollst?*

### Schritt 2 — Förderprogramm auswählen
EduFunds zeigt dir jetzt passende Förderprogramme. Zu jedem Treffer gibt es eine kurze Begründung — **„passt, weil …"** und **„Achtung bei …"**. Schau dir die an und wähle ein Programm aus.
→ *Eventuell kommt zuerst eine Rückfrage, falls dein Anliegen zu unklar war — beantworte sie einfach.*

### Schritt 3 — Fragen des Wizards beantworten
Der Wizard stellt dir nacheinander rund sechs Fragen zu deinem Vorhaben. Beantworte sie — erfundene Zahlen und Angaben sind völlig in Ordnung.

### Schritt 4 — Antrag wird erstellt
Jetzt erzeugt die KI deinen Antrag. Es erscheint eine **Fortschrittsanzeige** mit mehreren Schritten. Das dauert etwa 1–2 Minuten.
→ *Bitte die Seite während des Ladens nicht schließen.*

### Schritt 5 — Antrag lesen
Lies den fertigen Antrag durch. Probiere dabei:
- die **Navigation an der Seite** (springt zu einzelnen Abschnitten)
- den **Bearbeiten-Button** (kannst du Texte anpassen?)

### Schritt 6 — Bezahl-Schritt
Am Ende erscheint ein Schritt mit **29 €**. **Im Test ist das simuliert — du zahlst nichts und gibst keine echten Zahlungsdaten ein.** Klick einfach durch, als würdest du bezahlen.

---

## Wenn etwas kaputtgeht

Fehlermeldung, weiße Seite, oder es hängt länger als ~1 Minute ohne dass sich etwas tut?
→ Notier dir **kurz, was passiert ist** (ein Screenshot hilft sehr), und versuche dann weiterzumachen oder neu zu starten. Genau solche Stellen wollen wir finden — das ist kein Fehler von dir.

**Spezieller Tipp für Schritt 4 (Antrag wird erstellt):** Falls die Fehlermeldung *„Etwas ist schiefgelaufen"* erscheint, obwohl die Fortschrittsanzeige eigentlich noch lief:
- Lade die Seite einmal neu (Strg+R / Cmd+R).
- Sehr wahrscheinlich ist dein Antrag im Hintergrund trotzdem fertig geworden und du landest direkt auf der Antrag-Lesen-Seite.
- Falls nicht: das ist genau eine der Stellen, die wir verbessern wollen — bitte in die Rückmeldung schreiben.

---

## Danach: kurze Rückmeldung geben

Fülle das beiliegende Dokument **„UAT-PILOT-RUECKMELDUNG"** aus (dauert ~10 Min, Stichworte reichen) und schick es an: **{ANTWORT-MAIL}**

**Ein Punkt ist besonders wichtig:** Sobald dein Antrag fertig ist, **kopiere die Adresse aus der Browser-Zeile** (oben im Browser) und füge sie in die Rückmeldung ein. Darüber können wir deinen Antrag später nachvollziehen.

Ehrliches Feedback hilft am meisten — auch „das war nervig" oder „das habe ich nicht kapiert". Es gibt kein falsches Feedback.

**Vielen Dank!**
