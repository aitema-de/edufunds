---
phase: 05-wizard-pipeline-tuning-ux-l-cke
reviewed: 2026-05-20T12:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - .github/workflows/pipeline-eval.yml
  - __tests__/eval/fixtures/llm-stubs.ts
  - __tests__/eval/geber-classification.test.ts
  - __tests__/eval/pipeline-aggregation.test.ts
  - __tests__/eval/pipeline-determinism.test.ts
  - __tests__/eval/pipeline-finanzplan-sub.test.ts
  - __tests__/eval/pipeline-fk-match.test.ts
  - __tests__/eval/pipeline-gate.test.ts
  - __tests__/eval/pipeline-judge-rubric.test.ts
  - __tests__/eval/pipeline-marker-detection.test.ts
  - __tests__/eval/pipeline-regex-detection.test.ts
  - __tests__/eval/pipeline-snapshot-replay.test.ts
  - __tests__/lib/wizard/config.test.ts
  - __tests__/lib/wizard/pipeline.compliance.test.ts
  - components/Wizard/GeneratingProgress.tsx
  - lib/wizard/config.ts
  - lib/wizard/geber-classification.ts
  - lib/wizard/geber-guidance.ts
  - lib/wizard/llm.ts
  - lib/wizard/pipeline.ts
  - lib/wizard/programm-kriterien.ts
  - lib/wizard/prompts.ts
  - lib/wizard/stage-labels.ts
  - lib/wizard/types.ts
  - scripts/check-dossier-coverage.ts
  - scripts/eval-pipeline-internals.ts
  - scripts/eval-pipeline.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-20T12:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Phase 5 delivers the Pipeline-Tuning-Eval-Stack including four feature-flag-controlled quality levers (Hebel 1-4), an LLM-as-Judge eval framework, and a CI threshold gate. The architecture is well-structured: pure functions are correctly separated into `eval-pipeline-internals.ts`, the compliance-check stage is properly isolated behind a feature flag, and the 2σ-gate logic is sound.

No critical security or data-loss issues were found. The warnings centre on three correctness risks: a wrong argument order when calling `detectMarkerSource`, an ambiguous loop-guard variable that complianceLoopCount is only ever set to 1 after the check making the guard trivially always-true for the first call, and a regex global-flag state issue in the HALLU patterns. Two additional warnings cover edge-case handling. The info items are minor: a deprecated export alias, an incomplete string in a test stub, and two `as any` casts in production code.

## Warnings

### WR-01: Wrong argument order in `detectMarkerSource` call

**File:** `scripts/eval-pipeline-internals.ts:737`

**Issue:** `detectMarkerSource` is defined as `(haystack: string, marker: string, artefacts: GenerationArtefacts)` but is called with `detectMarkerSource(m.marker, m.marker, artefacts)` — the first argument should be the full haystack string, not the marker itself. This means the source classification (`section` / `finalText` / `finanzplan-*`) is always computed against a string that is just the marker text, so it will never match any `artefacts.finanzplan` or `artefacts.sections` entry and will always return `"finalText"`. The `MarkerHit.foundIn` field in all layer-1 hits is therefore always `"finalText"`, making the finanzplan-hallu-counter in `evaluateEntry` (line 454-457) always 0 regardless of where a marker actually appeared.

**Fix:**
```typescript
// line 737 — pass the real haystack, not the marker twice
layer1Hits.push({
  marker: m.marker,
  snippet: extractContext(haystack, m.marker, 60),
  foundIn: detectMarkerSource(haystack, m.marker, artefacts), // was: m.marker, m.marker
});
```

---

### WR-02: `complianceLoopCount` check is structurally dead (always passes on first evaluation)

**File:** `lib/wizard/pipeline.ts:415`

**Issue:** The variable `complianceLoopCount` is initialised to `0` on line 406, and the guard on line 415 reads `if (cc.violations.length > 0 && complianceLoopCount === 0)`. It is always 0 at that point because it is only incremented inside this same `if`-block (line 423: `complianceLoopCount = 1`). The condition therefore never prevents a second repair call — it just means the repair is only attempted once, which is the intended behaviour but relies on the fact that the block is only entered once. The guard `complianceLoopCount === 0` provides no actual protection against re-entry because the surrounding code only runs the whole compliance section once. Worse, the intent described in comments ("Loop-Count enforced: max 1 Iteration T-05-06-01 DoS-Mitigation") implies a loop that does not actually exist. If a future developer wraps the compliance block in a real loop to retry, the guard would fire correctly for one iteration — but currently the protection is illusory. More practically: `complianceLoopCount` is incremented to 1 on line 423 but this value is never read again, so a linter or dead-code elimination pass may remove it, making the situation worse silently.

**Fix:** Either make the guard explicit and honest, or implement the loop that the comment implies:
```typescript
// Option A — honest one-shot (remove misleading loop-count naming):
if (cc.violations.length > 0) {
  // single compliance-repair pass (T-05-06-01: intentionally not retried)
  const revFix = await generateText(...);
  finalRes = { value: revFix.value, usage: revFix.usage };
  usages.push({ model: MODEL_PRO, usage: revFix.usage });
}

// Option B — real loop with hard cap (if retries are actually desired):
let complianceLoopCount = 0;
while (complianceLoopCount < 1) {
  const cc = await runComplianceCheck(finalRes.value ?? "", richtlinie.antragsstruktur.abschnitte);
  if (cc.violations.length === 0) break;
  const revFix = await generateText(...);
  finalRes = { value: revFix.value, usage: revFix.usage };
  usages.push({ model: MODEL_PRO, usage: revFix.usage });
  complianceLoopCount++;
}
```

---

### WR-03: HALLU_REGEX_PATTERNS with global flag are not safe for multi-call reuse

**File:** `scripts/eval-pipeline-internals.ts:228-236`

**Issue:** All patterns in `HALLU_REGEX_PATTERNS` use the `g` (global) or `gi` flag. JavaScript `RegExp` objects with global flags maintain internal `lastIndex` state. While `scoreWiz02` correctly creates fresh patterns via `new RegExp(pattern.source, pattern.flags)` before calling `matchAll` (line 747), `pipeline-regex-detection.test.ts` also constructs fresh patterns (lines 14, 21, 28), so that test file is safe. However any future caller that uses the exported `HALLU_REGEX_PATTERNS` object directly (e.g. `HALLU_REGEX_PATTERNS.datum_praezise.test(str)` in a loop) will encounter stale `lastIndex` state and produce wrong results. The exported constant gives no indication this is unsafe.

**Fix:** Export the patterns as `{ source, flags }` tuples instead of live `RegExp` objects, or add a JSDoc warning:
```typescript
// Option A — factory function (prevents misuse):
export function freshHalluPatterns(): Record<string, RegExp> {
  return Object.fromEntries(
    Object.entries(HALLU_REGEX_PATTERNS_SOURCE).map(([k, { src, flags }]) => [k, new RegExp(src, flags)])
  );
}

// Option B (minimal) — add a doc comment to the existing export:
/**
 * WARNUNG: RegExp-Objekte mit global-Flag (g/gi). Niemals direkt mit .test() in Schleifen
 * verwenden — immer via `new RegExp(pattern.source, pattern.flags)` frisch instanziieren.
 * scoreWiz02() macht das korrekt. Bei direkter Verwendung droht falsches lastIndex-Verhalten.
 */
export const HALLU_REGEX_PATTERNS: Record<string, RegExp> = { ... };
```

---

### WR-04: `loadKorpusAndValidate` calls `process.exit(2)` inside a try-block after an `await` that can itself throw

**File:** `scripts/eval-pipeline.ts:246-248`

**Issue:** On lines 246-248 the script reads `PROGRAMME_PATH` and parses it without a try-catch:
```typescript
const programmeRaw = await readFile(PROGRAMME_PATH, "utf-8");
const programme = JSON.parse(programmeRaw) as Foerderprogramm[];
```
If `foerderprogramme.json` is missing or malformed the unhandled rejection propagates to `main()` which catches it and calls `process.exit(1)` with the generic "Crash" message, losing the specific context. This is inconsistent with the careful error handling used for `KORPUS_PATH` (lines 223-236) which prints a user-friendly error before exiting with code 2.

**Fix:**
```typescript
let programme: Foerderprogramm[];
try {
  const programmeRaw = await readFile(PROGRAMME_PATH, "utf-8");
  programme = JSON.parse(programmeRaw) as Foerderprogramm[];
} catch (err) {
  console.error(`${LOG_PREFIX} foerderprogramme.json nicht lesbar oder ungueltig: ${PROGRAMME_PATH}`);
  process.exit(2);
}
```

---

### WR-05: `pipeline.compliance.test.ts` Test 3 counter assertion is too weak to catch the bug it targets

**File:** `__tests__/lib/wizard/pipeline.compliance.test.ts:203-204`

**Issue:** Test 3 verifies that a compliance-revision call is triggered when the output is missing sections. The assertion is:
```typescript
expect(textCallCount).toBeGreaterThanOrEqual(2);
```
This passes as long as `generateText` was called at least twice. But since `generateText` is called once per outline section during section generation (there can be multiple sections), the count of 2 or more is guaranteed even without the compliance-revision call. The test does not isolate whether the _extra_ compliance-repair call specifically happened — it could pass even if the compliance-check branch is broken. A more precise assertion would check that the call count is strictly greater than the baseline (section+revision calls).

**Fix:** Count baseline calls before the compliance step by checking the exact call count. The simplest approach: mock the `richtlinie` to produce a single section so the baseline count is predictable:
```typescript
// After runPipeline completes, assert count > 2 (1 section-write + 1 revision + >= 1 compliance-revision)
// With a single-section richtlinie the baseline generateText calls = 1 (section) + 1 (revision) = 2
// So compliance-revision fired if textCallCount >= 3:
expect(textCallCount).toBeGreaterThanOrEqual(3);
```
Or assert the specific compliance event count alongside:
```typescript
expect(complianceEvents).toHaveLength(1);
// Verify extra text call happened — compliance-revision adds at least 1 beyond the baseline
expect(textCallCount).toBeGreaterThan(2); // stricter: implies compliance-revision fired
```

---

## Info

### IN-01: `MODEL_FLASH` and `MODEL_PRO` are deprecated re-exports still used in test mocks

**File:** `lib/wizard/llm.ts:48-51`, `__tests__/eval/pipeline-judge-rubric.test.ts:12-15`

**Issue:** `MODEL_FLASH` and `MODEL_PRO` are marked `@deprecated` in `lib/wizard/llm.ts` with a note that the new names are `MODEL_INTERVIEW` and `MODEL_PIPELINE`. However the test mock at `pipeline-judge-rubric.test.ts:12-15` still uses the old names:
```typescript
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-v4-pro",
  ...
}));
```
This is harmless today (they are aliases), but if the deprecated exports are eventually removed the mock will no longer shadow the correct names, causing the test to call the live LLM.

**Fix:** Update the mock to use both names (or only the new canonical names):
```typescript
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_FLASH: "deepseek-chat",   // keep until @deprecated exports are removed
  MODEL_PRO: "deepseek-v4-pro",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));
```

---

### IN-02: Truncated string in `STUB_JUDGE_RESPONSE_VERBAND_UNI` fixture

**File:** `__tests__/eval/fixtures/llm-stubs.ts:206`

**Issue:** The `verbesserung` string for the `methodik-explizit` criterion is truncated mid-word:
```
"verbesserung": "Kontrollmassnahmen und Instrumente detaillierter ausfu",
```
The word `ausfu` is obviously a cut-off of `ausfuehren` or `ausfuehrlich`. The stub is used in the judge-rubric test. While the test currently does not assert on this specific string's content, future tests that verify `verbesserung` values will silently pass against a stub that does not match what a real LLM would produce.

**Fix:**
```typescript
verbesserung: "Kontrollmassnahmen und Instrumente detaillierter ausfuehren",
```

---

### IN-03: `as any` casts in `prompts.ts` for `Foerderprogramm` field access

**File:** `lib/wizard/prompts.ts:165-174`

**Issue:** `programmBlock()` accesses every field of `Foerderprogramm` via `(p as any).foerdergeber`, `(p as any).foerdergeberTyp`, etc. This pattern appears 9 times across `programmBlock`, `buildInterviewerUserPrompt`, `buildOutlinePrompt` and `buildSectionPrompt`. It bypasses TypeScript's type checking for these fields entirely. If the `Foerderprogramm` schema changes (field renamed or removed), no compile-time error will surface here.

**Fix:** Either add the missing fields to the `Foerderprogramm` type (or a local interface that extends it), or use a type guard helper:
```typescript
interface FoerderprogrammExtended extends Foerderprogramm {
  foerdergeber?: string;
  foerdergeberTyp?: string;
  beschreibung?: string;
  foerdersummeText?: string;
  zielgruppeText?: string;
  bewerbungsfristText?: string;
  kategorien?: string[];
  foerderkriterien?: string[];
}

function programmBlock(p: FoerderprogrammExtended): string {
  // no more `as any` needed
}
```

---

### IN-04: `eval-pipeline.ts` loads `foerderprogramme.json` twice

**File:** `scripts/eval-pipeline.ts:246-247` and `scripts/eval-pipeline.ts:807-808`

**Issue:** `foerderprogramme.json` is read and parsed in `loadKorpusAndValidate` (lines 246-247) for ID validation, and then read and parsed again in `main` (lines 807-808) for the live pipeline runs. For a 131-programme JSON file this is a minor inefficiency but can become a silent inconsistency bug if a file is updated between the two reads (e.g. during a long eval run).

**Fix:** Return the parsed `programme` array from `loadKorpusAndValidate` and pass it into `main` instead of reading the file a second time:
```typescript
async function loadKorpusAndValidate(single?: string | null): Promise<{
  korpus: PipelineKorpusEntry[];
  programme: Foerderprogramm[];
}> {
  // ... existing validation ...
  return { korpus, programme };
}
```

---

_Reviewed: 2026-05-20T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
