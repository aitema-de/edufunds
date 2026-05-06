import type { PipelineStage } from "./types";

/**
 * Deutschsprachige Labels fuer Pipeline-Stages.
 * Single Source of Truth (W15) — wird von WizardShell und GeneratingProgress importiert.
 */
export const STAGE_LABELS: Record<PipelineStage, string> = {
  outline: "Gliederung",
  section: "Abschnitte",
  critique: "Gutachten",
  revision: "Finale Fassung",
  recheck: "Recheck",
  finanzplan: "Finanzplan",
  consistency: "Konsistenz",
  done: "Fertig",
};
