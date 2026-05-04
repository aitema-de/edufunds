/**
 * Wave-0 Test-Skelett — Parser-Tests fuer parsePipeMatches.
 * Plan 02-01 ersetzt it.todo durch it und schreibt Assertions.
 * Phase: 02-matcher-quality, D-01/D-02.
 */

describe("parsePipeMatches — 4-Spalten-Pipe-Format", () => {
  it.todo("parst korrekte 4-Spalten-Zeile (id|score|passt_weil|achtung_bei) — D-01");
  it.todo("verwirft Zeile mit 3 Spalten (Soft-Failure, kein Throw) — D-02");
  it.todo("verwirft Zeile mit 5 Spalten (Soft-Failure) — D-02");
  it.todo("parst Trailing-Pipe als leeres achtung_bei (id|score|text|) — D-01");
  it.todo("ignoriert CLARIFY|-Zeilen (werden in runMatch dispatched, nicht im Parser) — D-05");
  it.todo("ignoriert Code-Fence-Zeilen (```)");
  it.todo("verwirft Zeile mit unbekannter programmId (validIds-Set-Filter)");
  it.todo("verwirft Zeile mit nicht-numerischem Score (NaN-Filter)");
});
