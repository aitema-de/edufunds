/**
 * WIZ-02 Layer-1 Marker-Detection (deterministisch, kein LLM).
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { scoreWiz02 } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { WizardFacts } from "@/lib/wizard/types";

const EMPTY_FACTS: WizardFacts = {};

describe("WIZ-02 Layer-1 Marker-Detection", () => {
  it("positiver Hit: forbidden_marker 'Az 123/2026' im finalText gefunden → layer1MarkerHits=1", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Wir beantragen unter Az 123/2026 Foerderung fuer unser Projekt.",
      sections: [],
    };
    const result = scoreWiz02(
      artefacts,
      [{ marker: "Az 123/2026", description: "erfundenes Aktenzeichen" }],
      [],
      EMPTY_FACTS
    );
    expect(result.layer1MarkerHits).toBe(1);
    expect(result.layer1MarkerExpected).toBe(1);
  });

  it("Multi-Source-Haystack: Marker nur in sections[0].text, nicht in finalText → trotzdem gefunden", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Allgemeiner Text ohne Marker.",
      sections: [
        { name: "Bedarfsanalyse", text: "Gemaess TV-L E9 Eingruppierung des Personals." },
      ],
    };
    const result = scoreWiz02(
      artefacts,
      [{ marker: "TV-L E9", description: "TV-L-Code in Section" }],
      [],
      EMPTY_FACTS
    );
    expect(result.layer1MarkerHits).toBe(1);
  });

  it("Marker in finanzplan-Begruendung → Hit (multi-source haystack)", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Normaler Antragstext.",
      sections: [],
      finanzplan: {
        posten: [
          {
            id: "p1",
            kategorie: "personal",
            bezeichnung: "Lehrkraft",
            betragEur: 5000,
            begruendung: "Honorar nach MDM-Loesung gemaess Rahmenvertrag",
          },
        ],
        generiertAm: new Date().toISOString(),
      },
    };
    const result = scoreWiz02(
      artefacts,
      [{ marker: "MDM-Loesung", description: "MDM-Loesung ist erfunden" }],
      [],
      EMPTY_FACTS
    );
    expect(result.layer1MarkerHits).toBe(1);
  });

  it("case-insensitive Match: Marker 'TV-L E9' matcht 'tv-l e9' im Output", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Das Personal wird nach tv-l e9 entlohnt.",
      sections: [],
    };
    const result = scoreWiz02(
      artefacts,
      [{ marker: "TV-L E9", description: "case-insensitive test" }],
      [],
      EMPTY_FACTS
    );
    expect(result.layer1MarkerHits).toBe(1);
  });

  it("expected_forbidden_markers=[] → score=100 (kein Marker, volle Punktzahl)", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Guter Antragstext ohne Halluzinationen.",
      sections: [],
    };
    const result = scoreWiz02(artefacts, [], [], EMPTY_FACTS);
    expect(result.score).toBe(100);
    expect(result.layer1MarkerHits).toBe(0);
    expect(result.layer1MarkerExpected).toBe(0);
  });
});
