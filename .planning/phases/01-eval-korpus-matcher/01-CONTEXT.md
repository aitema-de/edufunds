# Phase 1: Eval-Korpus Matcher - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Messbare Regressions- und Verbesserungs-Basis fuer den Programm-Matcher (`lib/wizard/matcher.ts`) etablieren — als Vorbedingung fuer jede zukuenftige Matcher-Iteration. Diese Phase liefert drei konkrete Artefakte: (1) ein versioniertes Korpus mit 20–30 kuratierten Schul-Anliegen + Erwartungen, (2) ein Eval-Skript, das den aktuellen Matcher gegen das Korpus laufen laesst und einen strukturierten Report ausgibt, (3) eine dokumentierte Baseline (Zahl + Datum + Commit-SHA) als Vergleichsanker fuer Phase 2.

Explizit NICHT in dieser Phase: Matcher-Tuning, MATCH-02/-03 (strukturierte Begruendung, Klaerungsfragen) — das ist Phase 2. Das Eval-Skript ist read-only gegen den Matcher.

</domain>

<decisions>
## Implementation Decisions

### Korpus-Schema

- **D-01:** Pro Eintrag wird der vollstaendige `MatchInput` aus `lib/wizard/matcher.ts` gespiegelt: `id` (z. B. `ev-001`), `category` (`kurz` | `ausfuehrlich` | `vag`), `anliegen`, optionale Schul-Profil-Felder (`schulname`, `schultyp`, `bundesland`, `geschaetztesBudgetEur`), `expected_top3` (Array von `programmId` aus `data/foerderprogramme.json`), `expected_off_target` (Array von `programmId`), `notes` (kurze Kuratoren-Notiz, warum dieser Eintrag drin ist).
- **D-02:** `expected_top3` und `expected_off_target` sind reine Programm-ID-Listen — keine Score- oder Position-Erwartungen pro ID (haelt das Korpus pflegeleicht; feinere Score-Erwartungen koennen v2 sein).
- **D-03:** Schul-Profil-Felder duerfen pro Eintrag fehlen — Eintraege ohne `bundesland` testen den thematischen Kern, Eintraege mit `bundesland` testen zusaetzlich den Prefilter.
- **D-04:** Korpus-Datei-Pfad: `data/eval/matcher-korpus.json`. JSON-Array auf Top-Ebene, kein Wrapper-Objekt — vereinfacht Iteration im Skript.

### Korpus-Abdeckung und -Quellen

- **D-05:** Stress-Test-Verteilung der Laengen-Kategorie: ~30 % `vag` / ~40 % `ausfuehrlich` / ~30 % `kurz`. Vag-Uebergewicht weil Phase 2 (Klaerungsfrage-Logik) genau hier Haerte beweisen muss; ausfuehrlich = klassischer Goldstandard; kurz = realistische Schul-Eingaben.
- **D-06:** Programm-getriebene Coverage: mindestens 1 Eintrag pro Hauptkategorie aus dem Katalog (Digital, Sport, Kultur, MINT, Inklusion, Sprache, Internationales, Klima, Demokratie, ...) und Mix aus 4–5 Bundeslaendern + bundesweiten Programmen. Stellt sicher, dass der Matcher in jeder thematischen Achse messbar ist.
- **D-07:** 3–5 bewusste Edge-Cases (~15 % der Eintraege): 1–2 mit `expected_top3 = []` (kein passendes Programm), 2–3 thematische Grenzfaelle mit klar definierten Off-Targets. Stresstest fuer „matcher liefert leere Liste statt Gefaelligkeits-Match".
- **D-08:** Anliegen-Generation hybrid: Claude generiert Entwuerfe basierend auf den 82 Programmen in der Prio-Queue, Kolja kuratiert/editiert manuell. Synthetisch + kuratiert vermeidet Datenschutz-Aufwand und ist schnell — Risiko „klingt KI-glatt" wird durch Kolja-Pass abgefedert.

### Metric-Definition

- **D-09:** Top3-Trefferrate = Recall@3 weich: pro Eintrag `|expected_top3 ∩ matcher_top3| / |expected_top3|`. Bei `expected_top3 = []` wird der Eintrag aus dem Recall-Aggregat ausgeschlossen (separate Edge-Case-Metrik). Aggregation = arithmetisches Mittel ueber alle Nicht-Edge-Eintraege. Reihenfolge im Top3 ist egal.
- **D-10:** Off-Target-Rate = % Eintraege, in deren Matcher-Top3 mindestens ein `expected_off_target`-Programm auftaucht. Hart. Niedrig = besser. Score-Threshold spielt keine Rolle (wenn der Matcher es ins Top3 packt, ist es ein Treffer).
- **D-11:** Edge-Case-Metrik separat: bei `expected_top3 = []` wird gemessen, wie viele der Top3 ein `expected_off_target` enthalten oder wie viele Eintraege eine leere Liste zurueckgeben. Nicht Teil des Recall-Mittelwerts, aber im Bericht ausgewiesen.
- **D-12:** Baseline-Bericht enthaelt drei Hauptzahlen: (1) Recall@3 Mittelwert, (2) Off-Target-Rate, (3) Per-Kategorie-Breakdown derselben zwei Zahlen fuer `kurz`/`ausfuehrlich`/`vag`. Plus Latenz-Mittelwert pro Eintrag und Gesamtkosten in Euro-Cent.

### Eval-Skript-Verhalten und Output

- **D-13:** Skript-Pfad: `scripts/eval-matcher.ts`. Aufruf konsistent mit bestehenden Smoke-Skripten via `npx tsx scripts/eval-matcher.ts`. Optional `package.json` script alias `eval:matcher` als convenience.
- **D-14:** Run-Modus: Default Live-DeepSeek-Calls (~3 Cent pro voller Lauf bei 30 Eintraegen, akzeptabel). Flag `--snapshot` speichert Matcher-Output pro Eintrag in `data/eval/snapshots/<ISO-date>/<entry-id>.json`. Flag `--replay <snapshot-dir>` evaluiert gegen gespeicherte Snapshots ohne neue LLM-Calls. Erlaubt Score-Logik-Aenderungen ohne Token-Verbrauch in Phase 2.
- **D-15:** Bericht-Output: (1) JSON-Bericht in `data/eval/reports/<ISO-date>.json` mit per-entry-results + Aggregat-Metriken — versioniert im Repo, History sichtbar in `git log`. (2) Konsolen-Tabelle mit den drei Hauptzahlen + Per-Kategorie-Breakdown. (3) Optional `--md-summary` schreibt zusaetzlich `data/eval/reports/<ISO-date>.md` (menschenlesbar fuer PRs).
- **D-16:** Baseline-Dokumentation in dedizierter Datei `data/eval/BASELINE.md`. Inhalt pro Baseline-Eintrag: Datum, Korpus-Version (Anzahl Eintraege), Matcher-Commit-SHA, drei Hauptzahlen, Per-Kategorie-Breakdown, Latenz/Kosten. History append-only — Phase 2 fuegt neue Eintraege oben dran. Kein Auto-Update durch das Skript; Skript schreibt nur Reports, BASELINE.md wird manuell gepflegt (oder via separatem Helper).
- **D-17:** Score-Threshold-Verhalten im Eval: Skript respektiert die Matcher-interne `< 50`-Filterung (siehe `matcher.ts:238`). Wenn der Matcher weniger als 3 Treffer liefert (z. B. nur 1 mit Score >= 50), wird das im Bericht als Recall-Berechnung mit der tatsaechlichen Trefferzahl behandelt — nicht als Fehler. Edge-Case-Eintraege mit leerer Matcher-Liste sind das gewuenschte Verhalten.

### Claude's Discretion

- Genaue Formatierung der Konsolen-Tabelle (ASCII vs. cli-table3 vs. einfach `console.table`)
- Snapshot-Dateinamenschema in `data/eval/snapshots/` (Sub-Ordner pro Run-Datum oder flach mit Hash)
- Parallelitaet der Matcher-Calls im Skript (sequenziell ist OK — DeepSeek-Quota erlaubt aber moderate Parallelitaet, Researcher kann pruefen)
- Exit-Code-Konvention (immer 0, oder non-zero bei Recall < Schwellwert? — fuer Phase 1 simpel: immer 0, Phase 2 kann Threshold-Gate ergaenzen)
- JSON-Schema des Reports: Detail-Granularitaet pro Eintrag (was wurde erwartet, was kam, welche Off-Targets — Detail-Tiefe ist Discretion)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Matcher-Implementation (zu evaluierender Code)
- `lib/wizard/matcher.ts` — aktueller Matcher mit 2-Stufen-Logik (Prefilter + LLM-Ranking auf Top-20). Schnittstelle `MatchInput`/`MatchResult` ist die Eval-Skript-API. Score-Threshold `< 50` in Zeile 238, Top-N-Cut auf `MAX_LLM_CANDIDATES = 20`, max 3 Treffer.
- `lib/wizard/llm.ts` — Provider-Wrapper. Eval-Skript laeuft via `runMatch()` durch diesen Wrapper, erbt also den DeepSeek-`deepseek-chat`-Default + 60s-Timeout.
- `lib/wizard/pricing.ts` — `CostLedger` wird vom Matcher zurueckgegeben; Eval-Skript aggregiert ueber alle Eintraege fuer Gesamtkosten.

### Daten und Programme
- `data/foerderprogramme.json` — 131 Programme. `programmId`s in `expected_top3`/`expected_off_target` muessen aus diesem Katalog stammen (Validation im Skript).
- `data/richtlinien-prioritaeten.json` — 82 Programme mit `kiAntragGeeignet=true`. Korpus-Quelle: Anliegen werden ueberwiegend gegen Programme aus dieser Queue formuliert.
- `data/richtlinien/` — 11 fertige Dossiers (DigitalPakt 2.0, Berlin-Startchancen, Kultur macht stark, ENSA-BMZ, Erasmus+ Schulbildung, Erasmus+ Schulentwicklung, Ferry Porsche Challenge 2025+2026, Klimalab 2026, Aktion-Mensch, Bosch-Schulpreis). Diese 11 sind die natuerlichen Hauptkandidaten fuer `expected_top3`-Eintraege im Korpus.

### Smoke-Skript-Pattern (Vorbild fuer Skript-Struktur)
- `scripts/smoke-pipeline-with-extractor.ts` — Vorbild fuer Live-LLM-Skript-Aufbau (Aufruf-Konvention, Kosten-Aggregation, Konsolen-Output).
- `scripts/smoke-pipeline-models.ts` — Vorbild fuer A/B-Vergleichs-Skripte und JSON-Output-Strukturen.
- `scripts/smoke-llm.ts` — minimaler Smoke-Test, zeigt das einfache Aufruf-Pattern.

### Projekt-Konventionen
- `CLAUDE.md` (Repo-Root) — DeepSeek-Default-Modell, deutsche Sprache in Doku/Commits, Conventional-Commit-Praefixe.
- `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md` — Codebase-Map fuer Tech-Stack-Realitaet, Skript-Konventionen, Verzeichnisstruktur.
- `.planning/PROJECT.md` — Projekt-Vision, Constraints (Performance: Matcher < 3s, Cost pro Antrag < 1 Cent), Out-of-Scope.
- `.planning/REQUIREMENTS.md` §Matching — Requirements MATCH-01/-02/-03 (Phase 1 deckt nur MATCH-01).

### UAT-Kontext (Inspiration fuer Edge-Cases und realistische Anliegen)
- `~/.claude/projects/-home-kolja/memory/edufunds-uat-pipeline-befunde-2026-04-28.md` — Borsigwalder-UAT-Anliegen, kann als realistische Anliegen-Vorlage dienen (anonymisiert).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`runMatch(input: MatchInput)` aus `lib/wizard/matcher.ts`**: Eval-Skript ruft diese Funktion direkt mit jedem Korpus-Eintrag — keine Wrapper-Layer noetig. Rueckgabewert `MatchResult` enthaelt `matches`, `costs`, `totalCandidates`, `filteredOut` und ist die natuerliche Datenquelle fuer den Report.
- **`CostLedger` aus `lib/wizard/pricing.ts`**: Pro Eintrag wird ein Ledger gefuehrt; Aggregation ueber alle Eintraege ergibt die Gesamt-Tokenkosten in Cent.
- **Smoke-Skript-Pattern**: `scripts/smoke-pipeline-with-extractor.ts` und `scripts/smoke-pipeline-models.ts` zeigen das etablierte Pattern fuer `npx tsx`-CLI-Skripte mit Live-LLM-Calls — Top-Level-Async, `process.exit()`-Disziplin, Konsolen-Output mit klaren Sektionen.

### Established Patterns
- **`npx tsx scripts/<name>.ts`-Aufruf**: kein Build-Schritt, direkter TS-Run. Eval-Skript folgt diesem Pattern.
- **JSON-First-Output fuer Daten, Markdown fuer Doku**: bestehende Smoke-Skripte schreiben strukturierte JSON-Berichte mit menschen-lesbaren Konsolen-Tabellen daneben. Pipe-Format des Matchers aus `parsePipeMatches` wird vom Eval-Skript NICHT geparst — wir konsumieren das schon parsed-Result von `runMatch()`.
- **DeepSeek-`deepseek-chat`-Default**: kein Reasoning, ~2s Latenz, ~0,1 Cent pro Matcher-Call. 30 Eintraege ≈ 60s Wallclock, ~3 Cent Gesamt-Kosten — akzeptabel.
- **Datenfilter-Logik (`prefilter` in `matcher.ts`)**: Bundesland-Konflikte werden vor LLM-Stage entfernt. Korpus-Eintraege mit `bundesland` testen indirekt diesen Filter — wenn ein erwartetes Programm wegen BL-Konflikt rausfaellt, ist das ein Korpus-Bug, nicht Matcher-Bug.

### Integration Points
- Eval-Skript ist read-only gegen `lib/wizard/matcher.ts` — keine Code-Aenderungen am Matcher in Phase 1 (das ist Phase 2).
- `data/eval/`-Ordner ist neu — Phase 1 etabliert ihn, Phase 2 erweitert ihn ggf. um Pipeline-Eval-Korpus.
- Keine Frontend-Aenderungen, keine UI-Phase noetig (`workflow.ui_phase` darf fuer Phase 1 ignoriert werden — reine Backend/Tooling-Phase).
- Keine DB-Aenderungen, keine Migrationen.

</code_context>

<specifics>
## Specific Ideas

- "Bauchgefuehl-Optimierung skaliert nicht auf 82 Programme — ohne Korpus keine Regression-Detection" (Key Decision aus PROJECT.md) — formt die ganze Phase: das Korpus ist die Messlatte, nicht das Optimum selbst.
- Stress-Test-Charakter ueber Goldstandard: das Korpus soll dort haerter sein, wo der Matcher in Zukunft am ehesten verbessert wird (vag-Faelle, BL-Konflikte, Edge-Cases mit leerer Liste).
- Phase 2 wird neue Korpus-Eintraege hinzufuegen koennen, ohne das Schema zu brechen — Append-only-Workflow fuer das Korpus, BASELINE.md mit History.

</specifics>

<deferred>
## Deferred Ideas

- **Score-Erwartungen pro `expected_top3`-Eintrag** (z. B. `min_score: 80`, „Pos1 muss 5 Punkte vor Pos2 liegen"): nicht in v1, koennte in Phase 2 ergaenzt werden, wenn die ersten Tunings zeigen, wo Score-Disziplin bricht.
- **CI-Integration / GitHub-Action**: Eval als wochentlicher Auto-Run mit Diff-Posting — Overkill fuer Phase 1, sinnvoll wenn Matcher live tunt (post-Phase-2).
- **NDCG-light / Position-aware Metrik**: Pos1 zaehlt mehr als Pos3 — verworfen fuer Phase 1 (zu schwer interpretierbar fuer eine Baseline), kann in Phase 2 als sekundaere Metrik dazukommen.
- **Pipeline-Eval-Korpus** (analog fuer den Generate-Pipeline statt Matcher): das ist Phase 5 (siehe ROADMAP.md), nicht Phase 1.
- **Real-User-Anliegen-Sammlung mit Anonymisierungs-Workflow**: aktuell out-of-scope, Hybrid synthetisch+UAT reicht; bei Bedarf in spaeterer Milestone.
- **Threshold-Gate im Eval-Skript** (Exit-Code != 0 bei Recall < X): Out-of-Scope fuer Phase 1, kann Phase 2 sich selbst auferlegen.

</deferred>

---

*Phase: 01-eval-korpus-matcher*
*Context gathered: 2026-04-30*
