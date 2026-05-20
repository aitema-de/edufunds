/**
 * Finanzplan-Sub-Metrik (WIZ-01 Sub-Achse).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Finanzplan-Validity aus lib/wizard/finanzplan-validator.ts.
 * Ist KEINE eigene Top-Level-Achse, sondern Sub-Metrik die im Report sichtbar wird (D-11).
 * Halluzinations-Marker im Finanzplan zaehlen zu WIZ-02, Pflichtabschnitt-Coverage zu WIZ-01.
 */
describe("Finanzplan-Sub-Metrik", () => {
  it.todo("validateFinanzplan-Wrapper: gueltiger Finanzplan → finanzplanScore=100");
  it.todo("errorCount > 0 → Penalty -20 pro Fehler (Validator-Violations)");
  it.todo("Halluzinations-Marker im Finanzplan (z.B. TV-L-Honorarsatz) → Penalty -5 pro Marker");
  it.todo("fehlender finanzplan im GenerationArtefacts-Output → score=0");
});
