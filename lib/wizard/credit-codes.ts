/**
 * Kontingent-Codes (Entitlement-Quelle "code", Modell B1).
 *
 * Eine Organisation kauft N Credits; Lehrkraefte loesen beim Freischalten einen
 * Code ein. Die Einloesung dekrementiert das Guthaben ATOMAR (ein einziges
 * UPDATE mit Guard), damit ein Kontingent nicht ueberzogen werden kann — auch
 * nicht bei gleichzeitigen Einloesungen.
 *
 * Siehe .planning/payments/MONETIZATION-ARCHITECTURE.md.
 */
import { randomBytes } from "crypto";
import { query } from "@/lib/db";

export interface CreditCode {
  id: number;
  code: string;
  creditsTotal: number;
  creditsUsed: number;
  orgName?: string;
  purchaserEmail?: string;
  source: string;
  expiresAt?: string;
  createdAt: string;
}

export type ConsumeResult =
  | { ok: true; creditsRemaining: number }
  | { ok: false; reason: "unknown" | "exhausted" | "expired" };

/** Normalisiert Nutzereingaben: trimmt, Grossbuchstaben, entfernt Whitespace. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Verbraucht atomar einen Credit. Das WHERE garantiert, dass weder ueberzogen
 * (credits_used < credits_total) noch ein abgelaufener Code genutzt wird.
 * Bei Misserfolg wird per Folge-SELECT der Grund bestimmt (fuer gute Fehlermeldung).
 */
export async function consumeCredit(code: string): Promise<ConsumeResult> {
  const dec = await query<{ credits_total: number; credits_used: number }>(
    `UPDATE credit_codes
       SET credits_used = credits_used + 1,
           updated_at = CURRENT_TIMESTAMP
     WHERE code = $1
       AND credits_used < credits_total
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     RETURNING credits_total, credits_used`,
    [code]
  );
  if (dec.rowCount === 1) {
    const r = dec.rows[0];
    return { ok: true, creditsRemaining: r.credits_total - r.credits_used };
  }

  const info = await query<{
    credits_total: number;
    credits_used: number;
    expires_at: Date | null;
  }>(
    `SELECT credits_total, credits_used, expires_at FROM credit_codes WHERE code = $1`,
    [code]
  );
  if (info.rowCount === 0) return { ok: false, reason: "unknown" };
  const r = info.rows[0];
  if (r.expires_at && r.expires_at.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: false, reason: "exhausted" };
}

/** Gibt einen zuvor verbrauchten Credit zurueck (z. B. wenn die Session-Freischaltung scheitert). */
export async function refundCredit(code: string): Promise<void> {
  await query(
    `UPDATE credit_codes
       SET credits_used = GREATEST(credits_used - 1, 0),
           updated_at = CURRENT_TIMESTAMP
     WHERE code = $1`,
    [code]
  );
}

/** Protokolliert eine erfolgreiche Einloesung (Audit + spaetere Attribution). */
export async function logRedemption(
  code: string,
  sessionToken: string,
  paidToken: string,
  redeemerNote?: string
): Promise<void> {
  await query(
    `INSERT INTO credit_code_redemptions (code, session_token, paid_token, redeemer_note)
     VALUES ($1, $2, $3, $4)`,
    [code, sessionToken, paidToken, redeemerNote ?? null]
  );
}

// Codes ohne mehrdeutige Zeichen (kein 0/O/1/I), Format EDU-XXXX-XXXX.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genGroup(n: number): string {
  const bytes = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}
export function generateCode(): string {
  return `EDU-${genGroup(4)}-${genGroup(4)}`;
}

/** Erzeugt einen neuen Kontingent-Code (retry bei seltener Code-Kollision). */
export async function createCreditCode(params: {
  creditsTotal: number;
  orgName?: string;
  purchaserEmail?: string;
  source?: string;
  expiresAt?: string;
  note?: string;
  /** Optionale Kopplung an eine Stripe-Checkout-Session (B3, Idempotenz). */
  stripeSessionId?: string;
}): Promise<CreditCode> {
  if (!Number.isInteger(params.creditsTotal) || params.creditsTotal <= 0) {
    throw new Error("creditsTotal muss eine positive Ganzzahl sein");
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const res = await query<{
        id: number;
        code: string;
        credits_total: number;
        credits_used: number;
        org_name: string | null;
        purchaser_email: string | null;
        source: string;
        expires_at: Date | null;
        created_at: Date;
      }>(
        `INSERT INTO credit_codes
           (code, credits_total, org_name, purchaser_email, source, expires_at, note, stripe_session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, code, credits_total, credits_used, org_name, purchaser_email, source, expires_at, created_at`,
        [
          code,
          params.creditsTotal,
          params.orgName ?? null,
          params.purchaserEmail ?? null,
          params.source ?? "manual",
          params.expiresAt ?? null,
          params.note ?? null,
          params.stripeSessionId ?? null,
        ]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code,
        creditsTotal: row.credits_total,
        creditsUsed: row.credits_used,
        orgName: row.org_name ?? undefined,
        purchaserEmail: row.purchaser_email ?? undefined,
        source: row.source,
        expiresAt: row.expires_at?.toISOString(),
        createdAt: row.created_at.toISOString(),
      };
    } catch (e: unknown) {
      // 23505 = unique_violation. NUR bei Code-Kollision neuen Code versuchen.
      // Eine Kollision auf stripe_session_id (B3-Idempotenz) bedeutet: dieselbe
      // Stripe-Session wurde bereits verarbeitet — Retry mit neuem Code wuerde
      // den Konflikt nicht aufloesen, also durchreichen (Aufrufer behandelt ihn).
      const err = e as { code?: string; constraint?: string } | null;
      if (
        typeof e === "object" &&
        err?.code === "23505" &&
        err.constraint !== "uniq_credit_codes_stripe_session"
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Konnte keinen eindeutigen Code erzeugen");
}
