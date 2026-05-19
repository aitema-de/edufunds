/**
 * Helper-CLI: validiert genau ein Richtlinien-Dossier (Strict-Modus + FK-Check).
 *
 * Nutzung:
 *   npx tsx scripts/validate-single-dossier.ts <pfad/zum/dossier.json>
 *
 * Exit-Codes:
 *   0  -> Dossier valide (Strict-Schema + FK gruen)
 *   1  -> Mindestens eine Verletzung (Output: Tab-separierte Zeilen + Aggregat)
 *   2  -> Nutzungs-Fehler (kein Argument / Datei nicht gefunden)
 *
 * Wiederverwendung: Plan 04-03 ruft dieses Skript in der Migrations-Schleife
 * pro Dossier auf, statt das langsamere validate-richtlinien.ts mit
 * Verzeichnis-Scan zu nutzen. KEIN `node -e "require(...)"` mit
 * TypeScript-Files — der Projekt-Standard ist `npx tsx --env-file=.env.local`
 * (CLAUDE.md, scripts-Konvention).
 */

import * as fs from "fs";
import * as path from "path";
import {
  RichtlinieStrictSchema,
  validateForeignKeys,
  type FkCheckable,
} from "../lib/wizard/richtlinien-validator";

function printIssue(programmId: string, feld: string, fehler: string): void {
  console.log(`${programmId}\t${feld}\t${fehler}`);
}

async function main() {
  const args = process.argv.slice(2);
  const [filePath] = args;
  if (!filePath) {
    console.error("Nutzung: npx tsx scripts/validate-single-dossier.ts <pfad/zum/dossier.json>");
    console.error("Beispiel: npx tsx scripts/validate-single-dossier.ts data/richtlinien/bmbf-digitalpakt-2.json");
    process.exit(2);
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Datei nicht gefunden: ${absPath}`);
    process.exit(2);
  }

  const programmId = path.basename(absPath, ".json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (err) {
    printIssue(programmId, "<json>", `JSON-Parse-Fehler: ${(err as Error).message}`);
    process.exit(1);
  }

  let issueCount = 0;

  const strict = RichtlinieStrictSchema.safeParse(parsed);
  if (!strict.success) {
    for (const z of strict.error.issues) {
      printIssue(programmId, z.path.join("."), z.message);
      issueCount++;
    }
  }

  // FK-Check nur sinnvoll, wenn das Objekt grundsaetzlich die richtige Struktur hat.
  // Bei Strict-Fehlern ist parsed ggf. nicht FkCheckable — `as never` analog zu
  // extract-richtlinie.ts:325 und validate-richtlinien.ts:60.
  if (parsed && typeof parsed === "object") {
    for (const fk of validateForeignKeys(parsed as never as FkCheckable, programmId)) {
      printIssue(programmId, `vorbildFormulierungen[abschnitt_id=${fk.abschnitt_id}]`, fk.reason);
      issueCount++;
    }
  }

  if (issueCount === 0) {
    console.log(`OK\t${programmId}\tStrict-Schema + FK gruen`);
    process.exit(0);
  } else {
    console.error(`==> ${issueCount} Verletzung(en) in ${programmId}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
