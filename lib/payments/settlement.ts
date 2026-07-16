/**
 * Anteilige Abrechnung bei Teilverbrauch.
 *
 * Ein Träger bestellt ein 20er-Paket (459,90 EUR), löst 3 Anträge ein und zahlt
 * nicht. Statt die volle Paketsumme einzufordern, rechnen wir ab, was genutzt
 * wurde — zum EINZELPREIS, ohne Mengenrabatt. Die offenen Credits verfallen.
 *
 * Warum das die bessere Forderung ist: 89,70 EUR gegen eine Schule, die drei
 * Anträge erhalten hat, sind unstrittig und werden gezahlt. 459,90 EUR gegen
 * dieselbe Schule sind ein Streitfall. Der verlorene Mengenrabatt ist zugleich
 * der Anreiz, doch noch regulär zu zahlen.
 *
 * Zwei Grenzen, die der Code garantiert:
 *   - Nie MEHR als der ursprüngliche Bestellbetrag (bei vollem Verbrauch läge der
 *     Einzelpreis darüber — der Kunde soll für den Rabatt nicht bestraft werden,
 *     nur weil er alles genutzt hat).
 *   - Nichts genutzt => keine Forderung. Dann ist es kein Abrechnungsfall,
 *     sondern ein Storno.
 */
import { query } from "@/lib/db";
import { EINZELPREIS_CENTS } from "@/lib/payments/packs";
import { cancelOrder, getOrder, type OrderActionResult } from "@/lib/payments/order-status";

export interface ProRata {
  /** Eingelöste Anträge (bereits geliefert). */
  genutzt: number;
  /** Credits, die durch die Abrechnung verfallen. */
  verfallen: number;
  /** Ursprünglicher Bestellbetrag. */
  bestelltCents: number;
  /** Was tatsächlich zu zahlen ist: genutzt × Einzelpreis, gedeckelt auf den Bestellbetrag. */
  forderungCents: number;
  /** Differenz zum Bestellbetrag (Gutschrift). */
  gutschriftCents: number;
}

/**
 * Rechnet die anteilige Forderung aus — reine Rechnung, ohne Seiteneffekt.
 * Damit kann die Admin-Ansicht den Betrag ANZEIGEN, bevor jemand darauf klickt.
 */
export function berechneProRata(args: {
  bestelltCents: number;
  creditsTotal: number;
  creditsUsed: number;
}): ProRata {
  const genutzt = Math.max(0, args.creditsUsed);
  const verfallen = Math.max(0, args.creditsTotal - genutzt);

  // Gedeckelt: nie mehr fordern als ursprünglich bestellt.
  const forderungCents = Math.min(genutzt * EINZELPREIS_CENTS, args.bestelltCents);

  return {
    genutzt,
    verfallen,
    bestelltCents: args.bestelltCents,
    forderungCents,
    gutschriftCents: args.bestelltCents - forderungCents,
  };
}

export interface SettleResult extends OrderActionResult {
  proRata?: ProRata;
  /** true, wenn nichts genutzt wurde und die Bestellung deshalb storniert wurde. */
  storniertWeilNichtsGenutzt?: boolean;
}

/**
 * Rechnet eine offene Kontingent-Bestellung anteilig ab:
 * offene Credits entwerten, Forderung auf die genutzten Anträge reduzieren.
 *
 * Die Bestellung bleibt 'payment_pending' — die (reduzierte) Forderung besteht ja
 * weiter. Wurde NICHTS genutzt, gibt es nichts abzurechnen: dann ist es ein Storno.
 */
export async function settleProRata(orderNumber: string): Promise<SettleResult> {
  const res = await query<{
    amount_cents: number;
    credit_code: string | null;
    credits_total: number | null;
    credits_used: number | null;
  }>(
    `SELECT o.amount_cents, o.credit_code, c.credits_total, c.credits_used
       FROM org_orders o
       LEFT JOIN credit_codes c ON c.code = o.credit_code
      WHERE o.order_number = $1
        AND o.status = 'payment_pending'
        AND o.settled_at IS NULL`,
    [orderNumber]
  );

  if (res.rowCount !== 1) {
    // Unbekannt, bereits bezahlt/storniert oder schon abgerechnet — idempotent.
    return { changed: false, order: await getOrder(orderNumber) };
  }

  const row = res.rows[0];
  if (!row.credit_code || row.credits_total === null) {
    // Einzelantrag auf Rechnung: 1:1 die Leistung, es gibt nichts anteilig
    // aufzuteilen. Entweder er zahlt, oder es wird storniert.
    return { changed: false, order: await getOrder(orderNumber) };
  }

  const proRata = berechneProRata({
    bestelltCents: row.amount_cents,
    creditsTotal: row.credits_total,
    creditsUsed: row.credits_used ?? 0,
  });

  if (proRata.genutzt === 0) {
    // Nichts geliefert => nichts zu fordern. Das ist ein Storno, keine Abrechnung.
    const cancelled = await cancelOrder(
      orderNumber,
      "Anteilig abgerechnet: kein Antrag eingelöst — Forderung entfällt"
    );
    return { ...cancelled, proRata, storniertWeilNichtsGenutzt: true };
  }

  // Offene Credits entwerten + reduzierte Forderung festschreiben.
  await query(
    `UPDATE credit_codes
        SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE code = $1 AND revoked_at IS NULL`,
    [row.credit_code]
  );
  await query(
    `UPDATE org_orders
        SET settled_at           = CURRENT_TIMESTAMP,
            settled_amount_cents = $2,
            updated_at           = CURRENT_TIMESTAMP
      WHERE order_number = $1`,
    [orderNumber, proRata.forderungCents]
  );

  return { changed: true, order: await getOrder(orderNumber), proRata };
}
