import { render, screen } from "@testing-library/react";
import { MatchResultList, type MatchEntry } from "@/components/Wizard/MatchResultList";
import { brauchtFristHinweis } from "@/lib/foerder-zustaende";

/**
 * Der Frist-Hinweis ist die GEGENLEISTUNG dafuer, dass Programme mit
 * unverifizierter Frist im Verkauf bleiben duerfen (Entscheidung Kolja,
 * 22.07.2026). Faellt er still weg, verkauft EduFunds wieder ungeprueft —
 * nur diesmal mit dem guten Gewissen, man haette ja einen Hinweis.
 *
 * Deshalb ist er hier festgenagelt und nicht nur "eingebaut".
 */

function eintrag(over: Partial<MatchEntry["programm"]> = {}): MatchEntry {
  return {
    id: "p1",
    score: 80,
    passt_weil: "passt",
    achtung_bei: "",
    programm: {
      id: "p1",
      name: "Testprogramm",
      bewerbungsfristText: "laufend",
      ...over,
    },
  };
}

describe("FristHinweis in der Trefferliste (vor dem Kauf)", () => {
  it("zeigt den Hinweis, wenn die Frist unverifiziert ist", () => {
    render(<MatchResultList matches={[eintrag({ fristUnverifiziert: true })]} />);
    expect(screen.getByTestId("frist-hinweis-badge")).toBeInTheDocument();
  });

  it("zeigt ihn NICHT, wenn die Frist belegt ist", () => {
    render(<MatchResultList matches={[eintrag({ fristUnverifiziert: false })]} />);
    expect(screen.queryByTestId("frist-hinweis-badge")).not.toBeInTheDocument();
  });

  it("der Hinweis nennt die Handlung, nicht nur den Zustand", () => {
    render(<MatchResultList matches={[eintrag({ fristUnverifiziert: true })]} />);
    // Der Kunde muss wissen, was ER tun soll — "unbekannt" allein hilft ihm nicht.
    expect(screen.getByTestId("frist-hinweis-badge").getAttribute("title")).toMatch(/pr(ü|ue)fen/i);
  });
});

describe("brauchtFristHinweis — welcher Zustand loest den Hinweis aus", () => {
  it("unbekannt und fehlend loesen aus, belegte Zustaende nicht", () => {
    expect(brauchtFristHinweis({ art: "unbekannt" })).toBe(true);
    expect(brauchtFristHinweis(undefined)).toBe(true);
    expect(brauchtFristHinweis({ art: "keine", quelle: "q" })).toBe(false);
    expect(brauchtFristHinweis({ art: "stichtag", stichtage: ["2026-12-01"], quelle: "q" })).toBe(
      false
    );
    // "geschlossen" ist gar nicht verkaeuflich — der Hinweis waere sinnlos.
    expect(brauchtFristHinweis({ art: "geschlossen", quelle: "q" })).toBe(false);
  });
});
