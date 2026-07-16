/**
 * @jest-environment node
 *
 * POST /api/wizard/checkout/reconcile — Sicherheitsnetz bei ausbleibendem Webhook.
 *
 * Warum es diese Route gibt: Die Freischaltung haengt allein am Stripe-Webhook.
 * Bleibt der aus (z. B. weil der Endpoint im Dashboard nach dem Apex-Switch noch auf
 * app.edufunds.org zeigt — Stripe folgt Redirects nicht), hat der Kunde gezahlt und
 * bekommt nichts. Diese Tests sichern beides ab: dass der Rueckfall greift UND dass
 * er nicht zum Freifahrtschein wird.
 */
jest.mock("@/lib/stripe/client", () => ({
  getStripe: jest.fn(),
  stripeConfigured: jest.fn(() => true),
}));
jest.mock("@/lib/wizard/session", () => ({
  tryMarkSessionPaid: jest.fn(),
}));

import { POST } from "@/app/api/wizard/checkout/reconcile/route";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { tryMarkSessionPaid } from "@/lib/wizard/session";

const mStripe = getStripe as jest.Mock;
const mConfigured = stripeConfigured as jest.Mock;
const mMarkPaid = tryMarkSessionPaid as jest.Mock;

const req = (body: unknown) => ({ json: async () => body }) as never;

const TOKEN = "sess-token-abcdef123456";
const CS = "cs_test_a1b2c3";

/** Baut einen Stripe-Mock, dessen retrieve() die uebergebene Session liefert. */
function stripeReturning(session: unknown) {
  mStripe.mockReturnValue({
    checkout: { sessions: { retrieve: jest.fn(async () => session) } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mConfigured.mockReturnValue(true);
});

describe("POST /api/wizard/checkout/reconcile", () => {
  it("400 ohne sessionToken oder cs", async () => {
    expect((await POST(req({ cs: CS }))).status).toBe(400);
    expect((await POST(req({ sessionToken: TOKEN }))).status).toBe(400);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("400, wenn cs nicht wie eine Stripe-Session aussieht", async () => {
    const res = await POST(req({ sessionToken: TOKEN, cs: "beliebiger-string" }));
    expect(res.status).toBe(400);
    expect(mStripe).not.toHaveBeenCalled(); // gar nicht erst zu Stripe schicken
  });

  it("503, wenn Stripe nicht konfiguriert ist", async () => {
    mConfigured.mockReturnValue(false);
    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(503);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("409 und KEINE Freischaltung, wenn Stripe die Session als unbezahlt meldet", async () => {
    stripeReturning({ id: CS, payment_status: "unpaid", metadata: { wizard_session_token: TOKEN } });
    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(409);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  // Der wichtigste Sicherheitstest: Die cs steht in der Redirect-URL und ist damit
  // kein Geheimnis. Wer eine FREMDE bezahlte cs kennt, darf damit nichts anfangen.
  it("404, wenn die Zahlung zu einem ANDEREN Antrag gehoert (fremde cs)", async () => {
    stripeReturning({
      id: CS,
      payment_status: "paid",
      metadata: { wizard_session_token: "ein-ganz-anderer-token" },
    });
    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(404);
    expect(mMarkPaid).not.toHaveBeenCalled(); // nichts freigeschaltet
  });

  it("404, wenn Stripe gar keinen Token in den Metadaten hat", async () => {
    stripeReturning({ id: CS, payment_status: "paid", metadata: {} });
    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(404);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("schaltet frei, wenn Stripe 'paid' meldet und der Token passt", async () => {
    stripeReturning({
      id: CS,
      payment_status: "paid",
      metadata: { wizard_session_token: TOKEN, tier: "einzelantrag" },
      customer_details: { email: "kaeufer@schule.de" },
    });
    mMarkPaid.mockResolvedValue({ session: { paidToken: "paid-uuid" }, didSet: true });

    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, paidToken: "paid-uuid", recovered: true });

    // Freigeschaltet wird der Token aus den STRIPE-METADATEN, nie der aus dem Request.
    expect(mMarkPaid).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({
        source: "card",
        stripeSessionId: CS,
        stripeCustomerEmail: "kaeufer@schule.de",
      }),
    );
  });

  it("ist idempotent: hat der Webhook schon freigeschaltet, wird nicht gedoppelt", async () => {
    stripeReturning({
      id: CS,
      payment_status: "paid",
      metadata: { wizard_session_token: TOKEN },
    });
    // didSet=false -> war bereits bezahlt (Webhook war schneller)
    mMarkPaid.mockResolvedValue({ session: { paidToken: "paid-uuid" }, didSet: false });

    const res = await POST(req({ sessionToken: TOKEN, cs: CS }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, paidToken: "paid-uuid", recovered: false });
  });
});
