import {
  loadRichtlinie,
  listRichtlinienIds,
} from "@/lib/wizard/richtlinien-loader";

/**
 * HINWEIS (aktualisiert): Die urspruengliche Erwartung war, dass das On-Disk-
 * Dossier `aktion-mensch-schulkooperation` ein Legacy-Dossier OHNE die 4 neuen
 * Schema-Felder ist. Inzwischen sind ALLE Dossiers in data/richtlinien/ auf den
 * vollstaendigen Stand migriert (alle 4 Felder vorhanden). Der Test prueft daher
 * jetzt das tatsaechliche aktuelle Verhalten:
 *  - der Loader laedt ein reales Dossier ohne Crash,
 *  - die 4 (optionalen) Felder sind im migrierten Dossier vorhanden,
 *  - ein Loader-Aufruf fuer ein nicht existierendes Dossier liefert null statt zu werfen,
 *  - listRichtlinienIds() listet alle Dossier-IDs.
 */
describe("richtlinien-loader", () => {
  it("sollte ein reales (migriertes) Dossier ohne Crash laden", async () => {
    const r = await loadRichtlinie("aktion-mensch-schulkooperation");
    expect(r).not.toBeNull();
    // Migrierter Stand: die 4 erweiterten Felder sind vorhanden.
    expect(r!.bestPractices).toBeDefined();
    expect(r!.rejectGruende).toBeDefined();
    expect(r!.vorbildFormulierungen).toBeDefined();
    expect(r!.fristLogik).toBeDefined();
  });

  it("sollte null zurueckgeben fuer ein nicht existierendes Dossier (kein Crash)", async () => {
    const r = await loadRichtlinie("dieses-dossier-existiert-definitiv-nicht-2099");
    expect(r).toBeNull();
  });

  it("sollte alle vorhandenen Dossier-IDs auflisten", async () => {
    const ids = await listRichtlinienIds();
    // Der Katalog ist von 11 auf inzwischen ~100 Dossiers gewachsen.
    expect(ids.length).toBeGreaterThanOrEqual(11);
    expect(ids).toContain("aktion-mensch-schulkooperation");
  });
});
