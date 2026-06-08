/**
 * @jest-environment node
 *
 * Deckt die Verzweigungslogik von POST /api/wizard/redeem-code ab
 * (DB-Schicht gemockt): Validierung, Idempotenz, Fehlergruende, Erfolg, Refund.
 */
import { POST } from "@/app/api/wizard/redeem-code/route";

jest.mock("@/lib/wizard/session", () => ({
  getWizardSession: jest.fn(),
  tryMarkSessionPaid: jest.fn(),
}));
jest.mock("@/lib/wizard/credit-codes", () => ({
  normalizeCode: (s: string) => s.trim().toUpperCase(),
  consumeCredit: jest.fn(),
  refundCredit: jest.fn(),
  logRedemption: jest.fn(),
}));

import { getWizardSession, tryMarkSessionPaid } from "@/lib/wizard/session";
import { consumeCredit, refundCredit, logRedemption } from "@/lib/wizard/credit-codes";

const mGetSession = getWizardSession as jest.Mock;
const mTryPaid = tryMarkSessionPaid as jest.Mock;
const mConsume = consumeCredit as jest.Mock;
const mRefund = refundCredit as jest.Mock;
const mLog = logRedemption as jest.Mock;

const req = (body: unknown) => ({ json: async () => body }) as never;

beforeEach(() => jest.clearAllMocks());

describe("POST /api/wizard/redeem-code", () => {
  it("400 ohne sessionToken", async () => {
    const res = await POST(req({ code: "EDU-AAAA-BBBB" }));
    expect(res.status).toBe(400);
  });

  it("400 ohne code", async () => {
    const res = await POST(req({ sessionToken: "s" }));
    expect(res.status).toBe(400);
  });

  it("404 wenn Session fehlt", async () => {
    mGetSession.mockResolvedValue(null);
    const res = await POST(req({ sessionToken: "s", code: "EDU-AAAA-BBBB" }));
    expect(res.status).toBe(404);
    expect(mConsume).not.toHaveBeenCalled();
  });

  it("alreadyPaid (200) wenn Session bereits bezahlt — kein Verbrauch", async () => {
    mGetSession.mockResolvedValue({ paidToken: "pt-123" });
    const res = await POST(req({ sessionToken: "s", code: "EDU-AAAA-BBBB" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyPaid: true, paidToken: "pt-123" });
    expect(mConsume).not.toHaveBeenCalled();
  });

  it("404 bei unbekanntem Code", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mConsume.mockResolvedValue({ ok: false, reason: "unknown" });
    const res = await POST(req({ sessionToken: "s", code: "x" }));
    expect(res.status).toBe(404);
  });

  it("409 bei aufgebrauchtem Kontingent", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mConsume.mockResolvedValue({ ok: false, reason: "exhausted" });
    const res = await POST(req({ sessionToken: "s", code: "x" }));
    expect(res.status).toBe(409);
  });

  it("410 bei abgelaufenem Code", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mConsume.mockResolvedValue({ ok: false, reason: "expired" });
    const res = await POST(req({ sessionToken: "s", code: "x" }));
    expect(res.status).toBe(410);
  });

  it("200 + paidToken + Protokoll bei erfolgreicher Einloesung", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mConsume.mockResolvedValue({ ok: true, creditsRemaining: 4 });
    mTryPaid.mockResolvedValue({ session: { paidToken: "pt-new" }, didSet: true });
    const res = await POST(req({ sessionToken: "s", code: "edu-aaaa-bbbb" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ paidToken: "pt-new", creditsRemaining: 4 });
    expect(mLog).toHaveBeenCalledWith("EDU-AAAA-BBBB", "s", "pt-new");
    expect(mRefund).not.toHaveBeenCalled();
  });

  it("Refund + alreadyPaid wenn Session parallel bezahlt wurde", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mConsume.mockResolvedValue({ ok: true, creditsRemaining: 4 });
    mTryPaid.mockResolvedValue({ session: { paidToken: "pt-other" }, didSet: false });
    const res = await POST(req({ sessionToken: "s", code: "edu-aaaa-bbbb" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyPaid: true, paidToken: "pt-other" });
    expect(mRefund).toHaveBeenCalledWith("EDU-AAAA-BBBB");
    expect(mLog).not.toHaveBeenCalled();
  });
});
