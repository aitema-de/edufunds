/**
 * P1-B (Pilot-Feedback 24.06.): Kostenplan-Transparenz. Wird ein frei genannter Betrag
 * vom Generator aufgeteilt ("halbiert") oder still angepasst, muss ein erklärender Hinweis
 * entstehen — komplementär zu checkBeantragtDeckung (das nur bei strukturiertem Budget greift).
 */
import {
  parseGermanAmount,
  extractStatedAmounts,
  checkStatedAmountAdjusted,
} from "@/lib/wizard/finanzplan-generator";
import type { Finanzposten, WizardFacts } from "@/lib/wizard/types";

function foerder(betragEur: number): Finanzposten {
  return { id: "f" + betragEur, kategorie: "sachkosten", bezeichnung: "Förderposten", betragEur, eigenanteil: false };
}
function eigen(betragEur: number): Finanzposten {
  return { id: "e" + betragEur, kategorie: "sonstiges", bezeichnung: "Eigenanteil", betragEur, eigenanteil: true };
}

describe("parseGermanAmount", () => {
  it("parst deutsche Tausender-/Dezimalschreibweise", () => {
    expect(parseGermanAmount("4.000")).toBe(4000);
    expect(parseGermanAmount("10.000")).toBe(10000);
    expect(parseGermanAmount("1.234,50")).toBeCloseTo(1234.5);
    expect(parseGermanAmount("5000")).toBe(5000);
  });
  it("gibt null bei nicht-parsebar oder nicht-positiv", () => {
    expect(parseGermanAmount("abc")).toBeNull();
    expect(parseGermanAmount("0")).toBeNull();
  });
});

describe("extractStatedAmounts", () => {
  it("erfasst nur Euro-markierte Beträge, keine reinen Mengen", () => {
    expect(extractStatedAmounts(["rund 4.000 Euro", "ca. 25 Geräte"])).toEqual([4000]);
    expect(extractStatedAmounts(["€ 2.000 und 1500 EUR"])).toEqual([2000, 1500]);
    expect(extractStatedAmounts(["200 Kinder, 20 Tablets"])).toEqual([]);
    expect(extractStatedAmounts(undefined)).toEqual([]);
  });
});

describe("checkStatedAmountAdjusted", () => {
  it("Fall A: erklärt die Aufteilung eines genannten Betrags in Förderung + Eigenanteil", () => {
    const hinweise: string[] = [];
    checkStatedAmountAdjusted([foerder(2000)], [eigen(2000)], {}, ["Wir haben rund 4.000 Euro"], hinweise);
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("4.000");
    expect(hinweise[0]).toContain("2.000");
    expect(hinweise[0]).toContain("aufgeteilt");
  });

  it("Fall A unterbleibt, wenn der Nutzer den Eigenanteil selbst genannt hat", () => {
    const hinweise: string[] = [];
    const facts: WizardFacts = { budget: { eigenmittel_eur: 2000 } };
    checkStatedAmountAdjusted([foerder(2000)], [eigen(2000)], facts, ["rund 4.000 Euro"], hinweise);
    expect(hinweise).toHaveLength(0);
  });

  it("Fall B: erklärt eine still angepasste Summe ohne strukturiertes Budget", () => {
    const hinweise: string[] = [];
    checkStatedAmountAdjusted([foerder(4000)], [], {}, ["Budget etwa 10.000 €"], hinweise);
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toContain("10.000");
    expect(hinweise[0]).toContain("4.000");
    expect(hinweise[0]).toContain("weniger");
  });

  it("Fall B deferiert an checkBeantragtDeckung, wenn ein strukturiertes Budget existiert", () => {
    const hinweise: string[] = [];
    const facts: WizardFacts = { budget: { beantragt_eur: 10000 } };
    checkStatedAmountAdjusted([foerder(4000)], [], facts, ["Budget etwa 10.000 €"], hinweise);
    expect(hinweise).toHaveLength(0);
  });

  it("schweigt ohne Euro-Angabe und bei Kleinstbeträgen", () => {
    const hinweise: string[] = [];
    checkStatedAmountAdjusted([foerder(4000)], [], {}, ["200 Kinder, 20 Tablets"], hinweise);
    checkStatedAmountAdjusted([foerder(40)], [], {}, ["50 Euro"], hinweise);
    expect(hinweise).toHaveLength(0);
  });

  it("schweigt, wenn der genannte Betrag mit der Plan-Summe übereinstimmt", () => {
    const hinweise: string[] = [];
    checkStatedAmountAdjusted([foerder(10000)], [], {}, ["genau 10.000 EUR"], hinweise);
    expect(hinweise).toHaveLength(0);
  });
});
