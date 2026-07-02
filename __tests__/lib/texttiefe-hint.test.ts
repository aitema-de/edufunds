/**
 * P3-B (Feedback 24.06.): Texttiefe-Direktive. "standard"/undefined → leer (eval-neutral),
 * "knapp"/"ausfuehrlich" überschreiben die Standard-Längenvorgabe.
 */
import { texttiefeHint } from "@/lib/wizard/prompts";

describe("texttiefeHint", () => {
  it("ist leer für standard/undefined (kein Prompt-/Eval-Effekt)", () => {
    expect(texttiefeHint("standard")).toBe("");
    expect(texttiefeHint(undefined)).toBe("");
  });

  it("liefert eine knappe Direktive", () => {
    const h = texttiefeHint("knapp");
    expect(h).toContain("KNAPP");
    expect(h).toContain("100–200");
  });

  it("liefert eine ausführliche Direktive", () => {
    const h = texttiefeHint("ausfuehrlich");
    expect(h).toContain("AUSFÜHRLICH");
    expect(h).toContain("300–550");
  });
});
