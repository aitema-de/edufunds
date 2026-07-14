/**
 * Rueckerstattung → Zugriff entwerten (PAY-03) gegen eine ECHTE Datenbank.
 *
 * Der offene Bug: Nach einem Refund lief nur ein console.log. Der Kunde bekam
 * sein Geld zurueck und behielt Antrag bzw. Kontingent — Zahlungsstatus und
 * Zugriffsrecht liefen dauerhaft auseinander.
 */
import { query } from "@/lib/db";
import { createWizardSession, getSessionByPaidToken, tryMarkSessionPaid, isRefundedToken } from "@/lib/wizard/session";
import { revokeSessionAccess, revokeQuotaCodeByStripeSession } from "@/lib/payments/refund";
import { createCreditCode, consumeCredit } from "@/lib/wizard/credit-codes";
import { fulfillQuotaCardPurchase } from "@/lib/payments/orders";

async function bezahlteSession() {
  const s = await createWizardSession("digitalpakt", "DigitalPakt Schule");
  const { session } = await tryMarkSessionPaid(s.sessionToken, {
    source: "card",
    stripeSessionId: "cs_refund",
  });
  return { sessionToken: s.sessionToken, paidToken: session.paidToken! };
}

describe("Schema kennt den Status 'refunded' (Migration 012)", () => {
  it("akzeptiert status='refunded' — die CHECK-Constraint kannte ihn vorher NICHT", async () => {
    const s = await createWizardSession("digitalpakt", "DigitalPakt Schule");
    await expect(
      query(`UPDATE ki_antraege SET status = 'refunded' WHERE session_token = $1`, [s.sessionToken])
    ).resolves.toBeDefined();
  });
});

describe("revokeSessionAccess", () => {
  it("entwertet den paid_token — der Download-Link ist danach tot", async () => {
    const { sessionToken, paidToken } = await bezahlteSession();
    // Vorher: Zugriff da.
    expect(await getSessionByPaidToken(paidToken)).not.toBeNull();

    const r = await revokeSessionAccess(sessionToken);

    expect(r.revoked).toBe(true);
    expect(r.revokedToken).toBe(paidToken);
    // Nachher: derselbe Token oeffnet nichts mehr.
    expect(await getSessionByPaidToken(paidToken)).toBeNull();
  });

  it("setzt status=refunded, refunded_at und bewahrt den alten Token auf", async () => {
    const { sessionToken, paidToken } = await bezahlteSession();
    await revokeSessionAccess(sessionToken);

    const res = await query<{
      status: string;
      paid_token: string | null;
      refunded_token: string | null;
      refunded_at: Date | null;
    }>(`SELECT status, paid_token, refunded_token, refunded_at FROM ki_antraege WHERE session_token = $1`, [
      sessionToken,
    ]);
    const row = res.rows[0];

    expect(row.status).toBe("refunded");
    expect(row.paid_token).toBeNull();
    expect(row.refunded_token).toBe(paidToken); // Audit + Erklaerung auf der Download-Seite
    expect(row.refunded_at).toBeInstanceOf(Date);
  });

  it("schliesst ALLE Tueren: der Token ist das einzige Zugangsmerkmal (auch fuer die Finanzplan-Routen)", async () => {
    const { sessionToken, paidToken } = await bezahlteSession();
    await revokeSessionAccess(sessionToken);

    // finanzplan/autofix + finanzplan/legitimize gaten auf session.paidToken.
    // Nach dem Entwerten muss der auch dort weg sein — sonst bleiben die bezahlten
    // KI-Funktionen nach der Erstattung offen.
    const res = await query<{ paid_token: string | null }>(
      `SELECT paid_token FROM ki_antraege WHERE session_token = $1`,
      [sessionToken]
    );
    expect(res.rows[0].paid_token).toBeNull();
    expect(await getSessionByPaidToken(paidToken)).toBeNull();
  });

  it("ist idempotent — Stripe darf charge.refunded mehrfach zustellen", async () => {
    const { sessionToken, paidToken } = await bezahlteSession();

    const first = await revokeSessionAccess(sessionToken);
    const second = await revokeSessionAccess(sessionToken);

    expect(first.revoked).toBe(true);
    expect(second.revoked).toBe(false);
    // Der zweite Aufruf kennt den alten Token noch (Logging) und zerstoert nichts.
    expect(second.revokedToken).toBe(paidToken);

    const res = await query<{ refunded_token: string | null; status: string }>(
      `SELECT refunded_token, status FROM ki_antraege WHERE session_token = $1`,
      [sessionToken]
    );
    expect(res.rows[0].refunded_token).toBe(paidToken);
    expect(res.rows[0].status).toBe("refunded");
  });

  it("haelt paralleler Doppelzustellung stand (genau eine Entwertung)", async () => {
    const { sessionToken } = await bezahlteSession();

    const results = await Promise.all([
      revokeSessionAccess(sessionToken),
      revokeSessionAccess(sessionToken),
    ]);

    expect(results.filter((r) => r.revoked)).toHaveLength(1);
  });

  it("meldet revoked=false fuer eine nie bezahlte oder unbekannte Session", async () => {
    const s = await createWizardSession("digitalpakt", "DigitalPakt Schule");
    expect(await revokeSessionAccess(s.sessionToken)).toEqual({ revoked: false });
    expect(await revokeSessionAccess("gibt-es-nicht")).toEqual({ revoked: false });
  });
});

describe("isRefundedToken (Erklaerung statt nackter 404)", () => {
  it("erkennt den entwerteten Token wieder", async () => {
    const { sessionToken, paidToken } = await bezahlteSession();
    expect(await isRefundedToken(paidToken)).toBe(false);

    await revokeSessionAccess(sessionToken);

    // Der Kunde klickt seinen alten Link: die Seite kann jetzt erklaeren, warum
    // er tot ist, statt eine 404 zu werfen.
    expect(await isRefundedToken(paidToken)).toBe(true);
  });

  it("bleibt bei einem frei erfundenen Token false (keine Auskunft ueber Fremdtokens)", async () => {
    expect(await isRefundedToken("beliebiger-quatsch")).toBe(false);
  });
});

describe("revokeQuotaCodeByStripeSession (Kontingent-Kartenkauf)", () => {
  it("entwertet die offenen Credits eines erstatteten Kontingents", async () => {
    const bought = await fulfillQuotaCardPurchase({
      stripeSessionId: "cs_quota_refund",
      packId: "pack5",
      orgName: "Realschule Nord",
    });
    // Zwei Antraege sind schon eingeloest — die bleiben, sie wurden geliefert.
    await consumeCredit(bought.creditCode);
    await consumeCredit(bought.creditCode);

    const r = await revokeQuotaCodeByStripeSession("cs_quota_refund");

    expect(r.revoked).toBe(true);
    expect(r.code).toBe(bought.creditCode);
    expect(r.creditsVerfallen).toBe(3); // 5 gekauft - 2 genutzt

    // Entscheidend: der Code laesst sich nicht mehr einloesen.
    expect(await consumeCredit(bought.creditCode)).toEqual({ ok: false, reason: "revoked" });
  });

  it("laesst bereits eingeloeste Credits protokolliert (GoBD/Audit)", async () => {
    const bought = await fulfillQuotaCardPurchase({ stripeSessionId: "cs_q2", packId: "pack5" });
    await consumeCredit(bought.creditCode);
    await revokeQuotaCodeByStripeSession("cs_q2");

    const res = await query<{ credits_used: number; credits_total: number; revoked_at: Date | null }>(
      `SELECT credits_used, credits_total, revoked_at FROM credit_codes WHERE code = $1`,
      [bought.creditCode]
    );
    expect(res.rows[0].credits_used).toBe(1);
    expect(res.rows[0].credits_total).toBe(5); // nicht heimlich umgeschrieben
    expect(res.rows[0].revoked_at).toBeInstanceOf(Date);
  });

  it("ist idempotent", async () => {
    await fulfillQuotaCardPurchase({ stripeSessionId: "cs_q3", packId: "pack5" });

    expect((await revokeQuotaCodeByStripeSession("cs_q3")).revoked).toBe(true);
    expect((await revokeQuotaCodeByStripeSession("cs_q3")).revoked).toBe(false);
  });

  it("meldet revoked=false, wenn zu der Stripe-Session kein Kontingent existiert", async () => {
    expect(await revokeQuotaCodeByStripeSession("cs_unbekannt")).toEqual({ revoked: false });
  });

  it("unterscheidet 'erstattet' von 'abgelaufen' — der Grund muss stimmen", async () => {
    const abgelaufen = await createCreditCode({
      creditsTotal: 3,
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(await consumeCredit(abgelaufen.code)).toEqual({ ok: false, reason: "expired" });

    const erstattet = await createCreditCode({ creditsTotal: 3, stripeSessionId: "cs_q4" });
    await revokeQuotaCodeByStripeSession("cs_q4");
    expect(await consumeCredit(erstattet.code)).toEqual({ ok: false, reason: "revoked" });
  });
});
