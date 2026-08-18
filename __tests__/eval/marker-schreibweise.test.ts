/**
 * Befund 18.08.2026: Nach der Umlaut-Umstellung schreibt die Pipeline „Fördersatz",
 * der Eval-Korpus haelt den Marker aber als „Foerdersatz" (429 solcher Marker).
 * Ein exakter Teilstring-Vergleich haette diese Halluzinationen ab sofort nicht mehr
 * gefunden — WIZ-02 waere bei 100,0 geblieben und dabei blind gewesen.
 */
import { scoreWiz02, normSchreibweise } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts, WizardFacts } from "@/lib/wizard/types";

const EMPTY_FACTS = {} as WizardFacts;

function artefakteMit(text: string): GenerationArtefacts {
  return { finalText: text, sections: [] } as unknown as GenerationArtefacts;
}

describe("normSchreibweise", () => {
  it("führt Umlaut- und Ersatzschreibung auf dieselbe Form", () => {
    expect(normSchreibweise("Fördersatz")).toBe(normSchreibweise("Foerdersatz"));
    expect(normSchreibweise("Maßnahme")).toBe(normSchreibweise("Massnahme"));
    expect(normSchreibweise("PRÄZISION")).toBe(normSchreibweise("praezision"));
  });
});

describe("WIZ-02 Layer 1 — Marker über Schreibweisen hinweg", () => {
  it("ASCII-Marker findet den Umlaut-Text (der Fall, der sonst still durchginge)", () => {
    const r = scoreWiz02(
      artefakteMit("Der Fördersatz 70 EUR pro Reisetag ist gesichert."),
      [{ marker: "Foerdersatz 70 EUR pro Reisetag", description: "erfunden" }],
      [],
      EMPTY_FACTS
    );
    expect(r.layer1MarkerHits).toBe(1);
  });

  it("Umlaut-Marker findet ASCII-Text (Gegenrichtung)", () => {
    const r = scoreWiz02(
      artefakteMit("Es gilt der Foerdersatz laut Bescheid."),
      [{ marker: "Fördersatz", description: "erfunden" }],
      [],
      EMPTY_FACTS
    );
    expect(r.layer1MarkerHits).toBe(1);
  });

  it("ß und ss gelten als dieselbe Schreibweise", () => {
    const r = scoreWiz02(
      artefakteMit("Die Maßnahme wurde bewilligt."),
      [{ marker: "Massnahme wurde bewilligt", description: "erfunden" }],
      [],
      EMPTY_FACTS
    );
    expect(r.layer1MarkerHits).toBe(1);
  });

  it("was vorher nicht matchte, matcht auch jetzt nicht", () => {
    const r = scoreWiz02(
      artefakteMit("Ein völlig anderer Satz."),
      [{ marker: "Foerdersatz 70 EUR", description: "erfunden" }],
      [],
      EMPTY_FACTS
    );
    expect(r.layer1MarkerHits).toBe(0);
  });
});
