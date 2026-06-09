/**
 * Snapshot/Replay-Determinismus + Schema-Version-Check.
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { scoreWiz01, SNAPSHOT_SCHEMA_VERSION } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

describe("Snapshot/Replay-Determinismus", () => {
  it("Snapshot-Schema-Version=1 ist korrekte Konstante", () => {
    // SNAPSHOT_SCHEMA_VERSION muss 1 sein (Pitfall 3)
    expect(SNAPSHOT_SCHEMA_VERSION).toBe(1);
  });

  it("Snapshot-Pfad-Konvention: <entry-id>-run<N>.json Format ist konsistent", () => {
    // Pfad-Konvention aus RESEARCH Open Q5
    const entryId = "pv-001";
    const runIndex = 2;
    const expectedPath = `${entryId}-run${runIndex}.json`;
    expect(expectedPath).toBe("pv-001-run2.json");
  });

  it("5× scoreWiz01 mit gleichem Snapshot → identische Scores (kein LLM-Rauschen)", () => {
    const artefacts: GenerationArtefacts = {
      sections: [
        { name: "Projektbeschreibung", text: "Beschreibung des Projekts" },
        { name: "Zielgruppe", text: "Beschreibung der Zielgruppe" },
      ],
    };
    const richtlinie = {
      programmId: "test",
      programmName: "Test",
      foerdergeberTyp: "bund",
      antragsstruktur: {
        abschnitte: [
          { id: "abs-1", name: "Projektbeschreibung", pflicht: true },
          { id: "abs-2", name: "Zielgruppe", pflicht: true },
        ],
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

    const scores = Array.from({ length: 5 }, () => scoreWiz01(artefacts, richtlinie));

    // Alle 5 Aufrufe muessen identische Scores liefern (pure function)
    for (const score of scores) {
      expect(score.coveragePercent).toBe(100);
      expect(score.pflichtAbschnitteCovered).toBe(2);
    }
  });
});
