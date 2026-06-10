/**
 * Produktvision 2026-06-10 — UI-Bestätigung von Vorschlägen (#1):
 * Als Vorschlag markierte Finanzposten (istVorschlag) müssen für den Nutzer
 * sichtbar als bestätigbar gekennzeichnet sein — in der Read-only-Ansicht und im
 * Markdown-Export.
 */
import { render, screen } from "@testing-library/react";
import { FinanzplanView } from "@/components/Wizard/FinanzplanView";
import { renderFinanzplanMarkdown } from "@/lib/wizard/finanzplan-markdown";
import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";

let n = 0;
function posten(p: Partial<Finanzposten>): Finanzposten {
  return {
    id: `p${n++}`,
    kategorie: p.kategorie ?? "sachkosten",
    bezeichnung: p.bezeichnung ?? "Posten",
    betragEur: p.betragEur ?? 1000,
    begruendung: p.begruendung,
    eigenanteil: p.eigenanteil,
    istVorschlag: p.istVorschlag,
  };
}
function plan(posten: Finanzposten[]): Finanzplan {
  return { posten, generiertAm: "2026-06-10T00:00:00.000Z" };
}

describe("FinanzplanView — Vorschlags-Badge", () => {
  it("zeigt ein 'Vorschlag'-Badge nur für Posten mit istVorschlag", () => {
    render(
      <FinanzplanView
        plan={plan([
          posten({ bezeichnung: "Tablets", istVorschlag: true }),
          posten({ bezeichnung: "Eigenanteil", eigenanteil: true, istVorschlag: false }),
        ])}
      />
    );
    // Genau ein Badge (für den Vorschlag-Posten).
    expect(screen.getAllByText("Vorschlag")).toHaveLength(1);
    // Legende erklärt das Badge.
    expect(screen.getByText(/vom Assistenten geschätzter Betrag/i)).toBeInTheDocument();
  });

  it("zeigt KEIN Badge/Legende, wenn kein Posten ein Vorschlag ist", () => {
    render(<FinanzplanView plan={plan([posten({ bezeichnung: "Tablets", istVorschlag: false })])} />);
    expect(screen.queryByText("Vorschlag")).not.toBeInTheDocument();
    expect(screen.queryByText(/vom Assistenten geschätzter Betrag/i)).not.toBeInTheDocument();
  });
});

describe("renderFinanzplanMarkdown — Vorschlags-Marker", () => {
  it("markiert Vorschlags-Posten mit ⟨Vorschlag⟩ und ergänzt eine Legende", () => {
    const md = renderFinanzplanMarkdown(
      plan([
        posten({ bezeichnung: "Tablets", istVorschlag: true }),
        posten({ bezeichnung: "Eigenanteil", eigenanteil: true, istVorschlag: false }),
      ])
    );
    expect(md).toContain("Tablets ⟨Vorschlag⟩");
    expect(md).not.toContain("Eigenanteil ⟨Vorschlag⟩");
    expect(md).toMatch(/⟨Vorschlag⟩ = vom Assistenten vorgeschlagener Betrag/);
  });

  it("ohne Vorschläge keinen Marker und keine Legende", () => {
    const md = renderFinanzplanMarkdown(plan([posten({ bezeichnung: "Tablets", istVorschlag: false })]));
    expect(md).not.toContain("⟨Vorschlag⟩");
  });
});
