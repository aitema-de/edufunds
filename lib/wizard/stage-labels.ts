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
  "compliance-check": "Compliance-Pruefung",  // silent — wird NICHT in UI angezeigt (D-20 Hebel 2)
  finanzplan: "Finanzplan",
  consistency: "Konsistenz",
  done: "Fertig",
};
