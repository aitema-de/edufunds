/**
 * P1-A (Pilot-Feedback 24.06.): Vom Nutzer ausgeschlossene Elemente dürfen nicht im Plan
 * auftauchen. Prompt-Prävention (buildAusschlussBlock) + deterministischer Backstop
 * (checkAusschlussLeak), falls das LLM doch durchrutscht.
 */
import { checkAusschlussLeak } from "@/lib/wizard/finanzplan-generator";
import { buildAusschlussBlock } from "@/lib/wizard/prompts";
import type { Finanzposten, WizardFacts } from "@/lib/wizard/types";

function posten(bezeichnung: string, begruendung?: string): Finanzposten {
  return { id: bezeichnung, kategorie: "honorare", bezeichnung, betragEur: 1000, begruendung, eigenanteil: false };
}

describe("checkAusschlussLeak", () => {
  it("flaggt einen Posten, der ein ausgeschlossenes Element betrifft", () => {
    const hinweise: string[] = [];
    const facts: WizardFacts = { ausgeschlossen: ["externe Fachkräfte"] };
    checkAusschlussLeak([posten("Externe Fachkräfte (Honorar)")], facts, hinweise);
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("Externe Fachkräfte");
    expect(hinweise[0]).toContain("ausgeschlossen");
  });

  it("schweigt, wenn kein Posten das ausgeschlossene Element trifft", () => {
    const hinweise: string[] = [];
    const facts: WizardFacts = { ausgeschlossen: ["externe Fachkräfte"] };
    checkAusschlussLeak([posten("Tablets für den Klassensatz")], facts, hinweise);
    expect(hinweise).toHaveLength(0);
  });

  it("schweigt ohne Ausschluss-Liste", () => {
    const hinweise: string[] = [];
    checkAusschlussLeak([posten("Externe Fachkräfte")], {}, hinweise);
    checkAusschlussLeak([posten("Externe Fachkräfte")], { ausgeschlossen: [] }, hinweise);
    expect(hinweise).toHaveLength(0);
  });

  it("trifft auch über die Begründung (signifikantes Leitwort)", () => {
    const hinweise: string[] = [];
    const facts: WizardFacts = { ausgeschlossen: ["Geräteanschaffung"] };
    checkAusschlussLeak([posten("Investition", "Geräteanschaffung für die Klasse")], facts, hinweise);
    expect(hinweise).toHaveLength(1);
  });
});

describe("buildAusschlussBlock", () => {
  it("baut einen harten Verbots-Block mit allen Elementen", () => {
    const block = buildAusschlussBlock({ ausgeschlossen: ["externe Fachkräfte", "neue Geräte"] });
    expect(block).toContain("DARF NICHT VORKOMMEN");
    expect(block).toContain("externe Fachkräfte");
    expect(block).toContain("neue Geräte");
  });

  it("ist leer ohne Ausschlüsse (kein Prompt-/Eval-Effekt)", () => {
    expect(buildAusschlussBlock({})).toBe("");
    expect(buildAusschlussBlock({ ausgeschlossen: [] })).toBe("");
    expect(buildAusschlussBlock({ ausgeschlossen: ["  ", ""] })).toBe("");
  });
});
