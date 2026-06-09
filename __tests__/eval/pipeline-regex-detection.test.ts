/**
 * WIZ-02 Layer-2 Regex-Detection + False-Positive-Schutz (deterministisch, kein LLM).
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { scoreWiz02, HALLU_REGEX_PATTERNS } from "@/scripts/eval-pipeline-internals";
import type { GenerationArtefacts } from "@/lib/wizard/types";
import type { WizardFacts } from "@/lib/wizard/types";

const EMPTY_FACTS: WizardFacts = {};

describe("WIZ-02 Layer-2 Regex + False-Positive-Schutz", () => {
  it("HALLU_REGEX_PATTERNS.aktenzeichen matcht 'Az 123/2026'", () => {
    const pattern = HALLU_REGEX_PATTERNS.aktenzeichen;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    expect("Az 123/2026".match(freshPattern)).not.toBeNull();
  });

  it("HALLU_REGEX_PATTERNS.tv_l_code matcht 'TV-L E9'", () => {
    const pattern = HALLU_REGEX_PATTERNS.tv_l_code;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    expect("TV-L E9".match(freshPattern)).not.toBeNull();
  });

  it("HALLU_REGEX_PATTERNS.datum_praezise matcht '12.12.2025'", () => {
    const pattern = HALLU_REGEX_PATTERNS.datum_praezise;
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    expect("12.12.2025".match(freshPattern)).not.toBeNull();
  });

  it("False-Positive: Datum vom User selbst genannt → falsePositiveCheck='user-stated'", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Die Schulkonferenz beschloss am 15.03.2026 das Projekt.",
      sections: [],
    };
    const result = scoreWiz02(
      artefacts,
      [],
      ["Unsere Schulkonferenz war am 15.03.2026"],
      EMPTY_FACTS
    );
    const datumHit = result.layer2RegexHitsDetail.find(
      (h) => h.match.includes("15.03.2026")
    );
    expect(datumHit?.falsePositiveCheck).toBe("user-stated");
    // user-stated → kein Penalty, score bleibt 100
    expect(result.score).toBe(100);
  });

  it("False-Positive: Wert aus Facts (facts-stated) → kein Penalty", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Die Schule plant bis 12.06.2026 abzuschliessen.",
      sections: [],
    };
    const facts: WizardFacts = {
      projekt: { zeitraum: "bis 12.06.2026" },
    };
    const result = scoreWiz02(artefacts, [], [], facts);
    const datumHit = result.layer2RegexHitsDetail.find(
      (h) => h.match.includes("12.06.2026")
    );
    expect(datumHit?.falsePositiveCheck).toBe("facts-stated");
    expect(result.score).toBe(100);
  });

  it("Echter Layer-2-Treffer (weder user-stated noch facts-stated) → Penalty -10", () => {
    const artefacts: GenerationArtefacts = {
      finalText: "Das Personal wird nach TV-L E9 eingruppiert.",
      sections: [],
    };
    // kein TV-L E9 in userAnswers oder facts
    const result = scoreWiz02(artefacts, [], ["Wir haben 3 Lehrkraefte"], EMPTY_FACTS);
    const tvlHit = result.layer2RegexHitsDetail.find((h) => h.pattern === "tv_l_code");
    expect(tvlHit?.falsePositiveCheck).toBe("neither");
    expect(result.layer2RegexHits).toBeGreaterThan(0);
    // Penalty: 10 pro echter Halluzination
    expect(result.score).toBe(90);
  });
});
