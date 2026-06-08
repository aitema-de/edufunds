import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Breitband-Smoke über alle öffentlichen Seiten.
 * Prüft je Seite: keine uncaught Exception, keine Konsolen-Errors (gefiltert),
 * kein React-Error-Boundary-Text, Header+Footer vorhanden.
 * Ergänzt den serverseitigen route-sweep um die Client-Perspektive.
 */
const PROG = 'niedersachsen-sport';
const PAGES: Array<{ path: string; landmark?: boolean }> = [
  { path: '/' },
  { path: '/foerderprogramme' },
  { path: `/foerderprogramme/${PROG}` },
  { path: '/preise' },
  { path: '/ueber-uns' },
  { path: '/kontakt' },
  { path: '/registrieren' },
  { path: '/archiv' },
  { path: '/impressum' },
  { path: '/datenschutz' },
  { path: '/agb' },
  { path: '/antrag/start' },
  { path: '/antrag/meine' },
];

// Konsolen-Rauschen, das kein Bug ist
const IGNORE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon/i,
  /Lighthouse/i,
  /web-vitals/i,
];

const BOUNDARY_TEXT = [
  'Application error',
  'client-side exception',
  'Unhandled Runtime Error',
];

for (const { path } of PAGES) {
  test(`Smoke ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() === 'error' && !IGNORE.some(r => r.test(m.text()))) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res, `Antwort für ${path}`).toBeTruthy();
    expect(res!.status(), `HTTP-Status für ${path}`).toBeLessThan(500);

    const body = await page.content();
    for (const t of BOUNDARY_TEXT) {
      expect(body, `Error-Boundary "${t}" auf ${path}`).not.toContain(t);
    }

    await expect(page.locator('header').first(), `Header auf ${path}`).toBeVisible();
    await expect(page.locator('footer').first(), `Footer auf ${path}`).toBeVisible();

    expect(errors, `Konsolen-/Page-Errors auf ${path}:\n${errors.join('\n')}`).toEqual([]);
  });
}
