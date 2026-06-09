/**
 * UAT-DB-Snapshot: Exportiert alle ki_antraege-Rows, die seit einem
 * Session-Start-Zeitstempel aktualisiert wurden, als JSON.
 *
 * Zweck: Reproduzierbare Post-Session-Analyse (D-12, D-13, D-23).
 *        Rohdaten landen in tmp/ (per .gitignore ausgeschlossen) — nie im git.
 *
 * Run: `npx tsx --env-file=.env.local scripts/uat-db-snapshot.ts --since "2026-06-01 14:00"`
 * Output: tmp/uat-snapshot-<ISO-datum>.json
 *
 * Sicherheitshinweis (T-06-01-01/T-06-01-02): Der CONNECTION-String wird
 * NIEMALS geloggt. Nur Tabellen-Spaltenwerte erscheinen in der Ausgabe.
 * JSON-Output landet in tmp/ (ausgeschlossen per .gitignore).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const REPO = resolve(__dirname, "..");

async function main() {
  // --since "<ISO-Timestamp>" aus CLI-Argumenten lesen
  const sinceIdx = process.argv.indexOf("--since");
  if (sinceIdx === -1 || !process.argv[sinceIdx + 1]) {
    console.error("Fehler: --since Argument fehlt.");
    console.error("Verwendung: npx tsx --env-file=.env.local scripts/uat-db-snapshot.ts --since \"2026-06-01 14:00\"");
    console.error("Tipp: Den korrekten Timestamp liefert uat-pre-session-check.ts (Schritt 4).");
    process.exit(2);
  }
  const sinceRaw = process.argv[sinceIdx + 1];

  // DATABASE_URL aus .env.local lesen (T-06-01-01: kein console.log(url))
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt in .env.local");

  const client = new pg.Client(url);
  await client.connect();

  console.log(`UAT-DB-Snapshot: Lade Rows seit ${sinceRaw} …`);

  const res = await client.query(
    `SELECT session_token, created_at, updated_at, antrag_data
     FROM ki_antraege
     WHERE updated_at > $1
     ORDER BY updated_at ASC`,
    [sinceRaw]
  );

  await client.end();

  const rowCount = res.rows.length;
  console.log(`  -> ${rowCount} Row(s) gefunden.`);

  if (rowCount === 0) {
    console.log("Kein Snapshot-Output — keine Aktivität seit dem angegebenen Zeitstempel.");
    return;
  }

  // Ausgabe nach tmp/ schreiben (tmp/ ist per .gitignore ausgeschlossen — D-13)
  const outDir = resolve(REPO, "tmp");
  await mkdir(outDir, { recursive: true });
  const isoStamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const outFile = resolve(outDir, `uat-snapshot-${isoStamp}.json`);

  const payload = {
    exportedAt: new Date().toISOString(),
    since: sinceRaw,
    rowCount,
    rows: res.rows.map((r) => ({
      session_token: r.session_token,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
      antrag_data: r.antrag_data,
    })),
  };

  await writeFile(outFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`  -> Snapshot gespeichert: ${outFile}`);
  console.log("Für die Antrag-Qualitätsbewertung (D-23): session_token aus dem Snapshot");
  console.log("in smoke-pipeline-with-extractor.ts --token <token> übergeben.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
