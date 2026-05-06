/**
 * Unit-Tests fuer lib/wizard/pipeline.ts — PipelineEvent-Reihenfolge + Fehler-Schlucken
 * Phase 02.1 Plan 01 — Wave-0-Skelette (D-04, D-13)
 *
 * Beide it.todo werden in Plan 02.1-06 gruen gemacht.
 */

import { runPipeline, type PipelineEvent } from "@/lib/wizard/pipeline";

// LLM-Modul vollstaendig mocken — keine echten API-Calls in Tests
jest.mock("@/lib/wizard/llm", () => ({
  generateText: jest.fn(),
  generateJson: jest.fn(),
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
}));

describe("pipeline — PipelineEvents (D-04, D-13)", () => {
  it.todo(
    "ruft onEvent fuer jede Stage in korrekter Reihenfolge auf — D-04"
    // Plan 02.1-06 unskippt: erwartet Reihenfolge outline -> section -> critique -> revision -> recheck -> finanzplan -> consistency -> done
  );

  it.todo(
    "schluckt Fehler im onEvent-Callback ohne Pipeline-Crash — D-13"
    // Plan 02.1-06 unskippt: onEvent wirft Error, Pipeline laeuft trotzdem durch
  );
});
