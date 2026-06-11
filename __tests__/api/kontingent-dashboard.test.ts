/**
 * @jest-environment node
 *
 * GET /api/kontingent/dashboard (B5): 503 ohne Config, 401 ohne Cookie,
 * 200 mit Codes. Identity + buyer-Lib gemockt.
 */
jest.mock("@/lib/wizard/identity", () => ({
  IDENTITY_COOKIE: "edufunds_identity",
  identityConfigured: jest.fn(() => true),
  verifyIdentity: jest.fn(),
}));
jest.mock("@/lib/payments/buyer", () => ({ listBuyerCodes: jest.fn() }));

import { GET } from "@/app/api/kontingent/dashboard/route";
import { identityConfigured, verifyIdentity } from "@/lib/wizard/identity";
import { listBuyerCodes } from "@/lib/payments/buyer";

const req = (cookieVal: string | null) =>
  ({ cookies: { get: () => (cookieVal ? { value: cookieVal } : undefined) } }) as never;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/kontingent/dashboard", () => {
  it("503 wenn nicht konfiguriert", async () => {
    (identityConfigured as jest.Mock).mockReturnValue(false);
    const res = await GET(req("x"));
    expect(res.status).toBe(503);
  });

  it("401 ohne gültigen Cookie", async () => {
    (identityConfigured as jest.Mock).mockReturnValue(true);
    (verifyIdentity as jest.Mock).mockReturnValue(null);
    const res = await GET(req(null));
    expect(res.status).toBe(401);
  });

  it("200 mit E-Mail + Codes", async () => {
    (identityConfigured as jest.Mock).mockReturnValue(true);
    (verifyIdentity as jest.Mock).mockReturnValue({ email: "a@b.de" });
    (listBuyerCodes as jest.Mock).mockResolvedValue([
      { code: "EDU-AAAA-AAAA", creditsTotal: 10, creditsUsed: 3, creditsRemaining: 7, source: "stripe", orgName: "X", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: null, expired: false, redemptions: [] },
    ]);
    const res = await GET(req("cookieval"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("a@b.de");
    expect(json.codes).toHaveLength(1);
    expect(json.codes[0].creditsRemaining).toBe(7);
  });
});
