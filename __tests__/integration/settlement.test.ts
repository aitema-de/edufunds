/**
 * Anteilige Abrechnung bei Teilverbrauch — gegen eine ECHTE Datenbank.
 *
 * 20er-Paket (459,90 EUR), 3 Anträge eingelöst, nicht gezahlt: gefordert werden
 * 3 × 29,90 = 89,70 EUR, die 17 offenen Credits verfallen. Der Mengenrabatt geht
 * verloren — das ist der Anreiz, doch regulär zu zahlen.
 */
import { query } from "@/lib/db";
import { createOrder, createEinzelInvoiceOrder } from "@/lib/payments/orders";
import { markOrderPaid, cancelOrder, getOrder } from "@/lib/payments/order-status";
import { settleProRata, berechneProRata } from "@/lib/payments/settlement";
import { consumeCredit } from "@/lib/wizard/credit-codes";
import { EINZELPREIS_CENTS } from "@/lib/payments/packs";

const ORDER = {
  packId: "pack20", // 459,90 EUR / 20 Anträge
  orgName: "Schulträger Musterkreis",
  contactName: "Frau Beispiel",
  email: "verwaltung@landkreis-muster.de",
  billingAddress: "Musterweg 1\n12345 Musterstadt",
};

describe("berechneProRata (reine Rechnung)", () => {
  it("rechnet genutzte Anträge zum Einzelpreis ab", () => {
    const r = berechneProRata({ bestelltCents: 45990, creditsTotal: 20, creditsUsed: 3 });

    expect(r.genutzt).toBe(3);
    expect(r.verfallen).toBe(17);
    expect(r.forderungCents).toBe(3 * EINZELPREIS_CENTS); // 8970
    expect(r.gutschriftCents).toBe(45990 - 8970);
  });

  it("fordert NIE mehr als den Bestellbetrag — auch bei vollem Verbrauch", () => {
    // 20 × 29,90 = 598,00 > 459,90. Wer alles genutzt hat, darf für den
    // Mengenrabatt nicht nachträglich bestraft werden.
    const r = berechneProRata({ bestelltCents: 45990, creditsTotal: 20, creditsUsed: 20 });

    expect(r.forderungCents).toBe(45990);
    expect(r.gutschriftCents).toBe(0);
  });

  it("fordert nichts, wenn nichts genutzt wurde", () => {
    const r = berechneProRata({ bestelltCents: 45990, creditsTotal: 20, creditsUsed: 0 });

    expect(r.forderungCents).toBe(0);
    expect(r.gutschriftCents).toBe(45990);
    expect(r.verfallen).toBe(20);
  });
});

describe("settleProRata", () => {
  it("reduziert die Forderung und laesst die offenen Credits verfallen", async () => {
    const o = await createOrder(ORDER);
    await consumeCredit(o.creditCode);
    await consumeCredit(o.creditCode);
    await consumeCredit(o.creditCode); // 3 von 20 genutzt

    const res = await settleProRata(o.orderNumber);

    expect(res.changed).toBe(true);
    expect(res.proRata).toMatchObject({ genutzt: 3, verfallen: 17, forderungCents: 8970 });

    // Die reduzierte Forderung steht in der DB; der URSPRUNGSBETRAG bleibt
    // unangetastet (GoBD — sonst waere nicht mehr nachvollziehbar, was bestellt
    // und was abgerechnet wurde).
    const order = await getOrder(o.orderNumber);
    expect(order?.settledAmountCents).toBe(8970);
    expect(order?.amountCents).toBe(45990);

    // Die 17 offenen Credits sind weg.
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });
  });

  it("laesst die Forderung bestehen — abgerechnet heisst nicht erlassen", async () => {
    const o = await createOrder(ORDER);
    await consumeCredit(o.creditCode);

    await settleProRata(o.orderNumber);

    // Status bleibt offen: der Traeger schuldet weiterhin 29,90 EUR.
    expect((await getOrder(o.orderNumber))?.status).toBe("payment_pending");
  });

  it("storniert statt abzurechnen, wenn KEIN Antrag eingeloest wurde", async () => {
    const o = await createOrder(ORDER); // 0 genutzt

    const res = await settleProRata(o.orderNumber);

    // Nichts geliefert => nichts zu fordern. Das ist ein Storno, keine Abrechnung.
    expect(res.storniertWeilNichtsGenutzt).toBe(true);
    expect(res.proRata?.forderungCents).toBe(0);

    const order = await getOrder(o.orderNumber);
    expect(order?.status).toBe("cancelled");
    expect(order?.cancelReason).toMatch(/kein Antrag eingelöst/);
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });
  });

  it("ist idempotent (Doppelklick rechnet nicht zweimal ab)", async () => {
    const o = await createOrder(ORDER);
    await consumeCredit(o.creditCode);

    const first = await settleProRata(o.orderNumber);
    const second = await settleProRata(o.orderNumber);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect((await getOrder(o.orderNumber))?.settledAmountCents).toBe(EINZELPREIS_CENTS);
  });

  it("greift nicht bei bereits bezahlten oder stornierten Bestellungen", async () => {
    const bezahlt = await createOrder(ORDER);
    await consumeCredit(bezahlt.creditCode);
    await markOrderPaid(bezahlt.orderNumber);
    expect((await settleProRata(bezahlt.orderNumber)).changed).toBe(false);

    const storniert = await createOrder(ORDER);
    await cancelOrder(storniert.orderNumber, "x");
    expect((await settleProRata(storniert.orderNumber)).changed).toBe(false);
  });

  it("greift nicht beim EINZELantrag — da gibt es nichts aufzuteilen", async () => {
    const o = await createEinzelInvoiceOrder({
      ...ORDER,
      sessionToken: "sess-1",
      paidToken: "pt-1",
    });

    const res = await settleProRata(o.orderNumber);

    // Der Einzelantrag IST die Leistung: entweder er zahlt, oder es wird storniert.
    expect(res.changed).toBe(false);
    expect((await getOrder(o.orderNumber))?.settledAmountCents).toBeNull();
  });

  it("meldet changed=false fuer eine unbekannte Bestellung", async () => {
    expect(await settleProRata("EDU-GIBTS-NICHT")).toEqual({ changed: false, order: null });
  });
});

describe("Zahlung nach anteiliger Abrechnung", () => {
  it("laesst sich verbuchen — hebt aber die Sperre der verfallenen Credits NICHT auf", async () => {
    const o = await createOrder(ORDER);
    await consumeCredit(o.creditCode);
    await settleProRata(o.orderNumber);

    // Der Traeger zahlt die reduzierten 29,90 EUR.
    const res = await markOrderPaid(o.orderNumber);
    expect(res.changed).toBe(true);
    expect((await getOrder(o.orderNumber))?.status).toBe("paid");

    // ⚠️ Bewusst dokumentiert: markOrderPaid entsperrt den Code (Mahn-Fall).
    // Nach anteiliger Abrechnung sind die Credits aber ABGERECHNET, nicht nur
    // gesperrt — sie duerfen nicht zurueckkommen.
    const row = await query<{ revoked_at: Date | null }>(
      `SELECT revoked_at FROM credit_codes WHERE code = $1`,
      [o.creditCode]
    );
    expect(row.rows[0].revoked_at).not.toBeNull();
  });
});
