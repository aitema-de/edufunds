/**
 * Herleitungs-Pflicht für große Posten (Paket 4, Tester-Feedback #008).
 *
 * Der Tester fand in Antrag 37 einen Honorarposten über 18.000 EUR, dessen
 * Begründung nur wiederholte, wofür das Geld gedacht ist — nicht, wie der
 * Betrag zustande kommt. Genau diese Lücke prüfen die Fälle hier.
 *
 * Die Regel stammt von Kolja (20.08.2026): Schwelle 2.000 EUR, Honorare immer
 * über Zeit × Satz, zwei zulässige Formen — Rechnung ODER `[TODO: …]`. Eine
 * dritte Form gibt es nicht, und erfundene Faktoren sind auch dann verboten,
 * wenn dadurch ein Posten unbelegt bleibt.
 */
import {
  HERLEITUNGS_SCHWELLE_EUR,
  baueHerleitungsHinweis,
  ergaenzeHerleitungsMarker,
  hatRechenweg,
  pruefeHerleitung,
} from "@/lib/wizard/finanzplan-herleitung";
import { renderFinanzplanMarkdown } from "@/lib/wizard/finanzplan-markdown";
import { bereinigeAntragstext, sammleOffenePunkte } from "@/lib/wizard/offene-punkte";
import type { Finanzplan, Finanzposten } from "@/lib/wizard/types";

function posten(p: Partial<Finanzposten>): Finanzposten {
  return {
    id: p.id ?? "x",
    kategorie: p.kategorie ?? "sachkosten",
    bezeichnung: p.bezeichnung ?? "Posten",
    betragEur: p.betragEur ?? 1000,
    begruendung: p.begruendung,
    eigenanteil: p.eigenanteil ?? false,
  } as Finanzposten;
}

describe("hatRechenweg", () => {
  it("erkennt die Multiplikations-Schreibweisen", () => {
    expect(hatRechenweg("30 × 400 EUR")).toBe(true);
    expect(hatRechenweg("2 Fachkräfte x 60 Std.")).toBe(true);
    expect(hatRechenweg("20 Tablets à 400 EUR")).toBe(true);
    expect(hatRechenweg("… ergibt in Summe = 12.000 EUR")).toBe(true);
  });

  it("nimmt einen Einzelpreis nur MIT Menge als Herleitung", () => {
    expect(hatRechenweg("400 EUR je Gerät für 30 Geräte")).toBe(true);
    // Einzelpreis ohne jede Menge ist keine Rechnung, sondern eine Behauptung.
    expect(hatRechenweg("Marktüblich sind 400 EUR pro Gerät.")).toBe(false);
  });

  it("erkennt Fließtext ohne Zahlen NICHT als Rechnung", () => {
    expect(hatRechenweg("Material für die Projektwoche.")).toBe(false);
    expect(hatRechenweg("")).toBe(false);
    expect(hatRechenweg(undefined)).toBe(false);
  });
});

describe("Honorare — Zeit × Satz, unabhängig vom Betrag", () => {
  it("markiert ein Pauschalhonorar auch weit unter der Schwelle", () => {
    const befunde = pruefeHerleitung([
      posten({
        id: "h1",
        kategorie: "honorare",
        bezeichnung: "Externe Referentin für den Elternabend",
        betragEur: 800,
        begruendung: "Honorar für die externe Referentin.",
      }),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].grund).toBe("honorar-ohne-zeitgeruest");
    expect(befunde[0].marker).toContain("Stundenzahl × Stundensatz");
  });

  it("lässt ein Honorar mit Zeitgerüst in Ruhe", () => {
    const befunde = pruefeHerleitung([
      posten({
        id: "h2",
        kategorie: "honorare",
        bezeichnung: "Kulturpädagogische Fachkräfte",
        betragEur: 18000,
        begruendung: "2 Fachkräfte × 60 Std. × 150 EUR/Std. (Sätze vom Träger genannt) = 18.000 EUR",
      }),
    ]);
    expect(befunde).toHaveLength(0);
  });

  it("akzeptiert auch Termine/Workshops als Zeiteinheit", () => {
    expect(
      pruefeHerleitung([
        posten({
          id: "h3",
          kategorie: "honorare",
          bezeichnung: "Workshopleitung",
          betragEur: 1500,
          begruendung: "3 Workshops à 500 EUR = 1.500 EUR",
        }),
      ])
    ).toHaveLength(0);
  });

  it("eine Rechnung OHNE Zeitbezug genügt beim Honorar nicht", () => {
    // "5 Personen × 300 EUR" sagt nichts über den Umfang der Leistung — genau
    // das ist die Frage, die der Geber beim Honorar zuerst stellt.
    const befunde = pruefeHerleitung([
      posten({
        id: "h4",
        kategorie: "honorare",
        bezeichnung: "Honorare Projekttage",
        betragEur: 1500,
        begruendung: "5 Personen × 300 EUR = 1.500 EUR",
      }),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].grund).toBe("honorar-ohne-zeitgeruest");
  });
});

describe("Schwelle 2.000 EUR für alle übrigen Posten", () => {
  it("markiert einen großen Posten ohne Rechnung", () => {
    const befunde = pruefeHerleitung([
      posten({
        id: "s1",
        bezeichnung: "Aufbewahrungs- und Präsentationsmaterialien",
        betragEur: 3000,
        begruendung: "Material für die Präsentation der Projektergebnisse.",
      }),
    ]);
    expect(befunde).toHaveLength(1);
    expect(befunde[0].grund).toBe("grosser-posten-ohne-herleitung");
    expect(befunde[0].marker).toContain("Menge × Einzelpreis");
  });

  it("lässt Posten unter der Schwelle in Ruhe", () => {
    expect(
      pruefeHerleitung([
        posten({ id: "s2", bezeichnung: "Verpflegung", betragEur: HERLEITUNGS_SCHWELLE_EUR - 100, begruendung: "Verpflegung während der Projektwoche." }),
      ])
    ).toHaveLength(0);
  });

  it("greift exakt AB der Schwelle", () => {
    expect(
      pruefeHerleitung([
        posten({ id: "s3", bezeichnung: "Verpflegung", betragEur: HERLEITUNGS_SCHWELLE_EUR, begruendung: "Verpflegung während der Projektwoche." }),
      ])
    ).toHaveLength(1);
  });

  it("lässt einen großen Posten MIT Rechnung in Ruhe", () => {
    expect(
      pruefeHerleitung([
        posten({
          id: "s4",
          kategorie: "investitionen",
          bezeichnung: "Tablets",
          betragEur: 12000,
          begruendung:
            "30 Tablets (belegt: 312 Schüler:innen; Annahme: 1 Gerät je 2 Kinder) × marktüblich ca. 400 EUR = 12.000 EUR",
        }),
      ])
    ).toHaveLength(0);
  });
});

describe("Was NICHT markiert werden darf", () => {
  it("ein bereits gesetzter TODO-Marker genügt (Form 2)", () => {
    expect(
      pruefeHerleitung([
        posten({
          id: "t1",
          kategorie: "honorare",
          bezeichnung: "Honorarkraft Evaluation",
          betragEur: 2500,
          begruendung: "Externe Begleitung der Evaluation. [TODO: Stundensatz vor Einreichung belegen]",
        }),
      ])
    ).toHaveLength(0);
  });

  it("Eigenanteil-Posten bleiben unangetastet", () => {
    // Sie stammen aus der Nutzerangabe oder aus einer Richtlinien-Quote und
    // werden deterministisch gerechnet — dort gibt es keine offene Lücke.
    expect(
      pruefeHerleitung([
        posten({ id: "e1", bezeichnung: "Eigenanteil Schulträger", betragEur: 5000, eigenanteil: true, begruendung: "Vom Antragsteller zugesagte Eigenmittel." }),
      ])
    ).toHaveLength(0);
  });

  it("kein Marker wird zweimal gesetzt", () => {
    const eingang = [
      posten({ id: "d1", bezeichnung: "Material", betragEur: 4000, begruendung: "Material für das Projekt." }),
    ];
    const erste = ergaenzeHerleitungsMarker(eingang);
    const zweite = ergaenzeHerleitungsMarker(erste.posten);
    expect(zweite.befunde).toHaveLength(0);
    expect(zweite.posten[0].begruendung).toBe(erste.posten[0].begruendung);
  });
});

describe("ergaenzeHerleitungsMarker", () => {
  it("hängt den Marker an, ohne den vorhandenen Text zu verändern", () => {
    const { posten: neu, befunde } = ergaenzeHerleitungsMarker([
      posten({ id: "m1", bezeichnung: "Material", betragEur: 4000, begruendung: "Material für das Projekt." }),
    ]);
    expect(befunde).toHaveLength(1);
    expect(neu[0].begruendung).toMatch(/^Material für das Projekt\. \[TODO: /);
    // Beträge bleiben unangetastet — die Software kennt die fehlende Größe nicht.
    expect(neu[0].betragEur).toBe(4000);
  });

  it("setzt den Marker auch bei komplett fehlender Begründung", () => {
    const { posten: neu } = ergaenzeHerleitungsMarker([
      posten({ id: "m2", bezeichnung: "Ausstattung", betragEur: 9000, begruendung: undefined }),
    ]);
    expect(neu[0].begruendung).toMatch(/^\[TODO: /);
  });

  it("gibt die Liste unverändert zurück, wenn nichts zu tun ist", () => {
    const eingang = [posten({ id: "m3", bezeichnung: "Verpflegung", betragEur: 500 })];
    const { posten: neu, befunde } = ergaenzeHerleitungsMarker(eingang);
    expect(befunde).toHaveLength(0);
    expect(neu).toBe(eingang);
  });
});

describe("Der Marker landet in der Arbeitsliste", () => {
  // Das ist der eigentliche Grund für die Marker-Form: Sie ist schon verdrahtet.
  // Der Finanzplan-Markdown ist Teil des Exports (components/Wizard/AntragResult.tsx),
  // und sammleOffenePunkte liest ihn mit.
  it("erscheint als offener Punkt und wird aus dem Exportkörper entfernt", () => {
    const { posten: markiert } = ergaenzeHerleitungsMarker([
      posten({
        id: "x1",
        kategorie: "honorare",
        bezeichnung: "Kulturpädagogische Fachkräfte",
        betragEur: 18000,
        begruendung: "Honorare für die Projektwoche.",
      }),
    ]);
    const plan = { posten: markiert, generiertAm: "x" } as unknown as Finanzplan;
    const md = renderFinanzplanMarkdown(plan);

    const punkte = sammleOffenePunkte(md);
    expect(punkte.todos).toHaveLength(1);
    expect(punkte.todos[0]).toContain("Kulturpädagogische Fachkräfte");
    expect(bereinigeAntragstext(md)).not.toContain("[TODO:");
  });
});

describe("baueHerleitungsHinweis", () => {
  it("fasst beide Befundarten in EINEM Hinweis zusammen", () => {
    const hinweis = baueHerleitungsHinweis([
      { postenId: "a", bezeichnung: "A", betragEur: 3000, grund: "grosser-posten-ohne-herleitung", marker: "[TODO: a]" },
      { postenId: "b", bezeichnung: "B", betragEur: 800, grund: "honorar-ohne-zeitgeruest", marker: "[TODO: b]" },
      { postenId: "c", bezeichnung: "C", betragEur: 900, grund: "honorar-ohne-zeitgeruest", marker: "[TODO: c]" },
    ]);
    expect(hinweis).toContain("1 Posten über 2.000 EUR");
    expect(hinweis).toContain("2 Honorarposten");
    expect(hinweis).toContain("nicht erfinden");
  });

  it("schweigt, wenn nichts offen ist", () => {
    expect(baueHerleitungsHinweis([])).toBeNull();
  });
});
