/**
 * Tests für das Newsletter-Rendering (generateNewsletter) — insbesondere die
 * neuen Blöcke: Kennzahlen, Gründungsgeschichte (Kickoff) vs. kompakte
 * "Was ist EduFunds?"-Box (Folgeausgaben) und die Förderhöhe in Programmkarten.
 */
import {
  generateNewsletter,
  DEFAULT_ABOUT_BOX,
  type NewsletterData,
} from '@/lib/newsletter';

const BASE: NewsletterData = {
  issueNumber: 'Ausgabe #1',
  issueDate: '2026-06-15',
  leadTitle: 'Eine echte Schlagzeile',
  leadContent: 'Liebe Leserinnen und Leser,\n\ndies ist ein Brief mit genug Inhalt, um die Mindestlänge der Validierung locker zu erfüllen und realistisch zu wirken.',
  programs: [
    {
      name: 'Test-Programm',
      funder: 'Test-Geber',
      deadline: 'laufend',
      targetGroup: 'Alle Schularten · bundesweit',
      description: 'Eine knappe Beschreibung.',
      url: 'https://app.edufunds.org/foerderprogramme/test',
      amount: 'bis zu 50.000 €',
    },
  ],
  tipTitle: 'Tipp',
  tipContent: 'Ein umsetzbarer Tipp mit ausreichend Inhalt für die Validierung.',
  insightCategory: 'Hintergrund',
  insightReadTime: 3,
  insightTitle: 'Insight-Titel',
  insightContent: 'Ein Absatz fundierter Hintergrund mit genügend Zeichen für die Validierung.',
  newsItems: [{ text: 'Eine kurze Meldung.' }],
  year: 2026,
};

describe('generateNewsletter — neue Blöcke', () => {
  it('zeigt im Kickoff die Gründungsgeschichte und KEINE kompakte Box', () => {
    const data: NewsletterData = {
      ...BASE,
      isKickoff: true,
      stats: [{ value: '178', label: 'Förderprogramme im Blick' }],
      introStory: {
        lead: 'Ein Erzähltext mit ausreichend Länge, der die Mindestanforderung der Validierung erfüllt und das Problem greifbar macht.',
        points: [
          { label: 'Was uns antreibt', text: 'Bildung sollte nicht an Formularen scheitern.' },
          { label: 'Was Schulen davon haben', text: 'Schneller die passende Förderung finden.' },
        ],
      },
    };
    const { html, text } = generateNewsletter(data, 'https://app.edufunds.org', 'tok');
    expect(html).toContain('Warum es EduFunds gibt');
    expect(html).toContain('Was uns antreibt');
    expect(html).toContain('178');
    expect(html).not.toContain('class="about-box"');
    expect(text).toContain('WARUM ES EDUFUNDS GIBT');
  });

  it('zeigt in Folgeausgaben die kompakte Box (Default) und KEINE Geschichte', () => {
    const data: NewsletterData = { ...BASE, issueNumber: 'Ausgabe #2', isKickoff: false };
    const { html } = generateNewsletter(data, 'https://app.edufunds.org', 'tok');
    expect(html).toContain('class="about-box"');
    expect(html).toContain(DEFAULT_ABOUT_BOX.title);
    expect(html).not.toContain('Warum es EduFunds gibt');
  });

  it('rendert die Förderhöhe als Chip in der Programmkarte', () => {
    const { html, text } = generateNewsletter(BASE, 'https://app.edufunds.org', 'tok');
    expect(html).toContain('program-amount');
    expect(html).toContain('bis zu 50.000 €');
    expect(text).toContain('Förderhöhe: bis zu 50.000 €');
  });

  it('blendet Kennzahlen rückstandslos aus, wenn keine gesetzt sind', () => {
    const { html } = generateNewsletter({ ...BASE, isKickoff: false }, 'https://app.edufunds.org', 'tok');
    expect(html).not.toContain('class="stat-strip"');
  });
});
