import { test, expect } from '@playwright/test';

/**
 * E2E-Tests für die Startseite
 * - Grundlegende Navigation
 * - Hero-Bereich
 * - Features-Bereich
 * - Links zu anderen Seiten
 */

test.describe('Startseite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Seite lädt korrekt mit allen Hauptelementen', async ({ page }) => {
    // Titel prüfen
    await expect(page).toHaveTitle(/EduFunds/);
    
    // Header ist sichtbar
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Hero-Section ist sichtbar
    const hero = page.locator('main').first();
    await expect(hero).toBeVisible();
    
    // Footer ist sichtbar
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('Navigation enthält alle Hauptlinks', async ({ page }) => {
    const nav = page.locator('nav');

    // Logo/Brand liegt im Header-Logo-Link ausserhalb von <nav>
    await expect(page.locator('header').getByText(/EduFunds/i).first()).toBeVisible();
    
    // Hauptnavigationslinks
    const expectedLinks = ['Programme', 'Preise', 'Über uns', 'Kontakt'];
    for (const link of expectedLinks) {
      await expect(nav.getByRole('link', { name: link })).toBeVisible();
    }
  });

  test('Hero-Bereich enthält CTA-Button', async ({ page }) => {
    const heroSection = page.locator('main section').first();
    
    // Hauptüberschrift
    const heading = heroSection.locator('h1');
    await expect(heading).toBeVisible();
    
    // CTA-Button ist vorhanden
    const ctaButton = heroSection.getByRole('link').or(heroSection.locator('button')).first();
    await expect(ctaButton).toBeVisible();
  });

  test('Navigation zu Förderprogramme funktioniert', async ({ page }) => {
    const programmeLink = page.getByRole('link', { name: /Programme/i });
    
    await programmeLink.click();
    
    // URL sollte /foerderprogramme sein
    await expect(page).toHaveURL(/.*foerderprogramme.*/);
    
    // Seite sollte geladen sein
    await expect(page.locator('h1')).toContainText(/Förderprogramme/i);
  });

  test('Footer-Links sind vorhanden', async ({ page }) => {
    const footer = page.locator('footer');
    
    // Rechtliche Links
    await expect(footer.getByRole('link', { name: /Impressum/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /Datenschutz/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /AGB/i })).toBeVisible();
  });

  test('Mobile Navigation funktioniert', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Nur für Mobile');
    
    // Hamburger Menu sollte sichtbar sein
    const menuButton = page.locator('button[aria-label*="Menu"], button[aria-label*="menu"]').first();
    
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      
      // Navigation sollte sich öffnen
      const mobileNav = page.locator('[role="navigation"], nav[class*="mobile"]').first();
      await expect(mobileNav).toBeVisible();
    }
  });
});
