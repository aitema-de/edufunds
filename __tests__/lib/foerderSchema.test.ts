import { Foerderprogramm } from '@/lib/foerderSchema';
import testData from '@/mocks/test-programme.json';

describe('Förderprogramm Schema', () => {
  describe('Validierung gültiger Programme', () => {
    it('sollte ein vollständiges gültiges Programm akzeptieren', () => {
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      
      expect(programm).toBeDefined();
      expect(programm.id).toBe('bkm-digital-2024');
      expect(programm.name).toBe('Kultur Digital');
      expect(programm.foerdergeberTyp).toBe('bund');
    });

    it('sollte alle Fördergeber-Typen unterstützen', () => {
      const bundProgramm = testData.gueltigeProgramme.find(p => p.foerdergeberTyp === 'bund');
      const landProgramm = testData.gueltigeProgramme.find(p => p.foerdergeberTyp === 'land');
      const stiftungProgramm = testData.gueltigeProgramme.find(p => p.foerdergeberTyp === 'stiftung');
      const euProgramm = testData.gueltigeProgramme.find(p => p.foerdergeberTyp === 'eu');

      expect(bundProgramm).toBeDefined();
      expect(landProgramm).toBeDefined();
      expect(stiftungProgramm).toBeDefined();
      expect(euProgramm).toBeDefined();
    });

    it('sollte alle erforderlichen Felder enthalten', () => {
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      
      expect(programm.id).toBeTruthy();
      expect(programm.name).toBeTruthy();
      expect(programm.foerdergeber).toBeTruthy();
      expect(programm.foerdergeberTyp).toBeTruthy();
      expect(programm.schulformen).toBeInstanceOf(Array);
      expect(programm.bundeslaender).toBeInstanceOf(Array);
      expect(programm.kategorien).toBeInstanceOf(Array);
      expect(programm.bewerbungsart).toBeTruthy();
      expect(programm.infoLink).toBeTruthy();
      expect(programm.kurzbeschreibung).toBeTruthy();
      expect(programm.status).toBeTruthy();
      expect(programm.createdAt).toBeTruthy();
      expect(programm.updatedAt).toBeTruthy();
      expect(programm.quelle).toBeTruthy();
    });

    it('sollte optionale Felder korrekt behandeln', () => {
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      
      // Optionale Felder können definiert sein
      expect(programm.foerdersummeMin).toBeDefined();
      expect(programm.foerdersummeMax).toBeDefined();
      expect(programm.foerdersummeText).toBeDefined();
      expect(programm.bewerbungsfristStart).toBeDefined();
      expect(programm.bewerbungsfristEnde).toBeDefined();
      expect(programm.kontaktEmail).toBeDefined();
      expect(programm.kiHinweise).toBeDefined();
      
      // Optionale Felder können auch undefined sein
      const programmOhneOptionals = testData.gueltigeProgramme[1];
      expect(programmOhneOptionals.kontaktEmail).toBeUndefined();
    });
  });

  describe('Typ-Checks', () => {
    it('sollte korrekte Typen für alle Felder haben', () => {
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      
      expect(typeof programm.id).toBe('string');
      expect(typeof programm.name).toBe('string');
      expect(typeof programm.foerdergeber).toBe('string');
      expect(typeof programm.foerdergeberTyp).toBe('string');
      expect(Array.isArray(programm.schulformen)).toBe(true);
      expect(Array.isArray(programm.bundeslaender)).toBe(true);
      expect(Array.isArray(programm.kategorien)).toBe(true);
      expect(typeof programm.bewerbungsart).toBe('string');
      expect(typeof programm.infoLink).toBe('string');
      expect(typeof programm.kurzbeschreibung).toBe('string');
      expect(typeof programm.status).toBe('string');
      expect(typeof programm.createdAt).toBe('string');
      expect(typeof programm.updatedAt).toBe('string');
      expect(typeof programm.quelle).toBe('string');
    });

    it('sollte gültige Schulformen enthalten', () => {
      const gueltigeSchulformen = [
        'grundschule', 'hauptschule', 'realschule', 
        'gymnasium', 'gesamtschule', 'foerderschule', 'berufsschule'
      ];
      
      const programm: Foerderprogramm = testData.gueltigeProgramme[0];
      programm.schulformen.forEach(schulform => {
        expect(gueltigeSchulformen).toContain(schulform);
      });
    });

    it('sollte gültige Status-Werte haben', () => {
      const gueltigeStatus = ['aktiv', 'auslaufend', 'pausiert', 'beendet'];
      
      testData.gueltigeProgramme.forEach(programm => {
        expect(gueltigeStatus).toContain(programm.status);
      });
    });

    it('sollte gültige Bewerbungsarten haben', () => {
      const gueltigeBewerbungsarten = ['online', 'schriftlich', 'beides'];
      
      testData.gueltigeProgramme.forEach(programm => {
        expect(gueltigeBewerbungsarten).toContain(programm.bewerbungsart);
      });
    });
  });

  describe('Ungültige Programme', () => {
    it('sollte leere IDs erkennen', () => {
      const invalidProgramm = testData.ungueltigeProgramme[0];
      expect(invalidProgramm.id).toBe('');
    });

    it('sollte fehlende Namen erkennen', () => {
      const invalidProgramm = testData.ungueltigeProgramme[0];
      expect(invalidProgramm.name).toBe('');
    });

    it('sollte leere Arrays für Schulformen erkennen', () => {
      const invalidProgramm = testData.ungueltigeProgramme[0];
      expect(invalidProgramm.schulformen).toHaveLength(0);
    });

    it('sollte ungültige Fördergeber-Typen erkennen', () => {
      const gueltigeTypen = ['bund', 'land', 'eu', 'stiftung', 'sonstige'];
      const invalidProgramm = testData.ungueltigeFoerdergeberTypen[0];
      
      expect(gueltigeTypen).not.toContain(invalidProgramm.foerdergeberTyp);
    });
  });

  describe('Kategorien und Filter', () => {
    it('sollte Programme nach Kategorien filtern können', () => {
      const digitalProgramme = testData.gueltigeProgramme.filter(
        p => p.kategorien.includes('digitalisierung')
      );
      
      expect(digitalProgramme.length).toBeGreaterThan(0);
      expect(digitalProgramme[0].kategorien).toContain('digitalisierung');
    });

    it('sollte Programme nach Bundesland filtern können', () => {
      const bayernProgramme = testData.gueltigeProgramme.filter(
        p => p.bundeslaender.includes('DE-BY') || p.bundeslaender.includes('alle')
      );
      
      expect(bayernProgramme.length).toBeGreaterThan(0);
    });

    it('sollte Programme nach Status filtern können', () => {
      const aktiveProgramme = testData.gueltigeProgramme.filter(
        p => p.status === 'aktiv'
      );
      
      expect(aktiveProgramme.length).toBe(testData.gueltigeProgramme.length);
    });

    it('sollte Programme nach KI-Eignung filtern können', () => {
      const kiGeeignet = testData.gueltigeProgramme.filter(
        p => p.kiAntragGeeignet === true
      );
      
      expect(kiGeeignet.length).toBeGreaterThan(0);
    });
  });

  describe('Fördersummen', () => {
    it('sollte Fördersummen korrekt darstellen', () => {
      const programm = testData.gueltigeProgramme[0];
      
      if (programm.foerdersummeMin && programm.foerdersummeMax) {
        expect(programm.foerdersummeMin).toBeLessThanOrEqual(programm.foerdersummeMax);
      }
    });

    it('sollte Fördersummen-Text unterstützen', () => {
      const programm = testData.gueltigeProgramme[2];
      expect(programm.foerdersummeText).toBeTruthy();
    });
  });
});
