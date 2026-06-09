<!-- 2026-05-28: Tester-Anleitung (Demo-Phase, persönliche Bekannte).
     Geht zusammen mit TESTER-RUECKMELDUNG-TEMPLATE.md an den Tester, nachdem zugesagt wurde. -->

# EduFunds testen — deine Anleitung

Schön, dass du dabei bist! Diese Anleitung führt dich Schritt für Schritt durch einen Test-Lauf. Du machst das **allein und wann es dir passt** — kein Termin mit mir, kein Bildschirm-Teilen.

**Zeitaufwand:** ca. 30–45 Minuten Test + ca. 10–15 Minuten für die Rückmeldung.

---

## Bevor du loslegst — bitte einmal lesen

### Worum es geht

EduFunds ist eine neue Plattform, die mit KI **Förderanträge für Schulen** schreibt — den kompletten Antragstext plus Finanzplan, passend zum jeweiligen Förderprogramm. Du gehst den sogenannten Wizard einmal von Anfang bis Ende durch.

### Stand: wir sind in der Demo-Phase

Wichtig zu wissen, damit du nicht erschrickst:

- Die Plattform ist **funktionsfähig**, aber **noch nicht fertig**.
- **Bugs werden auftreten.** Das ist normal — und genau das, was wir mit deinem Test finden wollen. Wenn etwas hakt: Du hast nichts falsch gemacht.
- Manche Texte oder Buttons sind noch nicht final geschliffen. Auch das wollen wir lernen.

**Worum es NICHT geht:** einen perfekten Antrag zu produzieren. Es geht darum, dass wir mit deiner Hilfe **sehen, wo es rund läuft und wo es hakt**. Jede Stelle, an der du stockst, dich wunderst oder etwas nicht verstehst, ist Gold wert.

### Deine Rolle als Tester:in

Du bist nicht „Pilot" und nicht „Kundin". Du bist mein zweites Augenpaar aus der Schul-/Bildungspraxis. Deine Aufgaben in Kurzform:

1. **Einmal durchklicken** — ehrlich, in deinem Tempo.
2. **Bugs sofort melden** über den Feedback-Button (siehe weiter unten). Das ist der wichtigste Hebel.
3. **Allgemeine Einschätzung** über das beigefügte Rückmelde-Formular — Schwerpunkt: hilfreich? Flow? Qualität?

### Meine Erwartung an dich (und was ich nicht erwarte)

**Ja, gerne:**

- Ehrliche, ungeschönte Eindrücke — auch „das war nervig" / „das habe ich nicht verstanden" / „der Text wirkt holprig" / „das würde ich nie so unterschreiben".
- Stichworte. Du musst nichts ausformulieren.
- Bugs sofort über den Button melden, ohne zu zögern.
- Deine Sicht aus dem Schulalltag: würde so etwas tatsächlich helfen?

**Nein, brauche ich nicht:**

- Du musst nichts „testen wie ein Profi". Du klickst einfach durch.
- Du musst keine ganzen Sätze schreiben.
- Du musst nicht freundlich sein. Sei ehrlich. Das ist viel wertvoller.

---

## Wichtig vorab: bitte erfundene Daten verwenden

Bitte benutze beim Test **nur fiktive Schul-Daten** — also einen ausgedachten Schulnamen, eine erfundene Schülerzahl und einen erfundenen Ort.

> Beispiel: *„Muster-Grundschule Beispielhausen, 320 Schüler:innen, Musterstadt"*

Grund: Die Testdaten landen in unserer Entwicklungs-Datenbank. Mit erfundenen Daten entsteht gar kein Datenschutz-Thema — für dich und für deine Schule. Echte Daten bitte **nicht** eingeben.

---

## Was du brauchst

- einen Computer oder Laptop (Handy/Tablet geht zur Not auch, ist aber unbequemer)
- einen aktuellen Browser (Chrome, Firefox, Edge oder Safari)
- ~30–45 Minuten am Stück, möglichst ungestört
- optional: ein erfundenes Schul-Anliegen, das du fördern lassen würdest (z. B. „Tablets für den Matheunterricht", „Schulgarten anlegen", „Demokratie-Projektwoche", „Leseförderung für Klasse 1–2"). Du kannst dir das auch unterwegs ausdenken.

---

## So testest du — Schritt für Schritt

**Starte hier:** https://staging.edufunds.org/antrag/start

### Schritt 1 — Anliegen schildern
Beschreib in eigenen Worten, was deine (fiktive) Schule fördern lassen möchte. Schreib so, wie du es einer Kollegin erzählen würdest. Das Feld verlangt mindestens ein paar Sätze.
→ *Achte darauf: Ist dir klar, wie viel du schreiben sollst?*

### Schritt 2 — Förderprogramm auswählen
EduFunds zeigt dir jetzt passende Förderprogramme. Zu jedem Treffer gibt es eine kurze Begründung — **„passt, weil …"** und **„Achtung bei …"**. Schau dir die an und wähle eines aus.
→ *Eventuell kommt zuerst eine Rückfrage, falls dein Anliegen zu unklar war — beantworte sie einfach.*

### Schritt 3 — Fragen des Wizards beantworten
Der Wizard stellt dir nacheinander rund sechs Fragen zu deinem Vorhaben. Beantworte sie — erfundene Zahlen und Angaben sind völlig in Ordnung.

### Schritt 4 — Antrag wird erstellt
Jetzt erzeugt die KI deinen Antrag. Es erscheint eine **Fortschrittsanzeige** mit mehreren Schritten. Das dauert **ca. 1–2 Minuten, im Demo-Stand kann es auch mal länger werden** (bis zu ~8 Min im Ausnahmefall).
→ *Bitte die Seite während des Ladens nicht schließen — auch wenn es länger dauert.*

### Schritt 5 — Antrag lesen
Lies den fertigen Antrag durch. Probiere dabei:
- die **Navigation an der Seite** (springt zu einzelnen Abschnitten)
- den **Bearbeiten-Button** (kannst du Texte anpassen?)

### Schritt 6 — Bezahl-Schritt
Am Ende erscheint ein Schritt mit **29 €**. **Im Test ist das simuliert — du zahlst nichts und gibst keine echten Zahlungsdaten ein.** Klick einfach durch, als würdest du bezahlen.

---

## Wenn etwas kaputtgeht — das ist eingeplant

Fehlermeldung, weiße Seite, oder es hängt länger als ~1 Minute ohne dass sich etwas tut?
→ Notier dir **kurz, was passiert ist** (ein Screenshot hilft sehr), und versuche dann weiterzumachen oder neu zu starten. **Du hast nichts kaputt gemacht** — das sind genau die Stellen, die wir mit deinem Test finden wollen.

**Spezieller Tipp für Schritt 4 (Antrag wird erstellt):** Falls die Fehlermeldung *„Etwas ist schiefgelaufen"* erscheint, obwohl die Fortschrittsanzeige eigentlich noch lief:
- Lade die Seite einmal neu (Strg+R / Cmd+R).
- Sehr wahrscheinlich ist dein Antrag im Hintergrund trotzdem fertig geworden und du landest direkt auf der Antrag-Lesen-Seite.
- Falls nicht: das ist genau eine der Stellen, die wir verbessern wollen — bitte in die Rückmeldung schreiben.

---

## Der wichtigste Knopf der ganzen Demo: „Feedback"

Rechts unten auf jeder Seite findest du einen dunklen **„Feedback"-Button**. Klick draufzu, sobald dir etwas auffällt — egal ob Fehler, fehlende Funktion, irritierende Formulierung oder eine Frage. Es geht in 30 Sekunden:

1. Auswahl **Fehler** / **Idee** / **Frage**.
2. Kurz beschreiben, was los war — Stichworte reichen.
3. Optional: deine E-Mail, dann bekommst du eine Bestätigung mit Ticket-Nummer.
4. **Absenden** — der Bug landet sofort bei uns im System.

**Bitte lieber dreimal melden als gar nicht.** Auch Kleinigkeiten („dieser Satz klingt komisch", „warum heißt der Button so?") sind willkommen. Das ist parallel zur Rückmeldung am Ende sehr hilfreich, weil wir Bugs damit sofort einsortieren können — während die Rückmeldung am Ende den großen Eindruck zusammenfasst.

---

## Danach: die Rückmeldung

Fülle das beiliegende Dokument **„TESTER-RUECKMELDUNG"** aus (~10–15 Min, Stichworte reichen) und schick es an: **office@aitema.de**

Schwerpunkt der Rückmeldung sind drei Fragen:

- **Hilfreich?** Würde so etwas im Schul-/Bildungsalltag tatsächlich entlasten?
- **Flow?** Hat sich der Ablauf natürlich angefühlt oder war er holprig?
- **Qualität?** Würdest du den erzeugten Antrag tatsächlich abschicken — oder müsstest du ihn massiv umschreiben?

Außerdem ein wichtiger praktischer Punkt: Sobald dein Antrag fertig ist, **kopiere die Adresse aus der Browser-Zeile** (oben im Browser) und füge sie in die Rückmeldung ein. Darüber können wir deinen Antrag später nachvollziehen und im Detail anschauen.

Ehrliches Feedback hilft am meisten — auch „das war nervig" oder „das habe ich nicht kapiert". **Es gibt kein falsches Feedback.**

**Vielen Dank, dass du dir die Zeit nimmst!**
