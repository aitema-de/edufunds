/**
 * Manuelles Ausführen des Löschkonzepts (DSGVO Art. 5(1)e).
 *
 * Löscht/anonymisiert personenbezogene Daten nach Ablauf der Fristen
 * (Definition: lib/retention.ts, Doku: docs/legal/LOESCHKONZEPT.md).
 *
 * Nutzung:
 *   npx tsx --env-file=.env.local scripts/cleanup-personal-data.ts           # Dry-Run (DEFAULT)
 *   npx tsx --env-file=.env.local scripts/cleanup-personal-data.ts --apply   # schreibt wirklich
 *
 * WICHTIG: Default ist Dry-Run. Kein Löschen ohne explizites --apply
 * (Defense-in-Depth gegen versehentlich destruktive Läufe).
 */

import { withClient, closePool } from "../lib/db";
import { runRetention, buildRetentionPlan, DEFAULT_RETENTION } from "../lib/retention";

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;
  const now = new Date();

  console.log(`Löschkonzept — Modus: ${dryRun ? "DRY-RUN (nichts wird geändert)" : "APPLY (schreibt!)"}`);
  console.log(
    `Fristen: Newsletter-unbestätigt ${DEFAULT_RETENTION.unconfirmedNewsletterDays}d · ` +
      `verwaiste Entwürfe ${DEFAULT_RETENTION.abandonedDraftDays}d · ` +
      `IP/User-Agent ${DEFAULT_RETENTION.ipAnonymizeDays}d`
  );
  console.log("Plan:");
  for (const op of buildRetentionPlan(now)) {
    console.log(`  • [${op.kind}] ${op.name} — ${op.description}`);
  }
  console.log("");

  const run = await withClient((client) => runRetention(client, { now, dryRun }));

  console.log("Ergebnis:");
  for (const r of run.results) {
    console.log(`  ${r.name.padEnd(34)} ${String(r.affected).padStart(6)}  (${r.kind})`);
  }
  console.log(`  ${"GESAMT".padEnd(34)} ${String(run.totalAffected).padStart(6)}`);
  console.log("");
  console.log(
    dryRun
      ? "Dry-Run abgeschlossen — es wurde NICHTS geändert. Mit --apply ausführen."
      : "Angewendet. Datensätze wurden gelöscht/anonymisiert."
  );

  await closePool();
}

main().catch(async (err) => {
  console.error("Fehler beim Löschlauf:", err);
  await closePool();
  process.exit(1);
});
