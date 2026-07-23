import { markdownToRtf } from "@/lib/export/rtf";

describe("markdownToRtf", () => {
  it("erzeugt einen gueltigen RTF-Rahmen", () => {
    const rtf = markdownToRtf("Hallo Welt");
    expect(rtf.startsWith("{\\rtf1")).toBe(true);
    expect(rtf.trim().endsWith("}")).toBe(true);
    expect(rtf).toContain("Hallo Welt");
  });

  it("kodiert Umlaute, ß und € als \\uN? (kein Mojibake)", () => {
    const rtf = markdownToRtf("Förderung für Schüler kostet 30€ — groß");
    // ASCII bleibt, Nicht-ASCII wird als Unicode-Escape kodiert
    expect(rtf).toContain("F\\u246?rderung"); // ö = 246
    expect(rtf).toContain("f\\u252?r"); // ü = 252
    expect(rtf).toContain("Sch\\u252?ler");
    expect(rtf).toContain("30\\u8364?"); // € = 8364
    expect(rtf).toContain("gro\\u223?"); // ß = 223
    // Roher Umlaut darf NICHT im RTF stehen
    expect(rtf).not.toMatch(/ö|ü|ß|€/);
  });

  it("setzt **fett** in RTF-Fettlauf um", () => {
    const rtf = markdownToRtf("Das ist **wichtig** hier");
    expect(rtf).toContain("\\b wichtig\\b0");
  });

  it("uebernimmt Ueberschriften und Listen", () => {
    const rtf = markdownToRtf("# Titel\n\n## Abschnitt\n\n- Punkt eins\n- Punkt zwei");
    expect(rtf).toContain("\\fs36 Titel");
    expect(rtf).toContain("\\fs30 Abschnitt");
    expect(rtf).toContain("\\bullet\\tab Punkt eins");
  });

  it("escaped RTF-Steuerzeichen \\ { }", () => {
    const rtf = markdownToRtf("Pfad C:\\Ordner {Wert}");
    expect(rtf).toContain("C:\\\\Ordner");
    expect(rtf).toContain("\\{Wert\\}");
  });

  it("stellt einen optionalen Titel fett voran", () => {
    const rtf = markdownToRtf("Inhalt", "Mein Antrag");
    expect(rtf).toContain("\\b\\fs36 Mein Antrag\\b0");
    expect(rtf.indexOf("Mein Antrag")).toBeLessThan(rtf.indexOf("Inhalt"));
  });

  it("kommt mit leerem Input klar", () => {
    expect(() => markdownToRtf("")).not.toThrow();
    expect(markdownToRtf("").startsWith("{\\rtf1")).toBe(true);
  });

  // AI-Act Art. 50(2): Die maschinenlesbare Kennzeichnung muss im RTF-\info-Block
  // stehen (Dokumenteigenschaften), nicht nur als sichtbarer Text im Dokument.
  it("traegt die KI-Kennzeichnung maschinenlesbar im \\info-Block (Art. 50(2))", () => {
    const rtf = markdownToRtf("Inhalt", "Mein Antrag");
    expect(rtf).toContain("{\\info");
    expect(rtf).toContain("{\\subject KI-generierter Antragsentwurf (AI-generated content)}");
    expect(rtf).toContain("AI-generated");
    expect(rtf).toContain("EU-AI-Act-Art-50");
    // Titel wandert in die Dokumenteigenschaften
    expect(rtf).toContain("{\\title Mein Antrag}");
  });

  it("laesst den \\info-Titel bei fehlendem Titel weg, Kennzeichnung bleibt", () => {
    const rtf = markdownToRtf("Inhalt");
    expect(rtf).not.toContain("{\\title");
    expect(rtf).toContain("{\\info");
    expect(rtf).toContain("EU-AI-Act-Art-50");
  });
});
