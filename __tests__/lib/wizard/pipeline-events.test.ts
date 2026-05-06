/**
 * Unit-Tests fuer lib/wizard/pipeline.ts — PipelineEvent-Reihenfolge + Fehler-Schlucken
 * Phase 02.1 Plan 06 — beide todos gruen gemacht (D-04, D-13)
 */

import { runPipeline, type PipelineEvent } from "@/lib/wizard/pipeline";
import type { Foerderprogramm } from "@/lib/foerderSchema";

// LLM-Modul vollstaendig mocken — keine echten API-Calls in Tests.
// generateJson-Stub-Wert muss alle Pipeline-Stages befriedigen:
//   - Outline: abschnitte[] + titel (fuer Section-Loop)
//   - Critique: findings=[] (keine Findings → recheck wird uebersprungen)
//   - Recheck: resolutions=[]
//   - Finanzplan: posten=[] (leer → consistency wird uebersprungen)
//   - Consistency: issues=[]
// Alle Werte inline im Factory-Callback, damit Jest-Hoisting kein ReferenceError wirft.
jest.mock("@/lib/wizard/llm", () => ({
  generateText: jest.fn().mockResolvedValue({
    value: "Stub Section Text",
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  generateJson: jest.fn().mockResolvedValue({
    value: {
      titel: "Stub-Antrag",
      abschnitte: [{ name: "Einleitung", fokus: "Stub-Fokus" }],
      findings: [],
      zusammenfassung: "Stub",
      resolutions: [],
      posten: [],
      hinweise: [],
      issues: [],
    },
    usage: { promptTokens: 0, candidatesTokens: 0 },
  }),
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
}));

const minimalProgramm: Foerderprogramm = {
  id: "stub-program",
  name: "Stub-Programm",
  foerdergeber: "Test",
  foerdergeberTyp: "stiftung",
} as unknown as Foerderprogramm;

describe("pipeline — PipelineEvents (D-04, D-13)", () => {
  it("ruft onEvent fuer jede Stage in korrekter Reihenfolge auf — D-04", async () => {
    const events: PipelineEvent["stage"][] = [];
    try {
      await runPipeline(
        minimalProgramm,
        {} as never,
        null,
        (e: PipelineEvent) => { events.push(e.stage); }
      );
    } catch {
      // Pipeline darf scheitern bei minimal-stubbed Mocks;
      // relevant sind die emittierten Stages bis zum Abbruch.
    }
    // Verbindliche Untergrenze (B4): mind. 4 Stages in fester Reihenfolge
    // muessen emittiert worden sein, bevor die Pipeline ggf. scheitert.
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.slice(0, 4)).toEqual(["outline", "section", "critique", "revision"]);
  });

  it("schluckt Fehler im onEvent-Callback ohne Pipeline-Crash — D-13", async () => {
    // Verbindliche Assertion (B4): runPipeline MUSS resolven, auch wenn onEvent throwt.
    // Setzt die defensive emit-Haertung in pipeline.ts voraus (try/catch um onEvent-Call).
    const throwingCallback = () => { throw new Error("boom"); };
    await expect(
      runPipeline(
        minimalProgramm,
        {} as never,
        null,
        throwingCallback as unknown as (e: PipelineEvent) => void
      )
    ).resolves.toBeDefined();
  });
});
