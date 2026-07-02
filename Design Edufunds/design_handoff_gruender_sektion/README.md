# Handoff: EduFunds Gründer-Sektion + Kontaktkarte

## Overview
Zwei neue Vertrauens-Elemente für die EduFunds-Landingpage (pilot.edufunds.org), die der Plattform ein Gesicht geben:

- **A — Gründer-Sektion**: Vollbreite Sektion für die Startseite (empfohlene Position: zwischen Programm-Übersicht und Preisen). Zwei Gründer-Karten mit Porträtfoto, Name, Rolle, Kurzbio, plus gemeinsames Zitat.
- **B — Kontaktkarte**: Kompakte Karte mit Gründer-Avatar und direktem E-Mail-CTA, platziert am Entscheidungspunkt (neben dem Preismodul und/oder im Footer-Bereich).

## About the Design Files
Die Datei `EduFunds Gründer-Sektion Entwurf.dc.html` in diesem Paket ist eine **HTML-Design-Referenz** (Prototyp), kein Produktionscode. Aufgabe ist es, dieses Design **1:1 in der bestehenden Codebase von pilot.edufunds.org nachzubauen** — mit dem dort etablierten Framework, den vorhandenen Komponenten-Patterns und dem bestehenden Design-System. Existiert für die Sektion noch kein passendes Pattern, die Werte aus diesem Dokument verwenden.

Der Prototyp nutzt eine `<image-slot>`-Webkomponente (`image-slot.js`) als Drag-&-Drop-Foto-Platzhalter — **das ist reines Prototyp-Tooling**. In Produktion sind das gewöhnliche `<img>`-Elemente mit den echten Gründerfotos.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände und Radien sind final und pixelgenau umzusetzen. Alle Texte in `[eckigen Klammern]` sind Platzhalter und werden vom Auftraggeber durch echte Namen/Bios ersetzt.

## Screens / Views

### A — Gründer-Sektion (Startseite)

**Sektion-Container**
- Hintergrund: `#FBF9F3` (Creme, wie übrige Seitensektionen)
- Padding: `88px 96px` (Desktop)
- Inhalt zentriert, Content-Maxbreiten siehe unten

**Kopfbereich** (zentriert, `margin-bottom: 56px`)
1. Eyebrow-Pill: Text „Wer dahinter steht", 12px, `letter-spacing: 0.16em`, uppercase, Gewicht 700, Farbe `#A8842C` auf `#F3EDDD`, `border-radius: 999px`, Padding `7px 16px`, `margin-bottom: 20px`
2. H2: „Wir sind zwei Gründer — und wir kennen den Antragsfrust aus eigener Erfahrung.", Serif (Source Serif 4), 44px, Gewicht 600, `line-height: 1.15`, Farbe `#1E3A2F`, `max-width: 760px`, `text-wrap: balance`
3. Subline: 17px Sans, `line-height: 1.6`, Farbe `#55625C`, `max-width: 620px`. Text: „EduFunds ist kein anonymes Portal. Hinter jeder Antwort, jedem geprüften Programm und jedem Antrag stehen wir persönlich."

**Gründer-Karten** — Grid `1fr 1fr`, `gap: 32px`, `max-width: 920px`, zentriert
Pro Karte:
- Container: Hintergrund `#FFFFFF`, Border `1px solid #E4E0D4`, `border-radius: 16px`, Padding `24px`, Flex-Column mit `gap: 18px`
- Porträtfoto: volle Kartenbreite × `340px` Höhe, `border-radius: 12px`, `object-fit: cover`. **Echtes Porträt, natürliches Licht — keine Stockfotos.**
- Namenszeile: Flex-Row, `justify-content: space-between`, `align-items: baseline`, `gap: 12px`
  - Name (h3): Serif 24px, Gewicht 600, `#1E3A2F`
  - Handschrift-Signatur (Vorname): Font „Caveat" 600, 26px, Farbe `#A8842C` — optionales Schmuckelement; kann bei Font-Bedenken entfallen
- Rollenzeile: 12px, uppercase, `letter-spacing: 0.12em`, Gewicht 700, `#A8842C`, Margin `4px 0 12px`. Muster: „Mitgründer · [Rolle]"
- Bio: 15px, `line-height: 1.6`, `#44514B`, `text-wrap: pretty`. 2–3 Sätze in Ich-Form (Platzhaltertext in der Referenz beschreibt Tonalität)

**Zitat-Block** (unter den Karten): `max-width: 720px`, zentriert, `margin-top: 48px`, `border-top: 1px solid #E4E0D4`, `padding-top: 32px`
- Zitat: Serif kursiv, 20px, `line-height: 1.5`, `#1E3A2F`, `text-wrap: balance`. Text: „Kein Schulprojekt sollte an einem Formular scheitern. Dafür stehen wir — mit Namen und Gesicht."
- Attribution: 13px, `#7A8580`: „[Vorname] & [Vorname], Gründer von EduFunds"

### B — Kontaktkarte (Entscheidungspunkt)

- Container: `#FFFFFF`, Border `1px solid #E4E0D4`, `border-radius: 16px`, Padding `24px 28px`, `max-width: 620px`, Flex-Row, `align-items: center`, `gap: 20px`
- Avatar: exakt `84×84px`, Kreis (`border-radius: 50%`), `object-fit: cover`, `flex: 0 0 84px` (**darf nicht schrumpfen** — im Prototyp war das ein Bug)
- Textblock (Grid, `gap: 4px`):
  - Titel: Serif 19px, Gewicht 600, `#1E3A2F`: „Fragen zu Preisen oder Ihrem Antrag?"
  - Copy: 14.5px, `line-height: 1.55`, `#55625C`: „Schreiben Sie mir direkt — ich antworte persönlich, meist noch am selben Tag."
  - Attribution: 13px, `#7A8580`: „[Vorname], Mitgründer"
- CTA-Button: `<a href="mailto:kontakt@edufunds.org">`, Hintergrund `#1E3A2F`, Text `#FBF9F3`, 14.5px Gewicht 600, `border-radius: 999px`, Padding `12px 22px`, `flex-shrink: 0`. Label: „E-Mail schreiben". Hover: Hintergrund `#2C5243`

## Interactions & Behavior
- Kontaktkarte: `mailto:`-Link; Button-Hover hellt Hintergrund auf `#2C5243` (Transition ~150ms ease empfohlen)
- Keine weiteren Interaktionen, keine Animationen, kein State
- **Responsive** (im Prototyp nicht ausgeführt, so umsetzen):
  - < ~900px: Gründer-Karten untereinander (1 Spalte), Sektion-Padding auf ~`64px 24px`, H2 auf ~32px
  - < ~560px: Kontaktkarte bricht um: Avatar + Text oben, Button vollbreit darunter

## State Management
Keins — rein statische Inhalte. Fotos, Namen, Rollen und Bios können hartkodiert oder aus dem CMS kommen, je nach bestehender Architektur.

## Design Tokens
Farben (identisch mit bestehender EduFunds-Palette — vorhandene Tokens der Codebase bevorzugen, falls benannt):
- Primär-Grün (Text/Buttons): `#1E3A2F`
- Hover-Grün: `#2C5243`
- Gold (Akzent): `#A8842C`
- Gold-Tint (Pill-Hintergrund): `#F3EDDD`
- Sektion-Hintergrund: `#FBF9F3`
- Karten-Hintergrund: `#FFFFFF`
- Hairline/Border: `#E4E0D4`
- Fließtext: `#44514B`
- Sekundärtext: `#55625C`
- Tertiärtext: `#7A8580`

Typografie:
- Headlines/Zitat: **Source Serif 4** (600; Zitat 400 kursiv) — bzw. die auf der Live-Seite bereits eingesetzte Serif
- UI/Fließtext: **Public Sans** (400–700) — bzw. die bestehende Sans der Seite
- Signatur (optional): **Caveat** 600

Radien: 999px (Pill/Button), 16px (Karten), 12px (Fotos), 50% (Avatar)
Abstände: 88/96px Sektion-Padding, 56px Kopf→Karten, 48px Karten→Zitat, 32px Karten-Gap, 24px Karten-Padding, 18–20px Element-Gaps

## Assets
- 2 Gründer-Porträts (Hochformat, mind. ~800×700px für die 340px-Slots bei Retina) — **liefert der Auftraggeber**
- 1 Avatar-Foto (quadratisch, mind. 168×168px) — kann Ausschnitt eines Porträts sein
- Keine Icons, keine weiteren Grafiken

## Files
- `EduFunds Gründer-Sektion Entwurf.dc.html` — die Design-Referenz (im Browser zu öffnen; zeigt A und B untereinander mit Beschriftung)
- `image-slot.js` — nur Prototyp-Hilfskomponente für die Foto-Platzhalter, **nicht übernehmen**
