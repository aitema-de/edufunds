/**
 * Admin: Rechnungsbestellungen einsehen und den Zahlungseingang verbuchen.
 *
 * Ohne diesen Endpunkt gab es keinen Weg, eine Bestellung je auf 'paid' zu
 * setzen — mit der Folge, dass die Bremse gegen unbezahlte Sofort-Freischaltungen
 * (max. 2 offene Rechnungen pro E-Mail) den zahlenden Stammkunden aussperrte.
 *
 *   GET  /api/admin/orders            → alle Bestellungen
 *   GET  /api/admin/orders?status=…   → gefiltert
 *   POST /api/admin/orders            → { orderNumber, action: "paid"|"cancel", reason? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listOrders, markOrderPaid, cancelOrder, type OrderStatus } from "@/lib/payments/order-status";
import { settleProRata } from "@/lib/payments/settlement";

// MUSS dynamic sein: 'force-static' wuerde die Antwort zur Build-Zeit einfrieren
// und den Auth-Check wirkungslos machen (kein Request-Kontext).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS: OrderStatus[] = ["payment_pending", "paid", "cancelled"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.response;

  const raw = new URL(req.url).searchParams.get("status");
  const status = raw && (STATUS as string[]).includes(raw) ? (raw as OrderStatus) : undefined;

  const orders = await listOrders(status ? { status } : {});
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const orderNumber = typeof obj.orderNumber === "string" ? obj.orderNumber : null;
  const action = obj.action;
  if (!orderNumber || (action !== "paid" && action !== "cancel" && action !== "settle")) {
    return NextResponse.json(
      { error: "orderNumber und action ('paid' | 'cancel' | 'settle') erforderlich" },
      { status: 400 }
    );
  }

  if (action === "paid") {
    const res = await markOrderPaid(orderNumber);
    if (!res.order) return NextResponse.json({ error: "Bestellung unbekannt" }, { status: 404 });
    console.log(
      `[admin/orders] ${auth.admin.email ?? "admin"} verbucht Zahlung fuer ${orderNumber} ` +
        `(changed=${res.changed})`
    );
    return NextResponse.json({ ok: true, changed: res.changed, order: res.order });
  }

  if (action === "settle") {
    // Anteilige Abrechnung: offene Credits verfallen, gefordert werden nur die
    // genutzten Antraege zum Einzelpreis (ohne Mengenrabatt).
    const res = await settleProRata(orderNumber);
    if (!res.order) return NextResponse.json({ error: "Bestellung unbekannt" }, { status: 404 });
    console.log(
      `[admin/orders] ${auth.admin.email ?? "admin"} rechnet ${orderNumber} anteilig ab ` +
        `(changed=${res.changed}, genutzt=${res.proRata?.genutzt ?? "?"}, ` +
        `Forderung=${res.proRata?.forderungCents ?? "?"} Cent)`
    );
    return NextResponse.json({
      ok: true,
      changed: res.changed,
      order: res.order,
      proRata: res.proRata,
      storniertWeilNichtsGenutzt: res.storniertWeilNichtsGenutzt ?? false,
    });
  }

  const reason = typeof obj.reason === "string" && obj.reason.trim() ? obj.reason.trim() : "Storno durch Admin";
  const res = await cancelOrder(orderNumber, reason);
  if (!res.order) return NextResponse.json({ error: "Bestellung unbekannt" }, { status: 404 });
  console.log(
    `[admin/orders] ${auth.admin.email ?? "admin"} storniert ${orderNumber} (changed=${res.changed}): ${reason}`
  );
  return NextResponse.json({ ok: true, changed: res.changed, order: res.order });
}
