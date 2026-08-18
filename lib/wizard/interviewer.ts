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
import { MAX_NACHFASSEN, beurteileAbschluss } from "./interview-abschluss";

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
const QUESTION_SIMILARITY_THRESHOLD = 0.72;

/**
 * #005 (Pilot 15.07.): Ab welcher Aehnlichkeit die "Warum?"-Begruendung als
 * Wiederholung der vorigen gilt. Der Tester sah die Q3-Begruendung "fast woertlich"
 * wie die von Q2 — solche Dopplungen werden unterdrueckt (Begruendung dann weggelassen).
 * Etwas niedriger als der Fragen-Schwellwert, weil Begruendungen kuerzer und
 * formelhafter sind (hoehere Grund-Ueberlappung).
 */
const RATIONALE_SIMILARITY_THRESHOLD = 0.6;

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
  const askedQuestions = messages
    .filter((m) => m.role === "ai" && m.kind === "question")
    .map((m) => m.content);

  /**
   * Abschluss-Autoritaet (Architektur-Umbau 03.08.2026, s. interview-abschluss.ts).
   *
   * Frueher endete das Interview allein auf Zuruf des Modells. Das deterministische
   * Regelwerk in facts-readiness.ts wusste zwar, welche Angaben ein bewertbarer
   * Antrag braucht, durfte das aber nur in einer passiven Ampel anzeigen — und
   * danach war es zu spaet, die Zahl noch zu erfragen.
   *
   * Jeder Weg zu "ready" laeuft jetzt durch dieses Gate. Es hebt maxQuestions NICHT
   * an; es verschiebt nur das Ende, solange Budget da ist und eine punktekostende
   * Luecke offen steht.
   */
  const alsAbschluss = (summary: string): NextStepWithUsage => {
    const urteil = beurteileAbschluss(
      merged,
      richtlinie,
      messages.filter((m) => m.role === "user").map((m) => m.content),
      askedQuestions,
      totalQuestions,
      maxQuestions
    );
    if (urteil.darfEnden || !urteil.nachfrage) {
      const step: NextStepReady = { kind: "ready", summary, updatedFacts: merged };
      return { step, usage: { model: MODEL_FLASH, usage } };
    }
    console.log(
      `[interviewer] Abschluss verweigert — Lücke "${urteil.nachfrage.feld}" offen ` +
        `(${urteil.bereitsGefragt}/${MAX_NACHFASSEN} Nachfragen gestellt)`
    );
    const step: NextStepQuestion = {
      kind: "question",
      question: urteil.nachfrage.nachfrage,
      rationale: `Ohne ${urteil.nachfrage.label} bewerten Gutachter den Antrag an dieser Stelle als nicht prüfbar.`,
      updatedFacts: merged,
    };
    return { step, usage: { model: MODEL_FLASH, usage } };
  };

  // Anti-Wiederholungs-Guard: Schlaegt das Modell eine Frage vor, die einer
  // bereits gestellten stark aehnelt, wuerde es in eine Schleife laufen (im
  // schlimmsten Fall bis maxQuestions dieselbe Frage). Statt erneut zu fragen,
  // schliessen wir die Befragung ab — was nicht praezisiert werden konnte, wird
  // mit den vorhandenen Angaben generiert (offene Stellen sind nachher editierbar).
  if (raw.kind === "question" && countSimilarQuestions(askedQuestions, raw.content) >= 1) {
    return alsAbschluss(
      "Einige Punkte liessen sich trotz Nachfrage nicht weiter präzisieren — der Antrag wird mit den vorhandenen Angaben erstellt. Offene Stellen kannst du anschließend ergänzen."
    );
  }

  if (raw.kind === "ready") {
    return alsAbschluss(raw.content);
  }

  // #005: "Warum?"-Dopplung unterdruecken — ist die neue Begruendung nahezu identisch
  // zur Begruendung der vorigen Frage (in message.meta.rationale persistiert), lieber
  // keine Begruendung anzeigen als eine (fast) woertliche Wiederholung.
  let rationale = raw.rationale;
  if (rationale) {
    const prevRationale = [...messages]
      .reverse()
      .map((m) =>
        m.role === "ai" && m.kind === "question" && typeof m.meta?.rationale === "string"
          ? (m.meta.rationale as string)
          : undefined
      )
      .find((r): r is string => typeof r === "string" && r.trim().length > 0);
    if (prevRationale && questionSimilarity(prevRationale, rationale) >= RATIONALE_SIMILARITY_THRESHOLD) {
      rationale = undefined;
    }
  }

  const step: NextStepQuestion = {
    kind: "question",
    question: raw.content,
    rationale,
    updatedFacts: merged,
  };
  return { step, usage: { model: MODEL_FLASH, usage } };
}

