/**
 * Phase-Dispatch- und Polling-Tests fuer components/Wizard/WizardShell.tsx
 * Phase 02.1 Plan 06 — D-12 + D-15 (B5: Tests 2 + 4 als reale it-Bloecke)
 */

import { render, waitFor } from '@testing-library/react';
import { WizardShell } from '@/components/Wizard/WizardShell';

// AntragResult transitiv abhaengig von react-markdown (ESM-only) — mocken damit
// Jest nicht an ESM-Transformation scheitert. WizardShell-Tests testen Phase-Dispatch,
// nicht den Inhalt von AntragResult.
jest.mock('@/components/Wizard/AntragResult', () => ({
  AntragResult: () => null,
}));

// Abhaengigkeiten mocken, die Browser-Storage oder externe Calls benoetigen
jest.mock('@/lib/wizard/school-profile-client', () => ({
  loadSchoolProfile: jest.fn().mockReturnValue(null),
  clearSchoolProfile: jest.fn(),
  profileToSeedFacts: jest.fn().mockReturnValue({}),
  syncProfileFromFacts: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/wizard/match-handoff-client', () => ({
  consumeHandoff: jest.fn().mockReturnValue(null),
  handoffToSeedFacts: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/wizard/session-index-client', () => ({
  listLocalSessions: jest.fn().mockReturnValue([]),
  saveLocalSession: jest.fn(),
}));

const stubProgramm = {
  id: 'stub-prog',
  name: 'Stub-Programm',
  foerdergeber: 'Test',
  foerdergeberTyp: 'stiftung',
} as never;

const STORAGE_KEY = 'edufunds.wizard.session.stub-prog';

/** Hilfsfunktion: erzeugt ein minimales Response-Objekt fuer fetch-Mocks.
 *  jsdom hat kein globales `Response` — daher plain Object mit ok + json(). */
function mockResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('WizardShell — Phase-Dispatch + Polling (D-12, D-15)', () => {
  // fetch-Mock: global.fetch ist in jsdom nicht standardmaessig gesetzt.
  // Wir weisen eine jest.fn() zu und sichern das Original.
  let originalFetch: typeof global.fetch | undefined;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = (global as Record<string, unknown>).fetch as typeof global.fetch | undefined;
    mockFetch = jest.fn();
    (global as Record<string, unknown>).fetch = mockFetch;
  });

  afterEach(() => {
    if (originalFetch !== undefined) {
      (global as Record<string, unknown>).fetch = originalFetch;
    } else {
      delete (global as Record<string, unknown>).fetch;
    }
    localStorage.clear();
    jest.clearAllMocks();
  });

  // B5 — VERBINDLICH als reales it(), KEIN it.skip:
  it('startet KEIN /api/wizard/generate POST bei Mount mit phase=generating — D-12 + Pattern-Finding-3', async () => {
    // Session-Token in localStorage setzen → WizardShell ruft loadSession auf
    localStorage.setItem(STORAGE_KEY, 'test-token-gen');

    mockFetch.mockResolvedValue(mockResponse({
      sessionToken: 'test-token-gen',
      phase: 'generating',
      messages: [],
      facts: {},
      interviewer: { totalQuestions: 0, maxQuestions: 12 },
      generation: { stage: 'outline', stageAt: new Date().toISOString() },
    }));

    render(<WizardShell programm={stubProgramm} />);

    // Warten, bis loadSession abgeschlossen ist (fetch wurde aufgerufen)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Kein einziger Aufruf darf /api/wizard/generate als POST gewesen sein
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    const generatePosts = calls.filter((url: string) => url.includes('/api/wizard/generate'));
    expect(generatePosts.length).toBe(0);
  });

  // B5 — VERBINDLICH als reales it(), KEIN it.skip:
  it('rendert Fehler-Block mit "Erneut versuchen"-CTA bei phase=failed — D-15', async () => {
    localStorage.setItem(STORAGE_KEY, 'test-token-failed');

    mockFetch.mockResolvedValue(mockResponse({
      sessionToken: 'test-token-failed',
      phase: 'failed',
      messages: [],
      facts: {},
      interviewer: { totalQuestions: 0, maxQuestions: 12 },
      generation: null,
    }));

    const { findByText } = render(<WizardShell programm={stubProgramm} />);

    // WizardErrorBlock rendert "Erneut versuchen" wenn onRetry uebergeben + canRetry
    expect(await findByText(/Erneut versuchen|Nochmal versuchen/i)).toBeInTheDocument();
  });

  // SKIP: interviewing-Render braucht vollstaendige Message-Mock-Kette
  it.skip('rendert letzte Frage bei phase=interviewing — D-12 (Reload waehrend Interview)', () => {
    // Deferred: WizardShell-Rendering bei interviewing braucht QuestionCard-Mock-Kette.
    // Plan 02.1-06 legt it.skip mit Begruendung ab.
  });

  // SKIP: Polling-complete-Race braucht jest.useFakeTimers + setTimeout-Kontrolle
  it.skip('rendert AntragResult bei Polling-Response phase=complete — D-12', () => {
    // Deferred: Polling-Loop-Sequenz mit setTimeout-Mocking ist instabil in jsdom.
    // Plan 02.1-06 deferiert auf manuellen Browser-Smoke.
  });

  // SKIP: Mount/Unmount-Doppel-Polling braucht cancel-Flag-Verifikation via Timer-Mock
  it.skip('polled gegen /api/wizard/[token] mit cancel-Flag bei phase=generating — D-12 + Pattern-Finding-5', () => {
    // Deferred: Timer-basierte Polling-Loop-Tests sind instabil in jsdom ohne
    // jest.useFakeTimers(). Plan 02.1-06 deferiert auf manuellen Browser-Smoke
    // (siehe 02.1-VALIDATION.md — Reload-Resume-Smoke).
  });
});
