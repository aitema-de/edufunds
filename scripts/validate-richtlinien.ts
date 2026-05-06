/**
 * CLI-Validator fuer alle Dossiers in data/richtlinien/*.json.
 *
 * Modi:
 *   npx tsx scripts/validate-richtlinien.ts          -> strict (Pflicht-Modus auf master)
 *   npx tsx scripts/validate-richtlinien.ts --legacy  -> legacy (4 neue Felder optional)
 *
 * Output: Tab-separierte Zeilen "programmId\tfeld\tfehler" pro Verletzung
 *         + Aggregat am Ende. Exit-Code 1 bei mind. einer Verletzung.
 *
 * Phase 4 (FETCH-04) wird --legacy schrittweise entfernen, bis alle 11
 * Dossiers strict-validiert werden koennen.
 */

import * as fs from "fs";
import * as path from "path";
import {
  RichtlinieStrictSchema,
  RichtlinieLegacySchema,
  validateForeignKeys,
} from "../lib/wizard/richtlinien-validator";

const DIR = path.join(process.cwd(), "data", "richtlinien");

interface IssueLine {
  programmId: string;
  feld: string;
  fehler: string;
}

function printIssue(issue: IssueLine): void {
  // Tab-separiert fuer trivialen `cut -f1` / `awk -F'\t'`.
  console.log(`${issue.programmId}\t${issue.feld}\t${issue.fehler}`);
}

function validateOne(
  programmId: string,
  parsed: unknown,
  isLegacy: boolean
): IssueLine[] {
  const issues: IssueLine[] = [];
  const schema = isLegacy ? RichtlinieLegacySchema : RichtlinieStrictSchema;
  const result = schema.safeParse(parsed);
  if (!result.success) {
    for (const z of result.error.issues) {
      issues.push({
        programmId,
        feld: z.path.join("."),
        fehler: z.message,
      });
    }
    return issues;
  }
  const fkData = result.data as {
    antragsstruktur: { abschnitte: Array<{ id: string }> };
    vorbildFormulierungen?: Array<{ abschnitt_id: string }>;
  };
  for (const fk of validateForeignKeys(fkData, programmId)) {
    issues.push({
      programmId,
      feld: "vorbildFormulierungen[].abschnitt_id",
      fehler: fk.reason,
    });
  }
  return issues;
}

function main(): void {
  const args = process.argv.slice(2);
  const isLegacy = args.includes("--legacy");
  const mode = isLegacy ? "legacy" : "strict";

  if (!fs.existsSync(DIR)) {
    console.error(`Verzeichnis fehlt: ${DIR}`);
    process.exit(2);
  }

  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error(`Keine Dossiers in ${DIR} gefunden.`);
    process.exit(2);
  }

  const allIssues: IssueLine[] = [];
  for (const file of files) {
    const programmId = file.replace(/\.json$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
    } catch (err) {
      allIssues.push({
        programmId,
        feld: "<file>",
        fehler: `JSON-Parse-Fehler: ${(err as Error).message}`,
      });
      continue;
    }
    const issues = validateOne(programmId, parsed, isLegacy);
    for (const issue of issues) {
      printIssue(issue);
      allIssues.push(issue);
    }
  }

  console.log("");
  console.log(`=== VALIDIERUNG ERGEBNIS (${mode}) ===`);
  console.log(`Geprueft: ${files.length} Dossier(s)`);
  const failedIds = new Set(allIssues.map((i) => i.programmId));
  console.log(`Fehlerhafte Dossiers: ${failedIds.size}`);
  console.log(`Gesamt-Issues: ${allIssues.length}`);

  if (allIssues.length > 0) {
    process.exit(1);
  }
  console.log(`Alle ${files.length} Dossiers valide (${mode}-Modus).`);
  process.exit(0);
}

main();
