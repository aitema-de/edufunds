/**
 * Unit-Tests fuer den charge.refunded-Pfad in app/api/stripe/webhook/route.ts.
 *
 * Geprueft wird die ZUORDNUNG (Charge -> Antrag bzw. Kontingent) und die
 * Teilerstattungs-Regel. Die DB-Wirkung selbst ist in
 * __tests__/integration/refund.test.ts gegen eine echte Datenbank getestet —
 * hier interessiert nur, WER mit welchem Argument gerufen wird.
 */
jest.mock("next/server", () => {
  class MockNextRequest {
    private _headers: Map<string, string>;
    private _body: string;
    constructor(_url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this._headers = new Map(Object.entries(init?.headers ?? {}));
      this._body = init?.body ?? "";
    }
    headers = {
      get: (key: string) => (this as unknown as MockNextRequest)._headers.get(key.toLowerCase()) ?? null,
    };
    async text() { return this._body; }
  }
  class MockNextResponse {
    status: number;
    private _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status ?? 200;
    }
    async json() { return this._body; }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

jest.mock("@/lib/stripe/client", () => ({ getStripe: jest.fn(), stripeConfigured: jest.fn() }));
jest.mock("@/lib/wizard/session", () => ({ markSessionPaid: jest.fn() }));
jest.mock("@/lib/db", () => ({ query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }) }));

const mRevokeSession = jest.fn().mockResolvedValue({ revoked: true, revokedToken: "pt_1" });
const mRevokeQuota = jest.fn().mockResolvedValue({ revoked: true, code: "EDU-AAAA-BBBB", creditsVerfallen: 5 });
jest.mock("@/lib/payments/refund", () => ({
  revokeSessionAccess: (...a: unknown[]) => mRevokeSession(...a),
  revokeQuotaCodeByStripeSession: (...a: unknown[]) => mRevokeQuota(...a),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { NextRequest } from "next/server";

const mRetrievePI = jest.fn();
const mListSessions = jest.fn();

function buildRequest(): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (NextRequest as any)("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers: { "stripe-signature": "v1=valid" },
  });
}

function mockCharge(charge: Record<string, unknown>) {
  (getStripe as jest.Mock).mockReturnValue({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: `evt_${Math.random()}`,
        type: "charge.refunded",
        data: { object: charge },
      }),
    },
    paymentIntents: { retrieve: mRetrievePI },
    checkout: { sessions: { list: mListSessions } },
  });
}

const ORIG_ENV = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  mRevokeSession.mockResolvedValue({ revoked: true, revokedToken: "pt_1" });
  mRevokeQuota.mockResolvedValue({ revoked: true, code: "EDU-AAAA-BBBB", creditsVerfallen: 5 });
  process.env = { ...ORIG_ENV, STRIPE_WEBHOOK_SECRET: "whsec_test" };
  (stripeConfigured as jest.Mock).mockReturnValue(true);
});
afterAll(() => {
  process.env = ORIG_ENV;
});

describe("charge.refunded — Einzelantrag", () => {
  it("entwertet die Session aus den Charge-Metadaten", async () => {
    mockCharge({
      id: "ch_1",
      amount: 2990,
      amount_refunded: 2990,
      payment_intent: "pi_1",
      metadata: { wizard_session_token: "sess-abc" },
    });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(mRevokeSession).toHaveBeenCalledWith("sess-abc");
    // Der Charge trug die Metadaten schon — kein unnoetiger API-Call.
    expect(mRetrievePI).not.toHaveBeenCalled();
  });

  it("laedt den PaymentIntent nach, wenn der Charge keine Metadaten traegt", async () => {
    // Wir verlassen uns NICHT darauf, dass der Charge die PI-Metadaten erbt.
    mockCharge({ id: "ch_2", amount: 2990, amount_refunded: 2990, payment_intent: "pi_2", metadata: {} });
    mRetrievePI.mockResolvedValue({ metadata: { wizard_session_token: "sess-xyz" } });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(mRetrievePI).toHaveBeenCalledWith("pi_2");
    expect(mRevokeSession).toHaveBeenCalledWith("sess-xyz");
  });
});

describe("charge.refunded — Teilerstattung", () => {
  it("entwertet NICHTS bei einer Teilerstattung (Kulanz-Rueckzahlung)", async () => {
    mockCharge({
      id: "ch_3",
      amount: 2990,
      amount_refunded: 500, // 5 EUR Kulanz zurueck
      payment_intent: "pi_3",
      metadata: { wizard_session_token: "sess-abc" },
    });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(mRevokeSession).not.toHaveBeenCalled();
    expect(mRevokeQuota).not.toHaveBeenCalled();
  });

  it("entwertet, sobald der volle Betrag zurueckgezahlt ist (auch in Raten)", async () => {
    mockCharge({
      id: "ch_4",
      amount: 2990,
      amount_refunded: 2990,
      payment_intent: "pi_4",
      metadata: { wizard_session_token: "sess-abc" },
    });

    await POST(buildRequest());
    expect(mRevokeSession).toHaveBeenCalledWith("sess-abc");
  });
});

describe("charge.refunded — Kontingent-Kartenkauf", () => {
  it("findet ueber den PaymentIntent die Checkout-Session und entwertet den Code", async () => {
    // Der Kontingent-Checkout setzt KEINE PaymentIntent-Metadaten — deshalb der Umweg.
    mockCharge({ id: "ch_5", amount: 13990, amount_refunded: 13990, payment_intent: "pi_5", metadata: {} });
    mRetrievePI.mockResolvedValue({ metadata: {} });
    mListSessions.mockResolvedValue({ data: [{ id: "cs_quota_9" }] });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(mListSessions).toHaveBeenCalledWith({ payment_intent: "pi_5", limit: 1 });
    expect(mRevokeQuota).toHaveBeenCalledWith("cs_quota_9");
    expect(mRevokeSession).not.toHaveBeenCalled();
  });

  it("quittiert 200, wenn sich der Charge nirgends zuordnen laesst (kein Stripe-Retry-Sturm)", async () => {
    mockCharge({ id: "ch_6", amount: 999, amount_refunded: 999, payment_intent: "pi_6", metadata: {} });
    mRetrievePI.mockResolvedValue({ metadata: {} });
    mListSessions.mockResolvedValue({ data: [] });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(mRevokeSession).not.toHaveBeenCalled();
  });
});
