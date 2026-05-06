/**
 * Empty-State-Tests fuer components/Wizard/MatchResultList.tsx
 * Phase 02.1 Plan 01 — Wave-0-Skelette (D-05)
 *
 * Alle it.todo werden in Plan 02.1-03 gruen gemacht (Empty-State + onReset).
 */

import { render } from '@testing-library/react';
import { MatchResultList, type MatchEntry } from '@/components/Wizard/MatchResultList';

// Beispiel-Eintrag fuer spaeteren Einsatz in Plan 02.1-03
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
  it.todo(
    "rendert Empty-State-Heading 'Kein Programm passt zu diesem Anliegen' bei leerem matches-Array — D-05"
    // Plan 02.1-03: rendert neues Empty-State mit Reformulierungs-Tipps statt aktuellem Fallback
  );

  it.todo(
    "rendert 3 Reformulierungs-Tipps als Liste — D-05"
    // Plan 02.1-03: unskippt wenn MatchResultList den neuen Empty-State-Block erhaelt
  );

  it.todo(
    "ruft onReset bei Klick auf 'Anliegen neu formulieren' — D-05"
    // Plan 02.1-03: unskippt wenn onReset-Prop zu MatchResultList-Props hinzugefuegt wird
  );
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
