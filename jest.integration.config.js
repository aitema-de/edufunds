/**
 * Jest-Config fuer Integrationstests gegen ein echtes PostgreSQL.
 *
 * BEWUSST OHNE next/jest: next/jest ruft loadEnvConfig() auf und zieht damit
 * .env.local in process.env — dort steht die DATABASE_URL der ECHTEN Dev-DB
 * (SSH-Tunnel). Diese Tests loeschen Tabellen. Sie duerfen die Dev-DB nicht
 * einmal versehentlich sehen koennen. Deshalb plain ts-jest + der Guard in
 * test/integration/setup-each.ts.
 *
 * Lauf: npm run test:integration   (npm test bleibt unveraendert schnell)
 */
module.exports = {
  displayName: "integration",
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/integration/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // tsconfig.json des Projekts ist auf ESM/bundler gestellt (Next.js).
        // Jest laeuft CommonJS — hier gezielt umbiegen.
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          target: "ES2022",
          strict: true,
          resolveJsonModule: true,
        },
      },
    ],
  },
  globalSetup: "<rootDir>/test/integration/global-setup.ts",
  globalTeardown: "<rootDir>/test/integration/global-teardown.ts",
  setupFilesAfterEnv: ["<rootDir>/test/integration/setup-each.ts"],
  // Eine Postgres-Instanz, Isolation via TRUNCATE zwischen den Tests =>
  // Test-Dateien duerfen sich nicht parallel in die Quere kommen.
  maxWorkers: 1,
  testTimeout: 30_000,
};
