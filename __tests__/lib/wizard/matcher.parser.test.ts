/**
 * Parser-Tests fuer parsePipeMatches.
 * Phase: 02-matcher-quality, D-01/D-02/D-05.
 *
 * Verifiziert die 4-Spalten-Pipe-Format-Logik (id|score|passt_weil|achtung_bei),
 * Soft-Failure bei !=4 Spalten und CLARIFY-Zeilen-Skip.
 */

import { parsePipeMatches } from "@/lib/wizard/matcher";

const VALID = new Set(["prog-a", "prog-b", "bmbf-digitalpakt-2"]);

describe("parsePipeMatches — 4-Spalten-Pipe-Format", () => {
  it("parst korrekte 4-Spalten-Zeile (id|score|passt_weil|achtung_bei) — D-01", () => {
    const out = parsePipeMatches(
      "prog-a|85|Guter Match.|Frist beachten.",
      VALID
    );
    expect(out).toEqual([
      {
        id: "prog-a",
        score: 85,
        passt_weil: "Guter Match.",
        achtung_bei: "Frist beachten.",
      },
    ]);
  });

  it("verwirft Zeile mit 3 Spalten (Soft-Failure, kein Throw) — D-02", () => {
    expect(() => parsePipeMatches("prog-a|85|Kein viertes Feld", VALID)).not.toThrow();
    const out = parsePipeMatches("prog-a|85|Kein viertes Feld", VALID);
    expect(out).toEqual([]);
  });

  it("verwirft Zeile mit 5 Spalten (Soft-Failure) — D-02", () => {
    const out = parsePipeMatches("prog-a|85|a|b|c", VALID);
    expect(out).toEqual([]);
  });

  it("parst Trailing-Pipe als leeres achtung_bei (id|score|text|) — D-01", () => {
    const out = parsePipeMatches("prog-a|85|Match-Beschreibung.|", VALID);
    expect(out).toEqual([
      {
        id: "prog-a",
        score: 85,
        passt_weil: "Match-Beschreibung.",
        achtung_bei: "",
      },
    ]);
  });

  it("ignoriert CLARIFY|-Zeilen (werden in runMatch dispatched, nicht im Parser) — D-05", () => {
    const out = parsePipeMatches(
      "CLARIFY|Welches Bundesland sucht ihr?",
      VALID
    );
    expect(out).toEqual([]);
  });

  it("ignoriert Code-Fence-Zeilen (```)", () => {
    const text = [
      "```",
      "prog-a|85|Match.|Frist.",
      "```",
    ].join("\n");
    const out = parsePipeMatches(text, VALID);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("prog-a");
  });

  it("verwirft Zeile mit unbekannter programmId (validIds-Set-Filter)", () => {
    const out = parsePipeMatches("unbekannte-id|80|Text.|Hinweis.", VALID);
    expect(out).toEqual([]);
  });

  it("verwirft Zeile mit nicht-numerischem Score (NaN-Filter)", () => {
    const out = parsePipeMatches("prog-a|abc|Text.|Hinweis.", VALID);
    expect(out).toEqual([]);
  });
});
