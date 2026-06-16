/**
 * Hebel 3 — Quick-Wins:
 * (C3) Theme-Alias-Cluster: umgangssprachliche Anliegen-Begriffe ziehen die
 *      richtigen kanonischen Kategorien-Cluster → Domain-Programme kommen in den
 *      LLM-Cut statt Rueckfall auf Default-Magnete.
 * (C1) prefilter-Status-Bug: nicht-aktive Programme (archiviert/review_needed)
 *      werden ausgeschlossen (vorher prueft der Code "abgelaufen" = wirkungslos).
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
import { extractAnliegenThemes, runMatch } from "@/lib/wizard/matcher";
import { isProgrammAbgelaufen } from "@/lib/programm-status";
import foerderprogrammeData from "@/data/foerderprogramme.json";

const programme = foerderprogrammeData as Array<{ id: string; status?: string }>;
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

describe("extractAnliegenThemes — Alias-Cluster (C3)", () => {
  it("Tablets (umgangssprachlich) → digitalisierung-Cluster", () => {
    const t = extractAnliegenThemes("Wir wollen was mit Tablets machen.");
    expect(t.has("digitalisierung")).toBe(true);
    expect(t.has("digital")).toBe(true);
    expect(t.has("medienbildung")).toBe(true);
  });

  it("programmieren → MINT/Informatik-Cluster", () => {
    const t = extractAnliegenThemes("Kinder sollen programmieren lernen oder so.");
    expect(t.has("informatik")).toBe(true);
    expect(t.has("mint")).toBe(true);
    expect(t.has("robotik")).toBe(true);
  });

  it("Mobbing → Demokratie/Soziales-Cluster", () => {
    const t = extractAnliegenThemes("Irgendwas gegen Mobbing.");
    expect(t.has("demokratie")).toBe(true);
    expect(t.has("gewaltpraevention")).toBe(true);
    expect(t.has("soziales")).toBe(true);
  });

  it("gesundes Essen → Gesundheit/Ernaehrung-Cluster", () => {
    const t = extractAnliegenThemes("Gesundes Essen zum Thema machen.");
    expect(t.has("gesundheit")).toBe(true);
    expect(t.has("ernaehrung")).toBe(true);
    expect(t.has("alltagskompetenzen")).toBe(true);
  });

  it("naturkundliche Exkursion / Aquarium → Naturwissenschaft-Cluster (ev-015)", () => {
    const t = extractAnliegenThemes("Schul-Aquarium und naturkundliche Exkursionen.");
    expect(t.has("naturwissenschaft")).toBe(true);
    expect(t.has("biologie")).toBe(true);
    expect(t.has("mint")).toBe(true);
  });

  it("Konzert(fahrten) → Kultur-Cluster (ev-027)", () => {
    const t = extractAnliegenThemes("Schulchor und Konzertfahrten foerdern.");
    expect(t.has("kultur")).toBe(true);
    expect(t.has("musik")).toBe(true);
  });

  it("Synonym-Split: 'digital' zieht auch 'digitalisierung' (20× vs 4×)", () => {
    const t = extractAnliegenThemes("Wir moechten den digitalen Unterricht staerken.");
    expect(t.has("digital")).toBe(true);
    expect(t.has("digitalisierung")).toBe(true);
  });

  it("exakter Kategorie-Match bleibt erhalten (lesen)", () => {
    const t = extractAnliegenThemes("Wir wollen das Lesen foerdern.");
    expect(t.has("lesen")).toBe(true);
    expect(t.has("sprache")).toBe(true);
  });

  it("kein False-Positive: 'Kinder' triggert nicht 'ki'", () => {
    const t = extractAnliegenThemes("Wir haben viele Kinder an der Schule.");
    expect(t.has("ki")).toBe(false);
  });
});

describe("prefilter — Status-Filter (C1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Gueltige Ranking-Zeile, damit runMatch den ranking-Pfad nimmt.
    const firstAktiv = programme.find((p) => p.status === "aktiv")!.id;
    mockGenerateText.mockResolvedValue({
      value: `${firstAktiv}|80|Passt thematisch zum Anliegen der Schule gut.|`,
      usage: { promptTokens: 100, candidatesTokens: 50 },
    });
  });

  it("totalCandidates schliesst archiviert + review_needed + abgelaufen aus", async () => {
    // Der prefilter im Matcher schliesst drei Klassen aus:
    //  1. status === "archiviert"
    //  2. status === "review_needed"
    //  3. abgelaufene Programme (Frist-Ende in der Vergangenheit, isProgrammAbgelaufen)
    // totalCandidates = prefilter-Ueberlebende; filteredOut = Gesamt - Ueberlebende.
    const survivors = programme.filter(
      (p) =>
        p.status !== "archiviert" &&
        p.status !== "review_needed" &&
        !isProgrammAbgelaufen(p as never)
    );
    const erwartet = survivors.length;
    const ausgeschlossen = programme.length - erwartet;
    expect(ausgeschlossen).toBeGreaterThan(0); // sanity: es gibt ausgefilterte Programme

    // Sanity: Status-Filter UND Ablauf-Filter greifen beide (sonst testet der
    // Test versehentlich nur eine der beiden Bedingungen).
    const nurStatus = programme.filter(
      (p) => p.status !== "archiviert" && p.status !== "review_needed"
    ).length;
    expect(erwartet).toBeLessThan(nurStatus); // d. h. mind. ein Programm ist abgelaufen

    const res = await runMatch({
      anliegen: "Wir wollen die Schulbibliothek mit neuen Buechern ausstatten und Lesen foerdern.",
    });

    expect(res.kind).toBe("ranking");
    if (res.kind === "ranking") {
      expect(res.totalCandidates).toBe(erwartet);
      expect(res.filteredOut).toBe(ausgeschlossen);
    }
  });
});
