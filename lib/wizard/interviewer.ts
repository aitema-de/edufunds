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
import { mergeFacts } from "./facts-extractor";

interface RawModelResponse {
  kind: "question" | "ready";
  content: string;
  rationale?: string;
  /** Optionaler Fallback — die primaere Extraktion macht facts-extractor.ts. */
  facts_update?: Partial<WizardFacts>;
}

export interface NextStepWithUsage {
  step: NextStep;
  /** null, wenn die Entscheidung ohne LLM-Call fiel (z. B. Max-Cap erreicht). */
  usage: { model: string; usage: Usage } | null;
}

/**
 * Ab welcher Token-Ueberlappung (Jaccard) zwei Fragen als "dieselbe Frage"
 * gelten. Verbatim-Wiederholungen liegen bei ~1.0; echte Praezisierungs-
 * Nachfragen sind anders formuliert und liegen klar darunter.
 */
const QUESTION_SIMILARITY_THRESHOLD = 0.8;

function normalizeQuestion(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Diakritika entfernen
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Satzzeichen -> Leerzeichen
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeQuestion(s)
      .split(" ")
      .filter((w) => w.length > 2) // sehr kurze Funktionswoerter ignorieren
  );
}

/** Token-Jaccard-Aehnlichkeit zweier Fragen in [0,1]. Exportiert fuer Tests. */
export function questionSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) {
    return normalizeQuestion(a) === normalizeQuestion(b) ? 1 : 0;
  }
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Zaehlt, wie viele der bereits gestellten Fragen der Kandidatenfrage stark
 * aehneln (>= QUESTION_SIMILARITY_THRESHOLD). Exportiert fuer Tests.
 */
export function countSimilarQuestions(askedQuestions: string[], candidate: string): number {
  return askedQuestions.filter(
    (q) => questionSimilarity(q, candidate) >= QUESTION_SIMILARITY_THRESHOLD
  ).length;
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

  // Anti-Wiederholungs-Guard: Schlaegt das Modell eine Frage vor, die einer
  // bereits gestellten stark aehnelt, wuerde es in eine Schleife laufen (im
  // schlimmsten Fall bis maxQuestions dieselbe Frage). Statt erneut zu fragen,
  // schliessen wir die Befragung ab — was nicht praezisiert werden konnte, wird
  // mit den vorhandenen Angaben generiert (offene Stellen sind nachher editierbar).
  if (raw.kind === "question") {
    const askedQuestions = messages
      .filter((m) => m.role === "ai" && m.kind === "question")
      .map((m) => m.content);
    if (countSimilarQuestions(askedQuestions, raw.content) >= 1) {
      const step: NextStepReady = {
        kind: "ready",
        summary:
          "Einige Punkte liessen sich trotz Nachfrage nicht weiter praezisieren — der Antrag wird mit den vorhandenen Angaben erstellt. Offene Stellen kannst du anschliessend ergaenzen.",
        updatedFacts: merged,
      };
      return { step, usage: { model: MODEL_FLASH, usage } };
    }
  }

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

