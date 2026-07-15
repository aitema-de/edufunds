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

  /**
   * HINWEIS (aktualisiert): Die urspruengliche Erwartung war, dass JEDE
   * Dossier-ID aus data/richtlinien/ im MAPPING enthalten ist (Phase-5-Stand:
   * 11 Dossiers == 11 Mapping-Eintraege). Der Katalog ist inzwischen auf ~100
   * Dossiers gewachsen, das MAPPING ist laut Quell-Doku aber BEWUSST ein
   * kuratierter Subset ("Scope: 11 Dossiers; neue Programme werden ad-hoc
   * gepflegt; nicht gemappte IDs liefern 'unknown' + Console-Warning").
   *
   * Der Test prueft daher jetzt das DOKUMENTIERTE Verhalten:
   *  - die explizit gemappten Stamm-Dossier-IDs, die noch auf der Platte
   *    liegen, resolven zu einer bekannten Gruppe (!= "unknown"),
   *  - on-disk-IDs, die NICHT im Mapping stehen, resolven zu "unknown"
   *    (kein silent skip; Console-Warning).
   */
  const GEMAPPTE_STAMM_IDS = [
    "bmbf-digitalpakt-2",
    "berlin-startchancen",
    "ensam-bmz",
    "aktion-mensch-schulkooperation",
    "klimalab-2026",
    "erasmus-schule-2026",
    "erasmus-schulentwicklung",
    "bosch-schulpreis",
    "ferry-porsche-challenge",
    "kultur-macht-stark",
    "heinz-nixdorf-stiftung-projektfoerderung-mint",
  ];

  it("die gemappten Stamm-Dossier-IDs resolven zu einer bekannten Geber-Gruppe", () => {
    const dossierDir = resolve(__dirname, "../../data/richtlinien");
    const onDisk = new Set(
      readdirSync(dossierDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""))
    );

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    for (const id of GEMAPPTE_STAMM_IDS) {
      // Sanity: die Stamm-IDs existieren noch im Katalog.
      expect(onDisk.has(id)).toBe(true);
      expect(getGeberGruppe(id)).not.toBe("unknown");
    }
    warnSpy.mockRestore();
  });

  it("nicht gemappte on-disk-IDs resolven zu 'unknown' mit Console-Warning", () => {
    const dossierDir = resolve(__dirname, "../../data/richtlinien");
    const ids = readdirSync(dossierDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const ungemappt = ids.filter((id) => !GEMAPPTE_STAMM_IDS.includes(id));
    // Der Katalog ist gewachsen → es gibt nicht gemappte Dossiers.
    expect(ungemappt.length).toBeGreaterThan(0);
    for (const id of ungemappt) {
      expect(getGeberGruppe(id)).toBe("unknown");
    }
    // getGeberGruppe darf bei nicht gemappten IDs nicht silent sein.
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    expect(ids.length).toBeGreaterThanOrEqual(11);
  });
});
