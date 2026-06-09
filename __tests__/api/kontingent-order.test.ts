/**
 * @jest-environment node
 *
 * Branch-Logik von POST /api/kontingent/order (DB/Mail gemockt):
 * Validierung, Honeypot, unbekanntes Paket, Erfolg mit Code-Rueckgabe.
 */
import { POST } from "@/app/api/kontingent/order/route";

jest.mock("@/lib/payments/orders", () => ({
  createOrder: jest.fn(),
  buildOrderConfirmationEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
  buildOrderAdminEmail: jest.fn(() => ({ subject: "s", html: "h", text: "t" })),
}));

import { createOrder } from "@/lib/payments/orders";

const mCreate = createOrder as jest.Mock;

const req = (body: unknown) => ({ json: async () => body }) as never;

const validBody = {
  packId: "pack5",
  orgName: "Stadt Musterhausen",
  contactName: "Frau Beispiel",
  email: "beschaffung@musterhausen.de",
  billingAddress: "Stadtverwaltung\nRathausplatz 1\n12345 Musterhausen",
};

const fakeOrder = {
  id: 1,
  orderNumber: "EDU-ABC-XYZ",
  packId: "pack5",
  credits: 5,
  amountCents: 13990,
  orgName: validBody.orgName,
  contactName: validBody.contactName,
  email: validBody.email,
  billingAddress: validBody.billingAddress,
  creditCode: "EDU-AAAA-BBBB",
  status: "payment_pending",
  dueDate: "2026-06-23",
  createdAt: "2026-06-09T12:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.RESEND_API_KEY; // Mail-Pfad still ueberspringen
});

describe("POST /api/kontingent/order", () => {
  it("400 bei fehlenden Pflichtfeldern", async () => {
    const res = await POST(req({ packId: "pack5" }));
    expect(res.status).toBe(400);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("400 bei ungueltiger E-Mail", async () => {
    const res = await POST(req({ ...validBody, email: "keine-mail" }));
    expect(res.status).toBe(400);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("400 bei unbekanntem Paket", async () => {
    const res = await POST(req({ ...validBody, packId: "pack999" }));
    expect(res.status).toBe(400);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("400 wenn Einzelantrag (kein Kontingent-Paket) bestellt wird", async () => {
    const res = await POST(req({ ...validBody, packId: "einzel" }));
    expect(res.status).toBe(400);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("Honeypot gefuellt -> stiller Erfolg ohne Bestellung", async () => {
    const res = await POST(req({ ...validBody, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("zu schnell abgesendet -> 429", async () => {
    const res = await POST(req({ ...validBody, timestamp: Date.now() }));
    expect(res.status).toBe(429);
    expect(mCreate).not.toHaveBeenCalled();
  });

  it("Erfolg: legt Bestellung an und gibt Code + Betrag zurueck", async () => {
    mCreate.mockResolvedValue(fakeOrder);
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      orderNumber: "EDU-ABC-XYZ",
      creditCode: "EDU-AAAA-BBBB",
      credits: 5,
      amountCents: 13990,
    });
    expect(mCreate).toHaveBeenCalledWith(
      expect.objectContaining({ packId: "pack5", email: validBody.email })
    );
  });

  it("500 wenn createOrder wirft", async () => {
    mCreate.mockRejectedValue(new Error("db down"));
    const res = await POST(req(validBody));
    expect(res.status).toBe(500);
  });
});
