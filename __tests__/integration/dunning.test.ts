/**
 * Mahnlauf gegen eine ECHTE Datenbank.
 *
 * Der Rechnungskauf schaltet sofort frei, bevor Geld geflossen ist. Bisher
 * bemerkte niemand, wenn nie bezahlt wurde.
 *
 * sendMail wird gemockt (kein Resend im Test) — die Frage hier ist nicht, ob die
 * Mail ankommt, sondern WELCHE Wirkung der Lauf auf die Datenbank hat: wer wird
 * erinnert, wer gemahnt, wessen Kontingent gesperrt — und was passiert, wenn der
 * Versand scheitert.
 */
const mSendMail = jest.fn().mockResolvedValue(true);
jest.mock("@/lib/mail", () => ({ sendMail: (...a: unknown[]) => mSendMail(...a) }));

import { query } from "@/lib/db";
import { createOrder, createEinzelInvoiceOrder } from "@/lib/payments/orders";
import { markOrderPaid, getOrder } from "@/lib/payments/order-status";
import { runDunning, DUNNING_GRACE_DAYS } from "@/lib/payments/dunning";
import { consumeCredit } from "@/lib/wizard/credit-codes";
import { createWizardSession, tryMarkSessionPaid, getSessionByPaidToken } from "@/lib/wizard/session";

const ORDER = {
  packId: "pack5",
  orgName: "Gymnasium Musterstadt",
  contactName: "Frau Beispiel",
  email: "sekretariat@gym.de",
  billingAddress: "Musterweg 1\n12345 Musterstadt",
};

/** Setzt das Zahlungsziel N Tage in die Vergangenheit. */
async function faelligVor(orderNumber: string, tage: number) {
  await query(
    `UPDATE org_orders SET due_date = CURRENT_DATE - $2::int WHERE order_number = $1`,
    [orderNumber, tage]
  );
}

/** Datiert die verschickte Erinnerung N Tage zurueck (Kulanzfrist laeuft ab ihr). */
async function erinnertVor(orderNumber: string, tage: number) {
  await query(
    `UPDATE org_orders
        SET reminder_sent_at = CURRENT_TIMESTAMP - make_interval(days => $2::int)
      WHERE order_number = $1`,
    [orderNumber, tage]
  );
}

beforeEach(() => {
  mSendMail.mockReset();
  mSendMail.mockResolvedValue(true);
});

describe("Stufe 1 — Zahlungserinnerung", () => {
  it("erinnert erst NACH dem Zahlungsziel, nicht vorher", async () => {
    await createOrder(ORDER); // faellig in 14 Tagen

    const run = await runDunning();

    expect(run.erinnert).toHaveLength(0);
    expect(mSendMail).not.toHaveBeenCalled();
  });

  it("erinnert eine ueberfaellige Bestellung — ohne Folgen fuer das Kontingent", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 1);

    const run = await runDunning();

    expect(run.erinnert).toEqual([o.orderNumber]);
    expect(run.gesperrt).toHaveLength(0);
    expect(mSendMail).toHaveBeenCalledTimes(1);
    expect(mSendMail.mock.calls[0][0]).toMatchObject({ to: ORDER.email });
    expect(mSendMail.mock.calls[0][0].subject).toContain("Zahlungserinnerung");

    // Die Erinnerung hat keine Folgen: das Kontingent bleibt nutzbar.
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
  });

  it("erinnert nur EINMAL (ein Cron, der zweimal laeuft, mahnt nicht doppelt)", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 1);

    await runDunning();
    const zweiter = await runDunning();

    expect(zweiter.erinnert).toHaveLength(0);
    expect(mSendMail).toHaveBeenCalledTimes(1);
  });

  it("erinnert eine bezahlte Bestellung nicht", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 5);
    await markOrderPaid(o.orderNumber);

    const run = await runDunning();

    expect(run.erinnert).toHaveLength(0);
    expect(mSendMail).not.toHaveBeenCalled();
  });
});

describe("Stufe 2 — Mahnung + Sperre", () => {
  /** Bestellung, die erinnert wurde und deren Kulanzfrist abgelaufen ist. */
  async function reifFuerMahnung() {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    await runDunning(); // Stufe 1 — erinnert
    await erinnertVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    mSendMail.mockClear();
    return o;
  }

  it("mahnt erst nach der Kulanzfrist", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 1);
    await runDunning(); // erinnert
    mSendMail.mockClear();

    const run = await runDunning(); // Kulanzfrist laeuft noch

    expect(run.gemahnt).toHaveLength(0);
    expect(mSendMail).not.toHaveBeenCalled();
  });

  it("mahnt NICHT im selben Lauf, in dem erinnert wurde — auch bei laengst ueberfaelliger Rechnung", async () => {
    // Sonst bekaeme der Kunde zwei Mails in derselben Minute und waere gesperrt,
    // bevor er die Erinnerung gelesen hat. Die Kulanzfrist laeuft ab der
    // ERINNERUNG, nicht ab dem Zahlungsziel.
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 90); // seit drei Monaten faellig, nie erinnert

    const run = await runDunning();

    expect(run.erinnert).toEqual([o.orderNumber]);
    expect(run.gemahnt).toHaveLength(0);
    expect(run.gesperrt).toHaveLength(0);
    expect(mSendMail).toHaveBeenCalledTimes(1);
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
  });

  it("mahnt und sperrt die noch offenen Credits", async () => {
    const o = await reifFuerMahnung();

    const run = await runDunning();

    expect(run.gemahnt).toEqual([o.orderNumber]);
    expect(run.gesperrt).toEqual([o.orderNumber]);
    expect(mSendMail.mock.calls[0][0].subject).toContain("Mahnung");

    // Das Kontingent ist gesperrt — aber die Forderung besteht weiter.
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });
    expect((await getOrder(o.orderNumber))?.status).toBe("payment_pending");
  });

  it("nimmt bereits erstellte Antraege NICHT zurueck (erbrachte Leistung)", async () => {
    const o = await reifFuerMahnung();
    await consumeCredit(o.creditCode); // 1 Antrag ist raus
    await consumeCredit(o.creditCode); // 2 Antraege sind raus

    await runDunning();

    const res = await query<{ credits_used: number; credits_total: number }>(
      `SELECT credits_used, credits_total FROM credit_codes WHERE code = $1`,
      [o.creditCode]
    );
    expect(res.rows[0].credits_used).toBe(2); // bleibt protokolliert
    expect(res.rows[0].credits_total).toBe(5); // nicht heimlich umgeschrieben
  });

  it("mahnt nur EINMAL", async () => {
    const o = await reifFuerMahnung();

    await runDunning();
    mSendMail.mockClear();
    const zweiter = await runDunning();

    expect(zweiter.gemahnt).toHaveLength(0);
    expect(mSendMail).not.toHaveBeenCalled();
  });

  it("entwertet beim EINZELantrag nur die Forderung, nie den gelieferten Antrag", async () => {
    // Der Automat nimmt keine erbrachte Leistung zurueck — das kann nur ein
    // bewusstes Storno durch den Admin.
    const s = await createWizardSession("digitalpakt", "DigitalPakt Schule");
    const { session } = await tryMarkSessionPaid(s.sessionToken, { source: "invoice" });
    const paidToken = session.paidToken!;
    const o = await createEinzelInvoiceOrder({ ...ORDER, sessionToken: s.sessionToken, paidToken });

    await faelligVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    await runDunning(); // Stufe 1
    await erinnertVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    const run = await runDunning(); // Stufe 2

    expect(run.gemahnt).toEqual([o.orderNumber]);
    expect(run.gesperrt).toHaveLength(0); // es gibt kein Kontingent zu sperren
    // Der Antrag bleibt abrufbar.
    expect(await getSessionByPaidToken(paidToken)).not.toBeNull();
  });
});

describe("Niemand wird still gesperrt", () => {
  it("aendert NICHTS, wenn der Mailversand scheitert — der naechste Lauf versucht es erneut", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 1);

    mSendMail.mockResolvedValue(false); // Resend down / kein API-Key
    const run = await runDunning();

    expect(run.fehlgeschlagen).toEqual([o.orderNumber]);
    expect(run.erinnert).toHaveLength(0);

    // Kein Zeitstempel gesetzt => die Erinnerung ist NICHT verbraucht.
    const res = await query<{ reminder_sent_at: Date | null }>(
      `SELECT reminder_sent_at FROM org_orders WHERE order_number = $1`,
      [o.orderNumber]
    );
    expect(res.rows[0].reminder_sent_at).toBeNull();

    // Naechster Lauf mit funktionierendem Mailer: jetzt geht sie raus.
    mSendMail.mockResolvedValue(true);
    expect((await runDunning()).erinnert).toEqual([o.orderNumber]);
  });

  it("sperrt das Kontingent NICHT, wenn die Mahnung nicht zugestellt werden konnte", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    await runDunning(); // Stufe 1 (Mail ok)
    await erinnertVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);

    mSendMail.mockResolvedValue(false);
    const run = await runDunning(); // Stufe 2 — Mail scheitert

    expect(run.fehlgeschlagen).toEqual([o.orderNumber]);
    expect(run.gesperrt).toHaveLength(0);
    // Entscheidend: kein Kunde steht ohne Kontingent da, ohne je gemahnt worden zu sein.
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
  });
});

describe("Wer zahlt, bekommt sein Kontingent zurueck", () => {
  it("hebt die Sperre nach dem Zahlungseingang auf", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    await runDunning(); // erinnert
    await erinnertVor(o.orderNumber, DUNNING_GRACE_DAYS + 1);
    await runDunning(); // mahnt + sperrt
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: false, reason: "revoked" });

    // Die Schule ueberweist, der Admin verbucht.
    await markOrderPaid(o.orderNumber);

    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
    expect((await getOrder(o.orderNumber))?.creditsGesperrt).toBe(false);
  });
});

describe("dryRun", () => {
  it("ermittelt nur, versendet nichts und sperrt nichts", async () => {
    const o = await createOrder(ORDER);
    await faelligVor(o.orderNumber, 1);

    const run = await runDunning({ dryRun: true });

    expect(run.dryRun).toBe(true);
    expect(run.erinnert).toEqual([o.orderNumber]);
    expect(mSendMail).not.toHaveBeenCalled();

    const res = await query<{ reminder_sent_at: Date | null }>(
      `SELECT reminder_sent_at FROM org_orders WHERE order_number = $1`,
      [o.orderNumber]
    );
    expect(res.rows[0].reminder_sent_at).toBeNull();
    expect(await consumeCredit(o.creditCode)).toEqual({ ok: true, creditsRemaining: 4 });
  });
});
