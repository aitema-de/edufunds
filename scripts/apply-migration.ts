/**
 * Wendet eine einzelne SQL-Migration auf die per DATABASE_URL konfigurierte DB an.
 * Nutzung: npx tsx --env-file=.env.local scripts/apply-migration.ts db/migrations/00X_*.sql
 * Migrationen sind idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — mehrfaches
 * Anwenden ist gefahrlos.
 */
import { readFileSync } from "fs";
import { Pool } from "pg";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/apply-migration.ts <pfad/zur/migration.sql>");
    process.exit(1);
  }
  const sql = readFileSync(file, "utf8");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log(`OK — ${file} angewendet`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FEHLER:", e instanceof Error ? e.message : e);
  process.exit(1);
});
