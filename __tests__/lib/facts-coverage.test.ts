/**
 * #005 (Pilot 15.07.2026): factsCoverageBlock listet leere vs. befuellte Themencluster,
 * damit der Interviewer die restlichen Fragen auf noch offene Bereiche lenkt (statt
 * mehrfach denselben Cluster — z. B. Nachhaltigkeit — abzufragen).
 */
import { factsCoverageBlock } from "@/lib/wizard/prompts";
import type { WizardFacts } from "@/lib/wizard/types";

it("markiert alle Cluster als offen bei leeren Facts", () => {
  const block = factsCoverageBlock({} as WizardFacts);
  expect(block).toContain("OFFENE BEREICHE");
  expect(block).toContain("Nachhaltigkeit/Verankerung");
  expect(block).toContain("Budget/Kosten");
});

it("erkennt einen befuellten Cluster als abgedeckt (Nachhaltigkeit gefuellt)", () => {
  const facts: WizardFacts = {
    schule: { name: "GS Test", schuelerzahl: 180 },
    wirkung: { nachhaltigkeit: "Die Schule uebernimmt die Betriebskosten ab 2028." },
  };
  const block = factsCoverageBlock(facts);
  // Nachhaltigkeit ist gefuellt → NICHT mehr in OFFENE BEREICHE.
  const offeneZeile = block.split("\n").find((l) => l.startsWith("OFFENE BEREICHE"))!;
  expect(offeneZeile).not.toContain("Nachhaltigkeit/Verankerung");
  // Aber Budget ist leer → offen.
  expect(offeneZeile).toContain("Budget/Kosten");
  // Abgedeckt-Zeile nennt Nachhaltigkeit + Schule.
  const abgedeckt = block.split("\n").find((l) => l.startsWith("BEREITS ABGEDECKT"))!;
  expect(abgedeckt).toContain("Nachhaltigkeit/Verankerung");
  expect(abgedeckt).toContain("Schule/Kontext");
});

it("wertet ein leeres schuelerzahl=0 nicht als befuellt", () => {
  const block = factsCoverageBlock({ budget: { beantragt_eur: 0 } } as WizardFacts);
  const offeneZeile = block.split("\n").find((l) => l.startsWith("OFFENE BEREICHE"))!;
  expect(offeneZeile).toContain("Budget/Kosten"); // 0 zaehlt nicht als Angabe
});

/**
 * Zweite Ebene (Gutachter-Messung 30.07.2026): Ein befuellter Cluster ist noch keine
 * verwertbare Angabe. Der Block nennt deshalb zusaetzlich die fuenf Tiefenluecken —
 * Herleitung in lib/wizard/facts-tiefe.ts.
 */
describe("Tiefen-Abschnitt", () => {
  // Hebel 5 steht per Default auf AUS (Nutzen nicht belegt, s. lib/wizard/config.ts).
  // Diese Gruppe prueft den eingeschalteten Zustand und stellt ihn deshalb selbst her.
  let factsCoverageBlock: (f: WizardFacts) => string;
  const alt = process.env.WIZARD_FACTS_TIEFE;

  beforeAll(() => {
    process.env.WIZARD_FACTS_TIEFE = "true";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factsCoverageBlock = require("@/lib/wizard/prompts").factsCoverageBlock;
  });

  afterAll(() => {
    if (alt === undefined) delete process.env.WIZARD_FACTS_TIEFE;
    else process.env.WIZARD_FACTS_TIEFE = alt;
    jest.resetModules();
  });

  it("listet bei leeren Facts alle fuenf Tiefenpunkte als FEHLT", () => {
    const block = factsCoverageBlock({} as WizardFacts);
    expect(block).toContain("TIEFE DER ANGABEN");
    expect(block).toContain("FEHLT — Ist-Zahlen zum Bedarf");
    expect(block).toContain("FEHLT — Kosten und Mengen je Posten");
    expect(block).toContain("FEHLT — Wer und Wann im Arbeitsplan");
    expect(block).toContain("FEHLT — Ausgangswert und Zielwert je Indikator");
    expect(block).toContain("FEHLT — Beschlüsse und Zusagen des Trägers");
  });

  it("stuft einen bezifferten Finanzteil als ausreichend tief ein statt ihn zu wiederholen", () => {
    const block = factsCoverageBlock({
      budget: { hauptposten: ["30 Tablets, ca. 12.000 EUR", "Fortbildung 2.000 EUR"] },
    } as WizardFacts);
    expect(block).toContain("AUSREICHEND TIEF");
    expect(block).toMatch(/AUSREICHEND TIEF[^\n]*Kosten und Mengen je Posten/);
    expect(block).not.toContain("FEHLT — Kosten und Mengen je Posten");
  });

  it("markiert einen vom Nutzer verneinten Punkt als nicht erneut zu fragen", () => {
    const block = factsCoverageBlock({
      programmpassung: { offene_luecken: ["Kein Beschluss des Traegers vorhanden"] },
    } as WizardFacts);
    expect(block).toMatch(/BEREITS VERNEINT[^\n]*Beschlüsse und Zusagen des Trägers/);
    expect(block).not.toContain("FEHLT — Beschlüsse und Zusagen des Trägers");
  });

  it("gibt zu jedem offenen Punkt eine konkrete Nachfrage mit, nicht nur ein Label", () => {
    const block = factsCoverageBlock({} as WizardFacts);
    // Der Interviewer soll wissen, WIE er fragt — die Groessenordnungs-Formulierung
    // ist der Unterschied zwischen einer Antwort und einem Achselzucken.
    expect(block).toContain("grobe Hausnummer");
    expect(block).toContain("Ausgangswert");
  });
});

/**
 * Der Schalter muss BEIDE Teile des Hebels bewegen: den Block im User-Prompt UND die
 * zugehoerigen Regeln im System-Prompt. Waeren sie getrennt, verwiese der System-Prompt
 * bei abgeschaltetem Hebel auf einen Abschnitt, den es nicht gibt — und ein
 * Vorher/Nachher-Vergleich meinte den Hebel, misst aber nur seine Haelfte. Genau das war
 * am 31.07.2026 der Fall und hat eine Messreihe entwertet.
 */
describe("Schalter WIZARD_FACTS_TIEFE", () => {
  function ladeMit(wert: string | undefined) {
    const alt = process.env.WIZARD_FACTS_TIEFE;
    if (wert === undefined) delete process.env.WIZARD_FACTS_TIEFE;
    else process.env.WIZARD_FACTS_TIEFE = wert;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/wizard/prompts");
    const out = {
      system: mod.INTERVIEWER_SYSTEM as string,
      block: mod.factsCoverageBlock({} as WizardFacts) as string,
    };
    if (alt === undefined) delete process.env.WIZARD_FACTS_TIEFE;
    else process.env.WIZARD_FACTS_TIEFE = alt;
    jest.resetModules();
    return out;
  }

  it("schaltet Block UND System-Regeln gemeinsam ein", () => {
    const an = ladeMit("true");
    expect(an.block).toContain("TIEFE DER ANGABEN");
    expect(an.system).toContain("geh in die TIEFE");
  });

  it("schaltet Block UND System-Regeln gemeinsam aus", () => {
    const aus = ladeMit("false");
    expect(aus.block).not.toContain("TIEFE DER ANGABEN");
    expect(aus.system).not.toContain("geh in die TIEFE");
    // Der Cluster-Teil bleibt in jedem Fall erhalten.
    expect(aus.block).toContain("OFFENE BEREICHE");
  });

  it("ist per Default aus — der Nutzen ist nicht belegt", () => {
    const standard = ladeMit(undefined);
    expect(standard.block).not.toContain("TIEFE DER ANGABEN");
    expect(standard.system).not.toContain("geh in die TIEFE");
  });

  it("laesst den System-Prompt nie auf einen fehlenden Abschnitt verweisen", () => {
    for (const wert of ["true", "false", undefined]) {
      const s = ladeMit(wert);
      if (s.system.includes("TIEFE DER ANGABEN")) {
        expect(s.block).toContain("TIEFE DER ANGABEN");
      }
    }
  });
});
