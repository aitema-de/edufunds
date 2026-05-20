/**
 * WIZ-01 Score-Logik: FK-Match auf antragsstruktur.abschnitte[].name
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { scoreWiz01, normalizeAbschnittName } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

function makeRichtlinie(abschnitte: Array<{ id: string; name: string; pflicht: boolean; maxZeichen?: number }>): Richtlinie {
  return {
    programmId: "test",
    programmName: "Test",
    foerdergeberTyp: "bund",
    antragsstruktur: {
      abschnitte,
      einreichungsweg: "online",
    },
    foerderhoehe: { minEur: 0, maxEur: 50000 },
    eigenmittel: { pflicht: false },
    kumulierung: { erlaubt: true },
    kostenpositionen: [],
    laufzeit: {},
    zielgruppen: [],
    themen: [],
    foerdergebiete: [],
  } as unknown as Richtlinie;
}

function makeArtefacts(sectionNames: string[]): GenerationArtefacts {
  return {
    sections: sectionNames.map((name) => ({ name, text: `Inhalt von ${name}` })),
  };
}

describe("WIZ-01 FK-Match Score-Logik", () => {
  it("alle Pflicht-Abschnitte aus Dossier vorhanden → coveragePercent=100", () => {
    const richtlinie = makeRichtlinie([
      { id: "abs-1", name: "Projektbeschreibung", pflicht: true },
      { id: "abs-2", name: "Zielgruppe", pflicht: true },
      { id: "abs-3", name: "Finanzplan", pflicht: true },
    ]);
    const artefacts = makeArtefacts(["Projektbeschreibung", "Zielgruppe", "Finanzplan"]);
    const result = scoreWiz01(artefacts, richtlinie);
    expect(result.coveragePercent).toBe(100);
    expect(result.pflichtAbschnitteTotal).toBe(3);
    expect(result.pflichtAbschnitteCovered).toBe(3);
    expect(result.missingAbschnitte).toHaveLength(0);
  });

  it("3/5 Pflicht-Abschnitte vorhanden → coveragePercent=60", () => {
    const richtlinie = makeRichtlinie([
      { id: "abs-1", name: "Projektbeschreibung", pflicht: true },
      { id: "abs-2", name: "Zielgruppe", pflicht: true },
      { id: "abs-3", name: "Methodik", pflicht: true },
      { id: "abs-4", name: "Nachhaltigkeit", pflicht: true },
      { id: "abs-5", name: "Evaluation", pflicht: true },
    ]);
    const artefacts = makeArtefacts(["Projektbeschreibung", "Zielgruppe", "Methodik"]);
    const result = scoreWiz01(artefacts, richtlinie);
    expect(result.coveragePercent).toBe(60);
    expect(result.missingAbschnitte).toContain("Nachhaltigkeit");
    expect(result.missingAbschnitte).toContain("Evaluation");
  });

  it("normalizeAbschnittName(): case-insensitive + whitespace-trim", () => {
    expect(normalizeAbschnittName("  Projektbeschreibung  ")).toBe("projektbeschreibung");
    expect(normalizeAbschnittName("ZIELGRUPPE")).toBe("zielgruppe");
    expect(normalizeAbschnittName("  Bedarfs Analyse  ")).toBe("bedarfs analyse");
  });

  it("Dossier ohne antragsstruktur.abschnitte → coveragePercent=100 trivial", () => {
    const result = scoreWiz01({ sections: [] }, null);
    expect(result.coveragePercent).toBe(100);
    expect(result.pflichtAbschnitteTotal).toBe(0);
    expect(result.maxZeichenOK).toBeNull();
  });

  it("maxZeichen-Violation: Section ueber Limit zaehlt in violations[]", () => {
    const richtlinie = makeRichtlinie([
      { id: "abs-1", name: "Projektbeschreibung", pflicht: true, maxZeichen: 100 },
    ]);
    const artefacts: GenerationArtefacts = {
      sections: [{ name: "Projektbeschreibung", text: "X".repeat(200) }],
    };
    const result = scoreWiz01(artefacts, richtlinie);
    expect(result.maxZeichenOK).toBe(false);
    expect(result.maxZeichenViolations).toHaveLength(1);
    expect(result.maxZeichenViolations[0].maxZeichen).toBe(100);
    expect(result.maxZeichenViolations[0].actualZeichen).toBe(200);
  });

  it("maxZeichen nicht im Dossier → maxZeichenOK=null", () => {
    const richtlinie = makeRichtlinie([
      { id: "abs-1", name: "Projektbeschreibung", pflicht: true },
    ]);
    const artefacts = makeArtefacts(["Projektbeschreibung"]);
    const result = scoreWiz01(artefacts, richtlinie);
    expect(result.maxZeichenOK).toBeNull();
  });

  it("Pflicht=false ist nicht in Pflicht-Abschnitten", () => {
    const richtlinie = makeRichtlinie([
      { id: "abs-1", name: "Pflichtabschnitt", pflicht: true },
      { id: "abs-2", name: "Optionaler Abschnitt", pflicht: false },
    ]);
    const artefacts = makeArtefacts(["Pflichtabschnitt"]);
    const result = scoreWiz01(artefacts, richtlinie);
    expect(result.coveragePercent).toBe(100);
    expect(result.pflichtAbschnitteTotal).toBe(1);
  });
});
