/**
 * Geber-Klassifikation: 11-Dossier-Mapping zu strategischen Geber-Gruppen.
 * Skelett: Wave 0 (Plan 05-01, D-32). Implementierung: Wave 1 Plan 05-03.
 *
 * Mapping Programm-ID → strategische Geber-Gruppe (D-28):
 * bmbf-digitalpakt-2 → oeffentlich (bundesfoerderung)
 * bosch-schulpreis → wirtschaftspreis
 * aktion-mensch-schulkooperation → stiftung
 * erasmus-schule-2026 → eu
 * kultur-macht-stark → verband-uni
 * ferry-porsche-challenge → wirtschaftspreis
 */

import { getGeberGruppe, ALL_GEBER_GRUPPEN } from "@/lib/wizard/geber-classification";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("Geber-Klassifikation 11-Dossier-Mapping (D-28)", () => {
  it("bmbf-digitalpakt-2 → 'oeffentlich' (bundesfoerderung)", () => {
    expect(getGeberGruppe("bmbf-digitalpakt-2")).toBe("oeffentlich");
  });

  it("bosch-schulpreis → 'wirtschaftspreis'", () => {
    expect(getGeberGruppe("bosch-schulpreis")).toBe("wirtschaftspreis");
  });

  it("aktion-mensch-schulkooperation → 'stiftung'", () => {
    expect(getGeberGruppe("aktion-mensch-schulkooperation")).toBe("stiftung");
  });

  it("erasmus-schule-2026 → 'eu'", () => {
    expect(getGeberGruppe("erasmus-schule-2026")).toBe("eu");
  });

  it("kultur-macht-stark → 'verband-uni'", () => {
    expect(getGeberGruppe("kultur-macht-stark")).toBe("verband-uni");
  });

  it("ferry-porsche-challenge-2025 → 'wirtschaftspreis'", () => {
    expect(getGeberGruppe("ferry-porsche-challenge-2025")).toBe("wirtschaftspreis");
  });

  it("xyz-unbekannt-2099 → 'unknown' + console.warn-Call", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = getGeberGruppe("xyz-unbekannt-2099");
    expect(result).toBe("unknown");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("xyz-unbekannt-2099")
    );
    warnSpy.mockRestore();
  });

  it("alle 11 Dossier-IDs aus data/richtlinien/*.json sind im Mapping enthalten", () => {
    const dossierDir = resolve(__dirname, "../../data/richtlinien");
    const ids = readdirSync(dossierDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const unknownIds = ids.filter((id) => getGeberGruppe(id) === "unknown");
    warnSpy.mockRestore();

    expect(unknownIds).toEqual([]);
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});
