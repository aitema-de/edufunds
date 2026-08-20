/**
 * Dubletten-Detektor.
 *
 * Ursprung: Tester-Feedback #008 vom 19.08.2026. Im Abschnitt "Finanzierung und
 * Mengengerüst" von Antrag 37 standen zwei Sätze, die dasselbe sagen — der
 * Tester nannte es "besonders auffällig". Die Ursache ist strukturell: Drei
 * chirurgische Reparaturstufen sollen Sätze ERSETZEN, ein Sprachmodell kann
 * dabei aber anfügen.
 */
import {
  findeDubletten,
  entferneDubletten,
  aehnlichkeit,
  istVorsichtig,
} from "@/lib/wizard/dubletten";

/** Die beiden echten Sätze aus Antrag 37. */
const VORSICHTIG =
  "Ein möglicher Ansatz ist, die Folgekosten für Ersatz, Reparatur und punktuelle Ergänzungen perspektivisch in die reguläre Material- und Ausstattungsplanung der Schule aufzunehmen.";
const BEHAUPTEND =
  "Die Folgekosten für Ersatz, Reparatur und punktuelle Ergänzungen sollen perspektivisch in die reguläre Material- und Ausstattungsplanung der Schule aufgenommen werden.";

describe("aehnlichkeit", () => {
  it("erkennt den echten Dubletten-Fall", () => {
    // Jaccard über die Vereinigungsmenge käme hier nur auf 0,71 und hätte die
    // Dublette verfehlt — der Unterschied ist bloss die Marker-Phrase plus eine
    // Flexionsform ("aufzunehmen"/"aufgenommen").
    expect(aehnlichkeit(VORSICHTIG, BEHAUPTEND)).toBeGreaterThan(0.85);
  });

  it("hält inhaltlich verschiedene Sätze auseinander", () => {
    const a = "Das Projekt fördert die Lesekompetenz von Kindern der Klassen eins bis vier.";
    const b = "Die Evaluation erfolgt durch eine externe Fachkraft am Ende der Projektlaufzeit.";
    expect(aehnlichkeit(a, b)).toBeLessThan(0.3);
  });

  it("ein kurzer Satz im langen ist noch keine Dublette", () => {
    // Overlap allein wäre hier 1,0 — die Dichte-Schranke verhindert den
    // Falsch-Positiv.
    const kurz = "Das Projekt fördert die Lesekompetenz der Kinder nachhaltig.";
    const lang =
      "Das Projekt fördert die Lesekompetenz der Kinder nachhaltig, indem wöchentliche Vorlesepatenschaften mit ehrenamtlichen Helfern aus dem Stadtteil aufgebaut, durch Fortbildungen begleitet und mit Lesetagebüchern dokumentiert werden.";
    expect(aehnlichkeit(kurz, lang)).toBe(0);
  });
});

describe("istVorsichtig", () => {
  it("erkennt die Marker der Reparaturstufen", () => {
    expect(istVorsichtig(VORSICHTIG)).toBe(true);
    expect(istVorsichtig("Die Kosten liegen [Annahme: bei etwa 5.000 EUR].")).toBe(true);
    expect(istVorsichtig("[TODO: Stundensatz vor Einreichung belegen]")).toBe(true);
    expect(istVorsichtig("Ein Sponsor könnte die Restfinanzierung übernehmen.")).toBe(true);
  });

  it("eine glatte Tatsachenbehauptung ist nicht vorsichtig", () => {
    expect(istVorsichtig(BEHAUPTEND)).toBe(false);
    expect(istVorsichtig("Der Förderverein hat die Finanzierung zugesagt.")).toBe(false);
  });
});

describe("findeDubletten", () => {
  it("findet die Dublette aus Antrag 37 und benennt den Abschnitt", () => {
    const text = `# Antrag\n\n## Finanzierung und Mengengerüst\n\n${VORSICHTIG} ${BEHAUPTEND}`;
    const d = findeDubletten(text);
    expect(d).toHaveLength(1);
    expect(d[0].abschnitt).toBe("Finanzierung und Mengengerüst");
    expect(d[0].aehnlichkeit).toBeGreaterThan(0.85);
  });

  it("BEHÄLT die vorsichtige Fassung, auch wenn sie die kürzere ist", () => {
    // Der wichtigste Test hier. Entschiede allein die Wortzahl, könnte der
    // Detektor die entschärfte Fassung löschen und die unbelegte Behauptung
    // behalten — er würde damit die Arbeit von Halluzinations-Gate und
    // Fakt-Verifikation rückgängig machen.
    // Bewusst so gebaut, dass die vorsichtige Fassung WENIGER bedeutungstragende
    // Wörter hat (7 gegen 8) — sonst würde der Test die Priorisierung gar nicht
    // prüfen, weil ohnehin die längere Fassung gewönne.
    const kurzVorsichtig =
      "[Annahme: Die Folgekosten für Ersatz und Reparatur werden aus dem regulären Schuletat gedeckt.]";
    const langBehauptend =
      "Die Folgekosten für Ersatz und Reparatur werden aus dem regulären Schuletat der Schule dauerhaft gedeckt.";
    const text = `## Nachhaltigkeit\n\n${kurzVorsichtig} ${langBehauptend}`;
    const d = findeDubletten(text);
    expect(d).toHaveLength(1);
    expect(d[0].behalten).toBe(kurzVorsichtig);
    expect(d[0].redundant).toBe(langBehauptend);
  });

  it("Wiederholung über ABSCHNITTE hinweg ist erlaubt", () => {
    // Förderanträge werden feldweise gelesen — dort ist Wiederholung normal und
    // oft gewollt. Auffällig ist nur die Dopplung im selben Abschnitt.
    const text = `## Ziele\n\n${BEHAUPTEND}\n\n## Nachhaltigkeit\n\n${BEHAUPTEND}`;
    expect(findeDubletten(text)).toHaveLength(0);
  });

  it("kurze Sätze lösen nichts aus", () => {
    const text = "## Ziele\n\nDas Projekt ist nachhaltig. Das Projekt ist nachhaltig.";
    expect(findeDubletten(text)).toHaveLength(0);
  });

  it("ein sauberer Text bleibt unbeanstandet", () => {
    const text = `## Ziele\n\nDas Vorhaben stärkt die Lesekompetenz von rund vierzig Kindern der Jahrgangsstufen eins bis vier. Die Evaluation übernimmt eine externe Fachkraft am Ende der Projektlaufzeit im Sommer.`;
    expect(findeDubletten(text)).toHaveLength(0);
  });

  it("meldet jeden Satz nur einmal, auch bei drei ähnlichen", () => {
    const a = "Die Folgekosten für Ersatz und Reparatur werden aus dem Schuletat gedeckt.";
    const b = "Die Folgekosten für Ersatz und Reparatur sollen aus dem Schuletat gedeckt werden.";
    const c = "Die Folgekosten für Ersatz und Reparatur deckt künftig der Schuletat.";
    const d = findeDubletten(`## Nachhaltigkeit\n\n${a} ${b} ${c}`);
    const entfernte = d.map((x) => x.redundant);
    expect(new Set(entfernte).size).toBe(entfernte.length);
  });
});

describe("entferneDubletten", () => {
  it("entfernt exakt den redundanten Satz und lässt den Rest unangetastet", () => {
    const text = `# Antrag\n\n## Finanzierung und Mengengerüst\n\nDer Plan umfasst mehrere Posten. ${VORSICHTIG} ${BEHAUPTEND} Die Mittel werden zweckgebunden eingesetzt.`;
    const bereinigt = entferneDubletten(text, findeDubletten(text));
    expect(bereinigt).toContain(VORSICHTIG);
    expect(bereinigt).not.toContain(BEHAUPTEND);
    expect(bereinigt).toContain("Der Plan umfasst mehrere Posten.");
    expect(bereinigt).toContain("Die Mittel werden zweckgebunden eingesetzt.");
  });

  it("erhält die Abschnitts-Struktur", () => {
    const text = `# Antrag\n\n## Ziele\n\nEin Satz zu den Zielen des Vorhabens steht hier.\n\n## Finanzierung\n\n${VORSICHTIG} ${BEHAUPTEND}`;
    const bereinigt = entferneDubletten(text, findeDubletten(text));
    expect((bereinigt.match(/^## /gm) ?? []).length).toBe(2);
    expect(bereinigt).toContain("# Antrag");
  });

  it("hinterlässt keine doppelten Leerzeichen oder leeren Absätze", () => {
    const text = `## Finanzierung\n\n${VORSICHTIG} ${BEHAUPTEND}`;
    const bereinigt = entferneDubletten(text, findeDubletten(text));
    expect(bereinigt).not.toMatch(/ {2,}/);
    expect(bereinigt).not.toMatch(/\n{3,}/);
  });

  it("ohne Befunde bleibt der Text bitgenau (bis auf Trim)", () => {
    const text = "## Ziele\n\nEin einzelner, klarer Satz über das Vorhaben und seine Wirkung.";
    expect(entferneDubletten(text, [])).toBe(text);
  });
});
