/**
 * Regression für den Befund 17.08.2026 (Lauf 2026-08-05T08-42-29): pv-001 summierte
 * 24.500 EUR Förderposten bei Programm-Minimum 50.000 EUR, und ein LLM-Hinweis
 * behauptete zugleich "im Rahmen". checkFoerdersummenRahmen gleicht die
 * Förderposten-Summe deterministisch gegen foerdersummeMin/Max des Programms ab.
 */
import { checkFoerdersummenRahmen } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten } from "@/lib/wizard/types";
import type { Foerderprogramm } from "@/lib/foerderSchema";

function foerder(betragEur: number): Finanzposten {
  return { id: "f" + betragEur, kategorie: "sachkosten", bezeichnung: "Förderposten", betragEur, eigenanteil: false };
}

function programm(span: { min?: number; max?: number }): Foerderprogramm {
  return { foerdersummeMin: span.min, foerdersummeMax: span.max } as unknown as Foerderprogramm;
}

it("flaggt eine Summe unter dem Programm-Minimum (pv-001: 24.500 bei min 50.000)", () => {
  const hinweise: string[] = [];
  checkFoerdersummenRahmen([foerder(12000), foerder(4500), foerder(6000), foerder(2000)], programm({ min: 50000, max: 500000 }), hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("24.500");
  expect(hinweise[0]).toContain("50.000");
  expect(hinweise[0]).toContain("nicht förderfähig");
});

it("flaggt eine Summe über dem Programm-Maximum", () => {
  const hinweise: string[] = [];
  checkFoerdersummenRahmen([foerder(60000)], programm({ min: 2000, max: 50000 }), hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("60.000");
  expect(hinweise[0]).toContain("50.000");
});

it("schweigt innerhalb der Spanne (Grenzen einschließlich)", () => {
  const hinweise: string[] = [];
  checkFoerdersummenRahmen([foerder(50000)], programm({ min: 50000, max: 500000 }), hinweise);
  checkFoerdersummenRahmen([foerder(500000)], programm({ min: 50000, max: 500000 }), hinweise);
  expect(hinweise).toHaveLength(0);
});

it("schweigt ohne Min/Max-Angaben und bei min/max = 0", () => {
  const hinweise: string[] = [];
  checkFoerdersummenRahmen([foerder(100)], programm({}), hinweise);
  checkFoerdersummenRahmen([foerder(100)], programm({ min: 0, max: 0 }), hinweise);
  expect(hinweise).toHaveLength(0);
});

it("schweigt bei leerer Posten-Liste (Summe 0 ist kein Rahmen-Verstoß)", () => {
  const hinweise: string[] = [];
  checkFoerdersummenRahmen([], programm({ min: 5000 }), hinweise);
  expect(hinweise).toHaveLength(0);
});
