/**
 * naechsteFrist() — Anzeige des naechsten belegten Stichtags (Issue #109).
 *
 * Entscheidung Kolja 22.07.2026: Wiederkehrende Stichtag-Programme bleiben
 * ganzjaehrig verkaeuflich — dann muss der Kunde aber sehen, wann die naechste
 * Runde ansteht. Diese Tests nageln die Berechnungsregeln fest.
 */
import { naechsteFrist, formatFristDatum, type FristZustand } from "@/lib/foerder-zustaende";

// Fixes "heute" fuer deterministische Tests: 22.07.2026 (UTC).
const HEUTE = new Date(Date.UTC(2026, 6, 22, 12, 0, 0));

describe("naechsteFrist", () => {
  it("liefert null fuer keine/unbekannt/fehlend (kein Stichtag-Programm)", () => {
    expect(naechsteFrist(undefined, HEUTE)).toBeNull();
    expect(naechsteFrist({ art: "keine", quelle: "q" }, HEUTE)).toBeNull();
    expect(naechsteFrist({ art: "unbekannt" }, HEUTE)).toBeNull();
    expect(
      naechsteFrist({ art: "geschlossen", quelle: "q" } as FristZustand, HEUTE)
    ).toBeNull();
  });

  it("liefert den kuenftigen Stichtag unveraendert", () => {
    const fz: FristZustand = { art: "stichtag", stichtage: ["2026-10-02"], quelle: "q" };
    expect(naechsteFrist(fz, HEUTE)).toBe("2026-10-02");
  });

  it("ein Stichtag HEUTE zaehlt noch als kuenftig (Gate-Lehre 17.07.2026)", () => {
    const fz: FristZustand = { art: "stichtag", stichtage: ["2026-07-22"], quelle: "q" };
    expect(naechsteFrist(fz, HEUTE)).toBe("2026-07-22");
  });

  it("rollt vergangene Stichtage NUR bei jaehrlichWiederkehrend ins naechste Jahr", () => {
    // 12.02. ist vorbei -> 12.02. naechsten Jahres (Akzeptanzkriterium #109)
    const wiederkehrend: FristZustand = {
      art: "stichtag",
      stichtage: ["2026-02-12"],
      jaehrlichWiederkehrend: true,
      quelle: "q",
    };
    expect(naechsteFrist(wiederkehrend, HEUTE)).toBe("2027-02-12");

    // Nicht wiederkehrend + vergangen -> null (Anzeige-Pfad; Verkauf regelt das Gate)
    const einmalig: FristZustand = { art: "stichtag", stichtage: ["2026-02-12"], quelle: "q" };
    expect(naechsteFrist(einmalig, HEUTE)).toBeNull();
  });

  it("waehlt bei mehreren Stichtagen den zeitlich naechsten", () => {
    // Berliner Projektfonds-Muster: drei Saeulen-Termine, jaehrlich wiederkehrend.
    // 08.01. und 12.02. sind 2026 vorbei (-> 2027), 02.10.2026 steht bevor.
    const fz: FristZustand = {
      art: "stichtag",
      stichtage: ["2026-01-08", "2026-02-12", "2026-10-02"],
      jaehrlichWiederkehrend: true,
      quelle: "q",
    };
    expect(naechsteFrist(fz, HEUTE)).toBe("2026-10-02");
  });

  it("ignoriert kaputte Datumsstrings statt zu werfen", () => {
    const fz: FristZustand = {
      art: "stichtag",
      stichtage: ["quatsch", "2026-10-02"],
      quelle: "q",
    };
    expect(naechsteFrist(fz, HEUTE)).toBe("2026-10-02");

    const nurKaputt: FristZustand = { art: "stichtag", stichtage: ["quatsch"], quelle: "q" };
    expect(naechsteFrist(nurKaputt, HEUTE)).toBeNull();
  });

  it("leere Stichtagsliste -> null", () => {
    const fz: FristZustand = { art: "stichtag", stichtage: [], quelle: "q" };
    expect(naechsteFrist(fz, HEUTE)).toBeNull();
  });
});

describe("formatFristDatum", () => {
  it("formatiert ISO als deutsches Datum", () => {
    expect(formatFristDatum("2026-10-02")).toBe("02.10.2026");
  });

  it("gibt Nicht-ISO-Eingaben unveraendert zurueck", () => {
    expect(formatFristDatum("quatsch")).toBe("quatsch");
  });
});
