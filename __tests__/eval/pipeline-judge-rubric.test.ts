/**
 * WIZ-03 LLM-as-Judge mit Rubric (4-5 strategische Geber-Gruppen).
 * Wave 2 Plan 05-04 — lebende Tests.
 *
 * LLM-Stub via jest.mock("@/lib/wizard/llm") — kein echter API-Call in Tests.
 */
import { STUB_JUDGE_RESPONSE_OEFFENTLICH } from "./fixtures/llm-stubs";
import { scoreWiz03, RUBRICS, RUBRIC_OEFFENTLICH } from "@/scripts/eval-pipeline-internals";
import { generateJson } from "@/lib/wizard/llm";

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-v4-pro",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));

describe("WIZ-03 Judge-Rubric Score-Logik", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Schema-Check fuer Judge-JSON-Output: kriterien[], gesamt, summary vorhanden", async () => {
    (generateJson as jest.Mock).mockResolvedValue({
      value: STUB_JUDGE_RESPONSE_OEFFENTLICH,
      usage: { promptTokens: 100, candidatesTokens: 200 },
    });

    const result = await scoreWiz03(
      "Ein Foerderantrag-Text fuer Bildung.",
      "oeffentlich",
      "deepseek-chat"
    );
    expect(result.judgeResponse).not.toBeNull();
    expect(result.judgeResponse?.kriterien).toBeInstanceOf(Array);
    expect(result.judgeResponse?.gesamt).toBeDefined();
    expect(result.judgeResponse?.summary).toBeDefined();
  });

  it("Score-Berechnung gewichtet: gewichteter Mittelwert aus kriterien[].score", async () => {
    (generateJson as jest.Mock).mockResolvedValue({
      value: STUB_JUDGE_RESPONSE_OEFFENTLICH,
      usage: { promptTokens: 100, candidatesTokens: 200 },
    });

    const result = await scoreWiz03(
      "Ein Foerderantrag-Text.",
      "oeffentlich",
      "deepseek-chat"
    );

    // Berechne erwarteten gewichteten Score
    // Kriterien: 65*25 + 70*20 + 55*15 + 60*15 + 50*15 + 75*10 = 6250 / 100 = 62.5 → 63
    const expectedScore = Math.round(
      (65 * 25 + 70 * 20 + 55 * 15 + 60 * 15 + 50 * 15 + 75 * 10) / 100
    );
    expect(result.score).toBe(expectedScore);
  });

  it("Rubric-Lookup gibt korrekte Rubric fuer alle 5 Geber-Gruppen", () => {
    expect(RUBRICS["oeffentlich"].gruppe).toBe("oeffentlich");
    expect(RUBRICS["stiftung"].gruppe).toBe("stiftung");
    expect(RUBRICS["eu"].gruppe).toBe("eu");
    expect(RUBRICS["wirtschaftspreis"].gruppe).toBe("wirtschaftspreis");
    expect(RUBRICS["verband-uni"].gruppe).toBe("verband-uni");
    // Jede Rubric hat 6 Kriterien mit Gewichtungssumme 100
    for (const rubric of Object.values(RUBRICS)) {
      const summe = rubric.kriterien.reduce((s, k) => s + k.gewichtung, 0);
      expect(summe).toBe(100);
    }
  });

  it("LLM-Stub liefert STUB_JUDGE_RESPONSE_OEFFENTLICH → scoreWiz03 verwendet generateJson", async () => {
    (generateJson as jest.Mock).mockResolvedValue({
      value: STUB_JUDGE_RESPONSE_OEFFENTLICH,
      usage: { promptTokens: 150, candidatesTokens: 300 },
    });

    await scoreWiz03("Antrag-Text.", "oeffentlich", "deepseek-chat");

    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(generateJson).toHaveBeenCalledWith(
      "deepseek-chat",
      expect.stringContaining("Foerdermittel-Gutachter"),
      expect.stringContaining("oeffentlich"),
      { maxTokens: 2000 }
    );
  });
});
