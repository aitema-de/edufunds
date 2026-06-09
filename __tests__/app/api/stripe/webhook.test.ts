/**
 * Unit-Tests fuer app/api/stripe/webhook/route.ts
 * Phase 02.1 Plan 01 — Wave-0-Skelette (D-07)
 *
 * Drei reale Tests (503 / 400-Header-fehlt / 400-InvalidSig) + 2 it.todo
 * (werden in Plan 02.1-02 gruen gemacht).
 *
 * next/server wird gemockt, weil NextRequest den nativen Request-Global benoetigt,
 * der in jsdom nicht vor dem Modul-Load verfuegbar ist.
 */

// next/server mocken BEVOR die Route importiert wird, damit kein globales Request benoetigt wird.
jest.mock("next/server", () => {
  // Minimale NextRequest/NextResponse-Implementierung fuer Tests
  class MockNextRequest {
    private _headers: Map<string, string>;
    private _body: string;
    constructor(_url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this._headers = new Map(Object.entries(init?.headers ?? {}));
      this._body = init?.body ?? "";
    }
    headers = {
      get: (key: string) => {
        const self = (this as unknown as MockNextRequest);
        return self._headers.get(key.toLowerCase()) ?? null;
      },
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

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

jest.mock("@/lib/stripe/client", () => ({
  getStripe: jest.fn(),
  stripeConfigured: jest.fn(),
}));

jest.mock("@/lib/wizard/session", () => ({
  markSessionPaid: jest.fn(),
}));

// orders + resend mocken, damit route.ts nicht transitiv `pg` (TextEncoder
// fehlt in jsdom) laedt. Der org_quota-Pfad wird separat getestet.
jest.mock("@/lib/payments/orders", () => ({
  fulfillQuotaCardPurchase: jest.fn(),
  buildQuotaCardConfirmationEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
  buildQuotaCardAdminEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
}));
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { markSessionPaid } from "@/lib/wizard/session";

// Import des gemockten NextRequest
import { NextRequest } from "next/server";

function buildRequest(
  body: string,
  headers: Record<string, string> = {}
): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (NextRequest as any)("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("stripe/webhook — Signatur-Pruefung (D-07)", () => {
  const ORIG_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIG_ENV };
  });

  afterAll(() => {
    process.env = ORIG_ENV;
  });

  it("gibt 503 zurueck wenn STRIPE_WEBHOOK_SECRET fehlt — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(false);
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const res = await POST(buildRequest("{}"));

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("gibt 400 zurueck wenn stripe-signature Header fehlt — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    // Kein stripe-signature Header
    const res = await POST(buildRequest("{}"));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/stripe-signature/i);
  });

  it("gibt 400 zurueck bei ungueltiger Signatur — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const mockWebhooks = {
      constructEvent: jest.fn().mockImplementation(() => {
        throw new Error("Invalid signature");
      }),
    };
    (getStripe as jest.Mock).mockReturnValue({ webhooks: mockWebhooks });

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=fake" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("ruft markSessionPaid bei checkout.session.completed mit metadata.wizard_session_token — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    (markSessionPaid as jest.Mock).mockResolvedValue({
      paidToken: "paid_token_test",
      sessionToken: "test-token",
    } as never);

    const fakeEvent = {
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          metadata: { wizard_session_token: "test-token", tier: "einzelantrag" },
          payment_status: "paid",
          customer_details: { email: "buyer@example.com" },
        },
      },
    };
    (getStripe as jest.Mock).mockReturnValue({
      webhooks: { constructEvent: jest.fn().mockReturnValue(fakeEvent) },
    });

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(markSessionPaid).toHaveBeenCalledWith("test-token", {
      stripeSessionId: "cs_test_1",
      stripeCustomerEmail: "buyer@example.com",
      tier: "einzelantrag",
      source: "card",
    });
  });

  it("ignoriert checkout.session.completed wenn payment_status != paid — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    (markSessionPaid as jest.Mock).mockResolvedValue({
      paidToken: "paid_token_test",
      sessionToken: "test-token",
    } as never);

    const fakeEvent = {
      id: "evt_test_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_2",
          metadata: { wizard_session_token: "test-token", tier: "einzelantrag" },
          payment_status: "unpaid",
          customer_details: { email: "buyer@example.com" },
        },
      },
    };
    (getStripe as jest.Mock).mockReturnValue({
      webhooks: { constructEvent: jest.fn().mockReturnValue(fakeEvent) },
    });

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));

    expect(res.status).toBe(200);
    expect(markSessionPaid).not.toHaveBeenCalled();
  });

  it("ignoriert checkout.session.completed wenn metadata.wizard_session_token fehlt — D-07", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    (markSessionPaid as jest.Mock).mockResolvedValue({
      paidToken: "paid_token_test",
      sessionToken: "test-token",
    } as never);

    const fakeEvent = {
      id: "evt_test_3",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_3",
          metadata: {},
          payment_status: "paid",
          customer_details: { email: "buyer@example.com" },
        },
      },
    };
    (getStripe as jest.Mock).mockReturnValue({
      webhooks: { constructEvent: jest.fn().mockReturnValue(fakeEvent) },
    });

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));

    expect(res.status).toBe(200);
    expect(markSessionPaid).not.toHaveBeenCalled();
  });

  it("gibt 500 zurueck wenn markSessionPaid wirft — D-07 + T-02.1.02-06 (Stripe-retry-Pfad)", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(true);
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    (markSessionPaid as jest.Mock).mockRejectedValue(new Error("Session not found"));

    const fakeEvent = {
      id: "evt_test_4",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_4",
          metadata: { wizard_session_token: "test-token", tier: "einzelantrag" },
          payment_status: "paid",
          customer_details: { email: "buyer@example.com" },
        },
      },
    };
    (getStripe as jest.Mock).mockReturnValue({
      webhooks: { constructEvent: jest.fn().mockReturnValue(fakeEvent) },
    });

    const res = await POST(buildRequest("{}", { "stripe-signature": "v1=valid" }));

    // 5xx triggert Stripe-Retry, 4xx wuerde den Webhook permanent verwerfen
    expect(res.status).toBe(500);
  });
});
