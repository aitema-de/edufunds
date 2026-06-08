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

function req(answer: string) {
  return { json: async () => ({ sessionToken: "tok", answer }) } as never;
}

const lastMsgOf = (calls: unknown[][]) => {
  const data = calls[0][1] as { messages: { role: string; kind: string; content: string }[] };
  return data.messages[data.messages.length - 1];
};

beforeEach(() => {
  jest.clearAllMocks();
  (extractFacts as jest.Mock).mockResolvedValue({ facts: {}, usage: null });
});

it("persistiert die Antwort VOR dem LLM-Call und gibt bei nextStep-Fehler 503 retryable zurueck", async () => {
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
