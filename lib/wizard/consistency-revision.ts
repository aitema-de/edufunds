import type { ConsistencyIssue } from "./types";
import type { Usage } from "./pricing";
import {
  CONSISTENCY_SYSTEM,
  CONSISTENCY_REVISION_SYSTEM,
  buildConsistencyPrompt,
  buildConsistencyRevisionPrompt,
} from "./prompts";

/**
 * Injizierte LLM-Funktionen — gebunden an die jeweiligen Modelle. So bleibt die
 * Revisions-Logik ohne Netzwerk deterministisch testbar.
 */
export interface ConsistencyReviseDeps {
  /** Textgenerierung (Revision). Liefert den überarbeiteten Antragstext. */
  reviseText: (system: string, user: string) => Promise<{ value: string; usage: Usage }>;
  /** Erneuter Konsistenz-Check. Liefert das rohe JSON der Issues. */
  recheck: (system: string, user: string) => Promise<{ value: unknown; usage: Usage }>;
  /** Normalisierer für die Recheck-Rohdaten (pipeline.normalizeConsistency). */
  normalize: (raw: unknown) => ConsistencyIssue[];
  /** Modell-Labels für die Usage-Buchhaltung. */
  models: { revise: string; recheck: string };
}

export interface ConsistencyReviseResult {
  /** Überarbeiteter (oder unveränderter) Antragstext. */
  finalText: string;
  /** Verbleibende Inkonsistenzen nach dem Re-Check. */
  issues: ConsistencyIssue[];
  /** LLM-Usages für die Kosten-Ledger. */
  usages: Array<{ model: string; usage: Usage }>;
  /** true, wenn tatsächlich eine Revision durchgeführt wurde. */
  revised: boolean;
}

/**
 * Gleicht den Antragstext einmalig an den Finanzplan an, wenn Inkonsistenzen
 * vorliegen (QA-01/03: zuvor wurden Inkonsistenzen nur geflaggt, nicht behoben).
 * Genau EINE Revisions-Iteration — kein Loop. Bei leerer Issue-Liste No-op
 * (kein LLM-Call).
 */
export async function reviseForConsistency(
  finalText: string,
  finanzplanJson: string,
  issues: ConsistencyIssue[],
  deps: ConsistencyReviseDeps
): Promise<ConsistencyReviseResult> {
  if (issues.length === 0) {
    return { finalText, issues, usages: [], revised: false };
  }

  const usages: Array<{ model: string; usage: Usage }> = [];

  const rev = await deps.reviseText(
    CONSISTENCY_REVISION_SYSTEM,
    buildConsistencyRevisionPrompt(finalText, finanzplanJson, issues)
  );
  usages.push({ model: deps.models.revise, usage: rev.usage });

  // Leere/whitespace-Antwort nicht übernehmen — alten Text behalten.
  const revisedText = typeof rev.value === "string" && rev.value.trim() ? rev.value : finalText;

  const re = await deps.recheck(
    CONSISTENCY_SYSTEM,
    buildConsistencyPrompt(revisedText, finanzplanJson)
  );
  usages.push({ model: deps.models.recheck, usage: re.usage });

  return {
    finalText: revisedText,
    issues: deps.normalize(re.value),
    usages,
    revised: true,
  };
}
