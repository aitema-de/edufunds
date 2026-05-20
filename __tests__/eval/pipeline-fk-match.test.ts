/**
 * WIZ-01 Score-Logik: FK-Match auf antragsstruktur.abschnitte[].name
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 2 Plan 05-04.
 *
 * Prueft ob alle Pflicht-Abschnitte aus dem Dossier im finalen Pipeline-Output
 * vorhanden sind (strict FK-Match auf abschnitte[].id + name, case-insensitive).
 * maxZeichen-Check ist optional (Stand Phase-5-Start: 0/11 Dossiers haben maxZeichen).
 */
describe("WIZ-01 FK-Match Score-Logik", () => {
  it.todo("alle Pflicht-Abschnitte aus Dossier vorhanden → coveragePercent=100");
  it.todo("0/N Pflicht-Abschnitte vorhanden → coveragePercent=0");
  it.todo("3/5 Pflicht-Abschnitte vorhanden → coveragePercent=60");
  it.todo("normalizeAbschnittName(): case-insensitive + whitespace-trim");
  it.todo("Dossier ohne antragsstruktur.abschnitte → coveragePercent=100 (trivial)");
  it.todo("maxZeichen-Violation: Section ueber Limit zaehlt in violations[]");
  it.todo("maxZeichen=null (kein Dossier-Feld) → maxZeichenOK=null");
});
