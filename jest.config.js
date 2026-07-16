const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/test/setup.tsx'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // /.claude/ ausschliessen: dort liegen Agent-Worktrees mit eigenen Kopien des
  // Repos (inkl. package.json + Testdateien). Ohne diesen Ausschluss scannt Jest
  // sie mit, was Haste-Modul-Kollisionen und Hunderte Phantom-Failures aus
  // veralteten Daten-Snapshots erzeugt.
  // app/api/contact/test.ts ist ein manuelles ts-node-Skript (Funktionen statt
  // it/describe), kein Jest-Test — sonst "must contain at least one test".
  // __tests__/integration/ laeuft gegen ein echtes PostgreSQL und hat eine eigene
  // Config (jest.integration.config.js, `npm run test:integration`). Hier ausschliessen,
  // damit `npm test` ohne Datenbank auskommt und schnell bleibt.
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/\\.claude/', '/app/api/contact/test\\.ts$', '/__tests__/integration/'],
  // Verhindert zusaetzlich die Haste-Modul-Kollision (doppelte package.json) durch
  // die Agent-Worktrees unter /.claude/.
  modulePathIgnorePatterns: ['/\\.claude/'],
  // ESM-Pakete (lucide-react liefert reine ESM-Imports) durch Jest-Babel transformieren.
  // Plan 02-02 (Rule-3-Auto-Fix): MatchResultList.tsx + ClarificationCard.tsx importieren
  // Icons aus lucide-react — ohne diesen Whitelist-Eintrag wirft Jest "Cannot use import
  // statement outside a module" (siehe deferred-items.md Hinweis aus Plan 02-01).
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async.
// next/jest setzt transformIgnorePatterns intern auf das Default ('/node_modules/' + CSS-Modules),
// was unseren oberen Custom-Wert ueberschreibt. Wir wrappen den Config-Generator in einen async
// Loader und ueberschreiben transformIgnorePatterns NACH dem Merge — damit lucide-react (ESM) durch
// Babel transformiert wird und MatchResultList-/ClarificationCard-Tests laufen.
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)()
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(lucide-react)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return jestConfig
}
