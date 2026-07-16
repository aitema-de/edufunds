/**
 * #005 (Pilot 15.07.2026): Die "Warum?"-Begruendung einer Frage darf nicht (fast)
 * woertlich die der vorigen Frage wiederholen. nextStep unterdrueckt eine zu aehnliche
 * Begruendung (rationale=undefined), zeigt eine echte neue Begruendung aber an.
 */
import { nextStep } from "@/lib/wizard/interviewer";
import { generateJson } from "@/lib/wizard/llm";
import type { WizardMessage } from "@/lib/wizard/types";

jest.mock("@/lib/wizard/llm", () => ({ MODEL_FLASH: "flash", generateJson: jest.fn() }));
jest.mock("@/lib/wizard/prompts", () => ({
  INTERVIEWER_SYSTEM: "",
  buildInterviewerUserPrompt: () => "",
}));

const programm = { id: "p", name: "Test" } as never;
const usage = { promptTokens: 1, candidatesTokens: 1 };

function priorQuestion(content: string, rationale: string): WizardMessage {
  return { id: "q0", at: "t", role: "ai", kind: "question", content, meta: { rationale } } as WizardMessage;
}
function mock(content: string, rationale: string) {
  (generateJson as jest.Mock).mockResolvedValue({ value: { kind: "question", content, rationale }, usage });
}

beforeEach(() => jest.clearAllMocks());

it("unterdrueckt eine (fast) woertlich wiederholte Begruendung", async () => {
  const prev = priorQuestion(
    "Wie viele Kinder nehmen an dem Projekt teil?",
    "Damit der Antrag die Zielgruppe konkret und glaubwuerdig benennt."
  );
  // Neue, thematisch andere Frage — aber identische Begruendung.
  mock(
    "Welche konkreten Ziele verfolgt das Vorhaben?",
    "Damit der Antrag die Zielgruppe konkret und glaubwuerdig benennt."
  );
  const { step } = await nextStep(programm, [prev], {}, 1, 12, null);
  expect(step.kind).toBe("question");
  if (step.kind === "question") {
    expect(step.question).toMatch(/Ziele/);
    expect(step.rationale).toBeUndefined(); // dedupliziert
  }
});

it("behaelt eine echte neue Begruendung", async () => {
  const prev = priorQuestion(
    "Wie viele Kinder nehmen an dem Projekt teil?",
    "Damit der Antrag die Zielgruppe konkret benennt."
  );
  mock(
    "Wie soll das Angebot nach der Foerderung weiterlaufen?",
    "Stiftungen bewerten die dauerhafte Verstetigung besonders streng."
  );
  const { step } = await nextStep(programm, [prev], {}, 1, 12, null);
  expect(step.kind).toBe("question");
  if (step.kind === "question") {
    expect(step.rationale).toMatch(/Verstetigung/);
  }
});
