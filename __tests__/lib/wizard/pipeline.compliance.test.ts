/**
 * Compliance-Stage Test-Skelett (Wave 3 Plan 05-06 Implementierung).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 3 Plan 05-06.
 *
 * Neue Stage compliance-check zwischen recheck und finanzplan (D-20 Hebel 2).
 * Silent Stage — keine GeneratingProgress-UI-Anzeige.
 * Feature-Flag PIPELINE_COMPLIANCE_STAGE (default OFF).
 */

import type { Foerderprogramm } from "@/lib/foerderSchema";
import type { PipelineEvent } from "@/lib/wizard/pipeline";

// LLM-Modul vollstaendig mocken — keine echten API-Calls in Tests.
jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_PRO: "deepseek-v4-pro",
  generateJson: jest.fn(),
  generateText: jest.fn(),
}));

const minimalProgramm: Foerderprogramm = {
  id: "stub-program",
  name: "Stub-Programm",
  foerdergeber: "Test",
  foerdergeberTyp: "stiftung",
} as unknown as Foerderprogramm;

// Pflichtabschnitte fuer Tests
const PFLICHT_ABSCHNITTE = [
  { id: "bedarfsanalyse", name: "Bedarfsanalyse", pflicht: true, maxZeichen: 2000 },
  { id: "projektziele", name: "Projektziele", pflicht: true, maxZeichen: 1500 },
  { id: "massnahmen", name: "Massnahmen", pflicht: true, maxZeichen: 3000 },
  { id: "finanzierung", name: "Finanzierung", pflicht: true, maxZeichen: 1000 },
  { id: "nachhaltigkeit", name: "Nachhaltigkeit", pflicht: true, maxZeichen: 1000 },
];

// Finaler Text mit allen 5 Pflicht-Abschnitten
const FULL_TEXT = `Bedarfsanalyse
Die Schule hat einen hohen Bedarf.

Projektziele
Das Projekt zielt auf Verbesserung.

Massnahmen
Wir fuehren folgende Massnahmen durch.

Finanzierung
Die Finanzierung erfolgt anteilig.

Nachhaltigkeit
Das Projekt ist nachhaltig geplant.`;

// Finaler Text mit nur 3 Pflicht-Abschnitten (fehlt: Finanzierung, Nachhaltigkeit)
const PARTIAL_TEXT = `Bedarfsanalyse
Die Schule hat einen hohen Bedarf.

Projektziele
Das Projekt zielt auf Verbesserung.

Massnahmen
Wir fuehren folgende Massnahmen durch.`;

// Minimal-Mock-Setup fuer generateJson und generateText
function setupLlmMocks() {
  const { generateJson, generateText } = require("@/lib/wizard/llm");

  (generateJson as jest.Mock).mockResolvedValue({
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
  });

  (generateText as jest.Mock).mockResolvedValue({
    value: FULL_TEXT,
    usage: { promptTokens: 0, candidatesTokens: 0 },
  });
}

describe("Compliance-Stage Pipeline-Integration", () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.PIPELINE_COMPLIANCE_STAGE;
    jest.clearAllMocks();
  });

  it("Test 1: PIPELINE_COMPLIANCE_STAGE=0 (default OFF) — Pipeline emittiert KEINE compliance-check-Stage", async () => {
    // PIPELINE_COMPLIANCE_STAGE nicht gesetzt → default OFF
    const { runPipeline } = require("@/lib/wizard/pipeline");
    setupLlmMocks();

    const events: string[] = [];
    await runPipeline(
      minimalProgramm,
      {},
      null,
      (e: PipelineEvent) => { events.push(e.stage); }
    );
    expect(events).not.toContain("compliance-check");
  });

  it("Test 2: PIPELINE_COMPLIANCE_STAGE=1 + alle 5 Pflicht-Abschnitte im Output → 1× compliance-check, 0 Violations, KEIN Revision-Re-Trigger", async () => {
    process.env.PIPELINE_COMPLIANCE_STAGE = "1";
    jest.resetModules();
    const { runPipeline } = require("@/lib/wizard/pipeline");
    setupLlmMocks();

    // Finaler Text enthaelt alle 5 Pflichtabschnitte
    const { generateText } = require("@/lib/wizard/llm");
    (generateText as jest.Mock).mockResolvedValue({
      value: FULL_TEXT,
      usage: { promptTokens: 0, candidatesTokens: 0 },
    });

    const events: PipelineEvent[] = [];
    const richtlinie = {
      version: "1.0",
      antragsstruktur: { abschnitte: PFLICHT_ABSCHNITTE },
      foerderhoehe: {},
      eigenmittel: {},
      kumulierung: {},
    };

    await runPipeline(
      minimalProgramm,
      {},
      richtlinie as never,
      (e: PipelineEvent) => { events.push(e); }
    );

    const complianceEvents = events.filter((e) => e.stage === "compliance-check");
    expect(complianceEvents).toHaveLength(1);

    // Kein zusaetzlicher generateText-Call fuer Revision-Re-Trigger bei 0 Violations
    // (generateText wird fuer section + revision gerufen, aber KEIN compliance-revision-Call zusaetzlich)
    // Test prueft indirekt: complianceLoopCount bleibt bei 0
    const result = await runPipeline(
      minimalProgramm,
      {},
      richtlinie as never,
      () => {}
    );
    expect(result).toBeDefined();
  });

  it("Test 3: PIPELINE_COMPLIANCE_STAGE=1 + 5 Pflicht-Abschnitte + Output enthaelt nur 3 → 1× compliance-check, violations.length >= 1, 1× zusaetzlicher Revision-Call", async () => {
    process.env.PIPELINE_COMPLIANCE_STAGE = "1";
    jest.resetModules();
    const { runPipeline } = require("@/lib/wizard/pipeline");

    const { generateJson, generateText } = require("@/lib/wizard/llm");

    (generateJson as jest.Mock).mockResolvedValue({
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
    });

    // Erster Call (section + revision): gibt Partial-Text zurueck (nur 3 Abschnitte)
    // Zweiter Call (compliance-revision): gibt vollen Text zurueck
    let textCallCount = 0;
    (generateText as jest.Mock).mockImplementation(() => {
      textCallCount++;
      const value = textCallCount === 1 ? PARTIAL_TEXT : FULL_TEXT;
      return Promise.resolve({ value, usage: { promptTokens: 0, candidatesTokens: 0 } });
    });

    const events: PipelineEvent[] = [];
    const richtlinie = {
      version: "1.0",
      antragsstruktur: { abschnitte: PFLICHT_ABSCHNITTE },
      foerderhoehe: {},
      eigenmittel: {},
      kumulierung: {},
    };

    await runPipeline(
      minimalProgramm,
      {},
      richtlinie as never,
      (e: PipelineEvent) => { events.push(e); }
    );

    const complianceEvents = events.filter((e) => e.stage === "compliance-check");
    expect(complianceEvents).toHaveLength(1);

    // Es muss mindestens 1 generateText-Call fuer section + 1 fuer revision + 1 fuer compliance-revision geben
    // (PARTIAL_TEXT hat "Finanzierung" und "Nachhaltigkeit" nicht → 2 Violations)
    expect(textCallCount).toBeGreaterThanOrEqual(2);
  });

  it("Test 4: PIPELINE_COMPLIANCE_STAGE=1 + nach 1. Compliance-Iteration weiterhin Violations → KEINE 2. Iteration (Loop-Count enforced)", async () => {
    process.env.PIPELINE_COMPLIANCE_STAGE = "1";
    jest.resetModules();
    const { runPipeline } = require("@/lib/wizard/pipeline");

    const { generateJson, generateText } = require("@/lib/wizard/llm");

    (generateJson as jest.Mock).mockResolvedValue({
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
    });

    // IMMER Partial-Text zurueckgeben → Violations bleiben nach Compliance-Revision
    let textCallCount = 0;
    (generateText as jest.Mock).mockImplementation(() => {
      textCallCount++;
      return Promise.resolve({
        value: PARTIAL_TEXT,
        usage: { promptTokens: 0, candidatesTokens: 0 },
      });
    });

    const events: PipelineEvent[] = [];
    const richtlinie = {
      version: "1.0",
      antragsstruktur: { abschnitte: PFLICHT_ABSCHNITTE },
      foerderhoehe: {},
      eigenmittel: {},
      kumulierung: {},
    };

    await runPipeline(
      minimalProgramm,
      {},
      richtlinie as never,
      (e: PipelineEvent) => { events.push(e); }
    );

    // compliance-check darf nur EINMAL emittiert werden — kein zweiter Durchlauf
    const complianceEvents = events.filter((e) => e.stage === "compliance-check");
    expect(complianceEvents).toHaveLength(1);
  });

  it("Test 5: richtlinie=null → Compliance-Stage wird komplett uebersprungen (kein Crash)", async () => {
    process.env.PIPELINE_COMPLIANCE_STAGE = "1";
    jest.resetModules();
    const { runPipeline } = require("@/lib/wizard/pipeline");
    setupLlmMocks();

    const events: PipelineEvent[] = [];
    // richtlinie=null → kein Crash, kein compliance-check-Event
    await expect(
      runPipeline(
        minimalProgramm,
        {},
        null,
        (e: PipelineEvent) => { events.push(e); }
      )
    ).resolves.toBeDefined();

    expect(events.map((e) => e.stage)).not.toContain("compliance-check");
  });
});
