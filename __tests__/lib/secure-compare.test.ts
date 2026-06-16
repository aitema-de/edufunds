import { secureEquals } from "@/lib/secure-compare";

describe("secureEquals", () => {
  it("gibt true bei identischen Strings", () => {
    expect(secureEquals("geheim-123", "geheim-123")).toBe(true);
  });

  it("gibt false bei abweichendem Inhalt gleicher Laenge", () => {
    expect(secureEquals("geheim-123", "geheim-124")).toBe(false);
  });

  it("gibt false bei unterschiedlicher Laenge", () => {
    expect(secureEquals("kurz", "viel-laenger")).toBe(false);
  });

  it("gibt false wenn ein Wert fehlt (null/undefined/leer)", () => {
    expect(secureEquals(null, "x")).toBe(false);
    expect(secureEquals("x", undefined)).toBe(false);
    expect(secureEquals("", "")).toBe(false);
    expect(secureEquals(undefined, null)).toBe(false);
  });

  it("behandelt Unicode korrekt (UTF-8-Bytes)", () => {
    expect(secureEquals("schlüssel-ä", "schlüssel-ä")).toBe(true);
    expect(secureEquals("schlüssel-ä", "schlussel-a")).toBe(false);
  });
});
