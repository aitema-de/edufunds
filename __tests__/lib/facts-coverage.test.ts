/**
 * #005 (Pilot 15.07.2026): factsCoverageBlock listet leere vs. befuellte Themencluster,
 * damit der Interviewer die restlichen Fragen auf noch offene Bereiche lenkt (statt
 * mehrfach denselben Cluster — z. B. Nachhaltigkeit — abzufragen).
 */
import { factsCoverageBlock } from "@/lib/wizard/prompts";
import type { WizardFacts } from "@/lib/wizard/types";

it("markiert alle Cluster als offen bei leeren Facts", () => {
  const block = factsCoverageBlock({} as WizardFacts);
  expect(block).toContain("OFFENE BEREICHE");
  expect(block).toContain("Nachhaltigkeit/Verankerung");
  expect(block).toContain("Budget/Kosten");
});

it("erkennt einen befuellten Cluster als abgedeckt (Nachhaltigkeit gefuellt)", () => {
  const facts: WizardFacts = {
    schule: { name: "GS Test", schuelerzahl: 180 },
    wirkung: { nachhaltigkeit: "Die Schule uebernimmt die Betriebskosten ab 2028." },
  };
  const block = factsCoverageBlock(facts);
  // Nachhaltigkeit ist gefuellt → NICHT mehr in OFFENE BEREICHE.
  const offeneZeile = block.split("\n").find((l) => l.startsWith("OFFENE BEREICHE"))!;
  expect(offeneZeile).not.toContain("Nachhaltigkeit/Verankerung");
  // Aber Budget ist leer → offen.
  expect(offeneZeile).toContain("Budget/Kosten");
  // Abgedeckt-Zeile nennt Nachhaltigkeit + Schule.
  const abgedeckt = block.split("\n").find((l) => l.startsWith("BEREITS ABGEDECKT"))!;
  expect(abgedeckt).toContain("Nachhaltigkeit/Verankerung");
  expect(abgedeckt).toContain("Schule/Kontext");
});

it("wertet ein leeres schuelerzahl=0 nicht als befuellt", () => {
  const block = factsCoverageBlock({ budget: { beantragt_eur: 0 } } as WizardFacts);
  const offeneZeile = block.split("\n").find((l) => l.startsWith("OFFENE BEREICHE"))!;
  expect(offeneZeile).toContain("Budget/Kosten"); // 0 zaehlt nicht als Angabe
});
