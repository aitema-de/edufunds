/**
 * Pro Test-Datei: Sicherheits-Guard + Aufraeumen zwischen den Tests.
 *
 * ── Der Guard ──────────────────────────────────────────────────────────────
 * Diese Tests loeschen Tabellen (TRUNCATE). Die .env.local dieses Repos zeigt
 * per SSH-Tunnel auf die ECHTE Dev-Datenbank. Wuerde irgendein Env-Loader
 * DATABASE_URL dorthin umbiegen, wuerden die Tests die Dev-DB leerraeumen.
 * Deshalb: vor dem ersten Query wird verifiziert, dass DATABASE_URL exakt die
 * vom globalSetup gestartete Wegwerf-Instanz ist (localhost + edufunds_test).
 * Im Zweifel bricht die Suite ab, statt zu raten.
 *
 * ── Isolation ──────────────────────────────────────────────────────────────
 * Kein Transaction-Rollback pro Test, sondern TRUNCATE. Grund: lib/db.ts#query()
 * holt fuer JEDEN Aufruf einen eigenen Client aus dem Pool — eine Transaktion
 * liesse sich gar nicht durchreichen. Und die Race-Tests brauchen echte
 * parallele Verbindungen; eine gemeinsame Transaktion wuerde sie serialisieren
 * und genau die Eigenschaft verstecken, die sie pruefen sollen.
 */
import { query, closePool } from "@/lib/db";

function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  const expected = process.env.EDUFUNDS_TEST_DB_URL;

  if (!url || !expected) {
    throw new Error(
      "[test-db] DATABASE_URL/EDUFUNDS_TEST_DB_URL fehlen — globalSetup ist nicht gelaufen."
    );
  }
  if (url !== expected) {
    throw new Error(
      `[test-db] ABBRUCH: DATABASE_URL wurde umgebogen.\n` +
        `  erwartet: ${expected}\n  ist:      ${url}\n` +
        `  Diese Tests loeschen Tabellen — sie duerfen NUR gegen die Wegwerf-DB laufen.`
    );
  }

  const { hostname, pathname } = new URL(url);
  const isLocal = hostname === "127.0.0.1" || hostname === "localhost";
  const isTestDb = pathname === "/edufunds_test";
  if (!isLocal || !isTestDb) {
    throw new Error(
      `[test-db] ABBRUCH: DATABASE_URL zeigt nicht auf die lokale Wegwerf-DB (${url}).`
    );
  }
}

assertTestDatabase();

/** Alle Tabellen des public-Schemas leeren (robust gegen kuenftige Migrationen). */
export async function resetDb(): Promise<void> {
  const res = await query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (res.rows.length === 0) return;
  const tables = res.rows.map((r) => `"${r.tablename}"`).join(", ");
  await query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closePool();
});
