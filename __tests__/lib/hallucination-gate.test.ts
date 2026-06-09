/**
 * Probe 09.06. — Hebel 1: Halluzinations-Diff-Gate.
 * Die Revisions-Stufe darf keine neuen, durch keine Quelle gedeckten Zahlen oder
 * Eigennamen einfuehren. Das Gate diffed die revidierte Fassung gegen Entwurf +
 * Facts + User-Antworten und entschaerft die Treffer — uebernommen aber nur bei
 * deterministisch nachgewiesener Verbesserung.
 */
import {
  buildAllowedCorpus,
  detectIntroduced,
  repairIntroduced,
} from "@/lib/wizard/hallucination-gate";
import type { WizardFacts } from "@/lib/wizard/types";

describe("buildAllowedCorpus", () => {
  it("vereint Entwurf, Facts-Blattwerte und User-Antworten", () => {
    const facts: WizardFacts = {
      schule: { name: "Astrid-Lindgren-Grundschule", schuelerzahl: 240 },
      projekt: { titel: "Leseclub", ziele: ["mehr Lesefreude"] },
    };
    const corpus = buildAllowedCorpus("Entwurfstext", facts, ["wir haben 20 Tablets"]);
    expect(corpus).toContain("Entwurfstext");
    expect(corpus).toContain("Astrid-Lindgren-Grundschule");
    expect(corpus).toContain("240");
    expect(corpus).toContain("Leseclub");
    expect(corpus).toContain("20 Tablets");
  });
});

describe("detectIntroduced — Zahlen", () => {
  it("flaggt einen erfundenen Euro-Betrag, der nirgends in der Quelle steht", () => {
    const corpus = "Wir wollen Tablets anschaffen und einen Leseclub gruenden.";
    const text = "Die Anschaffung kostet 8.000 EUR und wird beantragt.";
    const res = detectIntroduced(text, corpus);
    expect(res.numbers.some((n) => n.includes("8.000"))).toBe(true);
  });

  it("flaggt KEINEN Betrag, der im Entwurf/Quelle gedeckt ist (auch andere Schreibweise)", () => {
    const corpus = "Der Eigenanteil betraegt 8000 Euro.";
    const text = "Wir bringen 8.000 EUR Eigenanteil ein."; // gleiche Zahl, Tausenderpunkt
    const res = detectIntroduced(text, corpus);
    expect(res.numbers).toHaveLength(0);
  });

  it("ignoriert kleine bare Zahlen (Ordnungszahlen, wenige Wochen)", () => {
    const corpus = "Ein Projekt.";
    const text = "In 3 Schritten ueber 2 Wochen mit 4 Zielen.";
    const res = detectIntroduced(text, corpus);
    expect(res.numbers).toHaveLength(0);
  });

  it("flaggt eine erfundene Prozentzahl unabhaengig von der Groesse", () => {
    const corpus = "Ein Projekt ohne Quoten.";
    const text = "Die Beteiligung steigt um 5 %.";
    const res = detectIntroduced(text, corpus);
    expect(res.numbers.some((n) => n.includes("5"))).toBe(true);
  });

  it("flaggt eine erfundene groessere Stueckzahl (>= Schwelle)", () => {
    const corpus = "Wir haben eine Grundschule.";
    const text = "Insgesamt nehmen 25 Schueler teil.";
    const res = detectIntroduced(text, corpus);
    expect(res.numbers.some((n) => n.includes("25"))).toBe(true);
  });
});

describe("detectIntroduced — Eigennamen", () => {
  it("flaggt einen erfundenen Verein mit Rechtsform e.V.", () => {
    const corpus = "Wir kooperieren mit der oertlichen Stadtbuecherei.";
    const text = "In Kooperation mit dem Verein KinderZukunft e.V. setzen wir das um.";
    const res = detectIntroduced(text, corpus);
    // Sowohl der CamelCase-Name als auch die Rechtsform-Phrase sind starke Signale.
    expect(res.entities.length).toBeGreaterThan(0);
    expect(res.entities.join(" ")).toMatch(/KinderZukunft/);
  });

  it("flaggt KEINEN Partner, den der Nutzer selbst genannt hat", () => {
    const corpus = "Wir arbeiten mit der Bildungsbande e.V. zusammen.";
    const text = "Die Bildungsbande e.V. unterstuetzt das Vorhaben.";
    const res = detectIntroduced(text, corpus);
    expect(res.entities).toHaveLength(0);
  });

  it("flaggt eine erfundene Kontaktperson mit Anrede", () => {
    const corpus = "Die Schulleitung traegt das Projekt.";
    const text = "Ansprechpartnerin ist Frau Dr. Sommerfeld.";
    const res = detectIntroduced(text, corpus);
    expect(res.entities.join(" ")).toMatch(/Sommerfeld/);
  });

  it("flaggt KEINE normale deutsche Grossschreibung (Substantive)", () => {
    const corpus = "x";
    const text = "Die Schule foerdert die Lesekompetenz der Kinder im Unterricht.";
    const res = detectIntroduced(text, corpus);
    expect(res.entities).toHaveLength(0);
  });
});

describe("repairIntroduced — Akzeptanz-Gate", () => {
  const corpus = "Wir wollen einen Leseclub gruenden.";
  const revised = "Der Leseclub kostet 8.000 EUR und wird von KinderZukunft e.V. begleitet.";
  const introduced = detectIntroduced(revised, corpus);

  it("uebernimmt den Repair, wenn er die Treffer strikt reduziert", async () => {
    const cleaned =
      "Der Leseclub wird in noch zu bestimmender Hoehe gefoerdert und von einer noch zu gewinnenden Partnerorganisation begleitet.";
    const res = await repairIntroduced(revised, introduced, corpus, {
      revise: async () => ({ value: cleaned, usage: { promptTokens: 1, candidatesTokens: 1 } }),
      model: "fake",
    });
    expect(res.repaired).toBe(true);
    expect(res.finalText).toBe(cleaned);
    expect(res.residual).toHaveLength(0);
    expect(res.usages).toHaveLength(1);
  });

  it("verwirft den Repair, wenn er nicht besser ist (nie verschlimmern)", async () => {
    // LLM tauscht eine Erfindung gegen eine andere — kein Fortschritt.
    const notBetter =
      "Der Leseclub kostet 9.500 EUR und wird von MedienMacher e.V. begleitet.";
    const res = await repairIntroduced(revised, introduced, corpus, {
      revise: async () => ({ value: notBetter, usage: { promptTokens: 1, candidatesTokens: 1 } }),
      model: "fake",
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(revised); // Originalrevision bleibt
  });

  it("verwirft einen Repair, der den Text massiv kuerzt (Anti-Truncation)", async () => {
    const res = await repairIntroduced(revised, introduced, corpus, {
      revise: async () => ({ value: "Leseclub.", usage: { promptTokens: 1, candidatesTokens: 1 } }),
      model: "fake",
    });
    expect(res.repaired).toBe(false);
    expect(res.finalText).toBe(revised);
  });

  it("No-op ohne LLM-Call, wenn keine Treffer vorliegen", async () => {
    const revise = jest.fn();
    const res = await repairIntroduced(
      "sauberer Text",
      { numbers: [], entities: [] },
      corpus,
      { revise, model: "fake" }
    );
    expect(revise).not.toHaveBeenCalled();
    expect(res.repaired).toBe(false);
    expect(res.usages).toHaveLength(0);
  });
});
