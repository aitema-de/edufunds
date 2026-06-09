import { mergeFacts } from "@/lib/wizard/facts-extractor";
import type { WizardFacts } from "@/lib/wizard/types";

describe("mergeFacts", () => {
  it("gibt base zurueck, wenn Update undefined ist", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
    expect(mergeFacts(base, undefined)).toEqual(base);
  });

  it("merged neue Felder in bestehenden Schule-Slot, ohne Bestand zu loeschen", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
    const out = mergeFacts(base, { schule: { schuelerzahl: 312 } });
    expect(out.schule).toEqual({ name: "Borsigwalder Grundschule", schuelerzahl: 312 });
  });

  it("ignoriert leere Strings im Update — loescht keinen bestehenden Wert", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule", typ: "Grundschule" } };
    const out = mergeFacts(base, { schule: { typ: "" } });
    expect(out.schule).toEqual({ name: "Borsigwalder Grundschule", typ: "Grundschule" });
  });

  it("ignoriert null im Update", () => {
    const base: WizardFacts = { schule: { schuelerzahl: 312 } };
    const out = mergeFacts(base, { schule: { schuelerzahl: null as unknown as number } });
    expect(out.schule).toEqual({ schuelerzahl: 312 });
  });

  it("ersetzt Arrays komplett (Extractor-Output ist autoritativ)", () => {
    const base: WizardFacts = {
      projekt: { aktivitaeten: ["alte Aktivitaet"] },
    };
    const out = mergeFacts(base, {
      projekt: { aktivitaeten: ["Tablet-Anschaffung", "Lehrerfortbildung"] },
    });
    expect(out.projekt).toEqual({
      aktivitaeten: ["Tablet-Anschaffung", "Lehrerfortbildung"],
    });
  });

  it("ueberschreibt Skalare mit neuen Werten", () => {
    const base: WizardFacts = { schule: { schuelerzahl: 380 } };
    const out = mergeFacts(base, { schule: { schuelerzahl: 312 } });
    expect(out.schule).toEqual({ schuelerzahl: 312 });
  });

  it("legt neuen Top-Level-Slot an, wenn er noch nicht existiert", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
    const out = mergeFacts(base, {
      wirkung: { messbare_indikatoren: ["10 Lehrer fortgebildet"] },
    });
    expect(out.wirkung).toEqual({ messbare_indikatoren: ["10 Lehrer fortgebildet"] });
    expect(out.schule).toEqual({ name: "Borsigwalder Grundschule" });
  });

  it("UAT-Reproducer: kumuliert Schul-Profil ueber mehrere Update-Runden", () => {
    let facts: WizardFacts = {};
    // Erste Antwort: Name + Schuelerzahl
    facts = mergeFacts(facts, {
      schule: { name: "Borsigwalder Grundschule", schuelerzahl: 312 },
    });
    // Zweite Antwort: Bundesland + Besonderheiten
    facts = mergeFacts(facts, {
      schule: {
        bundesland: "Berlin",
        besonderheiten: "44 % nicht-deutsche Familiensprache, dreizuegig, Ganztag",
      },
    });
    // Dritte Antwort: Aktivitaeten
    facts = mergeFacts(facts, {
      projekt: { aktivitaeten: ["Apps im DaZ-Unterricht", "Lehrerfortbildung"] },
    });
    expect(facts.schule).toEqual({
      name: "Borsigwalder Grundschule",
      schuelerzahl: 312,
      bundesland: "Berlin",
      besonderheiten: "44 % nicht-deutsche Familiensprache, dreizuegig, Ganztag",
    });
    expect(facts.projekt).toEqual({
      aktivitaeten: ["Apps im DaZ-Unterricht", "Lehrerfortbildung"],
    });
  });

  it("ignoriert leeres Top-Level-Update-Objekt — base bleibt unveraendert", () => {
    const base: WizardFacts = { schule: { name: "Borsigwalder Grundschule" } };
    const out = mergeFacts(base, {});
    expect(out).toEqual(base);
  });
});
