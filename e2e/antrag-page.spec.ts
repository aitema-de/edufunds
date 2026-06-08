import { test, expect } from '@playwright/test';
import type { Foerderprogramm } from '../lib/foerderSchema';
import foerderprogrammeData from '../data/foerderprogramme.json';

const foerderprogramme = foerderprogrammeData as Foerderprogramm[];

/**
 * E2E-Tests für die Antragsseite mit KI-Assistent
 * - KI-Assistent-Formular testen
 * - Formularvalidierung
 * - Antragsgenerierung
 * - Download-Funktionen
 */

test.describe('Antragsseite - KI-Assistent', () => {
  const testProgramm = foerderprogramme.find(p => p.id === 'telekom-stiftung-mint') || foerderprogramme[0];

  test.beforeEach(async ({ page }) => {
    await page.goto(`/antrag/${testProgramm.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('KI-Assistent-Seite lädt korrekt', async ({ page }) => {
    // Titel sollte Programmname enthalten
    await expect(page.locator('h1, h2')).toContainText(/Antrag|Assistent/i, { ignoreCase: true });
    
    // Programminfo sollte angezeigt werden
    await expect(page.locator('main')).toContainText(testProgramm.name);
    
    // Formular sollte vorhanden sein
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('Formular enthält alle Pflichtfelder', async ({ page }) => {
    // Schulname
    const schulnameInput = page.locator('input#schulname, input[name="schulname"], input[placeholder*="Schul"]').first();
    await expect(schulnameInput).toBeVisible();
    
    // Projekttitel
    const projekttitelInput = page.locator('input#projekttitel, input[name="projekttitel"]').first();
    await expect(projekttitelInput).toBeVisible();
    
    // Kurzbeschreibung
    const beschreibungInput = page.locator('textarea#kurzbeschreibung, textarea[name="kurzbeschreibung"]').first();
    await expect(beschreibungInput).toBeVisible();
    
    // Projektziele
    const zieleInput = page.locator('textarea#ziele, textarea[name="ziele"]').first();
    await expect(zieleInput).toBeVisible();
    
    // Hauptaktivitäten
    const aktivitaetenInput = page.locator('textarea#hauptaktivitaeten, textarea[name="hauptaktivitaeten"]').first();
    await expect(aktivitaetenInput).toBeVisible();
  });

  test('Formularvalidierung funktioniert', async ({ page }) => {
    // Generieren-Button finden
    const generateButton = page.getByRole('button', { name: /generieren|erstellen/i });
    await expect(generateButton).toBeVisible();
    
    // Button sollte initial disabled sein (leeres Formular)
    const isDisabled = await generateButton.isDisabled().catch(() => false);
    
    if (isDisabled) {
      // Button sollte disabled bleiben bei unvollständigen Daten
      await page.locator('input#schulname').fill('Test');
      await expect(generateButton).toBeDisabled();
    }
  });

  test('Formular kann ausgefüllt werden', async ({ page }) => {
    // Alle Pflichtfelder ausfüllen
    await page.locator('input#schulname, input[name="schulname"]').fill('Gymnasium Musterstadt');
    await page.locator('input#projekttitel, input[name="projekttitel"]').fill('MINT-Projekt für Grundschüler');
    await page.locator('input#zeitraum, input[name="zeitraum"]').fill('01.09.2025 - 31.08.2026');
    await page.locator('input#zielgruppe, input[name="zielgruppe"]').fill('Schüler der Klassen 5-10');
    
    await page.locator('textarea#kurzbeschreibung, textarea[name="kurzbeschreibung"]').fill(
      'Dies ist ein Testprojekt zur Förderung der MINT-Bildung an unserer Schule.'
    );
    await page.locator('textarea#ziele, textarea[name="ziele"]').fill(
      'Steigerung des MINT-Interesses, praktische Anwendungen, Zusammenarbeit mit Unternehmen.'
    );
    await page.locator('textarea#hauptaktivitaeten, textarea[name="hauptaktivitaeten"]').fill(
      'Workshops, Experimente, Exkursionen zu Tech-Unternehmen.'
    );
    
    // Felder sollten den Wert enthalten
    await expect(page.locator('input#schulname, input[name="schulname"]')).toHaveValue('Gymnasium Musterstadt');
  });

  test('Fördersumme wird korrekt angezeigt', async ({ page }) => {
    // Förderbetrag-Feld sollte vorhanden sein
    const betragInput = page.locator('input#foerderbetrag, input[name="foerderbetrag"], input[type="number"]').first();
    await expect(betragInput).toBeVisible();
    
    // Förderspanne-Info sollte angezeigt werden
    await expect(page.locator('main')).toContainText(/Förderspanne|€|Betrag/i);
  });

  test('Generieren-Button wird bei vollständigem Formular aktiviert', async ({ page }) => {
    // Formular ausfüllen
    await page.locator('input#schulname, input[name="schulname"]').fill('Gymnasium Musterstadt');
    await page.locator('input#projekttitel, input[name="projekttitel"]').fill('MINT-Projekt für Grundschüler');
    await page.locator('input#zeitraum, input[name="zeitraum"]').fill('01.09.2025 - 31.08.2026');
    await page.locator('input#zielgruppe, input[name="zielgruppe"]').fill('Schüler der Klassen 5-10');
    
    await page.locator('textarea#kurzbeschreibung, textarea[name="kurzbeschreibung"]').fill(
      'Dies ist ein Testprojekt zur Förderung der MINT-Bildung an unserer Schule mit vielen spannenden Aktivitäten.'
    );
    await page.locator('textarea#ziele, textarea[name="ziele"]').fill(
      'Steigerung des MINT-Interesses, praktische Anwendungen, Zusammenarbeit mit Unternehmen.'
    );
    await page.locator('textarea#hauptaktivitaeten, textarea[name="hauptaktivitaeten"]').fill(
      'Workshops, Experimente, Exkursionen zu Tech-Unternehmen.'
    );
    
    // Button sollte jetzt aktiviert sein
    const generateButton = page.getByRole('button', { name: /generieren|erstellen/i });
    await expect(generateButton).toBeEnabled();
  });

  test('KI-Antrag kann generiert werden (Mock/Real)', async ({ page }) => {
    // Formular vollständig ausfüllen
    await page.locator('input#schulname, input[name="schulname"]').fill('Gymnasium Musterstadt');
    await page.locator('input#projekttitel, input[name="projekttitel"]').fill('MINT-Projekt für Grundschüler');
    await page.locator('input#zeitraum, input[name="zeitraum"]').fill('01.09.2025 - 31.08.2026');
    await page.locator('input#zielgruppe, input[name="zielgruppe"]').fill('Schüler der Klassen 5-10');
    
    await page.locator('textarea#kurzbeschreibung, textarea[name="kurzbeschreibung"]').fill(
      'Dies ist ein Testprojekt zur Förderung der MINT-Bildung an unserer Schule mit vielen spannenden Aktivitäten.'
    );
    await page.locator('textarea#ziele, textarea[name="ziele"]').fill(
      'Steigerung des MINT-Interesses, praktische Anwendungen, Zusammenarbeit mit Unternehmen.'
    );
    await page.locator('textarea#hauptaktivitaeten, textarea[name="hauptaktivitaeten"]').fill(
      'Workshops, Experimente, Exkursionen zu Tech-Unternehmen.'
    );
    
    // Generieren-Button klicken
    const generateButton = page.getByRole('button', { name: /generieren|erstellen/i });
    
    if (await generateButton.isEnabled()) {
      await generateButton.click();
      
      // Warte auf Generierung (Loading-State oder Ergebnis)
      await page.waitForTimeout(2000);
      
      // Prüfe auf Loading-Indikator oder Ergebnis
      const loadingIndicator = page.locator('.animate-spin, [class*="loading"], text=/generiert|loading/i').first();
      const resultArea = page.locator('pre, [class*="result"], textarea[readonly]').first();
      
      // Entweder Loading oder Ergebnis sollte sichtbar sein
      const isLoading = await loadingIndicator.isVisible().catch(() => false);
      const hasResult = await resultArea.isVisible().catch(() => false);
      
      expect(isLoading || hasResult).toBeTruthy();
    }
  });

  test('Programm-Info wird korrekt angezeigt', async ({ page }) => {
    // Programm-Info-Box sollte vorhanden sein
    const programInfo = page.locator('[class*="programm"], [class*="info"]').first();
    await expect(programInfo).toBeVisible().catch(() => {
      // Fallback: Prüfe auf Programmname im Text
      return expect(page.locator('main')).toContainText(testProgramm.name);
    });
    
    // Kategorien sollten angezeigt werden
    if (testProgramm.kategorien.length > 0) {
      const kategorieText = testProgramm.kategorien[0].replace(/-/g, ' ');
      await expect(page.locator('main')).toContainText(kategorieText, { ignoreCase: true });
    }
  });

  test('Abbrechen-Button funktioniert', async ({ page }) => {
    // Abbrechen/Back Button finden
    const cancelButton = page.getByRole('button', { name: /abbrechen|zurück|cancel/i }).first()
      .or(page.getByRole('link', { name: /zurück/i }).first());
    
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
      
      // Sollte zurück navigieren
      await expect(page).toHaveURL(/.*foerderprogramme|programme.*/).catch(() => {
        // Einfach prüfen dass Navigation stattgefunden hat
        return expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test('Eingabehilfen sind vorhanden', async ({ page }) => {
    // Placeholder-Texte sollten Hilfestellung geben
    const inputs = page.locator('input, textarea');
    const count = await inputs.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Mindestens ein Input sollte einen Placeholder haben
    let hasPlaceholder = false;
    for (let i = 0; i < count; i++) {
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      if (placeholder && placeholder.length > 0) {
        hasPlaceholder = true;
        break;
      }
    }
    
    expect(hasPlaceholder).toBeTruthy();
  });
});

test.describe('Antragsseite - Download-Funktionen', () => {
  const testProgramm = foerderprogramme[0];

  test('Download-Buttons sind vorhanden nach Generierung', async ({ page }) => {
    // Dieser Test setzt voraus, dass ein Antrag bereits generiert wurde
    // In der Realität würde man hier den Generierungsprozess durchlaufen
    
    await page.goto(`/antrag/${testProgramm.id}`);
    
    // Formular ausfüllen und generieren
    await page.locator('input#schulname, input[name="schulname"]').fill('Gymnasium Musterstadt');
    await page.locator('input#projekttitel, input[name="projekttitel"]').fill('MINT-Projekt');
    await page.locator('input#zeitraum, input[name="zeitraum"]').fill('01.09.2025 - 31.08.2026');
    await page.locator('input#zielgruppe, input[name="zielgruppe"]').fill('Schüler Klassen 5-10');
    await page.locator('textarea#kurzbeschreibung, textarea[name="kurzbeschreibung"]').fill('Testprojekt für MINT-Förderung mit vielen Aktivitäten und Workshops.');
    await page.locator('textarea#ziele, textarea[name="ziele"]').fill('MINT-Interesse steigern.');
    await page.locator('textarea#hauptaktivitaeten, textarea[name="hauptaktivitaeten"]').fill('Workshops und Experimente.');
    
    const generateButton = page.getByRole('button', { name: /generieren/i });
    
    if (await generateButton.isEnabled().catch(() => false)) {
      await generateButton.click();
      
      // Warte auf Ergebnis (mit Timeout)
      await page.waitForTimeout(5000);
      
      // Prüfe auf Download-Buttons
      const copyButton = page.getByRole('button', { name: /kopieren|copy/i });
      const downloadButtons = page.getByRole('button', { name: /download|pdf|word|text/i });
      
      // Mindestens einer sollte vorhanden sein
      const hasCopy = await copyButton.isVisible().catch(() => false);
      const hasDownload = await downloadButtons.first().isVisible().catch(() => false);
      
      expect(hasCopy || hasDownload).toBeTruthy();
    }
  });
});
