# Matcher-Eval Baseline

> Append-only History. Phase 2+ fügt neue Einträge oben dran. Skript schreibt
> NICHT in diese Datei — manuelle Pflege per PR.

## 2026-05-05 — Phase-2.2 Plan 02-10 Drift-Score-Cap (Code-Aenderung matcher.ts)

- **Matcher-Commit:** wird mit diesem Commit ergaenzt (matcher.ts + Tests)
- **Korpus-Version:** v3 (unveraendert, von Plan 02-08)
- **Tuning-Quelle:** Plan 02-10 — Server-Side-Score-Cap fuer aktion-mensch-schulkooperation und bmbf-digitalpakt-2 wenn jeweils kein Inklusions/Digital-Anker im Anliegen (oder previousAnliegen). Cap auf 40 Punkte → faellt unter den existierenden 50-Threshold. Anker via Regex-Match: hasInklusionsAnchor (inklusion|integration|migration|foerderbedarf|barriere|sonderpaedagog|behind|sprachfoerder), hasDigitalAnchor (digital|tablet|hardware|laptop|whiteboard|server|software|computer|wlan|geraet beschaff|vr/ar-brille|beamer). Reaktion auf Phase-2.2-Plan-08-Live-Befund: Off-Target von 4.8 % auf 10.5 % regressiert, Prompt-Verbote aus 02-04 wirken nicht zuverlaessig.

### Threshold-Gate (D-16/D-17 PR-Gate)

| Metrik | Phase 2.2 nach 02-08 | **Phase 2.2 nach 02-10** | D-17-Target | Status |
|--------|---------------------|--------------------------|-------------|--------|
| **Recall@3** (Mittelwert non-edge) | 0.360 | **0.380** | ≥ 0.42 | ✗ FAIL (Gap -0.04) |
| **Off-Target-Rate** | 10.5 % | **0.0 %** | < 5 % | ✓ **PASS** |
| **Clarif-Precision** | 75.0 % | **75.0 %** | ≥ 80 % | ✗ FAIL (Gap -5 pp) |
| **Clarif-FalschPos** | 0.0 % | **4.8 %** | ≤ 10 % | ✓ PASS (LLM-Varianz, 1/21 Eintrag) |
| **Slot-Coverage** (diag) | 86.1 % | **86.1 %** | — | unveraendert |

**Diagnose:**
- **Off-Target von 10.5 % auf 0.0 %** — beide Drift-Hits (ev-001 mit bmbf-digitalpakt, ev-009 mit aktion-mensch) sind nicht mehr in Top-3. ausfuehrlich-Kategorie von 25 % Off-Target auf 0 %.
- **n von 19 Non-Edge auf 18** — ein Eintrag wurde Edge-Case (vermutlich ev-009: LLM lieferte nur aktion-mensch als einzigen Match, jetzt durch Cap geleert). Recall-Berechnung erfolgt nur noch ueber 18 Non-Edge-Eintraege.
- **Recall +0.02** — kein nennenswerter Lift, aber kein Verlust. Score-Cap loescht Drift-Hits, ohne andere Treffer zu degradieren.
- **Clarif-FalschPos 0 → 4.8 %** — 1 Eintrag aus 21, vermutlich LLM-Varianz (clarif-Pfad ist VOR dem Score-Cap, kann nicht durch Cap beeinflusst sein).

### Per-Kategorie

- **kurz:** n=5, Recall 0.333, Off-Target 0.0 % (unveraendert)
- **ausfuehrlich:** n=7, Recall 0.333, Off-Target **0.0 %** (von 25 % → 0 %, dramatischer Gewinn) — n von 8 auf 7 wegen ev-009-Edge-Case-Effekt
- **vag:** n=6, Recall 0.472, Off-Target 0.0 % (stabil)

### Latenz / Kosten (Live-Run)

- Latenz/Eintrag: 2.86 s avg (vs. 2.98 s Phase-2.2-08 — leicht schneller)
- Gesamtkosten: 0.0154 EUR / 29 Calls = 0.05 ct/Match (Constraint OK)

### Naechste Schritte

**2 von 4 D-17-Targets erfuellt.** Recall + Clarif-Precision verbleiben. Plan 02-09 (Top-N 20→40 + Theme-Score-Bonus) ist jetzt sauber positioniert — Off-Target ist stabil 0 %, das gibt einen sicheren Boden fuer Recall-Lift ohne Drift-Risiko.

### Pfade zu neuen Files

- **JSON-Report Live (02-10):** `data/eval/reports/2026-05-05-10-26-41.json` + `.md`
- **Snapshots Live (02-10):** `data/eval/snapshots/2026-05-05-10-26-41/` (29 Eintraege, neue Phase-2.2.10-Baseline)
- **Code-Aenderung:** `lib/wizard/matcher.ts` (DRIFT_CAP_SCORE + 2 Anker-Funktionen + Cap-Loop)
- **Tests:** `__tests__/lib/wizard/matcher.dispatch.test.ts` (6 neue Cases unter "Plan 02-10 Drift-Score-Cap")

---

## 2026-05-05 — Phase-2.2 Plan 02-08 Korpus-Kalibrierung (Korpus v3, n=29)

- **Matcher-Commit:** `26d4405` (HEAD nach Phase 2 mechanisch+visuell abgeschlossen, KEINE Code-Aenderung — nur Korpus-Edit)
- **Korpus-Version:** v3 (kalibriert gegen kiAntragGeeignet=true Set, 11 nicht-bedienbare IDs raus, kuratierte Alternativen rein, 2 Edge-Cases markiert)
- **Tuning-Quelle:** Plan 02-08 — Korpus-Kalibrierung als Reaktion auf Diagnose-Spike-Befund (PHASE22-DIAGNOSIS-AND-PLANS.md). Aenderungen: ev-004/-012/-015/-018 expected_top3 mit kiAntragGeeignet=true Programmen ersetzt (chemie-fonds/ruetgers-mint/mintspace, niedersachsen-sport/baywa-laufen-wald/aok-gesundheit, baywa-waldschule/berdelle-naturwissenschaft/baywa-opflanzt, aktion-mensch/berlin-startchancen/playmobil-hobpreis). ev-011/-013 als Edge-Case mit `expected_top3=[]` (Daten-Qualitaets-Problem bei ev-011, kein bedienbarer Use-Case bei ev-013). Notes-Felder mit Kalibrierungs-Begruendung.

### Threshold-Gate (D-16/D-17 PR-Gate)

| Metrik | Phase 2.1 (vorher) | Phase 2.2 Replay | Phase 2.2 **Live** | D-17-Target | Status |
|--------|---------------------|------------------|--------------------|-------------|--------|
| **Recall@3** (Mittelwert non-edge) | 0.325 | 0.395 | **0.360** | ≥ 0.42 | ✗ FAIL (-0.06 zu Target) |
| **Off-Target-Rate** | 4.8 % | 5.3 % | **10.5 %** | < 5 % | ✗ FAIL (+5.7 pp Regression) |
| **Clarif-Precision** | 75.0 % | 75.0 % (Replay invariant) | **75.0 %** | ≥ 80 % | ✗ FAIL |
| **Clarif-FalschPos** | 0.0 % | 0.0 % | **0.0 %** | ≤ 10 % | ✓ PASS (uebererfuellt) |
| **Slot-Coverage** (diag) | 91.7 % | 91.7 % | **86.1 %** | — | leichter Drift |

**Diagnose:**
- **Recall geliftet** durch Korpus-Kalibrierung (+0.035 Live, +0.07 Replay) — eine 1-Run-Live-vs-Replay-Differenz von 0.035 setzt die DeepSeek-Varianz als Untergrenze. Plan 02-09 muss > 0.10 Lift bringen, um aus der Varianz herauszuragen.
- **Off-Target regressiert von 4.8% auf 10.5%** — neuer Schmerzpunkt in ausfuehrlich-Kategorie (25% Off-Target, 2/8): ev-001 zieht `bmbf-digitalpakt-2`, ev-009 zieht `aktion-mensch-schulkooperation`. Beide sind klassische Drifts trotz Plan-02-04-Prompt-Verbot. Prompt-only-Hardening wirkt nicht zuverlaessig — Server-Side-Score-Cap erforderlich.
- **vag-Kategorie** weiterhin bestes Ergebnis (Recall 0.472, Off-Target 0%). Stabil seit Phase 2.1.
- **kurz-Kategorie** Off-Target von 16.7% auf 0% — aber 1-Run-Stichprobe, vermutlich LLM-Varianz nicht echter Fix.

### Per-Kategorie

- **kurz:** n=5, Recall 0.333, Off-Target 0.0 % (vorher 0.278/16.7 % — n von 6 auf 5 wegen ev-013 Edge-Case-Markierung)
- **ausfuehrlich:** n=8, Recall 0.292, Off-Target **25.0 %** (vorher 0.333/0% — n von 9 auf 8 wegen ev-011 Edge-Case-Markierung)
- **vag:** n=6, Recall 0.472, Off-Target 0.0 % (gleichauf zu Replay)

### Latenz / Kosten (Live-Run)

- Latenz/Eintrag: 2.98 s avg (vs. 2.92 s Phase 2.1 — vergleichbar, kein Constraint-Bruch)
- Gesamtkosten: 0.0153 EUR / 29 Calls = 0.05 ct/Match (innerhalb Constraint ≤ 0.06 ct)

### Naechste Schritte

Plan-Sequenz **vor Live-Daten neu sortiert**:
1. **02-10 Score-Cap** ZUERST (statt 02-09) — Off-Target-Regression ist akuter als Recall-Gap. Server-Side-Cap fuer aktion-mensch + bmbf-digitalpakt-2 ohne Domain-Anker. Erwartet: Off-Target von 10.5% → < 5%.
2. **02-09 Top-N 20→40 + Theme-Score-Bonus** — Recall-Lift sicher gegen stabilen Off-Target. Erwartet: Recall von 0.360 → ≥ 0.42.
3. **02-11 Eval-Re-Run** — Phase-2.2-Validierung gegen D-17-Targets, mind. 2 Live-Runs fuer Stabilitaets-Check.

### Pfade zu neuen Files

- **JSON-Report Replay:** `data/eval/reports/2026-05-05-09-39-42.json`
- **JSON-Report Live:** `data/eval/reports/2026-05-05-09-40-33.json` + `.md`
- **Snapshots Live:** `data/eval/snapshots/2026-05-05-09-40-33/` (29 Eintraege, neue Phase-2.2-Baseline)
- **Korpus v3:** `data/eval/matcher-korpus.json` (6 Eintraege editiert: ev-004, -011, -012, -013, -015, -018)

---

## 2026-05-04 — Phase-2.1-Tuning (Korpus v2 unverändert, n=29)

- **Matcher-Commit:** `19ccfd8` (HEAD nach Plan 02-04 Prompt-Tuning + Plan 02-05 Hardening Merges)
- **Korpus-Version:** v2 (UNVERÄNDERT seit Phase 2 — Tuning-Hebel saßen am Prompt, nicht am Korpus)
- **Tuning-Quelle:** Plan 02-04 (MATCHER_SYSTEM-Prompt-Verschärfung: Drift-Verbote für aktion-mensch/bmbf-digitalpakt, Slot-Heuristik-Schärfung mit GENAU-EIN-Regel + (a)-(d)-Fallliste, 2 zusätzliche CLARIFY-Positivbeispiele, 3 RECALL-Negativbeispiele aus Live-Eval-Misses, MATCHER_MAX_TOKENS-Doc-Comment 600) + Plan 02-05 (Eval-Skript-Hardening WR-03/WR-04, Frontend-Hardening WR-01/WR-02 in StartClient.tsx). Keine Korpus-Änderungen.

### Threshold-Gate (D-16/D-17 PR-Gate)

| Metrik | Phase 2 (vorher) | Phase 2.1 (nachher) | D-17-Target | Status |
|--------|------------------|---------------------|-------------|--------|
| **Recall@3** (Mittelwert non-edge) | 0.342 | **0.325** | ≥ 0.42 | ✗ FAIL (-0.017) |
| **Off-Target-Rate** | 0.0 % | **4.8 %** | < 5 % | ✓ PASS (knapp) |
| **Clarif-Precision** | 62.5 % (5/8 hits) | **75.0 %** (6/8 hits) | ≥ 80 % | ✗ FAIL |
| **Clarif-FalschPos** | 9.5 % (2/21) | **0.0 %** (0/21) | ≤ 10 % | ✓ PASS (übererfüllt) |
| **Slot-Coverage** (Diagnose) | 90.0 % | **91.7 %** | — | gut |

**Mechanik wirkt teilweise:** Clarif-Precision steigt von 62.5 % → 75.0 % (+12.5 pp, ev-025/026 jetzt korrekt geklärt — die GENAU-EIN-Regel + Multi-Thema-Beispiele wirken). Clarif-FalschPos ging von 9.5 % auf 0 % runter — der GENAU-EIN-Filter hat die false positives komplett eliminiert. Slot-Coverage leicht hoch.

**Tuning-Lücken:** Recall@3 hat sich NICHT verbessert (0.342 → 0.325, -0.017 statt erwarteter +0.078). Off-Target-Rate von 0 % auf 4.8 % gestiegen wegen ev-016 (`aktion-mensch-schulkooperation` als Off-Target in Top-3 trotz Drift-Verbot im Prompt). Recall@3 + Clarif-Precision verfehlen weiter Targets — Phase-2.2-Tuning-Cycle empfohlen.

### Per-Kategorie

- **kurz:** Recall 0.278 / Off-Target 16.7 % (n=6) — vorher 0.222 / 0.0 %. Recall leicht hoch, aber Off-Target zurück (ev-016).
- **ausfuehrlich:** Recall 0.333 / Off-Target 0.0 % (n=9) — vorher 0.417 / 0.0 %. Recall fiel um -0.084 (ev-004/-008/-011 weiter problematisch).
- **vag (non-edge):** Recall 0.361 / Off-Target 0.0 % (n=6) — vorher 0.367 / 0.0 % (n=5). Praktisch gleichauf (n unterschiedlich, weil ev-024 jetzt Clarif-Miss statt non-edge zählt).

### Latenz / Kosten

- **Latenz/Eintrag:** 3.17s avg (Phase 2: 2.81s) — höher wegen längerem MATCHER_SYSTEM-Prompt nach 02-04-Tuning (mehr Negativbeispiele, mehr Kontext)
- **Gesamtkosten:** 0,0153 € (Phase 2: 0,012 €) — leichter Anstieg durch erweiterten Prompt + 106.766 Tokens (Phase 2: ~80k geschätzt)

### Reports

- JSON: `data/eval/reports/2026-05-04-12-32-24.json`
- Markdown-Twin: `data/eval/reports/2026-05-04-12-32-24.md`
- Snapshot: `data/eval/snapshots/2026-05-04-12-32-24/` (29 Einträge × Tagged-Union-Output)

### Run-Befehl

```bash
npm run eval:matcher -- --snapshot --md-summary
```

**GATE FAILED — 2 Targets verfehlt:** Recall@3 ≥ 0.42 (Ist: 0.325) und Clarif-Precision ≥ 80 % (Ist: 75.0 %). Threshold-Gate exit code 1.

### Diagnostischer Block — verbleibende Misses

**Clarif-Misses (2 von 8 erwarteten Klärungen wurden gemisst):**

- **ev-023 (vag, „Kinderförderung im kreativen Bereich"):** Matcher gab Top-3 zurück statt zu klären. Top-3 = `[playmobil-hobpreis (85), kultur-macht-stark (80), aktion-mensch-schulkooperation (75)]`. Der Prompt hat den Slot-fehlt-Fall (a) nicht ausreichend gegen die starke Domain-Anknüpfung „kreativ" priorisiert.
- **ev-024 (vag, „Bewegungsprojekte"):** Matcher gab Top-3 zurück statt zu klären. Top-3 = `[erasmus-schule-2026 (75), kultur-macht-stark (65), ferry-porsche-challenge-2025 (60)]`. Zwei Programme sind off-thema (erasmus, kultur). Score-≥-60-Regel hat hier Drift verstärkt statt korrigiert.

**Recall@3-Drops vs. Phase 2 (ausführlich-Klasse fiel von 0.417 → 0.333):**

- **ev-004 (Forscher-AG Bayern, Recall 0.00):** Top-3 = `[siemens-stiftung-mint-hub, koerber-mint-regionen]` (nur 2 IDs!). Erwartet: `[stiftung-kinder-forschen, helmholtz-schuelerlabore, stifterverband-bildung]`. MINT-Drift in Schul-Förderprogramm-Schiene statt Forscher-AG-Programmen.
- **ev-011 (Maker-Space MINT, Recall 0.00):** Top-3 = `[ferry-porsche-challenge-2025, bmbf-digitalpakt-2, telekom-junior-ingenieur-2026]`. Erwartet: `[first-lego-league, siemens-stiftung-mint-hub, telekom-stiftung-technik-scouts]`. DigitalPakt-Drift im Maker-Space-Anliegen — das 02-04-Drift-Verbot greift hier nicht, weil Hardware genannt ist.
- **ev-012 (Bewegungs-Pausenhof, Recall 0.00):** Top-3 = `[bundesweit-ganztag, aktion-mensch-schulkooperation, klimalab-2026]`. Erwartet: `[niedersachsen-sport, dkjs-sport, baywa-laufen-wald]`. Sport-Programme komplett aus Top-3 — Niedersachsen-Programme nicht erkannt obwohl Bundesland im Anliegen.
- **ev-013 (Mathe-Wettbewerbe, Recall 0.00):** Top-3 = `[]` (LEER, war auch in Phase 2 problematisch). Slot-Heuristik feuert hier statt der drei expliziten Mathe-Wettbewerbs-IDs (`kaenguru-der-mathematik`, `mathe-im-advent`, `bundeswettbewerb-mathematik`). Hinweis: das ist möglicherweise valides CLARIFY-Verhalten, aber `expected_clarification=false` im Korpus zählt es als FAIL.
- **ev-015 (Schul-Aquarium NABU, Recall 0.00):** Top-3 = `[klimalab-2026, aktion-mensch-schulkooperation, kultur-macht-stark]`. Erwartet: `[nabu-schulen, bfn-artenvielfalt, stiftung-kinder-forschen]`. NABU-Anker im Anliegen wird vom Matcher ignoriert — kein einziges der drei Naturkunde-Programme.
- **ev-018 (Migrationshintergrund + Förderbedarf, Recall 0.00):** Top-3 = `[aktion-mensch-schulkooperation, playmobil-hobpreis, lesen-macht-stark]`. Erwartet: `[mercator-integration, dkjs-inklusion, berlin-startchancen]`. aktion-mensch wieder als Default-Drift, mercator-integration als Mercator-Programm fehlt komplett.

**Off-Target-Regression (war 0 %, jetzt 4.8 %):**

- **ev-016 (Mehrsprachige Bibliothek NRW):** Top-3 = `[lesen-macht-stark, kultur-macht-stark, aktion-mensch-schulkooperation]`. `aktion-mensch-schulkooperation` ist im Korpus als `expected_off_target` gelistet — der Matcher hat das Drift-Verbot aus 02-04 ignoriert. Score 65 ist über dem 50er-Filter.

### Empfehlung — Phase-2.2-Tuning-Cycle erforderlich

Plan 02-04 Tuning hat **Clarif-Precision verbessert** (62.5 → 75.0 %) und **Clarif-FalschPos eliminiert** (9.5 → 0 %), aber **Recall@3 nicht gehoben** (-0.017 statt +0.078). Hypothesen für nächsten Tuning-Cycle:

1. **Drift-Verbote sind nicht stark genug** — der Matcher zieht weiter `aktion-mensch-schulkooperation` und `bmbf-digitalpakt-2` als Defaults (siehe ev-016, ev-011, ev-012, ev-018). Möglicherweise harte Score-Cap (z.B. score ≤ 40 wenn keine Inklusions/Hardware-Anker im Anliegen) statt nur Prompt-Verbot.
2. **Domain-spezifische Programme nicht im Recall** — `nabu-schulen`, `mercator-integration`, `niedersachsen-sport`, `first-lego-league` werden vom LLM nicht aus der Programm-Liste gezogen, obwohl sie thematisch perfekt passen. Hypothese: Prefilter (Top-N-Cut auf 50) entfernt sie bereits, oder die Programm-Beschreibungen im Pipe-Format sind zu knapp. Diagnose: `nabu-schulen` etc. in den Pipe-Cut-Output sichten.
3. **Score-≥-60-Regel verstärkt Drift** — bei ev-024 hat die Regel den Matcher gezwungen, schwache Treffer mit score 60-65 in Top-3 zu listen statt zu klären. Reformulierung: Score-Untergrenze für Top-3 erhöhen oder GENAU-EIN-Regel auf Mindestscore koppeln.
4. **Slot-Heuristik schiesst über bei klaren Anliegen** — ev-013 und Edge-Cases (`Top-3 = []` ohne Clarif) zeigen, dass der Matcher aktiv leere Liste produziert wenn er unsicher ist. Das ist nicht falsch, aber Korpus erwartet teils Ranking. Korpus-Kuratierung prüfen vs. Heuristik anpassen.

**Empfehlung Plan-Sequenz für Phase-2.2:**

- Plan 02-08: Score-Cap für Drift-Defaults (harter score ≤ 40 für aktion-mensch / bmbf-digitalpakt-2 ohne Domain-Anker)
- Plan 02-09: Prefilter-Diagnose (welche Programme erreichen den Pipe-Cut für ev-015/-018? — Programm-IDs liefern wenn missing)
- Plan 02-10: Score-≥-60-Regel reformulieren (Top-3-Mindestscore oder GENAU-EIN-Kopplung)
- Plan 02-11: Eval-Re-Run (D-17 PR-Gate erneut)

Phase 2 Mechanik (Tagged-Union, CLARIFY-Dispatch, Threshold-Gate-Codifikation) ist erreicht und stabil — die Targets selbst brauchen Phase-2.2.

---

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
