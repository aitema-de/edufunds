/**
 * Regression fuer QA-01/03 (Finanzplan-Konsistenz):
 * Bei gefundenen Inkonsistenzen wird der Antragstext einmalig an den Finanzplan
 * angeglichen und erneut geprueft — frueher wurden Inkonsistenzen nur geflaggt.
 */
import { reviseForConsistency, type ConsistencyReviseDeps } from "@/lib/wizard/consistency-revision";
import type { ConsistencyIssue } from "@/lib/wizard/types";

const usage = { promptTokens: 1, candidatesTokens: 1 };
const fp = JSON.stringify([{ kategorie: "investitionen", bezeichnung: "Tablets", betragEur: 12000 }]);

function makeDeps(overrides: Partial<ConsistencyReviseDeps> = {}): ConsistencyReviseDeps {
  return {
    reviseText: jest.fn(async () => ({ value: "# Revidierter Antrag\n\nGesamt 12.000 EUR.", usage })),
    recheck: jest.fn(async () => ({ value: { issues: [] }, usage })),
    normalize: (raw: unknown) => ((raw as { issues?: ConsistencyIssue[] }).issues ?? []),
    models: { revise: "pro", recheck: "flash" },
    ...overrides,
  };
}

const issue: ConsistencyIssue = {
  art: "betrag-unstimmig",
  beschreibung: "Text nennt 55.000 EUR, Finanzplan summiert 12.000 EUR.",
};

it("ist ein No-op ohne Inkonsistenzen (kein LLM-Call)", async () => {
  const deps = makeDeps();
  const res = await reviseForConsistency("# Antrag", fp, [], deps);
  expect(res.revised).toBe(false);
  expect(res.finalText).toBe("# Antrag");
  expect(res.usages).toHaveLength(0);
  expect(deps.reviseText).not.toHaveBeenCalled();
  expect(deps.recheck).not.toHaveBeenCalled();
});

it("revidiert den Text und prueft erneut, wenn Inkonsistenzen vorliegen", async () => {
  const deps = makeDeps();
  const res = await reviseForConsistency("# Antrag\n\nGesamt 55.000 EUR.", fp, [issue], deps);

  expect(deps.reviseText).toHaveBeenCalledTimes(1);
  // Der Revisions-Prompt enthaelt die konkrete Inkonsistenz.
  const userPrompt = (deps.reviseText as jest.Mock).mock.calls[0][1] as string;
  expect(userPrompt).toContain("betrag-unstimmig");
  expect(userPrompt).toContain(fp);

  expect(deps.recheck).toHaveBeenCalledTimes(1);
  expect(res.revised).toBe(true);
  expect(res.finalText).toContain("Revidierter Antrag");
  expect(res.issues).toHaveLength(0); // nach Revision sauber
  expect(res.usages.map((u) => u.model)).toEqual(["pro", "flash"]);
});

it("behaelt den Originaltext, wenn die Revision leer zurueckkommt", async () => {
  const deps = makeDeps({ reviseText: jest.fn(async () => ({ value: "   ", usage })) });
  const res = await reviseForConsistency("# Originaltext", fp, [issue], deps);
  expect(res.finalText).toBe("# Originaltext");
  expect(res.revised).toBe(true);
});

it("gibt verbleibende Inkonsistenzen aus dem Re-Check zurueck", async () => {
  const rest = { issues: [issue] };
  const deps = makeDeps({ recheck: jest.fn(async () => ({ value: rest, usage })) });
  const res = await reviseForConsistency("# Antrag", fp, [issue], deps);
  expect(res.issues).toHaveLength(1);
  expect(res.issues[0].art).toBe("betrag-unstimmig");
});
