/**
 * Hebel 3 — C5 Groessenordnungs-Plausibilitaet.
 * Probe Fall 10: DBU (Min 100k, Eigenanteil) wurde Top-Treffer fuer ein
 * ~9.500-EUR-Snack-Projekt. C5 macht den Groessen-Mismatch sichtbar (achtung_bei)
 * und demotet nur bei BELEGTER starker Ueberdimensionierung (Budget bekannt).
 */

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
  generateText: jest.fn(),
  generateJson: jest.fn(),
}));

import { generateText } from "@/lib/wizard/llm";
import { runMatch, sizeAchtung } from "@/lib/wizard/matcher";

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

// Reales Grossprojekt-Programm aus dem Katalog (min=100k).
const DBU_ID = "dbu-projektfoerderung-foerderthema-nachhaltigkeitskommunikation-und";

function prog(min: number | null, max: number | null) {
  return { id: "x", name: "X", foerdersummeMin: min, foerdersummeMax: max } as never;
}

describe("sizeAchtung (C5)", () => {
  it("kein Budget: markiert Grossprojekt-Schiene (min >= 100k)", () => {
    expect(sizeAchtung(prog(100000, 400000))).toMatch(/Grossprojekt-Foerderung/);
  });

  it("kein Budget: kein Hinweis fuer normales Programm (min < 100k)", () => {
    expect(sizeAchtung(prog(1000, 20000))).toBe("");
  });

  it("Budget bekannt: Programm-Min > Budget × 3 → Ueberdimensionierungs-Hinweis", () => {
    expect(sizeAchtung(prog(100000, 400000), 9500)).toMatch(/deutlich groesser/);
  });

  it("Budget bekannt: passendes Programm → kein Hinweis", () => {
    expect(sizeAchtung(prog(1000, 20000), 9500)).toBe("");
  });

  it("Budget bekannt: Budget > Programm-Max × 1.5 → Unterdimensionierungs-Hinweis", () => {
    expect(sizeAchtung(prog(1000, 20000), 80000)).toMatch(/kleiner als euer Vorhaben/);
  });

  it("ohne Foerdersummen-Daten: kein Hinweis (kein Fehlalarm)", () => {
    expect(sizeAchtung(prog(null, null), 9500)).toBe("");
    expect(sizeAchtung(prog(null, null))).toBe("");
  });
});

describe("runMatch — C5 Integration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("kein Budget: Grossprojekt-Programm erhaelt Grossprojekt-Hinweis in achtung_bei, KEINE Demotion", async () => {
    mockGenerateText.mockResolvedValue({
      value: `${DBU_ID}|70|Thematisch passend zum Nachhaltigkeitsanliegen der Schule.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const res = await runMatch({
      anliegen: "Wir wollen ein Projekt zu Nachhaltigkeit und Klimaschutz an unserer Schule starten.",
    });
    expect(res.kind).toBe("ranking");
    if (res.kind === "ranking") {
      const hit = res.matches.find((m) => m.id === DBU_ID)!;
      expect(hit).toBeDefined();
      expect(hit.achtung_bei).toMatch(/Grossprojekt-Foerderung/);
      expect(hit.score).toBe(70); // unveraendert ohne Budget
    }
  });

  it("Budget 9.500: Grossprojekt-Programm wird demotet (<=58) + Ueberdimensionierungs-Hinweis", async () => {
    mockGenerateText.mockResolvedValue({
      value: `${DBU_ID}|85|Thematisch passend zum Nachhaltigkeitsanliegen der Schule.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
    const res = await runMatch({
      anliegen: "Wir wollen ein kleines Projekt zu Nachhaltigkeit an unserer Grundschule starten.",
      geschaetztesBudgetEur: 9500,
    });
    expect(res.kind).toBe("ranking");
    if (res.kind === "ranking") {
      const hit = res.matches.find((m) => m.id === DBU_ID)!;
      expect(hit).toBeDefined();
      expect(hit.score).toBeLessThanOrEqual(58);
      expect(hit.achtung_bei).toMatch(/deutlich groesser/);
    }
  });
});
