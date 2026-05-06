/**
 * Phase-Dispatch- und Polling-Tests fuer components/Wizard/WizardShell.tsx
 * Phase 02.1 Plan 01 — Wave-0-Skelette (D-12, D-15)
 *
 * Alle it.todo werden in Plan 02.1-06 gruen gemacht.
 */

// next/navigation ist global in test/setup.tsx gemockt
// fetch wird hier zusaetzlich per spyOn gemockt

describe('WizardShell — Phase-Dispatch + Polling', () => {
  beforeEach(() => {
    // fetch-Spy fuer spaeteren Einsatz (Plan 02.1-06)
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ phase: 'interviewing', messages: [], facts: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.todo(
    "rendert letzte Frage bei phase=interviewing — D-12 (Reload waehrend Interview)"
    // Plan 02.1-06: unskippt — WizardShell mit gespeicherter interviewing-Session rendern
  );

  it.todo(
    "startet KEIN /api/wizard/generate POST bei Mount mit phase=generating — D-12 + Pattern-Finding-3"
    // Plan 02.1-06: unskippt — sicherstellt dass kein doppelter Generate-Call bei Reload im generating-State
  );

  it.todo(
    "rendert AntragResult bei phase=complete + finalText vorhanden — D-12"
    // Plan 02.1-06: unskippt — WizardShell mit complete-State und generation.finalText rendern
  );

  it.todo(
    "rendert Fehler-Block mit Retry-CTA bei phase=failed — D-15"
    // Plan 02.1-06: unskippt — WizardShell mit failed-State rendern, WizardErrorBlock pruefen
  );

  it.todo(
    "polled gegen /api/wizard/[token] mit cancel-Flag bei phase=generating — D-12 + Pattern-Finding-5 (CheckoutSuccessClient-Pattern)"
    // Plan 02.1-06: unskippt — Polling-Loop verifizieren, cancel bei Unmount pruefen
  );
});
