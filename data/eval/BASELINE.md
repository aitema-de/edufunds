# Matcher-Eval Baseline

> Append-only History. Phase 2+ fügt neue Einträge oben dran. Skript schreibt
> NICHT in diese Datei — manuelle Pflege per PR.

## 2026-05-04 — Phase-2-Baseline (Korpus v2, n=29)

- **Matcher-Commit:** `bae73db` (HEAD von `feature/wizard-adaptive` nach Wave-2-Merges)
- **Korpus-Version:** v2, 29 Einträge (kurz: 6, ausführlich: 9, vag: 14 — davon Edge-Cases: 10, mit `expected_clarification=true`: 8, Anti-Beispiele `expected_clarification=false`: 2)
- **Korpus-Erweiterung gegenüber v1:** +7 neue Vague-Einträge (ev-023 bis ev-029) abdeckend D-13/D-14: 3× Slot-fehlt-Kombo (Typ 1: ev-023/024/029), 2× Multi-Thema ohne Schwerpunkt (Typ 2: ev-025/026), 2× Anti-Beispiele mit allen Slots klar (Typ 3: ev-027/028). Plus 3 D-13-Backports (ev-003, ev-019, ev-022) bekommen `expected_clarification` + `expected_missing_slots`.

### Threshold-Gate (D-16/D-17 PR-Gate)

| Metrik | Phase 1 (v1, n=22) | Phase 2 (v2, n=29) | D-17-Target | Status |
|--------|---------------------|---------------------|-------------|--------|
| **Recall@3** (Mittelwert non-edge) | 0.316 | **0.342** | ≥ 0.42 | ✗ FAIL (+0.026) |
| **Off-Target-Rate** | 10.5 % | **0.0 %** | < 5 % | ✓ PASS (übererfüllt) |
| **Clarif-Precision** | n/a | **62.5 %** (5/8 hits) | ≥ 80 % | ✗ FAIL |
| **Clarif-FalschPos** | n/a | **9.5 %** (2/21) | ≤ 10 % | ✓ PASS (knapp) |
| **Slot-Coverage** (Diagnose) | n/a | 90.0 % | — | gut |

**Mechanik wirkt:** Edge-Cases triggern jetzt korrekt leere Liste (9/10 vs. 0/3 in Phase 1). Off-Target ging von 10.5 % auf 0 %. CLARIFY-Trigger funktioniert dem Grunde nach.

**Tuning-Lücken:** 3 erwartete Klärungen werden gemisst (Clarif-Precision 62.5 %), und das Recall-Tuning hat sich nur marginal verbessert (+0.026). Beides sind Phase-2.1-Gap-Closure-Kandidaten.

### Per-Kategorie

- **kurz:** Recall 0.222 / Off-Target 0.0 % (n=6) — kein Fortschritt zur Phase 1 (war 0.222 / 16.7 %), aber Off-Target eliminiert
- **ausfuehrlich:** Recall 0.417 / Off-Target 0.0 % (n=8) — Phase 1 war 0.370 / 11.1 %, also leicht besser
- **vag (non-edge):** Recall 0.367 / Off-Target 0.0 % (n=5) — Phase 1 war 0.333 / 0.0 % (n=4), praktisch gleichauf

### Latenz / Kosten

- **Latenz/Eintrag:** 2.81s avg (Phase 1: 2.63s) — leicht höher wegen längerem MATCHER_SYSTEM-Prompt + Tagged-Union-Output
- **Gesamtkosten:** 0,012 € (Phase 1: 0,79 ¢) — Größenordnung bleibt gleich, leichter Anstieg durch Korpus-Wachstum

### Reports

- JSON: `data/eval/reports/2026-05-04-08-07-48.json`
- Markdown-Twin: `data/eval/reports/2026-05-04-08-07-48.md`
- Snapshot: `data/eval/snapshots/2026-05-04-08-07-48/` (29 Einträge × Tagged-Union-Output)

### Run-Befehl

```bash
npm run eval:matcher -- --snapshot --md-summary
```

Threshold-Gate-Fail (`process.exit(1)`) wirkt bei jedem Lauf — Phase-2.1 muss Recall@3 + Clarif-Precision auf Targets bringen, dann läuft der Gate grün.

---

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
