/**
 * Env-Var-Parsing fuer Pipeline-Feature-Flags in lib/wizard/config.ts.
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 1 Plan 05-03.
 *
 * 4 Feature-Flags (D-22):
 * - PIPELINE_USE_VORBILD_FORMULIERUNGEN
 * - PIPELINE_COMPLIANCE_STAGE
 * - PIPELINE_SHARP_PROMPTS
 * - PIPELINE_GEBER_ROUTING_V2
 * Alle default OFF (wenn Env-Var nicht gesetzt). Parse "true"/"1" → true, "false"/"0"/"" → false.
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

  // --- PIPELINE_CONFIG Defaults ---

  it("Default-PIPELINE_CONFIG ohne Env-Vars: alle 4 Flags = false", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PIPELINE_CONFIG } = require("@/lib/wizard/config");
    expect(PIPELINE_CONFIG.useVorbildFormulierungen).toBe(false);
    expect(PIPELINE_CONFIG.complianceStageEnabled).toBe(false);
    expect(PIPELINE_CONFIG.sharpPrompts).toBe(false);
    expect(PIPELINE_CONFIG.geberRoutingV2).toBe(false);
  });

  // --- Env-Var-Aktivierung ---

  it("PIPELINE_USE_VORBILD_FORMULIERUNGEN='1' → useVorbildFormulierungen=true", () => {
    process.env.PIPELINE_USE_VORBILD_FORMULIERUNGEN = "1";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PIPELINE_CONFIG } = require("@/lib/wizard/config");
    expect(PIPELINE_CONFIG.useVorbildFormulierungen).toBe(true);
    // Restliche Flags bleiben false
    expect(PIPELINE_CONFIG.complianceStageEnabled).toBe(false);
    expect(PIPELINE_CONFIG.sharpPrompts).toBe(false);
    expect(PIPELINE_CONFIG.geberRoutingV2).toBe(false);
  });
});
