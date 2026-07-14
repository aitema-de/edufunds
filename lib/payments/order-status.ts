/**
 * Lebenszyklus einer Rechnungsbestellung: bezahlt / storniert.
 *
 * Ohne diese Schicht blieb `org_orders.status` fuer immer 'payment_pending' —
 * niemand konnte eine Zahlung verbuchen. Das machte nicht nur den Zahlungs-
 * abgleich unmoeglich, sondern brach die Bremse gegen unbezahlte Sofort-
 * Freischaltungen: `countOpenInvoiceOrders` zaehlt offene Bestellungen, und die
 * wurden nie weniger. Wer zweimal bestellte und bezahlte, kam nie wieder durch.
 *
 * Die Wirkung liegt bewusst in lib/ (nicht in der Admin-Route), damit sie gegen
 * eine echte Datenbank testbar ist.
 */
import { query } from "@/lib/db";
import { revokeSessionAccess } from "@/lib/payments/refund";
import { istInstitutionell } from "@/lib/payments/invoice-eligibility";

export type OrderStatus = "payment_pending" | "paid" | "cancelled";

export interface OrderSummary {
  id: number;
  orderNumber: string;
  packId: string;
  credits: number;
  amountCents: number;
  orgName: string;
  contactName: string;
  email: string;
  creditCode: string | null;
  sessionToken: string | null;
  status: OrderStatus;
  dueDate: string | null;
  /** true, wenn der Kontingent-Code gesperrt ist (Mahnstufe oder Storno). */
  creditsGesperrt: boolean;
  /**
   * Sieht die Bestell-Adresse nach Schule/Traeger/Behoerde aus? Nur ein SIGNAL —
   * Freemail ist bereits an der Route abgewiesen, aber viele echte Traeger haben
   * unauffaellige Domains. "false" heisst also nicht "verdaechtig", sondern
   * "unauffaellig, lohnt einen Blick".
   */
  institutionell: boolean;
  /** Bereits eingelöste Anträge des Kontingents (null beim Einzelantrag). */
  genutzteCredits: number | null;
  /** Reduzierte Forderung nach anteiliger Abrechnung (null = noch nicht abgerechnet). */
  settledAmountCents: number | null;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  /** Tage über dem Zahlungsziel (negativ = noch nicht fällig). Nur für offene Bestellungen sinnvoll. */
  tageUeberfaellig: number | null;
}

interface OrderRow {
  id: number;
  order_number: string;
  pack_id: string;
  credits: number;
  amount_cents: number;
  org_name: string;
  contact_name: string;
  email: string;
  credit_code: string | null;
  session_token: string | null;
  status: OrderStatus;
  due_date: Date | null;
  created_at: Date;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  code_revoked_at: Date | null;
  code_credits_used: number | null;
  settled_at: Date | null;
  settled_amount_cents: number | null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rowToSummary(r: OrderRow, now: Date): OrderSummary {
  let tageUeberfaellig: number | null = null;
  if (r.due_date) {
    const diffMs = now.getTime() - r.due_date.getTime();
    tageUeberfaellig = Math.floor(diffMs / 86_400_000);
  }
  return {
    id: r.id,
    orderNumber: r.order_number,
    packId: r.pack_id,
    credits: r.credits,
    amountCents: r.amount_cents,
    orgName: r.org_name,
    contactName: r.contact_name,
    email: r.email,
    creditCode: r.credit_code,
    sessionToken: r.session_token,
    status: r.status,
    dueDate: r.due_date ? ymd(r.due_date) : null,
    creditsGesperrt: r.code_revoked_at !== null,
    institutionell: istInstitutionell(r.email),
    genutzteCredits: r.code_credits_used,
    settledAmountCents: r.settled_amount_cents,
    createdAt: r.created_at.toISOString(),
    paidAt: r.paid_at?.toISOString(),
    cancelledAt: r.cancelled_at?.toISOString(),
    cancelReason: r.cancel_reason ?? undefined,
    tageUeberfaellig,
  };
}

const SELECT_ORDERS = `
  SELECT o.*,
         c.revoked_at   AS code_revoked_at,
         c.credits_used AS code_credits_used
    FROM org_orders o
    LEFT JOIN credit_codes c ON c.code = o.credit_code
`;

export async function listOrders(
  filter: { status?: OrderStatus } = {},
  now: Date = new Date()
): Promise<OrderSummary[]> {
  const res = filter.status
    ? await query<OrderRow>(`${SELECT_ORDERS} WHERE o.status = $1 ORDER BY o.created_at DESC`, [filter.status])
    : await query<OrderRow>(`${SELECT_ORDERS} ORDER BY o.created_at DESC`);
  return res.rows.map((r) => rowToSummary(r, now));
}

export async function getOrder(orderNumber: string, now: Date = new Date()): Promise<OrderSummary | null> {
  const res = await query<OrderRow>(`${SELECT_ORDERS} WHERE o.order_number = $1`, [orderNumber]);
  return res.rows[0] ? rowToSummary(res.rows[0], now) : null;
}

export interface OrderActionResult {
  /** true, wenn DIESER Aufruf den Status geaendert hat (idempotent). */
  changed: boolean;
  order: OrderSummary | null;
}

/**
 * Verbucht den Zahlungseingang.
 *
 * Hebt eine zuvor verhaengte Credit-Sperre wieder auf: Wer nach der Mahnung
 * zahlt, bekommt sein Kontingent zurueck. Sonst haetten wir das Geld UND die
 * Leistung einbehalten.
 */
export async function markOrderPaid(orderNumber: string): Promise<OrderActionResult> {
  const res = await query<{ credit_code: string | null; settled_at: Date | null }>(
    `UPDATE org_orders
        SET status     = 'paid',
            paid_at    = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE order_number = $1
        AND status = 'payment_pending'
      RETURNING credit_code, settled_at`,
    [orderNumber]
  );

  if (res.rowCount === 1) {
    const { credit_code, settled_at } = res.rows[0];
    // Sperre nur aufheben, wenn NICHT anteilig abgerechnet wurde.
    //
    // Nach der Mahnung sind die Credits nur GESPERRT — wer zahlt, bekommt sie
    // zurueck. Nach anteiliger Abrechnung sind sie ABGESCHRIEBEN: der Kunde zahlt
    // nur noch die genutzten Antraege (Rest als Gutschrift). Wuerden wir hier
    // trotzdem entsperren, bekaeme er die verfallenen Credits fuer die reduzierte
    // Forderung zurueck — also 17 Antraege fuer 29,90 EUR.
    if (credit_code && settled_at === null) {
      await query(
        `UPDATE credit_codes
            SET revoked_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE code = $1 AND revoked_at IS NOT NULL`,
        [credit_code]
      );
    }
    return { changed: true, order: await getOrder(orderNumber) };
  }
  return { changed: false, order: await getOrder(orderNumber) };
}

/**
 * Sperrt die noch offenen Credits einer ueberfaelligen Bestellung (Mahnstufe).
 *
 * Die Forderung bleibt bestehen — der Status bleibt 'payment_pending'. Gesperrt
 * wird nur, was noch NICHT eingeloest ist: bereits erstellte Antraege sind
 * erbrachte Leistung und werden nicht zurueckgenommen (sie sind ohnehin laengst
 * exportiert). Bei Zahlung hebt markOrderPaid() die Sperre wieder auf.
 */
export async function suspendOrderCredits(orderNumber: string): Promise<{ suspended: boolean; code?: string }> {
  const res = await query<{ code: string }>(
    `UPDATE credit_codes
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE code = (SELECT credit_code FROM org_orders
                     WHERE order_number = $1 AND status = 'payment_pending')
        AND revoked_at IS NULL
      RETURNING code`,
    [orderNumber]
  );
  return res.rowCount === 1 ? { suspended: true, code: res.rows[0].code } : { suspended: false };
}

/**
 * Storniert eine Bestellung: die Forderung faellt weg, die Leistung ebenfalls.
 *
 * Anders als die Mahnstufe (suspendOrderCredits) entzieht das Storno auch den
 * Zugriff auf einen per Rechnung freigeschalteten EINZELantrag — dort ist die
 * Bestellung 1:1 der Antrag; wer nicht zahlt und storniert wird, behaelt ihn nicht.
 * Bereits EINGELOESTE Credits eines Kontingents bleiben dagegen gueltig: sie sind
 * geliefert, und wir wollen das Geld, nicht die Leistung zurueck.
 */
export async function cancelOrder(orderNumber: string, reason: string): Promise<OrderActionResult> {
  const res = await query<{ credit_code: string | null; session_token: string | null }>(
    `UPDATE org_orders
        SET status        = 'cancelled',
            cancelled_at  = CURRENT_TIMESTAMP,
            cancel_reason = $2,
            updated_at    = CURRENT_TIMESTAMP
      WHERE order_number = $1
        AND status <> 'cancelled'
      RETURNING credit_code, session_token`,
    [orderNumber, reason]
  );

  if (res.rowCount !== 1) {
    return { changed: false, order: await getOrder(orderNumber) };
  }

  const { credit_code, session_token } = res.rows[0];
  if (credit_code) {
    await query(
      `UPDATE credit_codes
          SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE code = $1 AND revoked_at IS NULL`,
      [credit_code]
    );
  }
  if (session_token) {
    await revokeSessionAccess(session_token);
  }

  return { changed: true, order: await getOrder(orderNumber) };
}
