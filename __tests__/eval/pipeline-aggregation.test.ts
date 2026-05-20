/**
 * Per-Geber-Gruppe + Per-Dossier Aggregation.
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { aggregate } from "@/scripts/eval-pipeline";
import type { PipelineKorpusEntry, EntryScores } from "@/scripts/eval-pipeline-internals";

function makeEntry(id: string, programmId: string, gruppe: PipelineKorpusEntry["expected_geber_gruppe"]): PipelineKorpusEntry {
  return {
    id,
    category: "mittel",
    programmId,
    schulProfil: {},
    userAnswers: [],
    facts: {},
    expected_forbidden_markers: [],
    expected_geber_gruppe: gruppe,
  };
}

function makeScore(wiz01: number, wiz02: number, wiz03: number): EntryScores {
  return {
    wiz01: {
      pflichtAbschnitteTotal: 5,
      pflichtAbschnitteCovered: Math.round((wiz01 / 100) * 5),
      coveragePercent: wiz01,
      maxZeichenOK: null,
      maxZeichenViolations: [],
      missingAbschnitte: [],
    },
    wiz02: {
      layer1MarkerHits: 0,
      layer1MarkerExpected: 0,
      layer2RegexHits: 0,
      layer1MarkerHitsDetail: [],
      layer2RegexHitsDetail: [],
      score: wiz02,
    },
    wiz03: {
      judgeResponse: null,
      score: wiz03,
      gruppe: "stiftung",
    },
    finanzplan: {
      vorAutofix: { okFuerFreigabe: true, errorCount: 0, warningCount: 0, gesamtEur: 3000 },
      hallu_marker_in_finanzplan: 0,
      score: 100,
    },
    latencyMs: 100,
  };
}

describe("Per-Geber-Gruppe + Per-Dossier Aggregation", () => {
  it("Per-Geber-Gruppe-Breakdown: 3 Eintraege mit 'stiftung' → korrekte Aggregation fuer Gruppe", () => {
    const allResults = new Map([
      ["s1", { entry: makeEntry("s1", "aktion-mensch-schulkooperation", "stiftung"), scores: [makeScore(80, 90, 70)] }],
      ["s2", { entry: makeEntry("s2", "aktion-mensch-schulkooperation", "stiftung"), scores: [makeScore(70, 80, 60)] }],
      ["s3", { entry: makeEntry("s3", "aktion-mensch-schulkooperation", "stiftung"), scores: [makeScore(90, 100, 80)] }],
    ]);
    const metrics = aggregate(allResults);

    const stiftungStats = metrics.perGeberGruppe.find((g) => g.gruppe === "stiftung");
    expect(stiftungStats).toBeDefined();
    expect(stiftungStats?.n).toBe(3);
    expect(stiftungStats?.wiz01Mean).toBeCloseTo(80, 0);
    expect(stiftungStats?.wiz03Mean).toBeCloseTo(70, 0);
  });

  it("Per-Dossier-Breakdown: Scores pro programmId korrekt gruppiert", () => {
    const allResults = new Map([
      ["e1", { entry: makeEntry("e1", "bmbf-digitalpakt-2", "oeffentlich"), scores: [makeScore(75, 85, 65)] }],
      ["e2", { entry: makeEntry("e2", "bmbf-digitalpakt-2", "oeffentlich"), scores: [makeScore(85, 95, 75)] }],
      ["e3", { entry: makeEntry("e3", "kultur-macht-stark", "verband-uni"), scores: [makeScore(60, 70, 55)] }],
    ]);
    const metrics = aggregate(allResults);

    const digitalpaktStats = metrics.perDossier.find((d) => d.programmId === "bmbf-digitalpakt-2");
    expect(digitalpaktStats).toBeDefined();
    expect(digitalpaktStats?.n).toBe(2);
    expect(digitalpaktStats?.wiz01Mean).toBeCloseTo(80, 0);

    const kulturStats = metrics.perDossier.find((d) => d.programmId === "kultur-macht-stark");
    expect(kulturStats).toBeDefined();
    expect(kulturStats?.n).toBe(1);
  });

  it("n-Counter pro Cluster korrekt: 3 Eintraege fuer 'wirtschaftspreis' → n=3 in Breakdown", () => {
    const allResults = new Map([
      ["w1", { entry: makeEntry("w1", "bosch-schulpreis", "wirtschaftspreis"), scores: [makeScore(70, 80, 60)] }],
      ["w2", { entry: makeEntry("w2", "ferry-porsche-challenge-2025", "wirtschaftspreis"), scores: [makeScore(80, 90, 70)] }],
      ["w3", { entry: makeEntry("w3", "ferry-porsche-challenge", "wirtschaftspreis"), scores: [makeScore(75, 85, 65)] }],
    ]);
    const metrics = aggregate(allResults);

    const wpStats = metrics.perGeberGruppe.find((g) => g.gruppe === "wirtschaftspreis");
    expect(wpStats?.n).toBe(3);
    expect(metrics.n).toBe(3);
  });
});
