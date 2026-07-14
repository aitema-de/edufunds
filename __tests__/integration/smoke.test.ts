/**
 * Grundlage aller Integrationstests: Laeuft die Wegwerf-DB, und steht das Schema
 * so, wie es Produktion herstellt (init-db.sql + db/migrations/0*.sql)?
 *
 * Wenn dieser Test rot ist, sind alle anderen Integrationstests wertlos —
 * sie wuerden gegen ein Schema laufen, das es in Produktion nicht gibt.
 */
import { query } from "@/lib/db";

describe("Test-Datenbank", () => {
  it("ist erreichbar", async () => {
    const res = await query<{ ok: number }>("SELECT 1 AS ok");
    expect(res.rows[0].ok).toBe(1);
  });

  it("laeuft gegen die Wegwerf-DB, nicht gegen Dev/Prod", async () => {
    const res = await query<{ db: string }>("SELECT current_database() AS db");
    expect(res.rows[0].db).toBe("edufunds_test");
  });

  it("hat die Tabellen aus init-db.sql + allen Migrationen", async () => {
    const res = await query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const tables = res.rows.map((r) => r.tablename);

    // init-db.sql (faktisch Migration 001)
    expect(tables).toEqual(expect.arrayContaining(["ki_antraege", "newsletter_entries", "contact_requests"]));
    // 004 Kontingent-Codes, 005 Bestellungen, 011 Webhook-Idempotenz
    expect(tables).toEqual(
      expect.arrayContaining(["credit_codes", "credit_code_redemptions", "org_orders", "stripe_webhook_events"])
    );
  });

  it("hat die Paywall-Spalten aus Migration 003/004 auf ki_antraege", async () => {
    const res = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ki_antraege'`
    );
    const cols = res.rows.map((r) => r.column_name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "session_token",
        "paid_token",
        "paid_at",
        "stripe_session_id",
        "stripe_customer_email",
        "tier",
        "entitlement_source",
        "credit_code",
      ])
    );
  });
});
