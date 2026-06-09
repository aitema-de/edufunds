import {
  loadRichtlinie,
  listRichtlinienIds,
} from "@/lib/wizard/richtlinien-loader";

describe("richtlinien-loader (Schema-Erweiterung Phase 3)", () => {
  it("sollte Legacy-Dossier ohne 4 neue Felder ohne Crash laden", async () => {
    const r = await loadRichtlinie("aktion-mensch-schulkooperation");
    expect(r).not.toBeNull();
    expect(r!.bestPractices).toBeUndefined();
    expect(r!.rejectGruende).toBeUndefined();
    expect(r!.vorbildFormulierungen).toBeUndefined();
    expect(r!.fristLogik).toBeUndefined();
  });

  it("sollte alle 11 bestehenden Dossier-IDs auflisten", async () => {
    const ids = await listRichtlinienIds();
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});
