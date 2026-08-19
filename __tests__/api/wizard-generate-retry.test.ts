/**
 * @jest-environment node
 *
 * Regression fuer den Vorfall vom 13.08.2026 (Antrag 37, pilot.edufunds.org):
 * Die Generierung scheiterte an einem Mistral-429 — und danach war die Session
 * dauerhaft tot. Der Fehlerpfad schrieb `phase: "failed"`, die Erlaubnisliste am
 * Eingang der Route kannte aber nur "ready_to_generate" und "interviewing".
 * Jeder Klick auf „Erneut versuchen" bekam 409. Im Traefik-Log steht das als ein
 * 500 um 12:05:38 und sieben 409 bis 12:13:13; danach hat der Tester aufgegeben.
 *
 * Zusaetzlich gesichert: Der GRUND landet in der Session. Vorher stand er nur in
 * `console.error`, und Container-Logs ueberleben keinen Neustart — der Fehlschlag
 * war nach dem naechsten Deploy nicht mehr aufklaerbar.
 */
import { POST } from "@/app/api/wizard/generate/route";
import { getWizardSession, updateWizardSession } from "@/lib/wizard/session";
import { runPipeline } from "@/lib/wizard/pipeline";
import type { WizardPhase } from "@/lib/wizard/types";

jest.mock("@/lib/wizard/pipeline", () => ({ runPipeline: jest.fn() }));
jest.mock("@/lib/wizard/richtlinien-loader", () => ({ loadRichtlinie: jest.fn(async () => null) }));
jest.mock("@/lib/wizard/pricing", () => ({ addUsage: (l: unknown) => l, emptyLedger: () => ({}) }));
jest.mock("@/lib/db", () => ({ query: jest.fn(async () => ({ rows: [], rowCount: 0 })) }));
jest.mock("@/lib/wizard/session", () => ({
  getWizardSession: jest.fn(),
  updateWizardSession: jest.fn(async (sessionToken: string, data: unknown) => ({ sessionToken, data })),
}));

const PROG = "kultur-macht-stark"; // das Programm aus dem echten Vorfall

function session(phase: WizardPhase) {
  return {
    sessionToken: "tok",
    foerderprogrammId: PROG,
    data: {
      phase,
      messages: [],
      facts: {},
      interviewer: { totalQuestions: 12, maxQuestions: 12 },
    },
  };
}

function req(body: unknown) {
  return {
    text: async () => JSON.stringify(body),
    json: async () => body,
    headers: new Headers(),
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/wizard/generate — Erlaubnisliste am Eingang", () => {
  it.each<WizardPhase>(["ready_to_generate", "interviewing", "failed"])(
    "laesst Phase %s generieren",
    async (phase) => {
      (getWizardSession as jest.Mock).mockResolvedValue(session(phase));
      (runPipeline as jest.Mock).mockResolvedValue({
        artefacts: { finalText: "Text", sections: [] },
        usages: [],
      });

      const res = await POST(req({ sessionToken: "tok" }));

      expect(res.status).toBe(200);
      expect(runPipeline).toHaveBeenCalledTimes(1);
    }
  );

  it("aus 'failed' heraus laeuft der zweite Versuch wirklich durch (der Kern des Vorfalls)", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(session("failed"));
    (runPipeline as jest.Mock).mockResolvedValue({
      artefacts: { finalText: "Diesmal geklappt", sections: [] },
      usages: [],
    });

    const res = await POST(req({ sessionToken: "tok" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phase).toBe("complete");
    // Der entscheidende Unterschied: KEIN 409 mehr.
    expect(res.status).not.toBe(409);
  });

  it("blockt weiterhin, was wirklich nicht generieren darf ('complete')", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(session("complete"));

    const res = await POST(req({ sessionToken: "tok" }));

    expect(res.status).toBe(409);
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("'generating' bleibt idempotent (200 + Hinweis aufs Pollen, kein zweiter Lauf)", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(session("generating"));

    const res = await POST(req({ sessionToken: "tok" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phase).toBe("generating");
    expect(runPipeline).not.toHaveBeenCalled();
  });
});

describe("POST /api/wizard/generate — der Fehler hinterlaesst eine Spur", () => {
  it("schreibt Meldung und Zeitpunkt in die Session statt sie wegzuwerfen", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(session("ready_to_generate"));
    (runPipeline as jest.Mock).mockRejectedValue(new Error("429 status code (no body)"));

    const res = await POST(req({ sessionToken: "tok" }));

    expect(res.status).toBe(500);
    const geschrieben = (updateWizardSession as jest.Mock).mock.calls.at(-1)![1];
    expect(geschrieben.phase).toBe("failed");
    expect(geschrieben.lastError.message).toBe("429 status code (no body)");
    expect(typeof geschrieben.lastError.at).toBe("string");
  });

  it("bewahrt den Stage-Heartbeat, statt den Vor-Pipeline-Stand zurueckzuschreiben", async () => {
    // Waehrend der Lauf lief, hat onEvent `generation.stage` in die DB geschrieben.
    (getWizardSession as jest.Mock)
      .mockResolvedValueOnce(session("ready_to_generate"))
      .mockResolvedValueOnce({
        ...session("generating"),
        data: { ...session("generating").data, generation: { stage: "section", stageAt: "t" } },
      });
    (runPipeline as jest.Mock).mockRejectedValue(new Error("kaputt"));

    await POST(req({ sessionToken: "tok" }));

    const geschrieben = (updateWizardSession as jest.Mock).mock.calls.at(-1)![1];
    expect(geschrieben.generation.stage).toBe("section");
    expect(geschrieben.lastError.stage).toBe("section");
  });

  it("loescht den alten Fehler, sobald ein neuer Versuch startet", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue({
      ...session("failed"),
      data: {
        ...session("failed").data,
        lastError: { message: "alter Fehler", at: "2026-08-13T12:05:38Z" },
      },
    });
    (runPipeline as jest.Mock).mockResolvedValue({
      artefacts: { finalText: "ok", sections: [] },
      usages: [],
    });

    await POST(req({ sessionToken: "tok" }));

    // Erster Schreibvorgang = Wechsel nach "generating".
    const erster = (updateWizardSession as jest.Mock).mock.calls[0][1];
    expect(erster.phase).toBe("generating");
    expect(erster.lastError).toBeUndefined();
  });
});
