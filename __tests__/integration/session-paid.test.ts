/**
 * tryMarkSessionPaid() gegen eine ECHTE Datenbank.
 *
 * Das ist die Funktion, die "Geld ist da" in "Zugriff freigeschaltet" uebersetzt.
 * Sie lief bisher in keinem Test real — in jedem aufrufenden Test war sie gemockt,
 * geprueft wurde nur die HTTP-Verzweigung, nicht die Wirkung. Ein Fehler in der
 * Idempotenz oder im Race kostet hier direkt Geld: doppelte Freischaltung,
 * verlorener Zahlungsstatus, oder ein Kunde, der zahlt und nichts bekommt.
 */
import { query } from "@/lib/db";
import {
  createWizardSession,
  getWizardSession,
  getSessionByPaidToken,
  tryMarkSessionPaid,
} from "@/lib/wizard/session";
import { listSessionsByEmail, normalizeEmail } from "@/lib/wizard/identity";

async function newSession() {
  return createWizardSession("digitalpakt", "DigitalPakt Schule", "127.0.0.1");
}

/** Rohzeile lesen — damit wir pruefen, was WIRKLICH in der DB steht. */
async function row(sessionToken: string) {
  const res = await query<{
    status: string;
    paid_token: string | null;
    paid_at: Date | null;
    stripe_session_id: string | null;
    stripe_customer_email: string | null;
    author_email: string | null;
    tier: string | null;
    entitlement_source: string | null;
    credit_code: string | null;
  }>(`SELECT * FROM ki_antraege WHERE session_token = $1`, [sessionToken]);
  return res.rows[0];
}

describe("tryMarkSessionPaid — Erstfreischaltung", () => {
  it("setzt status=paid, vergibt einen paid_token und meldet didSet=true", async () => {
    const s = await newSession();
    expect(s.status).toBe("in_progress");

    const { session, didSet } = await tryMarkSessionPaid(s.sessionToken, {
      source: "card",
      tier: "einzelantrag",
      stripeSessionId: "cs_test_123",
      stripeCustomerEmail: "lehrerin@schule.de",
    });

    expect(didSet).toBe(true);
    expect(session.status).toBe("paid");
    expect(session.paidToken).toBeTruthy();

    const r = await row(s.sessionToken);
    expect(r.status).toBe("paid");
    expect(r.paid_token).toBe(session.paidToken);
    expect(r.paid_at).toBeInstanceOf(Date);
    expect(r.stripe_session_id).toBe("cs_test_123");
    expect(r.stripe_customer_email).toBe("lehrerin@schule.de");
    expect(r.tier).toBe("einzelantrag");
    expect(r.entitlement_source).toBe("card");
  });

  it("macht den Antrag ueber den paid_token abrufbar (das ist der Download-Zugriff)", async () => {
    const s = await newSession();
    const { session } = await tryMarkSessionPaid(s.sessionToken, { source: "card" });

    const found = await getSessionByPaidToken(session.paidToken!);
    expect(found?.sessionToken).toBe(s.sessionToken);
  });

  it("schreibt bei Quelle 'code' den eingeloesten Kontingent-Code in die Zeile", async () => {
    const s = await newSession();
    await tryMarkSessionPaid(s.sessionToken, { source: "code", creditCode: "EDU-ABCD-2345" });

    const r = await row(s.sessionToken);
    expect(r.entitlement_source).toBe("code");
    expect(r.credit_code).toBe("EDU-ABCD-2345");
  });

  it("wirft, wenn die Session gar nicht existiert (kein stilles Durchwinken)", async () => {
    await expect(
      tryMarkSessionPaid("00000000-0000-0000-0000-000000000000", { source: "card" })
    ).rejects.toThrow(/nicht gefunden/);
  });
});

describe("tryMarkSessionPaid — Idempotenz", () => {
  it("vergibt beim zweiten Aufruf KEINEN neuen Token und meldet didSet=false", async () => {
    const s = await newSession();

    const first = await tryMarkSessionPaid(s.sessionToken, {
      source: "card",
      stripeSessionId: "cs_test_1",
    });
    const second = await tryMarkSessionPaid(s.sessionToken, {
      source: "card",
      stripeSessionId: "cs_test_1",
    });

    expect(first.didSet).toBe(true);
    expect(second.didSet).toBe(false);
    // Der Token darf sich NICHT aendern — sonst wird eine bereits ausgelieferte
    // Download-URL beim Webhook-Retry ungueltig.
    expect(second.session.paidToken).toBe(first.session.paidToken);

    const r = await row(s.sessionToken);
    expect(r.paid_token).toBe(first.session.paidToken);
  });

  it("ueberschreibt die erste Zahlungsquelle nicht (paid_at bleibt der Erstzeitpunkt)", async () => {
    const s = await newSession();
    const first = await tryMarkSessionPaid(s.sessionToken, {
      source: "code",
      creditCode: "EDU-AAAA-2345",
    });
    const before = await row(s.sessionToken);

    // Zweite, andersartige Zustellung fuer dieselbe Session.
    await tryMarkSessionPaid(s.sessionToken, { source: "card", stripeSessionId: "cs_spaet" });

    const after = await row(s.sessionToken);
    expect(after.paid_token).toBe(first.session.paidToken);
    expect(after.entitlement_source).toBe("code");
    expect(after.credit_code).toBe("EDU-AAAA-2345");
    expect(after.paid_at?.getTime()).toBe(before.paid_at?.getTime());
    expect(after.stripe_session_id).toBeNull();
  });
});

describe("tryMarkSessionPaid — Race (Webhook und Reconcile treffen gleichzeitig ein)", () => {
  it("laesst bei zwei parallelen Aufrufen genau EINEN freischalten — beide sehen denselben Token", async () => {
    const s = await newSession();

    const [a, b] = await Promise.all([
      tryMarkSessionPaid(s.sessionToken, { source: "card", stripeSessionId: "cs_webhook" }),
      tryMarkSessionPaid(s.sessionToken, { source: "card", stripeSessionId: "cs_reconcile" }),
    ]);

    // Genau einer hat freigeschaltet.
    expect([a.didSet, b.didSet].filter(Boolean)).toHaveLength(1);
    // Beide Aufrufer bekommen denselben Token zu sehen — egal wer gewonnen hat.
    expect(a.session.paidToken).toBe(b.session.paidToken);
    expect(a.session.paidToken).toBeTruthy();

    // Und in der DB steht genau ein Token.
    const r = await row(s.sessionToken);
    expect(r.paid_token).toBe(a.session.paidToken);
  });

  it("haelt auch 10 gleichzeitigen Zustellungen stand (nur eine Freischaltung)", async () => {
    const s = await newSession();

    const results = await Promise.all(
      Array.from({ length: 10 }, () => tryMarkSessionPaid(s.sessionToken, { source: "card" }))
    );

    expect(results.filter((r) => r.didSet)).toHaveLength(1);
    const tokens = new Set(results.map((r) => r.session.paidToken));
    expect(tokens.size).toBe(1);
  });
});

describe("tryMarkSessionPaid — Bindung an die Kaeufer-E-Mail", () => {
  it("bindet den Antrag an die Stripe-E-Mail, sodass er unter 'Meine Antraege' auftaucht", async () => {
    const s = await newSession();
    // Stripe liefert die Adresse so, wie der Kunde sie getippt hat.
    await tryMarkSessionPaid(s.sessionToken, {
      source: "card",
      stripeCustomerEmail: "  Lehrerin@Schule.DE  ",
    });

    const r = await row(s.sessionToken);
    expect(r.author_email).toBe("lehrerin@schule.de");

    // Die Behauptung aus dem Code-Kommentar: listSessionsByEmail() matcht exakt.
    const mine = await listSessionsByEmail(normalizeEmail("Lehrerin@Schule.DE"));
    expect(mine.map((m) => m.sessionToken)).toContain(s.sessionToken);
  });

  it("ueberschreibt eine zuvor per Magic-Link gesetzte author_email NICHT", async () => {
    const s = await newSession();
    await query(`UPDATE ki_antraege SET author_email = $1 WHERE session_token = $2`, [
      "eigentuemerin@schule.de",
      s.sessionToken,
    ]);

    // Bezahlt wird mit einer anderen Adresse (z. B. Sekretariat).
    await tryMarkSessionPaid(s.sessionToken, {
      source: "card",
      stripeCustomerEmail: "sekretariat@schule.de",
    });

    const r = await row(s.sessionToken);
    expect(r.author_email).toBe("eigentuemerin@schule.de");
    expect(r.stripe_customer_email).toBe("sekretariat@schule.de");
  });
});

describe("getWizardSession", () => {
  it("liefert null fuer eine unbekannte Session (statt zu werfen)", async () => {
    expect(await getWizardSession("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
