/**
 * @jest-environment node
 *
 * fulfillQuotaCardPurchase (B3): Idempotenz pro Stripe-Session, Race-Sicherheit
 * gegen parallele Webhook-Zustellung, Paket-Validierung.
 */
const mQuery = jest.fn();
jest.mock("@/lib/db", () => ({ query: (...a: unknown[]) => mQuery(...a) }));

const mCreate = jest.fn();
jest.mock("@/lib/wizard/credit-codes", () => ({
  createCreditCode: (...a: unknown[]) => mCreate(...a),
}));

import { fulfillQuotaCardPurchase } from "@/lib/payments/orders";

beforeEach(() => jest.clearAllMocks());

describe("fulfillQuotaCardPurchase", () => {
  it("erzeugt neuen Code, wenn die Session noch unbekannt ist", async () => {
    mQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // findCodeByStripeSession
    mCreate.mockResolvedValueOnce({ code: "EDU-AAAA-BBBB", creditsTotal: 5 });

    const r = await fulfillQuotaCardPurchase({
      stripeSessionId: "cs_1",
      packId: "pack5",
      orgName: "Stadt X",
      email: "a@b.de",
    });

    expect(r.alreadyExisted).toBe(false);
    expect(r.creditCode).toBe("EDU-AAAA-BBBB");
    expect(r.credits).toBe(5);
    expect(r.amountCents).toBe(13990);
    expect(mCreate).toHaveBeenCalledWith(
      expect.objectContaining({ source: "stripe", stripeSessionId: "cs_1", creditsTotal: 5 })
    );
  });

  it("idempotent: bereits verarbeitete Session -> kein zweiter Code", async () => {
    mQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ code: "EDU-AAAA-BBBB", credits_total: 5, org_name: "Stadt X", purchaser_email: "a@b.de" }],
    });

    const r = await fulfillQuotaCardPurchase({ stripeSessionId: "cs_1", packId: "pack5" });

    expect(r.alreadyExisted).toBe(true);
    expect(r.creditCode).toBe("EDU-AAAA-BBBB");
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("Race: INSERT-Konflikt auf Session-Index -> Re-SELECT, alreadyExisted", async () => {
    mQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // erster SELECT: nichts
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ code: "EDU-RACE-WON1", credits_total: 5, org_name: null, purchaser_email: null }],
      }); // Re-SELECT nach Konflikt
    mCreate.mockRejectedValueOnce(
      Object.assign(new Error("dup"), { code: "23505", constraint: "uniq_credit_codes_stripe_session" })
    );

    const r = await fulfillQuotaCardPurchase({ stripeSessionId: "cs_1", packId: "pack5" });

    expect(r.alreadyExisted).toBe(true);
    expect(r.creditCode).toBe("EDU-RACE-WON1");
  });

  it("wirft bei unbekanntem Paket", async () => {
    await expect(
      fulfillQuotaCardPurchase({ stripeSessionId: "cs_1", packId: "pack999" })
    ).rejects.toThrow(/Paket/);
  });

  it("wirft bei Einzelantrag (kein Kontingent-Paket)", async () => {
    await expect(
      fulfillQuotaCardPurchase({ stripeSessionId: "cs_1", packId: "einzel" })
    ).rejects.toThrow(/Paket/);
  });
});
