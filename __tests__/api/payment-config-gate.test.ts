/**
 * @jest-environment node
 *
 * Regression fuer PAY-STRIPE-500 / PAY-PAYPAL-500:
 * Fehlende Keys/Credentials -> sauberes 503 statt 500 mit Stacktrace.
 * Fehlende/ungueltige Felder -> 400 statt 500.
 */
import { POST as stripePost } from "@/app/api/stripe/checkout/route";
import { POST as paypalPost, PUT as paypalPut } from "@/app/api/paypal/route";

const req = (body: unknown) => ({ json: async () => body }) as never;

describe("Stripe-Checkout: Config-Gate + Validierung", () => {
  const OLD = process.env.STRIPE_SECRET_KEY;
  afterEach(() => {
    if (OLD === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = OLD;
  });

  it("503, wenn STRIPE_SECRET_KEY fehlt (statt 500)", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await stripePost(req({}));
    expect(res.status).toBe(503);
  });

  it("400 bei ungueltigem/fehlendem productType (Key vorhanden)", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const res = await stripePost(req({}));
    expect(res.status).toBe(400);
  });

  it("400, wenn customerData.email fehlt", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const res = await stripePost(req({ productType: "einzel" }));
    expect(res.status).toBe(400);
  });
});

describe("PayPal: Config-Gate + Validierung", () => {
  const OLDID = process.env.PAYPAL_CLIENT_ID;
  const OLDSEC = process.env.PAYPAL_CLIENT_SECRET;
  afterEach(() => {
    if (OLDID === undefined) delete process.env.PAYPAL_CLIENT_ID;
    else process.env.PAYPAL_CLIENT_ID = OLDID;
    if (OLDSEC === undefined) delete process.env.PAYPAL_CLIENT_SECRET;
    else process.env.PAYPAL_CLIENT_SECRET = OLDSEC;
  });

  it("503, wenn Credentials fehlen (POST)", async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    const res = await paypalPost(req({}));
    expect(res.status).toBe(503);
  });

  it("503, wenn Credentials fehlen (PUT)", async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    const res = await paypalPut(req({ orderId: "x" }));
    expect(res.status).toBe(503);
  });

  it("400 bei ungueltigem productType (Credentials vorhanden)", async () => {
    process.env.PAYPAL_CLIENT_ID = "id";
    process.env.PAYPAL_CLIENT_SECRET = "sec";
    const res = await paypalPost(req({}));
    expect(res.status).toBe(400);
  });
});
