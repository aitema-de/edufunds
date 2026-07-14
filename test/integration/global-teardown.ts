/**
 * Faehrt das in global-setup.ts gestartete PostgreSQL herunter.
 * persistent:false => stop() loescht auch das temporaere Datenverzeichnis.
 */
import type EmbeddedPostgres from "embedded-postgres";

export default async function globalTeardown(): Promise<void> {
  const g = globalThis as Record<string, unknown>;
  const pg = g.__EDUFUNDS_PG__ as EmbeddedPostgres | undefined;
  if (pg) await pg.stop();
}
