# Phase 2 — Deferred Items

## Pre-existing Test-Suite-Failures (out of scope for Plan 02-01)

Festgestellt waehrend Plan 02-01-Execution (2026-05-04). Alle 5 Suites failten
**vor** den Plan-02-01-Aenderungen (verifiziert via `git stash` + `npm test`).
Daher Scope-Boundary: nicht in Plan 02-01 fixen.

| Suite | Wahrscheinliche Ursache | Empfohlener Fix-Owner |
|-------|------------------------|----------------------|
| `__tests__/components/Header.test.tsx` | `SyntaxError: Cannot use import statement outside a module` (lucide-react ESM) | Jest-Config / `transformIgnorePatterns` — Phase 3+ |
| `__tests__/components/Footer.test.tsx` | gleicher ESM-Bug | Phase 3+ |
| `__tests__/lib/ki-antrag-generator.test.ts` | Vermutlich gleicher ESM-Bug oder Mock-Setup | Phase 3+ |
| `__tests__/lib/backend-utils.test.ts` | Vermutlich Setup-Problem | Phase 3+ |
| `app/api/contact/test.ts` | Test in API-Ordner (testMatch greift) | Phase 3+ |

**Plan 02-02 Hinweis:** Beim MatchResultList-UI-Test (jsdom) auf gleichen
ESM-Bug achten. Falls `lucide-react` nicht transformiert wird, ggf. via
`transformIgnorePatterns: ['/node_modules/(?!(lucide-react)/)']` whitelisten.
