/**
 * lexoffice-Rechnung + §312i-Bestätigung (B1 Einzelantrag-Kartenkauf).
 * Reine Funktionen: USt-Aufteilung, Rechnungs-Body (taxType gross, 19 %),
 * Bestätigungsmail (mit/ohne PDF).
 */
// invoice.ts importiert @/lib/db (pg) für die DB-Funktionen — für die reinen
// Funktionstests mocken, damit das pg-Modul nicht im Test-Env geladen wird.
jest.mock("@/lib/db", () => ({ query: jest.fn() }));

import { buildInvoiceBody } from "@/lib/lexoffice/client";
import { vatFromGross, buildConfirmationEmail, invoiceFinalizeEnabled } from "@/lib/payments/invoice";

describe("invoiceFinalizeEnabled — Generalprobe-Schalter", () => {
  const orig = process.env.LEXOFFICE_FINALIZE;
  afterEach(() => {
    if (orig === undefined) delete process.env.LEXOFFICE_FINALIZE;
    else process.env.LEXOFFICE_FINALIZE = orig;
  });

  it("ist standardmäßig true (festgeschriebene Rechnung)", () => {
    delete process.env.LEXOFFICE_FINALIZE;
    expect(invoiceFinalizeEnabled()).toBe(true);
  });

  it("nur exakt 'false' erzeugt einen Entwurf", () => {
    process.env.LEXOFFICE_FINALIZE = "false";
    expect(invoiceFinalizeEnabled()).toBe(false);
    process.env.LEXOFFICE_FINALIZE = "true";
    expect(invoiceFinalizeEnabled()).toBe(true);
    process.env.LEXOFFICE_FINALIZE = "0";
    expect(invoiceFinalizeEnabled()).toBe(true); // nur "false" schaltet ab
  });
});

describe("vatFromGross", () => {
  it("29,90 € brutto bei 19 % → 25,13 netto / 4,77 USt", () => {
    const { netCents, vatCents } = vatFromGross(2990);
    expect(netCents).toBe(2513);
    expect(vatCents).toBe(477);
    expect(netCents + vatCents).toBe(2990);
  });
});

describe("buildInvoiceBody", () => {
  const body = buildInvoiceBody(
    {
      address: { name: "Musterschule e.V.", street: "Hauptstr. 5", zip: "10115", city: "Berlin" },
      lineItemName: "EduFunds — Förderantrag (Einzelantrag)",
      grossAmount: 29.9,
      taxRatePercentage: 19,
    },
    "2026-06-12T08:00:00.000Z"
  );

  it("taxType gross + 19 % brutto im lineItem", () => {
    expect(body.taxConditions.taxType).toBe("gross");
    expect(body.lineItems[0].unitPrice.grossAmount).toBe(29.9);
    expect(body.lineItems[0].unitPrice.taxRatePercentage).toBe(19);
    expect(body.lineItems[0].unitPrice.currency).toBe("EUR");
  });

  it("Pflichtfelder vorhanden (address, shippingConditions, voucherDate)", () => {
    expect(body.address.name).toBe("Musterschule e.V.");
    expect(body.address.countryCode).toBe("DE"); // Default
    expect(body.shippingConditions.shippingType).toBe("service");
    expect(body.shippingConditions.shippingDate).toBe("2026-06-12T08:00:00.000Z");
    expect(body.voucherDate).toBe("2026-06-12T08:00:00.000Z");
  });
});

describe("buildConfirmationEmail", () => {
  it("mit PDF + Nummer: Rechnung im Betreff + Anhang-Hinweis", () => {
    const mail = buildConfirmationEmail({
      orgName: "Musterschule e.V.",
      grossCents: 2990,
      invoiceNumber: "RE-2026-0042",
      hasPdf: true,
    });
    expect(mail.subject).toContain("RE-2026-0042");
    expect(mail.text).toContain("Anhang");
    expect(mail.text).toContain("Vertrags"); // §312i Vertragsbestätigung
    expect(mail.html).toContain("Musterschule e.V.");
    expect(mail.text).toContain("29,90");
  });

  it("ohne PDF: Hinweis 'Rechnung folgt separat', kein Nummern-Betreff", () => {
    const mail = buildConfirmationEmail({ orgName: "Förderverein X", grossCents: 2990, hasPdf: false });
    expect(mail.subject).toBe("EduFunds — Bestellbestätigung");
    expect(mail.text).toContain("separat");
  });

  it("mit downloadUrl: Link + 12-Monate-Hinweis in Text UND HTML", () => {
    const url = "https://app.edufunds.org/antrag/download/abc-123";
    const mail = buildConfirmationEmail({
      orgName: "Musterschule e.V.",
      grossCents: 2990,
      hasPdf: false,
      downloadUrl: url,
    });
    expect(mail.text).toContain(url);
    expect(mail.text).toContain("12 Monate");
    expect(mail.text).toContain("Meine Anträge");
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.html).toContain("12 Monate");
  });

  it("ohne downloadUrl: kein Download-Block (fail-safe)", () => {
    const mail = buildConfirmationEmail({ orgName: "Förderverein X", grossCents: 2990, hasPdf: false });
    expect(mail.text).not.toContain("/antrag/download/");
    expect(mail.html).not.toContain("/antrag/download/");
    expect(mail.html).not.toContain("Antrag öffnen");
  });
});
