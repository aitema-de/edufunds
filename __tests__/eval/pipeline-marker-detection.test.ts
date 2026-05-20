/**
 * WIZ-02 Layer-1 Marker-Detection (deterministisch, kein LLM).
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Layer-1 prueft expected_forbidden_markers[] pro Korpus-Eintrag gegen
 * den finalen Pipeline-Output (finalText + sections[].text + finanzplan-Text).
 * Jeder Treffer = 1 Halluzinations-Marker gefunden.
 */
describe("WIZ-02 Layer-1 Marker-Detection", () => {
  it.todo("positiver Hit: forbidden_marker im finalText gefunden → markerCount=1");
  it.todo("Multi-Source-Haystack: Marker nur in sections[0].text, nicht in finalText → trotzdem gefunden");
  it.todo("case-insensitive Match: Marker 'TV-L E9' matcht 'tv-l e9' im Output");
  it.todo("kein Hit wenn Marker im Output fehlt → markerCount=0, score=100");
  it.todo("expected_forbidden_markers=[] → score=100 (kein Test, volle Punktzahl)");
});
