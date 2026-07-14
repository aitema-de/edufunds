/**
 * Rückerstattung → Zugriff entwerten (PAY-03).
 *
 * Ohne diese Schicht laufen Zahlungsstatus und Zugriffsrecht dauerhaft
 * auseinander: Der Kunde bekommt sein Geld zurueck und behaelt den Antrag.
 *
 * Die DB-Wirkung liegt bewusst hier und nicht in der Webhook-Route — nur so
 * laesst sie sich gegen eine echte Datenbank testen (die Route braucht eine
 * gueltige Stripe-Signatur).
 */
import { query } from "@/lib/db";

export interface RevokeSessionResult {
  /** true, wenn DIESER Aufruf entwertet hat. false = war schon entwertet / nie bezahlt. */
  revoked: boolean;
  /** Der entwertete Token (auch beim zweiten Aufruf, fuer Logging). */
  revokedToken?: string;
}

/**
 * Entwertet den Zugriff auf einen bezahlten Antrag.
 *
 * paid_token wird auf NULL gesetzt — das ist der Punkt. Der Token oeffnet DREI
 * Tueren (Download-Seite, finanzplan/autofix, finanzplan/legitimize); alle drei
 * pruefen auf seine Existenz. Nur "status=refunded" zu setzen (wie das alte TODO
 * nahelegte) haette die beiden Finanzplan-Tueren offen gelassen.
 *
 * Idempotent: der Guard `paid_token IS NOT NULL` sorgt dafuer, dass eine zweite
 * Zustellung desselben Stripe-Events nichts mehr aendert.
 */
export async function revokeSessionAccess(
  sessionToken: string
): Promise<RevokeSessionResult> {
  const res = await query<{ refunded_token: string }>(
    `UPDATE ki_antraege
        SET status         = 'refunded',
            refunded_token = paid_token,
            paid_token     = NULL,
            refunded_at    = CURRENT_TIMESTAMP,
            updated_at     = CURRENT_TIMESTAMP
      WHERE session_token = $1
        AND paid_token IS NOT NULL
      RETURNING refunded_token`,
    [sessionToken]
  );

  if (res.rowCount === 1) {
    return { revoked: true, revokedToken: res.rows[0].refunded_token };
  }

  // Nichts geaendert: bereits entwertet (dann kennen wir den alten Token noch)
  // oder die Session war nie bezahlt / existiert nicht.
  const existing = await query<{ refunded_token: string | null }>(
    `SELECT refunded_token FROM ki_antraege WHERE session_token = $1`,
    [sessionToken]
  );
  return {
    revoked: false,
    revokedToken: existing.rows[0]?.refunded_token ?? undefined,
  };
}

export interface RevokeQuotaResult {
  revoked: boolean;
  code?: string;
  /** Credits, die durch die Entwertung verfallen (bereits eingeloeste bleiben gueltig). */
  creditsVerfallen?: number;
}

/**
 * Entwertet ein per Karte gekauftes Kontingent nach Rueckerstattung.
 *
 * Ohne das behaelt eine Schule nach der Erstattung von bis zu 459,90 EUR ihre
 * 20 Antraege. Bereits eingeloeste Credits bleiben protokolliert (credits_used
 * unangetastet) — entwertet wird nur das, was noch offen ist.
 */
export async function revokeQuotaCodeByStripeSession(
  stripeSessionId: string
): Promise<RevokeQuotaResult> {
  const res = await query<{ code: string; credits_total: number; credits_used: number }>(
    `UPDATE credit_codes
        SET revoked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE stripe_session_id = $1
        AND revoked_at IS NULL
      RETURNING code, credits_total, credits_used`,
    [stripeSessionId]
  );

  if (res.rowCount !== 1) return { revoked: false };
  const r = res.rows[0];
  return {
    revoked: true,
    code: r.code,
    creditsVerfallen: r.credits_total - r.credits_used,
  };
}
