/**
 * Bug #004 (Pilot 15.07.2026): Der KI-Konsistenz-Check ("Antrag × Finanzplan") lieferte
 * zwei sich widersprechende Befunde zur Gesamtsumme — einen faktisch falschen
 * ("12.600 EUR entsprechen 15.000 EUR") und einen korrekten (2.400 EUR fehlen).
 *
 * Fix: Der Gesamtsummen-Abgleich wird deterministisch berechnet
 * (buildBeantragtConsistencyIssue) — genau EIN, arithmetisch korrekter Befund, statt
 * LLM-Freitext-Arithmetik. Diese Tests sichern die Korrektheit + die Schwellen ab.
 */
import { buildBeantragtConsistencyIssue } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten, WizardFacts } from "@/lib/wizard/types";

function posten(bezeichnung: string, betragEur: number): Finanzposten {
  return { id: bezeichnung, kategorie: "sachkosten", bezeichnung, betragEur, eigenanteil: false };
}
function facts(beantragt_eur?: number): WizardFacts {
  return { budget: beantragt_eur != null ? { beantragt_eur } : {} } as WizardFacts;
}

it("reproduziert #004: 12.600 vs. 15.000 → EIN korrekter Unterdeckungs-Befund", () => {
  const issue = buildBeantragtConsistencyIssue(
    [posten("Tablets", 8000), posten("Material", 4600)], // 12.600
    facts(15000)
  );
  expect(issue).not.toBeNull();
  expect(issue!.art).toBe("betrag-unstimmig");
  expect(issue!.beschreibung).toContain("12.600");
  expect(issue!.beschreibung).toContain("15.000");
  expect(issue!.beschreibung).toContain("2.400"); // 15000 - 12600
  expect(issue!.beschreibung).toMatch(/fehlen/i);
  // Der zentrale Bug: NIEMALS behaupten, ungleiche Summen "entsprechen" sich.
  expect(issue!.beschreibung).not.toMatch(/entsprechen|stimmt überein|stimmen überein/i);
});

it("meldet auch Überdeckung (Posten übersteigen beantragte Summe)", () => {
  const issue = buildBeantragtConsistencyIssue([posten("Geräte", 18000)], facts(15000));
  expect(issue).not.toBeNull();
  expect(issue!.beschreibung).toMatch(/übersteig/i);
  expect(issue!.beschreibung).toContain("18.000");
  expect(issue!.beschreibung).toContain("3.000");
});

it("gibt null zurück bei stimmiger Deckung (innerhalb 10 %)", () => {
  expect(buildBeantragtConsistencyIssue([posten("A", 14500)], facts(15000))).toBeNull();
});

it("gibt null zurück ohne strukturierte beantragte Summe", () => {
  expect(buildBeantragtConsistencyIssue([posten("A", 1000)], facts(undefined))).toBeNull();
});

it("gibt null zurück ohne Posten", () => {
  expect(buildBeantragtConsistencyIssue([], facts(15000))).toBeNull();
});

it("schweigt bei kleiner absoluter Lücke trotz hoher Relativabweichung", () => {
  // 120 von 200 = 40 % relativ, aber 80 EUR absolut < 100 EUR → kein Rauschen.
  expect(buildBeantragtConsistencyIssue([posten("Mini", 120)], facts(200))).toBeNull();
});
