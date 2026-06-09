import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright-Config für den Test-&-Fix-Loop.
 * - Headless gegen den bereits laufenden Dev-Server auf :3101 (kein webServer-Autostart,
 *   weil der Server im Hauptkontext gegen die Wegwerf-DB `edufunds_test` gebootet wird).
 * - executablePath gepinnt auf den vorhandenen Browser-Cache (Revision 1224), damit
 *   kein zusätzlicher Browser-Download nötig ist.
 */
const CACHED_CHROME =
  process.env.PW_CHROME ||
  '/home/kolja/.cache/ms-playwright/chromium-1224/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 4,
  reporter: [
    ['list'],
    ['json', { outputFile: '.planning/test-fix/playwright-results.json' }],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.SWEEP_BASE || 'http://localhost:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: CACHED_CHROME },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: CACHED_CHROME } } },
  ],
});
