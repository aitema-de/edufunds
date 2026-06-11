/**
 * Probe 09.06., Fall 6 — voller Antragstext, aber Finanzplan mit 0 Posten.
 * Der Generator muss bei leerem Posten-Array genau EINEN Wiederholungs-Versuch
 * machen und, wenn auch der leer bleibt, einen ehrlichen UNBEZIFFERTEN
 * Kostenrahmen liefern (nie still einen leeren Plan).
 */
import {
  buildUnbezifferterFallback,
  generateFinanzplan,
} from "@/lib/wizard/finanzplan-generator";
import type { WizardFacts } from "@/lib/wizard/types";

const generateJsonMock = jest.fn();

jest.mock("@/lib/wizard/llm", () => {
  const actual = jest.requireActual("@/lib/wizard/llm");
  return {
    ...actual,
    generateJson: (...args: unknown[]) => generateJsonMock(...args),
  };
});

const programm = { id: "p", name: "Test", foerdergeberTyp: "bund" } as never;
const usage = { promptTokens: 10, candidatesTokens: 10 };

beforeEach(() => generateJsonMock.mockReset());

describe("generateFinanzplan — Fall-6-Robustheit", () => {
  it("leeres Posten-Array → Wiederholung, die liefert → bezifferter Plan", async () => {
    generateJsonMock
      .mockResolvedValueOnce({ value: { posten: [] }, usage })
      .mockResolvedValueOnce({
        value: { posten: [{ kategorie: "investitionen", bezeichnung: "Tablets", betragEur: 5000 }] },
        usage,
      });

    const facts: WizardFacts = { schule: { name: "GS" }, projekt: {} } as never;
    const { plan } = await generateFinanzplan(programm, facts, null, ["20 Tablets"]);

    expect(generateJsonMock).toHaveBeenCalledTimes(2);
    expect(plan.unbeziffert).toBeUndefined();
    expect(plan.posten.length).toBe(1);
    expect(plan.posten[0].istVorschlag).toBe(true); // keine Kostenbasis → Vorschlag
  });

  it("zweimal leer → ehrlicher unbezifferter Kostenrahmen aus Hauptposten", async () => {
    generateJsonMock
      .mockResolvedValueOnce({ value: { posten: [] }, usage })
      .mockResolvedValueOnce({ value: { posten: [] }, usage });

    const facts: WizardFacts = {
      budget: { hauptposten: ["Tablets", "Fortbildung Mediendidaktik"] },
    } as never;
    const { plan } = await generateFinanzplan(programm, facts, null, []);

    expect(generateJsonMock).toHaveBeenCalledTimes(2);
    expect(plan.posten.length).toBe(0);
    expect(plan.unbeziffert).toBe(true);
    expect(plan.kostenrahmen).toEqual(["Tablets", "Fortbildung Mediendidaktik"]);
    expect(plan.hinweise?.[0]).toMatch(/kein bezifferter Finanzplan/i);
  });

  it("erster Versuch liefert Posten → keine Wiederholung", async () => {
    generateJsonMock.mockResolvedValueOnce({
      value: { posten: [{ kategorie: "sachkosten", bezeichnung: "Material", betragEur: 800 }] },
      usage,
    });
    const facts: WizardFacts = { projekt: {} } as never;
    const { plan } = await generateFinanzplan(programm, facts, null, []);
    expect(generateJsonMock).toHaveBeenCalledTimes(1);
    expect(plan.posten.length).toBe(1);
  });
});

describe("buildUnbezifferterFallback", () => {
  it("nutzt Projektaktivitaeten, wenn keine Hauptposten vorliegen", () => {
    const facts = { projekt: { aktivitaeten: ["Leseclub", "Autorenlesung"] } } as never;
    const plan = buildUnbezifferterFallback(facts);
    expect(plan.unbeziffert).toBe(true);
    expect(plan.kostenrahmen).toEqual(["Kosten für: Leseclub", "Kosten für: Autorenlesung"]);
    expect(plan.posten).toEqual([]);
  });

  it("generischer Rahmen, wenn weder Hauptposten noch Aktivitaeten vorliegen", () => {
    const plan = buildUnbezifferterFallback({} as never);
    expect(plan.kostenrahmen?.length).toBe(1);
    expect(plan.kostenrahmen?.[0]).toMatch(/vor Einreichung/i);
  });

  it("haengt LLM-Hinweise an den Pflicht-Hinweis an", () => {
    const plan = buildUnbezifferterFallback({} as never, ["Förderquote 80 %"]);
    expect(plan.hinweise).toContain("Förderquote 80 %");
    expect(plan.hinweise?.[0]).toMatch(/kein bezifferter Finanzplan/i);
  });
});
