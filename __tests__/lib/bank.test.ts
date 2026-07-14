/**
 * Bankverbindung — die IBAN steht als Zahlungsziel in JEDER Rechnungs- und Mahnmail.
 *
 * Anlass: Im Code stand als Fallback die IBAN "DE91 4306 0967 1250 4734 00", waehrend
 * BANK_IBAN auf Produktion NICHT gesetzt war. Ihre Pruefsumme ist UNGUELTIG — ein Dummy.
 * Jede Rechnung haette ein nicht ueberweisbares Konto genannt: Die Schule kann nicht
 * zahlen, die Zahlung bleibt aus, und der Mahnlauf mahnt mit derselben kaputten IBAN.
 */
import { isValidIban, bankConfigProblems, getBankDetails } from "@/lib/payments/bank";

const ORIG = process.env;
beforeEach(() => {
  process.env = { ...ORIG };
  delete process.env.BANK_IBAN;
  delete process.env.BANK_ACCOUNT_HOLDER;
  delete process.env.BANK_BIC;
  delete process.env.BANK_NAME;
});
afterAll(() => {
  process.env = ORIG;
});

describe("isValidIban", () => {
  it("erkennt die frueher hartkodierte Fallback-IBAN als UNGUELTIG", () => {
    // Genau der Wert, der bis 14.07.2026 als Default im Code stand.
    expect(isValidIban("DE91 4306 0967 1250 4734 00")).toBe(false);
  });

  it("akzeptiert gueltige IBANs (Pruefsumme mod 97 == 1)", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true); // klassische Beispiel-IBAN
    expect(isValidIban("DE89370400440532013000")).toBe(true); // ohne Leerzeichen
    expect(isValidIban("de89370400440532013000")).toBe(true); // klein geschrieben
  });

  it("weist Unfug ab", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("DE00")).toBe(false);
    expect(isValidIban("Bitte hier IBAN eintragen")).toBe(false);
    // Eine Ziffer verdreht -> Pruefsumme kippt. Genau dafuer ist sie da.
    expect(isValidIban("DE89 3704 0044 0532 0130 01")).toBe(false);
  });
});

describe("bankConfigProblems", () => {
  it("meldet die fehlende Konfiguration (Zustand auf Prod am 14.07.2026)", () => {
    const p = bankConfigProblems();
    expect(p).toContain("BANK_IBAN fehlt");
    expect(p).toContain("BANK_ACCOUNT_HOLDER fehlt");
    expect(p).toContain("BANK_BIC fehlt");
  });

  it("meldet eine gesetzte, aber ungueltige IBAN", () => {
    process.env.BANK_IBAN = "DE91 4306 0967 1250 4734 00";
    process.env.BANK_ACCOUNT_HOLDER = "aitema GmbH";
    process.env.BANK_BIC = "GENODEM1GLS";

    expect(bankConfigProblems()).toEqual(["BANK_IBAN hat eine ungueltige Pruefsumme"]);
  });

  it("ist zufrieden, wenn alles gesetzt und gueltig ist", () => {
    process.env.BANK_IBAN = "DE89 3704 0044 0532 0130 00";
    process.env.BANK_ACCOUNT_HOLDER = "aitema GmbH";
    process.env.BANK_BIC = "GENODEM1GLS";

    expect(bankConfigProblems()).toEqual([]);
  });
});

describe("getBankDetails — fail-closed", () => {
  it("wirft, statt eine erfundene Kontoverbindung zu liefern", () => {
    // Frueher lieferte das hier klaglos die Dummy-IBAN zurueck — und die ging raus.
    expect(() => getBankDetails()).toThrow(/Bankverbindung nicht konfiguriert/);
  });

  it("wirft auch bei gesetzter, aber ungueltiger IBAN", () => {
    process.env.BANK_IBAN = "DE91 4306 0967 1250 4734 00";
    process.env.BANK_ACCOUNT_HOLDER = "aitema GmbH";
    process.env.BANK_BIC = "GENODEM1GLS";

    expect(() => getBankDetails()).toThrow(/ungueltige Pruefsumme/);
  });

  it("liefert die konfigurierten Daten, wenn sie stimmen", () => {
    process.env.BANK_IBAN = "DE89 3704 0044 0532 0130 00";
    process.env.BANK_ACCOUNT_HOLDER = "aitema GmbH";
    process.env.BANK_BIC = "GENODEM1GLS";
    process.env.BANK_NAME = "GLS Bank";

    expect(getBankDetails()).toEqual({
      accountHolder: "aitema GmbH",
      iban: "DE89 3704 0044 0532 0130 00",
      bic: "GENODEM1GLS",
      bankName: "GLS Bank",
    });
  });
});
