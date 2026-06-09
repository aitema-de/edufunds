/**
 * Empty-State-Tests fuer components/Wizard/MyAntraegeClient.tsx
 * Phase 02.1 Plan 03 — Action-orientierter Empty-State (D-05)
 *
 * MyAntraegeClient liest Sessions per listLocalSessions() aus localStorage.
 * Bei leerem localStorage => sessions=[] => Empty-State wird synchron gesetzt.
 */

import { render, screen } from '@testing-library/react';
import { MyAntraegeClient } from '@/components/Wizard/MyAntraegeClient';

// Mock fuer listLocalSessions — gibt leeres Array zurueck (kein localStorage-Zugriff noetig)
jest.mock('@/lib/wizard/session-index-client', () => ({
  listLocalSessions: jest.fn(() => []),
  removeLocalSession: jest.fn(),
}));

describe('MyAntraegeClient — Empty-State', () => {
  it(
    "rendert Empty-State CTA-Label 'Anliegen schildern' bei leerem sessions-Array — D-05",
    async () => {
      render(<MyAntraegeClient />);
      // useEffect setzt sessions=[] synchron wenn listLocalSessions leeres Array liefert
      const cta = await screen.findByText(/Anliegen schildern/);
      expect(cta).toBeInTheDocument();
    }
  );

  it('Empty-State-CTA-href verweist auf /antrag/start — D-05', async () => {
    render(<MyAntraegeClient />);
    const link = await screen.findByRole('link', { name: /Anliegen schildern/ });
    expect(link).toHaveAttribute('href', '/antrag/start');
  });
});
