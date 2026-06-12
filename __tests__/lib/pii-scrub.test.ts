/**
 * Datenminimierung am Dritt-Land-Transfer (DSGVO Art. 5/44 ff.).
 * Sichert: hochpraezise Identifikatoren (E-Mail/Telefon/IBAN) werden geschwaerzt,
 * legitime Inhalte (Budgets, Jahre, Mengen, Daten, Uhrzeiten, URLs) NICHT.
 */
import { scrubPiiForLlm, findPii } from "@/lib/wizard/pii-scrub";

describe("scrubPiiForLlm — schwaerzt Identifikatoren", () => {
  it("E-Mail", () => {
    const r = scrubPiiForLlm("Kontakt: lmende@lsb-niedersachsen.de bitte melden");
    expect(r.text).toBe("Kontakt: [E-Mail entfernt] bitte melden");
    expect(r.redactions).toBe(1);
  });

  it("IBAN (mit und ohne Leerzeichen)", () => {
    expect(scrubPiiForLlm("Konto DE89 3704 0044 0532 0130 00 nutzen").text).toBe(
      "Konto [IBAN entfernt] nutzen"
    );
    expect(scrubPiiForLlm("DE89370400440532013000").text).toBe("[IBAN entfernt]");
  });

  it("Telefon: +49, gelabelt, deutsche Vorwahl mit Trenner", () => {
    expect(scrubPiiForLlm("Ruf +49 531 1234567 an").text).toBe("Ruf [Telefon entfernt] an");
    // gelabelte Nummern werden inkl. Label geschwaerzt
    expect(scrubPiiForLlm("Tel.: 0531 1234567").text).toBe("[Telefon entfernt]");
    expect(scrubPiiForLlm("0531/1234567").text).toBe("[Telefon entfernt]");
    expect(scrubPiiForLlm("030 12345678").text).toBe("[Telefon entfernt]");
  });

  it("mehrere Identifikatoren in einem Text", () => {
    const r = scrubPiiForLlm("Frau X, mail@schule.de, Tel 0531/998877, IBAN DE89 3704 0044 0532 0130 00");
    expect(r.text).not.toContain("mail@schule.de");
    expect(r.text).not.toContain("0531/998877");
    expect(r.text).not.toContain("DE89");
    expect(r.redactions).toBeGreaterThanOrEqual(3);
  });
});

describe("scrubPiiForLlm — laesst legitime Inhalte UNVERAENDERT", () => {
  const unveraendert = [
    "Budget von 25000 EUR fuer Tablets",
    "Wir foerdern 10 000 Euro Eigenanteil",
    "Projektzeitraum 2025 bis 2026",
    "120 Fuenft- und Sechstklaessler, 80 % Migrationshintergrund",
    "Treffen am 01.02.2026 um 08:00 Uhr",
    "Betreuung von 08-15 Uhr im Ganztag",
    "Mehr Infos: https://www.sportjugend-nds.de/schule-kita-verein",
    "5.000 Euro pro Jahr, max. 80 Bewegungseinheiten",
    "Calliope-Mini fuer den MINT-Unterricht",
  ];
  it.each(unveraendert)("unveraendert: %s", (text) => {
    const r = scrubPiiForLlm(text);
    expect(r.text).toBe(text);
    expect(r.redactions).toBe(0);
  });
});

describe("scrubPiiForLlm — Robustheit", () => {
  it("leerer/Whitespace-Text", () => {
    expect(scrubPiiForLlm("").redactions).toBe(0);
    expect(scrubPiiForLlm("nur normaler Text").redactions).toBe(0);
  });

  it("IBAN wird vor Telefon geschwaerzt (kein Teiltreffer in der IBAN)", () => {
    const r = scrubPiiForLlm("DE89 3704 0044 0532 0130 00");
    expect(r.text).toBe("[IBAN entfernt]");
    expect(r.redactions).toBe(1);
  });
});

describe("findPii", () => {
  it("klassifiziert Treffer nach Art", () => {
    const hits = findPii("a@b.de und 0531/123456");
    expect(hits.some((h) => h.kind === "email")).toBe(true);
    expect(hits.some((h) => h.kind === "phone")).toBe(true);
  });

  it("keine Treffer in sauberem Text", () => {
    expect(findPii("Budget 25000 EUR, Jahr 2026")).toEqual([]);
  });
});
