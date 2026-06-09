/**
 * @jest-environment node
 *
 * Sichert die gelockten Paket-/Preis-Entscheidungen (D-8) + Geld-Helfer.
 * Der Mengenrabatt-Test ist ein Regressionswaechter: groesseres Kontingent
 * MUSS pro Antrag guenstiger sein (sonst greift niemand zum groesseren Paket).
 */
import {
  PACKS,
  getPack,
  quotaPacks,
  formatEur,
  pricePerCreditCents,
  vatBreakdown,
  EINZELPREIS_CENTS,
  VAT_RATE,
} from "@/lib/payments/packs";
import {
  generateOrderNumber,
  dueDateISO,
  getBankDetails,
  PAYMENT_TERM_DAYS,
} from "@/lib/payments/bank";

describe("packs — Definitionen (D-8)", () => {
  it("enthaelt Einzel + drei Kontingent-Pakete mit gelockten Preisen", () => {
    expect(getPack("einzel")?.priceCents).toBe(2990);
    expect(getPack("pack5")?.priceCents).toBe(13990);
    expect(getPack("pack10")?.priceCents).toBe(24990);
    expect(getPack("pack20")?.priceCents).toBe(45990);
    expect(EINZELPREIS_CENTS).toBe(2990);
  });

  it("quotaPacks liefert nur die per Rechnung bestellbaren Pakete (kein Einzel)", () => {
    const ids = quotaPacks().map((p) => p.id);
    expect(ids).toEqual(["pack5", "pack10", "pack20"]);
    expect(ids).not.toContain("einzel");
  });

  it("getPack liefert undefined fuer unbekannte id", () => {
    expect(getPack("pack999")).toBeUndefined();
  });

  it("alle Preise sind positive Integer-Cent", () => {
    for (const p of PACKS) {
      expect(Number.isInteger(p.priceCents)).toBe(true);
      expect(p.priceCents).toBeGreaterThan(0);
      expect(Number.isInteger(p.credits)).toBe(true);
      expect(p.credits).toBeGreaterThan(0);
    }
  });

  it("Mengenrabatt ist monoton: groesseres Kontingent = guenstiger pro Antrag", () => {
    const quota = quotaPacks();
    for (let i = 1; i < quota.length; i++) {
      expect(pricePerCreditCents(quota[i])).toBeLessThan(pricePerCreditCents(quota[i - 1]));
    }
    // ...und billiger als der Einzelpreis.
    for (const p of quota) {
      expect(pricePerCreditCents(p)).toBeLessThan(EINZELPREIS_CENTS);
    }
  });

  it("20er-Paket ist guenstiger als 2x 10er (kein Splitten lohnt sich)", () => {
    const pack10 = getPack("pack10")!;
    const pack20 = getPack("pack20")!;
    expect(pack20.priceCents).toBeLessThan(2 * pack10.priceCents);
  });
});

describe("packs — Geld-Helfer", () => {
  it("formatEur formatiert deutsch", () => {
    expect(formatEur(13990)).toMatch(/139,90/);
    expect(formatEur(2990)).toMatch(/29,90/);
  });

  it("vatBreakdown: Brutto = Netto + MwSt (brutto fuehrend)", () => {
    for (const p of PACKS) {
      const b = vatBreakdown(p.priceCents);
      expect(b.netCents + b.vatCents).toBe(p.priceCents);
      expect(b.netCents).toBe(Math.round(p.priceCents / (1 + VAT_RATE)));
    }
  });
});

describe("bank — Bestellnummer + Zahlungsziel", () => {
  it("generateOrderNumber hat das Format EDU-...-...", () => {
    expect(generateOrderNumber(1_700_000_000_000)).toMatch(/^EDU-[0-9A-Z]+-[0-9A-Z]{3}$/);
  });

  it("dueDateISO liegt PAYMENT_TERM_DAYS in der Zukunft", () => {
    const from = new Date("2026-06-09T12:00:00Z");
    const due = new Date(dueDateISO(from));
    const diffDays = Math.round((due.getTime() - from.getTime()) / 86_400_000);
    expect(diffDays).toBe(PAYMENT_TERM_DAYS);
  });

  it("getBankDetails liefert die GLS-Fallback-Daten ohne Env", () => {
    const b = getBankDetails();
    expect(b.iban).toContain("DE91");
    expect(b.bic).toBe("GENODEM1GLS");
  });
});
