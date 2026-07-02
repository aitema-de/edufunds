/**
 * Hebel 2 (E2E-Probe 09.06.) — Auslieferungs-Block:
 * Bei einem nicht abschliessend adressierten hoch-Finding des KI-Gutachters
 * (hasOpenHighFindings) muss der Export (Kopieren/.txt/.doc/PDF) gesperrt sein,
 * bis der Nutzer aktiv bestaetigt, dass er den Antrag selbst geprueft hat.
 * Reine Konsistenz-Hinweise bleiben eine weiche Warnung ohne Sperre.
 */
import type React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// AntragResult ist transitiv von react-markdown/remark-gfm (ESM-only) abhaengig —
// fuer den reinen Block-/Export-Test mocken wir den Markdown-Renderer weg.
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => undefined }));

import { AntragResult } from "@/components/Wizard/AntragResult";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const programm = { id: "test-prog", name: "Test-Programm" } as unknown as Foerderprogramm;

function gen(over: Partial<GenerationArtefacts>): GenerationArtefacts {
  return { finalText: "## Antrag\n\nText.", ...over } as GenerationArtefacts;
}

describe("AntragResult — Auslieferungs-Block bei offenen HIGH-Findings", () => {
  it("sperrt die Export-Buttons, solange das offene HIGH-Finding nicht bestätigt ist", () => {
    render(
      <AntragResult
        programm={programm}
        generation={gen({ hasOpenHighFindings: true })}
        paidToken="tok"
      />
    );
    const copyBtn = screen.getByRole("button", { name: /Kopieren/i });
    const txtBtn = screen.getByRole("button", { name: /\.txt/i });
    const pdfBtn = screen.getByRole("button", { name: /PDF/i });
    expect(copyBtn).toBeDisabled();
    expect(txtBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();

    // Bestätigungs-Checkbox vorhanden und initial nicht angehakt.
    const ack = screen.getByRole("checkbox");
    expect(ack).not.toBeChecked();

    // Nach Bestätigung sind die Buttons freigegeben.
    fireEvent.click(ack);
    expect(copyBtn).toBeEnabled();
    expect(txtBtn).toBeEnabled();
    expect(pdfBtn).toBeEnabled();
  });

  it("liefert ohne offene HIGH-Findings normal aus — keine Sperre, keine Checkbox", () => {
    render(<AntragResult programm={programm} generation={gen({})} paidToken="tok" />);
    expect(screen.getByRole("button", { name: /Kopieren/i })).toBeEnabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("zeigt bei reinen Konsistenz-Hinweisen eine weiche Warnung ohne Export-Sperre", () => {
    render(
      <AntragResult
        programm={programm}
        generation={gen({ hasConsistencyIssues: true, consistencyIssues: ["Betrag weicht ab"] })}
        paidToken="tok"
      />
    );
    // Export bleibt frei (Konsistenz ist von der Pipeline bereits abgeglichen).
    expect(screen.getByRole("button", { name: /Kopieren/i })).toBeEnabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Inkonsistenzen/i)).toBeInTheDocument();
  });
});

describe("AntragResult — P4-B Beantragungshöhe-Empfehlung", () => {
  const finanzplan = {
    posten: [
      { id: "a", bezeichnung: "Sachkosten", kategorie: "sachkosten", betragEur: 24000, eigenanteil: false },
      { id: "b", bezeichnung: "Eigenanteil", kategorie: "sonstiges", betragEur: 6000, eigenanteil: true },
    ],
    generiertAm: new Date(0).toISOString(),
  };

  it("verrechnet das Finanzplan-Volumen mit dem Quoten-Deckel (Quote bindet)", () => {
    render(
      <AntragResult
        programm={programm}
        generation={gen({ finanzplan } as Partial<GenerationArtefacts>)}
        paidToken="tok"
        foerderhoehe={{ maxEur: 50000, maxProzentGesamtkosten: 50 }}
      />
    );
    // Volumen 30.000 € (24k + 6k); 50% = 15.000 € < Deckel 50.000 € → Quote bindet.
    expect(screen.getByText(/Wie viel sollten Sie beantragen\?/)).toBeInTheDocument();
    expect(
      screen.getByText(/Für Ihr Projektvolumen von 30\.000 € .* bis zu 15\.000 € beantragen\./)
    ).toBeInTheDocument();
  });

  it("blendet den Block aus, wenn keine Förderhöhe-Daten vorliegen", () => {
    render(<AntragResult programm={programm} generation={gen({})} paidToken="tok" />);
    expect(screen.queryByText(/Wie viel sollten Sie beantragen\?/)).not.toBeInTheDocument();
  });
});
