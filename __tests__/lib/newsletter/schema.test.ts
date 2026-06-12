/**
 * Tests für die Zod-Schemata des Newsletters.
 */
import { llmDraftSchema, newsletterDataSchema } from '@/lib/newsletter/schema';

const VALID_DRAFT = {
  leadTitle: 'Frischer Wind für Schulförderung',
  leadContent:
    'Liebe Leserinnen und Leser, wir freuen uns, dass Sie wieder dabei sind. ' +
    'Diesen Monat haben wir drei Förderungen herausgesucht, die sich wirklich ' +
    'lohnen — und einen Tipp, der uns selbst schon oft geholfen hat.',
  tipTitle: 'Wirkungsziele messbar machen',
  tipContent: 'Formulieren Sie konkrete, überprüfbare Ziele mit Zahlen und Zeitrahmen.',
  insightCategory: 'Strategie',
  insightReadTime: 3,
  insightTitle: 'Kofinanzierung clever planen',
  insightContent: 'Viele Programme verlangen einen Eigenanteil. Hier zeigen wir, wie Fördervereine ihn stemmen.',
  insightCtaText: 'Förderungen finden',
  insightCtaUrl: 'https://edufunds.org/foerderprogramme',
  newsItems: [{ text: 'Neue KMK-Empfehlung veröffentlicht' }, { text: 'Erasmus+ verlängert Frist' }],
};

describe('llmDraftSchema', () => {
  it('akzeptiert einen vollständigen Entwurf', () => {
    expect(llmDraftSchema.safeParse(VALID_DRAFT).success).toBe(true);
  });

  it('setzt optionale CTA-Felder auf Default-Leerstring', () => {
    const { insightCtaText, insightCtaUrl, ...rest } = VALID_DRAFT;
    void insightCtaText; void insightCtaUrl;
    const parsed = llmDraftSchema.parse(rest);
    expect(parsed.insightCtaText).toBe('');
    expect(parsed.insightCtaUrl).toBe('');
  });

  it('lehnt zu wenige News-Items ab', () => {
    const bad = { ...VALID_DRAFT, newsItems: [{ text: 'nur eine' }] };
    expect(llmDraftSchema.safeParse(bad).success).toBe(false);
  });

  it('lehnt leeren Lead-Titel ab', () => {
    const bad = { ...VALID_DRAFT, leadTitle: '' };
    expect(llmDraftSchema.safeParse(bad).success).toBe(false);
  });
});

describe('newsletterDataSchema', () => {
  const VALID_DATA = {
    issueNumber: 'Ausgabe #3',
    issueDate: '2026-06-12',
    leadTitle: VALID_DRAFT.leadTitle,
    leadContent: VALID_DRAFT.leadContent,
    programs: [
      {
        name: 'P', funder: 'F', deadline: 'laufend',
        targetGroup: 'Grundschulen · bundesweit', description: 'desc', url: 'https://x/foerderprogramme/p',
      },
    ],
    tipTitle: VALID_DRAFT.tipTitle,
    tipContent: VALID_DRAFT.tipContent,
    insightCategory: VALID_DRAFT.insightCategory,
    insightReadTime: 3,
    insightTitle: VALID_DRAFT.insightTitle,
    insightContent: VALID_DRAFT.insightContent,
    newsItems: VALID_DRAFT.newsItems,
    year: 2026,
  };

  it('akzeptiert eine vollständige Ausgabe', () => {
    expect(newsletterDataSchema.safeParse(VALID_DATA).success).toBe(true);
  });

  it('verlangt mindestens ein Programm', () => {
    const bad = { ...VALID_DATA, programs: [] };
    expect(newsletterDataSchema.safeParse(bad).success).toBe(false);
  });
});
