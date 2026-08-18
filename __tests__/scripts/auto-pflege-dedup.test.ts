import { filterUnknown } from "../../scripts/auto-pflege-step";

const namen = (eintraege: Array<[string, string]>) => {
  const m = new Map<string, Set<string>>();
  for (const [name, host] of eintraege) {
    const s = m.get(name) ?? new Set<string>();
    s.add(host);
    m.set(name, s);
  }
  return m;
};

describe("filterUnknown — Abgleich gegen den Katalog", () => {
  it("verwirft, was per URL schon im Katalog steht", () => {
    const r = filterUnknown(
      [{ name: "Neu", detailUrl: "https://x.de/a" }],
      namen([]),
      new Set(["https://x.de/a"])
    );
    expect(r).toHaveLength(0);
  });

  it("verwirft Namensgleichheit auf DEMSELBEN Host — dort ist es dasselbe Programm", () => {
    const r = filterUnknown(
      [{ name: "Förderfonds Demokratie", detailUrl: "https://stiftungbildung.org/neu-verschoben" }],
      namen([["förderfonds demokratie", "stiftungbildung.org"]]),
      new Set()
    );
    expect(r).toHaveLength(0);
  });

  it("behält Namensgleichheit auf einem ANDEREN Host — das sind zwei Programme", () => {
    // Gemessener Fall 18.08.2026: Der Katalog kennt einen „Förderfonds Demokratie" unter
    // foerderfonds-demokratie.de. Der gleichnamige Fonds der Stiftung Bildung ist ein anderes
    // Programm — beim reinen Namensvergleich wäre er dauerhaft unsichtbar geblieben.
    const r = filterUnknown(
      [
        {
          name: "Förderfonds Demokratie",
          detailUrl: "https://www.stiftungbildung.org/foerderfonds-demokratie",
        },
      ],
      namen([["förderfonds demokratie", "foerderfonds-demokratie.de"]]),
      new Set()
    );
    expect(r).toHaveLength(1);
  });

  it("behandelt www. und nicht-www. als denselben Host", () => {
    const r = filterUnknown(
      [{ name: "Programm A", detailUrl: "https://www.x.de/neu" }],
      namen([["programm a", "x.de"]]),
      new Set()
    );
    expect(r).toHaveLength(0);
  });

  it("entdoppelt innerhalb eines Laufs", () => {
    const r = filterUnknown(
      [
        { name: "A", detailUrl: "https://x.de/a" },
        { name: "A anders benannt", detailUrl: "https://x.de/a/" },
      ],
      namen([]),
      new Set()
    );
    expect(r).toHaveLength(1);
  });

  it("überspringt Kandidaten ohne Namen oder ohne URL", () => {
    const r = filterUnknown(
      [
        { name: "", detailUrl: "https://x.de/a" },
        { name: "B", detailUrl: "" },
      ],
      namen([]),
      new Set()
    );
    expect(r).toHaveLength(0);
  });
});
