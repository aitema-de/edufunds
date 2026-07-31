/**
 * Die zwei Pre-Flight-Regeln, die aus der Gutachter-Messung vom 30.07.2026 kommen
 * (scripts/eval-gutachter.ts, n=25, zwei unabhaengige Judge-Modelle):
 *
 *   - fehlende beantragte Foerdersumme  -> Finanzplan war mit 2,42 von 5 das
 *     schwaechste Kriterium ueberhaupt (39 von 50 Urteilen mit Note <= 3),
 *     Standardsatz der Judges: "keinerlei konkrete Zahlen ... nicht pruefbar".
 *   - fehlende Schuelerzahl -> Bedarf 3,38 von 5, Standardsatz: "plausibel
 *     behauptet, aber nicht mit konkreten Zahlen belegt".
 *
 * Beides kann die Pipeline nicht selbst erzeugen, ohne zu halluzinieren. Der
 * einzige richtige Ort ist der Pre-Flight-Check, solange der Nutzer noch
 * nachliefern kann.
 */
import { evaluateFactsReadiness } from "@/lib/wizard/facts-readiness";
import type { WizardFacts } from "@/lib/wizard/types";

function basisFacts(overrides: Partial<WizardFacts> = {}): WizardFacts {
  return {
    schule: { name: "Goethe-Grundschule", typ: "Grundschule", schuelerzahl: 312 },
    projekt: {
      titel: "Musik-AG",
      kurzbeschreibung: "Wöchentliche Musik-AG für Jahrgang 3.",
      zielgruppe: "30 Drittklässler",
      ziele: ["musikalische Förderung"],
      aktivitaeten: ["wöchentliche AG"],
      zeitraum: "Schuljahr 2026/27",
    },
    wirkung: {
      erwartete_ergebnisse: ["mehr musikalische Teilhabe"],
      messbare_indikatoren: ["30 Teilnehmende, 36 AG-Termine"],
      nachhaltigkeit: "Fortführung aus dem Förderverein",
    },
    budget: { hauptposten: ["Honorar"], beantragt_eur: 4800 },
    ...overrides,
  } as WizardFacts;
}

const feldern = (r: ReturnType<typeof evaluateFactsReadiness>) => r.issues.map((i) => i.feld);

describe("Readiness: beantragte Fördersumme", () => {
  it("meldet die fehlende Summe", () => {
    const r = evaluateFactsReadiness(basisFacts({ budget: { hauptposten: ["Honorar"] } }));
    expect(feldern(r)).toContain("budget.beantragt_eur");
  });

  it("nennt in der Begründung die Folge für die Bewertung", () => {
    const r = evaluateFactsReadiness(basisFacts({ budget: { hauptposten: ["Honorar"] } }));
    const issue = r.issues.find((i) => i.feld === "budget.beantragt_eur");
    expect(issue?.hinweis).toMatch(/pr(ü|ue)fbar/i);
  });

  it("schweigt, wenn eine Summe vorliegt", () => {
    const r = evaluateFactsReadiness(basisFacts());
    expect(feldern(r)).not.toContain("budget.beantragt_eur");
  });

  it("wertet 0 EUR und Unsinn wie 'fehlt' — eine Null ist keine Kalkulation", () => {
    for (const wert of [0, -100, Number.NaN]) {
      const r = evaluateFactsReadiness(
        basisFacts({ budget: { hauptposten: ["Honorar"], beantragt_eur: wert } })
      );
      expect(feldern(r)).toContain("budget.beantragt_eur");
    }
  });
});

describe("Readiness: Schülerzahl", () => {
  it("meldet die fehlende Schülerzahl", () => {
    const r = evaluateFactsReadiness(basisFacts({ schule: { name: "X", typ: "Grundschule" } }));
    expect(feldern(r)).toContain("schule.schuelerzahl");
  });

  it("schweigt, wenn eine Schülerzahl vorliegt", () => {
    const r = evaluateFactsReadiness(basisFacts());
    expect(feldern(r)).not.toContain("schule.schuelerzahl");
  });
});

describe("Readiness: Gesamtstatus bleibt benutzbar", () => {
  it("vollstaendige Angaben ergeben Status ok", () => {
    expect(evaluateFactsReadiness(basisFacts()).status).toBe("ok");
  });

  it("die neuen Regeln allein kippen die Sitzung nicht auf kritisch", () => {
    // Nur die beiden neuen Luecken -> "hinweise", nicht "kritisch". Die Ampel soll
    // informieren, nicht blockieren (bewusste Produktentscheidung).
    const r = evaluateFactsReadiness(
      basisFacts({
        schule: { name: "X", typ: "Grundschule" },
        budget: { hauptposten: ["Honorar"] },
      })
    );
    expect(r.status).toBe("hinweise");
  });
});
