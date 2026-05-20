/**
 * Compliance-Stage Test-Skelett (Wave 3 Plan 05-06 Implementierung).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 3 Plan 05-06.
 *
 * Neue Stage compliance-check zwischen recheck und done (D-20 Hebel 2).
 * Silent Stage — keine GeneratingProgress-UI-Anzeige.
 * Feature-Flag PIPELINE_COMPLIANCE_STAGE (default OFF).
 */

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-v4-pro",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));

describe("Compliance-Stage Pipeline-Integration", () => {
  it.todo("Stage emittiert compliance-check-Event wenn PIPELINE_COMPLIANCE_STAGE=true");
  it.todo("Compliance-Violation triggert genau 1× Revision-Stage (Loop-Count erhoehen)");
  it.todo("2. Iteration nach Revision verhindert durch Loop-Count <= 1 (kein Endlos-Loop)");
  it.todo("Feature-Flag PIPELINE_COMPLIANCE_STAGE=false → Stage wird komplett uebersprungen, kein Event");
});
