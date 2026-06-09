/**
 * Regression fuer WIZARD-INTERVIEWER-LOOP:
 * Schlaegt das Modell eine Frage vor, die einer bereits gestellten stark
 * aehnelt, darf nextStep sie NICHT erneut stellen, sondern schliesst die
 * Befragung ab (kind: "ready"). Verhindert die Schleife (dieselbe Frage bis
 * maxQuestions).
 */
import {
  nextStep,
  questionSimilarity,
  countSimilarQuestions,
} from "@/lib/wizard/interviewer";
import { generateJson } from "@/lib/wizard/llm";
import type { WizardMessage } from "@/lib/wizard/types";

jest.mock("@/lib/wizard/llm", () => ({ MODEL_FLASH: "flash", generateJson: jest.fn() }));
jest.mock("@/lib/wizard/prompts", () => ({
  INTERVIEWER_SYSTEM: "",
  buildInterviewerUserPrompt: () => "",
}));

const programm = { id: "p", name: "Test" } as never;
const usage = { promptTokens: 1, candidatesTokens: 1 };

function askedQuestions(questions: string[]): WizardMessage[] {
  return questions.map((q, i) => ({
    id: `q${i}`,
    at: "t",
    role: "ai",
    kind: "question",
    content: q,
  })) as WizardMessage[];
}

function mockModel(content: string, kind: "question" | "ready" = "question") {
  (generateJson as jest.Mock).mockResolvedValue({ value: { kind, content }, usage });
}

beforeEach(() => jest.clearAllMocks());

describe("questionSimilarity / countSimilarQuestions", () => {
  it("erkennt verbatim-Wiederholung (~1.0) und unterscheidet andere Fragen", () => {
    const q = "Was ist das konkrete Bewegungsziel der Sport-AG?";
    expect(questionSimilarity(q, q)).toBe(1);
    expect(
      questionSimilarity(q, "Wie viele Schuelerinnen nehmen voraussichtlich teil?")
    ).toBeLessThan(0.8);
  });

  it("zaehlt nur ausreichend aehnliche Vorfragen", () => {
    const prior = [
      "Was ist das konkrete Bewegungsziel der Sport-AG?",
      "Welche Altersgruppe nimmt teil?",
    ];
    expect(countSimilarQuestions(prior, "Was ist das konkrete Bewegungsziel der Sport-AG?")).toBe(1);
    expect(countSimilarQuestions(prior, "Welches Budget steht zur Verfuegung?")).toBe(0);
  });
});

describe("nextStep Anti-Wiederholungs-Guard", () => {
  it("wechselt auf 'ready', wenn die vorgeschlagene Frage eine schon gestellte wiederholt", async () => {
    const frage = "Was ist das konkrete Bewegungsziel der Sport-AG?";
    mockModel(frage, "question");
    const { step, usage: u } = await nextStep(programm, askedQuestions([frage]), {}, 1, 12, null);
    expect(step.kind).toBe("ready");
    expect(u).not.toBeNull(); // LLM wurde aufgerufen, usage wird verbucht
  });

  it("stellt eine NEUE Frage normal", async () => {
    mockModel("Welches Budget steht fuer das Projekt zur Verfuegung?", "question");
    const { step } = await nextStep(
      programm,
      askedQuestions(["Was ist das konkrete Bewegungsziel der Sport-AG?"]),
      {},
      1,
      12,
      null
    );
    expect(step.kind).toBe("question");
    if (step.kind === "question") {
      expect(step.question).toMatch(/Budget/);
    }
  });

  it("respektiert das Modell-'ready' unveraendert", async () => {
    mockModel("Wir haben genug Informationen.", "ready");
    const { step } = await nextStep(programm, askedQuestions(["irgendwas?"]), {}, 3, 12, null);
    expect(step.kind).toBe("ready");
  });

  it("erreicht die Max-Frage-Grenze ohne LLM-Call", async () => {
    const { step, usage: u } = await nextStep(programm, [], {}, 12, 12, null);
    expect(step.kind).toBe("ready");
    expect(u).toBeNull();
    expect(generateJson as jest.Mock).not.toHaveBeenCalled();
  });
});
