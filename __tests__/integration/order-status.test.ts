/**
 * Bestellstatus-Lebenszyklus gegen eine ECHTE Datenbank.
 *
 * Der Kernbefund, der dazu gefuehrt hat: `org_orders.status` wurde bei der
 * Bestellung auf 'payment_pending' gesetzt und NIE wieder geaendert. Die Bremse
 * gegen unbezahlte Sofort-Freischaltungen zaehlt genau diese Zeilen — sie hatte
 * also keine Lösemechanik und sperrte den zahlenden Stammkunden aus.
 */
import { query } from "@/lib/db";
import {
  createOrder,
  createEinzelInvoiceOrder,
  countOpenInvoiceOrders,
  MAX_OPEN_INVOICE_ORDERS,
} from "@/lib/payments/orders";
import {
  markOrderPaid,
  cancelOrder,
  suspendOrderCredits,
  listOrders,
  getOrder,
} from "@/lib/payments/order-status";
import { consumeCredit } from "@/lib/wizard/credit-codes";
import { createWizardSession, tryMarkSessionPaid, getSessionByPaidToken } from "@/lib/wizard/session";

const ORDER = {
  packId: "pack5",
  orgName: "Gymnasium Musterstadt",
  contactName: "Frau Beispiel",
  email: "sekretariat@gym.de",
  billingAddress: "Musterweg 1\n12345 Musterstadt",
};

describe("Die Bremse löst sich wieder (der eigentliche Bug)", () => {
  it("sperrt den zahlenden Stammkunden NICHT dauerhaft aus", async () => {
    // Zwei Bestellungen — die Bremse ist jetzt am Anschlag.
    const a = await createOrder(ORDER);
    const b = await createOrder(ORDER);
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(MAX_OPEN_INVOICE_ORDERS);

    // Der Kunde ueberweist beide Rechnungen. Vor diesem Commit gab es keinen Weg,
    // das zu verbuchen — er waere ab hier fuer immer mit 409 abgewiesen worden.
    await markOrderPaid(a.orderNumber);
    await markOrderPaid(b.orderNumber);

    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(0);
  });

  it("zaehlt eine stornierte Bestellung nicht mehr als offen", async () => {
    const a = await createOrder(ORDER);
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(1);

    await cancelOrder(a.orderNumber, "Doppelbestellung");
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(0);
  });
});

describe("markOrderPaid", () => {
  it("verbucht den Zahlungseingang", async () => {
    const o = await createOrder(ORDER);
    const res = await markOrderPaid(o.orderNumber);

    expect(res.changed).toBe(true);
    expect(res.order?.status).toBe("paid");
    expect(res.order?.paidAt).toBeTruthy();
  });

  it("ist idempotent (Doppelklick im Admin aendert nichts)", async () => {
    const o = await createOrder(ORDER);

    const first = await markOrderPaid(o.orderNumber);
    const second = await markOrderPaid(o.orderNumber);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.order?.status).toBe("paid");
  });

  it("hebt eine Credit-Sperre wieder auf — wer nach der Mahnung zahlt, bekommt sein Kontingent zurueck", async () => {
    const o = await createOrder(ORDER);
    await suspendOrderCredits(o.orderNumber);
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });

    await markOrderPaid(o.orderNumber);

    // Sonst haetten wir das Geld UND die Leistung einbehalten.
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
    expect((await getOrder(o.orderNumber))?.creditsGesperrt).toBe(false);
  });

  it("meldet changed=false fuer eine unbekannte Bestellung", async () => {
    const res = await markOrderPaid("EDU-GIBTS-NICHT");
    expect(res).toEqual({ changed: false, order: null });
  });
});

describe("suspendOrderCredits (Mahnstufe — Forderung bleibt bestehen)", () => {
  it("sperrt die offenen Credits, laesst den Status aber auf 'offen'", async () => {
    const o = await createOrder(ORDER);
    const res = await suspendOrderCredits(o.orderNumber);

    expect(res.suspended).toBe(true);
    expect(res.code).toBe(o.creditCode);
    // Die Forderung besteht weiter — sonst wuerden wir sie stillschweigend erlassen.
    expect((await getOrder(o.orderNumber))?.status).toBe("payment_pending");
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });
  });

  it("laesst bereits erstellte Antraege unangetastet (erbrachte Leistung)", async () => {
    const o = await createOrder(ORDER);
    await consumeCredit(o.creditCode); // 1 Antrag ist raus
    await consumeCredit(o.creditCode); // 2 Antraege sind raus

    await suspendOrderCredits(o.orderNumber);

    const res = await query<{ credits_used: number; credits_total: number }>(
      `SELECT credits_used, credits_total FROM credit_codes WHERE code = $1`,
      [o.creditCode]
    );
    expect(res.rows[0].credits_used).toBe(2); // bleibt protokolliert
    expect(res.rows[0].credits_total).toBe(5); // nicht heimlich umgeschrieben
  });

  it("ist idempotent und greift nicht bei bereits bezahlten Bestellungen", async () => {
    const o = await createOrder(ORDER);
    expect((await suspendOrderCredits(o.orderNumber)).suspended).toBe(true);
    expect((await suspendOrderCredits(o.orderNumber)).suspended).toBe(false);

    const bezahlt = await createOrder(ORDER);
    await markOrderPaid(bezahlt.orderNumber);
    expect((await suspendOrderCredits(bezahlt.orderNumber)).suspended).toBe(false);
  });
});

describe("cancelOrder (Storno — Forderung faellt weg)", () => {
  it("sperrt die offenen Credits des Kontingents", async () => {
    const o = await createOrder(ORDER);
    await cancelOrder(o.orderNumber, "Nicht bezahlt");

    const order = await getOrder(o.orderNumber);
    expect(order?.status).toBe("cancelled");
    expect(order?.cancelReason).toBe("Nicht bezahlt");
    expect(order?.creditsGesperrt).toBe(true);
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });
  });

  it("entwertet beim EINZELantrag auf Rechnung auch den Antrag selbst", async () => {
    // Der Einzelantrag ist 1:1 die Bestellung — wer nicht zahlt, behaelt ihn nicht.
    const s = await createWizardSession("digitalpakt", "DigitalPakt Schule");
    const { session } = await tryMarkSessionPaid(s.sessionToken, { source: "invoice" });
    const paidToken = session.paidToken!;

    const o = await createEinzelInvoiceOrder({
      ...ORDER,
      sessionToken: s.sessionToken,
      paidToken,
    });
    expect(await getSessionByPaidToken(paidToken)).not.toBeNull();

    await cancelOrder(o.orderNumber, "Nicht bezahlt");

    // Der Download-Link ist tot. Ging vorher nicht: die Verknuepfung stand nur
    // als Freitext in `note` — darauf konnte man nicht handeln.
    expect(await getSessionByPaidToken(paidToken)).toBeNull();
  });

  it("ist idempotent", async () => {
    const o = await createOrder(ORDER);
    expect((await cancelOrder(o.orderNumber, "x")).changed).toBe(true);
    expect((await cancelOrder(o.orderNumber, "x")).changed).toBe(false);
  });
});

describe("listOrders", () => {
  it("liefert Bestellungen mit Ueberfaelligkeit und Sperr-Status", async () => {
    const o = await createOrder(ORDER);
    await query(`UPDATE org_orders SET due_date = CURRENT_DATE - 3 WHERE order_number = $1`, [
      o.orderNumber,
    ]);
    await suspendOrderCredits(o.orderNumber);

    const alle = await listOrders();
    const found = alle.find((x) => x.orderNumber === o.orderNumber)!;

    expect(found.tageUeberfaellig).toBe(3);
    expect(found.creditsGesperrt).toBe(true);
    expect(found.amountCents).toBe(13990);
  });

  it("filtert nach Status", async () => {
    const a = await createOrder(ORDER);
    await createOrder(ORDER);
    await markOrderPaid(a.orderNumber);

    expect(await listOrders({ status: "paid" })).toHaveLength(1);
    expect(await listOrders({ status: "payment_pending" })).toHaveLength(1);
  });
});

describe("Schema (Migration 013)", () => {
  it("erzwingt die drei Status — vorher war das nur ein Kommentar", async () => {
    const o = await createOrder(ORDER);
    await expect(
      query(`UPDATE org_orders SET status = 'quatsch' WHERE order_number = $1`, [o.orderNumber])
    ).rejects.toThrow(/org_orders_status_check/);
  });

  it("verknuepft den Einzelantrag ueber eine echte Spalte statt ueber Freitext", async () => {
    const o = await createEinzelInvoiceOrder({
      ...ORDER,
      sessionToken: "sess-real-column",
      paidToken: "pt-1",
    });
    const res = await query<{ session_token: string | null }>(
      `SELECT session_token FROM org_orders WHERE order_number = $1`,
      [o.orderNumber]
    );
    expect(res.rows[0].session_token).toBe("sess-real-column");
  });
});
