export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Code-Lookup nach Kartenzahlung (B3). Die Success-Seite pollt diesen Endpoint
 * mit der Stripe-Checkout-Session-ID, bis der Webhook den Kontingent-Code
 * erzeugt hat. Liefert nur Code + Anzahl Credits — keine sensiblen Daten.
 *
 * Antworten:
 *   { ready: false }                          — Zahlung/Webhook noch nicht verarbeitet
 *   { ready: true, creditCode, credits }      — Code steht bereit
 */
export async function GET(req: NextRequest) {
  const cs = req.nextUrl.searchParams.get("cs");
  if (!cs) {
    return NextResponse.json({ error: "cs erforderlich" }, { status: 400 });
  }

  const res = await query<{ code: string; credits_total: number }>(
    `SELECT code, credits_total FROM credit_codes WHERE stripe_session_id = $1 LIMIT 1`,
    [cs]
  );

  if (!res.rowCount) {
    return NextResponse.json({ ready: false });
  }
  return NextResponse.json({
    ready: true,
    creditCode: res.rows[0].code,
    credits: res.rows[0].credits_total,
  });
}
