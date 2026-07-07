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
import { sanitizeLlmUrl, stripUnsafeAnchors } from '@/lib/newsletter/content-collector';

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

describe('sanitizeLlmUrl — härtet LLM-Links', () => {
  const BASE_URL = 'https://app.edufunds.org';
  it('erlaubt die Förderdatenbank (auch mit Query)', () => {
    expect(sanitizeLlmUrl('https://app.edufunds.org/foerderprogramme', BASE_URL)).toBe(
      'https://app.edufunds.org/foerderprogramme'
    );
    expect(
      sanitizeLlmUrl('https://app.edufunds.org/foerderprogramme?kategorie=digitalisierung', BASE_URL)
    ).toContain('/foerderprogramme?kategorie=digitalisierung');
    expect(sanitizeLlmUrl('https://app.edufunds.org/antrag', BASE_URL)).toBe(
      'https://app.edufunds.org/antrag'
    );
  });
  it('verwirft fremde Domain (edufunds.org / beliebige)', () => {
    expect(sanitizeLlmUrl('https://edufunds.org/foerderprogramme', BASE_URL)).toBe('');
    expect(sanitizeLlmUrl('https://evil.example/foerderprogramme', BASE_URL)).toBe('');
  });
  it('verwirft erfundene Tiefpfade auf der richtigen Domain', () => {
    // genau der id-4-Bug: halluzinierter Pfad
    expect(sanitizeLlmUrl('https://app.edufunds.org/foerderungen', BASE_URL)).toBe('');
    expect(sanitizeLlmUrl('https://app.edufunds.org/foerderprogramme/erfundenes-programm', BASE_URL)).toBe('');
  });
  it('verwirft Müll/leer', () => {
    expect(sanitizeLlmUrl('', BASE_URL)).toBe('');
    expect(sanitizeLlmUrl('nicht-mal-eine-url', BASE_URL)).toBe('');
    expect(sanitizeLlmUrl(undefined, BASE_URL)).toBe('');
  });
});

describe('generateNewsletter — Link-Härtung', () => {
  const BASE_URL = 'https://app.edufunds.org';
  it('lässt den kaputten id-4-CTA (edufunds.org/foerderungen) NICHT ins Postfach', () => {
    const data: NewsletterData = {
      ...BASE,
      insightCtaText: 'Zur Förderdatenbank',
      insightCtaUrl: 'https://edufunds.org/foerderungen', // genau der Prod-Bug
    };
    const { html, text } = generateNewsletter(data, BASE_URL, 'tok');
    expect(html).not.toContain('edufunds.org/foerderungen');
    expect(text).not.toContain('edufunds.org/foerderungen');
    // CTA-Text vorhanden → Ausweich-Ziel = funktionierende Förderdatenbank
    expect(html).toContain('https://app.edufunds.org/foerderprogramme');
  });
  it('droppt den CTA ganz, wenn URL ungültig UND kein CTA-Text', () => {
    const data: NewsletterData = {
      ...BASE,
      insightCtaText: '',
      insightCtaUrl: 'https://edufunds.org/foerderungen',
    };
    const { html } = generateNewsletter(data, BASE_URL, 'tok');
    expect(html).not.toContain('foerderungen');
  });
  it('Footer-Links (Impressum/Datenschutz) zeigen auf die App-Domain, nicht auf die 502-Landing', () => {
    const { html, text } = generateNewsletter(BASE, BASE_URL, 'tok');
    expect(html).toContain('https://app.edufunds.org/impressum');
    expect(html).toContain('https://app.edufunds.org/datenschutz');
    expect(html).not.toContain('https://edufunds.org/impressum');
    expect(text).toContain('https://app.edufunds.org/impressum');
  });
  it('entfernt eingebettete unsichere Anker aus News-Text, behält den Text', () => {
    const stripped = stripUnsafeAnchors(
      'Neu: <a href="https://edufunds.org/foerderungen">EU-Programm</a> jetzt offen',
      BASE_URL
    );
    expect(stripped).toBe('Neu: EU-Programm jetzt offen');
    // gültiger Link bleibt erhalten
    expect(
      stripUnsafeAnchors('Siehe <a href="https://app.edufunds.org/foerderprogramme">Datenbank</a>', BASE_URL)
    ).toContain('<a href="https://app.edufunds.org/foerderprogramme">Datenbank</a>');
  });
});
