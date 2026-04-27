import { buildFallbackTitle } from "@/lib/wizard/title-fallback";
import type { WizardFacts } from "@/lib/wizard/types";

const PROGRAMM = { name: "DigitalPakt 2.0" } as const;

function facts(over: Partial<WizardFacts> = {}): WizardFacts {
  return { ...over };
}

describe("buildFallbackTitle", () => {
  it("nutzt explizit gesetzten projekt.titel", () => {
    const t = buildFallbackTitle(PROGRAMM, facts({ projekt: { titel: "Tablet-Beschaffung" } }));
    expect(t).toBe("Tablet-Beschaffung");
  });

  it("trimmt Whitespace bei explizitem Titel", () => {
    const t = buildFallbackTitle(PROGRAMM, facts({ projekt: { titel: "  Tablets  " } }));
    expect(t).toBe("Tablets");
  });

  it("kombiniert erste Aktivitaet mit Schule und Programm", () => {
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({
        projekt: { aktivitaeten: ["15 Tablets anschaffen", "Lehrerfortbildung"] },
        schule: { name: "Grundschule Musterhausen" },
      })
    );
    expect(t).toBe("15 Tablets anschaffen — Grundschule Musterhausen (DigitalPakt 2.0)");
  });

  it("faellt auf hauptposten zurueck, wenn keine Aktivitaet vorhanden", () => {
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({
        budget: { hauptposten: ["Hardware: Tablets"] },
        schule: { name: "GS Musterhausen" },
      })
    );
    expect(t).toBe("Hardware: Tablets — GS Musterhausen (DigitalPakt 2.0)");
  });

  it("nimmt Subjekt allein, wenn keine Schule vorhanden", () => {
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({ projekt: { aktivitaeten: ["Schulgarten anlegen"] } })
    );
    expect(t).toBe("Schulgarten anlegen: Antrag bei DigitalPakt 2.0");
  });

  it("nimmt Schule allein, wenn keine Aktivitaeten/Hauptposten", () => {
    const t = buildFallbackTitle(PROGRAMM, facts({ schule: { name: "GS Musterhausen" } }));
    expect(t).toBe("GS Musterhausen: Antrag auf Foerderung durch DigitalPakt 2.0");
  });

  it("nutzt kurzbeschreibung wenn alles andere fehlt", () => {
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({ projekt: { kurzbeschreibung: "Digitalisierung des Sachunterrichts." } })
    );
    expect(t).toBe("Vorhaben: digitalisierung des Sachunterrichts — Antrag bei DigitalPakt 2.0");
  });

  it("entfernt nachgestellte Satzzeichen aus Subjekt", () => {
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({ projekt: { aktivitaeten: ["Tablets anschaffen."] }, schule: { name: "GS X" } })
    );
    expect(t).toBe("Tablets anschaffen — GS X (DigitalPakt 2.0)");
  });

  it("kuerzt sehr lange Titel auf <= 100 Zeichen", () => {
    const langeAktivitaet =
      "Anschaffung eines kompletten Klassen-Sets aus Tablets, Tablet-Koffern, Software-Lizenzen und Schulungen fuer 28 Schuelerinnen";
    const t = buildFallbackTitle(
      PROGRAMM,
      facts({ projekt: { aktivitaeten: [langeAktivitaet] }, schule: { name: "Grundschule" } })
    );
    expect(t.length).toBeLessThanOrEqual(100);
    expect(t.endsWith("…")).toBe(true);
  });

  it("benutzt generischen Fallback wenn nichts brauchbares vorhanden", () => {
    const t = buildFallbackTitle(PROGRAMM, facts());
    expect(t).toBe("Antrag auf Foerderung: DigitalPakt 2.0");
  });

  it("ist robust gegen leeren programm.name", () => {
    const t = buildFallbackTitle({ name: "" }, facts());
    expect(t).toBe("Antrag auf Foerderung: Foerderprogramm");
  });
});
