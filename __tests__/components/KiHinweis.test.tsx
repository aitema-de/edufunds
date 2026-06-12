/**
 * EU-AI-Act Art. 50 — KI-Transparenz.
 * (1) Interaktions-Offenlegung am Wizard-Start, (2) Kennzeichnung des
 * KI-generierten Antrags + Mitwandern der Kennzeichnung in den Export.
 */
import { render, screen } from "@testing-library/react";
import { KiHinweis, KI_EXPORT_HINWEIS } from "@/components/KiHinweis";

describe("KiHinweis — AI-Act Art. 50 Transparenz", () => {
  it("legt am Wizard-Start die KI-Interaktion offen (Art. 50(1))", () => {
    render(<KiHinweis variant="interaktion" />);
    expect(screen.getByText(/KI-Assistent/i)).toBeInTheDocument();
    expect(screen.getByText(/künstlich/i)).toBeInTheDocument();
  });

  it("kennzeichnet den Ergebnis-Antrag als KI-generiert (Art. 50(2))", () => {
    render(<KiHinweis variant="ergebnis" />);
    expect(screen.getByText(/Mit KI erstellt/i)).toBeInTheDocument();
    expect(screen.getByText(/vor der Einreichung/i)).toBeInTheDocument();
  });

  it("liefert eine Export-Kennzeichnung, die mit dem Dokument mitwandert", () => {
    expect(KI_EXPORT_HINWEIS).toMatch(/KI-Unterstützung/);
    expect(KI_EXPORT_HINWEIS).toMatch(/vor der Einreichung/);
  });
});
