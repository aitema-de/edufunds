/**
 * Entscheidung 3C (31.07.2026) — Qualitaetsschranke VOR der Zahlung.
 *
 * Anlass war nicht der Durchschnitt, sondern der Rand: Bei duenner Faktenlage
 * lag die Gutachterbewertung bei 3,00 statt 4,13, der schwaechste gemessene
 * Antrag bei 2,06. Wer so zahlt, soll es vorher wissen.
 *
 * Die zwei Zusagen, die hier festgehalten werden:
 *   1. Fehlende Angaben werden VOR dem Bezahlknopf konkret benannt.
 *   2. Sie blockieren NICHT. Der Kunde entscheidet — informiert.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { PaywallGate } from "@/components/Wizard/PaywallGate";

function mockReadiness(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  }) as unknown as typeof fetch;
}

function renderGate() {
  return render(
    <PaywallGate sessionToken="sess-1" priceEur={29.9} tierLabel="Einzelantrag" />
  );
}

afterEach(() => {
  jest.resetAllMocks();
});

describe("Qualitätsschranke vor der Zahlung", () => {
  it("benennt die fehlenden Angaben konkret", async () => {
    mockReadiness({
      status: "hinweise",
      issues: [
        { feld: "budget.beantragt_eur", label: "Beantragte Fördersumme", schwere: "mittel", hinweis: "Ohne Betrag bleibt der Finanzplan unbeziffert." },
        { feld: "schule.schuelerzahl", label: "Schülerzahl", schwere: "mittel" },
      ],
    });
    renderGate();

    expect(await screen.findByText(/Beantragte Fördersumme/)).toBeInTheDocument();
    expect(screen.getByText(/Schülerzahl/)).toBeInTheDocument();
    expect(screen.getByText(/2 Angaben fehlen noch/i)).toBeInTheDocument();
    // Der Hinweis erklaert, warum wir es nicht selbst ausfuellen.
    expect(screen.getByText(/nicht erfinden/i)).toBeInTheDocument();
  });

  it("blockiert den Kauf nicht", async () => {
    mockReadiness({
      status: "kritisch",
      issues: [{ feld: "projekt.titel", label: "Projekttitel", schwere: "hoch" }],
    });
    renderGate();

    await screen.findByText(/Projekttitel/);
    const kaufen = screen.getByRole("button", { name: /freischalten|kaufen|bezahlen|jetzt/i });
    expect(kaufen).toBeEnabled();
  });

  it("zeigt nichts, wenn alle Pflichtangaben vorliegen", async () => {
    mockReadiness({ status: "ok", issues: [] });
    renderGate();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(/fehlt noch|fehlen noch/i)).not.toBeInTheDocument();
  });

  it("blendet Randnotizen der Schwere 'niedrig' aus — an der teuersten Stelle zählt nur Relevantes", async () => {
    mockReadiness({
      status: "hinweise",
      issues: [{ feld: "projekt.zeitraum", label: "Projektzeitraum", schwere: "niedrig" }],
    });
    renderGate();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(/Projektzeitraum/)).not.toBeInTheDocument();
  });

  it("bleibt stumm, wenn der Readiness-Abruf scheitert — eine Nebenprüfung darf den Bezahlweg nie stören", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    renderGate();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(/fehlt noch|fehlen noch/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /freischalten|kaufen|bezahlen|jetzt/i })).toBeEnabled();
  });
});
