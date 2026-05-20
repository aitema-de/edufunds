/**
 * 2σ-Threshold-Gate-Logik pro Achse (D-25, D-17).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * WIZ-01 = hart: block bei jeder Regression unter Baseline-2σ
 * WIZ-02 = mittel: block bei > 10 % Regression ueber Baseline-2σ
 * WIZ-03 = warning-only: immer pass (kein Block, nur Annotation)
 */
describe("2σ-Threshold-Gate pro Achse", () => {
  it.todo("WIZ-01 hart fail: aktueller Score < Baseline-mean - 2*stddev → GateResult=FAIL");
  it.todo("WIZ-02 mittel fail: aktueller Score < (Baseline-mean - 2*stddev) * 0.9 (10 % Puffer) → GateResult=FAIL");
  it.todo("WIZ-03 warning-only: Score-Drop beliebig groß → GateResult=WARN (nie FAIL)");
  it.todo("kein Crash wenn stddev=0: Gate verwendet 0 als 2σ-Band → hartes Gleichheitspruefung");
});
