/**
 * @jest-environment node
 *
 * Branch-Logik von POST /api/kontingent/checkout (B3, Stripe gemockt):
 * Validierung, Paket-Pruefung, 503 ohne Stripe, Erfolg mit korrekten Metadaten.
 */
jest.mock("@/lib/stripe/client", () => ({
  getStripe: jest.fn(),
  stripeConfigured: jest.fn(),
}));

import { POST } from "@/app/api/kontingent/checkout/route";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";

const req = (body: unknown) =>
  ({ json: async () => body, headers: { get: () => null }, url: "http://localhost/api/kontingent/checkout" }) as never;

const valid = { packId: "pack5", orgName: "Stadt Musterhausen", email: "beschaffung@musterhausen.de" };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://test.local";
  (stripeConfigured as jest.Mock).mockReturnValue(true);
});

describe("POST /api/kontingent/checkout", () => {
  it("400 bei fehlenden Pflichtfeldern", async () => {
    const res = await POST(req({ packId: "pack5" }));
    expect(res.status).toBe(400);
  });

  it("400 bei ungueltiger E-Mail", async () => {
    const res = await POST(req({ ...valid, email: "keine-mail" }));
    expect(res.status).toBe(400);
  });

  it("400 bei unbekanntem Paket", async () => {
    const res = await POST(req({ ...valid, packId: "pack999" }));
    expect(res.status).toBe(400);
  });

  it("400 wenn Einzelantrag (kein Kontingent-Paket)", async () => {
    const res = await POST(req({ ...valid, packId: "einzel" }));
    expect(res.status).toBe(400);
  });

  it("503 wenn Stripe nicht konfiguriert ist", async () => {
    (stripeConfigured as jest.Mock).mockReturnValue(false);
    const res = await POST(req(valid));
    expect(res.status).toBe(503);
  });

  it("Erfolg: erzeugt Checkout-Session mit org_quota-Metadaten + Pack-Preis", async () => {
    const create = jest.fn().mockResolvedValue({ url: "https://stripe.test/cs", id: "cs_test_x" });
    (getStripe as jest.Mock).mockReturnValue({ checkout: { sessions: { create } } });

    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe("https://stripe.test/cs");

    const arg = create.mock.calls[0][0];
    expect(arg.mode).toBe("payment");
    expect(arg.customer_email).toBe(valid.email);
    expect(arg.line_items[0].price_data.unit_amount).toBe(13990); // pack5 brutto
    expect(arg.line_items[0].price_data.currency).toBe("eur");
    expect(arg.metadata).toMatchObject({
      mode: "org_quota",
      pack_id: "pack5",
      org_name: valid.orgName,
      purchaser_email: valid.email,
    });
    expect(arg.success_url).toContain("bezahlt=1");
    expect(arg.success_url).toContain("{CHECKOUT_SESSION_ID}");
  });

  it("500 wenn Stripe wirft", async () => {
    const create = jest.fn().mockRejectedValue(new Error("stripe down"));
    (getStripe as jest.Mock).mockReturnValue({ checkout: { sessions: { create } } });
    const res = await POST(req(valid));
    expect(res.status).toBe(500);
  });
});
