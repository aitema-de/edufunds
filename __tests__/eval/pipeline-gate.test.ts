/**
 * 2σ-Threshold-Gate-Logik pro Achse (D-25, D-17).
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { passesThreshold, aggregateNRuns } from "@/scripts/eval-pipeline-internals";
import type { ScoreStat } from "@/scripts/eval-pipeline-internals";

describe("2σ-Threshold-Gate pro Achse", () => {
  it("WIZ-01 hart fail: aktueller Score < Baseline-mean - 2*stddev → passed=false", () => {
    // Baseline: mean=80, stddev=5 → 2σ=10 → Grenze = 80-10=70
    const baseline: ScoreStat = { mean: 80, stddev: 5, runs: [] };
    // Aktuell: mean=68 → drop=12 > 10 → fail
    const current: ScoreStat = { mean: 68, stddev: 3, runs: [] };

    const result = passesThreshold(current, baseline, "WIZ-01");
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("drop=");
  });

  it("WIZ-02 mittel fail: aktueller Score deutlich unter Threshold → passed=false", () => {
    // Baseline: mean=80, stddev=5 → 2σ=10, 10%*80=8 → threshold=18
    // drop=30 > 18 → fail
    const baseline: ScoreStat = { mean: 80, stddev: 5, runs: [] };
    const current: ScoreStat = { mean: 50, stddev: 3, runs: [] };

    const result = passesThreshold(current, baseline, "WIZ-02");
    expect(result.passed).toBe(false);
  });

  it("WIZ-03 warning-only: beliebig grosser Score-Drop → passed=true (nie FAIL)", () => {
    // WIZ-03 ist immer warning-only
    const baseline: ScoreStat = { mean: 80, stddev: 5, runs: [] };
    const current: ScoreStat = { mean: 0, stddev: 0, runs: [] };

    const result = passesThreshold(current, baseline, "WIZ-03");
    expect(result.passed).toBe(true);
    expect(result.reason).toContain("warning-only");
  });

  it("stddev=0 → kein Crash: Gate verwendet 0 als 2σ-Band", () => {
    // stddev=0 → 2σ=0 → hartes Gleichheitspruefung: drop=0 → pass
    const baseline: ScoreStat = { mean: 80, stddev: 0, runs: [] };
    const current: ScoreStat = { mean: 80, stddev: 0, runs: [] };

    expect(() => passesThreshold(current, baseline, "WIZ-01")).not.toThrow();
    const result = passesThreshold(current, baseline, "WIZ-01");
    expect(result.passed).toBe(true);

    // Wenn aktuell schlechter: drop=1 > 0 → fail
    const worse: ScoreStat = { mean: 79, stddev: 0, runs: [] };
    const failResult = passesThreshold(worse, baseline, "WIZ-01");
    expect(failResult.passed).toBe(false);
  });
});
