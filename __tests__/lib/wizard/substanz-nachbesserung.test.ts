/**
 * Substanz-Nachbesserung (Revisions-Konsistenz-Hebel, pv-011):
 * deterministischer Trigger, Never-Worse-Uebernahme, limit-treues Splicing.
 */
import {
  findeKandidaten,
  findeAbschnittsLimit,
  akzeptiereVorschlag,
  spliceAbschnitte,
  substanzNachbesserung,
} from "@/lib/wizard/substanz-nachbesserung";
import type { Richtlinie } from "@/lib/wizard/richtlinien-schema";

// Begruendeter Text: Theorie-Marker (Selbstwirksamkeit) + 2 Konnektive (weil, daher).
const BEGRUENDET =
  "Wir bauen eine Holzwerkstatt auf, weil Selbstwirksamkeit nach praktischen Erfolgserlebnissen waechst — " +
  "daher verankern wir woechentliche Projektzeiten fuer alle Klassen.";
// Beschreibender Text ohne Begruendungs-Signale.
const BESCHREIBEND =
  "Die Schule kauft zehn Werkbaenke und richtet einen Raum im Erdgeschoss ein. " +
  "Die Klassen nutzen den Raum im Wechsel. Ein Plan regelt die Belegung.";

const RICHTLINIE = {
  antragsstruktur: {
    abschnitte: [
      { id: "a1", name: "Projektbeschreibung", pflicht: true, maxZeichen: 750 },
      { id: "a2", name: "Ausgangslage", pflicht: true },
    ],
  },
  eigenmittel: { pflicht: false },
} as unknown as Richtlinie;

describe("findeKandidaten", () => {
  it("liefert nur relevante Abschnitte ohne Substanz, mit Richtlinien-Limit", () => {
    const text = `Titel\n\n## Projektbeschreibung\n${BESCHREIBEND}\n\n## Ausgangslage\n${BEGRUENDET}\n\n## Finanzplan\nPosten A: 500 EUR`;
    const k = findeKandidaten(text, RICHTLINIE);
    expect(k.map((x) => x.name)).toEqual(["Projektbeschreibung"]);
    expect(k[0].maxZeichen).toBe(750);
  });

  it("gibt leere Liste, wenn alle Abschnitte begruenden", () => {
    const text = `## Ausgangslage\n${BEGRUENDET}`;
    expect(findeKandidaten(text, RICHTLINIE)).toEqual([]);
  });
});

describe("findeAbschnittsLimit", () => {
  it("matcht exakt und normalisiert (Case/Whitespace)", () => {
    expect(findeAbschnittsLimit("Projektbeschreibung", RICHTLINIE)).toBe(750);
    expect(findeAbschnittsLimit("  projektbeschreibung ", RICHTLINIE)).toBe(750);
    expect(findeAbschnittsLimit("Ausgangslage", RICHTLINIE)).toBeUndefined();
    expect(findeAbschnittsLimit("Unbekannt", RICHTLINIE)).toBeUndefined();
  });
});

describe("akzeptiereVorschlag (Never-Worse)", () => {
  const kandidat = { name: "Projektbeschreibung", text: BESCHREIBEND };

  it("akzeptiert messbar begruendete Vorschlaege", () => {
    expect(akzeptiereVorschlag(kandidat, BESCHREIBEND + " " + BEGRUENDET)).toBe(true);
  });

  it("verwirft Vorschlaege ohne Substanz-Signale", () => {
    expect(akzeptiereVorschlag(kandidat, BESCHREIBEND + " Der Raum ist hell.")).toBe(false);
  });

  it("verwirft Vorschlaege ueber dem belegten Zeichenlimit", () => {
    const mitLimit = { ...kandidat, maxZeichen: 100 };
    expect(akzeptiereVorschlag(mitLimit, BEGRUENDET)).toBe(false); // ~190 Zeichen > 100
  });

  it("erlaubt Verdichtung unter Limit, verwirft aber Stummel", () => {
    const mitLimit = { ...kandidat, maxZeichen: 750 };
    expect(akzeptiereVorschlag(mitLimit, BEGRUENDET)).toBe(true); // kuerzer als Original, aber Limit-Fall
    expect(akzeptiereVorschlag(kandidat, "Weil Teilhabe wichtig ist, weil, daher.")).toBe(false); // ohne Limit: degeneriert kurz
  });
});

describe("spliceAbschnitte", () => {
  const text = `Praeambel\n\n## Eins\nAlter Text eins.\n\n## Zwei\nAlter Text zwei.\n\n## Drei\nAlter Text drei.`;

  it("ersetzt nur die genannten Abschnitte, Praeambel und Reihenfolge bleiben", () => {
    const out = spliceAbschnitte(text, new Map([["zwei", "NEUER Text zwei."]]));
    expect(out).toContain("Praeambel");
    expect(out).toContain("Alter Text eins.");
    expect(out).toContain("NEUER Text zwei.");
    expect(out).not.toContain("Alter Text zwei.");
    expect(out).toContain("Alter Text drei.");
    expect(out.indexOf("## Eins")).toBeLessThan(out.indexOf("## Zwei"));
    expect(out.indexOf("## Zwei")).toBeLessThan(out.indexOf("## Drei"));
  });

  it("laesst Text ohne Ueberschriften unveraendert", () => {
    expect(spliceAbschnitte("nur Prosa", new Map([["x", "y"]]))).toBe("nur Prosa");
  });
});

describe("substanzNachbesserung (Ende-zu-Ende mit Mock-LLM)", () => {
  const text = `Titel\n\n## Projektbeschreibung\n${BESCHREIBEND}\n\n## Ausgangslage\n${BEGRUENDET}`;

  it("skippt ohne Kandidaten (0 LLM-Calls)", async () => {
    const generate = jest.fn();
    const res = await substanzNachbesserung(`## Ausgangslage\n${BEGRUENDET}`, RICHTLINIE, { generate });
    expect(res).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it("uebernimmt akzeptierte Vorschlaege und protokolliert den Rest", async () => {
    const generate = jest.fn().mockResolvedValue({
      value: {
        abschnitte: [{ name: "Projektbeschreibung", text: BESCHREIBEND + " " + BEGRUENDET }],
      },
    });
    const res = await substanzNachbesserung(text, RICHTLINIE, { generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(res?.kandidaten).toEqual(["Projektbeschreibung"]);
    expect(res?.verbessert).toEqual(["Projektbeschreibung"]);
    expect(res?.verbleibend).toEqual([]);
    expect(res?.finalText).toContain("Selbstwirksamkeit");
    // Der nicht-kandidierte Abschnitt bleibt woertlich erhalten.
    expect(res?.finalText).toContain(BEGRUENDET);
  });

  it("behaelt das Original, wenn der Vorschlag substanzlos bleibt", async () => {
    const generate = jest.fn().mockResolvedValue({
      value: { abschnitte: [{ name: "Projektbeschreibung", text: BESCHREIBEND + " Noch ein Satz." }] },
    });
    const res = await substanzNachbesserung(text, RICHTLINIE, { generate });
    expect(res?.verbessert).toEqual([]);
    expect(res?.verbleibend).toEqual(["Projektbeschreibung"]);
    expect(res?.finalText).toBe(text);
  });

  it("behaelt das Original bei kaputtem LLM-JSON", async () => {
    const generate = jest.fn().mockResolvedValue({ value: "kein json" });
    const res = await substanzNachbesserung(text, RICHTLINIE, { generate });
    expect(res?.verbleibend).toEqual(["Projektbeschreibung"]);
    expect(res?.finalText).toBe(text);
  });
});
