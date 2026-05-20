/**
 * WIZ-02 Layer-2 Regex-Detection + False-Positive-Schutz (deterministisch, kein LLM).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Layer-2 prueft strukturelle Regex-Patterns (Aktenzeichen, DD.MM.YYYY-Daten,
 * TV-L-Codes, Bezirks-Namen) gegen den finalen Pipeline-Output.
 * False-Positive-Schutz: wenn Muster vom User selbst genannt (user-stated) oder
 * explizit im Dossier belegt (facts-stated) → kein Penalty.
 */
describe("WIZ-02 Layer-2 Regex + False-Positive-Schutz", () => {
  it.todo("Aktenzeichen-Pattern 'Az 123/2026' im Output → halluRegexHit=true");
  it.todo("TV-L-Code 'TV-L E9' im Output → halluRegexHit=true");
  it.todo("Praezises Datum 'DD.MM.YYYY' wie '12.12.2025' → halluRegexHit=true (wenn nicht user-stated)");
  it.todo("False-Positive: Datum vom User in Antworten genannt (user-stated) → kein Penalty");
  it.todo("False-Positive: Dossier-Wert belegt (facts-stated) → kein Penalty");
  it.todo("Echter Treffer (weder user-stated noch facts-stated) → Penalty -10 pro Layer-2-Hallu");
});
