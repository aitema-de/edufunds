/**
 * Probe 10.06. — Finanzplan-Objekt-Hebel:
 * Hat das LLM JEDEN Förderposten selbst als Schätzung deklariert (bzw. der Rest
 * ist abgeleiteter Overhead), wurde die komplette Aufschlüsselung erfunden,
 * obwohl der Nutzer keine posten-genaue Kostenbasis lieferte (Probe-Fälle 4/7/10).
 * Dann kollabiert der Plan deterministisch in den ehrlichen unbeziffert-Modus:
 * Bezeichnungen bleiben als Kostenrahmen, erfundene Beträge fliegen raus.
 * Never-Worse: ein einziger belegter (nicht-geschätzter) Betrag verhindert den Kollaps.
 */
import { collapseEstimatedFinanzplan } from "@/lib/wizard/finanzplan-generator";
import type { Finanzplan, Finanzposten, WizardFacts } from "@/lib/wizard/types";

let n = 0;
function posten(p: Partial<Finanzposten>): Finanzposten {
  return {
    id: `p${n++}`,
    kategorie: p.kategorie ?? "sachkosten",
    bezeichnung: p.bezeichnung ?? "Posten",
    betragEur: p.betragEur ?? 1000,
    begruendung: p.begruendung,
    eigenanteil: p.eigenanteil,
  };
}
function plan(posten: Finanzposten[], extra: Partial<Finanzplan> = {}): Finanzplan {
  return { posten, generiertAm: "2026-06-10T00:00:00.000Z", ...extra };
}
const noFacts: WizardFacts = {};

describe("collapseEstimatedFinanzplan — Kollaps bei vollständig erfundener Aufschlüsselung", () => {
  it("kollabiert, wenn jeder Förderposten als Schätzung eingestanden ist (Fall 7)", () => {
    const p = plan([
      posten({ bezeichnung: "Landschaftsarchitektur-Planung", betragEur: 6000, begruendung: "Schaetzung: Beauftragung eines Büros" }),
      posten({ bezeichnung: "Pflanzungen", betragEur: 5000, begruendung: "Schaetzung: Bäume und Sträucher" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBe(true);
    expect(r.posten).toHaveLength(0);
    expect(r.kostenrahmen).toEqual(["Landschaftsarchitektur-Planung", "Pflanzungen"]);
  });

  it("kollabiert auch, wenn der nicht-geschätzte Rest ein abgeleiteter Overhead ist (Fall 4/10)", () => {
    const p = plan([
      posten({ bezeichnung: "Honorar Fachkraft", betragEur: 5000, begruendung: "Schaetzung: Honorar für Projekt" }),
      posten({ kategorie: "overhead", bezeichnung: "Verwaltungspauschale (7%)", betragEur: 700, begruendung: "7% der anerkannten Ausgaben gemäß Richtlinie" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBe(true);
    // Abgeleiteter Overhead wird NICHT in den Kostenrahmen übernommen (ohne Basis sinnlos).
    expect(r.kostenrahmen).toEqual(["Honorar Fachkraft"]);
  });

  it("entfernt die erfundene Personalstelle + Overhead-Hochrechnung (Fall 10)", () => {
    const p = plan([
      posten({ bezeichnung: "Materialien für Kochworkshops", betragEur: 2500, begruendung: "Schaetzung: Lebensmittel" }),
      posten({ kategorie: "personal", bezeichnung: "Projektkoordination (anteilig)", betragEur: 8000, begruendung: "Schaetzung: Anteilige Stelle" }),
      posten({ kategorie: "overhead", bezeichnung: "Overhead (auf Personal)", betragEur: 3600, begruendung: "45% auf anteilige Personalkosten" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBe(true);
    expect(r.posten).toHaveLength(0);
    expect((r.kostenrahmen ?? []).some((k) => k.includes("Projektkoordination"))).toBe(true);
    expect((r.kostenrahmen ?? []).some((k) => /overhead/i.test(k))).toBe(false);
  });

  it("dedupliziert Bezeichnungen im Kostenrahmen", () => {
    const p = plan([
      posten({ bezeichnung: "Tablets", begruendung: "Schaetzung: a" }),
      posten({ bezeichnung: "tablets", begruendung: "Schaetzung: b" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.kostenrahmen).toEqual(["Tablets"]);
  });
});

describe("collapseEstimatedFinanzplan — Never-Worse (kein Kollaps bei belegten Beträgen)", () => {
  it("kollabiert NICHT, wenn ein Förderposten am Nutzerinput verankert (nicht geschätzt) ist", () => {
    const p = plan([
      posten({ bezeichnung: "Tablets", betragEur: 8000, begruendung: "Vom Nutzer genannt: 8.000 EUR für Tablets" }),
      posten({ bezeichnung: "Honorar", betragEur: 2000, begruendung: "Schaetzung: übliche Sätze" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBeFalsy();
    expect(r.posten).toHaveLength(2);
  });

  it("kollabiert NICHT, wenn kein Posten als Schätzung eingestanden ist", () => {
    const p = plan([
      posten({ bezeichnung: "Tablets", begruendung: "20 Tablets laut Nutzerangabe" }),
      posten({ kategorie: "overhead", bezeichnung: "Overhead", begruendung: "10% Pauschale" }),
    ]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBeFalsy();
  });

  it("ist idempotent: ein bereits unbezifferter Plan bleibt unverändert", () => {
    const p: Finanzplan = { posten: [], kostenrahmen: ["A", "B"], unbeziffert: true, generiertAm: "t" };
    expect(collapseEstimatedFinanzplan(p, noFacts)).toBe(p);
  });

  it("lässt einen Plan ohne Förderposten unangetastet (nur Eigenanteil)", () => {
    const p = plan([posten({ bezeichnung: "Eigenanteil", eigenanteil: true, begruendung: "Schaetzung: x" })]);
    const r = collapseEstimatedFinanzplan(p, noFacts);
    expect(r.unbeziffert).toBeFalsy();
    expect(r.posten).toHaveLength(1);
  });
});

describe("collapseEstimatedFinanzplan — bewahrt echte Nutzerangaben als Hinweis", () => {
  const estimated = () =>
    plan([posten({ bezeichnung: "Honorar", begruendung: "Schaetzung: übliche Sätze" })]);

  it("bewahrt eine vom Nutzer genannte Gesamtsumme", () => {
    const facts: WizardFacts = { budget: { beantragt_eur: 10000 } };
    const r = collapseEstimatedFinanzplan(estimated(), facts);
    expect(r.unbeziffert).toBe(true);
    expect((r.hinweise ?? []).some((h) => h.includes("10.000") && /Gesamtrahmen/i.test(h))).toBe(true);
  });

  it("bewahrt einen vom Nutzer genannten Eigenanteil", () => {
    const facts: WizardFacts = { budget: { eigenmittel_eur: 500 } };
    const r = collapseEstimatedFinanzplan(estimated(), facts);
    expect((r.hinweise ?? []).some((h) => h.includes("500") && /Eigenanteil/i.test(h))).toBe(true);
  });

  it("enthält immer den unbeziffert-Standardhinweis", () => {
    const r = collapseEstimatedFinanzplan(estimated(), noFacts);
    expect((r.hinweise ?? []).some((h) => /noch zu beziffern/i.test(h))).toBe(true);
  });
});
