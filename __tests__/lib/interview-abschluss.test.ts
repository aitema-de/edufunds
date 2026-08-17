/**
 * Abschluss-Autoritaet (Architektur-Umbau 03.08.2026).
 *
 * Die Tests halten die vier Sicherungen fest, die verhindern, dass aus einem
 * Beratungsgespraech eine Behoerden-Befragung wird. Ohne sie waere das Gate
 * gefaehrlicher als der Defekt, den es behebt.
 */
import {
  MAX_NACHFASSEN,
  beurteileAbschluss,
} from "@/lib/wizard/interview-abschluss";
import { offeneNachfassLuecken } from "@/lib/wizard/facts-readiness";
import type { WizardFacts } from "@/lib/wizard/types";

/** Vollstaendige Facts — keine nachfassbare Luecke offen. */
const VOLL: WizardFacts = {
  schule: { name: "Astrid-Lindgren-Grundschule", typ: "grundschule", schuelerzahl: 240 },
  projekt: {
    titel: "Leseclub",
    kurzbeschreibung: "Woechentliche Lesestunden",
    zielgruppe: "Jahrgang 2 und 3",
    ziele: ["mehr Lesefreude"],
    aktivitaeten: ["Lesestunden"],
    zeitraum: "Schuljahr 2026/27",
  },
  wirkung: {
    erwartete_ergebnisse: ["mehr Ausleihen"],
    messbare_indikatoren: ["Ausleihzahlen"],
    nachhaltigkeit: "Foerderverein traegt weiter",
  },
  budget: { beantragt_eur: 5000, hauptposten: ["Buecher", "Honorar"] },
};

/** Wie VOLL, aber ohne Foerdersumme — die schwerste Luecke (Gewicht 3). */
const OHNE_SUMME: WizardFacts = { ...VOLL, budget: { hauptposten: ["Buecher"] } };

describe("offeneNachfassLuecken", () => {
  it("meldet nichts bei vollstaendigen Angaben", () => {
    expect(offeneNachfassLuecken(VOLL, null, [])).toHaveLength(0);
  });

  it("sortiert nach Gutachter-Gewicht — die Foerdersumme zuerst", () => {
    const leer: WizardFacts = {};
    const luecken = offeneNachfassLuecken(leer, null, []);
    expect(luecken[0].feld).toBe("budget.beantragt_eur");
    expect(luecken.every((l) => l.nachfrage.trim().length > 0)).toBe(true);
  });

  it("fasst nur Felder nach, fuer die eine Nachfrage hinterlegt ist", () => {
    // projekt.titel fehlt zwar und ist "hoch", hat aber keine Nachfrage —
    // eine Frage nach dem Titel wuerde der Interviewer ohnehin stellen.
    const luecken = offeneNachfassLuecken({}, null, []);
    expect(luecken.map((l) => l.feld)).not.toContain("projekt.titel");
  });
});

describe("beurteileAbschluss", () => {
  it("laesst enden, wenn keine nachfassbare Luecke offen ist", () => {
    const u = beurteileAbschluss(VOLL, null, [], [], 6, 12);
    expect(u.darfEnden).toBe(true);
    expect(u.grund).toBe("keine-luecke");
  });

  it("verweigert den Abschluss bei offener Foerdersumme und liefert die Nachfrage", () => {
    const u = beurteileAbschluss(OHNE_SUMME, null, [], [], 6, 12);
    expect(u.darfEnden).toBe(false);
    expect(u.grund).toBe("nachfassen");
    expect(u.nachfrage?.feld).toBe("budget.beantragt_eur");
    expect(u.nachfrage?.nachfrage).toMatch(/Summe/i);
  });

  // --- Die vier Sicherungen ------------------------------------------------

  it("SICHERUNG 1: fragt dieselbe Luecke nur EINMAL", () => {
    const erste = beurteileAbschluss(OHNE_SUMME, null, [], [], 6, 12);
    expect(erste.darfEnden).toBe(false);
    // Der Nutzer hat geantwortet ("weiss ich nicht") — das Feld bleibt leer.
    const zweite = beurteileAbschluss(
      OHNE_SUMME,
      null,
      ["weiss ich nicht"],
      [erste.nachfrage!.nachfrage],
      7,
      12
    );
    // Jetzt kommt die NAECHSTE Luecke dran, nicht dieselbe nochmal.
    expect(zweite.nachfrage?.feld).not.toBe("budget.beantragt_eur");
  });

  it("SICHERUNG 1b: gibt auf, wenn alle offenen Luecken schon erfragt wurden", () => {
    const alle = offeneNachfassLuecken(OHNE_SUMME, null, []);
    const u = beurteileAbschluss(
      OHNE_SUMME,
      null,
      [],
      alle.map((l) => l.nachfrage),
      8,
      12
    );
    expect(u.darfEnden).toBe(true);
    expect(u.grund).toBe("bereits-gefragt");
  });

  it("SICHERUNG 2: haelt das Nachfass-Kontingent ein", () => {
    // Ohne Richtlinie gibt es genau MAX_NACHFASSEN Luecken — das Kontingent bindet
    // erst, wenn der Eigenanteil als vierte dazukommt. Genau dieser Fall wird hier
    // geprueft, sonst waere die Sicherung nie scharf.
    const richtlinie = { eigenmittel: { pflicht: true } } as never;
    const alle = offeneNachfassLuecken({}, richtlinie, []);
    expect(alle.length).toBeGreaterThan(MAX_NACHFASSEN);

    const gestellt = alle.slice(0, MAX_NACHFASSEN).map((l) => l.nachfrage);
    const u = beurteileAbschluss({}, richtlinie, [], gestellt, 8, 12);
    expect(u.darfEnden).toBe(true);
    expect(u.grund).toBe("kontingent");
    expect(u.bereitsGefragt).toBe(MAX_NACHFASSEN);
  });

  it("SICHERUNG 3: der harte Fragendeckel schlaegt das Gate", () => {
    const u = beurteileAbschluss(OHNE_SUMME, null, [], [], 12, 12);
    expect(u.darfEnden).toBe(true);
    expect(u.grund).toBe("fragenbudget");
  });

  it("SICHERUNG 4: freie Interviewer-Fragen zaehlen nicht aufs Kontingent", () => {
    const fremde = [
      "Wie ist euer Medienkonzept im Schulprogramm verankert?",
      "Welche Fortbildungen habt ihr bisher gemacht?",
      "Wer koordiniert das Vorhaben?",
    ];
    const u = beurteileAbschluss(OHNE_SUMME, null, [], fremde, 6, 12);
    expect(u.bereitsGefragt).toBe(0);
    expect(u.darfEnden).toBe(false);
  });

  describe("Vergleichsarm EDUFUNDS_EVAL_ABSCHLUSS_GATE", () => {
    const vorher = process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE;
    afterEach(() => {
      if (vorher === undefined) delete process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE;
      else process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE = vorher;
    });

    it("laesst mit \"aus\" auch bei offener Luecke enden", () => {
      process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE = "aus";
      const u = beurteileAbschluss(OHNE_SUMME, null, [], [], 6, 12);
      expect(u.darfEnden).toBe(true);
      expect(u.grund).toBe("eval-abgeschaltet");
      expect(u.nachfrage).toBeUndefined();
    });

    // Die Richtung der Vorgabe ist die eigentliche Sicherung: nur ein einziger
    // Wert schaltet ab. Alles andere — auch ein Tippfehler — laesst das Gate an.
    it.each(["an", "0", "false", "AUS", " aus", ""])(
      "laesst das Gate bei %p aktiv",
      (wert) => {
        process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE = wert;
        const u = beurteileAbschluss(OHNE_SUMME, null, [], [], 6, 12);
        expect(u.darfEnden).toBe(false);
        expect(u.nachfrage?.feld).toBe("budget.beantragt_eur");
      }
    );

    it("laesst das Gate aktiv, wenn die Variable fehlt", () => {
      delete process.env.EDUFUNDS_EVAL_ABSCHLUSS_GATE;
      const u = beurteileAbschluss(OHNE_SUMME, null, [], [], 6, 12);
      expect(u.darfEnden).toBe(false);
      expect(u.grund).toBe("nachfassen");
    });
  });

  it("fasst den Eigenanteil nur nach, wenn die Richtlinie ihn verlangt", () => {
    const ohne = beurteileAbschluss(VOLL, null, [], [], 6, 12);
    expect(ohne.darfEnden).toBe(true);

    const richtlinie = {
      eigenmittel: { pflicht: true, mindestProzent: 20 },
    } as never;
    const mit = beurteileAbschluss(VOLL, richtlinie, [], [], 6, 12);
    expect(mit.darfEnden).toBe(false);
    expect(mit.nachfrage?.feld).toBe("budget.eigenmittel_eur");
    expect(mit.nachfrage?.nachfrage).toContain("20 %");
  });
});

/**
 * Nicht erneut fragen, was der Nutzer schon verneint hat (Befund 05.08.2026).
 *
 * Sicherung 1 des Gates greift nur fuer die EIGENE deterministische Nachfrage.
 * Eine Verneinung, die auf eine freie Interviewer-Frage hin faellt, sah es nicht —
 * in pv-res-004 fragte es nach vier Geld-Verneigungen bei Frage 11 erneut nach der
 * Foerdersumme und verbrannte damit eine von drei Nachfragen.
 *
 * Die Saetze in diesen Tests stammen woertlich aus dem gepaarten Lauf. Die
 * Falsch-Positiv-Proben sind der eigentliche Gegenstand: eine zu breite Regel
 * wuerde legitime Erstfragen unterdruecken und den Fuellgrad SENKEN — schlimmer
 * als der Defekt, den sie behebt.
 */
describe("bereits verneinte Luecken werden nicht nachgefasst", () => {
  const luecken = (antworten: string[]) =>
    offeneNachfassLuecken(OHNE_SUMME, null, antworten).map((l) => l.feld);

  it("laesst die Foerdersumme aus, wenn der Nutzer sie schon verneint hat", () => {
    const echt =
      "Also, da müssen wir wohl erst noch klären – ich weiß nicht genau, ob der " +
      "Förderverein da einspringen könnte, und wie hoch der Betrag wäre, das haben wir noch nicht.";
    expect(luecken([echt])).not.toContain("budget.beantragt_eur");
  });

  it("fragt weiter, solange nichts verneint wurde", () => {
    expect(luecken(["Wir wollen eine Lese-AG für die Klassen 2 und 3 aufbauen."])).toContain(
      "budget.beantragt_eur"
    );
  });

  // pv-edge-003: ein Stamm `foerder` haette hier unterdrueckt. Die Frage wurde
  // gestellt und brachte "zwischen 25.000 und 30.000 Euro".
  it("FALSCH-POSITIV: \"Bewegungsförderung\" ist keine Verneinung zur Fördersumme", () => {
    const echt =
      "Mit der neuen Fußball-AG des TSV Hannover wollen wir vor allem die " +
      "Bewegungsförderung und soziale Integration stärken – das haben wir noch nicht evaluiert.";
    expect(luecken([echt])).toContain("budget.beantragt_eur");
  });

  // pv-edge-004: verneint ohne Summenwort. Die Frage brachte immerhin
  // Materialkosten von 1.500-2.000 EUR — deshalb ist `kosten` kein Themenwort.
  it("FALSCH-POSITIV: \"noch nicht durchgerechnet\" allein unterdrueckt nicht", () => {
    const echt =
      "Also da wird's jetzt ein bisschen schwierig, weil wir da noch nicht alles " +
      "durchgerechnet haben, muss ich ehrlich sagen.";
    expect(luecken([echt])).toContain("budget.beantragt_eur");
  });

  it("verlangt Verneinung und Themenwort in DERSELBEN Antwort", () => {
    const getrennt = [
      "Über die Summe sprechen wir gerade mit dem Förderverein.",
      "Ob wir eine Turnhalle mitnutzen können, weiß ich nicht.",
    ];
    expect(luecken(getrennt)).toContain("budget.beantragt_eur");
  });

  it("wirkt feldweise, nicht pauschal", () => {
    const nurSchueler = ["Wie viele Schüler wir genau haben, weiß ich nicht auswendig."];
    const felder = offeneNachfassLuecken({}, null, nurSchueler).map((l) => l.feld);
    expect(felder).not.toContain("schule.schuelerzahl");
    expect(felder).toContain("budget.beantragt_eur");
  });

  it("unterdrueckt auch den Eigenanteil, wenn er schon verneint wurde", () => {
    const richtlinie = { eigenmittel: { pflicht: true } } as never;
    const mit = offeneNachfassLuecken(VOLL, richtlinie, [
      "Ob wir einen Eigenanteil stemmen können, kann ich Ihnen nicht sagen.",
    ]);
    expect(mit.map((l) => l.feld)).not.toContain("budget.eigenmittel_eur");
  });

  it("laesst das Gate enden, wenn nur verneinte Luecken offen sind", () => {
    const u = beurteileAbschluss(OHNE_SUMME, null, ["Wie hoch die Summe wäre, weiß ich nicht."], [], 6, 12);
    expect(u.darfEnden).toBe(true);
    expect(u.grund).toBe("keine-luecke");
  });
});
