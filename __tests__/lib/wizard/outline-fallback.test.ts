import { buildFallbackOutline } from "@/lib/wizard/outline-fallback";

const PROGRAMM = { name: "DigitalPakt 2.0" } as const;

describe("buildFallbackOutline", () => {
  it("liefert genau 7 Standard-Abschnitte in deterministischer Reihenfolge", () => {
    const o = buildFallbackOutline(PROGRAMM, {});
    expect(o.abschnitte).toHaveLength(7);
    expect(o.abschnitte.map((a) => a.name)).toEqual([
      "Antragsteller und Schule",
      "Vorhaben und Anliegen",
      "Bedarfsbegruendung",
      "Zielgruppe und Beteiligte",
      "Massnahmen und Zeitplan",
      "Erwartete Wirkung und Nachhaltigkeit",
      "Finanzierung und Eigenanteil",
    ]);
  });

  it("jeder Abschnitt hat einen nicht-leeren fokus-String", () => {
    const o = buildFallbackOutline(PROGRAMM, {});
    for (const a of o.abschnitte) {
      expect(typeof a.fokus).toBe("string");
      expect(a.fokus.length).toBeGreaterThan(20);
    }
  });

  it("Titel kommt aus buildFallbackTitle und reagiert auf Fakten", () => {
    const mit = buildFallbackOutline(PROGRAMM, { schule: { name: "GS Mustertown" } });
    const ohne = buildFallbackOutline(PROGRAMM, {});
    expect(mit.titel).not.toBe(ohne.titel);
    expect(mit.titel).toContain("GS Mustertown");
    expect(ohne.titel).toBe("Antrag auf Foerderung: DigitalPakt 2.0");
  });

  it("liefert frische Abschnitt-Objekte (keine geteilten Referenzen)", () => {
    const a = buildFallbackOutline(PROGRAMM, {});
    const b = buildFallbackOutline(PROGRAMM, {});
    a.abschnitte[0]!.name = "Mutiert";
    expect(b.abschnitte[0]!.name).toBe("Antragsteller und Schule");
  });
});
