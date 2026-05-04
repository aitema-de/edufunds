# Phase 2: Matcher-Quality - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Den Programm-Matcher (`lib/wizard/matcher.ts`) inhaltlich aufruesten, sodass er **(a)** strukturierte Begruendungen pro Treffer liefert (`passt_weil` + `achtung_bei` statt 15-Wort-Pauschale), **(b)** vage Anliegen erkennt und mit einer Klaerungsfrage antwortet statt ein Ranking ins Blaue zu schiessen. Ende-zu-Ende-Flow: Matcher-API + Frontend (`components/Wizard/MatchResultList.tsx`) + Eval-Skript-Erweiterung sind in einer Welle migriert.

Phase 1 hat den Mess-Apparat etabliert (Eval-Korpus 22 Eintraege, `scripts/eval-matcher.ts`, Baseline `Recall@3 = 0.316`, `Off-Target = 10.5 %`). Phase 2 ist die erste Iteration, die diesen Apparat als CI-Gate **verwendet**: jede Aenderung an `lib/wizard/matcher.ts` oder `data/eval/matcher-korpus.json` muss das Eval-Skript bestehen, bevor die PR mergebar ist (PR-Gate hart, siehe D-09).

Explizit **nicht** in Phase 2:
- Pipeline-Eval-Korpus (Generate-Pipeline statt Matcher) → Phase 5
- CI-Integration via GitHub-Action (manueller `npm run eval:matcher`-Lauf reicht fuer Phase 2)
- NDCG-light / Position-aware Metrik
- Multi-Round-Klaerungsfragen (mehrere Klaerungsrunden iterativ) → bei Bedarf Phase 3+
- Score-Erwartungen pro Korpus-Eintrag (D-08 in Phase-1-CONTEXT deferred)
- Cron-Skripte auf DeepSeek migrieren → Phase 3 (FETCH-01)

</domain>

<decisions>
## Implementation Decisions

### Schema fuer strukturierte Begruendung

- **D-01:** Pipe-Format wird erweitert auf `id|score|passt_weil|achtung_bei` pro Zeile. Bewahrt den 28.04.-Speedup (37s → 2s) und bleibt zur bestehenden Parser-Architektur konsistent. Felder durch `|` getrennt; ein leeres `achtung_bei` erscheint als Trailing-`|` mit leerem String dahinter, NICHT als ausgelassenes Feld (Parser erwartet exakt 4 Spalten).
- **D-02:** Pipe-Char in `passt_weil` / `achtung_bei` ist **verboten** — Prompt schreibt das hart vor (Negativbeispiel + Anweisung „kein `|` im Begruendungs-Text"). Parser zaehlt nicht-leere Spalten und verwirft die Zeile bei Spalten≠4 (Soft-Failure: Match wird ausgeschlossen, gesamtes Ranking bleibt valide). Keine Escape-Logik — billiger Round-Trip durch Prompt-Engineering.
- **D-03:** Laengen-Limits pro Feld: `passt_weil` max ~25 Woerter (vorher `begruendung` hatte 15-Wort-Cap), `achtung_bei` max ~20 Woerter. Cap im Prompt, kein Hard-Truncate im Parser (LLM haelt sich erfahrungsgemaess dran). Kein Min-Limit fuer `achtung_bei` — wenn das Programm einfach gut passt, ist Empty-String legitim.
- **D-04:** Backward-Compat: Das alte Feld `begruendung` in `MatchHit` wird **hart entfernt**. Alle Caller (`app/api/match/route.ts`, `components/Wizard/MatchResultList.tsx`, Eval-Skript-Snapshots, ggf. Tests) werden in der gleichen PR migriert. Begruendung als computed-Field beizubehalten waere Doppel-Quelle und Verwirrung — interner Code, kein externer API-Konsument zu schuetzen.

### Trigger fuer Klaerungsfrage

- **D-05:** **LLM entscheidet im Hauptcall**, ob die Anfrage vage genug fuer eine Klaerungsfrage ist. Kein zusaetzlicher Pre-Stage-Klassifier (sparen +1s + ~0.02 ct pro Match). Output-Konvention: erste Zeile `CLARIFY|<frage_text>` statt `<id>|<score>|...`. Parser dispatched: erste Zeile beginnt mit `CLARIFY|` → Tagged-Union `clarification`, sonst → `ranking`.
- **D-06:** Im Prompt definierte „vage"-Heuristik (Anweisung an LLM, NICHT Regel im Code): Anliegen ist vage, wenn **mindestens 2 von 3 Pflicht-Slots fehlen** (Bundesland, Zielgruppe/Schultyp, thematischer Fokus). Beispiele im Prompt zeigen klar/vag-Grenzfaelle. LLM darf bei Grenzfaellen optional einen `clarificationHint` als Vor-Indikator setzen (D-07-relevant) — entschieden im Plan.
- **D-07:** Klaerungsfrage selbst soll **konkret und schliessbar** sein (max 1-2 Saetze, idealerweise mit konkreten Optionen wie „Welches Bundesland — z.B. Berlin, Bayern, NRW?"). Prompt-Anweisung. Kein freier Textstrom.

### Response-Shape (TypeScript-API)

- **D-08:** `MatchResult` wird zur **discriminated Union**:
  ```ts
  export type MatchResult =
    | { kind: 'ranking'; matches: MatchHit[]; cost: CostLedger }
    | { kind: 'clarification'; question: string; cost: CostLedger };

  export type MatchHit = {
    id: string;
    score: number;
    passt_weil: string;
    achtung_bei: string;
    programm: Programm;
  };
  ```
  Saubere Mutual-Exclusion, Frontend muss switch-on-`kind`. Kein Hybrid (Top-3 + Hint) — entweder Klaerungsfrage **oder** Ranking, sonst leitet UI den User in zwei Richtungen gleichzeitig.
- **D-09:** Multi-Round-Klaerung: **maximal 1 Runde** in Phase 2. Nach erster User-Antwort wird ein neuer `runMatch`-Aufruf ausgeloest mit dem praezisierten Anliegen — wenn das LLM **wieder** `CLARIFY|...` zurueckgibt, ignoriert Frontend die zweite Klaerung und rendert die zugehoerigen Top-3 mit niedrigem Score + sichtbarem Hint „Anliegen ist vage geblieben — Treffer evtl. ungenau". Implementierungs-Detail: Frontend sendet beim zweiten Call `forceRanking: true` im `MatchInput`, der Prompt unterdrueckt dann die `CLARIFY`-Option.

### UI-Rendering

- **D-10:** `passt_weil` + `achtung_bei` werden **stacked mit Icons + Farbe** in der `MatchResultList`-Card gerendert:
  - `passt_weil`: gruener Block, Check-Icon (✓) oder Heroicon-Equivalent, Label „Passt, weil:" + Text
  - `achtung_bei`: oranger Block, Warn-Icon (⚠) oder Heroicon-Equivalent, Label „Achtung:" + Text. Wird **nur** gerendert, wenn nicht-leer.
  - Beide untereinander, vor dem `Antrag starten`-Button — User sieht Risiken **bevor** er entscheidet.
- **D-11:** Bei `kind === 'clarification'` rendert `MatchResultList` die Trefferliste **nicht** und zeigt stattdessen eine prominente Card mit:
  - Klaerungsfrage als h2 oder grosse Schrift
  - Inline-Eingabefeld (textarea) fuer praezisierte Anliegen
  - Submit-Button „Praezisieren" → ruft `runMatch` erneut mit `previousAnliegen + neue_antwort` (oder konkateniert) auf
  - Kleiner Override-Link unten: „Trotzdem mit aktueller Eingabe ranken" → zweiter Aufruf mit `forceRanking: true`
- **D-12:** Empty-State (`matches.length === 0` UND `kind === 'ranking'`) — also LLM hat geantwortet aber kein Programm hat Score >= 50 — bleibt unveraendert vom heutigen Code (heutige Empty-State-Card mit „Keine Treffer gefunden..."-Hint).

### Eval-Korpus-Erweiterung

- **D-13:** Korpus wird um **5-7 gezielt vage Eintraege** erweitert mit neuem Feld `expected_clarification: true` (boolean, optional, default `false`). Die bestehenden 3 Edge-Cases (`ev-003`, `ev-019`, `ev-022`) bekommen `expected_clarification: true` zusaetzlich (passend zu ihrem `expected_top3 = []`). Ziel-Verteilung im Korpus nach Erweiterung: ~28-30 Eintraege, davon 8-10 mit `expected_clarification: true`.
- **D-14:** Korpus-Schema-Erweiterung: optionales Feld `expected_missing_slots: ('bundesland'|'zielgruppe'|'thema')[]` pro Vague-Eintrag. Eval-Skript misst pro Vague-Eintrag, ob Matcher die richtigen Slots in der Klaerungsfrage adressiert (Soft-Match: Wort-Vorkommen im Frage-Text). Diese Metrik ist diagnostisch, nicht Teil des PR-Gates.
- **D-15:** Neue Eval-Metriken in `scripts/eval-matcher.ts`:
  - **Clarification-Precision:** Von allen Eintraegen mit `expected_clarification: true`, in wie vielen liefert der Matcher tatsaechlich `kind === 'clarification'`? Ziel: ≥80 %.
  - **Clarification-Recall (Falsch-Positiv-Rate):** Von allen Eintraegen mit `expected_clarification: false`, in wie vielen liefert der Matcher trotzdem `kind === 'clarification'`? Ziel: ≤10 %.
  - **Slot-Coverage** (diagnostisch): Bei `expected_missing_slots` definiert, wie viel Prozent der erwarteten Slots werden in der Frage erwaehnt? Soft-Match.

### Eval-Targets + PR-Gate

- **D-16:** Eval-Targets fuer Phase-2-Erfolg gegen Phase-1-Baseline (`Recall@3 = 0.316`, `Off-Target = 10.5 %`):
  - **Recall@3 ≥ 0.42** (Mittelwert ueber Non-Edge + Non-Vague-Eintraege, +0.10 ggu. Baseline)
  - **Off-Target-Rate < 5 %** (haerter als Baseline, weil Off-Target-Risiko bei strukturierter `achtung_bei`-Pflicht aufgedeckt werden muss)
  - **Clarification-Precision ≥ 80 %** (siehe D-15)
  - **Clarification-Recall (Falsch-Positiv) ≤ 10 %** (siehe D-15)
- **D-17:** PR-Gate: **hart bei PRs, die `lib/wizard/matcher.ts` ODER `data/eval/matcher-korpus.json` ODER `scripts/eval-matcher.ts` aendern** — `npm run eval:matcher` muss ohne Regress (alle 4 Targets aus D-16 erfuellt) durchlaufen. Soft (warn-only) fuer alle anderen PRs. Verifikation manuell durch PR-Reviewer (kein GitHub-Action — das ist Phase-3-Discretion). Eval-Report (`data/eval/reports/<datum>.md`) wird der PR als Artefakt angehaengt (Force-Add wie in Phase 1).

### Claude's Discretion

- Genaue Prompt-Formulierung der „vage"-Heuristik im Matcher-Prompt (D-06 setzt nur die Schwelle „2 von 3 Slots fehlen", die konkrete Sprache + Negativ-Beispiele wahlt der Planner / Implementer).
- `forceRanking`-Implementation in `MatchInput` (D-09): Feld-Name + ob im Prompt unterdrueckt wird via Conditional-Section vs. anderer Prompt.
- Ob `previousAnliegen` + `neue_antwort` im zweiten `runMatch`-Call konkateniert werden (`"alt: ... | neu: ..."`) oder als separate Felder reichen — ob der Matcher das LLM-seitig versteht. Smoke-Test im Plan.
- Konkretes Schreiben der 5-7 neuen Vague-Korpus-Eintraege — Claude darf Entwuerfe machen, Kolja kuratiert (gleiche Prozedur wie Phase 1, D-08).
- UI-Detail-Polish: exakte Farbtoene (Tailwind: `bg-green-50 border-green-200` vs. `bg-emerald-...` etc.), Heroicon-Auswahl, Mobile-Stacking.
- Eval-Skript-Erweiterung um die neuen Metriken aus D-15: konkrete Output-Tabelle, ob neue Konsolen-Spalte oder separater Block, JSON-Schema-Aenderung.

</decisions>

<carryforward>
## LOCKED Carryforward aus Phase 1

Diese Entscheidungen aus Phase-1-CONTEXT bleiben in Phase 2 unveraendert gueltig:

- **Eval-Korpus + Eval-Skript + Baseline existieren** (`data/eval/matcher-korpus.json`, `scripts/eval-matcher.ts`, `data/eval/BASELINE.md`). Phase 2 erweitert das Korpus (siehe D-13) und das Skript (siehe D-15), ersetzt aber nicht.
- **DeepSeek `deepseek-chat`** bleibt Default-Modell fuer den Matcher (~0.04 ct pro Match, 2-3s Latenz). Gemini-Fallback via `LLM_PROVIDER=gemini` weiter waehlbar.
- **Pipe-Format-Pattern** hat sich bewaehrt — D-01 erweitert das Schema, ersetzt aber nicht den Ansatz.
- **Score-Threshold `< 50`** in `lib/wizard/matcher.ts` filtert leere Treffer. Bei `kind === 'clarification'` greift der Threshold nicht (es gibt kein Ranking). Bei `kind === 'ranking'` bleibt der Filter aktiv und unveraendert.
- **Edge-Cases (3 Stueck: ev-003, ev-019, ev-022)** liefern aktuell volles Top-3 — exakt der Phase-2-MATCH-03-Auftrag, der mit D-13 (`expected_clarification: true` setzen) und D-05 (LLM-Trigger) jetzt adressiert wird.
- **Encoding-Regel:** ASCII in JSON (`matcher-korpus.json`, Eval-Reports), Umlaute in Markdown / UI-Strings / Konsolen-Output.
- **Korpus-Schema** aus Phase 1 D-01 bis D-08 bleibt gueltig — Phase 2 fuegt nur Felder hinzu (D-13, D-14), entfernt nichts.
- **Eval-Metriken Phase 1** (`Recall@3` weich, `Off-Target` hart) bleiben primaere Metriken — Phase 2 fuegt Clarification-Metriken hinzu (D-15), schwaecht die alten nicht ab.

</carryforward>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Matcher-Implementation (zu erweiternder Code)
- `lib/wizard/matcher.ts` — aktueller Matcher mit Pipe-Format-Builder + Parser, `runMatch(input: MatchInput): Promise<MatchResult>` mit `matches: { id, score, begruendung, programm }[]`. Score-Threshold `< 50` in Zeile 238. **Zentrale Aenderung Phase 2:** Schema-Erweiterung + Tagged Union + LLM-Trigger fuer `CLARIFY`.
- `lib/wizard/llm.ts` — DeepSeek-Wrapper, unveraendert.
- `lib/wizard/pricing.ts` — `CostLedger`-Typ, beibehalten in beiden Tagged-Union-Varianten.

### API-Surface
- `app/api/match/route.ts:24` — reicht `begruendung` aktuell ohne Transformation durch. **Zu migrieren:** muss neue `MatchResult`-Union an Frontend weiterreichen, ggf. ResponseType-Anpassung.

### UI-Surface
- `components/Wizard/MatchResultList.tsx` — rendert `m.begruendung` als single `<p>` (Zeile 94). Score-Badge mit Farb-Heuristik (>=85 gruen, >=70 orange, sonst grau). Empty-State-Block bei `matches.length === 0`. Card-Layout mit Programm-Name + foerdergeber + foerdersummeText + bewerbungsfristText + Antrag-starten-Button. **Zu migrieren:** D-10 (zwei Bloecke) + D-11 (Clarification-Card) + D-12 (Empty-State unveraendert).
- `app/antrag/[programmId]/wizard/page.tsx` ist die Wizard-Seite, NICHT die Trefferliste — Phase 2 aendert hier nichts.
- `app/antrag/start/page.tsx` (oder wo der Match-Aufruf herkommt) — ggf. State-Management fuer Multi-Round-Klaerung (D-09 `forceRanking`-Flag).

### Eval-Apparat (zu erweitern)
- `scripts/eval-matcher.ts` (496 Zeilen, Modi: Live / `--snapshot` / `--replay <dir>` / `--md-summary`). **Zu erweitern:** neue Metriken D-15 (Clarification-Precision/Recall/Slot-Coverage), Korpus-Schema-Lese-Logik fuer `expected_clarification` + `expected_missing_slots`.
- `data/eval/matcher-korpus.json` — 22 Eintraege. **Zu erweitern:** 5-7 neue Vague-Eintraege + 3 bestehende Edge-Cases um `expected_clarification: true` ergaenzen (D-13).
- `data/eval/BASELINE.md` — append-only History. Phase 2 fuegt neuen Eintrag oben dran mit Phase-2-Matcher-SHA + neuen Metriken.

### Match-Results werden NICHT persistiert
- Bestaetigt aus Phase 1 Scout: keine DB-Tabelle fuer Match-Results. Tagged Union bleibt rein in-memory zwischen Matcher und Frontend — keine DB-Migration noetig.

### Projekt-Konventionen
- `CLAUDE.md` (Repo-Root) — DeepSeek-Default-Modell, deutsche Sprache in Doku/Commits, Conventional-Commit-Praefixe.
- `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md` — Codebase-Map.
- `.planning/PROJECT.md` — Projekt-Vision, Constraints (Matcher < 3s, Cost pro Antrag < 1 Cent — Phase 2 darf das nicht aushebeln; D-05 LLM-im-Hauptcall ist genau dafuer optimiert).
- `.planning/phases/01-eval-korpus-matcher/01-CONTEXT.md` — Phase-1-Decisions D-01 bis D-17 (Korpus-Schema, Metric-Definition, Eval-Skript-Verhalten).

</canonical_refs>

<deferred>
## Deferred Ideas (out of scope, dokumentiert fuer Phase 3+)

- **CI-Integration / GitHub-Action fuer Eval** — manueller `npm run eval:matcher`-Lauf mit Force-Add reicht in Phase 2. Wenn das in der Praxis bricht, GitHub-Action in Phase 3.
- **NDCG-light / Position-aware Metrik** (Pos1 zaehlt mehr als Pos3) — Phase-1-Defer, bleibt deferred. Wenn Recall@3 nach Phase 2 plateauiert, ist das das naechste Tuning-Werkzeug.
- **Pipeline-Eval-Korpus** (Generate-Pipeline statt Matcher) — explizit Phase 5 laut ROADMAP.
- **Multi-Round-Klaerungsfragen** (mehrere Klaerungsrunden iterativ) — Phase 2 macht max 1 Runde (D-09). Phase 3+, falls Live-UAT zeigt, dass User oft 2-3 Runden brauchen.
- **Score-Erwartungen pro Korpus-Eintrag** (D-08 in Phase-1-CONTEXT) — bleibt deferred, kein Phase-2-Auftrag.
- **Pre-Stage Klassifier fuer vage-Erkennung** (D-05 Alternative) — wenn LLM-im-Hauptcall (D-05 gewaehlt) zu inkonsistent triggert, Pre-Stage als Phase-3-Plan B.

</deferred>
