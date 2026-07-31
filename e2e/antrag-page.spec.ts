import { test, expect, type ConsoleMessage } from '@playwright/test';
import type { Foerderprogramm } from '../lib/foerderSchema';
import foerderprogrammeData from '../data/foerderprogramme.json';

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

/**
 * Einstieg in den Antragswizard: /antrag/[programmId]
 *
 * HISTORIE (30.07.2026): Diese Datei prüfte bis heute ein Inline-Formular
 * ("KI-Assistent") mit Pflichtfeldern und Generieren-Knopf. Diese Oberfläche gibt
 * es seit dem Wizard-Umbau nicht mehr — /antrag/[programmId] antwortet mit 307 auf
 * /antrag/[programmId]/wizard. Alle acht Tests waren deshalb dauerhaft rot und
 * haben nichts mehr abgesichert; rote Dauergäste bringen einem bei, Rot zu
 * übersehen. Ersetzt durch Prüfungen des tatsächlichen Verhaltens — inklusive der
 * KI-Kennzeichnung, die an diesem Einstieg rechtlich vorgeschrieben ist
 * (AI Act Art. 50 Abs. 1, umgesetzt in PR #115).
 */

const testProgramm =
  foerderprogramme.find((p) => p.id === 'niedersachsen-sport') ?? foerderprogramme[0];

const IGNORE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon/i, /web-vitals/i];

test.describe('Wizard-Einstieg /antrag/[programmId]', () => {
  test('leitet auf den Wizard weiter statt selbst ein Formular zu zeigen', async ({ page }) => {
    const res = await page.goto(`/antrag/${testProgramm.id}`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);
    // Endstation ist der Wizard — der Zwischenschritt darf sich ändern, das Ziel nicht.
    await expect(page).toHaveURL(new RegExp(`/antrag/${testProgramm.id}/wizard$`));
  });

  test('nennt das Programm und bietet den Einstieg an', async ({ page }) => {
    await page.goto(`/antrag/${testProgramm.id}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toContainText(testProgramm.name);
    await expect(page.getByRole('button', { name: /wizard starten/i }).first()).toBeVisible();
  });

  test('weist auf die KI-Verarbeitung hin (AI Act Art. 50 Abs. 1)', async ({ page }) => {
    // Pflichtangabe am Deep-Link-Einstieg: Vier Stellen im Produkt verlinken direkt
    // hierher, vorbei an /antrag/start. Fehlt der Hinweis, ist die Offenlegung weg.
    await page.goto(`/antrag/${testProgramm.id}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toContainText(/KI-Assistent|künstliche(n)? Intelligenz/i);
  });

  test('unbekannte Programm-ID endet sauber, nicht im Serverfehler', async ({ page }) => {
    const res = await page.goto('/antrag/diese-id-gibt-es-nicht-xyz', {
      waitUntil: 'domcontentloaded',
    });
    expect(res?.status(), 'kein 5xx bei unbekannter ID').toBeLessThan(500);
    const body = await page.content();
    expect(body).not.toContain('Application error');
  });

  test('lädt ohne Konsolen- oder Seitenfehler', async ({ page }) => {
    const fehler: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) fehler.push(m.text());
    });
    page.on('pageerror', (e) => fehler.push(`pageerror: ${e.message}`));

    await page.goto(`/antrag/${testProgramm.id}`, { waitUntil: 'networkidle' });
    expect(fehler, `Fehler auf dem Wizard-Einstieg:\n${fehler.join('\n')}`).toEqual([]);
  });
});
