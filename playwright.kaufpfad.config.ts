import { defineConfig, devices } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";


/**
 * E2E über den Kaufpfad. Wird NICHT direkt aufgerufen, sondern über
 * `npm run test:e2e:kaufpfad` — das Orchestrator-Skript (scripts/e2e-kaufpfad.mjs)
 * bootet erst PostgreSQL + Next-Server und reicht Port und Session-Tokens per Env
 * herein. Ein direkter `playwright test --config …` findet weder Server noch Daten.
 *
 * Getrennt von playwright.config.ts, weil jene Config gegen einen bereits laufenden
 * Dev-Server auf :3101 (echte Dev-DB!) zeigt. Der Kaufpfad legt Bestellungen an und
 * schaltet Antraege frei — das darf die Dev-DB nicht sehen.
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
  testDir: "./e2e",
  testMatch: "kaufpfad.spec.ts",
  // Der Kaufpfad ist zustandsbehaftet (eine Freischaltung ist unumkehrbar) — jeder
  // Test bekommt seine eigene geseedete Session, aber wir halten die Laeufe seriell,
  // damit ein Fehlschlag lesbar bleibt.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: CACHED_CHROME },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: CACHED_CHROME } },
    },
  ],
});
