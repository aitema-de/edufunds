# Testing Patterns

**Analysis Date:** 2026-04-30

## Test Framework

**Runner:**
- Jest 29.7.0 with `ts-jest` 29.4.9
- Config: `jest.config.js` (uses `next/jest` to auto-load Next.js + `.env` files)
- Test environment: `jest-environment-jsdom` (single env for both DOM and node-style tests)

**Assertion Library:**
- Jest built-in `expect` plus `@testing-library/jest-dom` 6.9.1 for DOM matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.)

**Run Commands:**
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:smoke     # Run scripts/smoke-test.js (HTTP smoke against deployed URL)
```

**TypeScript handling:**
- `next/jest` wires SWC for transpilation
- `tsconfig.json` excludes `**/*.test.ts(x)` from app type-check; tests run independently through Jest

## Test File Organization

**Location:**
- Centralized in `__tests__/` mirroring source layout (NOT co-located)
- Source `lib/wizard/title-fallback.ts` → test `__tests__/lib/wizard/title-fallback.test.ts`
- Source `components/Header.tsx` → test `__tests__/components/Header.test.tsx`

**Naming:**
- `<source-name>.test.ts` for library code
- `<ComponentName>.test.tsx` for components
- Lowercase kebab-case mirrors the source filename

**Structure:**
```
__tests__/
  components/
    Footer.test.tsx
    Header.test.tsx
  lib/
    backend-utils.test.ts
    foerderSchema.test.ts
    ki-antrag-generator.test.ts
    utils.test.ts
    wizard/
      facts-extractor.test.ts
      outline-fallback.test.ts
      title-fallback.test.ts
```

**Test discovery (`jest.config.js`):**
- `testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)']`
- `testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/']`

## Test Structure

**Suite Organization:**

Pure-function suites are flat with one `describe` per exported function (`__tests__/lib/wizard/title-fallback.test.ts`):
```typescript
import { buildFallbackTitle } from "@/lib/wizard/title-fallback";
import type { WizardFacts } from "@/lib/wizard/types";

const PROGRAMM = { name: "DigitalPakt 2.0" } as const;

function facts(over: Partial<WizardFacts> = {}): WizardFacts {
  return { ...over };
}

describe("buildFallbackTitle", () => {
  it("nutzt explizit gesetzten projekt.titel", () => {
    const t = buildFallbackTitle(PROGRAMM, facts({ projekt: { titel: "Tablet-Beschaffung" } }));
    expect(t).toBe("Tablet-Beschaffung");
  });
  // ...
});
```

Larger suites use nested `describe` blocks for sub-categories (`__tests__/lib/utils.test.ts`):
```typescript
describe('Utils - cn Funktion', () => {
  describe('Basis-Funktionalitaet', () => { /* ... */ });
  describe('Tailwind-Merge Integration', () => { /* ... */ });
  describe('Arrays von Klassen', () => { /* ... */ });
  describe('Edge Cases', () => { /* ... */ });
  describe('Real-World Anwendungen', () => { /* ... */ });
});
```

**Test naming language:**
- Component tests use German imperative ("sollte ... rendern" — "should render ...")
- Wizard pure-function tests use German declarative ("liefert genau 7 Standard-Abschnitte", "ignoriert leere Strings im Update")
- UAT-bug regression tests prefixed `UAT-Reproducer:` to mark provenance (`__tests__/lib/wizard/facts-extractor.test.ts:55`)

**Assertion patterns:**
- `toBe` for primitive equality
- `toEqual` for structural equality on objects/arrays
- `toContain` / `not.toContain` for substring and array membership
- `toBeGreaterThan` / `toBeLessThanOrEqual` for length and numeric bounds
- `toHaveLength` for array length

## Mocking

**Framework:** Jest built-in `jest.mock` and `jest.fn()`.

**Global setup (`test/setup.tsx`, loaded via `setupFilesAfterEnv`):**

```typescript
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() { return { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() } },
  usePathname() { return '' },
  useSearchParams() { return new URLSearchParams() },
}))

// Mock next/link as plain anchor
jest.mock('next/link', () => {
  return ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
    return <a {...props}>{children}</a>
  }
})

// Mock window.matchMedia, IntersectionObserver, ResizeObserver, scrollTo
```

**Per-suite mocking (component tests, e.g. `__tests__/components/Header.test.tsx`):**

```typescript
jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
```

**What to Mock:**
- Next.js navigation primitives (`next/navigation`, `next/link`) — globally
- Animation libraries that fight jsdom (`framer-motion`) — per suite
- Browser APIs missing in jsdom (`matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo`) — globally

**What NOT to Mock:**
- Pure utility/business-logic functions — wizard tests in `__tests__/lib/wizard/*` exercise the real implementation with handcrafted input fixtures
- Domain types — tests import real `WizardFacts` / `Foerderprogramm` types from source
- Internal modules — no `jest.mock("@/lib/...")` calls in the wizard test layer

**LLM calls:**
- Functions that call DeepSeek/Gemini are NOT unit-tested with mocked responses
- They're verified through `scripts/smoke-*.ts` scripts that hit the live provider with `npx tsx --env-file=.env.local scripts/smoke-llm.ts`
- This keeps unit tests deterministic and fast; LLM-coupled behavior gets contract-tested separately

## Fixtures and Factories

**Inline fixture factories (preferred for wizard tests):**
```typescript
function facts(over: Partial<WizardFacts> = {}): WizardFacts {
  return { ...over };
}
// Used as: facts({ schule: { name: "GS X" } })
```

**Module-level constants for shared fixtures:**
```typescript
const PROGRAMM = { name: "DigitalPakt 2.0" } as const;
```

**JSON fixture files for schema/data tests:**
- `mocks/test-programme.json` — imported via `import testData from '@/mocks/test-programme.json'` in `__tests__/lib/foerderSchema.test.ts`
- Contains `gueltigeProgramme`, `ungueltigeProgramme`, `ungueltigeFoerdergeberTypen` arrays
- Single source for valid + invalid edge cases per domain entity

**Location:**
- Inline factories live next to their test
- Shared JSON fixtures in `mocks/` at repo root

## Coverage

**Target (`jest.config.js`):**
```javascript
coverageThreshold: {
  global: { branches: 50, functions: 50, lines: 50, statements: 50 }
}
```

**Collection scope:**
```javascript
collectCoverageFrom: [
  'lib/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
]
```

**View Coverage:**
```bash
npx jest --coverage
```

## Test Types

**Unit Tests (the active layer):**
- Wizard pure functions (`__tests__/lib/wizard/*.test.ts`) — deterministic, no I/O, no LLM
- Utility functions (`__tests__/lib/utils.test.ts`) — `cn()` Tailwind helper
- Schema validation (`__tests__/lib/foerderSchema.test.ts`) — checks fixture data conforms to TS types

**Component Tests:**
- React-Testing-Library based (`__tests__/components/Header.test.tsx`, `Footer.test.tsx`)
- `render()`, `screen.getByText`, `fireEvent`, `waitFor` from `@testing-library/react`
- Currently part of the legacy failing suite (pre-Wizard era)

**Integration Tests:**
- Not present as Jest suites
- Replaced by smoke scripts (`scripts/smoke-pipeline-with-extractor.ts`, `scripts/smoke-pipeline-rerun.ts`, `scripts/smoke-critique-rerun.ts`, `scripts/smoke-facts-extractor.ts`) that exercise the full wizard pipeline with live LLM
- Run manually before deploys, output to `tmp/` (gitignored)

**E2E Tests:**
- `e2e/` directory excluded from Jest (`testPathIgnorePatterns`) but no active framework configured

**Smoke Tests (post-deploy):**
- `scripts/smoke-test.sh` — bash + curl, checks HTTP 200 on static pages and key endpoints
- `scripts/smoke-test.js` — Node-based, invoked via `npm run test:smoke`
- `scripts/smoke-llm.ts` and `scripts/smoke-llm-large.ts` — verify LLM provider connectivity
- `scripts/smoke-pipeline-models.ts` — A/B compare DeepSeek models for section generation
- `scripts/security-test.sh` — security smoke

## Common Patterns

**Async Testing (LLM-touching code in `lib/wizard/facts-extractor.ts` is exercised via the synchronous `mergeFacts` helper, not the async `extractFacts`):**

```typescript
it("merged neue Felder in bestehenden Schule-Slot, ohne Bestand zu loeschen", () => {
  const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
  const out = mergeFacts(base, { schule: { schuelerzahl: 312 } });
  expect(out.schule).toEqual({ name: "Borsigwalder Grundschule", schuelerzahl: 312 });
});
```

**Pattern: split modules so the deterministic core is unit-testable and the LLM-bound shell is smoke-tested.**

**Determinism Testing:**
```typescript
it("liefert frische Abschnitt-Objekte (keine geteilten Referenzen)", () => {
  const a = buildFallbackOutline(PROGRAMM, {});
  const b = buildFallbackOutline(PROGRAMM, {});
  a.abschnitte[0]!.name = "Mutiert";
  expect(b.abschnitte[0]!.name).toBe("Antragsteller und Schule");
});
```

**Boundary/Edge-Case Testing:**
```typescript
it("kuerzt sehr lange Titel auf <= 100 Zeichen", () => {
  const langeAktivitaet = "Anschaffung eines kompletten Klassen-Sets aus Tablets, ...";
  const t = buildFallbackTitle(PROGRAMM, facts({ projekt: { aktivitaeten: [langeAktivitaet] }, schule: { name: "Grundschule" } }));
  expect(t.length).toBeLessThanOrEqual(100);
  expect(t.endsWith("...")).toBe(true);
});

it("ist robust gegen leeren programm.name", () => {
  const t = buildFallbackTitle({ name: "" }, facts());
  expect(t).toBe("Antrag auf Foerderung: Foerderprogramm");
});
```

**UAT-Regression Pattern (preserves bug context inline):**
```typescript
it("springt zu Schule+Programm, wenn Subject Einzelaktivitaet ist und mehrere Aktivitaeten vorliegen", () => {
  // UAT-Reproducer 28.04.: zwei Fortbildungen als Aktivitaeten - die erste taugt
  // nicht als vorhaben-uebergreifender Antragstitel.
  const t = buildFallbackTitle(PROGRAMM, facts({ projekt: { aktivitaeten: [...] }, schule: { name: "Borsigwalder Grundschule" } }));
  expect(t).toBe("Foerdervorhaben an der Borsigwalder Grundschule - Antrag bei DigitalPakt 2.0");
});
```

**Setup/Teardown:**
- `beforeEach()` used in component tests for `window.scrollY` reset (`__tests__/components/Header.test.tsx:13`)
- No `afterEach`/`afterAll` cleanup needed because no module mocks reach beyond suite scope

## Known Failing Suites (Pre-Existing Legacy)

The following 5 suites fail in the current `feature/wizard-adaptive` baseline. They are pre-Wizard legacy and NOT relevant to ongoing wizard work — fix only when touching that area:
- `__tests__/components/Header.test.tsx`
- `__tests__/components/Footer.test.tsx`
- `__tests__/lib/ki-antrag-generator.test.ts`
- `__tests__/lib/backend-utils.test.ts`
- `app/api/contact` related tests

The 5 actively maintained green suites are:
- `__tests__/lib/utils.test.ts`
- `__tests__/lib/foerderSchema.test.ts`
- `__tests__/lib/wizard/outline-fallback.test.ts`
- `__tests__/lib/wizard/title-fallback.test.ts`
- `__tests__/lib/wizard/facts-extractor.test.ts`

When adding new wizard logic, follow the wizard-test pattern: pure-function modules with inline factory + flat `describe`, no LLM mocks, UAT bugs documented inline as regression tests.

---

*Testing analysis: 2026-04-30*
