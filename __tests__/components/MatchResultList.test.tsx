/**
 * UI-Smoke fuer MatchResultList + ClarificationCard.
 * Phase 2 Plan 02-02 — D-10 (passt_weil/achtung_bei-Bloecke), D-11 (ClarificationCard),
 * D-12 (Empty-State unveraendert).
 *
 * 12 it()-Tests gruen (6 ranking + 6 clarification).
 * Setup-Konstante SAMPLE aus Plan 02-02 Interfaces-Block uebernommen.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MatchResultList, type MatchEntry } from '@/components/Wizard/MatchResultList';
import { ClarificationCard } from '@/components/Wizard/ClarificationCard';

const SAMPLE: MatchEntry = {
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

describe('MatchResultList — Ranking-Branch', () => {
  it("rendert passt_weil-Block mit Label 'Passt, weil:' — D-10", () => {
    render(<MatchResultList matches={[SAMPLE]} onStartAntrag={() => {}} />);
    expect(screen.getByText(/Passt, weil:/)).toBeInTheDocument();
    expect(
      screen.getByText('Bundesweite Foerderung digitaler Schulinfrastruktur.')
    ).toBeInTheDocument();
  });

  it("rendert achtung_bei-Block mit Label 'Achtung:' wenn nicht-leer — D-10", () => {
    render(<MatchResultList matches={[SAMPLE]} onStartAntrag={() => {}} />);
    expect(screen.getByText(/Achtung:/)).toBeInTheDocument();
    expect(screen.getByText('Antragsfrist naht.')).toBeInTheDocument();
  });

  it('rendert achtung_bei-Block NICHT wenn leer — D-10', () => {
    const empty: MatchEntry = { ...SAMPLE, achtung_bei: '' };
    render(<MatchResultList matches={[empty]} onStartAntrag={() => {}} />);
    expect(screen.queryByText(/Achtung:/)).not.toBeInTheDocument();
    // passt_weil bleibt sichtbar
    expect(screen.getByText(/Passt, weil:/)).toBeInTheDocument();
  });

  it('rendert CheckCircle-Icon (lucide-react) im passt_weil-Block — D-10', () => {
    const { container } = render(
      <MatchResultList matches={[SAMPLE]} onStartAntrag={() => {}} />
    );
    // lucide-react setzt class="lucide lucide-{iconname}" — CheckCircle erscheint als svg.
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    // Mind. ein SVG enthaelt eine Klasse mit "circle" (CheckCircle / HelpCircle / etc.)
    const hasCircle = Array.from(svgs).some((svg) =>
      (svg.getAttribute('class') ?? '').toLowerCase().includes('circle')
    );
    expect(hasCircle).toBe(true);
  });

  it('rendert AlertTriangle-Icon (lucide-react) im achtung_bei-Block — D-10', () => {
    const { container } = render(
      <MatchResultList matches={[SAMPLE]} onStartAntrag={() => {}} />
    );
    const svgs = container.querySelectorAll('svg');
    const hasTriangle = Array.from(svgs).some((svg) =>
      (svg.getAttribute('class') ?? '').toLowerCase().includes('triangle')
    );
    expect(hasTriangle).toBe(true);
  });

  it('rendert Empty-State-Card bei matches.length===0 — D-05', () => {
    render(<MatchResultList matches={[]} onStartAntrag={() => {}} />);
    expect(screen.getByText('Kein Programm passt zu diesem Anliegen')).toBeInTheDocument();
  });
});

describe('ClarificationCard', () => {
  const QUESTION = 'Fuer welches Bundesland sucht ihr und welcher Schwerpunkt steht im Vordergrund?';

  it('rendert question-Text als h2 — D-11', () => {
    render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={() => {}}
        onForceRanking={() => {}}
      />
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(QUESTION);
  });

  it('rendert HelpCircle-Icon — D-11', () => {
    const { container } = render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={() => {}}
        onForceRanking={() => {}}
      />
    );
    const svgs = container.querySelectorAll('svg');
    const hasHelp = Array.from(svgs).some((svg) =>
      (svg.getAttribute('class') ?? '').toLowerCase().includes('help')
    );
    expect(hasHelp).toBe(true);
  });

  it("rendert textarea mit aria-label='Anliegen praezisieren' — D-11", () => {
    render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={() => {}}
        onForceRanking={() => {}}
      />
    );
    const textarea = screen.getByLabelText('Anliegen praezisieren');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('Praezisieren-Button disabled wenn textarea leer — D-11', () => {
    render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={() => {}}
        onForceRanking={() => {}}
      />
    );
    const button = screen.getByRole('button', { name: /Praezisieren/i });
    expect(button).toBeDisabled();
  });

  it("Klick auf 'Praezisieren' ruft onSubmit mit textarea-Wert — D-11", () => {
    const onSubmit = jest.fn();
    render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={onSubmit}
        onForceRanking={() => {}}
      />
    );
    const textarea = screen.getByLabelText('Anliegen praezisieren');
    fireEvent.change(textarea, { target: { value: 'Fokus liegt auf MINT in Berlin.' } });
    const button = screen.getByRole('button', { name: /Praezisieren/i });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Fokus liegt auf MINT in Berlin.');
  });

  it("Override-Link 'Trotzdem mit aktueller Eingabe ranken' ruft onForceRanking — D-11", () => {
    const onForceRanking = jest.fn();
    render(
      <ClarificationCard
        question={QUESTION}
        onSubmit={() => {}}
        onForceRanking={onForceRanking}
      />
    );
    const overrideButton = screen.getByRole('button', {
      name: /Trotzdem mit aktueller Eingabe ranken/i,
    });
    fireEvent.click(overrideButton);
    expect(onForceRanking).toHaveBeenCalledTimes(1);
    expect(onForceRanking).toHaveBeenCalledWith();
  });
});
