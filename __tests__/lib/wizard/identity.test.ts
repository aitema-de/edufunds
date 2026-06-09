/**
 * @jest-environment node
 *
 * Identity-Cookie (HMAC) + Normalisierung (B4). DB-Funktionen sind separat
 * über die Route-Tests abgedeckt; hier nur die reine Krypto-Logik.
 */
jest.mock("@/lib/db", () => ({ query: jest.fn() }));

import {
  signIdentity,
  verifyIdentity,
  normalizeEmail,
  COOKIE_MAX_AGE_SECONDS,
  identityConfigured,
} from "@/lib/wizard/identity";

const ORIG = process.env;
beforeEach(() => {
  process.env = { ...ORIG, JWT_SECRET: "0123456789abcdef-test-secret" };
});
afterAll(() => {
  process.env = ORIG;
});

describe("identity — Cookie sign/verify", () => {
  it("Roundtrip liefert normalisierte E-Mail", () => {
    const token = signIdentity("  Max@Schule.DE  ");
    expect(verifyIdentity(token)).toEqual({ email: "max@schule.de" });
  });

  it("verändertes Token -> null (Manipulationsschutz)", () => {
    const token = signIdentity("a@b.de");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyIdentity(tampered)).toBeNull();
  });

  it("abgelaufenes Token -> null", () => {
    const token = signIdentity("a@b.de", 1000);
    const wayLater = 1000 + (COOKIE_MAX_AGE_SECONDS + 60) * 1000;
    expect(verifyIdentity(token, wayLater)).toBeNull();
  });

  it("anderes Secret -> null", () => {
    const token = signIdentity("a@b.de");
    process.env.JWT_SECRET = "ein-voellig-anderes-secret-xyz";
    expect(verifyIdentity(token)).toBeNull();
  });

  it("leer/garbage -> null", () => {
    expect(verifyIdentity(null)).toBeNull();
    expect(verifyIdentity("")).toBeNull();
    expect(verifyIdentity("kein-punkt")).toBeNull();
  });

  it("identityConfigured spiegelt JWT_SECRET", () => {
    expect(identityConfigured()).toBe(true);
    delete process.env.JWT_SECRET;
    expect(identityConfigured()).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trimmt und kleinschreibt", () => {
    expect(normalizeEmail("  Foo@Bar.DE ")).toBe("foo@bar.de");
  });
});
