/**
 * UAT-Session-Token-Abfrage: Listet die letzten N ki_antraege-Rows sortiert nach
 * updated_at DESC auf stdout auf.
 *
 * Automatisiert den manuellen SQL-Hint aus UAT-BEFUNDE-TEMPLATE.md Zeile 5:
 *   `SELECT session_token FROM ki_antraege ORDER BY updated_at DESC LIMIT 1`
 *
 * Zweck: D-12 reproduzierbares Session-Setup — nach jeder UAT-Session den
 *        aktuellen session_token ohne SQL-Client ermitteln.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/uat-session-token.ts
 *   npx tsx --env-file=.env.local scripts/uat-session-token.ts --limit 10
 *
 * Output-Format pro Zeile: <session_token>  <updated_at-ISO>  <programm_id|->
 *
 * Sicherheitshinweis (T-06-01-01): Der CONNECTION-String wird NIEMALS geloggt.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const REPO = resolve(__dirname, "..");

async function main() {
  // --limit <N> aus CLI-Argumenten lesen (Default: 5)
  const limitIdx = process.argv.indexOf("--limit");
  let limit = 5;
  if (limitIdx !== -1 && process.argv[limitIdx + 1]) {
    const parsed = parseInt(process.argv[limitIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) limit = parsed;
  }

  // DATABASE_URL aus .env.local lesen (T-06-01-01: kein console.log(url))
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt in .env.local");

  const client = new pg.Client(url);
  await client.connect();

  const res = await client.query(
    `SELECT session_token, created_at, updated_at,
            (antrag_data->>'programmId') AS programm_id
     FROM ki_antraege
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit]
  );

  await client.end();

  if (res.rows.length === 0) {
    console.log("(keine Einträge in ki_antraege)");
    return;
  }

  // Ausgabe: eine Zeile pro Row im Format: <session_token>  <updated_at-ISO>  <programm_id|->
  for (const row of res.rows) {
    const token = row.session_token ?? "-";
    const updatedAt =
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? "-");
    const programmId = row.programm_id ?? "-";
    console.log(`${token}  ${updatedAt}  ${programmId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
