/**
 * Selbstheilung des Profilbaus deckt dieselben Maengel ab wie das Abbruch-Gate.
 *
 * Der Defekt (gefunden 05.08.2026, eingebaut am 03.08.2026): Das Gate brach auf
 * `unbelegteNichtwissen` ab, die Nachbesserungsschleife lief aber nur auf
 * `widersprueche`/`budgetVerletzung` — und der Reparatur-Prompt wies das Modell
 * ausdruecklich an, "nichtWissen" unveraendert zu lassen. Die einzige Fehlerklasse,
 * die der Profilbau nicht selbst beheben konnte, war damit genau die, an der er
 * scheiterte: `--refresh` endete zwangslaeufig mit Exit 1.
 *
 * Beobachtet an 25 Profilen: 7 blieben mit erfundenem Nichtwissen liegen, obwohl
 * zwei Nachbesserungsversuche zur Verfuegung standen.
 */
import { offeneMaengel, buildReparaturPrompt } from "@/scripts/eval-simuser";

const pruefung = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: "pv-test",
    widersprueche: [],
    fehlendeNichtwissen: [],
    unbelegteNichtwissen: [],
    budgetVerletzung: null,
    ...over,
  }) as never;

describe("offeneMaengel", () => {
  it("meldet ein sauberes Profil als mangelfrei", () => {
    expect(offeneMaengel(pruefung())).toBe(0);
  });

  // Der Kern des Defekts: erfundenes Nichtwissen muss die Schleife ueberhaupt
  // erst anwerfen. Zaehlte es nicht mit, liefe der Bau daran vorbei und broeche
  // danach ab.
  it("zählt erfundenes Nichtwissen mit", () => {
    expect(offeneMaengel(pruefung({ unbelegteNichtwissen: ["Weiß nicht, wie hoch das Budget ist."] }))).toBe(1);
  });

  it("zählt alle drei harten Klassen zusammen", () => {
    const pr = pruefung({
      widersprueche: [{ hintergrund: "h", nichtWissen: "n" }],
      unbelegteNichtwissen: ["a", "b"],
      budgetVerletzung: "9 Punkte (max 5)",
    });
    expect(offeneMaengel(pr)).toBe(4);
  });

  // `fehlendeNichtwissen` ist bewusst nur ein Hinweis: eine Korpus-Aeusserung ohne
  // Entsprechung macht die Person aermer, nicht unwahr. Sie darf keine
  // Nachbesserung ausloesen.
  it("lässt den blossen Hinweis fehlendeNichtwissen aussen vor", () => {
    expect(offeneMaengel(pruefung({ fehlendeNichtwissen: ["zur Frage: ..."] }))).toBe(0);
  });
});

describe("buildReparaturPrompt", () => {
  const eintrag = { id: "pv-test", category: "vag", schulProfil: {}, userAnswers: [] } as never;
  const profil = {
    rolle: "Schulleiterin",
    stil: "knapp",
    belegt: [],
    hintergrund: [],
    nichtWissen: ["Weiß nicht, wie hoch das Budget ist."],
  } as never;

  it("nennt die erfundenen Punkte wörtlich und verlangt ihre Streichung", () => {
    const p = buildReparaturPrompt(
      eintrag,
      profil,
      pruefung({ unbelegteNichtwissen: ["Weiß nicht, wie hoch das Budget ist."] })
    );
    expect(p).toContain("ERFUNDENES NICHTWISSEN");
    expect(p).toContain("Weiß nicht, wie hoch das Budget ist.");
    expect(p).toMatch(/ersatzlos/);
  });

  // Sonst tauschte die Nachbesserung eine Erfindung gegen die naechste: die Person
  // bekaeme Wissen zu einem Thema, zu dem der Datensatz schweigt.
  it("verbietet, das gestrichene Nichtwissen durch Hintergrundwissen zu ersetzen", () => {
    const p = buildReparaturPrompt(eintrag, profil, pruefung({ unbelegteNichtwissen: ["x"] }));
    expect(p).toMatch(/NICHT durch Hintergrundwissen/);
  });

  it("hält nichtWissen unangetastet, solange nichts erfunden ist", () => {
    const p = buildReparaturPrompt(
      eintrag,
      profil,
      pruefung({ widersprueche: [{ hintergrund: "etwa 30 Tablets", nichtWissen: "Weiß nicht, wie viele Tablets" }] })
    );
    expect(p).not.toContain("ERFUNDENES NICHTWISSEN");
    expect(p).toContain("WIDERSPRUECHE");
  });
});
