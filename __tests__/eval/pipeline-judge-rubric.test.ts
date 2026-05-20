/**
 * WIZ-03 LLM-as-Judge mit Rubric (4-5 strategische Geber-Gruppen).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Judge bewertet Pipeline-Output gegen Rubric pro Geber-Gruppe
 * (oeffentlich / stiftung / eu / wirtschaftspreis / verband-uni).
 * LLM-Stub via jest.mock("@/lib/wizard/llm") — kein echter API-Call in Tests.
 */

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-v4-pro",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));

describe("WIZ-03 Judge-Rubric Score-Logik", () => {
  it.todo("Schema-Check fuer Judge-JSON-Output: kriterien[], gesamt, summary vorhanden");
  it.todo("Score-Berechnung gewichtet: Mittelwert aus kriterien[].score ergibt gesamt");
  it.todo("Rubric-Lookup gibt korrekte Rubric fuer Geber-Gruppe 'oeffentlich'");
  it.todo("LLM-Stub liefert STUB_JUDGE_RESPONSE_OEFFENTLICH → Judge-Aufruf verwendet generateJson");
});
