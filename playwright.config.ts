import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";


/**
 * Playwright-Config für den Test-&-Fix-Loop.
 * - Headless gegen den bereits laufenden Dev-Server auf :3101 (kein webServer-Autostart,
 *   weil der Server im Hauptkontext gegen die Wegwerf-DB `edufunds_test` gebootet wird).
 * - executablePath gepinnt auf den vorhandenen Browser-Cache (Revision 1224), damit
 *   kein zusätzlicher Browser-Download nötig ist.
 */
/** Chromium aus dem lokalen Playwright-Cache. Die Revision war fest auf 1224 gepinnt —
 *  die es auf dieser Maschine gar nicht (mehr) gibt; der Lauf waere am Browser-Start
 *  gescheitert. Jetzt: neueste vorhandene Revision, per PW_CHROME uebersteuerbar. */
function cachedChrome(): string | undefined {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const base = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(base)) return undefined;
  const rev = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))[0];
  if (!rev) return undefined;
  const bin = join(base, rev, "chrome-linux", "chrome");
  return existsSync(bin) ? bin : undefined;
}
const CACHED_CHROME = cachedChrome();

export default defineConfig({
  testDir: './e2e',
  /**
   * `kaufpfad.spec.ts` gehoert NICHT in diesen Lauf. Die Datei laeuft nur ueber
   * `npm run test:e2e:kaufpfad`, weil ihr Orchestrator (scripts/e2e-kaufpfad.mjs)
   * erst eine eigene Postgres-Instanz bootet und die Session-Tokens per Env
   * hereinreicht — siehe playwright.kaufpfad.config.ts.
   *
   * Ohne diesen Ausschluss zog `npx playwright test` die Datei mit und lieferte
   * dauerhaft 7 rote Tests, die gar nicht gruen werden KOENNEN. Eine Suite mit
   * permanent roten Tests erzieht dazu, Rot zu ignorieren — und dann faellt der
   * echte Fehlschlag nicht mehr auf. (Befund 30.07.2026.)
   */
  testIgnore: ['**/kaufpfad.spec.ts'],
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
