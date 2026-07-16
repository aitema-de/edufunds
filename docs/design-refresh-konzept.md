# Design-Refresh-Konzept — EduFunds (Lovable „Editorial Archival" → Next.js-App)

> **Status:** Plan / Entwurf (2026-06-17). **Noch kein Code geändert.**
> **Ziel:** Das Design der neuen Lovable-Landing (`Aitema-gmbh/edufunds-hub`) als Refresh
> in die bestehende EduFunds-Next.js-App übernehmen. **Content/Texte/Pricing sind NICHT
> Teil dieses Plans** — die werden separat mit Kolja abgestimmt (s. Abschnitt 7).

---

## 1. Ausgangslage

| | Aktuelle App (Next.js) | Lovable-Landing (Vorlage) |
|---|---|---|
| Stil-Name | „Parchment Editorial" | „Editorial Archival" |
| Stack | Next 16, Tailwind v3 (`tailwind.config.js`, HSL-Vars in `globals.css`) | TanStack Start, Tailwind v4 (`@theme` in `styles.css`) |
| Verwandtschaft | **Beide editorial, warmes Papier-BG, Serif-Headlines** — derselbe Geist | |

**Wichtig:** Es ist ein **Design-Port, kein Code-Merge** (anderer Stack). Wir übernehmen
Tokens, Fonts und visuelle Muster — nicht die Lovable-Komponenten 1:1.

Erfreulich: Da die App schon ein Papier/Serif-System ist, ist der Refresh eine
**Verfeinerung**, kein Bruch — kleinere Risiken, kein Re-Layout nötig.

---

## 2. Token-Mapping (Kern des Refreshs)

| Rolle | Heute | **Neu (Lovable)** | Anmerkung |
|---|---|---|---|
| Hintergrund | Parchment `#f8f5f0` | **Paper `#fdfdfc`** | heller, kühler-neutral |
| Text / „Ink" | Navy `#0a1628` | **Ink `#1c1917`** | warmes Fast-Schwarz statt Navy |
| Akzent (primär) | Gold `#c9a227` | **Brandy `#78350f`** | tiefes Cognac-Braun; **bessere WCAG-Kontraste** als Gold |
| Sekundär/Muted | parchment-dark / navy-Töne | warme Stein-Töne `oklch(0.97 0.005 80)` | |
| Dark-Mode-Akzent | (—) | Amber `#d97706` | Lovable bringt Dark-Mode mit; optional |
| Radius | diverse | `--radius: 0.75rem` + Skala | `rounded-full` für Buttons/Pills |

**Konsequenz:** Navy verschwindet als Markenfarbe; „Ink" (warmes Schwarz) wird Text +
dunkle Kontrastflächen (`bg-ink`). Gold → Brandy als einziger Akzent.

---

## 3. Font-Migration

| Rolle | Heute | Neu |
|---|---|---|
| Serif (Headlines) | DM Serif Display | **Newsreader** (oft *italic* für Akzentwörter) |
| Sans (Body/UI) | Plus Jakarta Sans | **Outfit** |
| Mono | Fira Code | bleibt (kein Pendant nötig) |

- Einbindung heute: Google-Fonts-`@import` in `globals.css`. Empfehlung: auf
  **`next/font/google`** umstellen (Newsreader + Outfit) → kein Render-Blocking, self-hosted.

---

## 4. Visuelle Muster, die den Look ausmachen (zum Adaptieren)

- **Serif-Headlines mit kursiven Akzentwörtern** (z. B. „…an *Fördermitteln* ungenutzt.").
- Großzügiger Weißraum (`py-24`-Sektionen), feine Trenner `border-ink/5`.
- **Pill-Buttons** `rounded-full`; primär = `bg-accent text-paper`, sekundär = `ring-1 ring-ink/15`.
- Uppercase-Tracking-Labels (`text-xs uppercase tracking-widest text-accent`).
- Eine dunkle Kontrast-Sektion (`bg-ink text-paper`) als rhythmischer Bruch.
- Stat-Grids (große Serif-Zahlen, kleine Uppercase-Labels).
- Dezente Motion-Fade-ups (wir nutzen `framer-motion` analog, oder CSS).

---

## 5. Betroffene Komponenten + Wellen-Reihenfolge

**Migrationsfläche:** Markenfarben hartkodiert in **~58 Dateien** (`#c9a227`), `#0a1628` in 53,
`#1e3a61` in 38. Strategie: **erst zentrale Tokens umstellen, dann Komponenten in Wellen.**

**Welle 0 — Fundament (keine sichtbare Änderung ohne Welle 1):**
- `tailwind.config.js`: semantische Farben `paper/ink/accent/...` ergänzen (auf neue Werte).
- `globals.css`: HSL-/CSS-Vars auf Paper/Ink/Brandy; Fonts via `next/font`.
- Ziel: **semantische Tokens** statt Hex — damit künftige Tweaks an einer Stelle sitzen.

**Welle 1 — Globale Shell (höchste Sichtbarkeit):**
- `Header.tsx`, `Footer.tsx`, `PageHero.tsx`, `SectionHeader.tsx`, Buttons/`ui`-Primitives, `GlassCard`.

**Welle 2 — Marketing-Seiten:**
- `app/page.tsx` (Home), `HeroSection`, `FeaturesSection`, `PricingCard`/`app/preise`,
  `TestimonialsSection`, `CTASection`, `DsgvoTrust`. (⚠️ Pricing-**Inhalt** separat, s. 7.)

**Welle 3 — Produkt-Kern (Wizard):**
- `WizardShell`, `AnliegenForm`, `AntragResult`, **`PaywallGate`** (viel hartkodiertes
  `#0a1628`/`#c9a227`), `FinanzplanView/Editor`, `FactsPanel`, `KIAntragAssistent`.

**Welle 4 — Rest & Politur:**
- Admin, Skeletons, `KiHinweis`, Mail-Templates (`newsletter.html`, Bestätigungsmail),
  Wartungsseite (`ops/maintenance/index.html`) auf neue Tokens.

Jede Welle: umstellen → visuell prüfen (lokal + Screenshot) → committen (Feature-Branch → staging).

---

## 6. Technische Knackpunkte

- **Hex → Token:** kontrollierter Sweep (Mapping `#c9a227→accent`, `#0a1628→ink`,
  `#1e3a61→ink/70` o. ä.). Nicht blind ersetzen — manche Töne sind bewusst (Schatten, Borders).
- **Kontrast/WCAG:** Brandy `#78350f` ist dunkler als Gold → meist bessere Kontraste; trotzdem
  Gold-auf-Weiß-Stellen, die früher schon kritisch waren (Memo: `#7a5e12`), neu prüfen.
- **Tailwind v3 vs v4:** Lovable nutzt v4-`@theme`. Wir bleiben vorerst auf v3 und übersetzen
  die Tokens — kein v4-Upgrade nötig (separat entscheidbar).
- **Dark-Mode:** Lovable bringt ihn mit. Für die App optional — Scope-Entscheidung.
- **Keine Layout-Brüche:** Wir ändern Farben/Fonts/Radien, nicht die Seitenstruktur → geringes Regressionsrisiko.

---

## 7. NICHT Teil dieses Plans (separat mit Kolja)

- **Pricing:** Lovable zeigt Einzelantrag **149 €** / Kontingent 5 **595 €** — real ist
  **29,90 €** + echte `packs.ts`-Pakete. **Vor jeder Übernahme korrigieren.**
- **Texte** (Hero-Claim, Problem, FAQ, Trust-Streifen „BMBF/Land NRW/…" nur wenn belegbar).
- **Zahlungsart-Aussage** („per Rechnung, 14 Tage" vs. real Stripe Checkout Karte/SEPA).
- **Programm-Zahl** („135+" vs. real 131 / Kampagne „180+").

→ Diese Inhalte stimmen wir gemeinsam ab; das Design kann parallel vorbereitet werden.

---

## 8. Empfohlene Reihenfolge (gesamt)

1. **(a)** Lovable-Landing lokal starten + Screenshots → gemeinsamer visueller Abgleich.
2. **Welle 0** (Tokens + Fonts) auf Feature-Branch → staging, visuell verifizieren.
3. Wellen 1–4 iterativ; nach jeder Welle Screenshot-Review.
4. Parallel: Content-/Pricing-Abstimmung (Abschnitt 7).
5. Separat: Lovable-Landing als `edufunds.org`-Landing produktiv (eigener Deploy-Weg).

---

## 9. Offene Entscheidungen für Kolja

- Dark-Mode übernehmen — ja/nein?
- Akzent strikt nur Brandy, oder Gold als Sekundär-/Festakzent behalten?
- Tailwind v4-Upgrade jetzt oder später (entkoppelt)?
- Newsletter-/System-Mails ins neue Design (Welle 4) — Priorität?
