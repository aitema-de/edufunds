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

/**
 * Facts ohne offene Nachfass-Luecke. Noetig seit dem Architektur-Umbau vom
 * 03.08.2026: `nextStep` laesst jeden Weg zu "ready" durch die Abschluss-Autoritaet
 * (lib/wizard/interview-abschluss.ts). Mit leeren Facts wuerde das Gate den
 * Abschluss verweigern und eine Nachfrage stellen — dieser Suite geht es aber um
 * den Anti-Wiederholungs-Guard, der hier isoliert geprueft wird. Das
 * Zusammenspiel beider Mechanismen hat einen eigenen Test unten.
 */
const FACTS_KOMPLETT = {
  schule: { name: "Testschule", schuelerzahl: 200 },
  budget: { beantragt_eur: 5000, hauptposten: ["Material"] },
};

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
      questionSimilarity(q, "Wie viele Schülerinnen nehmen voraussichtlich teil?")
    ).toBeLessThan(0.8);
  });

  it("zählt nur ausreichend ähnliche Vorfragen", () => {
    const prior = [
      "Was ist das konkrete Bewegungsziel der Sport-AG?",
      "Welche Altersgruppe nimmt teil?",
    ];
    expect(countSimilarQuestions(prior, "Was ist das konkrete Bewegungsziel der Sport-AG?")).toBe(1);
    expect(countSimilarQuestions(prior, "Welches Budget steht zur Verfügung?")).toBe(0);
  });
});

describe("nextStep Anti-Wiederholungs-Guard", () => {
  it("wechselt auf 'ready', wenn die vorgeschlagene Frage eine schon gestellte wiederholt", async () => {
    const frage = "Was ist das konkrete Bewegungsziel der Sport-AG?";
    mockModel(frage, "question");
    const { step, usage: u } = await nextStep(programm, askedQuestions([frage]), FACTS_KOMPLETT, 1, 12, null);
    expect(step.kind).toBe("ready");
    expect(u).not.toBeNull(); // LLM wurde aufgerufen, usage wird verbucht
  });

  it("stellt eine NEUE Frage normal", async () => {
    mockModel("Welches Budget steht für das Projekt zur Verfügung?", "question");
    const { step } = await nextStep(
      programm,
      askedQuestions(["Was ist das konkrete Bewegungsziel der Sport-AG?"]),
      FACTS_KOMPLETT,
      1,
      12,
      null
    );
    expect(step.kind).toBe("question");
    if (step.kind === "question") {
      expect(step.question).toMatch(/Budget/);
    }
  });

  it("respektiert das Modell-'ready' unverändert", async () => {
    mockModel("Wir haben genug Informationen.", "ready");
    const { step } = await nextStep(programm, askedQuestions(["irgendwas?"]), FACTS_KOMPLETT, 3, 12, null);
    expect(step.kind).toBe("ready");
  });

  it("erreicht die Max-Frage-Grenze ohne LLM-Call", async () => {
    const { step, usage: u } = await nextStep(programm, [], {}, 12, 12, null);
    expect(step.kind).toBe("ready");
    expect(u).toBeNull();
    expect(generateJson as jest.Mock).not.toHaveBeenCalled();
  });
});

/**
 * Zusammenspiel Wiederholungs-Guard × Abschluss-Autoritaet (03.08.2026).
 *
 * Beide Mechanismen enden im selben Punkt ("das Interview soll aufhoeren"), aber
 * die Autoritaet liegt beim Regelwerk: Solange eine punktekostende Angabe fehlt
 * und Fragenbudget da ist, wird der Abschluss in eine gezielte Nachfrage
 * umgewandelt — egal, auf welchem Weg er zustande kam.
 */
describe("nextStep × Abschluss-Autorität", () => {
  const LUECKENHAFT = { schule: { name: "Testschule" } };

  it("verwandelt das Modell-'ready' in eine Nachfrage, wenn die Fördersumme fehlt", async () => {
    mockModel("Wir haben genug Informationen.", "ready");
    const { step } = await nextStep(programm, askedQuestions(["irgendwas?"]), LUECKENHAFT, 3, 12, null);
    expect(step.kind).toBe("question");
    if (step.kind === "question") expect(step.question).toMatch(/Summe/i);
  });

  it("verwandelt auch den Wiederholungs-Abbruch in eine Nachfrage", async () => {
    const frage = "Was ist das konkrete Bewegungsziel der Sport-AG?";
    mockModel(frage, "question");
    const { step } = await nextStep(programm, askedQuestions([frage]), LUECKENHAFT, 4, 12, null);
    expect(step.kind).toBe("question");
    if (step.kind === "question") expect(step.question).not.toBe(frage);
  });

  it("lässt am Fragendeckel enden, auch wenn Lücken offen sind", async () => {
    const { step, usage: u } = await nextStep(programm, [], LUECKENHAFT, 12, 12, null);
    expect(step.kind).toBe("ready");
    expect(u).toBeNull();
  });
});
