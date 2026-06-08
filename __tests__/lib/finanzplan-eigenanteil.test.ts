import { applyStatedEigenanteil } from "@/lib/wizard/finanzplan-generator";
import { validateFinanzplan } from "@/lib/wizard/finanzplan-validator";
import type { Finanzposten, Finanzplan, WizardFacts } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

/**
 * Regression fuer WIZARD-EIGENANTEIL-FLAG-MISSING:
 * Eine explizite Nutzer-Eigenmittelangabe muss als eigenanteil:true-Posten
 * im Finanzplan landen, sonst rechnet validateFinanzplan 0 % und blockiert
 * die Freigabe (HTTP 422).
 */

// Minimal-Richtlinie mit Eigenmittel-Pflicht (10 %), sonst alles erlaubt.
const richtlinie = {
  foerderhoehe: { maxEur: undefined, maxProzentGesamtkosten: undefined },
  eigenmittel: { pflicht: true, mindestProzent: 10 },
  kostenpositionen: [],
  kumulierung: { erlaubt: true },
} as unknown as Richtlinie;

function foerderPosten(): Finanzposten[] {
  // 19.800 EUR Foerderkosten, KEIN Eigenanteil markiert (so liefert das LLM oft)
  return [
    { id: "a", kategorie: "investitionen", bezeichnung: "Tablets", betragEur: 12000, eigenanteil: false },
    { id: "b", kategorie: "sachkosten", bezeichnung: "Lizenzen", betragEur: 4800, eigenanteil: false },
    { id: "c", kategorie: "honorare", bezeichnung: "Fortbildung", betragEur: 3000, eigenanteil: false },
  ];
}

const factsMit = { budget: { beantragt_eur: 19800, eigenmittel_eur: 2200 } } as WizardFacts;
const factsOhne = { budget: { beantragt_eur: 19800 } } as WizardFacts;

function plan(posten: Finanzposten[]): Finanzplan {
  return { posten, generiertAm: new Date().toISOString() };
}

describe("applyStatedEigenanteil", () => {
  it("ergaenzt einen Eigenanteil-Posten, wenn der Nutzer Eigenmittel nannte und keiner markiert ist", () => {
    const hinweise: string[] = [];
    const out = applyStatedEigenanteil(foerderPosten(), factsMit, hinweise);
    const eigen = out.filter((p) => p.eigenanteil);
    expect(eigen).toHaveLength(1);
    expect(eigen[0].betragEur).toBe(2200);
    // Foerderposten bleiben unveraendert
    expect(out.filter((p) => !p.eigenanteil).reduce((s, p) => s + p.betragEur, 0)).toBe(19800);
    expect(hinweise.join(" ")).toMatch(/Eigenanteil/);
  });

  it("macht die Freigabe moeglich (okFuerFreigabe), wo sie vorher an 0 % Eigenanteil scheiterte", () => {
    // Vorher: ohne Normalisierung -> 0 % Eigenanteil -> error -> blockiert
    const vorher = validateFinanzplan(plan(foerderPosten()), richtlinie);
    expect(vorher.okFuerFreigabe).toBe(false);
    expect(vorher.eigenanteilProzent).toBe(0);

    // Nachher: mit Normalisierung -> 2.200 / 22.000 = 10 % -> ok
    const korrigiert = applyStatedEigenanteil(foerderPosten(), factsMit, []);
    const nachher = validateFinanzplan(plan(korrigiert), richtlinie);
    expect(nachher.eigenanteilEur).toBe(2200);
    expect(nachher.gesamtEur).toBe(22000);
    expect(Math.round(nachher.eigenanteilProzent)).toBe(10);
    expect(nachher.okFuerFreigabe).toBe(true);
  });

  it("konsolidiert einen falsch bezifferten LLM-Eigenanteil auf die Nutzerangabe", () => {
    const mitFalsch = [
      ...foerderPosten(),
      { id: "x", kategorie: "sonstiges", bezeichnung: "Eigenanteil", betragEur: 1800, eigenanteil: true } as Finanzposten,
    ];
    const out = applyStatedEigenanteil(mitFalsch, factsMit, []);
    const eigen = out.filter((p) => p.eigenanteil);
    expect(eigen).toHaveLength(1);
    expect(eigen[0].betragEur).toBe(2200);
  });

  it("laesst den Plan unveraendert, wenn der Nutzer keine Eigenmittel nannte", () => {
    const inPosten = foerderPosten();
    const out = applyStatedEigenanteil(inPosten, factsOhne, []);
    expect(out).toEqual(inPosten);
  });

  it("laesst einen bereits korrekt markierten Eigenanteil in Ruhe (Toleranz)", () => {
    const mitKorrekt = [
      ...foerderPosten(),
      { id: "y", kategorie: "sonstiges", bezeichnung: "Eigenanteil", betragEur: 2200, eigenanteil: true } as Finanzposten,
    ];
    const out = applyStatedEigenanteil(mitKorrekt, factsMit, []);
    expect(out).toEqual(mitKorrekt);
  });
});
