#!/usr/bin/env node
/**
 * Wegwerf-Test-DB Setup (ohne Docker).
 * Legt `edufunds_test` auf der via Tunnel erreichbaren Server-Postgres an
 * (getrennt von der echten `edufunds`-DB) und spielt Schema + Migrationen ein.
 *
 * Usage:
 *   node scripts/test-db-setup.mjs            # anlegen (drop+create+schema+migrations)
 *   node scripts/test-db-setup.mjs --drop     # nur droppen (Cleanup)
 *
 * Liest die Basis-DATABASE_URL aus .env.local (zeigt auf .../edufunds via 5433).
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const TEST_DB = 'edufunds_test';

function baseUrl() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const m = env.match(/^DATABASE_URL=(.+)$/m);
  if (!m) throw new Error('DATABASE_URL nicht in .env.local gefunden');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function withDb(url, db) {
  const u = new URL(url);
  u.pathname = '/' + db;
  return u.toString();
}

async function maintenanceClient(url) {
  // Verbinde mit der vorhandenen edufunds-DB als Wartungs-Connection
  const c = new Client({ connectionString: withDb(url, 'edufunds') });
  await c.connect();
  return c;
}

async function drop(url) {
  const c = await maintenanceClient(url);
  try {
    await c.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [TEST_DB]);
    await c.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    console.log(`✓ DROP DATABASE ${TEST_DB}`);
  } finally { await c.end(); }
}

async function create(url) {
  const c = await maintenanceClient(url);
  try {
    await c.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [TEST_DB]);
    await c.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await c.query(`CREATE DATABASE ${TEST_DB}`);
    console.log(`✓ CREATE DATABASE ${TEST_DB}`);
  } finally { await c.end(); }

  const t = new Client({ connectionString: withDb(url, TEST_DB) });
  await t.connect();
  try {
    const files = [
      '../scripts/init-db.sql',
      '../db/migrations/002_wizard_session.sql',
      '../db/migrations/003_paywall.sql',
    ];
    for (const f of files) {
      const sql = readFileSync(new URL(f, import.meta.url), 'utf8');
      await t.query(sql);
      console.log(`✓ applied ${f.replace('../','')}`);
    }
    const { rows } = await t.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log('Tabellen:', rows.map(r => r.table_name).join(', '));
  } finally { await t.end(); }
}

const url = baseUrl();
if (process.argv.includes('--drop')) {
  await drop(url);
} else {
  await create(url);
  console.log(`\nTEST_DATABASE_URL=${withDb(url, TEST_DB)}`);
}
