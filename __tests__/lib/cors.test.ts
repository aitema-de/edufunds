import { isOriginAllowed } from "@/lib/cors";

describe("isOriginAllowed (Production-Policy)", () => {
  const prevEnv = process.env.NODE_ENV;
  const prevAllowed = process.env.ALLOWED_ORIGINS;

  beforeAll(() => {
    // NODE_ENV ist read-only typisiert -> via defineProperty setzen.
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.ALLOWED_ORIGINS;
  });
  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: prevEnv, configurable: true });
    if (prevAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = prevAllowed;
  });

  it("erlaubt die exakten Prod-/Staging-/Pilot-Origins", () => {
    expect(isOriginAllowed("https://app.edufunds.org")).toBe(true);
    expect(isOriginAllowed("https://edufunds.org")).toBe(true);
    expect(isOriginAllowed("https://staging.edufunds.org")).toBe(true);
    expect(isOriginAllowed("https://pilot.edufunds.org")).toBe(true);
  });

  it("lehnt beliebige Subdomains ab (kein Wildcard mehr)", () => {
    expect(isOriginAllowed("https://attacker.edufunds.org")).toBe(false);
    expect(isOriginAllowed("https://foo.edufunds.de")).toBe(false);
  });

  it("lehnt fremde/aehnliche Domains und null ab", () => {
    expect(isOriginAllowed("https://evil-edufunds.org")).toBe(false);
    expect(isOriginAllowed("https://edufunds.org.attacker.com")).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
  });
});
