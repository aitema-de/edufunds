/**
 * Beantragungshöhe-Orientierung (P4-B, Pilot-Feedback 24.06.).
 * Deterministische Ableitung aus Katalog-Feldern — keine erfundenen Zahlen.
 */
import { buildFoerderhoeheHinweis } from "@/lib/foerderhoehe-empfehlung";

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
