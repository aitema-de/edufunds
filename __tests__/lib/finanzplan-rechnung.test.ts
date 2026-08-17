/**
 * Regression für den Befund 17.08.2026 (Lauf 2026-08-17T07-59-25): Das
 * Herleitungs-Gebot aus `dc8d6d1` ersetzte das Pauschalverbot von Rechenketten —
 * seither rechnet das LLM, aber von 21 Posten mit ausgewiesenem Ergebnis gingen
 * 11 nicht auf, 6 davon hart. checkRechnungGehtAuf gleicht das ausgewiesene
 * Rechenergebnis deterministisch gegen betragEur ab.
 *
 * Die "feuert"-Fälle sind die echten Posten aus dem Lauf, die "schweigt"-Fälle
 * die echten Rundungen — beides Wort für Wort aus den Snapshots.
 */
import { checkRechnungGehtAuf, extractRechenergebnisse } from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten } from "@/lib/wizard/types";

function posten(betragEur: number, begruendung: string, bezeichnung = "Posten"): Finanzposten {
  return { id: "p", kategorie: "sachkosten", bezeichnung, betragEur, eigenanteil: false, begruendung };
}

describe("extractRechenergebnisse", () => {
  it("liest deutsche Beträge inkl. Tausenderpunkt und Dezimalkomma", () => {
    expect(extractRechenergebnisse("2 x 6 = 12 EUR")).toEqual([12]);
    expect(extractRechenergebnisse("312 × 5 EUR = 1.560 EUR")).toEqual([1560]);
    expect(extractRechenergebnisse("= 1.234,50 €")).toEqual([1234.5]);
    expect(extractRechenergebnisse("= ca. 3.000 EUR")).toEqual([3000]);
  });

  it("erfasst mehrere Ergebnisse in Reihenfolge", () => {
    expect(
      extractRechenergebnisse("32.000 EUR × 0,5 = 16.000 EUR/Jahr; abzgl. Förderung = 8.000 EUR")
    ).toEqual([16000, 8000]);
  });

  it("ignoriert Ergebnisse ohne Euro-Einheit und Prozentwerte", () => {
    expect(extractRechenergebnisse("6 Bögen à 5 = 30 Stück")).toEqual([]);
    expect(extractRechenergebnisse("Eigenanteil = 22 %")).toEqual([]);
  });
});

describe("checkRechnungGehtAuf — feuert bei den echten harten Fällen", () => {
  it("pv-003: Rechnung ergibt 30 EUR, ausgewiesen 300 EUR (Faktor 10)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [posten(300, "Schaetzung: 6 Feedbackbögen à 5 EUR = 30 EUR", "Feedbackbögen")],
      hinweise
    );
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("Feedbackbögen");
    expect(hinweise[0]).toContain("30 EUR");
    expect(hinweise[0]).toContain("300 EUR");
  });

  it("pv-002: Rechnung ergibt 18.000 EUR, ausgewiesen 6.000 EUR", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [posten(6000, "Schaetzung: 12 Termine à 1.500 EUR = 18.000 EUR", "Theaterpädagogische Leitung")],
      hinweise
    );
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("18.000");
  });

  it("pv-006: Rechnung ergibt 50.000 EUR, ausgewiesen 100.000 EUR (Faktor 0,5)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf([posten(100000, "156 Geraete × 320 EUR = 50.000 EUR")], hinweise);
    expect(hinweise).toHaveLength(1);
  });

  it("pv-007: kein ausgewiesenes Ergebnis trifft den Betrag (20/280 gegen 3.600)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [posten(3600, "14 Naechte à 20 EUR = 280 EUR pro Person")],
      hinweise
    );
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("280 EUR");
  });

  it("nennt jeden betroffenen Posten einzeln", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [
        posten(300, "6 × 5 EUR = 30 EUR", "A"),
        posten(1200, "2 Termine à 300 EUR = 600 EUR", "B"),
      ],
      hinweise
    );
    expect(hinweise).toHaveLength(2);
    expect(hinweise[0]).toContain('„A"');
    expect(hinweise[1]).toContain('„B"');
  });
});

describe("checkRechnungGehtAuf — schweigt, wo es schweigen muss", () => {
  it("Rundung auf glatte Beträge (echte Fälle 1.560/1.500, 480/500, 293/323, 780/800)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [
        posten(1500, "312 Nutzer:innen × ca. 5 EUR = 1.560 EUR"),
        posten(500, "24 Personen × 20 EUR = 480 EUR"),
        posten(323, "10 % Verwaltungspauschale = 293 EUR"),
        posten(800, "26 Eintritte à 30 EUR = 780 EUR"),
      ],
      hinweise
    );
    expect(hinweise).toEqual([]);
  });

  it("ein Zwischenergebnis, das den Betrag trifft, gilt als aufgehend (pv-001)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [
        posten(
          8000,
          "Schaetzung: 0,5 Stelle × 32.000 EUR/Jahr = 16.000 EUR/Jahr; Eigenanteil 22 % abzgl. Foerderung = 8.000 EUR Foerderanteil"
        ),
      ],
      hinweise
    );
    expect(hinweise).toEqual([]);
  });

  it("Mengengerüst ohne ausgewiesene Endsumme ist erlaubt", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [posten(12000, "Klassensatz Tablets für 312 Schüler:innen, 1 Geraet je 2 Kinder, marktueblich ca. 400 EUR je Geraet")],
      hinweise
    );
    expect(hinweise).toEqual([]);
  });

  it("nackte Pauschale ohne Rechnung bleibt unbeanstandet (dafür ist flagEstimatedAmounts da)", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf(
      [posten(1500, "Schaetzung: Pauschale ohne belegte Kalkulationsgrundlage; vor Einreichung belegen.")],
      hinweise
    );
    expect(hinweise).toEqual([]);
  });

  it("kleine Beträge: 100-EUR-Sockel schützt vor Rausch-Treffern", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf([posten(230, "Verwaltungspauschale = 270 EUR")], hinweise);
    expect(hinweise).toEqual([]);
  });

  it("fehlende Begründung, Betrag 0 und leere Liste sind kein Befund", () => {
    const hinweise: string[] = [];
    checkRechnungGehtAuf([{ id: "x", kategorie: "sachkosten", bezeichnung: "X", betragEur: 500, eigenanteil: false }], hinweise);
    checkRechnungGehtAuf([posten(0, "6 × 5 EUR = 30 EUR")], hinweise);
    checkRechnungGehtAuf([], hinweise);
    expect(hinweise).toEqual([]);
  });
});
