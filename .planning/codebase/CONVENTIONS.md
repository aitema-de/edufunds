# Coding Conventions

**Analysis Date:** 2026-04-30

## Naming Patterns

**Files:**
- React components in `components/` use **PascalCase** with `.tsx` extension (e.g. `components/Header.tsx`, `components/Wizard/QuestionCard.tsx`)
- Library modules in `lib/` use **kebab-case** with `.ts` extension (e.g. `lib/wizard/error-classifier.ts`, `lib/wizard/title-fallback.ts`, `lib/foerderSchema.ts` — note: legacy lib files use camelCase like `foerderSchema.ts`, `swr-fetcher.ts`; new wizard files are kebab-case)
- Test files mirror source path with `.test.ts(x)` suffix in `__tests__/` (e.g. `__tests__/lib/wizard/title-fallback.test.ts`)
- Next.js App Router special files use lowercase: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`
- Smoke/script files in `scripts/` use kebab-case prefixed with `smoke-` or category (e.g. `scripts/smoke-llm.ts`, `scripts/smoke-pipeline-models.ts`)

**Functions:**
- camelCase verb-first (e.g. `buildFallbackTitle`, `mergeFacts`, `extractFacts`, `classifyWizardError`, `createWizardSession`)
- Internal helpers stay short and descriptive (`trim`, `shorten`, `pickFirst`, `dropTrailingPunctuation`, `lowercaseFirst`) in `lib/wizard/title-fallback.ts`
- React components: PascalCase named exports (`export function Header()`, `export function QuestionCard()`)

**Variables:**
- camelCase for locals and parameters (`programmName`, `aktivitaeten`, `subjectIsSingleAct`)
- SCREAMING_SNAKE_CASE for module-level constants (`MAX_LEN`, `STANDARD_ABSCHNITTE`, `SINGLE_ACTIVITY_PREFIX`, `LOG_LEVELS`, `COLORS`, `DEFAULT_RETRY_OPTIONS`, `MAX_LLM_CANDIDATES`, `MODEL_INTERVIEW`)
- Domain identifiers can use German words (`schule`, `programm`, `richtlinie`, `aktivitaeten`, `foerderprogramm`, `bewerbungsart`) — Umlaute in identifiers are allowed but ASCII-substituted in JSON data fields (`foerderfaehig` → `foerderfaehig`, `Begruendung`)

**Types:**
- PascalCase interfaces and type aliases (`WizardFacts`, `Foerderprogramm`, `WizardErrorState`, `LogEntry`, `APIError`, `MatchedProgramm`)
- String-literal union types preferred over enums (`type WizardPhase = "interviewing" | "ready_to_generate" | "generating" | "complete" | "failed"` in `lib/wizard/types.ts`, `type ErrorCode = ...` in `lib/errors.ts`)

## Code Style

**Formatting:**
- No Prettier config detected — relies on Next.js defaults (2-space indent, no semicolons in some files, semicolons in others — both styles coexist)
- Mixed quote style: most TypeScript files use double quotes (`"@/lib/foerderSchema"`), legacy lib files use single quotes (`'@/lib/utils'`)
- Trailing commas in multi-line objects and arrays

**Linting:**
- Next.js built-in ESLint via `npm run lint` (`next lint`) — no custom `.eslintrc` at repo root
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- `tsconfig.json` excludes `**/*.test.ts` and `**/*.spec.ts` from app type-checking (tests run through ts-jest)

## Import Organization

**Order observed in `lib/wizard/pipeline.ts`, `lib/wizard/facts-extractor.ts`:**
1. External packages (`import OpenAI from "openai"`, `import { GoogleGenerativeAI } from "@google/generative-ai"`, `import { NextResponse } from "next/server"`, `import { clsx } from "clsx"`)
2. Path-aliased imports with `@/` (e.g. `import type { Foerderprogramm } from "@/lib/foerderSchema"`)
3. Relative imports for sibling modules (e.g. `import { buildFallbackTitle } from "./title-fallback"`)
4. Type-only imports use `import type` consistently in wizard layer

**Path Aliases:**
- `@/*` → repo root (configured in `tsconfig.json` `paths`, mirrored in `jest.config.js` `moduleNameMapper`)
- Used everywhere for non-sibling imports: `@/lib/wizard/*`, `@/components/Wizard/*`, `@/data/foerderprogramme.json`

## Error Handling

**Two-layer strategy:**

**Backend (API routes, lib):**
- Central `APIError` class in `lib/errors.ts` with `ErrorCode` union, status-code map (`ERROR_STATUS_CODES`), and German user-messages (`USER_MESSAGES`)
- Factory helpers: `Errors.validation()`, `Errors.notFound()`, `Errors.aiUnavailable()`, `Errors.aiRateLimit()`, `Errors.dbError()`, `Errors.internal()`
- `withErrorHandler()` wraps route handlers to convert thrown errors into JSON responses with consistent shape (`{ success: false, error: { code, message, status, ... } }`)
- `withRetry()` provides exponential-backoff retry with jitter for external API calls; respects `APIError.isRetryable` flag and standard HTTP/network error codes

**Frontend (wizard UI):**
- `classifyWizardError()` in `lib/wizard/error-classifier.ts` maps raw error strings (e.g. `"GoogleGenerativeAI Error 429"`) to `WizardErrorState` with category (`rate-limit | gemini-down | timeout | validation | not-found | unknown`), German title + message, and flags for `canRetry` / `hasManualFallback`
- Components like `components/Wizard/StartClient.tsx` keep raw `{ message, httpStatus }` and pass to `WizardErrorBlock` which classifies and renders

**Pattern in API routes (`app/api/wizard/answer/route.ts`):**
```typescript
try {
  // ... validate input
  if (!sessionToken || typeof answer !== "string") {
    return NextResponse.json({ error: "..." }, { status: 400 });
  }
  // ... business logic
} catch (err) {
  // bubble or wrap
}
```

**Soft-failure pattern for nice-to-have ops (`lib/wizard/facts-extractor.ts`):**
```typescript
try {
  const { value, usage } = await generateJson<Partial<WizardFacts>>(...);
  return { facts: mergeFacts(...), usage: ... };
} catch (err) {
  console.warn("[wizard/facts-extractor] Extraktion fehlgeschlagen, behalte bisherigen Stand:", err);
  return { facts: currentFacts, usage: null };
}
```

## Logging

**Framework:**
- Custom logger in `lib/logger.ts` with `createLogger(context)` factory
- Pre-configured instances: `apiLogger`, `dbLogger`, `externalApiLogger`, `authLogger`, `businessLogger`
- JSON output in production (`NODE_ENV=production`), color-coded console output in dev
- Levels: `debug | info | warn | error | fatal` controlled by `LOG_LEVEL` env var

**Patterns:**
- `logger.info(msg, metadata)` for routine events
- `logger.error(msg, metadata, error)` to attach `Error` object
- `logRequest(request, requestId)` middleware-style for API entry points
- `withTiming(operation, fn, logger)` for measured async ops
- Wizard internals use plain `console.warn`/`console.log` with `[module/function]` prefix (e.g. `console.warn("[wizard/facts-extractor] ...")`) — not the structured logger

## Comments

**When to Comment:**
- File-level JSDoc block at top of every wizard module explains **why** the module exists (e.g. `lib/wizard/title-fallback.ts`, `lib/wizard/facts-extractor.ts`, `lib/wizard/error-classifier.ts`)
- Inline numbered comments mark fall-through ladders ("// 1. ...", "// 2. ...") in `buildFallbackTitle`
- UAT-bug references inline as historical context: `// UAT-Reproducer 28.04.: zwei Fortbildungen als Aktivitaeten ...`

**JSDoc/TSDoc:**
- Used on exported functions and types with German prose (`/** Klassifiziert rohe Fehler-Strings ... */`)
- Inline `/** ... */` for individual interface fields with semantics (e.g. `/** true, wenn ein Retry-Button sinnvoll ist (transient/serverseitig) */` in `lib/wizard/error-classifier.ts`)
- `@deprecated` markers used (e.g. `MODEL_FLASH` / `MODEL_PRO` re-exports in `lib/wizard/llm.ts`)

## Function Design

**Size:**
- Pure utility functions stay tight (5–30 lines) — see `trim`, `shorten`, `pickFirst`, `dropTrailingPunctuation` in `lib/wizard/title-fallback.ts`
- Business-logic functions span 50–150 lines with explicit fall-through ladders (`buildFallbackTitle`, `classifyWizardError`)

**Parameters:**
- Plain positional parameters for 1–3 args
- Single-object parameter for 4+ args or factory builders (`new APIError(code, message, options)` where `options` bundles `details/cause/requestId/isRetryable`)
- `Pick<Foerderprogramm, "name">` used to narrow input types and avoid pulling whole objects into utilities

**Return Values:**
- Result objects with named fields preferred over tuples (`{ facts, usage }`, `{ value, usage }`, `{ matches, costs, totalCandidates, filteredOut }`)
- Nullable fields explicitly typed (`usage: { model: string; usage: Usage } | null`)
- Soft-failure paths return base/previous state instead of throwing

## Module Design

**Exports:**
- Named exports throughout (no default exports in wizard layer); `lib/errors.ts` and `lib/logger.ts` provide a default export plus named exports for compatibility
- Module-private constants kept un-exported (e.g. `STANDARD_ABSCHNITTE`, `MAX_LEN`, `SINGLE_ACTIVITY_PREFIX`)

**Barrel Files:**
- `components/Wizard/index.ts` exports only `WizardShell` — barrel files used sparingly, individual files imported directly elsewhere
- No barrel in `lib/wizard/` — consumers import each module by name (`@/lib/wizard/title-fallback`, `@/lib/wizard/matcher`)

## Domain Language

**Deutsche Sprache binding:**
- All UI strings, log messages, error messages, JSDoc, comments and commit subjects in German (per `CLAUDE.md` repo convention)
- Domain terms in code identifiers stay German: `schule`, `programm`, `aktivitaeten`, `richtlinie`, `foerderprogramm`, `bewerbungsart`, `kurzbeschreibung`, `eigenanteil`
- Umlaute substituted with `ae/oe/ue/ss` in JSON data fields and string literals processed by tooling (avoid encoding drift)
- Type/code identifiers MAY use Umlaute but the codebase consistently sticks to ASCII (`foerdersummeMin` not `fördersummeMin`)

**Conventional Commits with German subject lines:**
- `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...` prefixes
- Subject line in German, body explains rationale + affected files

## Client/Server Boundaries

- Next.js App Router: server components by default
- Files marked `"use client"` at top of the module when state, effects or browser APIs needed (most files in `components/` and `components/Wizard/` are client components)
- Server components for pure rendering (`app/page.tsx` and friends — no directive needed)
- Library code in `lib/wizard/` is environment-agnostic; DB-backed modules (`lib/wizard/session.ts`) are server-only by import (use `pg`)

## Database Access

- Direct SQL via `pg` (no ORM — see `CLAUDE.md`)
- Helper `query<T>(sql, params)` from `@/lib/db` returns `{ rows, rowCount }`
- Session row mapping kept in module (`rowToSession()` in `lib/wizard/session.ts`)
- Migrations live in `migrations/00X_*.sql`, idempotent

---

*Convention analysis: 2026-04-30*
