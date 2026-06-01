# Richtlinien-Queue-Audit — 2026-06-01

**Anlass:** Beim Dossier-Ausbau (Session 2026-06-01) fielen mehrere Katalog-Einträge auf, die keine echten Schul-Antragsförderungen sind, sowie Dubletten. Dieses Audit triagiert die Queue (`data/richtlinien-prioritaeten.json`, 82 Einträge mit `kiAntragGeeignet=true`) und gibt Handlungsempfehlungen.

**Wichtige Trennung:**
- **Queue-Status (`open`/`done`/`skip`)** steuert NUR das Dossier-Extraktions-Tool (`scripts/extract-richtlinie.ts --next`). Änderungen hier haben **keinen** Einfluss auf den Matcher.
- **`kiAntragGeeignet` in `data/foerderprogramme.json`** steuert, ob der **Matcher** ein Programm Testern anbietet. Änderungen hier wirken erst beim nächsten Deploy und verändern das Matcher-Verhalten (Eval-relevant).

---

## A) Bestätigte Fehl-Fits — Queue auf `skip` gesetzt (dieses Audit)

Keine schriftliche Antragsförderung mit Budget, die eine Schule beantragt. Per Web vermittelt/verifiziert.

| programmId | Befund |
|---|---|
| `siemens-stiftung-mint-hub` | Physischer Lernort + Workshops (TüftelLab, Berlin), keine Geld-Förderung per Antrag. |
| `baywa-schulgarten` | Sachleistung (Hochbeet-Starterpaket per Online-Formular), kein Antragstext/Finanzplan. |
| `baywa-waldschule` | Sachleistungs-Modell analog Schulgarten (BayWa Stiftung). |
| `aok-gesundheit` | Fragmentierte Landes-/Regionalprogramme, kein einheitliches bundesweites Antragsprogramm. |
| `alfred-toepfer-kultur` | Fördert Schulen nur über den Hamburger Kulturfonds (HH-only), kein eigenes bundesweites Schul-Antragsprogramm. |
| `sparkasse-erfurt-exzellenz` | Individuelle Schülerpreise, regional (Erfurt/Mittelthüringen), kein Schul-Förderantrag. |
| `netzwerk-stiftungen-bildung` | Dachverband/Netzwerk, kein eigenes Förderprogramm. |

## B) Dubletten — redundante Einträge auf `skip` gesetzt (Kanon behalten)

| Kanon (behalten) | Als Dublette auf `skip` |
|---|---|
| `denkmal-aktiv-bundesweit-2026` (done, Dossier vorhanden) | `denkmal-aktiv-nrw`, `bw-denkmal-aktiv-2026`, `denkmalschutz-denkmal-aktiv` — alle dasselbe bundesweite Programm (denkmal-aktiv.de). |
| `bmbf-ganztag-bildungskommunen` (behalten, s. C) | `bildungskommunen-bmbf` — identisches Programm „Ganztag in Bildungskommunen". |

**→ 11 Einträge in diesem Audit auf `skip` gesetzt.**

## C) Review nötig — offen gelassen, vor Extraktion prüfen

Valide-aber-nischig oder unklar. NICHT geskippt, aber niedrige Tester-Relevanz / Klärungsbedarf:

- `kmk-pad-foerderung`, `uk-german-connection`, `rheinland-pfalz-pad`, `jugendbruecke-beruflicher-austausch-2026-27` — echte Förderungen, aber **internationale Schulpartnerschaften/Austausch** (Nische).
- `telekom-junior-ingenieur-2026` — echte Anschubfinanzierung (10k), aber **Curriculum-Verpflichtung, gymnasium-only** (kein typisches Tester-Szenario).
- `bmbf-ganztag-bildungskommunen` — **Kommune-Ebene**; Schule beantragt nicht direkt → `kiAntragGeeignet` prüfen (evtl. false).
- `hector-kinderakademie`, `koerber-mint-regionen` — Akademie-/Netzwerkmodelle, Antrags-Tauglichkeit unklar.
- `telekom-stiftung-respect`, `telekom-stiftung-technik-scouts`, `mintspace-schulpreis`, `jugend-forscht-schulpreis`, `hopp-foundation-schulpreis`, `stiftung-bildung-preis` — Preise/Wettbewerbe; valide **wenn** konzeptbasiert (wie playmobil-hobpreis). Vor Extraktion je Programm verifizieren.
- `sh-ganztag-196mio` (Land-Investitionsprogramm SH), `sachsen-klimaschulen-2026` (Land-Netzwerk) — Land-spezifisch.
- `th-mint-digital` / `bw-mint-digital` / `sn-mint-digital-37` — **keine** Dubletten, sondern drei verschiedene Landesprogramme (TH/BW/SN).

---

## Empfehlungen mit Deploy-Vorbehalt (NICHT auto-angewendet)

Diese verändern das Matcher-Verhalten und brauchen einen Deploy + Eval-Re-Run + Kolja-OK. **Während aktiver Tester-Phase aufgeschoben.**

1. **`kiAntragGeeignet=false`** in `data/foerderprogramme.json` für alle Fehl-Fits aus (A) — sonst bietet der Matcher sie Testern weiter an (dann generische Struktur, kein Dossier). Betrifft: siemens-stiftung-mint-hub, baywa-schulgarten, baywa-waldschule, aok-gesundheit, alfred-toepfer-kultur, sparkasse-erfurt-exzellenz, netzwerk-stiftungen-bildung.
2. **Matcher-Dedup** der echten Katalog-Dubletten in `foerderprogramme.json`: `ferry-porsche-challenge` ⟷ `ferry-porsche-challenge-2025` (beide haben Dossiers), denkmal-aktiv-Varianten, bildungskommunen-Variante. Sonst tauchen Dubletten in Trefferlisten auf.
3. Nach Katalog-Änderung: `npx tsx scripts/rebuild-queue.ts` (Queue aus Katalog neu aufbauen) — beachten, dass das manuelle skip-Marks überschreiben kann; ggf. Audit-Skips erneut anwenden.

---

## Bilanz nach diesem Audit
- Queue vor Audit: `{done:17, open:61, expired:3, skip:1}`
- Queue nach Audit: `{done:17, open:50, expired:3, skip:12}`
- Saubere offene Antrags-Förderungen für künftigen Ausbau: ~50 (abzüglich der „Review"-Fälle aus C).
