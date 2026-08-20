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
  it("gültiger Finanzplan ohne Errors → score=100", () => {
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

/**
 * Befund 20.08.2026 (Tester-Feedback #008, Nachanalyse): `bosch-schulpreis` bekam
 * in JEDEM Lauf eine 0, weil ein Preis keinen Finanzteil kennt und
 * `scoreFinanzplan` "kein Finanzplan" pauschal als "schlecht" verbucht hat.
 * Zwei solche Korpus-Einträge zogen die Metrik von 86,1 auf 79,2 und die
 * Streuung von 16,1 auf 28,0.
 *
 * Eine Kennzahl, die etwas misst, das es gar nicht geben darf, misst Rauschen —
 * und verdeckt damit echte Verschlechterungen. Deshalb dieselbe Trennung wie bei
 * wiz04: nicht bewertbar => null (fliesst nicht in den Mittelwert), nicht 0.
 */
describe("Finanzplan-Metrik: nicht bewertbar ist nicht dasselbe wie schlecht", () => {
  it("Programm ohne Finanzteil (Preis) → score=null, nicht 0", () => {
    const r = scoreFinanzplan(undefined, null, 0, false);
    expect(r.score).toBeNull();
    expect(r.nichtBewertbarGrund).toMatch(/Preis|Finanzteil/i);
  });

  it("Finanzplan FEHLT, obwohl das Programm einen verlangt → weiterhin 0", () => {
    // Das ist ein echter Mangel und muss wehtun.
    const r = scoreFinanzplan(undefined, null, 0, true);
    expect(r.score).toBe(0);
    expect(r.nichtBewertbarGrund).toBeUndefined();
  });

  it("Default bleibt verhaltensgleich: ohne das neue Argument zählt ein fehlender Plan als 0", () => {
    const r = scoreFinanzplan(undefined, null, 0);
    expect(r.score).toBe(0);
  });

  it("ein vorhandener Plan wird normal bewertet, auch wenn brauchtFinanzplan=false", () => {
    // Verteidigt die Reihenfolge der Prüfung nicht — aber dokumentiert sie:
    // Liegt trotz Preis-Programm ein Plan vor, ist das nicht bewertbar (die
    // Antragsart entscheidet, nicht die Anwesenheit des Objekts).
    const plan = makeFinanzplan([
      { id: "p1", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 500 },
    ]);
    expect(scoreFinanzplan(plan, null, 0, false).score).toBeNull();
    expect(scoreFinanzplan(plan, null, 0, true).score).toBe(100);
  });
});
