/**
 * @jest-environment node
 *
 * trustedAppUrl (kein Header-Fallback) + sanitizeNext (Open-Redirect-Schutz).
 */
import { trustedAppUrl, sanitizeNext } from "@/lib/app-url";

const ORIG = process.env;
beforeEach(() => {
  process.env = { ...ORIG };
});
afterAll(() => {
  process.env = ORIG;
});

describe("trustedAppUrl", () => {
  it("liefert getrimmte URL aus NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pilot.edufunds.org/";
    expect(trustedAppUrl()).toBe("https://pilot.edufunds.org");
  });
  it("null wenn nicht gesetzt", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(trustedAppUrl()).toBeNull();
  });
  it("null bei fehlendem Schema", () => {
    process.env.NEXT_PUBLIC_APP_URL = "pilot.edufunds.org";
    expect(trustedAppUrl()).toBeNull();
  });
});

describe("sanitizeNext", () => {
  it("erlaubt lokale Pfade", () => {
    expect(sanitizeNext("/kontingent/uebersicht")).toBe("/kontingent/uebersicht");
    expect(sanitizeNext("/antrag/meine")).toBe("/antrag/meine");
  });
  it("blockt protocol-relative + absolute URLs", () => {
    expect(sanitizeNext("//evil.com")).toBeNull();
    expect(sanitizeNext("https://evil.com")).toBeNull();
    expect(sanitizeNext("http://evil.com")).toBeNull();
  });
  it("blockt Query/Fragmente/leere Werte", () => {
    expect(sanitizeNext("/a?b=1")).toBeNull();
    expect(sanitizeNext("/a#x")).toBeNull();
    expect(sanitizeNext("")).toBeNull();
    expect(sanitizeNext(null)).toBeNull();
    expect(sanitizeNext("kein-slash")).toBeNull();
  });
});
