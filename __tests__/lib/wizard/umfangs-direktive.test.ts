import { umfangsDirektive, abschnittPrompt, SECTION_SYSTEM } from "@/lib/wizard/prompts";

/**
 * Die Umfangs-Direktive macht aus einem belegten Zeichenlimit des
 * Antragsformulars ein ZIEL (70–90 % des Platzes) statt nur eines Deckels.
 *
 * Anlass (22.07.2026): Median-Abschnitt ~800 Zeichen, auch bei Limits von
 * 5.000+ — der Foerdergeber-Platz fuer die fachliche Begruendung blieb
 * ungenutzt. Kolja: Die sozialpaedagogische / bildungswissenschaftliche
 * Begruendung fehlt; sie ist keine Halluzination, sondern die Verbindung vom
 * belegten Vorhaben zur Grundlage, warum es umgesetzt werden sollte.
 */

describe("umfangsDirektive", () => {
  it("macht aus dem Limit einen Ziel-Korridor von 70–90 %", () => {
    const d = umfangsDirektive(5000);
    expect(d).toContain("Maximal 5000 Zeichen");
    expect(d).toContain("3500–4500 Zeichen"); // 70–90 %
    expect(d).toContain("ERSETZT die Standard-Laengenvorgabe");
  });

  it("verlangt bei grosszuegigem Platz (>= 2000) die fachliche Begruendung", () => {
    const d = umfangsDirektive(5000);
    expect(d).toMatch(/BEGRUENDUNG/);
    expect(d).toMatch(/sozialpaedagogisch/);
    expect(d).toMatch(/KEINE Halluzination/);
  });

  it("verlangt bei knappem Platz (< 2000) KEINE Theorie — dort zaehlt Dichte", () => {
    const d = umfangsDirektive(800);
    expect(d).not.toMatch(/BEGRUENDUNG/);
    expect(d).toContain("Maximal 800 Zeichen");
    // Korridor gerundet auf 50er: 550–700
    expect(d).toContain("550–700 Zeichen");
  });

  it("stellt klar, dass das Limit eine TEXTTIEFE-Wahl schlaegt", () => {
    // Sonst kann "AUSFUEHRLICH" (300–550 Woerter ≈ 2100–3850 Zeichen) ein
    // 1500-Zeichen-Formularfeld sprengen — der Foerderer schneidet dann ab.
    expect(umfangsDirektive(1500)).toContain("TEXTTIEFE");
  });

  it("haengt am Abschnitt, sobald maxZeichen belegt ist", () => {
    const mit = abschnittPrompt({ id: "x", name: "Konzept", pflicht: true, maxZeichen: 3000 });
    expect(mit).toContain("ZIEL-UMFANG");
    const ohne = abschnittPrompt({ id: "x", name: "Konzept", pflicht: true });
    expect(ohne).not.toContain("ZIEL-UMFANG");
  });

  it("SECTION_SYSTEM erklaert die Standard-Vorgabe zur Ausnahme-Regel", () => {
    // Beide Seiten muessen dieselbe Vorrang-Regel nennen, sonst konkurrieren
    // zwei Laengenvorgaben im selben Prompt und die kuerzere gewinnt still.
    expect(SECTION_SYSTEM).toContain("ZIEL-UMFANG");
    expect(SECTION_SYSTEM).toMatch(/schlägt jede Standard-Vorgabe/);
  });
});
