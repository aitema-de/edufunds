# Handoff: EduFunds Landingpage-Weiterentwicklung (Hero + Gründer-Sektion + Kontaktkarte)

## Overview
Weiterentwicklung der Landingpage pilot.edufunds.org auf Basis einer Marketing-Analyse (liegt bei). Drei Bausteine:

1. **Hero-Redesign** — drei Varianten (1a/1b/1c); empfohlene Umsetzung: **Variante 1a als Hero + das Projektband aus 1b als direkt folgende Sektion**.
2. **Gründer-Sektion** — Vertrauens-Sektion für die Startseite (zwischen Programm-Übersicht und Preisen).
3. **Kontaktkarte** — kompakte Karte mit Gründer-Avatar am Entscheidungspunkt (neben Preisen / Footer-Bereich).

## About the Design Files
Die `.dc.html`-Dateien in diesem Paket sind **HTML-Design-Referenzen** (Prototypen), kein Produktionscode. Aufgabe: die Designs **1:1 in der bestehenden Codebase von pilot.edufunds.org nachbauen** — mit dem dort etablierten Framework und den vorhandenen Patterns. Die Referenzen im Browser öffnen; `EduFunds Hero Varianten.dc.html` zeigt alle drei Hero-Varianten untereinander mit Badges (1a/1b/1c).

**Prototyp-Tooling, nicht übernehmen:** `<image-slot>` (`image-slot.js`) ist ein Drag-&-Drop-Platzhalter; in Produktion gewöhnliche `<img>`. `support.js` ist Prototyp-Laufzeit. Die Nav in den Hero-Referenzen ist nur Kulisse — die bestehende Site-Nav weiterverwenden.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände, Radien sind final. Ausnahmen: (a) Texte in `[eckigen Klammern]` sind Platzhalter, (b) **alle Fotos sind Unsplash-Stand-ins** und werden vor Launch durch echte Fotos ersetzt (siehe Assets), (c) Responsive-Verhalten ist unten beschrieben, im Prototyp aber nicht ausgeführt.

---

## Screen 1: Hero (empfohlen: Variante 1a)

**Zweck:** Erster Blick — Problem-Claim, Produktbeweis (Antragskarte), Emotion (echtes Projektfoto), ein primärer CTA.

**Layout:** Sektion auf `#FBF9F3`, Grid `1fr 640px`, `gap: 64px`, `align-items: center`, Padding `72px 48px 80px 72px` (Desktop 1440).

**Linke Spalte:**
- Eyebrow: „Fördermittel für Schulen. Vereinfacht." — 12.5px, uppercase, `letter-spacing: 0.15em`, 700, `#A8842C`, `margin-bottom: 22px`
- H1: „Jedes Jahr bleiben **Millionen an Fördermitteln** ungenutzt." — Source Serif 4, 600, 62px, `line-height: 1.08`, `#1E3A2F`; Akzent-Span „Millionen an Fördermitteln" in `#A8842C`. **Wichtig: aufrecht, NICHT kursiv, KEINE Unterstreichung** (bewusste Abkehr vom aktuellen Live-Hero).
- Subline: 18px, `line-height: 1.6`, `#44514B`, `max-width: 520px`: „180+ geprüfte Programme an einem Ort. Unser KI-Assistent erstellt unterschriftsreife Anträge in Minuten statt Wochen — DSGVO-konform, auf deutschen Servern, mit EU-KI."
- CTA-Zeile (Flex, `gap: 20px`): Primär-Button „Passende Programme finden →" (`#1E3A2F` auf `#FBF9F3`-Text, 16px 600, `border-radius: 999px`, Padding `16px 30px`); Sekundär-Textlink „KI-Assistent testen" (15px 600, `#1E3A2F`, underline, `text-underline-offset: 4px`)
- Microcopy darunter: „Kostenlos · Ergebnis in 2 Minuten" — 13.5px, `#7A8580`

**Rechte Spalte** (position: relative):
- Projektfoto: `640×560px`, `border-radius: 20px`, `object-fit: cover`
- Schwebende Antragskarte: absolut, `left: -40px; bottom: 36px`, Breite `300px`, `#FFFFFF`, Border `1px solid #EDE9DE`, `border-radius: 14px`, Schatten `0 18px 40px rgba(30,58,47,0.18)`, Padding `20px 24px`. Inhalt: Label „ANTRAGSENTWURF" (10.5px caps, `#98A29C`), Titel „DigitalPakt Schule 2.0" (Serif 19px 600, `#1E3A2F`), zwei Zeilen mit Hairline-Trenner `#F0EDE4`: „Beantragte Summe / **278.500 €**" (Wert `#A8842C`) und „Status / **unterschriftsreif**".

## Screen 2: Projektband (aus Variante 1b, als Sektion unter dem Hero)

- Kicker zentriert: „Mit Fördermitteln möglich gemacht" — 12.5px caps, 700, `#A8842C`, `margin-bottom: 20px`
- Grid `1fr 1fr 1fr`, `gap: 24px`, Seitenpadding `72px`
- Pro Eintrag: Foto `100% × 240px`, `border-radius: 14px`, `object-fit: cover`; darunter zentrierte Caption 13.5px `#7A8580` im Muster „[Projekt · Schule · Bundesland — bewilligte Summe]"
- Band kann mit einem Eintrag starten und wachsen; bei <3 Einträgen Grid-Spaltenzahl anpassen

## Screens 3+4: Gründer-Sektion und Kontaktkarte

Vollständige Spezifikation siehe Abschnitt weiter unten („Gründer-Sektion + Kontaktkarte") — unverändert aus dem ersten Handoff übernommen, Referenzdatei `EduFunds Gründer-Sektion Entwurf.dc.html`.

## Alternative Hero-Varianten (dokumentiert, nicht empfohlen)
- **1b (Hybrid, zentriert):** H1 zentriert Serif 68px, `max-width: 980px`; Subline/CTAs wie 1a, zentriert; Projektband direkt im Hero. Voraussetzung: 3 echte Projekte mit Zahlen.
- **1c (Sans, dunkel):** Hintergrund `#1E3A2F`, Headline Bricolage Grotesque 600 60px `#FBF9F3` mit Akzent `#D4B160`; CTA gold gefüllt (`#D4B160` auf `#1E3A2F`); Outline-Chips (Border `rgba(251,249,243,0.25)`): „180+ Programme / 16 Bundesländer / DSGVO-konform"; Foto 560×520 r16 mit Status-Chip-Overlay. Nur relevant, falls bewusst Richtungswechsel weg von der Serifen-Identität gewünscht.

## Interactions & Behavior
- Primär-CTA → Förderfinder; Sekundär-Link → KI-Assistent; Kontaktkarten-Button → `mailto:kontakt@edufunds.org`
- Hover: Buttons leicht aufhellen (Grün → `#2C5243`), Transition ~150ms ease; keine weiteren Animationen
- **Responsive:**
  - < ~1100px: Hero einspaltig, Foto unter dem Text (Breite 100%, Höhe ~420px), Antragskarte `left: 16px`
  - < ~900px: Projektband und Gründer-Karten einspaltig; H1 ~40px; Sektion-Padding ~`56px 24px`
  - < ~560px: Kontaktkarte bricht um (Avatar+Text oben, Button vollbreit)

## State Management
Keins — statische Inhalte. Projektband-Einträge idealerweise CMS-pflegbar.

## Design Tokens
Farben (bestehende EduFunds-Tokens bevorzugen, falls benannt):
- Primär-Grün `#1E3A2F` · Hover-Grün `#2C5243` · Gold `#A8842C` · Gold hell (nur auf Dunkelgrün, Variante 1c) `#D4B160` · Gold-Tint `#F3EDDD`
- Hintergrund Creme `#FBF9F3` · Karten-Weiß `#FFFFFF`
- Borders: `#EDE9DE` (auf Creme) / `#E4E0D4` (Karten) / `#F0EDE4` (Hairlines in Karte)
- Text: `#22302B` (Basis) · `#44514B` (Fließtext) · `#55625C` (sekundär) · `#7A8580` (tertiär) · `#98A29C` (Labels)

Typografie:
- Headlines/Zitate/Kartentitel: **Source Serif 4** (600) — bzw. die bestehende Serif der Live-Seite
- UI/Fließtext: **Public Sans** (400–700) — bzw. bestehende Sans
- Nur Variante 1c: **Bricolage Grotesque** (600–700)
- Optional Signaturen: **Caveat** 600

Radien: 999px (Pills/Buttons) · 20px (Hero-Foto) · 16px (Karten) · 14px (Band-Fotos, Antragskarte) · 12px (Porträts) · 50% (Avatar)

## Assets
**Alle Fotos im Prototyp sind Unsplash-Platzhalter** (Mood-Referenz: dokumentarisch, warm, echte Menschen — Grund- und Oberschüler:innen). Vor Launch ersetzen durch:
- 1 Hero-Projektfoto quer (~1280×1120 für 640×560 @2x): gefördertes Projekt in Nutzung
- 3 Projektband-Fotos (~900×480): reale geförderte Projekte
- 2 Gründer-Porträts hochformat (~800×700) + 1 quadratischer Avatar (~168×168)
Unsplash-Lizenz erlaubt kommerzielle Nutzung ohne Attribution, falls einzelne Stand-ins übergangsweise live gehen sollen; die konkreten URLs stehen als `src` in `EduFunds Hero Varianten.dc.html`.

## Files
- `EduFunds Hero Varianten.dc.html` — Hero-Referenzen 1a/1b/1c (im Browser öffnen)
- `EduFunds Gründer-Sektion Entwurf.dc.html` — Gründer-Sektion (A) + Kontaktkarte (B)
- `EduFunds Marketing-Analyse.dc.html` — Begründung/Kontext der Maßnahmen (zum Verständnis, keine Umsetzungsaufgabe)
- `image-slot.js`, `support.js` — Prototyp-Tooling, **nicht übernehmen**

---

# Gründer-Sektion + Kontaktkarte (Detail-Spezifikation)

## A — Gründer-Sektion (Startseite)

**Sektion-Container:** Hintergrund `#FBF9F3`, Padding `88px 96px` (Desktop), Inhalt zentriert.

**Kopfbereich** (zentriert, `margin-bottom: 56px`):
1. Eyebrow-Pill „Wer dahinter steht": 12px, `letter-spacing: 0.16em`, uppercase, 700, `#A8842C` auf `#F3EDDD`, `border-radius: 999px`, Padding `7px 16px`, `margin-bottom: 20px`
2. H2: „Wir sind zwei Gründer — und wir kennen den Antragsfrust aus eigener Erfahrung." — Source Serif 4, 600, 44px, `line-height: 1.15`, `#1E3A2F`, `max-width: 760px`
3. Subline: 17px, `line-height: 1.6`, `#55625C`, `max-width: 620px`: „EduFunds ist kein anonymes Portal. Hinter jeder Antwort, jedem geprüften Programm und jedem Antrag stehen wir persönlich."

**Gründer-Karten** — Grid `1fr 1fr`, `gap: 32px`, `max-width: 920px`, zentriert. Pro Karte:
- Container: `#FFFFFF`, Border `1px solid #E4E0D4`, `border-radius: 16px`, Padding `24px`, Column-Flex `gap: 18px`
- Porträt: volle Kartenbreite × `340px`, `border-radius: 12px`, `object-fit: cover`
- Namenszeile (Flex, space-between, baseline): Name h3 Serif 24px 600 `#1E3A2F`; optional Handschrift-Vorname (Caveat 600, 26px, `#A8842C`)
- Rolle: 12px caps, `letter-spacing: 0.12em`, 700, `#A8842C`, Margin `4px 0 12px` — Muster „Mitgründer · [Rolle]"
- Bio: 15px, `line-height: 1.6`, `#44514B` — 2–3 Sätze in Ich-Form

**Zitat-Block** (unter den Karten): `max-width: 720px`, zentriert, `margin-top: 48px`, `border-top: 1px solid #E4E0D4`, `padding-top: 32px`:
- Zitat Serif kursiv 20px `#1E3A2F`: „Kein Schulprojekt sollte an einem Formular scheitern. Dafür stehen wir — mit Namen und Gesicht."
- Attribution 13px `#7A8580`: „[Vorname] & [Vorname], Gründer von EduFunds"

## B — Kontaktkarte (Entscheidungspunkt)

- Container: `#FFFFFF`, Border `1px solid #E4E0D4`, `border-radius: 16px`, Padding `24px 28px`, `max-width: 620px`, Flex-Row, `align-items: center`, `gap: 20px`
- Avatar: exakt `84×84px`, Kreis, `object-fit: cover`, `flex: 0 0 84px` (darf nicht schrumpfen)
- Textblock (`gap: 4px`): Titel Serif 19px 600 `#1E3A2F` „Fragen zu Preisen oder Ihrem Antrag?"; Copy 14.5px `#55625C` „Schreiben Sie mir direkt — ich antworte persönlich, meist noch am selben Tag."; Attribution 13px `#7A8580` „[Vorname], Mitgründer"
- Button: `mailto:`-Link, `#1E3A2F`/`#FBF9F3`, 14.5px 600, `border-radius: 999px`, Padding `12px 22px`, `flex-shrink: 0`, Label „E-Mail schreiben", Hover `#2C5243`
