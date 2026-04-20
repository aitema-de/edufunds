import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  NextStep,
  NextStepQuestion,
  NextStepReady,
  WizardFacts,
  WizardMessage,
} from "./types";
import { INTERVIEWER_SYSTEM, buildInterviewerUserPrompt } from "./prompts";
import { MODEL_FLASH, generateJson } from "./gemini";

interface RawModelResponse {
  kind: "question" | "ready";
  content: string;
  rationale?: string;
  facts_update?: Partial<WizardFacts>;
}

export async function nextStep(
  programm: Foerderprogramm,
  messages: WizardMessage[],
  facts: WizardFacts,
  totalQuestions: number,
  maxQuestions: number
): Promise<NextStep> {
  if (totalQuestions >= maxQuestions) {
    return {
      kind: "ready",
      summary:
        "Maximale Fragenzahl erreicht — mit den vorhandenen Informationen wird der Antrag erstellt.",
      updatedFacts: facts,
    } satisfies NextStepReady;
  }

  const user = buildInterviewerUserPrompt(
    programm,
    messages,
    facts,
    totalQuestions,
    maxQuestions
  );
  const raw = await generateJson<RawModelResponse>(
    MODEL_FLASH,
    INTERVIEWER_SYSTEM,
    user
  );

  const merged = mergeFacts(facts, raw.facts_update);

  if (raw.kind === "ready") {
    return {
      kind: "ready",
      summary: raw.content,
      updatedFacts: merged,
    } satisfies NextStepReady;
  }

  return {
    kind: "question",
    question: raw.content,
    rationale: raw.rationale,
    updatedFacts: merged,
  } satisfies NextStepQuestion;
}

function mergeFacts(
  base: WizardFacts,
  update: Partial<WizardFacts> | undefined
): WizardFacts {
  if (!update) return base;
  const out: WizardFacts = { ...base };
  for (const [k, v] of Object.entries(update)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = { ...(base[k] as object | undefined), ...(v as object) };
    } else if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}
