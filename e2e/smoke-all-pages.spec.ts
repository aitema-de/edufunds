import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Breitband-Smoke über alle öffentlichen Seiten.
 * Prüft je Seite: keine uncaught Exception, keine Konsolen-Errors (gefiltert),
 * kein React-Error-Boundary-Text, Header+Footer vorhanden.
 * Ergänzt den serverseitigen route-sweep um die Client-Perspektive.
 */
const PROG = 'niedersachsen-sport';
/**
 * 30.07.2026: Die Liste hatte 13 Seiten und war veraltet — der komplette
 * Kontingent-Kaufbereich, die AVV-Seite, der Wizard-Einstieg /antrag/[programmId]
 * und die Admin-Anmeldung waren nie im Client-Smoke. `landmark: false` fuer Seiten
 * ohne Header/Footer-Rahmen (Admin-Fläche).
 *
 * Gegenstueck serverseitig: scripts/route-sweep.mjs leitet seine Seitenliste
 * inzwischen aus dem Build-Manifest ab, kann also nicht mehr veralten. Hier bleibt
 * es eine Handliste, weil pro Seite unterschiedliche Erwartungen gelten.
 */
const PAGES: Array<{ path: string; landmark?: boolean; erwartet401?: boolean }> = [
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
  { path: '/avv' },
  { path: '/antrag/start' },
  // Ohne Anmeldung fragt die Seite die identitaetsgebundene Antragsliste ab und
  // bekommt korrekt 401. Der Browser protokolliert das als Konsolenfehler — das
  // ist erwartetes Verhalten, kein Defekt.
  { path: '/antrag/meine', erwartet401: true },
  { path: `/antrag/${PROG}` },
  { path: '/kontingent' },
  { path: '/kontingent/uebersicht', erwartet401: true },
  { path: '/admin/login', landmark: false },
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

for (const { path, landmark = true, erwartet401 = false } of PAGES) {
  test(`Smoke ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (IGNORE.some(r => r.test(text))) return;
      // Gezielt und NUR fuer Seiten, die ohne Anmeldung erwartbar 401 sehen.
      // Bewusst keine pauschale 401-Ausnahme: ein 401 auf einer oeffentlichen
      // Seite bliebe damit unsichtbar.
      if (erwartet401 && /Failed to load resource.*401|status of 401/i.test(text)) return;
      errors.push(text);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res, `Antwort für ${path}`).toBeTruthy();
    expect(res!.status(), `HTTP-Status für ${path}`).toBeLessThan(500);

    const body = await page.content();
    for (const t of BOUNDARY_TEXT) {
      expect(body, `Error-Boundary "${t}" auf ${path}`).not.toContain(t);
    }

    if (landmark) {
      await expect(page.locator('header').first(), `Header auf ${path}`).toBeVisible();
      await expect(page.locator('footer').first(), `Footer auf ${path}`).toBeVisible();
    } else {
      // Admin-Fläche ohne Website-Rahmen: mindestens ein sichtbarer Inhaltsbereich.
      await expect(page.locator('body'), `Inhalt auf ${path}`).not.toBeEmpty();
    }

    expect(errors, `Konsolen-/Page-Errors auf ${path}:\n${errors.join('\n')}`).toEqual([]);
  });
}
