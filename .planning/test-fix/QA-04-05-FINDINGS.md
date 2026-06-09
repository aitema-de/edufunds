<!-- 2026-06-09: Abschliessende Untersuchung der Watch-Items QA-04 + QA-05. -->

# QA-04 / QA-05 — abschliessende Untersuchung (2026-06-09)

Watch-Items aus dem Test-&-Fix-Loop (2026-06-08). Auftrag: reproduzieren und
gezielt fixen — oder mit Belegen als Watch-Item schliessen, **ohne** gelockte
Generierungs-Prompts blind zu aendern.

Methode: dieselben Metriken wie `scripts/measure-quality.ts` (5-Wort-Shingle-
Jaccard fuer Abschnitts-Ueberlappung; Marker-Regex fuer Halluzinationen),
angewandt (a) deterministisch auf die **Original-Tester-Laeufe**
(`.planning/test-fix/wizard-outputs/run{1,2,3}-*.json`, via
`scripts/analyze-saved-runs.mjs`) und (b) live auf den **aktuellen Code**
(`measure-quality.ts`, Label `aktuell`).

## QA-04 — Wiederholungen zwischen Antrags-Abschnitten → GESCHLOSSEN (kein Defekt)

`QA04_maxOverlap` = maximale 5-Wort-Shingle-Jaccard zwischen je zwei Abschnitten.

| Quelle | run1 / bmbf | run2 / nds-sport | run3 / aktion-mensch |
|---|---|---|---|
| Original-Laeufe | 0.012 | 0.017 | 0.025 |
| Aktueller Code  | 0.003 | 0.012 | 0.002 |

Selbst in den Laeufen, in denen QA-04 *gemeldet* wurde, liegt die Ueberlappung bei
~1–2.5 %. Das ist keine messbare Wiederholung. **Kein realer Defekt** — geschlossen.

## QA-05 — Resthalluzination nach Critique → GESCHLOSSEN (Metrik ueberwiegend Falsch-Positiv)

`QA05_textMarker` zaehlt typische „erfundene Referenz"-Marker (KMK, MDM, TVoeD,
Gesundheitsamt, Az., …). Treffer in den Original-Laeufen, im Kontext geprueft:

- **run1 `KMK`** — „…ein Lernziel, das in der KMK-Strategie ‚Bildung in der digitalen
  Welt' beschrieben wird." → **korrekte, reale Referenz**. Falsch-Positiv.
- **run1 `MDM`** — „…Grundlagen zur iPad- und MDM-Verwaltung…" → **korrekter
  Fachbegriff** (Mobile Device Management) im Tablet-Projekt. Falsch-Positiv.
- **run2 `Gesundheitsamt`** — „…Motorik-Test (Kooperation mit dem Gesundheitsamt)…"
  → vom Nutzer **nicht** genannt; Partner **erfunden**. **Echte (milde) Halluzination.**

Also: 2 von 3 Treffern sind legitime, wertvolle Inhalte; nur ~1/3 ist echt.
Aktueller Code: `QA05_textMarker = 0` in allen drei Szenarien (consistencyIssues
ebenfalls 4→0 dank `reviseForConsistency`, e027f93).

**Entscheidung — kein Code-Eingriff in die Generierung:**
1. Die Marker-Metrik ueber-flaggt (KMK/MDM sind korrekt). Ein deterministischer
   Strip/Flag wuerde legitime, qualitaetssteigernde Inhalte unterdruecken
   (≠ QA-02, wo Schaetz-Sprache eindeutig ist).
2. Der echte Fall („erfundene Kooperationspartner") ist selten und weich; die
   zustaendigen Kontrollen existieren bereits: Critique-Stage + Konsistenz-
   Revision + WIZ-02-Halluzinations-Gate (hart-blockierend > 2σ).
3. Das Vorher/Nachher der Prompt-Schaerfungen (2026-06-08) zeigte **keinen**
   belastbaren Nutzen — Edits an gelockten Prompts waeren Risiko ohne Ertrag.

→ QA-05 bleibt **Watch-Item**, formal geschlossen mit Belegen. Wiederaufgreifen
nur, falls reale Tester-Rueckmeldungen erfundene Fakten als wiederkehrendes
Problem zeigen — dann gezielt an Critique/WIZ-02, nicht pauschal Marker
unterdruecken.

## Reproduzierbar

```bash
node scripts/analyze-saved-runs.mjs                                  # Original-Laeufe (gratis)
npx tsx --env-file=.env.local scripts/measure-quality.ts aktuell     # aktueller Code (DeepSeek)
```
