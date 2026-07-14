/**
 * Bestellungen + Kontingent-Kauf gegen eine ECHTE Datenbank.
 *
 * createOrder/createEinzelInvoiceOrder schalten den Kunden SOFORT frei, bevor
 * Geld geflossen ist (Kauf auf Rechnung, bis 459,90 EUR). fulfillQuotaCardPurchase
 * laeuft im Stripe-Webhook, den Stripe mehrfach zustellen darf. Beides war bisher
 * in jedem Test gemockt — geprueft wurde die HTTP-Verzweigung, nicht die Wirkung.
 */
import { query } from "@/lib/db";
import * as bank from "@/lib/payments/bank";
import {
  createOrder,
  createEinzelInvoiceOrder,
  fulfillQuotaCardPurchase,
  countOpenInvoiceOrders,
  MAX_OPEN_INVOICE_ORDERS,
  CREDIT_VALIDITY_MONTHS,
} from "@/lib/payments/orders";
import { EINZELPREIS_CENTS } from "@/lib/payments/packs";

const ORDER = {
  packId: "pack5",
  orgName: "Gymnasium Musterstadt",
  contactName: "Frau Beispiel",
  email: "sekretariat@gym.de",
  billingAddress: "Musterweg 1\n12345 Musterstadt",
};

/** Lokales YYYY-MM-DD (pg liefert DATE als Date auf lokaler Mitternacht). */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function orderRow(orderNumber: string) {
  const res = await query<{
    pack_id: string;
    credits: number;
    amount_cents: number;
    email: string;
    credit_code: string | null;
    status: string;
    due_date: Date;
    note: string | null;
  }>(`SELECT * FROM org_orders WHERE order_number = $1`, [orderNumber]);
  return res.rows[0];
}

describe("createOrder (Kontingent auf Rechnung)", () => {
  it("persistiert die Bestellung mit korrektem Betrag, Kontingent und Faelligkeit", async () => {
    const o = await createOrder(ORDER);

    expect(o.credits).toBe(5);
    expect(o.amountCents).toBe(13990); // pack5 — Preis kommt aus packs.ts, nicht aus dem Test
    expect(o.status).toBe("payment_pending");

    const r = await orderRow(o.orderNumber);
    expect(r.pack_id).toBe("pack5");
    expect(r.credits).toBe(5);
    expect(r.amount_cents).toBe(13990);
    expect(r.status).toBe("payment_pending");
    expect(r.credit_code).toBe(o.creditCode);

    // Zahlungsziel: 14 Tage (PAYMENT_TERM_DAYS). due_date ist eine DATE-Spalte
    // (lokale Mitternacht) — deshalb Datum vergleichen, nicht Millisekunden rechnen.
    const erwartet = new Date();
    erwartet.setDate(erwartet.getDate() + bank.PAYMENT_TERM_DAYS);
    expect(ymd(r.due_date)).toBe(ymd(erwartet));
    expect(o.dueDate).toBe(ymd(erwartet));
  });

  it("erzeugt einen sofort nutzbaren Kontingent-Code mit 12 Monaten Laufzeit", async () => {
    const o = await createOrder(ORDER);

    const res = await query<{ credits_total: number; source: string; expires_at: Date }>(
      `SELECT credits_total, source, expires_at FROM credit_codes WHERE code = $1`,
      [o.creditCode]
    );
    const c = res.rows[0];
    expect(c.credits_total).toBe(5);
    expect(c.source).toBe("invoice");

    const months = Math.round(
      (c.expires_at.getTime() - Date.now()) / (30.44 * 86_400_000)
    );
    expect(months).toBe(CREDIT_VALIDITY_MONTHS);
  });

  it("vergibt eindeutige Bestellnummern", async () => {
    const orders = await Promise.all(Array.from({ length: 20 }, () => createOrder(ORDER)));
    expect(new Set(orders.map((o) => o.orderNumber)).size).toBe(20);
  });

  it("lehnt den Einzelantrag und unbekannte Pakete ab (kein Kontingent-Pfad)", async () => {
    await expect(createOrder({ ...ORDER, packId: "einzel" })).rejects.toThrow(/nicht bestellbares Paket/);
    await expect(createOrder({ ...ORDER, packId: "pack99" })).rejects.toThrow(/nicht bestellbares Paket/);
  });
});

describe("createEinzelInvoiceOrder (Einzelantrag auf Rechnung)", () => {
  it("persistiert die Bestellung ohne Kontingent-Code und verlinkt den Antrag", async () => {
    const o = await createEinzelInvoiceOrder({
      ...ORDER,
      sessionToken: "sess-abc",
      paidToken: "paid-xyz",
    });

    expect(o.amountCents).toBe(EINZELPREIS_CENTS);

    const r = await orderRow(o.orderNumber);
    expect(r.pack_id).toBe("einzel");
    expect(r.credits).toBe(1);
    expect(r.amount_cents).toBe(EINZELPREIS_CENTS);
    expect(r.credit_code).toBeNull(); // Einzelantrag => kein Kontingent
    expect(r.status).toBe("payment_pending");
    // Die Buchhaltung muss die Bestellung dem Antrag zuordnen koennen.
    expect(r.note).toContain("sess-abc");
    expect(r.note).toContain("paid-xyz");
  });
});

describe("fulfillQuotaCardPurchase (Kontingent per Karte, Stripe-Webhook)", () => {
  it("erzeugt einen Kontingent-Code fuer die bezahlte Session", async () => {
    const r = await fulfillQuotaCardPurchase({
      stripeSessionId: "cs_quota_1",
      packId: "pack10",
      orgName: "Realschule Nord",
      email: "verwaltung@rs-nord.de",
    });

    expect(r.alreadyExisted).toBe(false);
    expect(r.credits).toBe(10);
    expect(r.amountCents).toBe(24990);
  });

  it("erzeugt bei doppelter Webhook-Zustellung KEIN zweites Kontingent", async () => {
    const first = await fulfillQuotaCardPurchase({ stripeSessionId: "cs_quota_2", packId: "pack5" });
    const second = await fulfillQuotaCardPurchase({ stripeSessionId: "cs_quota_2", packId: "pack5" });

    expect(first.alreadyExisted).toBe(false);
    expect(second.alreadyExisted).toBe(true);
    expect(second.creditCode).toBe(first.creditCode);

    // Entscheidend: genau EIN Code in der DB — nicht zwei Kontingente fuer eine Zahlung.
    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM credit_codes WHERE stripe_session_id = $1`,
      ["cs_quota_2"]
    );
    expect(res.rows[0].count).toBe("1");
  });

  it("haelt auch der GLEICHZEITIGEN Doppelzustellung stand (Race zwischen SELECT und INSERT)", async () => {
    const [a, b] = await Promise.all([
      fulfillQuotaCardPurchase({ stripeSessionId: "cs_quota_3", packId: "pack5" }),
      fulfillQuotaCardPurchase({ stripeSessionId: "cs_quota_3", packId: "pack5" }),
    ]);

    expect(a.creditCode).toBe(b.creditCode);
    // Genau einer hat ihn wirklich angelegt, der andere hat ihn vorgefunden.
    expect([a.alreadyExisted, b.alreadyExisted].filter(Boolean)).toHaveLength(1);

    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM credit_codes WHERE stripe_session_id = $1`,
      ["cs_quota_3"]
    );
    expect(res.rows[0].count).toBe("1");
  });

  it("lehnt ein Nicht-Kontingent-Paket ab", async () => {
    await expect(
      fulfillQuotaCardPurchase({ stripeSessionId: "cs_x", packId: "einzel" })
    ).rejects.toThrow(/nicht bestellbares Paket/);
  });
});

describe("countOpenInvoiceOrders (Bremse gegen unbezahlte Sofort-Freischaltungen)", () => {
  it("zaehlt nur offene Bestellungen — bezahlte und stornierte nicht", async () => {
    const a = await createOrder(ORDER);
    const b = await createOrder(ORDER);
    await createOrder({ ...ORDER, email: "andere@schule.de" });

    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(2);

    await query(`UPDATE org_orders SET status = 'paid' WHERE order_number = $1`, [a.orderNumber]);
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(1);

    await query(`UPDATE org_orders SET status = 'cancelled' WHERE order_number = $1`, [b.orderNumber]);
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(0);
  });

  it("zaehlt E-Mail-Adressen unabhaengig von Gross-/Kleinschreibung", async () => {
    await createOrder({ ...ORDER, email: "Sekretariat@Gym.DE" });
    expect(await countOpenInvoiceOrders("sekretariat@gym.de")).toBe(1);
  });

  it("deckt BEIDE Rechnungswege ab — Kontingent und Einzelantrag", async () => {
    await createOrder(ORDER);
    await createEinzelInvoiceOrder({ ...ORDER, sessionToken: "s1", paidToken: "p1" });

    // Der Kommentar in orders.ts behauptet, eine Abfrage decke beide Wege ab.
    // Sonst koennte man die Bremse umgehen, indem man den Weg wechselt.
    expect(await countOpenInvoiceOrders(ORDER.email)).toBe(2);
    expect(await countOpenInvoiceOrders(ORDER.email)).toBeGreaterThanOrEqual(MAX_OPEN_INVOICE_ORDERS);
  });
});

describe("Bestellnummer-Kollision", () => {
  afterEach(() => jest.restoreAllMocks());

  it("laesst zwei Bestellungen mit derselben Nummer nicht zu", async () => {
    // generateOrderNumber = EDU-<base36(ms)>-<3 Zufallszeichen>. Zwei Bestellungen
    // in derselben Millisekunde kollidieren mit p=1/46656. Selten, aber real —
    // hier deterministisch erzwungen.
    jest.spyOn(bank, "generateOrderNumber").mockReturnValue("EDU-KOLLISION-001");

    await createOrder(ORDER);
    await expect(createOrder(ORDER)).rejects.toThrow();

    const res = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM org_orders WHERE order_number = $1`,
      ["EDU-KOLLISION-001"]
    );
    expect(res.rows[0].count).toBe("1");
  });
});
