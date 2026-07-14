/**
 * @jest-environment node
 *
 * Branch-Logik von POST /api/wizard/invoice (DB/Mail gemockt):
 * Validierung, Honeypot, Session-Fund, Idempotenz, Freischaltung + Bestellung.
 */
import { POST } from "@/app/api/wizard/invoice/route";

jest.mock("@/lib/wizard/session", () => ({
  getWizardSession: jest.fn(),
  tryMarkSessionPaid: jest.fn(),
}));
jest.mock("@/lib/payments/orders", () => ({
  createEinzelInvoiceOrder: jest.fn(),
  buildEinzelInvoiceConfirmationEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
  buildEinzelInvoiceAdminEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
  escapeHtml: (s: string) => s,
  // Missbrauchsbremse: Standardmaessig keine offene Rechnung -> Freischaltung erlaubt.
  countOpenInvoiceOrders: jest.fn(async () => 0),
  MAX_OPEN_INVOICE_ORDERS: 2,
}));
jest.mock("@/lib/app-url", () => ({ trustedAppUrl: jest.fn(() => "https://app.edufunds.org") }));
jest.mock("@/lib/mail", () => ({ sendMail: jest.fn(async () => true) }));

import { getWizardSession, tryMarkSessionPaid } from "@/lib/wizard/session";
import { createEinzelInvoiceOrder, countOpenInvoiceOrders } from "@/lib/payments/orders";

const mGetSession = getWizardSession as jest.Mock;
const mMarkPaid = tryMarkSessionPaid as jest.Mock;
const mCreateOrder = createEinzelInvoiceOrder as jest.Mock;
const mOffen = countOpenInvoiceOrders as jest.Mock;

const req = (body: unknown) => ({ json: async () => body }) as never;

const validBody = {
  sessionToken: "sess-token-12345678",
  orgName: "Förderverein Musterschule e. V.",
  contactName: "Frau Beispiel",
  email: "vorstand@foerderverein-muster.de",
  billingAddress: "Förderverein Musterschule e. V.\nSchulstraße 1\n12345 Musterhausen",
};

const fakeOrder = {
  orderNumber: "EDU-ABC-XYZ",
  amountCents: 2990,
  orgName: validBody.orgName,
  contactName: validBody.contactName,
  email: validBody.email,
  billingAddress: validBody.billingAddress,
  dueDate: "2026-07-02",
  paidToken: "paid-token-uuid",
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.RESEND_API_KEY;
});

describe("POST /api/wizard/invoice", () => {
  it("400 bei fehlenden Pflichtfeldern", async () => {
    const res = await POST(req({ sessionToken: validBody.sessionToken }));
    expect(res.status).toBe(400);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("400 bei ungueltiger E-Mail", async () => {
    const res = await POST(req({ ...validBody, email: "keine-mail" }));
    expect(res.status).toBe(400);
  });

  it("Honeypot gefuellt -> stiller Erfolg ohne Freischaltung", async () => {
    const res = await POST(req({ ...validBody, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("zu schnell abgesendet -> 429", async () => {
    const res = await POST(req({ ...validBody, timestamp: Date.now() }));
    expect(res.status).toBe(429);
  });

  it("404 wenn Session nicht gefunden", async () => {
    mGetSession.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(404);
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  it("idempotent: bereits bezahlte Session liefert bestehenden paid_token", async () => {
    mGetSession.mockResolvedValue({ paidToken: "existing-token" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alreadyPaid: true, paidToken: "existing-token" });
    expect(mMarkPaid).not.toHaveBeenCalled();
  });

  // Missbrauchsbremse (14.07.2026): Die Pruefung MUSS vor tryMarkSessionPaid
  // greifen — danach waere der Antrag bereits freigeschaltet.
  it("409 bei zu vielen offenen Rechnungen — und schaltet NICHT frei", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mOffen.mockResolvedValueOnce(2); // = MAX_OPEN_INVOICE_ORDERS
    const res = await POST(req(validBody));
    expect(res.status).toBe(409);
    expect(mMarkPaid).not.toHaveBeenCalled(); // entscheidend: keine Freischaltung
    expect(mCreateOrder).not.toHaveBeenCalled();
  });

  it("Erfolg: schaltet Session per 'invoice' frei und legt Bestellung an", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mMarkPaid.mockResolvedValue({ session: { paidToken: "paid-token-uuid" }, didSet: true });
    mCreateOrder.mockResolvedValue(fakeOrder);

    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, paidToken: "paid-token-uuid", orderNumber: "EDU-ABC-XYZ" });
    expect(mMarkPaid).toHaveBeenCalledWith(
      validBody.sessionToken,
      expect.objectContaining({ source: "invoice", tier: "einzelantrag", stripeCustomerEmail: validBody.email })
    );
    expect(mCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orgName: validBody.orgName, paidToken: "paid-token-uuid" })
    );
  });

  it("Race: didSet=false -> bestehenden Token, keine zweite Bestellung", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mMarkPaid.mockResolvedValue({ session: { paidToken: "race-token" }, didSet: false });

    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alreadyPaid: true, paidToken: "race-token" });
    expect(mCreateOrder).not.toHaveBeenCalled();
  });

  it("Antrag bleibt frei, wenn Bestellung wirft (paid_token wird trotzdem geliefert)", async () => {
    mGetSession.mockResolvedValue({ paidToken: undefined });
    mMarkPaid.mockResolvedValue({ session: { paidToken: "paid-token-uuid" }, didSet: true });
    mCreateOrder.mockRejectedValue(new Error("db down"));

    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, paidToken: "paid-token-uuid" });
  });
});
