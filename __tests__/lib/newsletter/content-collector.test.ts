/**
 * Tests für den deterministischen Content-Collector.
 */
import {
  collectNewsletterContent,
  conciseDeadline,
  conciseAmount,
  _setCatalogForTest,
  type ProgramRecord,
} from '@/lib/newsletter/content-collector';

const REC = (over: Partial<ProgramRecord>): ProgramRecord => ({
  id: 'x',
  name: 'Programm X',
  foerdergeber: 'Geber',
  status: 'aktiv',
  kiAntragGeeignet: true,
  schulformen: ['grundschule'],
  bundeslaender: ['DE-NI'],
  kurzbeschreibung: 'Kurz.',
  bewerbungsfristText: 'laufend',
  ...over,
});

describe('content-collector', () => {
  afterEach(() => _setCatalogForTest(null));

  it('wählt nur aktive, KI-geeignete Programme', () => {
    _setCatalogForTest([
      REC({ id: 'a', verifiziertAm: '2026-06-01' }),
      REC({ id: 'inaktiv', status: 'archiviert', verifiziertAm: '2026-06-02' }),
      REC({ id: 'nicht-ki', kiAntragGeeignet: false, verifiziertAm: '2026-06-03' }),
      REC({ id: 'b', verifiziertAm: '2026-05-01' }),
    ]);
    const out = collectNewsletterContent({ count: 5 });
    expect(out.programIds.sort()).toEqual(['a', 'b']);
  });

  it('sortiert frischeste (zuletzt verifiziert) zuerst', () => {
    _setCatalogForTest([
      REC({ id: 'alt', verifiziertAm: '2026-01-01' }),
      REC({ id: 'neu', verifiziertAm: '2026-06-10' }),
      REC({ id: 'mittel', verifiziertAm: '2026-03-15' }),
    ]);
    const out = collectNewsletterContent({ count: 2 });
    expect(out.programIds).toEqual(['neu', 'mittel']);
  });

  it('schließt zuletzt vorgestellte Programme aus (Rotation)', () => {
    _setCatalogForTest([
      REC({ id: 'a', verifiziertAm: '2026-06-01' }),
      REC({ id: 'b', verifiziertAm: '2026-05-01' }),
      REC({ id: 'c', verifiziertAm: '2026-04-01' }),
    ]);
    const out = collectNewsletterContent({ count: 2, excludeIds: ['a'] });
    expect(out.programIds).toEqual(['b', 'c']);
  });

  it('füllt mit bereits gezeigten auf, wenn sonst zu wenige übrig sind', () => {
    _setCatalogForTest([REC({ id: 'a', verifiziertAm: '2026-06-01' })]);
    const out = collectNewsletterContent({ count: 3, excludeIds: ['a'] });
    expect(out.programIds).toEqual(['a']); // lieber Wiederholung als leer
  });

  it('mappt auf Newsletter-Programmkarten mit interner URL und Zielgruppe', () => {
    _setCatalogForTest([
      REC({
        id: 'mint-ni',
        name: 'MINT NI',
        foerdergeber: 'Land NI',
        schulformen: ['gymnasium'],
        bundeslaender: ['DE-NI'],
        bewerbungsfristText: '30. März 2026',
      }),
    ]);
    const out = collectNewsletterContent({ count: 1, baseUrl: 'https://app.edufunds.org/' });
    expect(out.programs[0]).toMatchObject({
      name: 'MINT NI',
      funder: 'Land NI',
      deadline: 'Frist: 30. März 2026',
      targetGroup: 'Gymnasien · Niedersachsen',
      url: 'https://app.edufunds.org/foerderprogramme/mint-ni',
    });
  });

  it('kürzt verbose/rollende Fristen für das Badge', () => {
    expect(conciseDeadline('laufend (vor Projektbeginn)')).toBe('laufend');
    expect(conciseDeadline('Fortlaufend - keine feste Frist; jederzeit')).toBe('laufend');
    expect(conciseDeadline('Bewerbungszyklus jaehrlich (zuletzt Frist 22.02.2026)')).toBe('Frist: 22.02.2026');
    expect(conciseDeadline('Antrag bis 30. März 2026 einreichen')).toBe('Frist: 30. März 2026');
    expect(conciseDeadline('')).toBe('laufend');
    expect(conciseDeadline('Ein sehr langer Fristtext der definitiv über zweiundvierzig Zeichen liegt').length).toBeLessThanOrEqual(43);
  });

  it('bildet eine knappe Förderhöhe aus numerischen Feldern', () => {
    expect(conciseAmount(REC({ foerdersummeMax: 50000 }))).toBe('bis zu 50.000 €');
    expect(conciseAmount(REC({ foerdersummeMin: 5000, foerdersummeMax: 50000 }))).toBe('5.000–50.000 €');
    expect(conciseAmount(REC({ foerdersummeMin: 1000 }))).toBe('ab 1.000 €');
    // langer/satzartiger Freitext wird NICHT als Chip übernommen (Überlauf-Schutz)
    expect(conciseAmount(REC({ foerdersummeText: '5€ pro Einheit, max. 1.000€ pro Verein' }))).toBeUndefined();
    // kurzer, sauberer Freitext ist ok
    expect(conciseAmount(REC({ foerdersummeText: 'Sachpreis' }))).toBe('Sachpreis');
    expect(conciseAmount(REC({}))).toBeUndefined();
  });

  it('liefert für den echten Katalog drei valide Programme', () => {
    const out = collectNewsletterContent({ count: 3 });
    expect(out.programs).toHaveLength(3);
    for (const p of out.programs) {
      expect(p.name).toBeTruthy();
      expect(p.funder).toBeTruthy();
      expect(p.url).toMatch(/\/foerderprogramme\//);
    }
    expect(out.catalogContext.totalKiSuitable).toBeGreaterThan(10);
  });
});
