/**
 * N=3 Determinismus: Mean + Population-Stddev-Berechnung.
 * Wave 2 Plan 05-04 — lebende Tests.
 *
 * Baseline-Lauf = Mean of N=3 Runs pro Eintrag (D-16).
 * Population-Stddev (N, NICHT Sample N-1) — konsistent mit eval-matcher.ts-Pattern.
 */
import { aggregateNRuns } from "@/scripts/eval-pipeline-internals";

describe("N=3 Mean+Stddev Determinismus", () => {
  it("N=3 Scores [85, 85.5, 84.5] → mean ~85 stddev < 1", () => {
    const result = aggregateNRuns([85, 85.5, 84.5]);
    expect(result.mean).toBeCloseTo(85, 5);
    expect(result.stddev).toBeLessThan(1);
  });

  it("leere Liste [] → mean=0, stddev=0 (kein Crash)", () => {
    const result = aggregateNRuns([]);
    expect(result.mean).toBe(0);
    expect(result.stddev).toBe(0);
    expect(result.runs).toHaveLength(0);
  });

  it("N=3 hohe Varianz [60, 75, 90] → stddev > 10", () => {
    const result = aggregateNRuns([60, 75, 90]);
    expect(result.mean).toBeCloseTo(75, 5);
    expect(result.stddev).toBeGreaterThan(10);
  });

  it("Population-Stddev (N) nicht Sample (N-1) verifiziert", () => {
    // Population stddev von [0, 10]: mean=5, variance=(25+25)/2=25, stddev=5
    // Sample stddev (N-1): variance=(25+25)/1=50, stddev≈7.07
    const result = aggregateNRuns([0, 10]);
    expect(result.stddev).toBeCloseTo(5, 5); // population stddev
    // Wenn Sample verwendet: stddev wuerde ~7.07 sein
    expect(result.stddev).not.toBeCloseTo(7.07, 1);
  });
});
