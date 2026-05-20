/**
 * Env-Var-Parsing fuer Pipeline-Feature-Flags in lib/wizard/config.ts.
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 1 Plan 05-03.
 * Production-Defaults: Wave 4 Closure (Plan 05-08) — Hebel 1+3+4 ON, Hebel 2 OFF.
 *
 * 4 Feature-Flags (D-22):
 * - PIPELINE_USE_VORBILD_FORMULIERUNGEN  — Hebel 3, Default ON
 * - PIPELINE_COMPLIANCE_STAGE            — Hebel 2, Default OFF (revisit nach maxZeichen-Ausbau)
 * - PIPELINE_SHARP_PROMPTS               — Hebel 1, Default ON
 * - PIPELINE_GEBER_ROUTING_V2            — Hebel 4, Default ON
 * Parse "true"/"1" → true, "false"/"0"/"" → false.
 */

describe("Pipeline Feature-Flag Env-Var-Parsing (D-22)", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.PIPELINE_USE_VORBILD_FORMULIERUNGEN;
    delete process.env.PIPELINE_COMPLIANCE_STAGE;
    delete process.env.PIPELINE_SHARP_PROMPTS;
    delete process.env.PIPELINE_GEBER_ROUTING_V2;
    jest.resetModules();
  });

  afterAll(() => {
    // process.env-Zuweisung per spread (nur eigene Schluessel zuruecksetzen)
    Object.keys(process.env).forEach((key) => {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  // --- parseEnvBool ---

  it("parseEnvBool: 'true' → true", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("true")).toBe(true);
  });

  it("parseEnvBool: '1' → true", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("1")).toBe(true);
  });

  it("parseEnvBool: 'TRUE' → true (case-insensitive)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("TRUE")).toBe(true);
  });

  it("parseEnvBool: 'false' → false", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("false")).toBe(false);
  });

  it("parseEnvBool: '0' → false", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("0")).toBe(false);
  });

  it("parseEnvBool: '' (leerer String) → false", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool("")).toBe(false);
  });

  it("parseEnvBool: undefined → false (default)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseEnvBool } = require("@/lib/wizard/config");
    expect(parseEnvBool(undefined)).toBe(false);
  });

  // --- PIPELINE_CONFIG Defaults (Wave 4 Closure: Hebel 1+3+4 ON, Hebel 2 OFF) ---

  it("Default-PIPELINE_CONFIG ohne Env-Vars: Hebel 1+3+4 = true, Hebel 2 = false", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PIPELINE_CONFIG } = require("@/lib/wizard/config");
    expect(PIPELINE_CONFIG.sharpPrompts).toBe(true);                  // Hebel 1 ON
    expect(PIPELINE_CONFIG.complianceStageEnabled).toBe(false);       // Hebel 2 OFF
    expect(PIPELINE_CONFIG.useVorbildFormulierungen).toBe(true);      // Hebel 3 ON
    expect(PIPELINE_CONFIG.geberRoutingV2).toBe(true);                // Hebel 4 ON
  });

  // --- Env-Var-Abschaltung (Override auf false) ---

  it("PIPELINE_COMPLIANCE_STAGE='1' → complianceStageEnabled=true (opt-in moeglich)", () => {
    process.env.PIPELINE_COMPLIANCE_STAGE = "1";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PIPELINE_CONFIG } = require("@/lib/wizard/config");
    expect(PIPELINE_CONFIG.complianceStageEnabled).toBe(true);
    // Restliche Flags bleiben an Default (true fuer 1+3+4)
    expect(PIPELINE_CONFIG.sharpPrompts).toBe(true);
    expect(PIPELINE_CONFIG.useVorbildFormulierungen).toBe(true);
    expect(PIPELINE_CONFIG.geberRoutingV2).toBe(true);
  });

  it("PIPELINE_SHARP_PROMPTS='0' → sharpPrompts=false (abschaltbar)", () => {
    process.env.PIPELINE_SHARP_PROMPTS = "0";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PIPELINE_CONFIG } = require("@/lib/wizard/config");
    expect(PIPELINE_CONFIG.sharpPrompts).toBe(false);
    // Restliche bleiben Default
    expect(PIPELINE_CONFIG.complianceStageEnabled).toBe(false);
    expect(PIPELINE_CONFIG.useVorbildFormulierungen).toBe(true);
    expect(PIPELINE_CONFIG.geberRoutingV2).toBe(true);
  });
});
