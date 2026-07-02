/**
 * Regression für FP-V-2 (Pilot 19.06.): Der Readiness-Check soll Nachhaltigkeit
 * NICHT als fehlend melden, wenn die Rohantworten sie klar adressieren — auch wenn
 * die Fakten-Extraktion das Feld wirkung.nachhaltigkeit nicht befüllt hat.
 */
import { evaluateFactsReadiness } from "@/lib/wizard/facts-readiness";
import type { WizardFacts } from "@/lib/wizard/types";

// Minimal-Facts mit befüllten Pflichtfeldern, aber LEEREM wirkung.nachhaltigkeit.
const facts: WizardFacts = {
  schule: { name: "Goethe-Grundschule", typ: "Grundschule" },
  projekt: {
    titel: "Musik-AG",
    kurzbeschreibung: "Wöchentliche Musik-AG für Jahrgang 3.",
    zielgruppe: "30 Drittklässler",
    ziele: ["musikalische Förderung"],
    aktivitaeten: ["wöchentliche AG"],
  },
  wirkung: {
    erwartete_ergebnisse: ["mehr musikalische Teilhabe"],
    // nachhaltigkeit ABSICHTLICH leer (Extraktion verfehlt)
  },
  budget: { hauptposten: ["Honorar"] },
} as WizardFacts;

function nachhaltigkeitGeflaggt(report: ReturnType<typeof evaluateFactsReadiness>): boolean {
  return report.issues.some((i) => i.feld === "wirkung.nachhaltigkeit");
}

it("flaggt Nachhaltigkeit, wenn sie weder in Facts noch in Antworten vorkommt", () => {
  const report = evaluateFactsReadiness(facts, null, ["Wir wollen eine Musik-AG machen."]);
  expect(nachhaltigkeitGeflaggt(report)).toBe(true);
});

it("FP-V-2: flaggt Nachhaltigkeit NICHT, wenn die Antwort sie klar adressiert", () => {
  const report = evaluateFactsReadiness(facts, null, [
    "Nach Auslaufen der Förderung führen wir die AG dauerhaft aus Eigenmitteln des Fördervereins weiter und verankern sie im Schulalltag.",
  ]);
  expect(nachhaltigkeitGeflaggt(report)).toBe(false);
});

it("ohne userAnswers bleibt das alte Verhalten (Nachhaltigkeit geflaggt)", () => {
  const report = evaluateFactsReadiness(facts, null);
  expect(nachhaltigkeitGeflaggt(report)).toBe(true);
});
