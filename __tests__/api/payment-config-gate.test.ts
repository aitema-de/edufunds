/**
 * @jest-environment node
 *
 * Regression fuer PAY-STRIPE-500:
 * Fehlende Stripe-Konfiguration -> sauberes 503 statt 500 mit Stacktrace,
 * fehlende Pflichtfelder -> 400.
 *
 * Frueher gegen die Pre-Launch-Routen /api/stripe/checkout + /api/paypal getestet.
 * Diese wurden beim Checkout-Cleanup entfernt; der einzige produktive Bezahlflow ist
 * /api/wizard/checkout (Stripe Standard-Payment, kein Connect). Der Config-Gate-Schutz
 * wird hier gegen genau diesen kanonischen Pfad abgesichert.
 */
import { POST } from "@/app/api/wizard/checkout/route";

// Wizard-Session-Lookup mocken: liefert eine gueltige, noch unbezahlte Session,
// damit der Request bis zum Config-Gate durchlaeuft.
jest.mock("@/lib/wizard/session", () => ({
  getWizardSession: jest.fn(async () => ({
    sessionToken: "sess_test",
    foerderprogrammId: "prog_test",
    paidToken: null,
  })),
}));

const req = (body: unknown) =>
  ({
    json: async () => body,
    headers: new Headers(),
    url: "http://localhost/api/wizard/checkout",
  }) as never;

describe("Wizard-Checkout: Config-Gate + Validierung", () => {
  const OLD_KEY = process.env.STRIPE_SECRET_KEY;
  const OLD_PRICE = process.env.STRIPE_PRICE_EINZELANTRAG;

  afterEach(() => {
    if (OLD_KEY === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = OLD_KEY;
    if (OLD_PRICE === undefined) delete process.env.STRIPE_PRICE_EINZELANTRAG;
    else process.env.STRIPE_PRICE_EINZELANTRAG = OLD_PRICE;
  });

  it("400, wenn sessionToken fehlt", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("503, wenn STRIPE_SECRET_KEY fehlt (statt 500)", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(req({ sessionToken: "sess_test" }));
    expect(res.status).toBe(503);
  });

  it("503, wenn Price-ID-Env fehlt (Key vorhanden)", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    delete process.env.STRIPE_PRICE_EINZELANTRAG;
    const res = await POST(req({ sessionToken: "sess_test" }));
    expect(res.status).toBe(503);
  });
});
