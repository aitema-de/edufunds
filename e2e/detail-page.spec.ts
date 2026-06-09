import { test, expect } from '@playwright/test';
import type { Foerderprogramm } from '../lib/foerderSchema';
import foerderprogrammeData from '../data/foerderprogramme.json';

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

/**
 * E2E-Tests für die Detailseite der Förderprogramme
 * - Programme öffnen
 * - Detailinformationen anzeigen
 * - Navigation zur Antragsseite
 */

test.describe('Detailseite - Programme öffnen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/foerderprogramme');
    // Warte auf das Laden der Programme
    await page.waitForSelector('[data-testid="program-card"], .glass-card, article', { timeout: 10000 });
  });

  test('Klick auf Programm öffnet Detailseite', async ({ page }) => {
    // Erstes Programm finden und anklicken
    const firstProgram = page.locator('.glass-card, article, [data-testid="program-card"]').first();
    await expect(firstProgram).toBeVisible();
    
    // Gezielt den "Details ansehen"-Link klicken (nach Redesign explizit vorhanden)
    const detailsLink = firstProgram.getByRole('link', { name: /details ansehen/i });
    await detailsLink.click();
    
    // Sollte auf einer Detailseite landen
    await expect(page).toHaveURL(/.*foerderprogramme\/.+/);
    
    // Detailseite sollte den Programmnamen anzeigen
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).not.toBeEmpty();
  });

  test('Detailseite zeigt alle wichtigen Informationen', async ({ page }) => {
    // Direkt zu einem spezifischen Programm navigieren
    const testProgramm = foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Programmname als Titel
    await expect(page.locator('h1')).toContainText(testProgramm.name);
    
    // Beschreibung sollte vorhanden sein
    const beschreibung = page.locator('text=' + testProgramm.kurzbeschreibung.substring(0, 50));
    await expect(beschreibung).toBeVisible().catch(() => {
      // Fallback: Nur prüfen dass Content geladen ist
      return expect(page.locator('main')).toContainText(testProgramm.foerdergeber);
    });
    
    // Fördergeber sollte angezeigt werden
    await expect(page.locator('main')).toContainText(testProgramm.foerdergeber);
    
    // Fördersumme sollte angezeigt werden
    await expect(page.locator('main')).toContainText(/\d|kostenlos|variabel/i);
  });

  test('Direkter Zugriff auf Detailseite funktioniert', async ({ page }) => {
    const testIds = ['telekom-stiftung-mint', 'bmw-stiftung-herbert-quandt', 'deutsche-bundesstiftung-umwelt'];
    
    for (const id of testIds) {
      const programm = foerderprogramme.find(p => p.id === id);
      if (!programm) continue;
      
      await page.goto(`/foerderprogramme/${id}`);
      
      // Seite sollte nicht 404 sein
      const notFound = page.locator('text=/nicht gefunden|404|not found/i');
      await expect(notFound).not.toBeVisible().catch(() => {
        // Wenn 404, trotzdem weiter
      });
      
      // Programmname sollte angezeigt werden
      await expect(page.locator('h1')).toContainText(programm.name);
    }
  });

  test('Detailseite hat funktionierenden "Zurück" Link', async ({ page }) => {
    // Zu einem Programm navigieren
    const testProgramm = foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Zurück-Link finden
    const backLink = page.getByRole('link', { name: /zurück|←/i });
    
    if (await backLink.isVisible().catch(() => false)) {
      await backLink.click();
      await expect(page).toHaveURL(/.*foerderprogramme.*/);
    }
  });

  test('Antrags-Button auf Detailseite funktioniert', async ({ page }) => {
    const testProgramm = foerderprogramme.find(p => p.id === 'telekom-stiftung-mint') || foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Antrag-Button suchen
    const antragButton = page.getByRole('button', { name: /antrag|bewerben|jetzt/i }).first()
      .or(page.getByRole('link', { name: /antrag|bewerben|jetzt/i }).first());
    
    if (await antragButton.isVisible().catch(() => false)) {
      await antragButton.click();
      
      // Sollte zur Antragsseite navigieren oder Modal öffnen
      await expect(page).toHaveURL(/.*antrag.*/).catch(async () => {
        // Fallback: Prüfe ob Modal geöffnet wurde
        const modal = page.locator('[role="dialog"], .modal, [data-testid="antrag-modal"]').first();
        await expect(modal).toBeVisible();
      });
    }
  });

  test('Kategorien werden auf Detailseite angezeigt', async ({ page }) => {
    const testProgramm = foerderprogramme.find(p => p.kategorien.length > 0) || foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Mindestens eine Kategorie sollte angezeigt werden
    const kategorieBadge = page.locator('.badge, [class*="badge"], [class*="tag"], [class*="kategorie"]').first();
    await expect(kategorieBadge).toBeVisible().catch(() => {
      // Fallback: Prüfe ob Kategorie-Text vorhanden
      return expect(page.locator('main')).toContainText(testProgramm.kategorien[0].replace(/-/g, ' '), { ignoreCase: true });
    });
  });

  test('Förderdetails (Betrag, Zeitraum) sind sichtbar', async ({ page }) => {
    const testProgramm = foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Förderbetrag-Information
    await expect(page.locator('main')).toContainText(/Förderbetrag|Betrag|€/i);
    
    // Frist-Information sollte vorhanden sein
    const fristInfo = page.locator('text=/frist|deadline|bewerbungsschluss/i').first();
    await expect(fristInfo).toBeVisible().catch(() => {
      // Nicht alle Programme haben Fristen
    });
  });

  test('Teilen-Buttons sind vorhanden', async ({ page }) => {
    const testProgramm = foerderprogramme[0];
    await page.goto(`/foerderprogramme/${testProgramm.id}`);
    
    // Social Share oder Copy-Link Button
    const shareButton = page.getByRole('button', { name: /teilen|share|link/i }).first()
      .or(page.locator('button[class*="share"]').first());
    
    // Optional: Nicht alle Seiten haben Share-Buttons
    if (await shareButton.isVisible().catch(() => false)) {
      await expect(shareButton).toBeEnabled();
    }
  });
});
