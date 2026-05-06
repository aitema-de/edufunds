---
phase: 02-matcher-quality
reviewed: 2026-05-04T10:30:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - lib/wizard/matcher.ts
  - app/api/match/route.ts
  - components/Wizard/MatchResultList.tsx
  - components/Wizard/ClarificationCard.tsx
  - components/Wizard/StartClient.tsx
  - scripts/eval-matcher.ts
  - __tests__/lib/wizard/matcher.parser.test.ts
  - __tests__/lib/wizard/matcher.dispatch.test.ts
  - __tests__/components/MatchResultList.test.tsx
  - jest.config.js
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-05-04T10:30:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 2 fuehrt das Tagged-Union-Antwortformat (`ranking` | `clarification`), einen 4-Spalten-Pipe-Parser, das Frontend-Dispatch via `ClarificationCard`/Multi-Round-Guard und ein Phase-2-Eval-Skript mit Threshold-Gate ein. Die Architektur ist sauber, die Soft-Failure-Strategie konsistent, der Prompt enthaelt klare Negativbeispiele, und die Tests decken Parser-, Dispatch- und UI-Branches gut ab.

Es wurden **keine Critical-Issues** gefunden. Fuenf Warnings betreffen primaer Robustheit der Tagged-Union-Behandlung (ungepruefte `body.kind`-Defaults im Frontend, fehlende `usage`-Akkumulation bei Replay-Snapshots, Race-Condition im `isSecondRound`-Reset, `score < 50`-Drift zwischen Prompt/Code, Force-Branch-Snapshot ohne `forceRanking`-Flag im JSON). Sieben Info-Findings betreffen Wartbarkeit (`as any`-Casts, Magic-Numbers, ungenutzte Imports, defensiver Logging-Stil).

Die `MEMORY.md`-Pitfall-Liste (`costs` statt `cost`, `lucide-react` statt Heroicons) ist erfuellt — Tests verifizieren beide explizit. Threshold-Gate via `process.exit(1)` ist korrekt implementiert.

## Warnings

### WR-01: Frontend-Dispatch behandelt unbekanntes `body.kind` als Ranking (silent miscoercion)

**File:** `components/Wizard/StartClient.tsx:67-84`
**Issue:** Der Dispatch-Block prueft nur `body.kind === "clarification"`. Ist `body.kind` ein neuer/unerwarteter Wert (z.B. `"error"`, `undefined` oder ein zukuenftiger Tagged-Union-Variant), faellt der Code in den `else`-Zweig und behandelt das Response wie ein Ranking — `body.matches ?? []` rendert dann eine leere Liste ohne Hinweis. Das verschleiert Backend-Bugs (vergessenes `kind`-Feld, fehlerhafter Patch) als „keine Treffer". Die Backend-Route setzt `kind` zwar zuverlaessig, aber das Frontend sollte das Tagged-Union-Contract **aktiv durchsetzen**.

**Fix:**
```ts
if (body.kind === "clarification" && !isSecondRound) {
  setMatchState({ kind: "clarification", question: body.question });
} else if (body.kind === "clarification" && isSecondRound) {
  // ... (unchanged)
} else if (body.kind === "ranking") {
  setMatchState({
    kind: "ranking",
    matches: (body.matches ?? []) as MatchEntry[],
  });
  setIsSecondRound(false);
} else {
  // Unbekanntes kind — als Backend-Bug behandeln, nicht als „keine Treffer".
  setError({
    message: `Unerwartetes Antwortformat (kind=${String(body.kind)}). Bitte erneut versuchen.`,
  });
}
```

### WR-02: `isSecondRound` wird in der Praezisierungs-Runde nicht zurueckgesetzt → Re-Submit-Sticky-Bug

**File:** `components/Wizard/StartClient.tsx:78-83, 100-109, 115-119`
**Issue:** `setIsSecondRound(false)` wird ausschliesslich im erfolgreichen `else`-Zweig (Ranking-Antwort) aufgerufen. Wenn der User nach einer erfolgreichen zweiten Runde ein **drittes Mal** einen frischen Anliegen-Submit ueber `AnliegenForm.onSubmit` ausloest, wird `runMatch` ohne Reset von `isSecondRound` gerufen — das geht zwar gut, weil der Erfolgspfad davor `setIsSecondRound(false)` setzte. Aber: Wenn die zweite Runde **fehlschlaegt** (network error, HTTP 500, oder erneute Klaerungsfrage trotz `forceRanking`), bleibt `isSecondRound = true`. Ein anschliessender frischer `AnliegenForm`-Submit triggert dann sofort den Multi-Round-Guard im ersten Anlauf — der User sieht „Anliegen ist vage geblieben — bitte praezisere die Eingabe" obwohl er gerade ein neues Anliegen eingab.

**Fix:**
```ts
const runMatch = async (values: MatchRequestValues) => {
  setBusy(true);
  setError(null);
  setMatchState(null);
  // Frischer Submit (kein forceRanking-Flag) → Multi-Round-Guard zuruecksetzen.
  if (!values.forceRanking) setIsSecondRound(false);
  // ... rest unchanged
};
```

Alternativ: `isSecondRound` aus einer von `lastInput.anliegen` abgeleiteten ID rechnen (z.B. ein Hash) und nur bei identischem Anliegen als „Round 2" werten.

### WR-03: Eval-Snapshot enthaelt `forceRanking`/`previousAnliegen` nicht im persistierten `input` → Replay-Drift

**File:** `scripts/eval-matcher.ts:577-580, 254-262`
**Issue:** `entryToMatchInput` baut nur `anliegen`/`schulname`/`schultyp`/`bundesland`/`geschaetztesBudgetEur` aus `KorpusEntry`. Wenn ein Korpus-Eintrag in der Zukunft `forceRanking: true` oder `previousAnliegen: ...` testen will (D-09 ist via Eval explizit nicht abgedeckt), landet das nicht im Snapshot. Beim `--replay` liest der Code `snap.input` zurueck, aber `MatchInput` wird im Replay-Pfad gar nicht mehr an `runMatch` weitergegeben — der Snapshot enthaelt bereits das fertige `result`. Insofern kein Crash, aber: Phase-2-Korpus-Eintraege koennen `expected_clarification: true` setzen, ohne dass der Snapshot dokumentiert, **welche Input-Variante** den `clarification`-Pfad ausgeloest hat. Drift-anfaellig fuer spaetere Audit-Analysen.

**Fix:** `entryToMatchInput` erweitern, sodass alle ggf. gesetzten `MatchInput`-Felder (`forceRanking`, `previousAnliegen`) ins Snapshot fliessen — aktuell nicht im Korpus-Schema vorgesehen, aber das `KorpusEntry`-Interface sollte sie zukuenftig erlauben:

```ts
interface KorpusEntry {
  // ... existing fields
  forceRanking?: boolean;
  previousAnliegen?: string;
}

function entryToMatchInput(entry: KorpusEntry): MatchInput {
  const input: MatchInput = { anliegen: entry.anliegen };
  if (entry.schulname !== undefined) input.schulname = entry.schulname;
  if (entry.schultyp !== undefined) input.schultyp = entry.schultyp;
  if (entry.bundesland !== undefined) input.bundesland = entry.bundesland;
  if (entry.geschaetztesBudgetEur !== undefined)
    input.geschaetztesBudgetEur = entry.geschaetztesBudgetEur;
  if (entry.forceRanking !== undefined) input.forceRanking = entry.forceRanking;
  if (entry.previousAnliegen !== undefined) input.previousAnliegen = entry.previousAnliegen;
  return input;
}
```

### WR-04: Threshold-Gate-Logik wertet `null` als Pass — Stille Maskierung leerer Korpora

**File:** `scripts/eval-matcher.ts:787-794`
**Issue:** Die Gate-Definition lautet:
```ts
"Clarif-Precision >= 80%": m.clarifPrecision === null || m.clarifPrecision >= 0.80,
"Clarif-FalschPos <= 10%": m.clarifFalschPosRate === null || m.clarifFalschPosRate <= 0.10,
```
Der Kommentar dokumentiert die Absicht („Null gilt als pass"), aber das birgt ein **Silent-Fail-Risiko**: Wenn das Korpus versehentlich keine `expected_clarification: true`-Eintraege mehr enthaelt (z.B. nach einer Refactor-Loesch-Aktion auf `matcher-korpus.json`), wird `clarifPrecision = null` und das Gate **passt automatisch** — selbst wenn der Matcher nie eine Klaerungsfrage stellt. D-13/D-14 bauen darauf auf, dass Phase-2 mind. ein paar Vague-Korpus-Eintraege hat — das ist **nirgends gegen Drift geschuetzt**.

**Fix:** Mindestanzahl erwarteter Eintraege explizit assertieren:
```ts
if (m.nExpectedClarif === 0) {
  console.warn(
    `[GATE] Achtung: 0 Eintraege mit expected_clarification=true im Korpus. ` +
    `Clarif-Precision-Target wird strukturell nicht gemessen — Korpus pruefen!`
  );
}
if (m.nExpectedNoClarif === 0) {
  console.warn(
    `[GATE] Achtung: 0 Eintraege mit expected_clarification=false im Korpus. ` +
    `Clarif-FalschPos-Target wird strukturell nicht gemessen — Korpus pruefen!`
  );
}
```
Optional schaerfer: bei `nExpectedClarif < 3` oder `nExpectedNoClarif < 10` als FAIL werten.

### WR-05: `score < 50`-Filter wird in `parsePipeMatches` UND `runMatch` gleichzeitig verlangt — Inkonsistenz mit Prompt

**File:** `lib/wizard/matcher.ts:280, 333` und Prompt `lib/wizard/matcher.ts:174`
**Issue:** Der Prompt fordert „Score < 50 ist verboten — lieber leere Liste". `parsePipeMatches` (Zeile 280) prueft nur `isNaN(score)`, akzeptiert also `0` oder `49`. Erst `runMatch` (Zeile 333) verwirft Scores `< 50`. Das ist semantisch korrekt, aber:

1. Wenn der Parser oeffentlich exportiert wird (was er ist — `export function parsePipeMatches`), und ein Caller den Parser direkt nutzt (Eval-Skript koennte das tun, tut es derzeit nicht), erhaelt er Roh-Matches mit `score=0`/`49` — die echte Geschaeftslogik liegt in `runMatch`.
2. Es gibt keine Validierung gegen `score > 100`: der Prompt fordert „50–100", aber `parseInt("999", 10)` wird durchgereicht und in `runMatch` lediglich via `Math.round` formal stabilisiert. Ein Match mit `score=999` rutscht durch.

**Fix:** Score-Range-Filter im Parser zentralisieren, oder zumindest den Hard-Cap dokumentieren:
```ts
// in parsePipeMatches, nach parseInt:
if (isNaN(score) || score < 0 || score > 100) continue;
```
Oder wenigstens in `runMatch` den Upper-Cap pruefen:
```ts
if (m.score < 50 || m.score > 100) continue;
```

## Info

### IN-01: `(p as any)`-Casts in `prefilter`, `toCard`, `route.ts` umgehen das `Foerderprogramm`-Typ-System

**File:** `lib/wizard/matcher.ts:124, 128, 129, 158-160`, `app/api/match/route.ts:43-49`
**Issue:** Mehrere Felder (`status`, `bundeslaender`, `foerdersummeMax`, `foerdersummeText`, `kategorien`, `kurzbeschreibung`, `foerdergeber`, `foerdergeberTyp`, `bewerbungsfristText`) werden konsequent ueber `(p as any)` gelesen. Wenn `Foerderprogramm` aus `lib/foerderSchema.ts` diese Felder noch nicht typisiert, ist das ein Hinweis darauf, das Schema zu erweitern — sonst frisst eine Typaenderung in `foerderprogramme.json` keinen Compile-Error.

**Fix:** `lib/foerderSchema.ts` um die fehlenden optionalen Felder ergaenzen, dann die Casts entfernen. Falls bewusst `as any` belassen (weil die JSON heterogen ist), in einem Kommentar erklaeren.

### IN-02: `route.ts` haelt eine zweite Whitelist der Programm-Felder — Drift-Risiko mit `lib/foerderSchema`

**File:** `app/api/match/route.ts:40-50`
**Issue:** Das Mapping `programm: { id, name, foerdergeber, foerdergeberTyp, foerdersummeText, foerdersummeMax, bewerbungsfristText, kategorien, kurzbeschreibung }` ist eine **zweite Quelle der Wahrheit** zusaetzlich zum Frontend-Interface `MatchEntry.programm` in `MatchResultList.tsx:11-21`. Beide Listen stimmen aktuell ueberein, aber nichts erzwingt das. Wenn das Frontend ein neues Feld braucht (z.B. `geberAdresse`), kann man die Server-Whitelist vergessen — das Feld kommt dann silent als `undefined` zurueck.

**Fix:** Entweder ein gemeinsames Interface `MatchProgrammSummary` in `lib/wizard/matcher.ts` exportieren und beide Seiten dagegen typen, oder die ganze `programm`-Subfeld-Liste durchreichen (wenn DB/JSON klein genug ist).

### IN-03: `MAX_LLM_CANDIDATES`, `MAX_MATCHES`, `MATCHER_MAX_TOKENS` als Magic-Numbers — keine Tests gegen Pruefwerte

**File:** `lib/wizard/matcher.ts:33-38`
**Issue:** Die drei Konstanten haben gute Doc-Comments, aber keine Tests verifizieren das Verhalten am Rand (z.B. „weniger als `MAX_MATCHES` Programme im Korpus" oder „`MAX_LLM_CANDIDATES` exakt erreicht"). Bei Aenderung dieser Werte (Cost-Tuning, Prompt-Drift) gibt es keinen Sicherheitsgurt.

**Fix:** Mind. einen Test in `matcher.dispatch.test.ts`, der prueft, dass `cards.length <= MAX_LLM_CANDIDATES` und dass `result.matches.length <= MAX_MATCHES`. Letzteres ist trivial verifizierbar (mock liefert 5 Zeilen, erwarte 3). Optional: die Konstanten exportieren, damit Tests sie referenzieren statt zu hardcoden.

### IN-04: Importierte aber ungenutzte `addUsage`/`emptyLedger` im Eval-Skript

**File:** `scripts/eval-matcher.ts:36, 528`
**Issue:** `addUsage` wird im Live-Pfad ueber `aggLedger = addUsage(aggLedger, e.model, ...)` (Zeile 630) genutzt, aber das aggregierte `aggLedger` selbst wird **nirgends verwendet** — die Aggregation in `aggregate()` rechnet stattdessen ueber `r.costs.eurCents` aus dem `EntryResult`. `aggLedger` ist toter State; die `addUsage`-Schleife in 629-634 ist Compute ohne Konsumenten.

**Fix:** Entweder `aggLedger`-Aggregation in den Bericht aufnehmen (z.B. `report.meta.aggregatedLedger`) oder die Akkumulation komplett entfernen. `emptyLedger` wird in `migrateOldSnapshot` (293, 305) tatsaechlich genutzt — bleibt importiert.

### IN-05: `clarifQuestion` wird nur conditional auf `entryResult` gesetzt — JSON-Konsumenten muessen `undefined` handlen

**File:** `scripts/eval-matcher.ts:637-658`
**Issue:** Stilbruch innerhalb des Eval-Reports: Andere Felder werden unconditional gesetzt (`recall: null`, `offTargetHit: null`), nur `clarifQuestion` wird via `if (clarifQuestion !== undefined) entryResult.clarifQuestion = ...` weggelassen. Im JSON-Output erscheint das Feld dann mal vorhanden, mal fehlend — Konsumenten (Auswertungs-Notebooks, Vergleichs-Skripte) muessen beide Faelle handlen. Konsistenter waere `clarifQuestion: clarifQuestion ?? null`.

**Fix:** `clarifQuestion: clarifQuestion ?? null` im EntryResult-Builder, dann `clarifQuestion: string | null` im Interface.

### IN-06: `MATCHER_SYSTEM`-Prompt enthaelt `${MAX_MATCHES}`-Interpolation, aber Negativbeispiele referenzieren feste „3"

**File:** `lib/wizard/matcher.ts:165, 192, 210, 214` (Negativ-Block sagt „3 statt 4 Spalten" — das ist KORREKT, aber)
**Issue:** Sollte `MAX_MATCHES` jemals geaendert werden (z.B. auf `5`), bleibt im Prompt der Beispielblock mit zwei Beispielen (`bmbf-digitalpakt-2`, `kultur-macht-stark`) bestehen — das LLM koennte verwirrt sein („Beispiel zeigt 2 Zeilen, der Hinweis sagt 5"). Aktuell harmlos (Wert ist 3, Beispiel zeigt 2).

**Fix:** Entweder `MAX_MATCHES` im Code als invariant `const MAX_MATCHES = 3` markieren mit Hinweis „Aenderung erfordert Prompt-Anpassung", oder Beispiele dynamisch generieren (overkill).

### IN-07: `previousAnliegen` wird vom LLM-Prompt akzeptiert, aber in `route.ts` ungetypt durchgereicht

**File:** `app/api/match/route.ts:8, 19`
**Issue:** `body.previousAnliegen` wird ohne `typeof`-Check direkt an `runMatch` weitergegeben. Wenn ein Caller `previousAnliegen: { malicious: "object" }` schickt, landet das Objekt im Prompt — `runMatch` ruft `input.previousAnliegen.trim()` auf (Zeile 237), was bei einem Objekt einen `TypeError` wirft. Aktuell harmlos (Frontend schickt nur Strings), aber an der API-Boundary sollten Typen verifiziert werden — analog zur expliziten `typeof body.anliegen !== "string"`-Pruefung in Zeile 9-11.

**Fix:**
```ts
if (body.previousAnliegen !== undefined && typeof body.previousAnliegen !== "string") {
  return NextResponse.json({ error: "previousAnliegen muss string sein" }, { status: 400 });
}
if (body.forceRanking !== undefined && typeof body.forceRanking !== "boolean") {
  return NextResponse.json({ error: "forceRanking muss boolean sein" }, { status: 400 });
}
// ... gleicher Pattern fuer schulname, schultyp, bundesland, geschaetztesBudgetEur
```

---

_Reviewed: 2026-05-04T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
