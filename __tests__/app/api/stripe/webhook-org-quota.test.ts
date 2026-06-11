/**
 * Unit-Tests fuer den B3-Pfad (metadata.mode=org_quota) in
 * app/api/stripe/webhook/route.ts: Code-Erzeugung + Mail-Versand,
 * Idempotenz bei Webhook-Retry (alreadyExisted -> keine zweite Mail),
 * Ignorieren bei payment_status != paid.
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
    async text() {
      return this._body;
    }
  }
  class MockNextResponse {
    status: number;
    private _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this._body;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

jest.mock("@/lib/stripe/client", () => ({
  getStripe: jest.fn(),
  stripeConfigured: jest.fn(),
}));
jest.mock("@/lib/wizard/session", () => ({ markSessionPaid: jest.fn() }));

const mFulfill = jest.fn();
jest.mock("@/lib/payments/orders", () => ({
  fulfillQuotaCardPurchase: (...a: unknown[]) => mFulfill(...a),
  buildQuotaCardConfirmationEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
  buildQuotaCardAdminEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
}));

const mSend = jest.fn().mockResolvedValue({ id: "mail_1" });
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mSend } })),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { NextRequest } from "next/server";

function buildRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (NextRequest as any)("http://localhost/api/stripe/webhook", { method: "POST", body, headers });
}

function mockEvent(metadata: Record<string, string>, payment_status = "paid", email = "buyer@example.com") {
  const fakeEvent = {
    id: "evt_q",
    type: "checkout.session.completed",
    data: { object: { id: "cs_q_1", metadata, payment_status, customer_details: { email } } },
  };
  (getStripe as jest.Mock).mockReturnValue({
    webhooks: { constructEvent: jest.fn().mockReturnValue(fakeEvent) },
  });
}

const ORIG_ENV = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIG_ENV, STRIPE_WEBHOOK_SECRET: "whsec_test", RESEND_API_KEY: "re_test" };
  (stripeConfigured as jest.Mock).mockReturnValue(true);
});
afterAll(() => {
  process.env = ORIG_ENV;
});

describe("stripe/webhook — org_quota (B3)", () => {
  const meta = { mode: "org_quota", pack_id: "pack5", org_name: "Stadt X", purchaser_email: "buyer@example.com" };

  it("erzeugt Code + versendet Mail beim ersten Verarbeiten", async () => {
    mFulfill.mockResolvedValue({
      creditCode: "EDU-AAAA-BBBB",
      credits: 5,
      packId: "pack5",
      packLabel: "5 Antraege",
      amountCents: 13990,
      orgName: "Stadt X",
      email: "buyer@example.com",
      alreadyExisted: false,
    });
    mockEvent(meta);

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));
    expect(res.status).toBe(200);
    expect(mFulfill).toHaveBeenCalledWith(
      expect.objectContaining({ stripeSessionId: "cs_q_1", packId: "pack5", orgName: "Stadt X" })
    );
    // Kundenbestaetigung + Admin-Mail
    expect(mSend).toHaveBeenCalledTimes(2);
  });

  it("versendet KEINE Mail bei Retry (alreadyExisted=true)", async () => {
    mFulfill.mockResolvedValue({
      creditCode: "EDU-AAAA-BBBB",
      credits: 5,
      packId: "pack5",
      packLabel: "5 Antraege",
      amountCents: 13990,
      alreadyExisted: true,
    });
    mockEvent(meta);

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));
    expect(res.status).toBe(200);
    expect(mFulfill).toHaveBeenCalledTimes(1);
    expect(mSend).not.toHaveBeenCalled();
  });

  it("ignoriert org_quota wenn payment_status != paid", async () => {
    mockEvent(meta, "unpaid");
    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));
    expect(res.status).toBe(200);
    expect(mFulfill).not.toHaveBeenCalled();
  });

  it("500 wenn fulfillQuotaCardPurchase wirft (Stripe-Retry)", async () => {
    mFulfill.mockRejectedValue(new Error("db down"));
    mockEvent(meta);
    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));
    expect(res.status).toBe(500);
  });
});
