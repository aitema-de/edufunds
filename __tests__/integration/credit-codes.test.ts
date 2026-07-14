/**
 * Kontingent-Codes gegen eine ECHTE Datenbank.
 *
 * Hier haengt Geld dran: Ein Code, der sich ueberziehen laesst, verschenkt
 * Antraege. Ein Code, der bei paralleler Einloesung mehr Credits vergibt, als
 * die Schule bezahlt hat, faellt erst in der Buchhaltung auf. Beides laesst
 * sich nur gegen eine echte DB pruefen — ein Mock haette immer recht.
 */
import { query } from "@/lib/db";
import {
  createCreditCode,
  consumeCredit,
  refundCredit,
  normalizeCode,
  generateCode,
} from "@/lib/wizard/credit-codes";

async function codeRow(code: string) {
  const res = await query<{ credits_total: number; credits_used: number; source: string; expires_at: Date | null }>(
    `SELECT credits_total, credits_used, source, expires_at FROM credit_codes WHERE code = $1`,
    [code]
  );
  return res.rows[0];
}

describe("createCreditCode", () => {
  it("legt einen Code mit Guthaben an", async () => {
    const c = await createCreditCode({
      creditsTotal: 5,
      orgName: "Gymnasium Musterstadt",
      purchaserEmail: "sekretariat@gym.de",
      source: "invoice",
    });

    expect(c.code).toMatch(/^EDU-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(c.creditsTotal).toBe(5);
    expect(c.creditsUsed).toBe(0);

    const r = await codeRow(c.code);
    expect(r.credits_total).toBe(5);
    expect(r.credits_used).toBe(0);
    expect(r.source).toBe("invoice");
  });

  it("vergibt eindeutige Codes", async () => {
    const codes = await Promise.all(
      Array.from({ length: 25 }, () => createCreditCode({ creditsTotal: 1 }))
    );
    expect(new Set(codes.map((c) => c.code)).size).toBe(25);
  });

  it("lehnt ein nicht-positives Kontingent ab", async () => {
    await expect(createCreditCode({ creditsTotal: 0 })).rejects.toThrow(/positive Ganzzahl/);
    await expect(createCreditCode({ creditsTotal: -3 })).rejects.toThrow(/positive Ganzzahl/);
  });

  it("erzeugt keine mehrdeutigen Zeichen (kein 0/O/1/I)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).not.toMatch(/[01OI]/);
    }
  });
});

describe("consumeCredit", () => {
  it("zaehlt das Guthaben runter und meldet den Rest", async () => {
    const c = await createCreditCode({ creditsTotal: 3 });

    expect(await consumeCredit(c.code)).toEqual({ ok: true, creditsRemaining: 2 });
    expect(await consumeCredit(c.code)).toEqual({ ok: true, creditsRemaining: 1 });
    expect(await consumeCredit(c.code)).toEqual({ ok: true, creditsRemaining: 0 });

    expect(await codeRow(c.code)).toMatchObject({ credits_used: 3 });
  });

  it("laesst einen Code NICHT ueberziehen", async () => {
    const c = await createCreditCode({ creditsTotal: 2 });
    await consumeCredit(c.code);
    await consumeCredit(c.code);

    expect(await consumeCredit(c.code)).toEqual({ ok: false, reason: "exhausted" });
    // Und die DB hat nicht heimlich hochgezaehlt.
    expect(await codeRow(c.code)).toMatchObject({ credits_used: 2 });
  });

  it("vergibt bei PARALLELER Einloesung nicht mehr Credits als vorhanden", async () => {
    const c = await createCreditCode({ creditsTotal: 3 });

    // 10 Lehrkraefte loesen gleichzeitig denselben Schul-Code ein.
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeCredit(c.code)));

    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok)).toHaveLength(7);
    // Die vergebenen Restguthaben sind genau 2,1,0 — kein Wert doppelt.
    const remaining = results.filter((r): r is { ok: true; creditsRemaining: number } => r.ok)
      .map((r) => r.creditsRemaining)
      .sort();
    expect(remaining).toEqual([0, 1, 2]);

    expect(await codeRow(c.code)).toMatchObject({ credits_used: 3 });
  });

  it("weist einen abgelaufenen Code zurueck", async () => {
    const c = await createCreditCode({
      creditsTotal: 5,
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });

    expect(await consumeCredit(c.code)).toEqual({ ok: false, reason: "expired" });
    expect(await codeRow(c.code)).toMatchObject({ credits_used: 0 });
  });

  it("weist einen unbekannten Code zurueck", async () => {
    expect(await consumeCredit("EDU-XXXX-XXXX")).toEqual({ ok: false, reason: "unknown" });
  });
});

describe("refundCredit", () => {
  it("gibt einen Credit zurueck, wenn die Freischaltung scheitert", async () => {
    const c = await createCreditCode({ creditsTotal: 2 });
    await consumeCredit(c.code);
    expect(await codeRow(c.code)).toMatchObject({ credits_used: 1 });

    await refundCredit(c.code);
    expect(await codeRow(c.code)).toMatchObject({ credits_used: 0 });
  });

  it("laeuft nicht ins Negative (doppelte Rueckgabe verschenkt kein Guthaben)", async () => {
    const c = await createCreditCode({ creditsTotal: 2 });
    await consumeCredit(c.code);

    await refundCredit(c.code);
    await refundCredit(c.code);

    expect(await codeRow(c.code)).toMatchObject({ credits_used: 0 });
  });
});

describe("normalizeCode", () => {
  it("macht Nutzereingaben robust (Kleinschreibung, Leerzeichen)", () => {
    expect(normalizeCode("  edu-abcd-2345 ")).toBe("EDU-ABCD-2345");
    expect(normalizeCode("edu abcd 2345")).toBe("EDUABCD2345");
  });
});

describe("DB-Constraint als letztes Netz", () => {
  it("verbietet credits_used > credits_total auch bei direktem UPDATE", async () => {
    const c = await createCreditCode({ creditsTotal: 1 });
    await expect(
      query(`UPDATE credit_codes SET credits_used = 5 WHERE code = $1`, [c.code])
    ).rejects.toThrow(/credit_codes_not_overspent/);
  });
});
