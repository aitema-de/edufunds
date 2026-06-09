/**
 * @jest-environment node
 *
 * B4-Routen: verify (Magic-Link -> Cookie + Redirect), list (Cookie -> Liste),
 * bind-email (Session binden), magic-link (Link anfordern). Identity-Lib, Mail
 * und Resend gemockt; echtes next/server (node-Umgebung).
 */
jest.mock("@/lib/wizard/identity", () => ({
  IDENTITY_COOKIE: "edufunds_identity",
  COOKIE_MAX_AGE_SECONDS: 2592000,
  identityConfigured: jest.fn(() => true),
  consumeMagicLink: jest.fn(),
  signIdentity: jest.fn(() => "signed-xyz"),
  verifyIdentity: jest.fn(),
  listSessionsByEmail: jest.fn(),
  bindAuthorEmail: jest.fn(),
  createMagicLink: jest.fn(async () => "tok123"),
  normalizeEmail: (s: string) => s.trim().toLowerCase(),
}));
jest.mock("@/lib/wizard/identity-mail", () => ({
  buildMagicLinkEmail: () => ({ subject: "s", html: "h", text: "t" }),
}));
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn().mockResolvedValue({ id: "m1" }) } })),
}));

import { GET as verifyGET } from "@/app/api/antrag/verify/route";
import { GET as listGET } from "@/app/api/antrag/list/route";
import { POST as bindPOST } from "@/app/api/antrag/bind-email/route";
import { POST as magicPOST } from "@/app/api/antrag/magic-link/route";
import {
  consumeMagicLink,
  verifyIdentity,
  listSessionsByEmail,
  bindAuthorEmail,
} from "@/lib/wizard/identity";

const ORIG = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIG, RESEND_API_KEY: "re_test", NEXT_PUBLIC_APP_URL: "https://test.local" };
});
afterAll(() => {
  process.env = ORIG;
});

const verifyReq = (token: string | null) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(token ? `token=${token}` : "") },
    url: "http://localhost/api/antrag/verify" + (token ? `?token=${token}` : ""),
  }) as never;

const listReq = (cookieVal: string | null) =>
  ({ cookies: { get: () => (cookieVal ? { value: cookieVal } : undefined) } }) as never;

const jsonReq = (body: unknown) =>
  ({ json: async () => body, headers: { get: () => null }, url: "http://localhost/api/x" }) as never;

describe("GET /api/antrag/verify", () => {
  it("gültiger Token -> 307 Redirect (verified) + Identity-Cookie", async () => {
    (consumeMagicLink as jest.Mock).mockResolvedValue({ email: "a@b.de" });
    const res = await verifyGET(verifyReq("tok123"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("verified=1");
    expect(res.cookies.get("edufunds_identity")?.value).toBe("signed-xyz");
  });

  it("ungültiger/abgelaufener Token -> Redirect error=link, kein Cookie", async () => {
    (consumeMagicLink as jest.Mock).mockResolvedValue(null);
    const res = await verifyGET(verifyReq("bad"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=link");
    expect(res.cookies.get("edufunds_identity")).toBeUndefined();
  });

  it("ohne Token -> Redirect error=link", async () => {
    const res = await verifyGET(verifyReq(null));
    expect(res.headers.get("location")).toContain("error=link");
    expect(consumeMagicLink).not.toHaveBeenCalled();
  });
});

describe("GET /api/antrag/list", () => {
  it("kein/ungültiger Cookie -> 401", async () => {
    (verifyIdentity as jest.Mock).mockReturnValue(null);
    const res = await listGET(listReq(null));
    expect(res.status).toBe(401);
  });

  it("gültiger Cookie -> 200 mit E-Mail + Sessions", async () => {
    (verifyIdentity as jest.Mock).mockReturnValue({ email: "a@b.de" });
    (listSessionsByEmail as jest.Mock).mockResolvedValue([
      { sessionToken: "s1", programmId: "p1", programmName: "Prog 1", status: "in_progress", phase: "interviewing", paid: false, updatedAt: "2026-06-09T10:00:00.000Z" },
    ]);
    const res = await listGET(listReq("cookieval"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("a@b.de");
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].sessionToken).toBe("s1");
  });
});

describe("POST /api/antrag/bind-email", () => {
  it("400 bei fehlender E-Mail", async () => {
    const res = await bindPOST(jsonReq({ sessionToken: "sessiontoken-123" }));
    expect(res.status).toBe(400);
    expect(bindAuthorEmail).not.toHaveBeenCalled();
  });

  it("404 wenn Session nicht existiert", async () => {
    (bindAuthorEmail as jest.Mock).mockResolvedValue(false);
    const res = await bindPOST(jsonReq({ sessionToken: "sessiontoken-123", email: "a@b.de" }));
    expect(res.status).toBe(404);
  });

  it("200 + bindet + sendet Link", async () => {
    (bindAuthorEmail as jest.Mock).mockResolvedValue(true);
    const res = await bindPOST(jsonReq({ sessionToken: "sessiontoken-123", email: "a@b.de" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(bindAuthorEmail).toHaveBeenCalledWith("sessiontoken-123", "a@b.de");
  });
});

describe("POST /api/antrag/magic-link", () => {
  it("200 ok bei gültiger E-Mail", async () => {
    const res = await magicPOST(jsonReq({ email: "a@b.de" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("Honeypot gefüllt -> 200 ok ohne Versand", async () => {
    const { Resend } = await import("resend");
    const res = await magicPOST(jsonReq({ email: "a@b.de", website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(Resend as unknown as jest.Mock).not.toHaveBeenCalled();
  });

  it("400 bei ungültiger E-Mail", async () => {
    const res = await magicPOST(jsonReq({ email: "keine-mail" }));
    expect(res.status).toBe(400);
  });
});
