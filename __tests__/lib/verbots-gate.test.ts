/**
 * Deterministischer Verbots-Detektor (WIZ-05-Befund 31.07.2026).
 *
 * Die Belegfaelle stammen woertlich aus dem Lauf
 * data/eval/pipeline-snapshots/2026-07-31T18-49-50 — sie standen alle in den
 * Prompts auf der Verbotsliste und kamen trotzdem durch, weil kein Gate danach
 * suchte. Die Gegenprobe ist mindestens so wichtig wie der Treffer: ein Detektor,
 * der legitime Daten und belegte Saetze neutralisiert, verschlechtert den Antrag.
 */
import {
  detectVerbote,
  bereinigeFinanzplanBegruendungen,
} from "@/lib/wizard/verbots-gate";

describe("detectVerbote — Antragstext", () => {
  const quellen =
    "Wir wollen Tablets anschaffen, so 20 bis 30 vielleicht. Start nach den Sommerferien.";

  it("faengt die erfundene Laufzeit aus pv-res-002", () => {
    const text =
      "1. **Netzwerkinfrastruktur und Server** (kurzfristig, 01.01.2025–31.12.2025)\nEin leistungsfaehiger Schulserver wird beschafft.";
    const treffer = detectVerbote(text, quellen);
    expect(treffer.map((t) => t.klasse)).toContain("datum");
    expect(treffer.map((t) => t.fund)).toEqual(
      expect.arrayContaining(["01.01.2025", "31.12.2025"])
    );
    // Der Anker muss den Satz umfassen, damit der chirurgische Repair die
    // richtige Stelle trifft — der blosse Fund waere zu kurz und mehrdeutig.
    expect(treffer[0].zitat).toContain("Netzwerkinfrastruktur");
  });

  it("faengt Tarif-Eingruppierungen breiter als nur TV-L", () => {
    for (const code of ["TV-L E11", "TVöD E9", "EG 13", "TV-L E9a"]) {
      const treffer = detectVerbote(`Die Stelle wird nach ${code} eingruppiert.`, quellen);
      expect(treffer.map((t) => t.klasse)).toContain("tarif");
    }
  });

  it("faengt Aktenzeichen und Haushaltsstellen", () => {
    const text =
      "Der Beschluss (Az. 123/2026) liegt vor. Die Mittel laufen ueber Haushaltsstelle 1234/56789.";
    const klassen = detectVerbote(text, quellen).map((t) => t.klasse);
    expect(klassen).toContain("aktenzeichen");
    expect(klassen).toContain("haushaltsstelle");
  });

  // --- Gegenprobe: was NICHT anschlagen darf ------------------------------

  it("laesst ein Datum in Ruhe, das der Nutzer selbst genannt hat", () => {
    const treffer = detectVerbote(
      "Die Gesamtkonferenz hat am 12.05.2026 zugestimmt.",
      "Wir hatten die Gesamtkonferenz am 12.05.2026, da wurde das beschlossen."
    );
    expect(treffer).toHaveLength(0);
  });

  it("laesst eine Antragsfrist aus der Richtlinie in Ruhe", () => {
    // Der Grund fuer die weitere Quellenbasis: Programm-Konditionen sind
    // legitim, stehen aber NICHT in der Nutzer-Ground-Truth.
    const treffer = detectVerbote(
      "Der Antrag ist bis zum 30.09.2026 einzureichen.",
      `${quellen}\n{"frist":"30.09.2026","name":"DigitalPakt 2"}`
    );
    expect(treffer).toHaveLength(0);
  });

  it("laesst eine vom Nutzer genannte Eingruppierung in Ruhe", () => {
    const treffer = detectVerbote(
      "Die Koordinationsstelle ist nach TV-L E11 eingruppiert.",
      "Die Kollegin ist nach TV-L E11 eingruppiert, das weiss ich."
    );
    expect(treffer).toHaveLength(0);
  });

  it("schlaegt bei Jahreszahlen und Schuljahren NICHT an", () => {
    const treffer = detectVerbote(
      "Ab dem Schuljahr 2026/27 laeuft das Vorhaben; im Herbst 2026 beginnt die Planung.",
      quellen
    );
    expect(treffer).toHaveLength(0);
  });

  it("deckelt die Trefferliste, damit der Repair chirurgisch bleibt", () => {
    const text = Array.from(
      { length: 30 },
      (_, i) => `Termin ${i}: ${String((i % 28) + 1).padStart(2, "0")}.03.2027.`
    ).join("\n");
    expect(detectVerbote(text, quellen).length).toBeLessThanOrEqual(12);
  });
});

describe("geschaetzte Betraege sind KEINE Halluzination", () => {
  /**
   * Gegenprobe zur verworfenen Klasse "Einheitssatz". Ein als "Schaetzung:"
   * gekennzeichneter Betrag ist das vom Produkt vorgeschriebene Ehrlichkeits-Mittel
   * — falsch ist erst die behauptete externe Grundlage (die Tarifgruppe). Die Probe
   * ueber alle 25 Antraege des Laufs 2026-07-31T18-49-50 hatte 13 solcher Treffer,
   * fast alle legitim; der Detektor haette den Finanzplan entkernt.
   */
  it.each([
    "Schaetzung: 24 Teilnehmende × 300 EUR fuer 10 Tage",
    "Schaetzung: Fluege, 500 EUR pro Person",
    "Voraussichtlich rund 60 EUR/Std (Schaetzung, vor Einreichung zu belegen).",
  ])("laesst %s unangetastet", (satz) => {
    expect(detectVerbote(satz, "keine Angaben zu Kosten")).toHaveLength(0);
  });

  it("faengt an demselben Satz aber die erfundene Tarifgruppe (pv-005)", () => {
    const treffer = detectVerbote(
      "Schaetzung: 2 Lehrkräfte × 2 Projekttage × 8 Std/Tag × 56 EUR/Std (TV-L E11, Mittelwert)",
      "Wir schaetzen 300 bis 400 Euro pro Schueler."
    );
    expect(treffer).toHaveLength(1);
    expect(treffer[0].klasse).toBe("tarif");
    expect(treffer[0].fund).toBe("TV-L E11");
  });
});

describe("bereinigeFinanzplanBegruendungen", () => {
  const quellen = "Wir schaetzen 300 bis 400 Euro pro Schueler.";

  it("rettet den Satz, wenn der Verstoss im Klammerzusatz steckt", () => {
    const { posten, entfernt } = bereinigeFinanzplanBegruendungen(
      [
        {
          bezeichnung: "Koordination",
          betragEur: 4000,
          begruendung:
            "Schaetzung: Koordinationsaufwand fuer die Projektsteuerung ueber das Schuljahr (TV-L E11, Mittelwert)",
        },
      ],
      quellen
    );
    expect(entfernt).toHaveLength(1);
    expect(posten[0].begruendung).toContain("Koordinationsaufwand");
    expect(posten[0].begruendung).not.toContain("TV-L");
  });

  it("nimmt bei pv-005 die Tarifgruppe heraus und laesst die Schaetzung stehen", () => {
    const { posten, entfernt, betroffen } = bereinigeFinanzplanBegruendungen(
      [
        {
          kategorie: "personal",
          bezeichnung: "Freistellung Lehrkräfte",
          betragEur: 1792,
          eigenanteil: false,
          begruendung:
            "Schaetzung: 2 Lehrkräfte × 2 Projekttage × 8 Std/Tag × 56 EUR/Std (TV-L E11, Mittelwert)",
        },
      ],
      quellen
    );
    expect(entfernt.map((t) => t.fund)).toEqual(["TV-L E11"]);
    expect(betroffen).toEqual([0]);
    expect(posten[0].begruendung).not.toMatch(/TV-L/);
    // Die als Schaetzung gekennzeichnete Rechnung BLEIBT — sie ist das
    // vorgeschriebene Ehrlichkeits-Mittel, nicht der Defekt.
    expect(posten[0].begruendung).toContain("56 EUR/Std");
    // Kritisch: die Zahlenfelder bleiben unangetastet, sonst kippen Summenlogik,
    // Foerderquote und der Deckungsabgleich in der Pipeline.
    expect(posten[0].betragEur).toBe(1792);
    expect(posten[0].kategorie).toBe("personal");
    expect(posten[0].eigenanteil).toBe(false);
  });

  it("faellt auf die ehrliche Pauschale zurueck, wenn der Verstoss nicht isolierbar ist", () => {
    const { posten } = bereinigeFinanzplanBegruendungen(
      [
        {
          bezeichnung: "Koordinationsstelle",
          betragEur: 4000,
          begruendung: "Eingruppierung nach TV-L E11 ueber zwoelf Monate.",
        },
      ],
      quellen
    );
    expect(posten[0].begruendung).not.toMatch(/TV-L/);
    expect(posten[0].begruendung).toContain("Koordinationsstelle");
    expect(posten[0].betragEur).toBe(4000);
  });

  it("laesst saubere Posten unveraendert (Identitaet, kein Neu-Objekt noetig)", () => {
    const input = [
      {
        bezeichnung: "Tablets",
        betragEur: 9000,
        begruendung: "Schaetzung: Klassensatz Tablets, Stueckzahl noch festzulegen.",
      },
    ];
    const { posten, entfernt, betroffen } = bereinigeFinanzplanBegruendungen(input, quellen);
    expect(entfernt).toHaveLength(0);
    expect(betroffen).toHaveLength(0);
    expect(posten[0]).toBe(input[0]);
  });
});
