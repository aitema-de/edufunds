# Matcher-Eval Baseline

> Append-only History. Phase 2+ fügt neue Einträge oben dran. Skript schreibt
> NICHT in diese Datei — manuelle Pflege per PR.

## 2026-05-03 — Phase-1-Baseline (Korpus v1, n=22)

- **Matcher-Commit:** `06675e2` (HEAD von `feature/wizard-adaptive` zum Run-Zeitpunkt — Korpus-Generations-Commit aus Plan 01-02 Task 1a; der Matcher-Code selbst ist seit `49a1102` unverändert)
- **Korpus-Version:** v1, 22 Einträge (kurz: 6, ausführlich: 9, vag: 7, davon Edge-Cases: 3 — ev-003, ev-019, ev-022)
- **Recall@3 (Mittelwert über Nicht-Edge):** 0.316
- **Off-Target-Rate:** 10.5 %
- **Per-Kategorie:**
  - kurz: Recall 0.222 / Off-Target 16.7 % (n=6)
  - ausführlich: Recall 0.370 / Off-Target 11.1 % (n=9)
  - vag: Recall 0.333 / Off-Target 0.0 % (n=4 — die 3 Edge-Cases der vag-Klasse sind separat ausgewiesen)
- **Edge-Cases (n=3):** 0 mit Off-Target-Leak, 0 mit leerer Matcher-Liste — der Matcher liefert für alle drei Edge-Cases ein Top-3, statt eine Klärungsfrage zu signalisieren. Das ist kein Off-Target-Hit (die `expected_off_target`-IDs sind nicht in den Top-3 der Edge-Cases gelandet), aber ein klarer Phase-2-Auftrag (MATCH-03 / Klärungsfrage-Logik).
- **Latenz/Eintrag:** 2.63s avg (Spanne 2.15s – 3.38s)
- **Gesamtkosten:** 0,79 ¢ (USD = EUR-Cent bei aktueller pricing.ts-Konvention) bei 53.330 Tokens / 22 LLM-Calls
- **Report:** `data/eval/reports/2026-05-03-08-15-33.json` (mit Markdown-Twin `2026-05-03-08-15-33.md`)
- **Run-Befehl:** `npx tsx --env-file=.env.local scripts/eval-matcher.ts --md-summary`

### Schwächste Kategorie: kurz

- Recall 0.222 (niedrigster Wert über alle Kategorien) und gleichzeitig die höchste Off-Target-Rate (16.7 %) — der Matcher hat die größten Probleme bei knappen Anliegen ohne Schul-Profil-Felder.
- Auffällig: ev-013 (Mathe-Wettbewerbe ohne Bundesland) → kein einziger der drei erwarteten Mathe-Wettbewerbs-IDs (`kaenguru-der-mathematik`, `mathe-im-advent`, `bundeswettbewerb-mathematik`) in Top-3. Stattdessen Hector-Kinderakademie + Playmobil-HOB-Preis + Ferry-Porsche-Challenge. Das ist ein klares MATCH-02-Tuning-Ziel für Phase 2.
- ev-016 (Mehrsprachige Bibliothek NRW) → Recall 0.0, Top-3 enthält Kultur-macht-stark + RAG-Stiftung statt der drei Sprache/Integration-Programme.

### Stabilstes Profil: ausführliche Anliegen mit klarem Domain-Kern

- Recall 0.370 ist nicht beeindruckend, aber besser als die anderen Kategorien.
- ev-001 (Schulgarten Berlin), ev-002 (Tablets Berlin), ev-007 (Erasmus+ Polen) erreichen Recall 0.67–1.00.
- Schwach: ev-004 (Forscher-AG MINT-Grundschule, Recall 0.00), ev-008 (Förderschule Inklusion, Recall 0.33 trotz klarem Goldstandard), ev-011 (Maker-Space MINT, Recall 0.00). Hier rutschen die drei naheliegendsten programmIds wiederholt aus den Top-3 — Tuning-Hypothese: der Prefilter oder das LLM-Ranking gewichtet Schul-Geräte (DigitalPakt) systematisch über fachthematische Programme (`stiftung-kinder-forschen`, `first-lego-league`).

### Kategorisierungs-Hinweis

Die Korpus-Verteilung ist offiziell 6 kurz / 9 ausführlich / 7 vag (3 davon Edge-Cases mit `expected_top3=[]`). Die Aggregation ordnet aber `kurz/ausführlich/vag` über `nonEdge` (Eintraege mit `recall !== null`) — die 3 Edge-Cases sind alle in der vag-Kategorie, daher zeigt der Bericht für vag nur 4 statt 7 Einträge. Das ist Skript-Verhalten gemäß D-11.

### Off-Target-Beobachtung

Nur 2 von 19 Nicht-Edge-Einträgen haben einen Off-Target-Leak (10.5 % gesamt):

- ev-002 (Tablets Berlin): `aktion-mensch-schulkooperation` als Off-Target landete in Top-3 (Position 3) — Inklusions-Drift bei Geräte-Anliegen.
- ev-009 (Klimaschule Hessen): `aktion-mensch-schulkooperation` als Off-Target landete in Top-3 (Position 2) — wieder Inklusions-Drift bei thematisch klar abgegrenztem Anliegen (Klima/BNE).

Beide Off-Target-Hits zeigen denselben Drift: der Matcher zieht Aktion-Mensch in Top-3, auch wenn der Anliegen-Kontext keine Inklusion enthält. Phase-2-Hypothese: explizite De-Prioritization für Programme, die ohne expliziten Inklusions-Bezug im Anliegen rutschen.

### Was die Baseline NICHT misst

- Run-Stabilität: dies ist ein einzelner Live-Run. Plan 01-01-SUMMARY hat dokumentiert, dass DeepSeek-Calls zwischen Läufen variieren (im Stub-Korpus sprang Off-Target-Rate von 0 % auf 50 %). Die Phase-2-Tuning-Schleife sollte mehrere Läufe mitteln oder `temperature=0` setzen.
- Position-Awareness: Recall@3 zählt jeden der drei Plätze gleich. Eine Pos1-Treffer-Quote könnte Tuning-Tradeoffs sichtbarer machen — verworfen für Phase 1 (D-Deferred), erwogbar für Phase 2.
- Reasoning-Qualität (MATCH-02): die `begruendung`-Felder im Matcher-Output sind im Snapshot enthalten, werden aber nicht systematisch evaluiert. Phase 2 baut MATCH-02 auf.
