/**
 * Finanzplan-Sub-Metrik (WIZ-01 Sub-Achse).
 * Wave 2 Plan 05-04 — lebende Tests.
 */
import { scoreFinanzplan } from "@/scripts/eval-pipeline-internals";
import type { Finanzplan } from "@/lib/wizard/types";

function makeFinanzplan(posten: Finanzplan["posten"]): Finanzplan {
  return {
    posten,
    generiertAm: new Date().toISOString(),
  };
}

describe("Finanzplan-Sub-Metrik", () => {
  it("gueltiger Finanzplan ohne Errors → score=100", () => {
    const finanzplan = makeFinanzplan([
      {
        id: "p1",
        kategorie: "sachkosten",
        bezeichnung: "Tablets",
        betragEur: 2000,
      },
    ]);
    // richtlinie=null → keine Validierungsregeln, keine Errors
    const result = scoreFinanzplan(finanzplan, null, 0);
    // Keine Errors → okFuerFreigabe (wenn gesamt > 0 und keine Errors)
    // Mit richtlinie=null: eine info-Warnung "Keine Richtlinie", aber kein Error
    expect(result.score).toBe(100);
    expect(result.vorAutofix.errorCount).toBe(0);
  });

  it("1 Error-Level-Warnung → score=80 (Penalty -20)", () => {
    // Mit einer richtlinie, die max 1000 EUR erlaubt, aber 2000 EUR beantragt werden
    const richtlinie = {
      programmId: "test",
      programmName: "Test",
      foerdergeberTyp: "bund",
      antragsstruktur: { abschnitte: [], einreichungsweg: "online" },
      foerderhoehe: { minEur: 0, maxEur: 1000 },
      eigenmittel: { pflicht: false },
      kumulierung: { erlaubt: true },
      kostenpositionen: [],
      laufzeit: {},
      zielgruppen: [],
      themen: [],
      foerdergebiete: [],
    } as unknown as Parameters<typeof scoreFinanzplan>[1];

    const finanzplan = makeFinanzplan([
      {
        id: "p1",
        kategorie: "sachkosten",
        bezeichnung: "Tablets",
        betragEur: 2000, // ueberschreitet maxEur=1000
      },
    ]);
    const result = scoreFinanzplan(finanzplan, richtlinie, 0);
    expect(result.vorAutofix.errorCount).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    // 1 error → 100 - 20 = 80
    expect(result.score).toBe(80);
  });

  it("fehlender finanzplan (undefined) → score=0", () => {
    const result = scoreFinanzplan(undefined, null, 0);
    expect(result.score).toBe(0);
    expect(result.vorAutofix.okFuerFreigabe).toBe(false);
    expect(result.vorAutofix.errorCount).toBe(0);
    expect(result.vorAutofix.gesamtEur).toBe(0);
  });

  it("hallu-marker in finanzplan → Penalty -5 pro Marker", () => {
    const finanzplan = makeFinanzplan([
      {
        id: "p1",
        kategorie: "sachkosten",
        bezeichnung: "Tablets",
        betragEur: 2000,
      },
    ]);
    // 2 Hallu-Marker im Finanzplan → Penalty 2 * 5 = 10
    const result = scoreFinanzplan(finanzplan, null, 2);
    expect(result.hallu_marker_in_finanzplan).toBe(2);
    expect(result.score).toBe(90); // 100 - 0 errors - 2*5 = 90
  });
});
