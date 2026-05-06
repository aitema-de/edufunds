# Phase 1: Eval-Korpus Matcher - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 01-eval-korpus-matcher
**Areas discussed:** Korpus-Schema, Korpus-Abdeckung, Metric-Definition, Eval-Skript-Output

---

## Korpus-Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Vollstaendiger MatchInput + Erwartungen | anliegen, schulname?, schultyp?, bundesland?, geschaetztesBudgetEur?, expected_top3, expected_off_target, category, id, notes — Mirror der MatchInput-Schnittstelle | ✓ |
| Schlanker Kern + Erwartungen | Nur anliegen, expected_top3, expected_off_target, id, category — keine Schul-Profil-Felder | |
| Reicheres Schema mit Score-Erwartungen | Vollstaendiger MatchInput + expected_top3 als {programmId, min_score?} | |

**User's choice:** Vollstaendiger MatchInput + Erwartungen + notes
**Notes:** Erlaubt direkten `runMatch(entry)`-Aufruf ohne Mapping; Schul-Profil-Felder duerfen pro Eintrag fehlen.

---

## Korpus-Abdeckung — Verteilung

| Option | Description | Selected |
|--------|-------------|----------|
| Stress-Test-Verteilung | ~30 % vag, ~40 % ausfuehrlich, ~30 % kurz | ✓ |
| Gleichverteilung | ~33 % je Kategorie | |
| Fokus auf ausfuehrlich | ~60 % ausfuehrlich, je 20 % kurz und vag | |

**User's choice:** Stress-Test-Verteilung
**Notes:** Vag-Uebergewicht weil Phase 2 (Klaerungsfrage) dort Haerte beweisen muss.

## Korpus-Abdeckung — Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Programm-getrieben | Mind. 1 Eintrag pro Hauptkategorie + Mix aus 4-5 BL + bundesweit | ✓ |
| Repraesentativ fuer Pilot-Schulen | Verteilung gespiegelt zu UAT-Pilot-Schulen | |
| Kategorie-Mix mit bundesweitem Schwerpunkt | Kategorie-Coverage, aber nur 1-2 Landesprogramme | |

**User's choice:** Programm-getrieben

## Korpus-Abdeckung — Edge-Cases

| Option | Description | Selected |
|--------|-------------|----------|
| 3-5 Edge-Cases (~15 %) | 1-2 No-Match + 2-3 Grenzfaelle | ✓ |
| Keine Edge-Cases | Nur Anliegen, die zu Programmen passen sollen | |
| Aggressiv viele Edge-Cases (~25 %) | 5-7 Edge-Cases, BL-Konflikte etc. | |

**User's choice:** 3-5 Edge-Cases

## Korpus-Abdeckung — Quelle

| Option | Description | Selected |
|--------|-------------|----------|
| Synthetisch via Claude/Gemini, dann Kolja-kuratiert | Claude generiert, Kolja editiert | ✓ |
| Aus echter UAT-Historie + synthetisch | Borsigwalder + 1-2 weitere reale + Rest synthetisch | |
| Komplett manuell von Kolja | 4-8 h Kolja-Arbeit | |

**User's choice:** Synthetisch + Kolja-kuratiert

---

## Metric-Definition — Hit-Logik

| Option | Description | Selected |
|--------|-------------|----------|
| Recall@3 weich | #expected_top3 in Matcher-Top3 / #expected_top3, Mittelwert | ✓ |
| Recall@3 hart (alle-oder-nichts) | 1.0 nur wenn alle expected_top3 in Top3, sonst 0.0 | |
| Position-aware (NDCG-light) | Pos1=1.0, Pos2=0.7, Pos3=0.5 | |

**User's choice:** Recall@3 weich

## Metric-Definition — Off-Target

| Option | Description | Selected |
|--------|-------------|----------|
| Hart: darf NIE in Top3 | Off-Target-Treffer = mind. 1 Off-Target im Top3 | ✓ |
| Weich: darf nicht auf Pos1 | Off-Target darf in Top3, aber nicht Pos1 | |
| Score-basiert | Off-Target nur kritisch bei Score >= 80 | |

**User's choice:** Hart

## Metric-Definition — Reporting

| Option | Description | Selected |
|--------|-------------|----------|
| 3-Zahlen-Baseline | Recall-Mittelwert + Off-Target-Rate + Per-Kategorie-Breakdown + Latenz/Kosten | ✓ |
| Single-Score-Baseline | Nur Recall@3 als Hauptzahl | |
| Vollstaendiger Per-Entry-Report + Aggregat | Plus Detail-Tabelle pro Eintrag | |

**User's choice:** 3-Zahlen-Baseline

---

## Eval-Skript-Output — Run-Modus

| Option | Description | Selected |
|--------|-------------|----------|
| Live-Calls + Snapshot-Cache | Default Live, --snapshot/--replay-Flags | ✓ |
| Nur Live-Calls | Jeder Re-Run macht echte Calls | |
| Snapshot-only | Eval-Skript liest nur vorher generierte Snapshots | |

**User's choice:** Live + Snapshot-Cache

## Eval-Skript-Output — Bericht

| Option | Description | Selected |
|--------|-------------|----------|
| JSON ins Repo + Konsolen-Tabelle | data/eval/reports/<date>.json + stdout-Tabelle | ✓ |
| Nur Konsolen-Tabelle | stdout only, keine History | |
| JSON + Markdown-Report | Beide auto-geschrieben | |

**User's choice:** JSON + Konsolen-Tabelle (Markdown-Summary optional via Flag)

## Eval-Skript-Output — Baseline-Doku

| Option | Description | Selected |
|--------|-------------|----------|
| Eigene Datei data/eval/BASELINE.md | Dedizierte append-only Markdown-History | ✓ |
| In .planning/STATE.md | Baseline als STATE-Eintrag | |
| Im Eval-Report-JSON nur | Letzte JSON ist Baseline | |

**User's choice:** Eigene Datei BASELINE.md

## Eval-Skript-Output — Ausfuehrung

| Option | Description | Selected |
|--------|-------------|----------|
| npx tsx scripts/eval-matcher.ts | Konsistent mit smoke-*.ts | ✓ |
| Als Jest/Vitest-Test | Tighter CI-Integration | |
| GitHub-Action im weekly-Schedule | Auto-Run mit Diff-Bericht | |

**User's choice:** npx tsx + optionaler npm-script-Alias

---

## Claude's Discretion

- Konsolen-Tabellen-Formatierung
- Snapshot-Dateinamenschema
- Parallelitaet der Matcher-Calls
- Exit-Code-Konvention (Phase 1: immer 0)
- JSON-Schema-Detailgrad pro Eintrag

## Deferred Ideas

- Score-Erwartungen pro expected_top3-Eintrag
- CI-Integration / GitHub-Action
- NDCG-light / Position-aware Metrik
- Pipeline-Eval-Korpus (Phase 5)
- Real-User-Anliegen-Sammlung mit Anonymisierungs-Workflow
- Threshold-Gate im Eval-Skript
