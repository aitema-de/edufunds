/**
 * Deterministische Rechenprüfung des Finanzplans.
 *
 * Jeder Testfall hier hat einen echten Ursprung: Tester-Feedback #008 vom
 * 19.08.2026 zu Antrag 37 (kultur-macht-stark). Der Tester fand drei
 * Widersprüche von Hand, die das Tool selbst hätte finden müssen. Die Werte in
 * den Tests sind exakt seine Zahlen.
 */
import {
  pruefeArithmetik,
  findeBetraege,
  korrigiereProzentPosten,
  lesProzentsatz,
} from "@/lib/wizard/finanzplan-arithmetik";
import type { Finanzplan } from "@/lib/wizard/types";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

/** Der echte Finanzplan aus Antrag 37, gekürzt auf das Wesentliche. */
function planAusAntrag37(): Finanzplan {
  return {
    posten: [
      { id: "p1", kategorie: "honorare", bezeichnung: "Kulturpädagogische Fachkräfte für Projektwoche", betragEur: 18000 },
      { id: "p2", kategorie: "sachkosten", bezeichnung: "Flexible Möbel und Sitzmöglichkeiten (Stehtische, Sitzsäcke)", betragEur: 15000 },
      { id: "p3", kategorie: "sachkosten", bezeichnung: "Aufbewahrungs-, Präsentations- und Arbeitsmaterialien", betragEur: 3000 },
      { id: "p4", kategorie: "sachkosten", bezeichnung: "Verpflegung für Projektwoche", betragEur: 1200 },
      { id: "p5", kategorie: "honorare", bezeichnung: "Externe Honorarkraft für Evaluation", betragEur: 2500 },
      { id: "p6", kategorie: "sonstiges", bezeichnung: "Aufwandsentschädigungen für ehrenamtliche Betreuer:innen", betragEur: 500 },
      { id: "p7", kategorie: "overhead", bezeichnung: "Verwaltungspauschale (7 % der anerkannten Ausgaben)", betragEur: 2940 },
    ],
    hinweise: [
      "Alle Beträge sind grobe Schätzungen ohne konkrete Angebote.",
      "Die Förderhöhe von 40.000 EUR entspricht der beantragten Summe (100 % Förderung).",
      "Investitionen in dauerhafte Ausstattung (z. B. Möbel) sind in dieser Richtlinie nicht förderfähig — daher als Sachkosten mit Leih- oder Kaufoption angesetzt.",
    ],
    generiertAm: "2026-08-19T16:10:23.582Z",
  } as unknown as Finanzplan;
}

const RICHTLINIE = {
  kostenpositionen: [
    { kategorie: "honorare", foerderfaehig: true, bedingungen: [] },
    { kategorie: "sachkosten", foerderfaehig: true, bedingungen: [] },
    { kategorie: "overhead", foerderfaehig: true, bedingungen: ["Verwaltungspauschale 7 % der anerkannten Ausgaben"] },
    {
      kategorie: "investitionen",
      foerderfaehig: false,
      bedingungen: ["Anschaffung dauerhafter Ausstattung nicht über Kultur macht stark förderbar"],
    },
  ],
} as unknown as Richtlinie;

describe("findeBetraege", () => {
  it("liest deutsche Beträge inklusive Tausenderpunkt", () => {
    const b = findeBetraege("Das Volumen beträgt 43.140 € gesamt.").map((x) => x.betrag);
    expect(b).toEqual([43140]);
  });

  it("versteht EUR, Euro und Nachkommastellen", () => {
    expect(findeBetraege("2.814,50 EUR").map((x) => x.betrag)).toEqual([2814.5]);
    expect(findeBetraege("500 Euro").map((x) => x.betrag)).toEqual([500]);
  });

  it("liefert die Fundstelle mit, damit die Meldung zitierbar ist", () => {
    const t = findeBetraege("Die Förderhöhe von 40.000 EUR entspricht der beantragten Summe.");
    expect(t[0].stelle).toContain("Förderhöhe");
  });
});

describe("lesProzentsatz", () => {
  it("erkennt den Satz in der Bezeichnung", () => {
    expect(lesProzentsatz("Verwaltungspauschale (7 % der anerkannten Ausgaben)")).toBe(7);
    expect(lesProzentsatz("Overhead 12,5 %")).toBe(12.5);
  });

  it("gibt null zurück, wo kein Prozentsatz steht", () => {
    expect(lesProzentsatz("Honorare für Fachkräfte")).toBeNull();
    // 100 % oder mehr ist kein Aufschlag auf eine Bemessungsgrundlage.
    expect(lesProzentsatz("Vollfinanzierung 100 %")).toBeNull();
  });
});

describe("Die drei Befunde aus Tester-Feedback #008", () => {
  const warnungen = pruefeArithmetik(planAusAntrag37(), RICHTLINIE);

  it("1. rechnet die Verwaltungspauschale nach (2.940 statt 2.814)", () => {
    const w = warnungen.find((x) => /Verwaltungspauschale/.test(x.message));
    expect(w).toBeDefined();
    expect(w!.level).toBe("error");
    expect(w!.message).toContain("2.814");
    expect(w!.message).toContain("2.940");
    // Die implizite Bezugsgröße macht den Fehler erst nachvollziehbar:
    // 2.940 wären 7 % von 42.000 — eine Zahl, die im Plan nicht vorkommt.
    expect(w!.message).toContain("42.000");
  });

  it("2. findet die genannte Fördersumme, die nicht zur Postensumme passt", () => {
    const w = warnungen.find((x) => /Gesamt-\/Fördersumme/.test(x.message));
    expect(w).toBeDefined();
    // "warning", nicht "error": Die Quelle ist ein `hinweis`, und Hinweise sind
    // im FinanzplanEditor nicht bearbeitbar. Ein error würde die Freigabe
    // sperren, ohne dem Nutzer einen Ausweg zu lassen.
    expect(w!.level).toBe("warning");
    expect(w!.message).toContain("40.000");
    expect(w!.message).toContain("43.140");
    expect(w!.message).toContain("3.140"); // Differenz
  });

  it("3. entlarvt den Selbstwiderspruch beim Möbel-Posten", () => {
    const w = warnungen.find((x) => /möbel/i.test(x.message));
    expect(w).toBeDefined();
    // Bewusst nur `warning`: "Leihmöbel" wäre zulässig, die Erkennung ist eine
    // Wortgleichheit — ein zu Unrecht gesperrter Posten wäre teurer.
    expect(w!.level).toBe("warning");
    expect(w!.message).toContain("15.000");
    expect(w!.message).toContain("sachkosten");
  });

  it("meldet GENAU diese drei — kein Rauschen", () => {
    // Ein früherer Entwurf zog Stichwörter aus der Richtlinie und schlug bei
    // "Kulturpädagogische Fachkräfte" an, weil der PROGRAMMNAME ("Kultur macht
    // stark") in der Ausschlussregel steht. Falsch-Positive zerstören das
    // Vertrauen in die Prüfung schneller, als die Prüfung Fehler findet.
    expect(warnungen).toHaveLength(3);
    expect(warnungen.some((w) => /Kulturpädagogische/.test(w.message))).toBe(false);
  });
});

describe("Was NICHT gemeldet werden darf", () => {
  it("stimmiger Plan erzeugt keine Warnung", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 1000 },
        { id: "b", kategorie: "overhead", bezeichnung: "Verwaltungspauschale (10 %)", betragEur: 100 },
      ],
      hinweise: ["Das Gesamtvolumen beträgt 1.100 EUR."],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });

  it("Rundung von 1 EUR gilt nicht als Fehler", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 1005 },
        { id: "b", kategorie: "overhead", bezeichnung: "Pauschale (7 %)", betragEur: 71 }, // exakt 70,35
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });

  it("ein Betrag, der einem EINZELPOSTEN entspricht, ist keine Summenabweichung", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "honorare", bezeichnung: "Honorare", betragEur: 5000 },
        { id: "b", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 1000 },
      ],
      // "5.000 EUR" ist hier der Honorar-Posten, keine falsche Gesamtsumme.
      hinweise: ["Von der Gesamtsumme entfallen 5.000 EUR auf Honorare."],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });

  it("Leih-Posten lösen den Förderfähigkeits-Widerspruch nicht aus", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Leihmöbel für die Projektlaufzeit", betragEur: 3000 },
      ],
      hinweise: ["Möbel sind laut Richtlinie nicht förderfähig."],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });

  it("leerer Plan wirft nicht", () => {
    const leer = { posten: [], generiertAm: "x" } as unknown as Finanzplan;
    expect(pruefeArithmetik(leer, RICHTLINIE)).toEqual([]);
    expect(pruefeArithmetik(leer, null)).toEqual([]);
  });

  it("Beträge ohne Summen-Kontext werden ignoriert", () => {
    const plan = {
      posten: [{ id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 1000 }],
      hinweise: ["Einzelne Bücher kosten etwa 25 EUR."],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });
});

describe("Abgleich gegen den Antragstext", () => {
  it("findet eine falsche Gesamtsumme auch im Fließtext", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 10000 },
        { id: "b", kategorie: "honorare", bezeichnung: "Honorare", betragEur: 5000 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    const text = "## Finanzierung\n\nDas Gesamtvolumen des Projekts beträgt 12.000 EUR.";
    const w = pruefeArithmetik(plan, RICHTLINIE, text);
    expect(w).toHaveLength(1);
    expect(w[0].level).toBe("warning"); // Antragstext ist im Editor nicht bearbeitbar
    expect(w[0].message).toContain("Antragstext");
    expect(w[0].message).toContain("15.000");
  });
});

describe("Regel: ein blockierender Fehler braucht einen Ausweg", () => {
  /**
   * Gelernt aus dem 13.08.2026 (Antrag 37): Ein Zustand, aus dem der Nutzer
   * nicht herauskommt, ist keine Sicherung, sondern eine Falle. `error` setzt
   * okFuerFreigabe=false und sperrt die Freigabe des Finanzplans — das darf nur
   * für Befunde gelten, die der Nutzer im Editor auch beheben kann.
   *
   * Im FinanzplanEditor sind editierbar: die POSTEN. Nicht editierbar:
   * `hinweise` und Antragstext.
   */
  it("alle error-Befunde beziehen sich auf einen Posten (den man ändern kann)", () => {
    const w = pruefeArithmetik(planAusAntrag37(), RICHTLINIE, "Gesamtvolumen 99.000 EUR");
    for (const e of w.filter((x) => x.level === "error")) {
      expect(e.postenId).toBeDefined();
    }
  });

  it("Befunde ohne Posten-Bezug sind höchstens Warnungen", () => {
    const w = pruefeArithmetik(planAusAntrag37(), RICHTLINIE, "Gesamtvolumen 99.000 EUR");
    for (const x of w.filter((y) => !y.postenId)) {
      expect(x.level).not.toBe("error");
    }
  });
});

/**
 * Paket 4 (20.08.2026): Die Prozent-Korrektur läuft jetzt in der Pipeline, nicht
 * mehr nur auf Knopfdruck im Editor. Damit sie das darf, muss sie die
 * Bezugsgröße richtig lesen — ein "korrigierter" richtiger Betrag wäre schlimmer
 * als der ursprüngliche Befund.
 */
describe("korrigiereProzentPosten", () => {
  it("rechnet den Tester-Fall still richtig (2.940 → 2.814)", () => {
    const plan = planAusAntrag37();
    const { posten, korrekturen } = korrigiereProzentPosten(plan.posten);

    expect(korrekturen).toHaveLength(1);
    expect(korrekturen[0].alt).toBe(2940);
    expect(korrekturen[0].neu).toBe(2814);
    expect(korrekturen[0].satz).toBe(7);
    expect(posten.find((p) => p.id === "p7")!.betragEur).toBe(2814);
  });

  it("nach der Korrektur meldet die Prüfung keinen Prozent-Fehler mehr", () => {
    const plan = planAusAntrag37();
    const { posten } = korrigiereProzentPosten(plan.posten);
    const warnungen = pruefeArithmetik({ ...plan, posten } as unknown as Finanzplan, RICHTLINIE);
    expect(warnungen.some((w) => w.level === "error")).toBe(false);
  });

  it("lässt einen stimmigen Plan unangetastet", () => {
    const posten = [
      { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 1000 },
      { id: "b", kategorie: "overhead", bezeichnung: "Verwaltungspauschale (10 %)", betragEur: 100 },
    ] as unknown as Parameters<typeof korrigiereProzentPosten>[0];
    const ergebnis = korrigiereProzentPosten(posten);
    expect(ergebnis.korrekturen).toHaveLength(0);
    expect(ergebnis.posten).toBe(posten);
  });
});

describe("Die Bezugsgröße richtig lesen", () => {
  it('"% der Gesamtkosten" schliesst den Posten selbst ein', () => {
    // 20 % der Gesamtkosten bei 8.000 EUR übrigen Posten sind 2.000 EUR
    // (Gesamt 10.000), NICHT 1.600 EUR. Mit der Aufschlag-Formel hätte die
    // Prüfung einen richtigen Betrag als Fehler gemeldet.
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 8000 },
        { id: "b", kategorie: "overhead", bezeichnung: "Trägerpauschale (20 % der Gesamtkosten)", betragEur: 2000 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
    expect(korrigiereProzentPosten(plan.posten).korrekturen).toHaveLength(0);
  });

  it('"% der Personalkosten" bezieht sich nur auf diese Kategorie', () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "personal", bezeichnung: "Projektleitung", betragEur: 10000 },
        { id: "b", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 5000 },
        { id: "c", kategorie: "overhead", bezeichnung: "Gemeinkosten (10 % der Personalkosten)", betragEur: 1000 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
  });

  it("fehlt die Bezugsgröße im Plan, wird geschwiegen statt geraten", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 5000 },
        { id: "c", kategorie: "overhead", bezeichnung: "Gemeinkosten (10 % der Personalkosten)", betragEur: 700 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
    expect(korrigiereProzentPosten(plan.posten).korrekturen).toHaveLength(0);
  });

  it("Eigenanteil-Posten mit Prozentsatz im Namen werden nicht angefasst", () => {
    // Der Autofix legt sie als "Eigenanteil Schulträger (Aufstockung auf 20 %)"
    // an, ihr Betrag ist ein FEHLBETRAG — die Prüfung hätte den eigenen Autofix
    // als Rechenfehler gemeldet.
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 10000 },
        { id: "e", kategorie: "sonstiges", bezeichnung: "Eigenanteil Schulträger (Aufstockung auf 20 %)", betragEur: 1500, eigenanteil: true },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
    expect(korrigiereProzentPosten(plan.posten).korrekturen).toHaveLength(0);
  });
});

/**
 * Zwei echte Falsch-Positive aus der Probe über die 75 Baseline-Anträge
 * (20.08.2026). Beide hätte die naive Lesart still "korrigiert" — der erste
 * Fall um 9.000 EUR, der zweite um 16.000 EUR. Sie sind der Grund, warum
 * lesProzentBezug im Zweifel null liefert.
 */
describe("Prozentzahlen, die keine Bemessungsgrundlage sind", () => {
  it("ein Stellenanteil im Namen ist kein Prozent-Posten", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 6000 },
        { id: "b", kategorie: "personal", bezeichnung: "Teilzeit-Klimaschutzbeauftragte (50%)", betragEur: 12000 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
    expect(korrigiereProzentPosten(plan.posten).korrekturen).toHaveLength(0);
  });

  it("eine unbekannte Bezugsgrösse wird nicht geraten", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Projektmittel", betragEur: 320000 },
        { id: "b", kategorie: "personal", bezeichnung: "Projektmanagement (20 % der Pauschale)", betragEur: 80000 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    expect(pruefeArithmetik(plan, RICHTLINIE)).toHaveLength(0);
    expect(korrigiereProzentPosten(plan.posten).korrekturen).toHaveLength(0);
  });

  it("die echte Verwaltungspauschale bleibt erkannt", () => {
    const plan = {
      posten: [
        { id: "a", kategorie: "sachkosten", bezeichnung: "Material", betragEur: 10600 },
        { id: "b", kategorie: "overhead", bezeichnung: "Verwaltungspauschale (7 %)", betragEur: 1010 },
      ],
      generiertAm: "x",
    } as unknown as Finanzplan;
    const { korrekturen } = korrigiereProzentPosten(plan.posten);
    expect(korrekturen).toHaveLength(1);
    expect(korrekturen[0].neu).toBe(742);
  });
});
