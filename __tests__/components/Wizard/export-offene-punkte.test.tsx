/**
 * Entscheidung 1C (31.07.2026) — Arbeitsmarker wandern im Export nach vorne.
 *
 * Der Test greift den Export dort ab, wo er wirklich beim Kunden ankommt: am
 * Text, den "Kopieren" in die Zwischenablage legt. Genau dieser String geht auch
 * in .txt, ins RTF und in den PDF-Klon — eine Pruefung deckt alle vier Wege.
 */
import type React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => undefined }));

import { AntragResult } from "@/components/Wizard/AntragResult";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const programm = { id: "test-prog", name: "Test-Programm" } as unknown as Foerderprogramm;

const MIT_MARKERN = `## Bestandsaufnahme

Die Schule hat 10 Whiteboards. [TODO: Stueckzahl der Tablets erfassen]
[Annahme: Das WLAN reicht in allen Raeumen.] Damit ist die Basis gelegt.`;

function gen(over: Partial<GenerationArtefacts> = {}): GenerationArtefacts {
  return { finalText: MIT_MARKERN, ...over } as GenerationArtefacts;
}

/** Kopieren ausloesen und den in die Zwischenablage gelegten Text zurueckgeben. */
async function kopierterText(generation: GenerationArtefacts): Promise<string> {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<AntragResult programm={programm} generation={generation} paidToken="tok" />);
  fireEvent.click(screen.getByRole("button", { name: /Kopieren/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  return writeText.mock.calls[0][0] as string;
}

describe("Export: Arbeitsliste vor dem Antrag", () => {
  it("stellt die offenen Punkte an den Anfang des Exports", async () => {
    const text = await kopierterText(gen());
    expect(text).toMatch(/Offene Punkte/);
    expect(text.indexOf("Offene Punkte")).toBeLessThan(text.indexOf("Bestandsaufnahme"));
  });

  it("nimmt die Marker aus dem Antragskoerper — aber KEINEN Inhalt aus dem Dokument", async () => {
    const text = await kopierterText(gen());
    const koerper = text.slice(text.indexOf("## Bestandsaufnahme"));
    expect(koerper).not.toMatch(/\[TODO:/);
    expect(koerper).not.toMatch(/\[Annahme:/);
    // Beides muss weiter im Dokument stehen — oben in der Arbeitsliste.
    expect(text).toMatch(/Stueckzahl der Tablets erfassen/);
    expect(text).toMatch(/Das WLAN reicht in allen Raeumen\./);
  });

  it("sagt im Export, dass die Arbeitsliste nicht eingereicht wird", async () => {
    const text = await kopierterText(gen());
    expect(text).toMatch(/NICHT in die Einreichung/);
  });

  it("haengt ohne offene Punkte keinen Vorspann an", async () => {
    const text = await kopierterText(gen({ finalText: "## Antrag\n\nAlles vollstaendig." }));
    expect(text).not.toMatch(/Offene Punkte/);
    expect(text.trimStart().startsWith("## Antrag")).toBe(true);
  });
});

describe("Hinweis auf der Ergebnisseite", () => {
  it("nennt die Zahl der offenen Punkte", () => {
    render(<AntragResult programm={programm} generation={gen()} paidToken="tok" />);
    expect(screen.getByText(/2 offene Punkte vor dem Einreichen/i)).toBeInTheDocument();
  });

  it("sperrt den Export NICHT — es ist eine Warnung, keine Schranke", () => {
    render(<AntragResult programm={programm} generation={gen()} paidToken="tok" />);
    expect(screen.getByRole("button", { name: /Kopieren/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /\.txt/i })).toBeEnabled();
  });

  it("erscheint gar nicht, wenn nichts offen ist", () => {
    render(
      <AntragResult
        programm={programm}
        generation={gen({ finalText: "## Antrag\n\nAlles vollstaendig." })}
        paidToken="tok"
      />
    );
    expect(screen.queryByText(/offene.* Punkt/i)).not.toBeInTheDocument();
  });

  it("zeigt den Hinweis vor der Zahlung nicht — dort ist der Export ohnehin zu", () => {
    render(<AntragResult programm={programm} generation={gen()} sessionToken="sess" />);
    expect(screen.queryByText(/vor dem Einreichen/i)).not.toBeInTheDocument();
  });
});
