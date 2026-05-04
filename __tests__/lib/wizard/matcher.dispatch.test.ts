/**
 * Dispatch-Tests fuer runMatch (CLARIFY vs Ranking, forceRanking, costs).
 * Phase: 02-matcher-quality, D-05/D-08/D-09.
 *
 * Mockt @/lib/wizard/llm.generateText, damit kein echter LLM-Call passiert.
 * Verifiziert die Tagged-Union (kind: "ranking" | "clarification") + costs-Konvention
 * + buildUserPrompt-Erweiterungen via Mock-Argument-Inspektion.
 */

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
  generateText: jest.fn(),
  generateJson: jest.fn(),
}));

import { generateText } from "@/lib/wizard/llm";
import { runMatch } from "@/lib/wizard/matcher";
import foerderprogrammeData from "@/data/foerderprogramme.json";
import type { Foerderprogramm } from "@/lib/foerderSchema";

const programme = foerderprogrammeData as Foerderprogramm[];
const FIRST_VALID_ID = programme[0]!.id;
const SECOND_VALID_ID = programme[1]?.id ?? FIRST_VALID_ID;

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

const baseInput = {
  anliegen:
    "Wir wollen die Schul-Bibliothek mit digitalen Medien ausstatten und brauchen einen Foerder-Tipp.",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateText.mockResolvedValue({
    value: "",
    usage: { promptTokens: 100, candidatesTokens: 50 },
  });
});

describe("runMatch — CLARIFY-Dispatch", () => {
  it("liefert kind=clarification wenn erste Zeile mit CLARIFY| beginnt — D-05/D-08", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: "CLARIFY|Fuer welches Bundesland sucht ihr?",
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("clarification");
    if (result.kind === "clarification") {
      expect(result.question).toContain("Bundesland");
    }
  });

  it("extrahiert question-Text rechts vom CLARIFY|-Praefix — D-05", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: "CLARIFY|Welcher Schwerpunkt steht im Vordergrund?",
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("clarification");
    if (result.kind === "clarification") {
      expect(result.question).toBe("Welcher Schwerpunkt steht im Vordergrund?");
      expect(result.question).not.toContain("CLARIFY|");
    }
  });

  it("liefert kind=ranking wenn erste Zeile id|score|... ist — D-08", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: `${FIRST_VALID_ID}|85|Guter Match.|Frist beachten.`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("ranking");
    if (result.kind === "ranking") {
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      expect(result.matches[0].id).toBe(FIRST_VALID_ID);
      expect(result.matches[0].passt_weil).toBe("Guter Match.");
      expect(result.matches[0].achtung_bei).toBe("Frist beachten.");
    }
  });

  it("ignoriert CLARIFY in spaeteren Zeilen (nur erste Zeile zaehlt) — D-05", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: `${FIRST_VALID_ID}|85|Match.|\nCLARIFY|spaeter`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("ranking");
  });
});

describe("runMatch — forceRanking-Override", () => {
  it("liefert kind=ranking wenn forceRanking=true, auch bei CLARIFY-LLM-Antwort — D-09", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: "CLARIFY|Trotz vager Eingabe — bitte ranken.",
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch({ ...baseInput, forceRanking: true });
    expect(result.kind).toBe("ranking");
  });

  it("forceRanking=false (default) erlaubt CLARIFY-Dispatch — D-09", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: "CLARIFY|Welches Bundesland?",
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch({ ...baseInput, forceRanking: false });
    expect(result.kind).toBe("clarification");
  });

  it("buildUserPrompt fuegt forceRanking-Hinweis-Block an wenn forceRanking=true", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: `${FIRST_VALID_ID}|85|Match.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    await runMatch({ ...baseInput, forceRanking: true });
    expect(mockGenerateText).toHaveBeenCalled();
    const userPromptArg = mockGenerateText.mock.calls[0][2];
    expect(userPromptArg).toContain("[HINWEIS]");
    expect(userPromptArg).toContain("KEIN CLARIFY");
  });

  it("buildUserPrompt fuegt previousAnliegen-Block an wenn previousAnliegen gesetzt — D-09", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: `${FIRST_VALID_ID}|85|Match.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    await runMatch({
      ...baseInput,
      previousAnliegen: "alt: ursprueengliche Eingabe vor Praezisierung",
    });
    expect(mockGenerateText).toHaveBeenCalled();
    const userPromptArg = mockGenerateText.mock.calls[0][2];
    expect(userPromptArg).toContain("URSPRUENGLICHES ANLIEGEN");
    expect(userPromptArg).toContain("alt: ursprueengliche Eingabe");
  });
});

describe("runMatch — costs-Feldname", () => {
  it("ranking-Result enthaelt Feld 'costs' (nicht 'cost') — Codebase-Konvention", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: `${FIRST_VALID_ID}|85|Match.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("ranking");
    expect(result.costs).toBeDefined();
    expect(typeof result.costs.eurCents).toBe("number");
    expect((result as unknown as { cost?: unknown }).cost).toBeUndefined();
  });

  it("clarification-Result enthaelt Feld 'costs' (nicht 'cost') — Codebase-Konvention", async () => {
    mockGenerateText.mockResolvedValueOnce({
      value: "CLARIFY|Welches Bundesland?",
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const result = await runMatch(baseInput);
    expect(result.kind).toBe("clarification");
    if (result.kind === "clarification") {
      expect(result.costs).toBeDefined();
      expect(typeof result.costs.eurCents).toBe("number");
      expect((result as unknown as { cost?: unknown }).cost).toBeUndefined();
    }
  });
});

// SECOND_VALID_ID ist als Reserve fuer kuenftige Multi-Match-Tests deklariert (Plan 02-03 Eval).
void SECOND_VALID_ID;
