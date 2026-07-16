/**
 * P4-A Teil 1 — On-Demand-Passagen-Reformulierung (Pilot-Feedback 24.06.).
 * Reine Logik: Prompt-Bau, Output-Säuberung, deterministischer Gate-Backstop
 * (Marker-Erhalt + Halluzinations-Diff) und die Orchestrierung mit Retry.
 */
import {
  buildReformulierungPrompt,
  cleanVariante,
  extractMarkers,
  bewerteVariante,
  reformulatePassage,
  isReformulierDirektive,
  REFORMULIER_DIREKTIVEN,
  type ReformulierDeps,
} from "@/lib/reformulierung";
import type { WizardFacts } from "@/lib/wizard/types";

const facts: WizardFacts = {} as WizardFacts;

describe("isReformulierDirektive", () => {
  it("akzeptiert nur die drei bekannten Direktiven", () => {
    expect(isReformulierDirektive("kuerzer")).toBe(true);
    expect(isReformulierDirektive("foermlicher")).toBe(true);
    expect(isReformulierDirektive("konkreter")).toBe(true);
    expect(isReformulierDirektive("laenger")).toBe(false);
    expect(isReformulierDirektive(undefined)).toBe(false);
  });
});

describe("extractMarkers", () => {
  it("findet [Annahme: …]-Marker", () => {
    expect(extractMarkers("Text [Annahme: 20 Kinder] mehr [Annahme: 3 Gruppen].")).toEqual([
      "[Annahme: 20 Kinder]",
      "[Annahme: 3 Gruppen]",
    ]);
    expect(extractMarkers("kein Marker")).toEqual([]);
  });
});

describe("buildReformulierungPrompt", () => {
  it("enthält Passage + gewählte Instruktion + strikte Regeln", () => {
    const { system, user } = buildReformulierungPrompt("Die Passage.", "kuerzer");
    expect(user).toContain("Die Passage.");
    expect(user).toContain(REFORMULIER_DIREKTIVEN.kuerzer.instruktion);
    expect(system).toContain("WORTWÖRTLICH");
    expect(system).toContain("[Annahme:");
  });
});

describe("cleanVariante", () => {
  it("entfernt umschließende Anführungszeichen (ASCII + deutsch)", () => {
    expect(cleanVariante('"Hallo Welt"')).toBe("Hallo Welt");
    expect(cleanVariante("„Hallo Welt“")).toBe("Hallo Welt");
  });
  it("entfernt ein kurzes Meta-Vorwort", () => {
    expect(cleanVariante("Hier die Fassung:\nDer eigentliche Text.")).toBe("Der eigentliche Text.");
  });
  it("lässt normalen Text unangetastet", () => {
    expect(cleanVariante("Ein Satz mit Doppelpunkt: mittendrin bleibt.")).toBe(
      "Ein Satz mit Doppelpunkt: mittendrin bleibt."
    );
  });
});

describe("bewerteVariante (Gate-Backstop)", () => {
  const passage = "Der Verein fördert Kinder im Stadtteil mit einem wöchentlichen Angebot.";

  it("akzeptiert eine faktentreue Umformulierung", () => {
    const variante = "Kinder im Stadtteil werden vom Verein wöchentlich gefördert.";
    expect(bewerteVariante(passage, variante, facts).ok).toBe(true);
  });

  it("lehnt eine eingeführte Geldzahl ab", () => {
    const variante = "Der Verein fördert Kinder im Stadtteil mit 5.000 Euro pro Jahr.";
    const b = bewerteVariante(passage, variante, facts);
    expect(b.ok).toBe(false);
    expect(b.grund).toBe("neue_angaben");
    expect(b.eingefuehrt && b.eingefuehrt.length).toBeGreaterThan(0);
  });

  it("lehnt einen verlorenen [Annahme:]-Marker ab", () => {
    const p = "Das Projekt erreicht [Annahme: 20 Kinder] pro Woche im Stadtteil.";
    const variante = "Das Projekt erreicht wöchentlich viele Kinder im Stadtteil.";
    const b = bewerteVariante(p, variante, facts);
    expect(b.ok).toBe(false);
    expect(b.grund).toBe("marker_verloren");
  });

  it("behält einen erhaltenen Marker bei", () => {
    const p = "Das Projekt erreicht [Annahme: 20 Kinder] pro Woche.";
    const variante = "Wöchentlich erreicht das Projekt [Annahme: 20 Kinder].";
    expect(bewerteVariante(p, variante, facts).ok).toBe(true);
  });

  it("lehnt unveränderten Text ab", () => {
    expect(bewerteVariante(passage, passage, facts).grund).toBe("unveraendert");
  });

  it("lehnt leeren Text ab", () => {
    expect(bewerteVariante(passage, "   ", facts).grund).toBe("leer");
  });

  it("deckt eine Zahl über die Facts ab (nicht eingeführt)", () => {
    const p = "Das Angebot läuft im Stadtteil und stärkt die Teilhabe der Kinder.";
    const variante = "Das Angebot im Stadtteil stärkt die Teilhabe von 5.000 Euro Umfang.";
    const withFacts = { budget: "5.000 Euro" } as unknown as WizardFacts;
    // Ohne Facts eingeführt, mit passendem Fact gedeckt:
    expect(bewerteVariante(p, variante, {} as WizardFacts).ok).toBe(false);
    expect(bewerteVariante(p, variante, withFacts).ok).toBe(true);
  });
});

describe("reformulatePassage (Orchestrierung)", () => {
  const passage = "Der Verein fördert Kinder im Stadtteil mit einem wöchentlichen Angebot für alle.";

  const depsReturning = (...werte: string[]): ReformulierDeps => {
    let i = 0;
    return { generate: async () => ({ value: werte[Math.min(i++, werte.length - 1)] }) };
  };

  it("liefert eine gate-geprüfte Variante (Happy Path)", async () => {
    const deps = depsReturning("Kinder im Stadtteil werden vom Verein wöchentlich für alle gefördert.");
    const r = await reformulatePassage({ passage, direktive: "kuerzer", facts }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.variante).toContain("Stadtteil");
  });

  it("weist eine zu kurze Passage ab (ohne LLM-Call)", async () => {
    const generate = jest.fn();
    const r = await reformulatePassage({ passage: "zu kurz", direktive: "kuerzer", facts }, { generate });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("zu_kurz");
    expect(generate).not.toHaveBeenCalled();
  });

  it("retryt bei eingeführten Angaben und übernimmt den sauberen zweiten Versuch", async () => {
    const generate = jest
      .fn()
      .mockResolvedValueOnce({ value: "Der Verein fördert Kinder mit 5.000 Euro im Stadtteil für alle." })
      .mockResolvedValueOnce({ value: "Kinder im Stadtteil erhalten ein wöchentliches Vereinsangebot für alle." });
    const r = await reformulatePassage({ passage, direktive: "konkreter", facts }, { generate });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(true);
  });

  it("gibt bei hartnäckig eingeführten Angaben auf (Original behalten)", async () => {
    const deps = depsReturning(
      "Der Verein fördert Kinder mit 5.000 Euro für alle im Stadtteil weiterhin.",
      "Der Verein fördert Kinder mit 5.000 Euro erneut für alle im Stadtteil."
    );
    const r = await reformulatePassage({ passage, direktive: "konkreter", facts }, deps);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("neue_angaben");
  });

  it("retryt NICHT bei verlorenem Marker", async () => {
    const p = "Das Projekt erreicht [Annahme: 20 Kinder] pro Woche im Stadtteil zuverlässig immer.";
    const generate = jest.fn().mockResolvedValue({ value: "Das Projekt erreicht wöchentlich viele Kinder zuverlässig." });
    const r = await reformulatePassage({ passage: p, direktive: "kuerzer", facts }, { generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.grund).toBe("marker_verloren");
  });
});
