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

/**
 * Verdrahtungs-Wächter: Die Komponente allein erfüllt Art. 50 nicht — sie muss
 * an JEDEM Einstieg bzw. Auslieferungspunkt gerendert werden. Deep-Links
 * (Programm-Detailseite, Karten, Kumulierungs-Warnung, „Meine Anträge")
 * führen direkt auf /antrag/[programmId]/wizard, OHNE /antrag/start zu passieren.
 */
describe("KiHinweis — Verdrahtung an den Pflichtstellen", () => {
  const { readFileSync } = jest.requireActual<typeof import("fs")>("fs");
  const src = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

  it("Wizard-Start (/antrag/start) legt die Interaktion offen (Art. 50(1))", () => {
    expect(src("app/antrag/start/page.tsx")).toMatch(/<KiHinweis variant="interaktion"/);
  });

  it("Wizard-Seite (Deep-Link-Einstieg) legt die Interaktion offen (Art. 50(1))", () => {
    expect(src("app/antrag/[programmId]/wizard/page.tsx")).toMatch(
      /<KiHinweis variant="interaktion"/
    );
  });

  it("Ergebnis kennzeichnet KI + Export-Footer wandert mit (Art. 50(2))", () => {
    const antragResult = src("components/Wizard/AntragResult.tsx");
    expect(antragResult).toMatch(/<KiHinweis variant="ergebnis"/);
    expect(antragResult).toMatch(/KI_EXPORT_HINWEIS/);
  });
});
