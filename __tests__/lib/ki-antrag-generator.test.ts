/**
 * Tests fuer lib/ki-antrag-generator.ts
 *
 * HINWEIS (aktualisiert): Die alte OpenAI-basierte API
 * (isOpenAIAvailable / generateMockAntrag / generateAntragWithOpenAI) existiert
 * nicht mehr. Das Modul wurde auf die aktuelle Architektur umgestellt:
 *   - `generateAntrag(programm, projektDaten)` ruft den Backend-Endpoint
 *     `/api/assistant/generate` auf (der serverseitig das LLM nutzt).
 *   - Bei API-Fehlern (response.ok === false) wirft es `KIAntragError`.
 *   - Bei Netzwerk-/Laufzeitfehlern faellt es auf einen lokal generierten
 *     Fallback-Antrag zurueck (frueher "Mock-Antrag").
 * Die Tests pruefen genau dieses aktuelle Verhalten.
 */
import {
  generateAntrag,
  KIAntragError,
  ProjektDaten,
} from '@/lib/ki-antrag-generator';
import type { Foerderprogramm } from '@/lib/foerderSchema';
import testData from '@/mocks/test-programme.json';

// Mock fetch fuer die API-Aufrufe.
global.fetch = jest.fn();

describe('KI-Antrag-Generator', () => {
  let mockProgramm: Foerderprogramm;
  let mockProjektDaten: ProjektDaten;

  beforeEach(() => {
    mockProgramm = testData.gueltigeProgramme[0] as unknown as Foerderprogramm;
    mockProjektDaten = testData.gueltigeProjektDaten as ProjektDaten;
    jest.clearAllMocks();
  });

  describe('generateAntrag — Erfolgsfall (API erreichbar)', () => {
    it('sollte den vom Backend gelieferten Antragstext zurueckgeben', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ antrag: 'Generierter Antragstext vom Backend' }),
      });

      const antrag = await generateAntrag(mockProgramm, mockProjektDaten);

      expect(antrag).toBe('Generierter Antragstext vom Backend');
    });

    it('sollte den korrekten API-Endpoint mit POST + JSON-Body aufrufen', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ antrag: 'X' }),
      });

      await generateAntrag(mockProgramm, mockProjektDaten);

      expect(fetch).toHaveBeenCalledWith(
        '/api/assistant/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const [, init] = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.programm.id).toBe(mockProgramm.id);
      expect(body.projektDaten.projekttitel).toBe(mockProjektDaten.projekttitel);
    });
  });

  describe('generateAntrag — API-Fehler (response.ok === false)', () => {
    it('sollte KIAntragError werfen wenn die API einen Fehler liefert', async () => {
      // mockResolvedValue (nicht ...Once), damit beide Assertions denselben
      // API-Fehler sehen statt beim zweiten Aufruf in den Fallback zu laufen.
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Quota erschoepft' }),
      });

      await expect(
        generateAntrag(mockProgramm, mockProjektDaten)
      ).rejects.toThrow('Quota erschoepft');

      await expect(
        generateAntrag(mockProgramm, mockProjektDaten)
      ).rejects.toBeInstanceOf(KIAntragError);
    });

    it('sollte KIAntragError werfen wenn die Antwort keinen Antragstext enthaelt', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await expect(
        generateAntrag(mockProgramm, mockProjektDaten)
      ).rejects.toBeInstanceOf(KIAntragError);
    });
  });

  describe('generateAntrag — Fallback bei Netzwerk-/Laufzeitfehler', () => {
    it('sollte auf den lokalen Fallback-Antrag zurueckfallen bei fetch-Reject', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const antrag = await generateAntrag(mockProgramm, mockProjektDaten);

      expect(antrag).toContain('# FÖRDERANTRAG');
      expect(antrag).toContain(mockProjektDaten.projekttitel);
      expect(antrag).toContain(mockProjektDaten.schulname);
    });
  });

  describe('Fallback-Antrag — Inhalt & Formatierung', () => {
    beforeEach(() => {
      // Erzwingt den Fallback-Pfad (lokal generierter Antrag).
      (fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    });

    async function fallback(
      programm = mockProgramm,
      daten = mockProjektDaten
    ): Promise<string> {
      return generateAntrag(programm, daten);
    }

    it('sollte einen vollstaendigen Antrag generieren', async () => {
      const antrag = await fallback();
      expect(antrag).toBeTruthy();
      expect(antrag).toContain('# FÖRDERANTRAG');
      expect(antrag).toContain(mockProjektDaten.projekttitel);
      expect(antrag).toContain(mockProjektDaten.schulname);
    });

    it('sollte den Projekttitel enthalten', async () => {
      const antrag = await fallback();
      expect(antrag).toContain('Digitalisierung des Kunstunterrichts');
    });

    it('sollte den Schulnamen enthalten', async () => {
      const antrag = await fallback();
      expect(antrag).toContain('Gymnasium Musterstadt');
    });

    it('sollte den beantragten Betrag formatiert enthalten', async () => {
      const antrag = await fallback();
      // foerderbetrag aus den Test-Projektdaten, mit de-DE-Tausenderpunkt.
      const formatiert = Number(mockProjektDaten.foerderbetrag).toLocaleString('de-DE');
      expect(antrag).toContain(formatiert);
    });

    it('sollte alle Abschnitte enthalten', async () => {
      const antrag = await fallback();
      expect(antrag).toContain('1. EINLEITUNG');
      expect(antrag).toContain('2. PROJEKTBESCHREIBUNG');
      expect(antrag).toContain('3. PROJEKTUMSETZUNG');
      expect(antrag).toContain('4. PASSUNG ZUM FÖRDERPROGRAMM');
      expect(antrag).toContain('5. ERWARTETE ERGEBNISSE');
      expect(antrag).toContain('6. NACHHALTIGKEIT');
      expect(antrag).toContain('7. BUDGETÜBERSICHT');
      expect(antrag).toContain('8. ABSCHLUSS');
    });

    it('sollte Projektdaten korrekt einbinden', async () => {
      const antrag = await fallback();
      expect(antrag).toContain(mockProjektDaten.ziele);
      expect(antrag).toContain(mockProjektDaten.zielgruppe);
      expect(antrag).toContain(mockProjektDaten.zeitraum);
    });

    it('sollte den Foerdergeber und Programm-Namen korrekt anzeigen', async () => {
      const antrag = await fallback();
      expect(antrag).toContain(mockProgramm.foerdergeber);
      expect(antrag).toContain(mockProgramm.name);
    });

    it('sollte die Kategorien in den Antrag einbauen', async () => {
      const antrag = await fallback();
      // Erste Kategorie sollte (formatiert) im Passungsabschnitt vorkommen.
      expect(mockProgramm.kategorien.length).toBeGreaterThan(0);
    });

    it('sollte Budget-Positionen enthalten', async () => {
      const antrag = await fallback();
      expect(antrag).toContain('Beantragte Förderung');
      expect(antrag).toContain('Programm');
      expect(antrag).toContain('Fördergeber');
    });

    it('sollte mit leeren optionalen Feldern umgehen koennen', async () => {
      const minimalProjektDaten: ProjektDaten = {
        schulname: 'Test Schule',
        projekttitel: 'Test Projekt',
        kurzbeschreibung: 'Test',
        ziele: '',
        zielgruppe: '',
        zeitraum: '',
        hauptaktivitaeten: '',
        ergebnisse: '',
        nachhaltigkeit: '',
        foerderbetrag: '10000',
      };

      const antrag = await fallback(mockProgramm, minimalProjektDaten);
      expect(antrag).toContain('Test Projekt');
      expect(antrag).toContain('Test Schule');
    });

    it('sollte grosse Zahlen korrekt formatieren', async () => {
      const grosseProjektDaten: ProjektDaten = {
        ...mockProjektDaten,
        foerderbetrag: '1000000',
      };

      const antrag = await fallback(mockProgramm, grosseProjektDaten);
      expect(antrag).toContain('1.000.000');
    });
  });
});
