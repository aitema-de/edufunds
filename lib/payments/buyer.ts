/**
 * Käufer-Dashboard (B5): Übersicht über gekaufte Kontingente je purchaser_email.
 *
 * Ein Org-Käufer (Schule/Träger) meldet sich über dieselbe passwortlose
 * Identität wie der Autor an (B4, Magic-Link → Identity-Cookie). Das Dashboard
 * zeigt seine Kontingent-Codes mit Verbrauch und Einlösungs-Historie.
 */
import { query } from "@/lib/db";

export interface BuyerRedemption {
  redeemedAt: string;
  note: string | null;
}

export interface BuyerCode {
  code: string;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  source: string;
  orgName: string | null;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
  redemptions: BuyerRedemption[];
}

/**
 * Liefert alle an eine E-Mail (als Käufer) gebundenen Kontingent-Codes inkl.
 * Einlösungs-Historie. Neueste zuerst.
 */
export async function listBuyerCodes(email: string): Promise<BuyerCode[]> {
  const norm = email.trim().toLowerCase();
  const codes = await query<{
    code: string;
    credits_total: number;
    credits_used: number;
    source: string;
    org_name: string | null;
    created_at: Date;
    expires_at: Date | null;
  }>(
    `SELECT code, credits_total, credits_used, source, org_name, created_at, expires_at
       FROM credit_codes
      WHERE lower(purchaser_email) = $1
      ORDER BY created_at DESC`,
    [norm]
  );
  if (codes.rowCount === 0) return [];

  const codeList = codes.rows.map((r) => r.code);
  const reds = await query<{ code: string; redeemed_at: Date; redeemer_note: string | null }>(
    `SELECT code, redeemed_at, redeemer_note
       FROM credit_code_redemptions
      WHERE code = ANY($1::text[])
      ORDER BY redeemed_at DESC`,
    [codeList]
  );

  const byCode = new Map<string, BuyerRedemption[]>();
  for (const r of reds.rows) {
    const list = byCode.get(r.code) ?? [];
    list.push({ redeemedAt: r.redeemed_at.toISOString(), note: r.redeemer_note });
    byCode.set(r.code, list);
  }

  const now = Date.now();
  return codes.rows.map((r) => ({
    code: r.code,
    creditsTotal: r.credits_total,
    creditsUsed: r.credits_used,
    creditsRemaining: Math.max(r.credits_total - r.credits_used, 0),
    source: r.source,
    orgName: r.org_name,
    createdAt: r.created_at.toISOString(),
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    expired: r.expires_at ? r.expires_at.getTime() <= now : false,
    redemptions: byCode.get(r.code) ?? [],
  }));
}
