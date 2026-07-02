/**
 * Regression für H-V-2 (Pilot 19.06., SCHWER): Deterministischer Förderquoten-Check.
 * Überschreitet die Förderung die zulässige Höchstquote der Richtlinie (z. B. 100 %
 * bei max 80 %), muss ein konkreter Hinweis mit fehlendem Mindest-Eigenanteil entstehen.
 */
import { checkFoerderquote } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

function foerder(betragEur: number): Finanzposten {
  return { id: "f" + betragEur, kategorie: "sachkosten", bezeichnung: "Förderposten", betragEur, eigenanteil: false };
}
function eigen(betragEur: number): Finanzposten {
  return { id: "e" + betragEur, kategorie: "sonstiges", bezeichnung: "Eigenanteil", betragEur, eigenanteil: true };
}

const rlMax80 = {
  foerderhoehe: { maxProzentGesamtkosten: 80 },
  eigenmittel: { pflicht: true, mindestProzent: 20 },
} as unknown as Richtlinie;

const rlEigen20OhneMaxProzent = {
  foerderhoehe: {},
  eigenmittel: { pflicht: true, mindestProzent: 20 },
} as unknown as Richtlinie;

it("H-V-2: flaggt 100 % Förderung bei max 80 % (6.000 € → Eigenanteil 1.500 € fehlt)", () => {
  const hinweise: string[] = [];
  checkFoerderquote([foerder(6000)], [], rlMax80, hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("6.000");
  expect(hinweise[0]).toContain("100 %");
  expect(hinweise[0]).toContain("80 %");
  expect(hinweise[0]).toContain("1.500"); // fehlender Eigenanteil
  expect(hinweise[0]).toContain("7.500"); // korrekte Gesamtkosten
});

it("leitet die Höchstquote aus dem Pflicht-Eigenanteil ab, wenn maxProzent fehlt", () => {
  const hinweise: string[] = [];
  checkFoerderquote([foerder(6000)], [], rlEigen20OhneMaxProzent, hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("80 %");
});

it("schweigt, wenn der Eigenanteil die Quote bereits erfüllt (6.000 + 1.500)", () => {
  const hinweise: string[] = [];
  checkFoerderquote([foerder(6000)], [eigen(1500)], rlMax80, hinweise);
  expect(hinweise).toHaveLength(0);
});

it("meldet einen ZU NIEDRIGEN Eigenanteil mit der konkreten Lücke", () => {
  // 6.000 Förderung + 500 Eigen = 6.500 → Quote 92 % > 80 %. Nötig: 1.500 Eigen, fehlen 1.000.
  const hinweise: string[] = [];
  checkFoerderquote([foerder(6000)], [eigen(500)], rlMax80, hinweise);
  expect(hinweise).toHaveLength(1);
  expect(hinweise[0]).toContain("1.000");
});

it("schweigt ohne Richtlinie oder ohne Quoten-Vorgabe", () => {
  const hinweise: string[] = [];
  checkFoerderquote([foerder(6000)], [], null, hinweise);
  checkFoerderquote([foerder(6000)], [], { foerderhoehe: {}, eigenmittel: { pflicht: false } } as unknown as Richtlinie, hinweise);
  expect(hinweise).toHaveLength(0);
});
