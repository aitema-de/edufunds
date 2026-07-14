/**
 * Beantragungshöhe-Orientierung (P4-B, Pilot-Feedback 24.06.).
 * Deterministische Ableitung aus Katalog-Feldern — keine erfundenen Zahlen.
 */
import {
  buildFoerderhoeheHinweis,
  buildBeantragungsEmpfehlung,
} from "@/lib/foerderhoehe-empfehlung";

describe("buildFoerderhoeheHinweis", () => {
  it("nennt eine Spanne, wenn min und max vorliegen", () => {
    const h = buildFoerderhoeheHinweis({
      foerdersummeMin: 400,
      foerdersummeMax: 1000,
      foerdersummeText: "5€ pro Bewegungseinheit; Fördervereine max. 1.000€",
    });
    expect(h.hatZahl).toBe(true);
    expect(h.headline).toBe("Dieses Programm fördert typischerweise 400 € bis 1.000 €");
    // Der konditionale Freitext bleibt als maßgebliches Detail erhalten.
    expect(h.detail).toContain("Bewegungseinheit");
  });

  it("nennt nur eine Obergrenze, wenn kein min vorliegt", () => {
    const h = buildFoerderhoeheHinweis({ foerdersummeMax: 500000 });
    expect(h.hatZahl).toBe(true);
    expect(h.headline).toBe("Dieses Programm fördert bis zu 500.000 €");
    expect(h.detail).toBeUndefined();
  });

  it("nennt eine Untergrenze, wenn nur min vorliegt", () => {
    const h = buildFoerderhoeheHinweis({ foerdersummeMin: 2000 });
    expect(h.headline).toBe("Dieses Programm fördert ab 2.000 €");
    expect(h.hatZahl).toBe(true);
  });

  it("kollabiert gleiche min/max zu einer Obergrenze", () => {
    const h = buildFoerderhoeheHinweis({ foerdersummeMin: 5000, foerdersummeMax: 5000 });
    expect(h.headline).toBe("Dieses Programm fördert bis zu 5.000 €");
  });

  it("degradiert qualitativ, wenn keine belastbare Zahl vorliegt", () => {
    const h = buildFoerderhoeheHinweis({
      foerdersummeMin: null,
      foerdersummeMax: null,
      foerdersummeText: "Keine offenen Antragsprogramme für Einzelschulen",
    });
    expect(h.hatZahl).toBe(false);
    expect(h.headline).toBe("Die Förderhöhe richtet sich nach den Programmbedingungen");
    // Der Freitext trägt hier die eigentliche Information und bleibt erhalten.
    expect(h.detail).toContain("Keine offenen");
  });

  it("behandelt 0 und negative Werte als 'keine Zahl'", () => {
    const h = buildFoerderhoeheHinweis({ foerdersummeMin: 0, foerdersummeMax: -1 });
    expect(h.hatZahl).toBe(false);
  });

  it("ignoriert leeren Freitext", () => {
    const h = buildFoerderhoeheHinweis({ foerdersummeMax: 10000, foerdersummeText: "   " });
    expect(h.detail).toBeUndefined();
  });
});

describe("buildBeantragungsEmpfehlung", () => {
  it("nimmt den niedrigeren aus Deckel und Quoten-Deckel (Quote bindet)", () => {
    // Deckel 20.000 €, aber 50% von 30.000 € = 15.000 € → Quote bindet.
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { maxEur: 20000, maxProzentGesamtkosten: 50 },
      gesamtkostenEur: 30000,
    });
    expect(e.hatEmpfehlung).toBe(true);
    expect(e.headline).toBe(
      "Für Ihr Projektvolumen von 30.000 € können Sie bei diesem Programm bis zu 15.000 € beantragen."
    );
    expect(e.basis).toContain("50% von 30.000 € Projektkosten");
  });

  it("nimmt den niedrigeren aus Deckel und Quoten-Deckel (Deckel bindet)", () => {
    // 80% von 30.000 € = 24.000 €, aber Deckel 20.000 € → Deckel bindet.
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { maxEur: 20000, maxProzentGesamtkosten: 80 },
      gesamtkostenEur: 30000,
    });
    expect(e.headline).toContain("bis zu 20.000 €");
    expect(e.basis).toContain("Förderdeckel 20.000 €");
  });

  it("fällt ohne Projektvolumen auf die reine Programm-Obergrenze zurück", () => {
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { maxEur: 20000, maxProzentGesamtkosten: 50 },
    });
    expect(e.hatEmpfehlung).toBe(true);
    expect(e.headline).toBe("Dieses Programm fördert bis zu 20.000 €.");
    // Ohne Volumen kann der Quoten-Deckel nicht berechnet werden.
    expect(e.basis).toBe("Grundlage: Förderdeckel 20.000 €.");
  });

  it("nutzt Katalog-Fallback, wenn kein Dossier-Deckel vorliegt", () => {
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: null,
      katalog: { foerdersummeMax: 5000, foerdersummeText: "bis 5.000 € pro Schuljahr" },
      gesamtkostenEur: 12000,
    });
    expect(e.headline).toContain("bis zu 5.000 €");
    expect(e.detail).toBe("bis 5.000 € pro Schuljahr");
  });

  it("bevorzugt Dossier-bemerkung als Detail vor Katalog-Freitext", () => {
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { maxEur: 5500, bemerkung: "KEIN bundesweites Programm — Sammeleintrag" },
      katalog: { foerdersummeText: "bis 5.500 €" },
    });
    expect(e.detail).toBe("KEIN bundesweites Programm — Sammeleintrag");
  });

  it("degradiert qualitativ ohne belastbare Zahl (nur Freitext)", () => {
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { bemerkung: "Sachleistung, keine Geldförderung" },
      gesamtkostenEur: 8000,
    });
    expect(e.hatEmpfehlung).toBe(false);
    expect(e.headline).toContain("richtet sich nach den Programmbedingungen");
    expect(e.detail).toBe("Sachleistung, keine Geldförderung");
  });

  it("ignoriert unplausible Quote (>100) und 0-Volumen", () => {
    const e = buildBeantragungsEmpfehlung({
      foerderhoehe: { maxEur: 10000, maxProzentGesamtkosten: 150 },
      gesamtkostenEur: 0,
    });
    // Quote verworfen, Volumen 0 verworfen → nur Deckel.
    expect(e.headline).toBe("Dieses Programm fördert bis zu 10.000 €.");
  });
});
