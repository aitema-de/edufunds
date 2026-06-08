/**
 * Regression für QA-02 (erfundene/geschätzte Finanzplan-Beträge):
 * Posten, deren Begründung einen geschätzten Betrag eingesteht, müssen einen
 * Warn-Hinweis bekommen — der Betrag bleibt unverändert.
 */
import { flagEstimatedAmounts } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten } from "@/lib/wizard/types";

function posten(bezeichnung: string, betragEur: number, begruendung?: string): Finanzposten {
  return { id: bezeichnung, kategorie: "honorare", bezeichnung, betragEur, begruendung, eigenanteil: false };
}

it("markiert einen Posten mit geschätztem Betrag (auf Basis üblicher Tagessätze)", () => {
  const hinweise: string[] = [];
  flagEstimatedAmounts(
    [posten("Fortbildung", 4000, "Auf Basis üblicher Tagessätze von ca. 2.000 EUR geschätzt.")],
    hinweise
  );
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("Fortbildung");
  expect(hinweise[0]).toContain("geschätzt");
  expect(hinweise[0]).toContain("4.000");
});

it("markiert konkrete, belegte Beträge NICHT", () => {
  const hinweise: string[] = [];
  flagEstimatedAmounts(
    [
      posten("Tablets", 13500, "30 Tablets à 450 EUR (vom Antragsteller genannt)."),
      posten("Lizenzen", 4800, "Jahreslizenz Lernsoftware, vom Antragsteller beziffert."),
    ],
    hinweise
  );
  expect(hinweise).toHaveLength(0);
});

it("ignoriert Posten ohne Begründung", () => {
  const hinweise: string[] = [];
  flagEstimatedAmounts([posten("Material", 1000)], hinweise);
  expect(hinweise).toHaveLength(0);
});

it("markiert mehrere geschätzte Posten einzeln", () => {
  const hinweise: string[] = [];
  flagEstimatedAmounts(
    [
      posten("Honorar A", 2000, "Pauschal angenommen, Satz noch einzuholen."),
      posten("Reisekosten", 800, "Üblicher Stundensatz angenommen."),
      posten("Geräte", 5000, "5 Geräte à 1.000 EUR laut Angebot."),
    ],
    hinweise
  );
  expect(hinweise).toHaveLength(2);
});
