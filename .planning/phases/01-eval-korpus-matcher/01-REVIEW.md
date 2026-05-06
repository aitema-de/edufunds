---
phase: 01-eval-korpus-matcher
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/eval-matcher.ts
  - data/eval/matcher-korpus.json
  - package.json
  - .gitignore
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-30
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Eval-Tooling-Phase fuer den Programm-Matcher: Eval-CLI mit drei Modi (Live/Snapshot/Replay), 22-Eintraege-Korpus, npm-Script-Alias und gitignore-Patches. Insgesamt sauberes, gut dokumentiertes Tooling. Korpus ist konsistent (22 unique IDs, alle 39 referenzierten programmIds valide gegen `data/foerderprogramme.json`, Edge-Cases ev-003/019/022 korrekt mit leerem `expected_top3` markiert).

Drei Warnings betreffen Robustheit und Konsistenz im Replay-Pfad: (1) Replay-Snapshots werden ohne Runtime-Validation `as`-gecastet, (2) der JSON-Report enthaelt im Replay-Modus die alten Snapshot-Kosten, obwohl die Konsole "< 0,01 € (replay)" zeigt — Inkonsistenz zwischen Konsole und JSON, (3) `aggLedger` wird akkumuliert aber nirgends ausgewertet (toter Code, der die spaetere Lese-Ergaenzung erschwert).

Info-Items decken Doppelrundungen (Money-Math, kein Bug aber redundant), tote Default-Initialisierungen, ISO-Stempel-Aufloesung und ein Mini-Toolchain-Risiko (`__dirname` unter tsx) ab. Kein Critical-Befund. Keine Sicherheitsvorfaelle (Skript laeuft lokal/CLI, keine Secrets im Code, gitignore deckt `.env*` korrekt ab).

## Warnings

### WR-01: Snapshot-JSON wird ohne Runtime-Validation als typisiert gecastet

**File:** `scripts/eval-matcher.ts:200-207`
**Issue:** `loadReplayResult` parst eine Snapshot-Datei und castet das Resultat per `as { input: MatchInput; result: MatchResult }`, ohne die Struktur zur Laufzeit zu pruefen. Wenn ein Snapshot aus einer aelteren Code-Version stammt (z. B. anderes `MatchResult`-Schema, fehlende `costs`/`matches`-Felder), crasht die Eval erst spaeter — typischerweise an `result.matches.map(...)` (Z. 362) oder `result.costs.entries` (Z. 369) — mit einer schwer zu deutenden TypeError-Meldung. Da Snapshots laut PLAN explizit fuer Regressions-Vergleiche ueber Tage/Wochen gedacht sind, ist Schema-Drift realistisch.

**Fix:**
```typescript
async function loadReplayResult(
  replayDir: string,
  entryId: string
): Promise<{ input: MatchInput; result: MatchResult }> {
  const snapPath = resolve(REPO, replayDir, `${entryId}.json`);
  const raw = await readFile(snapPath, "utf-8");
  const parsed = JSON.parse(raw);

  // Defensive Schema-Pruefung — bricht frueh mit klarer Meldung statt
  // spaeter mit kryptischem TypeError.
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !parsed.input ||
    !parsed.result ||
    !Array.isArray(parsed.result.matches) ||
    !parsed.result.costs
  ) {
    throw new Error(
      `Snapshot ${snapPath} hat unerwartetes Schema (matches/costs fehlen). ` +
        `Vermutlich aus inkompatibler Matcher-Version — Replay nicht moeglich.`
    );
  }
  return parsed as { input: MatchInput; result: MatchResult };
}
```

### WR-02: JSON-Report enthaelt im Replay-Modus alte Snapshot-Kosten — Inkonsistenz zur Konsolen-Ausgabe

**File:** `scripts/eval-matcher.ts:262-263, 366-375, 390-395, 427-432, 466-468`
**Issue:** Im Replay-Modus weist die Konsolen- und Markdown-Ausgabe explizit aus, dass keine Live-LLM-Calls stattgefunden haben (`< 0,01 € (replay-modus, keine LLM-Calls)`). Die per-Entry-`costs` werden jedoch unverhindert aus dem Snapshot uebernommen (Z. 390-395) und in `aggregate.totalEurCents`/`totalUsdCents`/`totalCalls`/`totalTokens` aufsummiert (Z. 262-265). Der finale JSON-Report unter `aggregate.totalEurCents` enthaelt damit die Snapshot-Kosten des urspruenglichen Live-Laufs, obwohl die Konsole sagt, der Replay habe nichts gekostet. Downstream-Konsumenten, die nur den JSON-Report lesen (z. B. Baseline-Vergleichs-Tooling aus 01-02), werden Replay-Laeufe faelschlicherweise als kostenrelevant in Trends einrechnen.

Die Kommentar-Logik bei `aggLedger` (Z. 366-368) erkennt das Problem bereits — wendet die Heuristik aber nur auf den ungenutzten `aggLedger` an, nicht auf die per-Entry-`costs`, die tatsaechlich aggregiert werden.

**Fix:** Im Replay-Modus die Kosten je Eintrag auf null setzen:
```typescript
results.push({
  // ...
  costs: flags.replayDir
    ? { eurCents: 0, usdCents: 0, calls: 0, totalTokens: 0 }
    : {
        eurCents: result.costs.eurCents,
        usdCents: result.costs.usdCents,
        calls: result.costs.calls,
        totalTokens: result.costs.totalTokens,
      },
  // ...
});
```
Alternativ einen Marker `mode: "replay"` ins per-Entry-Objekt schreiben und den Aggregator den Replay-Pfad explizit auf 0 setzen lassen, wenn `meta.mode === "replay"`.

### WR-03: `aggLedger` wird akkumuliert aber nirgends ausgewertet — toter Code mit Konsistenz-Risiko

**File:** `scripts/eval-matcher.ts:312, 368-375`
**Issue:** `let aggLedger: CostLedger = emptyLedger();` (Z. 312) wird in der Schleife ueber `addUsage()` befuellt (Z. 370-374), aber die Variable wird im weiteren Verlauf des Skripts nie gelesen, weder im Konsolen-Bericht noch im JSON-Report noch in `aggregate()`. Die Aggregation der Kosten passiert stattdessen ueber `r.costs.eurCents` etc. (Z. 262-265), die direkt aus `result.costs` kopiert wurden.

Der `aggLedger` wuerde aber im Detailgrad mehr liefern (per-Model-Breakdown via `entries`), was nuetzlich waere. Aktuell ist es schlicht toter Berechnungsaufwand. Schlimmer: Wenn jemand spaeter `aggLedger.eurCents` in den Report einbaut, weicht er von der Summe der per-Entry-`costs.eurCents` ab (durch Rundung in `addUsage`, Z. 89-90 von pricing.ts). Das wirkt wie ein Bug, ist aber nur eine Doppel-Quelle.

**Fix:** Entweder loeschen (wenn nicht gebraucht) oder im Report ausgeben und die per-Entry-Summen entfernen — eine Quelle der Wahrheit:
```typescript
// Variante "loeschen":
// - Z. 312 entfernen
// - Z. 366-375 (`if (!flags.replayDir) { for (const e ...) { aggLedger = addUsage ... } }`) entfernen.

// Variante "nutzen":
// In aggregate() oder im Report-Block:
//   totalEurCents: aggLedger.eurCents,
//   totalUsdCents: aggLedger.usdCents,
//   totalCalls: aggLedger.calls,
//   totalTokens: aggLedger.totalTokens,
//   modelBreakdown: aggLedger.entries.reduce(...) // per-Model-Aggregat
// und die per-Entry-`costs.eurCents`-Summen-Reduktion entfernen.
```

## Info

### IN-01: Doppelte Rundung von `totalEurCents`/`totalUsdCents` ist redundant

**File:** `scripts/eval-matcher.ts:280-281`
**Issue:** `Math.round(totalEurCents * 100) / 100` rundet auf zwei Nachkommastellen — aber die Eingabewerte sind bereits in Cents mit zwei Nachkommastellen vorgerundet (siehe `addUsage` in `pricing.ts:89-90`). Eine Summe von Werten, die je `Math.round(x*100)/100`-gerundet sind, hat selbst maximal Nachkommastellen, die die Anzahl der Summanden plus 2 nicht ueberschreiten — und wird durch erneutes `Math.round(*100)/100` praktisch nicht veraendert. Kein Bug, aber redundanter Code.
**Fix:** `totalEurCents: ok.reduce((s, r) => s + r.costs.eurCents, 0),` — direkt durchreichen. `formatEur` in `pricing.ts:95` macht keine Annahme ueber Sub-Cent-Decimals.

### IN-02: Redundante Initialisierung von `perCategory` mit Default-Werten

**File:** `scripts/eval-matcher.ts:239-257`
**Issue:** Z. 239-243 initialisiert `perCategory` mit `{ n: 0, recallMean: 0, offTargetRate: 0 }` fuer alle drei Kategorien. Direkt danach (Z. 244-257) wird derselbe Slot vollstaendig durch die for-Schleife ueberschrieben. Die Initial-Zuweisung ist toter Code.
**Fix:**
```typescript
const perCategory = {} as Record<Category, PerCategoryStats>;
for (const cat of ["kurz", "ausfuehrlich", "vag"] as const) {
  const subset = nonEdge.filter((r) => r.category === cat);
  perCategory[cat] = {
    n: subset.length,
    recallMean: subset.length === 0 ? 0 : subset.reduce((s, r) => s + (r.recall ?? 0), 0) / subset.length,
    offTargetRate: subset.length === 0 ? 0 : subset.filter((r) => r.offTargetHit === true).length / subset.length,
  };
}
```

### IN-03: ISO-Stempel mit Sekunden-Aufloesung — Kollisionsrisiko bei parallelen Laeufen

**File:** `scripts/eval-matcher.ts:304-305, 358, 439`
**Issue:** `new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")` liefert z. B. `2026-04-30-14-22-07`. Zwei in derselben Sekunde gestartete Laeufe (z. B. via Make-Target oder CI-Parallel-Job) wuerden in dasselbe Snapshot-Verzeichnis schreiben oder Reports ueberschreiben. Nicht akut, aber ein Anti-Pattern fuer Eval-Tooling.
**Fix:** Millisekunden mitnehmen oder Suffix mit kurzem Random-Hash:
```typescript
const isoStamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 23);
// → "2026-04-30_14-22-07-123" (mit Millisekunden)
```

### IN-04: `__dirname` in tsx-Skript koennte unter ESM-only-Toolchain brechen

**File:** `scripts/eval-matcher.ts:27`
**Issue:** `resolve(__dirname, "..")` funktioniert mit `tsx --env-file=.env.local` aktuell, weil tsx eine CJS-Kompatibilitaetsschicht bietet. Sollte das Repo spaeter auf reines ESM umsteigen oder ein anderer Runner gewaehlt werden, ist `__dirname` undefiniert. Risiko klein, weil `tsx` im npm-Script verankert ist (`package.json:23`).
**Fix (defensiv, optional):**
```typescript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```
Oder: alle Pfade direkt absolut/repo-relativ ohne `__dirname` aufbauen, z. B. `resolve(process.cwd(), "data/eval/matcher-korpus.json")`. Bleibt aber an `cwd` der Aufrufstelle gekoppelt — `__dirname`-Variante ist robuster.

### IN-05: `process.exit(2)` im Validator macht das Skript schwer testbar

**File:** `scripts/eval-matcher.ts:111-114, 129-130, 146-148, 156-159, 162-165, 168-173, 175-180`
**Issue:** Sieben `process.exit(2)`-Aufrufe in `loadKorpusAndValidate` und `parseFlags`. Fuer ein CLI-Skript ist das in Ordnung, aber wenn die Validation-Logik spaeter aus Tests heraus aufgerufen werden soll (z. B. Snapshot-Test fuer Korpus-Schema), bricht das den Test-Runner-Prozess. Aktuell nicht akut — Phase-Plan erwaehnt keinen Test fuer `eval-matcher.ts` selbst.
**Fix (optional, fuer spaetere Test-Erweiterungen):** Separate Validate-Funktion, die einen `Result`-Typ zurueckgibt; `main()` ruft sie auf und macht `process.exit` selbst:
```typescript
type ValidateResult = { ok: true; korpus: KorpusEntry[] } | { ok: false; error: string };

async function validateKorpus(): Promise<ValidateResult> {
  // ... wirft nicht, exittet nicht, gibt strukturierten Fehler zurueck
}

// in main():
const v = await validateKorpus();
if (!v.ok) {
  console.error(`${LOG_PREFIX} ${v.error}`);
  process.exit(2);
}
```

---

_Reviewed: 2026-04-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
