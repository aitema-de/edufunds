/**
 * Produktvision 2026-06-10 — #4: Text-Vorschläge interaktiv.
 * Bestätigen nimmt den Vorschlag aus der Liste (Text bleibt), Entfernen streicht
 * den Satz aus dem Antragstext, Bearbeiten ersetzt die Formulierung im Text.
 * Der berechnete neue finalText + die Restliste werden persistiert und an den
 * Parent gemeldet.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TextVorschlaegeEditor } from "@/components/Wizard/TextVorschlaegeEditor";

const V0 = "Das Vorhaben stärkt die Medienkompetenz.";
const V1 = "Eine Evaluation sichert die Wirkung.";
const FINAL = `Einleitung. ${V0} Mittelteil. ${V1} Schluss.`;

let lastBody: { finalText: string; vorschlaege: string[] } | null = null;

beforeEach(() => {
  lastBody = null;
  global.fetch = jest.fn(async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    lastBody = { finalText: body.finalText, vorschlaege: body.vorschlaege };
    // Server echot die persistierten Werte zurück.
    return {
      ok: true,
      json: async () => ({ finalText: body.finalText, vorschlaege: body.vorschlaege }),
    };
  }) as unknown as typeof fetch;
});

function renderEditor() {
  const onChange = jest.fn();
  render(
    <TextVorschlaegeEditor
      sessionToken="sess-1"
      finalText={FINAL}
      vorschlaege={[V0, V1]}
      onChange={onChange}
    />
  );
  return onChange;
}

describe("TextVorschlaegeEditor", () => {
  it("Bestätigen nimmt den Vorschlag aus der Liste, lässt den Antragstext unverändert", async () => {
    const onChange = renderEditor();
    fireEvent.click(screen.getAllByRole("button", { name: "Vorschlag übernehmen" })[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastBody!.finalText).toBe(FINAL); // Text unverändert
    expect(lastBody!.vorschlaege).toEqual([V1]); // V0 raus
  });

  it("Entfernen streicht den Satz aus dem Antragstext", async () => {
    const onChange = renderEditor();
    fireEvent.click(screen.getAllByRole("button", { name: "Vorschlag entfernen" })[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastBody!.finalText).not.toContain(V0);
    expect(lastBody!.finalText).toContain(V1); // anderer Vorschlag bleibt im Text
    expect(lastBody!.vorschlaege).toEqual([V1]);
  });

  it("Bearbeiten ersetzt die Formulierung im Antragstext", async () => {
    const onChange = renderEditor();
    fireEvent.click(screen.getAllByRole("button", { name: "Vorschlag bearbeiten" })[0]);
    const ta = screen.getByRole("textbox", { name: "Vorschlag bearbeiten" });
    fireEvent.change(ta, { target: { value: "Das Vorhaben fördert digitale Teilhabe." } });
    fireEvent.click(screen.getByRole("button", { name: /Übernehmen/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastBody!.finalText).toContain("Das Vorhaben fördert digitale Teilhabe.");
    expect(lastBody!.finalText).not.toContain(V0);
    expect(lastBody!.vorschlaege).toEqual([V1]);
  });
});
