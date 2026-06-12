/**
 * Tests für die Versandlogik (Batching, Test-Modus, Fehlerzählung).
 * @/lib/db wird gemockt, damit pg im Test-Env nicht geladen wird.
 */
jest.mock('@/lib/db', () => ({
  getConfirmedNewsletterEntries: jest.fn(),
  generateToken: jest.fn(() => 'tok'),
}));

import { sendNewsletter, type DispatchDeps } from '@/lib/newsletter/dispatch';
import type { NewsletterData } from '@/lib/newsletter';

const DATA: NewsletterData = {
  issueNumber: 'Ausgabe #1',
  issueDate: '2026-06-12',
  leadTitle: 'Titel',
  leadContent: 'Inhalt des Editorials.',
  programs: [
    { name: 'P', funder: 'F', deadline: 'laufend', targetGroup: 'Grundschulen', description: 'd', url: 'https://x/foerderprogramme/p' },
  ],
  tipTitle: 'Tipp',
  tipContent: 'Tipptext.',
  insightCategory: 'Hintergrund',
  insightReadTime: 2,
  insightTitle: 'Insight',
  insightContent: 'Insighttext.',
  newsItems: [{ text: 'News A' }, { text: 'News B' }],
  year: 2026,
};

function fakeDeps(over: Partial<DispatchDeps> = {}): DispatchDeps {
  return {
    getSubscribers: jest.fn(async () => [
      { email: 'a@example.com', unsubscribe_token: 't1' },
      { email: 'b@example.com', unsubscribe_token: 't2' },
      { email: 'c@example.com', unsubscribe_token: 't3' },
    ]),
    sendEmail: jest.fn(async () => ({ ok: true, id: 'id' })),
    ...over,
  };
}

describe('sendNewsletter', () => {
  it('versendet an alle Abonnenten und zählt Erfolge', async () => {
    const deps = fakeDeps();
    const out = await sendNewsletter(DATA, { batchSize: 2, batchDelayMs: 0 }, deps);
    expect(out.stats).toEqual({ total: 3, successful: 3, failed: 0 });
    expect(deps.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('rendert eine personalisierte Abmelde-URL pro Empfänger', async () => {
    const sendEmail = jest.fn(async () => ({ ok: true }));
    await sendNewsletter(DATA, { baseUrl: 'https://app.edufunds.org', batchDelayMs: 0 }, fakeDeps({ sendEmail }));
    const firstCall = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(firstCall.headers['List-Unsubscribe']).toContain('/api/newsletter/unsubscribe?token=t1');
    expect(firstCall.html).toContain('Titel');
  });

  it('zählt fehlgeschlagene Sends', async () => {
    let n = 0;
    const sendEmail = jest.fn(async () => (++n === 2 ? { ok: false, error: 'boom' } : { ok: true }));
    const out = await sendNewsletter(DATA, { batchDelayMs: 0 }, fakeDeps({ sendEmail }));
    expect(out.stats.successful).toBe(2);
    expect(out.stats.failed).toBe(1);
  });

  it('nutzt im Test-Modus die testEmails statt der Abonnenten', async () => {
    const getSubscribers = jest.fn(async () => [{ email: 'real@x.de', unsubscribe_token: 't' }]);
    const out = await sendNewsletter(
      DATA,
      { test: true, testEmails: ['tester@aitema.de'], batchDelayMs: 0 },
      fakeDeps({ getSubscribers })
    );
    expect(getSubscribers).not.toHaveBeenCalled();
    expect(out.stats).toEqual({ total: 1, successful: 1, failed: 0 });
  });

  it('liefert leere Statistik ohne Empfänger', async () => {
    const out = await sendNewsletter(DATA, { batchDelayMs: 0 }, fakeDeps({ getSubscribers: jest.fn(async () => []) }));
    expect(out.stats).toEqual({ total: 0, successful: 0, failed: 0 });
  });
});
