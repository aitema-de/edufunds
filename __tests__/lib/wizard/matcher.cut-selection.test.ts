/**
 * selectCutCandidates — deterministische Kandidaten-Auswahl vor dem LLM
 * (prefilter → QueueScore + themeBoost → Top-CUT_SIZE).
 *
 * Diese Funktion ist die isolierte, LLM-freie Stufe, die die Cut-Coverage-Eval
 * (scripts/eval-cut-coverage.ts) misst UND die runMatch produktiv nutzt — daher
 * hier festgenagelt, damit Eval und Produktion nicht auseinanderdriften.
 */

jest.mock("@/lib/wizard/llm", () => ({
  MODEL_FLASH: "deepseek-chat",
  MODEL_INTERVIEW: "deepseek-chat",
  MODEL_PIPELINE: "deepseek-chat",
  MODEL_PRO: "deepseek-chat",
  generateText: jest.fn(),
  generateJson: jest.fn(),
}));

import { selectCutCandidates, CUT_SIZE } from "@/lib/wizard/matcher";
import foerderprogrammeData from "@/data/foerderprogramme.json";

const programme = foerderprogrammeData as Array<{ id: string; status?: string; bundeslaender?: string[] }>;

describe("selectCutCandidates — Cut-Auswahl", () => {
  it("liefert hoechstens CUT_SIZE Kandidaten", () => {
    const sel = selectCutCandidates({ anliegen: "Wir wollen Tablets und Digitalisierung im Unterricht foerdern." });
    expect(sel.cut.length).toBeLessThanOrEqual(CUT_SIZE);
    expect(sel.cut.length).toBeGreaterThan(0);
  });

  it("cut = die ersten CUT_SIZE Eintraege von ranked (gleiche Reihenfolge)", () => {
    const sel = selectCutCandidates({ anliegen: "Schulgarten mit Hochbeeten und Umweltbildung anlegen." });
    const cutFromRanked = sel.ranked.slice(0, CUT_SIZE).map((c) => c.programm.id);
    expect(sel.cut.map((p) => p.id)).toEqual(cutFromRanked);
  });

  it("ranked ist absteigend nach sortScore sortiert", () => {
    const sel = selectCutCandidates({ anliegen: "Lesefoerderung und Sprachbildung fuer Grundschueler." });
    for (let i = 1; i < sel.ranked.length; i++) {
      expect(sel.ranked[i - 1].sortScore).toBeGreaterThanOrEqual(sel.ranked[i].sortScore);
    }
  });

  it("sortScore = queueScore + themeBoost (Aufschluesselung konsistent)", () => {
    const sel = selectCutCandidates({ anliegen: "Wir wollen was mit Tablets und Medienbildung machen." });
    for (const c of sel.ranked) {
      expect(c.sortScore).toBeCloseTo(c.queueScore + c.themeBoost, 5);
    }
  });

  it("prefilter: kein archiviertes/review_needed-Programm ueberlebt", () => {
    const sel = selectCutCandidates({ anliegen: "Irgendein foerderfaehiges Schulprojekt mit Budget." });
    for (const c of sel.ranked) {
      const status = (c.programm as { status?: string }).status;
      expect(status === "archiviert" || status === "review_needed").toBe(false);
    }
  });

  it("Bundesland-Filter: Landesprogramm eines anderen Landes faellt raus", () => {
    // Ein Programm finden, das explizit auf genau ein Land (nicht 'alle') gebunden ist.
    const landesProg = programme.find(
      (p) =>
        Array.isArray(p.bundeslaender) &&
        p.bundeslaender.length > 0 &&
        !p.bundeslaender.map((x) => x.toLowerCase()).includes("alle") &&
        p.status !== "archiviert" &&
        p.status !== "review_needed",
    );
    expect(landesProg).toBeDefined();
    const fremdesLand = landesProg!.bundeslaender!.some((b) => b.toUpperCase() === "DE-BY") ? "Hamburg" : "Bayern";
    const sel = selectCutCandidates({
      anliegen: "Ein passendes Schulprojekt mit klarem Anliegen und genuegend Text.",
      bundesland: fremdesLand,
    });
    expect(sel.ranked.find((c) => c.programm.id === landesProg!.id)).toBeUndefined();
  });

  it("themeBoost > 0 fuer Programm mit thematisch passendem Anliegen", () => {
    const sel = selectCutCandidates({ anliegen: "Wir wollen Tablets, WLAN und digitale Medien im Unterricht." });
    const boosted = sel.ranked.filter((c) => c.themeBoost > 0);
    expect(boosted.length).toBeGreaterThan(0);
  });

  it("deterministisch: zwei identische Aufrufe liefern identische Reihenfolge", () => {
    const input = { anliegen: "Forscher-AG mit MINT-Schwerpunkt und Experimenten aufbauen." };
    const a = selectCutCandidates(input).cut.map((p) => p.id);
    const b = selectCutCandidates(input).cut.map((p) => p.id);
    expect(a).toEqual(b);
  });
});
