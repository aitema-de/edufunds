/**
 * Jest-globalSetup fuer Integrationstests: startet ein echtes PostgreSQL.
 *
 * Warum embedded-postgres und nicht Docker/testcontainers: Auf der WSL-Maschine
 * gibt es keinen Docker-Daemon. embedded-postgres laedt eine userspace-Binary
 * (PostgreSQL 18, linux-arm64) und startet sie ohne root — lokal und in CI.
 *
 * Das Schema wird aus denselben Dateien aufgebaut, die auch Produktion herstellt:
 *   scripts/init-db.sql  (faktisch Migration 001 — legt ki_antraege ueberhaupt erst an)
 *   db/migrations/0*.sql (in numerischer Reihenfolge)
 * Damit testen wir gegen das Schema, das wirklich ausgerollt ist — nicht gegen
 * eine handgepflegte Kopie, die davon wegdriften kann.
 */
import EmbeddedPostgres from "embedded-postgres";
import { createServer } from "node:net";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TEST_DB = "edufunds_test";
const ROOT = resolve(__dirname, "..", "..");

/** Freien Port vom Kernel geben lassen (kein Raten, keine Kollision mit 5432/5433). */
function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => res(port));
    });
  });
}

/** init-db.sql + alle db/migrations/*.sql in numerischer Reihenfolge. */
function schemaFiles(): string[] {
  const migrations = readdirSync(join(ROOT, "db", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort() // 002_… 003_… — zweistellig-praefixiert, lexikografisch == numerisch
    .map((f) => join(ROOT, "db", "migrations", f));
  return [join(ROOT, "scripts", "init-db.sql"), ...migrations];
}

export default async function globalSetup(): Promise<void> {
  const databaseDir = mkdtempSync(join(tmpdir(), "edufunds-testpg-"));
  const port = await freePort();

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false, // Datenverzeichnis wird beim stop() geloescht
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(TEST_DB);

  const client = pg.getPgClient(TEST_DB);
  await client.connect();
  try {
    for (const file of schemaFiles()) {
      await client.query(readFileSync(file, "utf8"));
    }
  } finally {
    await client.end();
  }

  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/${TEST_DB}`;

  // Beide Variablen: DATABASE_URL wird von lib/db.ts gelesen, EDUFUNDS_TEST_DB_URL
  // ist die Referenz, gegen die der Guard in setup-each.ts prueft. Weichen sie ab,
  // hat etwas (z. B. ein .env-Loader) DATABASE_URL umgebogen — dann brechen die
  // Tests ab, statt gegen eine fremde Datenbank zu laufen.
  process.env.DATABASE_URL = url;
  process.env.EDUFUNDS_TEST_DB_URL = url;

  const g = globalThis as Record<string, unknown>;
  g.__EDUFUNDS_PG__ = pg;

  console.log(`\n[test-db] PostgreSQL auf 127.0.0.1:${port}/${TEST_DB} (${schemaFiles().length} SQL-Dateien)`);
}
