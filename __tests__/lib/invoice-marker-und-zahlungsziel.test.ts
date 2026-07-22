/**
 * Zwei Fehler, die am 17.07.2026 an einer echten Zahlung (29,90 EUR) auffielen:
 *
 *  1. runInvoiceJob markierte JEDEN Lauf als erledigt — auch den gescheiterten.
 *     Da isProcessed() an `invoice_created_at IS NOT NULL` haengt, war die
 *     Rechnung danach dauerhaft und still verloren: kein Retry, kein Nachlauf.
 *     Real: abgelaufener lexoffice-Key -> 401 -> Antrag 35 bezahlt, ohne Rechnung.
 *
 *  2. buildInvoiceBody setzte keine paymentConditions. Ohne sie zieht lexoffice
 *     die Standardbedingung der Organisation ("zahlbar in X Tagen") — auf einer
 *     Rechnung, die per Stripe-Checkout LAENGST bezahlt ist. Der Kunde bekommt
 *     eine Zahlungsaufforderung fuer Geld, das schon geflossen ist.
 */
jest.mock("@/lib/db", () => ({ query: jest.fn() }));
jest.mock("@/lib/mail", () => ({ sendMail: jest.fn() }));
jest.mock("@/lib/lexoffice/client", () => {
  const echt = jest.requireActual("@/lib/lexoffice/client");
  return {
    ...echt,
    createInvoice: jest.fn(),
    getInvoiceNumber: jest.fn(),
    getInvoiceDocumentFileId: jest.fn(),
    downloadFile: jest.fn(),
    lexofficeConfigured: jest.fn(() => true),
  };
});

import { buildInvoiceBody, ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT } from "@/lib/lexoffice/client";
import * as lex from "@/lib/lexoffice/client";
import { query } from "@/lib/db";
import { runInvoiceJob, type InvoiceJobParams } from "@/lib/payments/invoice";

const params: InvoiceJobParams = {
  stripeSessionId: "cs_live_TEST",
  email: "kaeufer@example.org",
  orgName: "Testschule",
  address: { street: "Teststr. 1", zip: "10115", city: "Berlin" },
  grossCents: 2990,
  downloadUrl: "https://edufunds.org/antrag/download/tok",
};

function markerGesetzt(): boolean {
  // markProcessed() ist das einzige UPDATE mit invoice_created_at.
  return (query as jest.Mock).mock.calls.some(
    (c) => typeof c[0] === "string" && c[0].includes("invoice_created_at   = now()")
  );
}

describe("Zahlungsbedingung: die Rechnung ist bereits bezahlt", () => {
  it("setzt paymentConditions — sonst greift lexoffice zur Organisations-Standardbedingung", () => {
    const body = buildInvoiceBody(
      { address: { name: "X" }, lineItemName: "Y", grossAmount: 29.9, taxRatePercentage: 19 },
      "2026-07-17T10:00:00.000Z"
    ) as Record<string, unknown>;

    expect(body.paymentConditions).toBeDefined();
    const pc = body.paymentConditions as { paymentTermLabel: string; paymentTermDuration: number };
    expect(pc.paymentTermDuration).toBe(0);
    expect(pc.paymentTermLabel).toBe(ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT);
  });

  it("der Standardtext sagt klar, dass NICHT zu ueberweisen ist", () => {
    expect(ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT).toMatch(/bereits bezahlt/i);
    expect(ZAHLUNGSBEDINGUNG_BEREITS_BEZAHLT).toMatch(/nicht zu überweisen/i);
  });

  it("laesst sich fuer einen kuenftigen Rechnungskauf ueberschreiben", () => {
    const body = buildInvoiceBody(
      {
        address: { name: "X" },
        lineItemName: "Y",
        grossAmount: 29.9,
        taxRatePercentage: 19,
        paymentTermLabel: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
        paymentTermDurationDays: 14,
      },
      "2026-07-17T10:00:00.000Z"
    ) as Record<string, unknown>;
    const pc = body.paymentConditions as { paymentTermLabel: string; paymentTermDuration: number };
    expect(pc.paymentTermDuration).toBe(14);
    expect(pc.paymentTermLabel).toMatch(/14 Tagen/);
  });
});

describe("Erledigt-Marker nur bei tatsaechlich erzeugter Rechnung", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // isProcessed() -> noch nicht verarbeitet
    (query as jest.Mock).mockResolvedValue({ rows: [{ done: false }], rowCount: 1 });
  });

  it("Erfolg: Rechnung entsteht -> Marker wird gesetzt", async () => {
    (lex.createInvoice as jest.Mock).mockResolvedValue({ id: "inv-1" });
    (lex.getInvoiceNumber as jest.Mock).mockResolvedValue("RE2026-0001");
    (lex.getInvoiceDocumentFileId as jest.Mock).mockResolvedValue("file-1");
    (lex.downloadFile as jest.Mock).mockResolvedValue(Buffer.from("%PDF"));

    await runInvoiceJob(params);

    expect(markerGesetzt()).toBe(true);
  });

  it("REGRESSION: lexoffice scheitert -> KEIN Marker, der Nachlauf bleibt moeglich", async () => {
    (lex.createInvoice as jest.Mock).mockRejectedValue(
      new Error("lexoffice POST /v1/invoices?finalize=true -> 401: Unauthorized")
    );

    await runInvoiceJob(params);

    // Der Kern: Vorher wurde hier markiert und die Rechnung war fuer immer weg.
    expect(markerGesetzt()).toBe(false);
  });

  it("wirft auch im Fehlerfall nicht — der bezahlte Kauf darf den Webhook nicht 500en", async () => {
    (lex.createInvoice as jest.Mock).mockRejectedValue(new Error("lexoffice down"));
    await expect(runInvoiceJob(params)).resolves.toBeUndefined();
  });

  it("§312i: die Bestaetigungsmail geht auch ohne Rechnung raus", async () => {
    const { sendMail } = jest.requireMock("@/lib/mail");
    (lex.createInvoice as jest.Mock).mockRejectedValue(new Error("lexoffice down"));

    await runInvoiceJob(params);

    const anKaeufer = (sendMail as jest.Mock).mock.calls.filter(
      (c) => c[0]?.to === "kaeufer@example.org"
    );
    expect(anKaeufer.length).toBe(1);
    expect(anKaeufer[0][0].attachments).toBeUndefined(); // kein PDF ohne Rechnung
  });

  it("bereits verarbeitet -> laeuft gar nicht erst los (Doppel-Rechnung verhindert)", async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ done: true }], rowCount: 1 });

    await runInvoiceJob(params);

    expect(lex.createInvoice).not.toHaveBeenCalled();
  });
});
