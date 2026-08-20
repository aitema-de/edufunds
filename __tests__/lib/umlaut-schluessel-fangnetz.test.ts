/**
 * Fangnetze gegen zurückkehrenden Schlüssel-Drift (18.08.2026, Commit 1187efe).
 *
 * Der Prompt ist wieder ASCII. Diese Tests sichern die zweite Verteidigungslinie:
 * Liefert das Modell trotzdem die deutsche Schreibweise, darf das Feld nicht
 * still verschwinden. Genau dieses stille Verschwinden hat zwei Tage lang jeden
 * Finanzplan um seine Begründungen gebracht, ohne einen einzigen Fehler zu werfen.
 */
import { generateFinanzplan } from "@/lib/wizard/finanzplan-generator";
import { normalisiereSchluessel } from "@/lib/wizard/facts-extractor";
import type { WizardFacts } from "@/lib/wizard/types";

const generateJsonMock = jest.fn();
jest.mock("@/lib/wizard/llm", () => {
  const actual = jest.requireActual("@/lib/wizard/llm");
  return { ...actual, generateJson: (...args: unknown[]) => generateJsonMock(...args) };
});

const programm = { id: "p", name: "Test", foerdergeberTyp: "bund" } as never;
const usage = { promptTokens: 10, candidatesTokens: 10 };
beforeEach(() => generateJsonMock.mockReset());

it("Finanzplan: eine Begründung mit Umlaut-Schlüssel geht nicht verloren", async () => {
  generateJsonMock.mockResolvedValueOnce({
    value: {
      posten: [
        {
          kategorie: "investitionen",
          bezeichnung: "Tablets",
          betragEur: 12000,
          // So hat das Modell nach dem Sweep geantwortet:
          "begründung": "30 Tablets × 400 EUR = 12.000 EUR",
        },
      ],
    },
    usage,
  });
  const facts = { schule: { name: "GS" }, projekt: {} } as unknown as WizardFacts;
  const { plan } = await generateFinanzplan(programm, facts, null, ["rund 12.000 EUR"]);
  expect(plan.posten[0].begruendung).toBe("30 Tablets × 400 EUR = 12.000 EUR");
});

describe("normalisiereSchluessel", () => {
  it("zieht die Facts-Slots auf die ASCII-Namen", () => {
    const roh = {
      schule: { name: "GS", "schülerzahl": 312 },
      projekt: { "aktivitäten": ["Leseecke", "Vorlesestunden"] },
    };
    const norm = normalisiereSchluessel(roh) as Record<string, Record<string, unknown>>;
    expect(norm.schule.schuelerzahl).toBe(312);
    expect(norm.projekt.aktivitaeten).toEqual(["Leseecke", "Vorlesestunden"]);
    expect(norm.schule["schülerzahl"]).toBeUndefined();
  });

  it("lässt alles andere unangetastet", () => {
    const roh = { schule: { name: "Grundschule Süd", typ: "Grundschule" }, budget: { beantragt_eur: 4000 } };
    expect(normalisiereSchluessel(roh)).toEqual(roh);
  });

  it("überschreibt einen gefüllten ASCII-Wert nicht mit einer leeren Umlaut-Variante", () => {
    const roh = { schule: { schuelerzahl: 312, "schülerzahl": "" } };
    const norm = normalisiereSchluessel(roh) as Record<string, Record<string, unknown>>;
    expect(norm.schule.schuelerzahl).toBe(312);
  });
});
