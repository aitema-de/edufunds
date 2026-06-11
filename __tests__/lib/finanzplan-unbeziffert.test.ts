/**
 * Probe 09.06. — Architektur-Fix Finanzplan:
 * Wenn der Nutzer KEINE Kostenbasis nennt (kein Budget, keine Geldangabe in den
 * Antworten), darf der Finanzplan KEINE erfundenen Euro-Posten enthalten, sondern
 * einen unbezifferten Kostenrahmen (Positionen ohne Betrag).
 */
import { hasUserKostenbasis, generateFinanzplan } from "@/lib/wizard/finanzplan-generator";
import type { WizardFacts } from "@/lib/wizard/types";

// LLM mocken: generateJson liefert je nach System-Prompt Kostenrahmen oder Posten.
jest.mock("@/lib/wizard/llm", () => {
  const actual = jest.requireActual("@/lib/wizard/llm");
  return {
    ...actual,
    generateJson: jest.fn(async (_model: string, system: string) => {
      if (system.includes("UNBEZIFFERTEN Kostenrahmen")) {
        return {
          value: {
            kostenrahmen: [
              "Anschaffung von Tablets fuer den Klasseneinsatz",
              "Honorar fuer eine externe Fortbildung zur Mediendidaktik",
            ],
            hinweise: ["Konkrete Betraege werden ueber Angebote vor Einreichung ermittelt."],
          },
          usage: { promptTokens: 10, candidatesTokens: 10 },
        };
      }
      return {
        value: { posten: [{ kategorie: "investitionen", bezeichnung: "X", betragEur: 1000 }] },
        usage: { promptTokens: 10, candidatesTokens: 10 },
      };
    }),
  };
});

const programm = { id: "p", name: "Test", foerdergeberTyp: "bund" } as never;

describe("hasUserKostenbasis", () => {
  it("false bei spaerlichem Input ohne Geldangabe", () => {
    const facts: WizardFacts = { schule: { name: "GS", typ: "Grundschule" }, projekt: {} } as never;
    expect(hasUserKostenbasis(facts, ["So ungefaehr 200 Kinder", "20 Tablets vielleicht"])).toBe(false);
  });
  it("true wenn Budget in den Facts steht", () => {
    const facts = { budget: { beantragt_eur: 15000 } } as never;
    expect(hasUserKostenbasis(facts, [])).toBe(true);
  });
  it("true wenn eine Antwort einen Euro-Betrag nennt", () => {
    const facts = {} as never;
    expect(hasUserKostenbasis(facts, ["wir haetten so 10.000 Euro Eigenanteil"])).toBe(true);
    expect(hasUserKostenbasis(facts, ["ca. 500 € pro Geraet"])).toBe(true);
  });
  it("Mengen ohne Euro zaehlen NICHT als Kostenbasis", () => {
    const facts = {} as never;
    expect(hasUserKostenbasis(facts, ["200 Kinder, 15 Lehrkraefte, 8 Klassen"])).toBe(false);
  });
});

// Produktvision 2026-06-10: Der Assistent erstellt IMMER einen bezifferten Plan.
// Ohne Nutzer-Kostenbasis werden die Beträge als bestätigbare Vorschläge MARKIERT
// (istVorschlag), nicht gelöscht/unbeziffert gelassen.
describe("generateFinanzplan Vorschlags-Routing", () => {
  it("ohne Kostenbasis: bezifferte Posten, alle als Vorschlag markiert + Hinweis", async () => {
    const facts = { schule: { name: "GS", typ: "Grundschule" }, projekt: {} } as never;
    const { plan } = await generateFinanzplan(programm, facts, null, ["200 Kinder", "20 Tablets ungefaehr"]);
    expect(plan.unbeziffert).toBeUndefined();
    expect(plan.posten.length).toBeGreaterThan(0);
    expect(plan.posten.every((p) => p.istVorschlag)).toBe(true);
    expect(plan.hinweise?.some((h) => /Vorschl[aä]ge des Assistenten/.test(h))).toBe(true);
  });

  it("mit Kostenbasis: bezifferte Posten ohne Schätz-Begründung NICHT als Vorschlag", async () => {
    const facts = { budget: { beantragt_eur: 15000 } } as never;
    const { plan } = await generateFinanzplan(programm, facts, null, ["15.000 Euro beantragt"]);
    expect(plan.unbeziffert).toBeUndefined();
    expect(plan.posten.length).toBeGreaterThan(0);
    // Mock-Posten hat keine "Schaetzung:"-Begründung → am Input verankert → kein Vorschlag.
    expect(plan.posten.some((p) => !p.eigenanteil && p.istVorschlag)).toBe(false);
  });
});
