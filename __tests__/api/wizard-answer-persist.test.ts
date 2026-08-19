/**
 * @jest-environment node
 *
 * Regression fuer WIZARD-ANSWER-LOST-ON-500:
 * Die Nutzerantwort muss VOR den LLM-Stages persistiert werden, damit sie bei
 * einem Fehler in nextStep (z. B. abgeschnittenes DeepSeek-JSON) nicht verloren
 * geht. Ausserdem: Retry ersetzt die unverarbeitete Antwort statt sie zu doppeln.
 */
import { POST } from "@/app/api/wizard/answer/route";
import { updateWizardSession, getWizardSession } from "@/lib/wizard/session";
import { nextStep } from "@/lib/wizard/interviewer";
import { extractFacts } from "@/lib/wizard/facts-extractor";

jest.mock("@/lib/wizard/interviewer", () => ({ nextStep: jest.fn() }));
jest.mock("@/lib/wizard/facts-extractor", () => ({ extractFacts: jest.fn() }));
jest.mock("@/lib/wizard/richtlinien-loader", () => ({ loadRichtlinie: jest.fn(async () => null) }));
jest.mock("@/lib/wizard/pricing", () => ({ addUsage: (l: unknown) => l, emptyLedger: () => ({}) }));
jest.mock("@/lib/wizard/session", () => ({
  getWizardSession: jest.fn(),
  updateWizardSession: jest.fn(async (sessionToken: string, data: unknown) => ({ sessionToken, data })),
  appendMessage: (data: { messages: unknown[] }, message: object) => ({
    ...data,
    messages: [...data.messages, { id: `m${data.messages.length}`, at: "t", ...message }],
  }),
}));

const PROG = "niedersachsen-sport";

function baseSession(messages: unknown[]) {
  return {
    sessionToken: "tok",
    foerderprogrammId: PROG,
    data: {
      phase: "interviewing",
      messages,
      facts: {},
      interviewer: { totalQuestions: 1, maxQuestions: 12 },
    },
  };
}

/**
 * Bewusst ein Objekt mit `text()`, nicht nur `json()`: Die Route liest den Body
 * seit 30.07.2026 ueber `readJsonBody` (lib/json-body.ts), damit ein leerer oder
 * kaputter Body 400 statt 500 ergibt. Ein Mock mit nur `json()` wuerde eine
 * Schnittstelle nachbilden, die es so nicht gibt — ein echtes `Request` hat immer
 * beides.
 */
function req(answer: string) {
  const body = JSON.stringify({ sessionToken: "tok", answer });
  return {
    text: async () => body,
    json: async () => JSON.parse(body),
  } as never;
}

const lastMsgOf = (calls: unknown[][]) => {
  const data = calls[0][1] as { messages: { role: string; kind: string; content: string }[] };
  return data.messages[data.messages.length - 1];
};

beforeEach(() => {
  jest.clearAllMocks();
  (extractFacts as jest.Mock).mockResolvedValue({ facts: {}, usage: null });
});

it("persistiert die Antwort VOR dem LLM-Call und gibt bei nextStep-Fehler 503 retryable zurück", async () => {
  (getWizardSession as jest.Mock).mockResolvedValue(
    baseSession([{ id: "q1", role: "ai", kind: "question", content: "Frage 1" }])
  );
  (nextStep as jest.Mock).mockRejectedValue(new Error("DeepSeek lieferte kein valides JSON"));

  const res = await POST(req("Meine wertvolle Antwort"));

  // Datenverlust-Schutz: updateWizardSession wurde VOR dem Wurf aufgerufen ...
  expect(updateWizardSession as jest.Mock).toHaveBeenCalledTimes(1);
  // ... und enthielt die rohe Nutzerantwort.
  const persisted = lastMsgOf((updateWizardSession as jest.Mock).mock.calls);
  expect(persisted).toMatchObject({ role: "user", kind: "answer", content: "Meine wertvolle Antwort" });

  expect(res.status).toBe(503);
  const body = await res.json();
  expect(body.retryable).toBe(true);
});

it("schliesst den Turn normal ab, wenn nextStep eine Frage liefert", async () => {
  (getWizardSession as jest.Mock).mockResolvedValue(
    baseSession([{ id: "q1", role: "ai", kind: "question", content: "Frage 1" }])
  );
  (nextStep as jest.Mock).mockResolvedValue({
    step: { kind: "question", question: "Frage 2", rationale: undefined, updatedFacts: {} },
    usage: null,
  });

  const res = await POST(req("Antwort A"));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.question.content).toBe("Frage 2");
  // Early-Persist + finaler Persist
  expect(updateWizardSession as jest.Mock).toHaveBeenCalledTimes(2);
});

it("ersetzt bei Retry die unverarbeitete Antwort statt sie zu doppeln", async () => {
  // Letzte Nachricht ist bereits eine User-Antwort -> voriger Turn schlug fehl
  (getWizardSession as jest.Mock).mockResolvedValue(
    baseSession([
      { id: "q1", role: "ai", kind: "question", content: "Frage 1" },
      { id: "a-alt", role: "user", kind: "answer", content: "alte Antwort" },
    ])
  );
  (nextStep as jest.Mock).mockResolvedValue({
    step: { kind: "question", question: "Frage 2", rationale: undefined, updatedFacts: {} },
    usage: null,
  });

  await POST(req("korrigierte Antwort"));

  // Early-Persist-Aufruf inspizieren: genau EINE User-Antwort, ersetzt, kein Duplikat
  const data = (updateWizardSession as jest.Mock).mock.calls[0][1] as {
    messages: { role: string; kind: string; content: string }[];
  };
  const userAnswers = data.messages.filter((m) => m.role === "user" && m.kind === "answer");
  expect(userAnswers).toHaveLength(1);
  expect(userAnswers[0].content).toBe("korrigierte Antwort");
  expect(data.messages.some((m) => m.content === "alte Antwort")).toBe(false);
});

/**
 * 19.08.2026 — Nachzug zum Vorfall vom 13.08.: Die generate-Route liess "failed"
 * inzwischen wieder durch, die answer-Route nicht. Der Weg dahin ist real: Nach
 * dem Fehlschlag klickt der Nutzer „Erneut versuchen", das Frontend setzt NUR
 * seinen lokalen Zustand auf "ready_to_generate" und rendert wieder den normalen
 * Wizard samt „Noch mehr ergaenzen" (WizardShell.tsx). Wer dort erst etwas
 * nachtraegt, statt sofort neu zu generieren, lief in denselben 409.
 */
describe("answer aus Phase 'failed' — die zweite Tuer aus der Sackgasse", () => {
  function failedSession(messages: unknown[]) {
    const s = baseSession(messages) as { data: Record<string, unknown> };
    s.data.phase = "failed";
    s.data.lastError = { message: "429 status code (no body)", at: "2026-08-13T12:05:38Z" };
    return s;
  }

  it("nimmt die Antwort an, statt sie mit 409 abzuweisen", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(failedSession([]));
    (extractFacts as jest.Mock).mockResolvedValue({ facts: {}, usage: null });
    (nextStep as jest.Mock).mockResolvedValue({
      step: { kind: "question", question: "Und wie finanzieren Sie den Eigenanteil?", updatedFacts: {} },
      usage: null,
    });

    const res = await POST(req("Noch eine Angabe"));

    expect(res.status).not.toBe(409);
    expect(res.status).toBe(200);
  });

  it("normalisiert die Phase zurück auf 'interviewing' — sonst bleibt die Session auf 'failed' stehen", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(failedSession([]));
    (extractFacts as jest.Mock).mockResolvedValue({ facts: {}, usage: null });
    (nextStep as jest.Mock).mockResolvedValue({
      step: { kind: "question", question: "Folgefrage?", updatedFacts: {} },
      usage: null,
    });

    await POST(req("Antwort"));

    const geschrieben = (updateWizardSession as jest.Mock).mock.calls.at(-1)![1];
    expect(geschrieben.phase).toBe("interviewing");
    expect(geschrieben.lastError).toBeUndefined();
  });

  it("führt 'failed' auch nach 'ready_to_generate', wenn das Interview fertig ist", async () => {
    (getWizardSession as jest.Mock).mockResolvedValue(failedSession([]));
    (extractFacts as jest.Mock).mockResolvedValue({ facts: {}, usage: null });
    (nextStep as jest.Mock).mockResolvedValue({
      step: { kind: "ready", summary: "alles da", updatedFacts: {} },
      usage: null,
    });

    await POST(req("Letzte Angabe"));

    const geschrieben = (updateWizardSession as jest.Mock).mock.calls.at(-1)![1];
    expect(geschrieben.phase).toBe("ready_to_generate");
    expect(geschrieben.lastError).toBeUndefined();
  });

  it("lässt 'complete' weiterhin nicht antworten", async () => {
    const s = baseSession([]) as { data: Record<string, unknown> };
    s.data.phase = "complete";
    (getWizardSession as jest.Mock).mockResolvedValue(s);

    const res = await POST(req("zu spät"));

    expect(res.status).toBe(409);
  });
});
