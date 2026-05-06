# Phase 2: Matcher-Quality - Discussion Log

**Date:** 2026-05-03
**Status:** Complete
**Note:** Wiederaufnahme nach Reboot — Codebase-Scout + Domain + Carryforward bereits aus vorigem Session-Stand bekannt (siehe Memory `edufunds-project.md`). Kein erneuter Scout-Lauf, direkter Einstieg in Gray-Area-Auswahl.

## Phase Selection

User waehlte alle 4 Gray Areas zur Diskussion + „Mittel (Recommended)" als Eval-Target-Stossrichtung:
- ✓ Schema strukturierte Begruendung
- ✓ Klaerungsfrage-Trigger-Heuristik
- ✓ Response-Shape bei Klaerungsfrage
- ✓ UI-Rendering 2 Bloecke + Klaerungsfrage
- Eval-Targets: **Mittel** (Recall@3 ≥0.42, Off-Target <5 %, PR-Gate hart bei matcher.ts/Eval-Korpus)

## Round 1 — API/Schema-Decisions (4 Fragen)

### Q1.1 Schema-Format fuer passt_weil + achtung_bei
**Optionen:** Pipe erweitert / JSON-Mode / Pipe + JSON-Fallback
**Antwort:** **Pipe erweitert** → D-01, D-02, D-03

### Q1.2 Backward-Compat begruendung-Feld
**Optionen:** Hart entfernen + Caller migrieren / Computed beibehalten / Beides + Deprecation-Warning
**Antwort:** **Hart entfernen + Caller migrieren** → D-04

### Q1.3 Trigger-Mechanismus fuer „vages Anliegen"
**Optionen:** LLM im Hauptcall / Pre-Stage Klassifier / Slot-basierte Heuristik / Hybrid
**Antwort:** **LLM entscheidet im Hauptcall** → D-05, D-06, D-07
**Begruendung (im Memory festgehalten):** Spart +1s + ~0.02 ct pro Match. Risiko der Inkonsistenz wird ueber Eval-Korpus-Erweiterung (D-13) und neue Clarification-Metriken (D-15) gemessen — nicht ueber Code-Mechanik abgesichert.

### Q1.4 Response-Shape bei Klaerungsfrage
**Optionen:** Tagged Union / Sibling Fields / Hybrid „Ranking + Hint"
**Antwort:** **Tagged Union** → D-08
**Begruendung:** Mutual-Exclusion sauber, Frontend muss switch-on-`kind`. Hybrid wuerde User in zwei Richtungen gleichzeitig schicken.

## Round 2 — UI + Korpus-Erweiterung (4 Fragen)

### Q2.1 Visuelle Trennung passt_weil + achtung_bei
**Optionen:** Stacked + Icons + Farbe / Stacked neutral / Tabs/Toggle
**Antwort:** **Stacked + Icons + Farbe** → D-10
**Begruendung:** Risiken sichtbar **vor** Antrag-starten-Klick (informed consent). Tabs wuerden wichtige Hinweise hinter Klick verstecken.

### Q2.2 Clarification-UI
**Optionen:** Block statt Trefferliste + Override / Full-Page-Overlay / Inline-Hint ueber Liste
**Antwort:** **Block statt Trefferliste + 'trotzdem ranken'-Override** → D-11
**Begruendung:** Lenkt User klar zur Praezisierung ohne ihn einzusperren. Override-Link erlaubt Notausgang.

### Q2.3 Multi-Round-Verhalten
**Optionen:** Max 1 Runde + dann hart ranken / Unbegrenzt iterativ / Defer auf Phase 3
**Antwort:** **Max 1 Klaerungsrunde, dann hart ranken** → D-09
**Begruendung:** Endlos-Loop-Risiko vermeiden, Phase-2-Scope kontrollierbar halten.

### Q2.4 Eval-Korpus-Erweiterung
**Optionen:** 5-7 Vague-Eintraege nachschieben / Bestehende 3 Edge-Cases umetikettieren / Spaeter
**Antwort:** **5-7 neue Vague-Eintraege nachschieben** → D-13, D-14
**Begruendung:** 3 Edge-Cases statistisch zu duenn (±1 Treffer = ±33 % Recall). Korpus-Skew (zu viele wohlformulierte Eintraege) gleicht sich aus.

## Konsens-Pattern

8/8 Recommended-Optionen gewaehlt. Plan-Phase kann mit hoher Sicherheit auf den Defaults aufbauen — keine kontraintuitiven Decisions, die Implementer ueberraschen wuerden.

## Eval-Targets-Ableitung

User-Auswahl „Mittel" wurde in D-16 mit 4 konkreten Schwellen ausgearbeitet:
- Recall@3 ≥ 0.42 (+0.10 ggu. Baseline 0.316)
- Off-Target-Rate < 5 % (haerter als Baseline 10.5 %)
- Clarification-Precision ≥ 80 % (NEU)
- Clarification-Recall (Falsch-Positiv) ≤ 10 % (NEU)

PR-Gate haerte: hart bei `matcher.ts` / `matcher-korpus.json` / `eval-matcher.ts`-Aenderungen, soft (warn-only) sonst (D-17).

## Output

→ `02-CONTEXT.md` mit 17 Decisions (D-01 bis D-17) + LOCKED Carryforward + Canonical Refs + Deferred Ideas
→ Bereit fuer `/gsd:plan-phase 2`
