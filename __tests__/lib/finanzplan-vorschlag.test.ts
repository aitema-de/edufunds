/**
 * Produktvision 2026-06-10 — Markierungs-Modell statt Löschen:
 * Nicht am Nutzerinput verankerte Beträge werden als bestätigbare Vorschläge
 * MARKIERT (istVorschlag), nicht gelöscht. Nur widersprüchliche Erfindungen
 * gehören (per Prompt) gar nicht erst in den Plan.
 */
import {
  markVorschlaege,
  applyStatedEigenanteil,
  confirmAllVorschlaege,
} from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten, WizardFacts } from "@/lib/wizard/types";

let n = 0;
function posten(p: Partial<Finanzposten>): Finanzposten {
  return {
    id: `p${n++}`,
    kategorie: p.kategorie ?? "sachkosten",
    bezeichnung: p.bezeichnung ?? "Posten",
    betragEur: p.betragEur ?? 1000,
    begruendung: p.begruendung,
    eigenanteil: p.eigenanteil,
    istVorschlag: p.istVorschlag,
  };
}

describe("markVorschlaege", () => {
  it("ohne Kostenbasis: markiert ALLE Posten als Vorschlag (aktive Ausgestaltung)", () => {
    const r = markVorschlaege(
      [posten({ bezeichnung: "Tablets" }), posten({ bezeichnung: "Honorar" })],
      false
    );
    expect(r.every((p) => p.istVorschlag)).toBe(true);
  });

  it("mit Kostenbasis: nur selbst-eingestandene Schätzungen sind Vorschlag", () => {
    const r = markVorschlaege(
      [
        posten({ bezeichnung: "Tablets", begruendung: "20 Tablets laut Nutzerangabe à 400 EUR" }),
        posten({ bezeichnung: "Honorar", begruendung: "Schaetzung: übliche Tagessätze" }),
      ],
      true
    );
    const tablets = r.find((p) => p.bezeichnung === "Tablets")!;
    const honorar = r.find((p) => p.bezeichnung === "Honorar")!;
    expect(tablets.istVorschlag).toBe(false);
    expect(honorar.istVorschlag).toBe(true);
  });

  it("lässt eine bereits gesetzte istVorschlag-Markierung unangetastet (z. B. Eigenanteil)", () => {
    const r = markVorschlaege([posten({ bezeichnung: "Eigenanteil", eigenanteil: true, istVorschlag: false })], false);
    expect(r[0].istVorschlag).toBe(false); // bleibt belegt trotz hasBasis=false
  });

  it("verändert keine Beträge, nur die Markierung (kein Datenverlust)", () => {
    const r = markVorschlaege([posten({ bezeichnung: "X", betragEur: 3000 })], false);
    expect(r[0].betragEur).toBe(3000);
    expect(r[0].bezeichnung).toBe("X");
  });
});

describe("confirmAllVorschlaege (Freigabe = Sammelbestätigung)", () => {
  it("entfernt istVorschlag von allen Posten", () => {
    const out = confirmAllVorschlaege([
      posten({ bezeichnung: "Tablets", istVorschlag: true }),
      posten({ bezeichnung: "Honorar", istVorschlag: true }),
      posten({ bezeichnung: "Eigenanteil", eigenanteil: true, istVorschlag: false }),
    ]);
    expect(out.every((p) => p.istVorschlag === false)).toBe(true);
  });

  it("verändert Beträge/Bezeichnungen nicht (nur die Markierung)", () => {
    const out = confirmAllVorschlaege([posten({ bezeichnung: "X", betragEur: 4200, istVorschlag: true })]);
    expect(out[0].betragEur).toBe(4200);
    expect(out[0].bezeichnung).toBe("X");
    expect(out[0].istVorschlag).toBe(false);
  });

  it("ist idempotent für bereits bestätigte Posten", () => {
    const input = [posten({ bezeichnung: "Y", istVorschlag: false })];
    const out = confirmAllVorschlaege(input);
    expect(out[0].istVorschlag).toBe(false);
  });
});

describe("applyStatedEigenanteil markiert den Eigenanteil als belegt", () => {
  it("setzt istVorschlag=false auf dem aus der Nutzerangabe erzeugten Eigenanteil-Posten", () => {
    const facts: WizardFacts = { budget: { eigenmittel_eur: 500 } };
    const hinweise: string[] = [];
    const out = applyStatedEigenanteil([posten({ bezeichnung: "Tablets", betragEur: 5000 })], facts, hinweise);
    const eigen = out.find((p) => p.eigenanteil)!;
    expect(eigen.betragEur).toBe(500);
    expect(eigen.istVorschlag).toBe(false);
  });
});
