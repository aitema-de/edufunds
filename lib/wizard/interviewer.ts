import type { Foerderprogramm } from "@/lib/foerderSchema";
import type {
  NextStep,
  NextStepQuestion,
  NextStepReady,
  WizardFacts,
  WizardMessage,
} from "./types";
import { INTERVIEWER_SYSTEM, buildInterviewerUserPrompt } from "./prompts";
import { MODEL_FLASH, generateJson } from "./llm";
import type { Usage } from "./pricing";
import type { Richtlinie } from "./richtlinien-schema";

interface RawModelResponse {
  kind: "question" | "ready";
  content: string;
  rationale?: string;
  facts_update?: Partial<WizardFacts>;
}

export interface NextStepWithUsage {
  step: NextStep;
  /** null, wenn die Entscheidung ohne LLM-Call fiel (z. B. Max-Cap erreicht). */
  usage: { model: string; usage: Usage } | null;
}

export async function nextStep(
  programm: Foerderprogramm,
  messages: WizardMessage[],
  facts: WizardFacts,
  totalQuestions: number,
  maxQuestions: number,
  richtlinie?: Richtlinie | null
): Promise<NextStepWithUsage> {
  if (totalQuestions >= maxQuestions) {
    const step: NextStepReady = {
      kind: "ready",
      summary:
        "Maximale Fragenzahl erreicht — mit den vorhandenen Informationen wird der Antrag erstellt.",
      updatedFacts: facts,
    };
    return { step, usage: null };
  }

  const user = buildInterviewerUserPrompt(
    programm,
    messages,
    facts,
    totalQuestions,
    maxQuestions,
    richtlinie
  );
  const { value: raw, usage } = await generateJson<RawModelResponse>(
    MODEL_FLASH,
    INTERVIEWER_SYSTEM,
    user
  );

  const merged = mergeFacts(facts, raw.facts_update);

  const step: NextStep =
    raw.kind === "ready"
      ? ({ kind: "ready", summary: raw.content, updatedFacts: merged } satisfies NextStepReady)
      : ({
          kind: "question",
          question: raw.content,
          rationale: raw.rationale,
          updatedFacts: merged,
        } satisfies NextStepQuestion);

  return { step, usage: { model: MODEL_FLASH, usage } };
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
