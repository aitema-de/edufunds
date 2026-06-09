/**
 * @jest-environment node
 *
 * listBuyerCodes (B5): Mapping, Verbrauch/Remaining, Ablauf, Gruppierung der
 * Einlösungen je Code. DB gemockt.
 */
const mQuery = jest.fn();
jest.mock("@/lib/db", () => ({ query: (...a: unknown[]) => mQuery(...a) }));

import { listBuyerCodes } from "@/lib/payments/buyer";

beforeEach(() => jest.clearAllMocks());

describe("listBuyerCodes", () => {
  it("leeres Array, wenn keine Codes (nur 1 Query)", async () => {
    mQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const out = await listBuyerCodes("a@b.de");
    expect(out).toEqual([]);
    expect(mQuery).toHaveBeenCalledTimes(1);
  });

  it("mappt Codes + gruppiert Einlösungen + berechnet Remaining/Expired", async () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    mQuery
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { code: "EDU-AAAA-AAAA", credits_total: 10, credits_used: 3, source: "stripe", org_name: "Schule X", created_at: new Date("2026-06-01T00:00:00Z"), expires_at: future },
          { code: "EDU-BBBB-BBBB", credits_total: 5, credits_used: 5, source: "invoice", org_name: null, created_at: new Date("2026-05-01T00:00:00Z"), expires_at: past },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { code: "EDU-AAAA-AAAA", redeemed_at: new Date("2026-06-05T00:00:00Z"), redeemer_note: "Klasse 4b" },
          { code: "EDU-AAAA-AAAA", redeemed_at: new Date("2026-06-06T00:00:00Z"), redeemer_note: null },
        ],
      });

    const out = await listBuyerCodes("A@B.de");

    expect(out).toHaveLength(2);
    const a = out[0];
    expect(a.code).toBe("EDU-AAAA-AAAA");
    expect(a.creditsRemaining).toBe(7);
    expect(a.expired).toBe(false);
    expect(a.redemptions).toHaveLength(2);
    expect(a.redemptions[0].note).toBe("Klasse 4b");

    const b = out[1];
    expect(b.creditsRemaining).toBe(0);
    expect(b.expired).toBe(true);
    expect(b.redemptions).toEqual([]);

    // E-Mail normalisiert an die Query übergeben
    expect(mQuery.mock.calls[0][1]).toEqual(["a@b.de"]);
  });
});
