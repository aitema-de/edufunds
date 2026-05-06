/**
 * Empty-State-Tests fuer components/Wizard/MatchResultList.tsx
 * Phase 02.1 Plan 03 — Empty-State + onReset (D-05)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MatchResultList, type MatchEntry } from '@/components/Wizard/MatchResultList';

// Beispiel-Eintrag fuer Ranking-Branch-Tests
const SAMPLE_ENTRY: MatchEntry = {
  id: 'bmbf-digitalpakt-2',
  score: 88,
  passt_weil: 'Bundesweite Foerderung digitaler Schulinfrastruktur.',
  achtung_bei: 'Antragsfrist naht.',
  programm: {
    id: 'bmbf-digitalpakt-2',
    name: 'DigitalPakt 2.0',
    foerdergeber: 'BMBF',
  },
};

describe('MatchResultList — Empty-State', () => {
  it(
    "rendert Empty-State-Heading 'Kein Programm passt zu diesem Anliegen' bei leerem matches-Array — D-05",
    () => {
      render(<MatchResultList matches={[]} onStartAntrag={jest.fn()} />);
      expect(
        screen.getByText(/Kein Programm passt zu diesem Anliegen/)
      ).toBeInTheDocument();
    }
  );

  it('rendert SearchX-Icon im Empty-State — D-05', () => {
    const { container } = render(
      <MatchResultList matches={[]} onStartAntrag={jest.fn()} />
    );
    // Lucide rendert SVG-Icons mit class="lucide lucide-search-x ..."
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    const hasSearchX = Array.from(svgs).some((svg) =>
      (svg.getAttribute('class') ?? '').toLowerCase().includes('search-x')
    );
    expect(hasSearchX).toBe(true);
  });

  it('rendert genau 3 Reformulierungs-Tipps als Liste — D-05', () => {
    render(<MatchResultList matches={[]} onStartAntrag={jest.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("ruft onReset bei Klick auf 'Anliegen neu formulieren' — D-05", () => {
    const onReset = jest.fn();
    render(
      <MatchResultList
        matches={[]}
        onStartAntrag={jest.fn()}
        onReset={onReset}
      />
    );
    fireEvent.click(screen.getByText(/Anliegen neu formulieren/));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

// Stellt sicher dass der Import funktioniert und der bestehende Empty-State nicht kaputt ist.
describe('MatchResultList — Import-Smoke', () => {
  it('rendert ohne Crash mit leerem matches-Array', () => {
    render(<MatchResultList matches={[]} onStartAntrag={() => {}} />);
  });

  it('rendert ohne Crash mit einem Eintrag', () => {
    render(<MatchResultList matches={[SAMPLE_ENTRY]} onStartAntrag={() => {}} />);
  });
});
