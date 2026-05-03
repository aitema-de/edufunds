---
phase: 01-eval-korpus-matcher
plan: 02
subsystem: testing
tags: [eval, matcher, deepseek, korpus, baseline, recall-at-3, off-target-rate, phase-1-exit]

# Dependency graph
requires:
  - "01-01 (Eval-Skript + Korpus-Schema + 3-Eintrag-Stub)"
provides:
  - "Vollkuratiertes Korpus mit 22 Eintraegen (Verteilung 6 kurz / 9 ausfuehrlich / 7 vag, davon 3 Edge-Cases)"
  - "Erste offizielle Phase-1-Baseline (Recall@3=0.316, Off-Target-Rate=10.5 %) als Vergleichsanker fuer Phase 2"
  - "data/eval/BASELINE.md mit Append-only History (Phase 2+ fuegt oben dran)"
  - "data/eval/reports/2026-05-03-08-15-33.json als versionierter Baseline-Report"
  - "Konkrete Tuning-Hypothesen fuer Phase 2 (Aktion-Mensch-Drift, kurz-Kategorie schwach, Edge-Cases liefern volle Top-3 statt Klaerungsfrage)"
affects:
  - "Phase 2 (Matcher-Quality) — MATCH-02/-03-Tuning misst sich gegen diese Baseline"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BASELINE.md als Append-only History mit Matcher-Commit-SHA + drei Hauptzahlen + Per-Kategorie + Report-Pfad"
    - "Force-Add per .gitignore-ignorierter Reports fuer Phase-1-Baseline (ein-Off-Versionierung)"
    - "Korpus-Validator-First: alle programmIds gegen data/foerderprogramme.json validiert vor Live-Run"

key-files:
  created:
    - "data/eval/BASELINE.md"
    - "data/eval/reports/2026-05-03-08-15-33.json"
    - "data/eval/reports/2026-05-03-08-15-33.md"
    - ".planning/phases/01-eval-korpus-matcher/01-02-SUMMARY.md"
  modified:
    - "data/eval/matcher-korpus.json (von 3 auf 22 Eintraege erweitert in Task 1a, Commit 06675e2)"

key-decisions:
  - "Phase-1-Baseline-Report force-committed trotz .gitignore data/eval/reports/ — Threat-Model T-01-09 verlangt versionierten Report fuer SHA-Zuordnung; .gitignore-Default 'transient' bleibt fuer alle anderen Reports erhalten"
  - "BASELINE.md verwendet die echte JSON-Zahl (totalEurCents=0.79), nicht den Konsolen-Display-String '< 0,01 €' aus formatEur — formatEur-Display-Drift bei sub-1-Cent-Werten als deferred-item dokumentiert (kein Auto-Fix in diesem Plan, da pricing.ts App-weit verwendet)"
  - "Edge-Case-Befund bewusst stehen gelassen: Matcher liefert fuer alle 3 Edge-Cases (ev-003, ev-019, ev-022) ein volles Top-3 statt einer Klaerungsfrage — das ist Phase-2-MATCH-03-Auftrag, kein Phase-1-Bug"

patterns-established:
  - "Korpus-Vollkuration mit Encoding-Trennung: ASCII in JSON, Umlaute in Markdown (siehe 01-02-PLAN.md <sprache_und_encoding>)"
  - "Per-Kategorie-Auswertung subset-iert nonEdge — Edge-Cases (expected_top3=[]) zaehlen nicht zum Recall-Mittel, sondern nur zur separaten Edge-Case-Metrik"

requirements-completed:
  - "MATCH-01"

# Metrics
duration: ~25min (Task 2: Baseline-Run + BASELINE.md, ohne Task 1a/1b Wallclock)
completed: 2026-05-03
---

# Phase 1 Plan 2: Eval-Korpus Matcher — Vollkuration + Baseline Summary

**Erste offizielle Phase-1-Baseline gegen vollkuratiertes 22-Eintrag-Korpus: Recall@3 0.316 / Off-Target 10.5 % bei 0.79 Cent / 22 LLM-Calls — und mit konkreten Tuning-Zielen für Phase 2 (Aktion-Mensch-Drift, schwache kurz-Kategorie, Edge-Cases liefern volle Top-3 statt Klärungsfrage).**

## Performance

- **Duration Task 2:** ca. 25 Minuten (HEAD-SHA-Erfassung, Live-Run 60s, BASELINE.md-Schreiben, Verify, Commit)
- **Started:** 2026-05-03T08:13Z
- **Completed:** 2026-05-03T08:25Z
- **Tasks:** 3 / 3 (1a Korpus-Generation, 1b Kolja-Kuration, 2 Baseline-Run)
- **Files modified:** 5 (4 neu, 1 erweitert)

## Accomplishments

- **Vollkuratiertes Korpus** (Task 1a in vorhergehender Session): 22 Einträge in `data/eval/matcher-korpus.json`, Verteilung 6 kurz / 9 ausführlich / 7 vag (davon 3 Edge-Cases mit `expected_top3=[]`). Validator-Snippet aus Task 1a exit 0 — alle programmIds existieren in `data/foerderprogramme.json`.
- **Kolja-Kuration** (Task 1b in vorhergehender Session): „freigegeben" — keine Edits nötig, Korpus passt.
- **Live-Baseline-Run** (Task 2 in dieser Session): exit 0, 22 sequenzielle Matcher-Calls in 58s Wallclock, 0 errored, alle Aggregate-Felder befüllt.
- **JSON + MD Report** unter `data/eval/reports/2026-05-03-08-15-33.json/.md` — force-committed (ein-Off, alle anderen Reports bleiben gitignored).
- **`data/eval/BASELINE.md`** mit Append-only History angelegt. Phase-1-Eintrag enthält Commit-SHA, drei Hauptzahlen, Per-Kategorie-Breakdown, Edge-Case-Stats, Tuning-Hypothesen für Phase 2.

## Task Commits

Jeder Task atomar committed:

1. **Task 1a: Korpus-Vollkuration auf 22 Einträge** — `06675e2` (feat) — vorhergehende Session
2. **Task 1b: Kolja-Kuration** — kein Code-Commit (reine Sichtung, „freigegeben")
3. **Task 2: Phase-1 Baseline-Run + BASELINE.md** — `30a430a` (feat) — diese Session

## Korpus-Verteilung final (Coverage-Beweis für D-06)

| Kategorie | n | Notiz |
|-----------|---|-------|
| kurz | 6 | ev-002, ev-012, ev-013, ev-014, ev-015, ev-016 |
| ausführlich | 9 | ev-001, ev-004, ev-005, ev-006, ev-007, ev-008, ev-009, ev-010, ev-011 |
| vag | 7 | ev-003, ev-017, ev-018, ev-019, ev-020, ev-021, ev-022 (3 davon Edge-Cases mit `expected_top3=[]`: ev-003, ev-019, ev-022) |

**Bundesländer (8 distinct):** Berlin, Bayern, Niedersachsen, Hamburg, Nordrhein-Westfalen, Baden-Württemberg, Hessen, Brandenburg, Sachsen, Sachsen-Anhalt — sowie 4 Einträge ohne `bundesland` (ev-013, ev-015, ev-021, ev-022) für thematischen Kern-Test.

**Programm-Hauptkategorien (D-06) abgedeckt:**

| Hauptkategorie | Korpus-Einträge | Beispiel-Programme in `expected_top3` |
|---|---|---|
| Garten/Natur | ev-001, ev-015 | aktion-mensch-schulkooperation, kultur-macht-stark, nabu-schulen, bfn-artenvielfalt |
| Digital | ev-002, ev-017 | bmbf-digitalpakt-2, berlin-startchancen, mercator-digitalisierung, ibm-skillsbuild |
| MINT/Forschen | ev-004, ev-011 | stiftung-kinder-forschen, helmholtz-schuelerlabore, stifterverband-bildung, first-lego-league, siemens-stiftung-mint-hub, telekom-stiftung-technik-scouts |
| Berufsorientierung MINT | ev-005 | telekom-stiftung-jia, telekom-junior-ingenieur-2026, telekom-stiftung-mint-berufsorientierung |
| Sprache/Integration | ev-006, ev-016, ev-018 | lesen-macht-stark, sprache-macht-stark, mercator-integration, dkjs-inklusion |
| Internationales | ev-007 | erasmus-schule-2026, kmk-pad-foerderung, europaschulen-nrw-2026 |
| Inklusion | ev-008 | aktion-mensch-schulkooperation, fritz-henkel-inklusion-2026, dkjs-inklusion |
| Klima/BNE | ev-009, ev-020 | klimalab-2026, schott-nachhaltigkeit, heinrich-boell-bildung |
| Demokratie | ev-010 | bmw-stiftung-demokratie, heinrich-boell-bildung, telekom-stiftung-respect |
| Sport | ev-012 | niedersachsen-sport, dkjs-sport, baywa-laufen-wald |
| Mathe-Wettbewerbe | ev-013 | kaenguru-der-mathematik, mathe-im-advent, bundeswettbewerb-mathematik |
| Kultur/Theater | ev-014 | kultur-macht-stark, hamburg-kultur-schule, bayern-kulturfonds |
| Kleinprojekte/Mischfonds | ev-021 | stiftung-bildung-foerderfonds, lesen-macht-stark, dkjs-sport |
| (kein Schwerpunkt — Edge-Cases) | ev-003, ev-019, ev-022 | `expected_top3=[]` |

13 thematische Achsen abgedeckt durch das Korpus (gegenüber den 9 D-06-Pflicht-Hauptkategorien). MATCH-01 ist damit vollständig erfüllt.

## Baseline-Zahlen (1:1 wie in BASELINE.md)

| Metrik | Wert |
|--------|------|
| n total | 22 |
| Non-Edge | 19 |
| Edge | 3 |
| Errored | 0 |
| **Recall@3 Mittelwert (Non-Edge)** | **0.316** |
| **Off-Target-Rate** | **10.5 %** (2/19 Einträge mit Off-Target im Top-3) |
| Per-Kategorie kurz | n=6, Recall 0.222, Off-Target 16.7 % |
| Per-Kategorie ausführlich | n=9, Recall 0.370, Off-Target 11.1 % |
| Per-Kategorie vag | n=4, Recall 0.333, Off-Target 0.0 % (Edge-Cases separat) |
| Edge-Cases (n=3) | 0 mit Off-Target-Leak, 0 mit leerer Matcher-Liste |
| Latenz/Eintrag | 2.63s avg (Spanne 2.15s – 3.38s) |
| **Gesamtkosten** | **0.79 Cent** (53.330 Tokens, 22 LLM-Calls) |
| Wallclock-Total | ~58s sequenziell |
| Matcher-Commit-SHA | `06675e2` (HEAD vor Baseline-Commit) |
| Report-File | `data/eval/reports/2026-05-03-08-15-33.json` (force-committed) |

## Hinweise für Phase 2 — wo der Matcher heute am schwächsten ist

### Tuning-Ziel 1: kurz-Kategorie (Recall 0.222, Off-Target 16.7 %)

Das ist die schwächste Kategorie sowohl in Recall als auch in Off-Target-Rate. Konkret:

- **ev-013** (Mathe-Wettbewerbe ohne Bundesland) → Recall 0.0. Top-3 enthält Hector-Kinderakademie + Playmobil-HOB-Preis + Ferry-Porsche-Challenge statt der drei erwarteten Wettbewerbe (Känguru, Mathe-im-Advent, BWM). **Tuning-Hypothese:** Wettbewerbs-Programme bekommen vom Matcher zu wenig Gewicht, wenn das Anliegen knapp formuliert ist und keinen "Wettbewerb"-Trigger-Term enthält.
- **ev-016** (Mehrsprachige Bibliothek NRW) → Recall 0.0. Top-3 = kultur-macht-stark + RAG-Stiftung statt der drei Sprache/Integration-Programme. **Tuning-Hypothese:** Sprache+Mehrsprachigkeit+Bibliothek wird vom Matcher als „Kultur" geframt statt als „Sprachförderung".
- **ev-015** (Schul-Aquarium) → Recall 0.0. Top-3 = kultur-macht-stark + klimalab + ferry-porsche statt nabu-schulen + bfn-artenvielfalt + stiftung-kinder-forschen. **Tuning-Hypothese:** Naturkunde/Artenvielfalt-Domain ist im Prompt unterrepräsentiert.

### Tuning-Ziel 2: Aktion-Mensch-Drift (2 von 19 Off-Target-Hits)

- **ev-002** (Tablets Berlin): `aktion-mensch-schulkooperation` rutscht auf Position 3 obwohl Anliegen rein digital ist.
- **ev-009** (Klimaschule Hessen): `aktion-mensch-schulkooperation` rutscht auf Position 2 obwohl Anliegen rein BNE/Klima ist.

Beide Hits zeigen denselben Drift: Aktion-Mensch wird in Top-3 gezogen, auch wenn der Anliegen-Kontext keine Inklusion enthält. **Tuning-Hypothese:** Das Programm hat im Pre-Filter oder im LLM-Ranking einen Bonus, der ohne expliziten Inklusions-Marker im Anliegen nicht greifen sollte.

### Tuning-Ziel 3: Edge-Case-Behandlung (MATCH-03 / Klärungsfrage-Logik)

Der Matcher liefert für **alle drei** Edge-Cases (`expected_top3=[]`) ein volles Top-3 statt eine leere Liste oder Klärungsfrage:

- **ev-003** ("Schule besser machen, vielleicht Sport oder Kultur"): Top-3 = kultur-macht-stark + ferry-porsche + playmobil-hob.
- **ev-019** ("mehrere Ideen — Theater, Naturwissenschaften, Frankreich-Austausch"): Top-3 = erasmus + ferry-porsche + neumayer-projektkultur.
- **ev-022** ("Wir suchen einfach Geld. Die Schule braucht alles."): Top-2 = bundesweit-ganztag + berlin-startchancen.

Das ist nicht „falsch" im Recall-Sinne (Off-Target-Rate ist 0 % bei Edge-Cases), aber es ist genau das Verhalten, das **MATCH-03** (Klärungsfrage-Logik) in Phase 2 ändern muss: vag-Anliegen ohne klaren Schwerpunkt sollten den Matcher zur Rückfrage statt zum Ranking veranlassen.

### Tuning-Ziel 4: ausführliche MINT-Anliegen mit Recall 0.0

Trotz klarem Goldstandard rutschen die erwarteten programmIds bei zwei MINT-ausführlich-Einträgen aus den Top-3:

- **ev-004** (Forscher-AG MINT-Grundschule, BY) → Recall 0.0. Top-3 = siemens-stiftung-mint-hub + kultur-macht-stark + aktion-mensch statt stiftung-kinder-forschen + helmholtz-schuelerlabore + stifterverband-bildung.
- **ev-011** (Maker-Space MINT, SN) → Recall 0.0. Top-3 = bmbf-digitalpakt-2 + ferry-porsche + telekom-junior-ingenieur statt first-lego-league + siemens-mint-hub + telekom-technik-scouts. **Hier rutscht DigitalPakt auf Pos1**, obwohl Maker-Space + Robotik kein DigitalPakt-Profil ist.

**Tuning-Hypothese:** Bei Geräte-Anschaffungen mit MINT-Hintergrund (Mikroskope, 3D-Drucker) wird DigitalPakt überaktiv. Der Matcher unterscheidet nicht zwischen „Tablets für allgemeinen Unterricht" (DigitalPakt) und „Spezial-Hardware für MINT-Lab" (eher Stiftung-Kinder-Forschen / Siemens / Telekom).

## Cross-Reference zu Plan 01-01 SUMMARY

- **Plan 01-01** lieferte Schema, Skript, Stub (3 Einträge mit Recall=1.0 — synthetisch hoch wegen kuratiertem Stub).
- **Plan 01-02** liefert die echte Baseline gegen das vollkuratierte Korpus: **Recall=0.316 vs. Stub-Recall=1.0**. Dieser starke Drop ist genau die Begründung für die Eval-Infrastruktur — ohne sie wäre das aktuelle Tuning-Niveau des Matchers nicht messbar.
- **Plan 01-01-SUMMARY** dokumentierte LLM-Varianz beim wiederholten Run (Off-Target sprang von 0 % auf 50 %). Plan 01-02 hat **einen** Live-Run als Baseline. Phase 2 sollte erwägen, mehrere Runs zu mitteln oder `temperature=0`/Seed zu setzen — siehe BASELINE.md "Was die Baseline NICHT misst".
- **Reportstruktur unverändert** — Plan 01-02 hat das Skript nicht modifiziert (read-only gegen Matcher und Skript bleibt wie in Plan 01-01).

## Decisions Made

- **Force-Add des Baseline-Reports trotz .gitignore**: Plan 01-01 hat `data/eval/reports/` und `data/eval/snapshots/` gitignored, weil die meisten Run-Outputs transient sind. Aber der **Phase-1-Baseline-Report** ist gerade nicht transient — er ist die offizielle Vergleichszahl für Phase 2. Threat-Model T-01-09 verlangt versionierte SHA-Zuordnung. Lösung: Force-Add (`git add -f`) nur für die zwei Baseline-Files (`.json` + `.md`), .gitignore-Default für alle anderen Reports bleibt erhalten.
- **BASELINE.md mit der JSON-Zahl, nicht der Konsolen-Anzeige**: Konsolen-Output und Markdown-Twin zeigen `< 0,01 €` (formatEur-Display-Drift für sub-1-Cent-Werte), aber im JSON-Report steht `totalEurCents: 0.79`. BASELINE.md verwendet 0.79 Cent — das ist die korrekte, maschinenlesbare Zahl.
- **Edge-Cases liefern Top-3 — Befund stehengelassen**: Der Matcher hat aktuell keine Klärungsfrage-Logik (das ist MATCH-03 / Phase 2). Plan 01-02 misst und dokumentiert das Verhalten; Korrektur ist Phase 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .gitignore vs. Plan-Acceptance-Criteria**
- **Found during:** Task 2 (vor `git add data/eval/reports/`)
- **Issue:** Plan 01-02 `<acceptance_criteria>` verlangt: „Conventional Commit `feat(phase-01): ...` mit Korpus + Reports + Snapshots + BASELINE.md committed." Aber Plan 01-01 hat `data/eval/reports/` in `.gitignore` aufgenommen — `git add data/eval/reports/` würde keine Files stagen.
- **Fix:** Force-Add (`git add -f data/eval/reports/2026-05-03-08-15-33.{json,md}`) nur für die zwei Phase-1-Baseline-Files. .gitignore-Default bleibt für alle anderen Reports erhalten (sonst würde jeder Phase-2-Tuning-Lauf das Repo aufblähen).
- **Files modified:** keine — `.gitignore` selbst wurde nicht angefasst.
- **Committed in:** `30a430a` (Baseline-Commit).

### Deferred Issues

**1. [Out-of-scope] formatEur-Display-Drift bei sub-1-Cent-Werten**
- **Found during:** Konsolen-Output vom Baseline-Run.
- **Issue:** `formatEur(0.79)` rendert `< 0,01 €` statt `0,79 ¢` oder `< 0,01 €` ist eine zu grobe Schwelle. Im JSON-Report steht die korrekte Zahl 0.79 Cent.
- **Warum nicht gefixt:** `lib/wizard/pricing.ts:formatEur` wird App-weit verwendet (Frontend-UI, andere Smoke-Skripte, Pipeline-Reports). Eine Änderung ist Out-of-Scope für Plan 01-02 (read-only gegen Matcher und Skript-Logik). BASELINE.md verwendet die echte JSON-Zahl, daher kein Daten-Verlust.
- **Empfehlung für Phase 2 oder separater Plan:** Schwelle in `formatEur` von „< 0,01 €" auf „< 0,01 ¢" senken oder Sub-Cent-Werte direkt als Bruchwerte rendern (`0,79 ¢`).

**2. [Phase-2-Auftrag] Edge-Cases liefern volle Top-3 statt Klärungsfrage**
- **Found during:** Baseline-Run-Ergebnis-Analyse.
- **Issue:** Alle 3 Edge-Cases (`expected_top3=[]`) erhielten ein volles Top-3 statt einer leeren Liste oder Klärungsfrage.
- **Warum nicht gefixt:** Das ist MATCH-03 / Phase-2-Auftrag — Plan 01-02 ist Eval-First, keine Matcher-Modifikation.

**3. [Phase-2-Auftrag] LLM-Run-Stabilität nicht gemessen**
- **Found during:** Plan 01-01-SUMMARY Hinweis auf Off-Target-Sprung 0%→50% beim wiederholten Stub-Run.
- **Issue:** Plan 01-02-Baseline ist ein einzelner Live-Run. Drift-Stabilität nicht gemessen.
- **Empfehlung für Phase 2:** mehrere Runs mitteln, oder `temperature=0`/Seed setzen falls vom Provider unterstützt.

---

**Total deviations:** 1 auto-fixed (force-add wegen .gitignore-Konflikt), 3 deferred (formatEur-Display, Edge-Case-Klärungsfrage, Run-Stabilität).
**Impact on plan:** Force-Add ist notwendig für Threat-Model-Compliance (T-01-09 SHA-Zuordnung). Drei deferred-items sind klar Phase-2-Aufträge oder Out-of-Scope.

## Issues Encountered

- **`.gitignore`-Plan-Konflikt** (siehe Auto-Fix oben): Plan 01-01 hat `data/eval/reports/` gitignored, Plan 01-02 verlangt Report-Commit. Lösung war Force-Add nur für Baseline.
- **formatEur-Display-Bug bei sub-1-Cent** (siehe Deferred Issue 1): nicht-blockierend, JSON-Zahl ist korrekt.
- **Nichts Blockierendes**: alle Acceptance-Criteria erfüllt, Verify-Snippet exit 0.

## User Setup Required

None — Korpus ist Kolja-freigegeben, Baseline-Run lief gegen produktive DeepSeek-API mit `DEEPSEEK_API_KEY` aus `.env.local`.

## Next Phase Readiness

- **MATCH-01 abgehakt** ✓ — alle vier Phase-1-Erfolgskriterien aus ROADMAP.md erfüllt:
  1. ✓ Korpus mit 22 Einträgen + `expected_top3`/`expected_off_target`
  2. ✓ Skript misst Top3-Trefferrate + Off-Target-Rate
  3. ✓ Strukturierter Report (JSON + Konsole + Markdown-Twin)
  4. ✓ Baseline dokumentiert (Recall@3=0.316 / Off-Target=10.5 % / Datum 2026-05-03 / Commit `06675e2`)
- **Phase 2 (Matcher-Quality) ist startbereit**: konkrete Tuning-Hypothesen liegen vor (siehe oben „Hinweise für Phase 2"). MATCH-02/-03-Plans können gegen `data/eval/reports/2026-05-03-08-15-33.json` als Baseline messen — jede Verbesserung wird sichtbar.
- **Phase 1 ist insgesamt abgeschlossen** — Verifier-Run kann starten (`/gsd-verify-phase 1`), oder direkt `/gsd-discuss-phase 2` für Matcher-Quality-Planung.

## Self-Check: PASSED

- `data/eval/BASELINE.md` — FOUND (`grep "Matcher-Eval Baseline" -c` = 1)
- `data/eval/reports/2026-05-03-08-15-33.json` — FOUND (committed)
- `data/eval/reports/2026-05-03-08-15-33.md` — FOUND (committed)
- `.planning/phases/01-eval-korpus-matcher/01-02-SUMMARY.md` — FOUND (this file)
- Commit `06675e2` (Task 1a, feat — vorhergehende Session) — FOUND in git log
- Commit `30a430a` (Task 2, feat) — FOUND in git log
- Verify-Snippet aus Plan 01-02 Task 2 `<verify>` — exit 0
- Per-Entry-Länge im JSON-Report = 22 = Korpus-Länge — CONFIRMED
- BASELINE.md enthält Matcher-Commit-SHA + Recall@3 + Report-Pfad — CONFIRMED
- Encoding: BASELINE.md hat 19 Zeilen mit Umlauten (ä/ö/ü/ß) — CONFIRMED

---
*Phase: 01-eval-korpus-matcher*
*Plan: 01-02 (Wave 2)*
*Completed: 2026-05-03*
