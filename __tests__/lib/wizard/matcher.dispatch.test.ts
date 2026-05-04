/**
 * Wave-0 Test-Skelett — Dispatch-Tests fuer runMatch (CLARIFY vs Ranking).
 * Plan 02-01 ersetzt it.todo durch it, mockt generateText und schreibt Assertions.
 * Phase: 02-matcher-quality, D-05/D-08/D-09.
 */

describe("runMatch — CLARIFY-Dispatch", () => {
  it.todo("liefert kind=clarification wenn erste Zeile mit CLARIFY| beginnt — D-05/D-08");
  it.todo("extrahiert question-Text rechts vom CLARIFY|-Praefix — D-05");
  it.todo("liefert kind=ranking wenn erste Zeile id|score|... ist — D-08");
  it.todo("ignoriert CLARIFY in spaeteren Zeilen (nur erste Zeile zaehlt) — D-05");
});

describe("runMatch — forceRanking-Override", () => {
  it.todo("liefert kind=ranking wenn forceRanking=true, auch bei CLARIFY-LLM-Antwort — D-09");
  it.todo("forceRanking=false (default) erlaubt CLARIFY-Dispatch — D-09");
  it.todo("buildUserPrompt fuegt forceRanking-Hinweis-Block an wenn forceRanking=true");
  it.todo("buildUserPrompt fuegt previousAnliegen-Block an wenn previousAnliegen gesetzt — D-09");
});

describe("runMatch — costs-Feldname", () => {
  it.todo("ranking-Result enthaelt Feld 'costs' (nicht 'cost') — Codebase-Konvention");
  it.todo("clarification-Result enthaelt Feld 'costs' (nicht 'cost') — Codebase-Konvention");
});
