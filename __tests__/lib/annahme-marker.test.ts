/**
 * Annahmen-Marker `[Annahme: …]` (Produktentscheidung 02.07.2026, ClickUp 86caht7eq)
 * — deterministisches Kennzeichnen von KI-Annahmen im Antragstext.
 */
import {
  extractAnnahmen,
  findMarker,
  resolveAnnahme,
  wrapAnnahmen,
  MARKER_SPLIT_RE,
} from "@/lib/wizard/annahme-marker";

describe("extractAnnahmen", () => {
  it("liefert Marker-Inhalte in Textreihenfolge, getrimmt und dedupliziert", () => {
    const text =
      "Einleitung. [Annahme: kein WLAN in den Klassenräumen] Mitte " +
      "[Annahme:  wöchentliche AG-Termine ] Ende [Annahme: kein WLAN in den Klassenräumen]";
    expect(extractAnnahmen(text)).toEqual([
      "kein WLAN in den Klassenräumen",
      "wöchentliche AG-Termine",
    ]);
  });

  it("ignoriert TODO-Marker und leere Marker", () => {
    expect(extractAnnahmen("a [TODO: x klären] b [Annahme: ] c")).toEqual([]);
  });
});

describe("wrapAnnahmen", () => {
  it("umhüllt das erste Vorkommen eines Zitats", () => {
    const r = wrapAnnahmen("Die Schulleitung sichert die Integration zu. Weiter.", [
      "Die Schulleitung sichert die Integration zu.",
    ]);
    expect(r.text).toBe("[Annahme: Die Schulleitung sichert die Integration zu.] Weiter.");
    expect(r.marked).toEqual(["Die Schulleitung sichert die Integration zu."]);
  });

  it("markiert nicht doppelt (schon vorhandener Marker mit gleichem Inhalt)", () => {
    const text = "[Annahme: kein Medienkonzept vorhanden] Rest kein Medienkonzept vorhanden";
    const r = wrapAnnahmen(text, ["kein Medienkonzept vorhanden"]);
    expect(r.text).toBe(text);
    expect(r.marked).toEqual([]);
  });

  it("überspringt Zitate innerhalb eines bestehenden Markers", () => {
    const text = "[Annahme: an der Schule besteht kein Konzept] Rest.";
    const r = wrapAnnahmen(text, ["besteht kein Konzept"]);
    expect(r.text).toBe(text);
    expect(r.marked).toEqual([]);
  });

  it("überspringt nicht auffindbare Zitate und solche mit eckigen Klammern", () => {
    const r = wrapAnnahmen("Ein Text.", ["nicht vorhanden", "mit [Klammer]"]);
    expect(r.text).toBe("Ein Text.");
    expect(r.marked).toEqual([]);
  });
});

describe("resolveAnnahme", () => {
  const text = "Vorher. [Annahme: die Aula steht zur Verfügung] Nachher.";

  it("uebernehmen: löst den Marker auf, Inhalt bleibt", () => {
    expect(resolveAnnahme(text, "die Aula steht zur Verfügung", "uebernehmen")).toBe(
      "Vorher. die Aula steht zur Verfügung Nachher."
    );
  });

  it("ersetzen: ersetzt den Marker durch die Nutzer-Formulierung", () => {
    expect(
      resolveAnnahme(text, "die Aula steht zur Verfügung", "ersetzen", "wir nutzen Raum 12")
    ).toBe("Vorher. wir nutzen Raum 12 Nachher.");
  });

  it("streichen: entfernt Marker samt Inhalt und glättet Whitespace", () => {
    expect(resolveAnnahme(text, "die Aula steht zur Verfügung", "streichen")).toBe(
      "Vorher. Nachher."
    );
  });

  it("Fallback ohne Marker (Alt-Sessions): wirkt auf das nackte Zitat", () => {
    const legacy = "Der Satz bleibt so stehen. Ende.";
    expect(resolveAnnahme(legacy, "Der Satz bleibt so stehen.", "uebernehmen")).toBe(legacy);
    expect(resolveAnnahme(legacy, "Der Satz bleibt so stehen.", "streichen")).toBe("Ende.");
  });

  it("whitespace-toleranter Marker-Lookup", () => {
    const t = "A [Annahme:   viel   Raum  ] B";
    expect(findMarker(t, "viel   Raum")).toBe("[Annahme:   viel   Raum  ]");
    expect(resolveAnnahme(t, "viel   Raum", "streichen")).toBe("A B");
  });
});

describe("MARKER_SPLIT_RE (UI-Highlighting)", () => {
  it("splittet Annahme- und TODO-Marker als eigene Segmente", () => {
    const parts = "x [Annahme: a] y [TODO: b] z".split(MARKER_SPLIT_RE);
    expect(parts).toEqual(["x ", "[Annahme: a]", " y ", "[TODO: b]", " z"]);
  });
});
