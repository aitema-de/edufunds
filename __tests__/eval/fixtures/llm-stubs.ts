/**
 * Deterministische LLM-Stubs fuer Wave-0-Tests (jest.mock-Targets).
 * Implementierung der konkreten Stub-Antworten: Wave 2 Plan 05-04.
 *
 * Verwendung in Tests:
 *   import { STUB_JUDGE_RESPONSE_OEFFENTLICH } from "@/tests/eval/fixtures/llm-stubs";
 *   jest.mock("@/lib/wizard/llm", ...);
 *   (generateJson as jest.Mock).mockResolvedValue({ value: STUB_JUDGE_RESPONSE_OEFFENTLICH, ... });
 */

export const STUB_JUDGE_RESPONSE_OEFFENTLICH = {
  kriterien: [],
  gesamt: 0,
  summary: "TODO Wave 2: realistische Judge-Antwort fuer Geber-Gruppe 'oeffentlich'",
};

export const STUB_JUDGE_RESPONSE_STIFTUNG = {
  kriterien: [],
  gesamt: 0,
  summary: "TODO Wave 2: realistische Judge-Antwort fuer Geber-Gruppe 'stiftung'",
};

export const STUB_JUDGE_RESPONSE_EU = {
  kriterien: [],
  gesamt: 0,
  summary: "TODO Wave 2: realistische Judge-Antwort fuer Geber-Gruppe 'eu'",
};

export const STUB_JUDGE_RESPONSE_WIRTSCHAFTSPREIS = {
  kriterien: [],
  gesamt: 0,
  summary: "TODO Wave 2: realistische Judge-Antwort fuer Geber-Gruppe 'wirtschaftspreis'",
};

export const STUB_JUDGE_RESPONSE_VERBAND_UNI = {
  kriterien: [],
  gesamt: 0,
  summary: "TODO Wave 2: realistische Judge-Antwort fuer Geber-Gruppe 'verband-uni'",
};

export const STUB_COMPLIANCE_VIOLATIONS = {
  violations: [],
  usage: { promptTokens: 0, completionTokens: 0, model: "deepseek-chat" },
};
