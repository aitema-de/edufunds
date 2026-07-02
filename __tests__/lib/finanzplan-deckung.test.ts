/**
 * Regression für H-GS-2b (Pilot 19.06.): Deterministischer Deckungs-Check.
 * Wenn die Summe der Förderposten deutlich von der beantragten Summe abweicht,
 * muss ein konkreter, bezifferter Hinweis abgelegt werden (kein LLM).
 */
import { checkBeantragtDeckung } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten, WizardFacts } from "@/lib/wizard/types";

function posten(bezeichnung: string, betragEur: number, eigenanteil = false): Finanzposten {
  return { id: bezeichnung, kategorie: "sachkosten", bezeichnung, betragEur, eigenanteil };
}

function factsMitBeantragt(beantragt_eur?: number): WizardFacts {
  return { budget: beantragt_eur != null ? { beantragt_eur } : {} } as WizardFacts;
}

it("H-GS-2b: meldet die konkrete Lücke (1.166 von 4.000 beantragt)", () => {
  const hinweise: string[] = [];
  checkBeantragtDeckung(
    [posten("Tablets", 670), posten("Lizenzen", 496)],
    factsMitBeantragt(4000),
    hinweise
  );
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("1.166");
  expect(hinweise[0]).toContain("4.000");
  expect(hinweise[0]).toContain("2.834"); // 4000 - 1166
  expect(hinweise[0]).toContain("fehlen");
});

it("meldet auch eine Überdeckung (Plan übersteigt beantragte Summe)", () => {
  const hinweise: string[] = [];
  checkBeantragtDeckung([posten("Geräte", 6000)], factsMitBeantragt(4000), hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("übersteigt");
  expect(hinweise[0]).toContain("6.000");
  expect(hinweise[0]).toContain("2.000");
});

it("schweigt bei stimmiger Deckung (innerhalb 10 %)", () => {
  const hinweise: string[] = [];
  checkBeantragtDeckung(
    [posten("Posten A", 2000), posten("Posten B", 1950)],
    factsMitBeantragt(4000),
    hinweise
  );
  expect(hinweise).toHaveLength(0);
});

it("ignoriert Eigenanteil-Posten in der Förder-Summe (Aufrufer filtert)", () => {
  // checkBeantragtDeckung erwartet bereits gefilterte Förderposten — der Eigenanteil
  // ist hier nicht enthalten; die Summe der übergebenen Posten zählt.
  const hinweise: string[] = [];
  checkBeantragtDeckung([posten("Förderbetrag", 3900)], factsMitBeantragt(4000), hinweise);
  expect(hinweise).toHaveLength(0); // 100 EUR Lücke = 2,5 % < 10 %
});

it("schweigt, wenn keine beantragte Summe vorliegt", () => {
  const hinweise: string[] = [];
  checkBeantragtDeckung([posten("Posten", 1000)], factsMitBeantragt(undefined), hinweise);
  expect(hinweise).toHaveLength(0);
});

it("schweigt bei kleiner absoluter Lücke trotz hoher Relativabweichung", () => {
  // 80 EUR von 200 beantragt = 60 % relativ, aber < 100 EUR absolut → kein Rauschen.
  const hinweise: string[] = [];
  checkBeantragtDeckung([posten("Mini", 120)], factsMitBeantragt(200), hinweise);
  expect(hinweise).toHaveLength(0);
});
