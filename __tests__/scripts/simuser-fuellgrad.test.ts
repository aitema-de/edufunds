/**
 * Fuellgrad der nachgefassten Zielfelder — das Erfolgsmass des Abschluss-Gates.
 *
 * Warum diese Kennzahl eigens existiert: Die aggregierte "Zahlangaben in Fakten"
 * kann steigen, waehrend genau die Felder leer bleiben, an denen der Finanzplan
 * scheitert — sie zaehlt jede Zahl irgendwo in der Tabelle, auch Jahreszahlen und
 * Klassenstufen. Am 03.08.2026 fiel sie um 0,6, waehrend die Note unveraendert
 * blieb; als Wirkungsnachweis fuer das Gate taugt sie deshalb nicht.
 *
 * Die Tests halten fest, dass "belegt" streng gemeint ist: eine 0, ein leeres
 * Array oder ein Text im Zahlenfeld zaehlen NICHT als Angabe. Sonst meldete die
 * Messung einen Erfolg, den es nicht gibt.
 */
import { berechneAusbeute } from "@/scripts/eval-simuser";

const eintrag = (facts: unknown, extra: Record<string, unknown> = {}) =>
  ({
    id: "pv-test",
    kategorie: "vag",
    turns: 8,
    facts,
    messages: [],
    zahlenLeck: [],
    stagnation: 0,
    ...extra,
  }) as never;

const VOLL = {
  schule: { name: "Testschule", schuelerzahl: 240 },
  budget: { beantragt_eur: 5000, hauptposten: ["Buecher", "Honorar"] },
};

describe("Fuellgrad der Zielfelder", () => {
  it("zaehlt belegte Felder ueber alle Interviews", () => {
    const a = berechneAusbeute([eintrag(VOLL), eintrag(VOLL), eintrag({ schule: {} })]);
    expect(a.n).toBe(3);
    expect(a.fuellgrad["budget.beantragt_eur"]).toBe(2);
    expect(a.fuellgrad["budget.hauptposten"]).toBe(2);
    expect(a.fuellgrad["schule.schuelerzahl"]).toBe(2);
  });

  it("wertet ein leeres Posten-Array NICHT als Angabe", () => {
    const a = berechneAusbeute([eintrag({ budget: { hauptposten: [] } })]);
    expect(a.fuellgrad["budget.hauptposten"]).toBe(0);
  });

  it("wertet 0 EUR und 0 Schueler NICHT als Angabe", () => {
    const a = berechneAusbeute([
      eintrag({ schule: { schuelerzahl: 0 }, budget: { beantragt_eur: 0 } }),
    ]);
    expect(a.fuellgrad["budget.beantragt_eur"]).toBe(0);
    expect(a.fuellgrad["schule.schuelerzahl"]).toBe(0);
  });

  // Der Extraktor liefert gelegentlich Text statt Zahl ("ca. 5.000 EUR"). Das ist
  // fuer den Finanzplan keine verwertbare Angabe und darf den Fuellgrad nicht heben.
  it("wertet einen Text im Zahlenfeld NICHT als Angabe", () => {
    const a = berechneAusbeute([
      eintrag({ schule: { schuelerzahl: "240" }, budget: { beantragt_eur: "ca. 5000" } }),
    ]);
    expect(a.fuellgrad["budget.beantragt_eur"]).toBe(0);
    expect(a.fuellgrad["schule.schuelerzahl"]).toBe(0);
  });

  it("laesst fehlgeschlagene Interviews aussen vor", () => {
    const a = berechneAusbeute([eintrag(VOLL), eintrag(VOLL, { fehler: "timeout" })]);
    expect(a.n).toBe(1);
    expect(a.fuellgrad["budget.beantragt_eur"]).toBe(1);
  });

  it("kommt mit fehlenden Facts zurecht", () => {
    const a = berechneAusbeute([eintrag(undefined), eintrag(null), eintrag({})]);
    for (const feld of Object.values(a.fuellgrad)) expect(feld).toBe(0);
  });
});
