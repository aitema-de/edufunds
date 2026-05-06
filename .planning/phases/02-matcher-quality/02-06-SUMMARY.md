---
phase: 02-matcher-quality
plan: 06
subsystem: matcher-eval
tags: [eval-rerun, threshold-gate, baseline, gate-failed, diagnose]
gap_closure: true
requirements: [MATCH-02, MATCH-03]
dependency-graph:
  requires:
    - "02-04: MATCHER_SYSTEM-Tuning + WR-05 Score-Range-Filter"
    - "02-05: Eval-Skript-Hardening WR-03/WR-04 + Frontend-Hardening WR-01/WR-02"
  provides:
    - "Phase-2.1-Tuning-Eintrag in BASELINE.md mit ehrlicher Diagnose"
    - "Diagnostischer Block fuer Phase-2.2-Tuning-Cycle (4 Hypothesen, 4 Folge-Plans empfohlen)"
  affects:
    - "Phase 2 Mechanik abgeschlossen, Phase 2.2 Targets erforderlich"
tech-stack:
  added: []
  patterns:
    - "Append-only BASELINE.md-Pattern (Phase-2.1 ueber Phase-2 ueber Phase-1)"
    - "Force-Add fuer gitignored data/eval/reports/ + snapshots/ (D-17-Pattern)"
    - "Ehrliche Gate-FAILED-Dokumentation mit Diagnostik statt Schoenfaerben"
key-files:
  created:
    - "data/eval/reports/2026-05-04-12-32-24.json (Live-Eval JSON, 36k)"
    - "data/eval/reports/2026-05-04-12-32-24.md (Markdown-Twin)"
    - "data/eval/snapshots/2026-05-04-12-32-24/ (29 Eintraege x Tagged-Union-Output)"
  modified:
    - "data/eval/BASELINE.md (+85 Zeilen Phase-2.1-Eintrag, append-only)"
decisions:
  - "GATE FAILED ehrlich dokumentiert statt Tuning-Iteration in 02-06 — separater Phase-2.2-Cycle empfohlen (Plan 02-08 bis 02-11)"
  - "Off-Target-Regression von 0 % auf 4.8 % als Status PASS-knapp dokumentiert (4.8 % < 5 %, aber Regression vs. Phase 2)"
  - "ev-013 (`Top-3 = []` ohne Clarif) als ambivalentes Verhalten markiert — moeglicherweise valides CLARIFY, aber Korpus zaehlt es als FAIL"
metrics:
  duration_minutes: 7
  completed_date: "2026-05-04"
---

# Phase 02 Plan 06: Phase-2.1-Eval-Re-Run Summary

Live-Matcher-Eval gegen Phase-2-Korpus (n=29 unveraendert) nach Plan 02-04 Prompt-Tuning + Plan 02-05 Hardening. **Threshold-Gate FAILED** (exit code 1) — 2 von 4 Targets verfehlt. Phase-2.1-Eintrag in BASELINE.md mit ehrlicher Diagnose + Empfehlung fuer Phase-2.2-Tuning-Cycle.

## Eval-Run-Resultat

| Metrik | Phase 2 (vorher) | Phase 2.1 (nachher) | D-17-Target | Status | Delta |
|--------|------------------|---------------------|-------------|--------|-------|
| **Recall@3** | 0.342 | **0.325** | >= 0.42 | FAIL | -0.017 |
| **Off-Target-Rate** | 0.0 % | **4.8 %** | < 5 % | PASS knapp | +4.8 pp |
| **Clarif-Precision** | 62.5 % (5/8) | **75.0 %** (6/8) | >= 80 % | FAIL | +12.5 pp |
| **Clarif-FalschPos** | 9.5 % | **0.0 %** (0/21) | <= 10 % | PASS uebererfuellt | -9.5 pp |
| **Slot-Coverage** | 90.0 % | **91.7 %** | (Diagnose) | gut | +1.7 pp |

**Erwartung aus Plan 02-04:** Recall@3 +0.078 -> 0.42 (Tuning erwartete +0.078). **Realitaet:** -0.017. Differenz: -0.095.

**Erwartung Clarif-Precision:** 62.5 -> >= 80. **Realitaet:** 75.0 (+12.5 pp). Verfehlt um -5 pp.

## Per-Kategorie-Delta

| Kategorie | n | Recall@3 (Ph2) | Recall@3 (Ph2.1) | Off-Target (Ph2) | Off-Target (Ph2.1) |
|-----------|---|----------------|------------------|------------------|---------------------|
| kurz | 6 | 0.222 | **0.278** | 0.0 % | **16.7 %** |
| ausfuehrlich | 9 | 0.417 | **0.333** | 0.0 % | **0.0 %** |
| vag | 6 (5 in Ph2) | 0.367 | **0.361** | 0.0 % | **0.0 %** |

- **kurz:** Recall +0.056 (positiv), aber Off-Target von 0 % auf 16.7 % regrediert (1 Hit auf 6) wegen ev-016.
- **ausfuehrlich:** Recall -0.084 (Regression). ev-004/-008/-011 weiter problematisch.
- **vag (non-edge):** Recall praktisch gleichauf, n unterschiedlich, weil ev-024 jetzt Clarif-Miss statt non-edge zaehlt.

## Diagnose — verbleibende Misses (mit ev-IDs)

### Clarif-Misses (2 von 8 erwarteten Klaerungen verfehlt)

| ev-ID | Anliegen | Top-3 (statt Klaerung) | Diagnose |
|-------|----------|------------------------|----------|
| **ev-023** | Kreative Kinderfoerderung (vag) | playmobil-hobpreis (85), kultur-macht-stark (80), aktion-mensch (75) | Slot-fehlt-Fall (a) wurde nicht gegen Domain-Anker „kreativ" priorisiert |
| **ev-024** | Bewegungsprojekte (vag) | erasmus-schule-2026 (75), kultur-macht-stark (65), ferry-porsche (60) | Score->=60-Regel hat Drift verstaerkt statt zu klaeren |

### Recall@3 Drops (vs. Phase 2)

| ev-ID | Anliegen | Top-3 (Ist) | Erwartet | Recall |
|-------|----------|-------------|----------|--------|
| **ev-004** | Forscher-AG Bayern (ausfuehrlich) | siemens-mint, koerber-mint (nur 2 IDs!) | stiftung-kinder-forschen, helmholtz-schuelerlabore, stifterverband-bildung | 0.00 |
| **ev-011** | Maker-Space MINT (ausfuehrlich) | ferry-porsche, bmbf-digitalpakt-2, telekom-jia | first-lego-league, siemens-mint-hub, telekom-technik-scouts | 0.00 |
| **ev-012** | Bewegungs-Pausenhof Niedersachsen (kurz) | bundesweit-ganztag, aktion-mensch, klimalab | niedersachsen-sport, dkjs-sport, baywa-laufen-wald | 0.00 |
| **ev-013** | Mathe-Wettbewerbe (kurz) | `[]` (LEER) | kaenguru-math, mathe-im-advent, bundeswettbewerb-math | 0.00 |
| **ev-015** | Schul-Aquarium NABU (kurz) | klimalab, aktion-mensch, kultur-macht-stark | nabu-schulen, bfn-artenvielfalt, stiftung-kinder-forschen | 0.00 |
| **ev-018** | Migrationshintergrund + Foerderbedarf (vag) | aktion-mensch, playmobil, lesen-macht-stark | mercator-integration, dkjs-inklusion, berlin-startchancen | 0.00 |

### Off-Target-Regression (war 0 %, jetzt 4.8 %)

| ev-ID | Anliegen | Off-Target-ID in Top-3 |
|-------|----------|------------------------|
| **ev-016** | Mehrsprachige Bibliothek NRW | aktion-mensch-schulkooperation (Score 65, Position 3) |

Drift-Verbot aus 02-04 hat hier nicht durchgegriffen.

## Was funktioniert hat (Phase-2.1-Hebel)

- **GENAU-EIN-Regel + Multi-Thema-Beispiele:** ev-025 + ev-026 (mehrere widerspruechliche Themen) jetzt korrekt geklaert (in Phase 2 verfehlt). Clarif-Precision von 5/8 auf 6/8 -> 75 %.
- **Clarif-FalschPos eliminiert:** 9.5 % -> 0 %. ev-027 + ev-028 (Anti-Beispiele) bleiben Ranking statt zu klaeren. Kein Regress.
- **Slot-Coverage marginal hoch:** 90 % -> 91.7 %.
- **vag-Kategorie stabil:** Recall + Off-Target unveraendert in vag-non-edge.

## Was nicht funktioniert hat (Hypothesen)

1. **Drift-Verbote zu schwach** — Prompt-basiertes Verbot fuer aktion-mensch + bmbf-digitalpakt-2 reicht nicht. ev-016, ev-011, ev-012, ev-018 zeigen weitere Drifts. Hypothese: harter Score-Cap (z.B. score <= 40 ohne Inklusions/Hardware-Anker) statt Prompt-Verbot.

2. **Domain-spezifische Programme nicht im Pipe-Cut** — `nabu-schulen`, `mercator-integration`, `niedersachsen-sport`, `first-lego-league` werden vom LLM nicht aus der Programm-Liste gezogen. Hypothese: Prefilter (Top-N-Cut auf 50) entfernt sie bereits, oder Pipe-Format-Beschreibungen sind zu knapp. Diagnose erforderlich.

3. **Score->=60-Regel verstaerkt Drift** — bei ev-024 zwingt die Regel den Matcher, schwache Treffer in Top-3 zu listen statt zu klaeren. Reformulierung: Top-3-Mindestscore oder GENAU-EIN-Kopplung.

4. **Slot-Heuristik schiesst ueber bei klaren Anliegen** — ev-013 produziert leere Liste ohne Clarif-Trigger. Korpus-Annotationen vs. Heuristik pruefen.

## Pfade zu neuen Files

- **JSON-Report:** `data/eval/reports/2026-05-04-12-32-24.json` (36k)
- **Markdown-Twin:** `data/eval/reports/2026-05-04-12-32-24.md`
- **Snapshots:** `data/eval/snapshots/2026-05-04-12-32-24/` (29 ev-XXX.json files)
- **BASELINE.md:** Phase-2.1-Eintrag Zeilen 6-89 (oberhalb Phase-2-Eintrag Zeile 91)

## Acceptance-Criteria-Verifikation

| # | Kriterium | Erwartet | Ist |
|---|-----------|----------|-----|
| 1 | `ls -t data/eval/reports/*.json` neuestes Datum >= heute | ja | 2026-05-04-12-32-24.json |
| 2 | `ls -t data/eval/snapshots/` neuester Ordner >= heute | ja | 2026-05-04-12-32-24/ |
| 3 | `grep -c "Phase-2.1-Tuning" BASELINE.md` | == 1 | 1 |
| 4 | `grep -c "Phase-2-Baseline" BASELINE.md` | == 1 | 1 |
| 5 | `grep -c "Phase-1-Baseline" BASELINE.md` | == 1 | 1 |
| 6 | Header preserved | ja | "# Matcher-Eval Baseline" |
| 7 | Phase-2.1 oberhalb Phase-2 oberhalb Phase-1 | ja | Zeilen 6 < 91 < 138 |
| 8 | Alle 4 D-16-Metriken im Phase-2.1-Eintrag | ja | Recall@3, Off-Target-Rate, Clarif-Precision, Clarif-FalschPos |
| 9 | EVAL_EXIT_CODE != 0 -> ehrlich + Diagnose-Block | ja | "GATE FAILED" + Diagnostischer Block + Empfehlung |
| 10 | matcher-korpus.json unveraendert | n=29 | n=29 |
| 11 | Reports + Snapshots committet (force-add) | ja | 30 Files in Commit 989d3fa |

## Threshold-Gate-Resultat

**GATE FAILED** — 2 Targets verfehlt:
- Recall@3 = 0.325 < 0.42 (verfehlt um -0.095)
- Clarif-Precision = 75.0 % < 80 % (verfehlt um -5 pp)

2 Targets PASS:
- Off-Target-Rate = 4.8 % < 5 % (knapp, mit ev-016-Regression)
- Clarif-FalschPos = 0.0 % <= 10 % (uebererfuellt)

`process.exit(1)` wirkt. Threshold-Gate-Mechanik aus Plan 02-05 verifiziert funktional.

## Empfehlung naechster Schritt

**Phase-2.2-Tuning-Cycle erforderlich** — Phase 2 Mechanik (Tagged-Union, CLARIFY-Dispatch, Threshold-Gate-Codifikation) ist erreicht und stabil, aber die Targets selbst brauchen weitere Iteration.

Empfohlene Plan-Sequenz:

| Plan | Inhalt | Hypothese |
|------|--------|-----------|
| **02-08** | Score-Cap fuer Drift-Defaults | harter score <= 40 fuer aktion-mensch / bmbf-digitalpakt ohne Domain-Anker |
| **02-09** | Prefilter-Diagnose | welche Programme erreichen Pipe-Cut fuer ev-015/-018? Top-N erhoehen oder Beschreibungen anreichern |
| **02-10** | Score->=60-Regel reformulieren | GENAU-EIN-Kopplung oder Top-3-Mindestscore |
| **02-11** | Eval-Re-Run (D-17 PR-Gate erneut) | Threshold-Gate gruen wenn 02-08/-09/-10 wirken |

Phase-2-Goal MATCH-02 (Reasoning-Qualitaet) + MATCH-03 (Klaerungs-Logik) sind **mechanisch erreicht** (Tagged-Union, CLARIFY-Dispatch, Threshold-Gate codifiziert), aber **inhaltlich nicht** (Recall + Clarif-Precision verfehlen Targets). Phase 2 kann mechanisch geschlossen werden mit der Empfehlung, Phase 2.2 separat zu eroeffnen.

Alternative: Phase 2 als „erfolgreich abgeschlossen mit dokumentierter Restluecke" markieren und die 4 Tuning-Plans als deferred items in Phase 3 oder einer Phase 2.2 fuehren.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] .env.local + node_modules in Worktree fehlten**
- **Found during:** Pre-Flight-Check (DEEPSEEK_API_KEY missing)
- **Issue:** Worktree-Setup hat `.env.local` (gitignored) und `node_modules` (gitignored) nicht aus Main-Repo uebernommen. Live-Eval haette sonst keinen API-Key gehabt und kein tsx zum Ausfuehren.
- **Fix:** `.env.local` per `cp` aus Main-Repo (`/home/kolja/edufunds-app/.env.local`) gezogen. `node_modules` via `npx tsx` invocation umgangen (npm-spezifisch nicht ueber package-Bin).
- **Files modified:** keine (env-Datei wird nicht committet, gitignored)
- **Commit:** kein eigener Commit (Pre-Flight-Setup, nicht Plan-Inhalt)

### Architectural Discoveries (Rule 4 — keine Aktion noetig, nur dokumentiert)

Keine. Kein Architecture-Change waehrend Plan 02-06 erforderlich. Tuning-Empfehlungen fuer Phase 2.2 sind Plan-Sequenz-Vorschlaege, keine Eskalation.

## Auth-Gates

Keine Auth-Gates aufgetreten. DeepSeek-API-Key war ueber `.env.local`-Copy verfuegbar.

## Self-Check: PASSED

- Datei `data/eval/BASELINE.md`: FOUND (modifiziert, Phase-2.1-Eintrag Zeile 6-89)
- Datei `data/eval/reports/2026-05-04-12-32-24.json`: FOUND
- Datei `data/eval/reports/2026-05-04-12-32-24.md`: FOUND
- Ordner `data/eval/snapshots/2026-05-04-12-32-24/`: FOUND (29 ev-XXX.json files)
- Commit `989d3fa`: FOUND in `git log --oneline`
- 11/11 Acceptance-Criteria: PASS
- BASELINE.md-Format: 3 Phase-Eintraege (2.1 / 2 / 1), Header preserved, Korpus unveraendert

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | 989d3fa | feat(02-06): Phase-2.1-Eval-Re-Run nach Prompt-Tuning (GATE FAILED, Diagnose) |

## Output

Plan vollstaendig ausgefuehrt — Live-Eval gelaufen, BASELINE.md erweitert, Reports + Snapshots committet, Diagnose dokumentiert.

**Inhaltliches Resultat:** GATE FAILED. Phase 2 Mechanik erreicht, Phase 2.2 Targets erforderlich. 4 Folge-Plans empfohlen. Kein Schoenfaerben — der User hat ehrlichen Signal-Wert.
