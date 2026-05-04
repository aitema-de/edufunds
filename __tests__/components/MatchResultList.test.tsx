/**
 * Wave-0 Test-Skelett — UI-Smoke fuer MatchResultList + ClarificationCard.
 * Plan 02-02 ersetzt it.todo durch it, importiert die Komponenten und schreibt Assertions.
 * Phase: 02-matcher-quality, D-10/D-11/D-12.
 */

describe("MatchResultList — Ranking-Branch", () => {
  it.todo("rendert passt_weil-Block mit Label 'Passt, weil:' — D-10");
  it.todo("rendert achtung_bei-Block mit Label 'Achtung:' wenn nicht-leer — D-10");
  it.todo("rendert achtung_bei-Block NICHT wenn leer — D-10");
  it.todo("rendert CheckCircle-Icon (lucide-react) im passt_weil-Block — D-10");
  it.todo("rendert AlertTriangle-Icon (lucide-react) im achtung_bei-Block — D-10");
  it.todo("rendert Empty-State-Card bei matches.length===0 — D-12");
});

describe("ClarificationCard", () => {
  it.todo("rendert question-Text als h2 — D-11");
  it.todo("rendert HelpCircle-Icon — D-11");
  it.todo("rendert textarea mit aria-label='Anliegen praezisieren' — D-11");
  it.todo("Praezisieren-Button disabled wenn textarea leer — D-11");
  it.todo("Klick auf 'Praezisieren' ruft onSubmit mit textarea-Wert — D-11");
  it.todo("Override-Link 'Trotzdem mit aktueller Eingabe ranken' ruft onForceRanking — D-11");
});
