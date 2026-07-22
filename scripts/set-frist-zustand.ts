/**
 * Setzt `fristZustand` (und optional `umfangZustand` / `einreichungsForm`) auf
 * Katalog UND Dossier — die beiden Orte, die bis 17.07.2026 nichts voneinander
 * wussten.
 *
 * Warum ein Skript und nicht von Hand: Die Migration laeuft ueber ~90 Programme.
 * Jede Handkorrektur an data/foerderprogramme.json (7.193 Zeilen) ist eine
 * Gelegenheit, ein Komma oder ein Anfuehrungszeichen zu verlieren — und ein
 * kaputter `art`-Wert ist genau der Fehler, gegen den das Gate fail-closed ist:
 * Er wuerde das Programm still aus dem Verkauf nehmen.
 *
 * Fail-closed auch hier: Jeder Eintrag wird VOR dem Schreiben gegen
 * lib/foerder-zustaende-schema.ts validiert. Ein ungueltiger Batch schreibt
 * NICHTS (alles-oder-nichts), damit der Katalog nie halb migriert liegen bleibt.
 *
 * Aufruf:
 *   npx tsx scripts/set-frist-zustand.ts <batch.json> [--dry-run]
 *
 * Batch-Format:
 *   [ { "id": "programm-id",
 *       "fristZustand": { "art": "keine", "quelle": "..." },
 *       "umfangZustand"?: {...}, "einreichungsForm"?: {...} } ]
 *
 * `quelle` ist Pflicht bei belegten Zustaenden (erzwingt das Schema) — sie ist
 * der ganze Punkt der Uebung: Ein Zustand ohne Beleg ist eine Behauptung.
 */

import * as fs from "fs";
import * as path from "path";
import {
  FristZustandSchema,
  UmfangZustandSchema,
  EinreichungsFormSchema,
} from "../lib/foerder-zustaende-schema";

const KATALOG_PFAD = path.join(__dirname, "../data/foerderprogramme.json");
const RICHTLINIEN_DIR = path.join(__dirname, "../data/richtlinien");

type Eintrag = {
  id: string;
  fristZustand?: unknown;
  umfangZustand?: unknown;
  einreichungsForm?: unknown;
};

const FELDER = [
  { name: "fristZustand", schema: FristZustandSchema },
  { name: "umfangZustand", schema: UmfangZustandSchema },
  { name: "einreichungsForm", schema: EinreichungsFormSchema },
] as const;

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const batchPfad = args.find((a) => !a.startsWith("--"));

  if (!batchPfad) {
    console.error("Aufruf: npx tsx scripts/set-frist-zustand.ts <batch.json> [--dry-run]");
    process.exit(2);
  }

  const batch: Eintrag[] = JSON.parse(fs.readFileSync(batchPfad, "utf-8"));
  const katalog: Record<string, unknown>[] = JSON.parse(fs.readFileSync(KATALOG_PFAD, "utf-8"));

  // ---- Phase 1: alles pruefen, nichts schreiben -------------------------
  const fehler: string[] = [];
  for (const e of batch) {
    if (!e.id) {
      fehler.push("Eintrag ohne id");
      continue;
    }
    if (!katalog.some((p) => p.id === e.id)) {
      fehler.push(`${e.id}: im Katalog nicht gefunden`);
    }
    let hatFeld = false;
    for (const { name, schema } of FELDER) {
      const wert = (e as Record<string, unknown>)[name];
      if (wert === undefined) continue;
      hatFeld = true;
      const r = schema.safeParse(wert);
      if (!r.success) {
        fehler.push(
          `${e.id}.${name}: ` +
            r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
        );
      }
    }
    if (!hatFeld) fehler.push(`${e.id}: kein zu setzendes Feld angegeben`);
  }

  const ids = batch.map((e) => e.id);
  const doppelt = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (doppelt.length) fehler.push(`Doppelte ids im Batch: ${[...new Set(doppelt)].join(", ")}`);

  if (fehler.length) {
    console.error(`\n[set-frist-zustand] ABBRUCH — ${fehler.length} Fehler, nichts geschrieben:\n`);
    fehler.forEach((f) => console.error("  ✗ " + f));
    process.exit(1);
  }

  // ---- Phase 2: schreiben ----------------------------------------------
  let katalogGeaendert = 0;
  const dossierGeaendert: string[] = [];
  const ohneDossier: string[] = [];

  for (const e of batch) {
    const p = katalog.find((x) => x.id === e.id)!;
    for (const { name } of FELDER) {
      const wert = (e as Record<string, unknown>)[name];
      if (wert !== undefined) p[name] = wert;
    }
    katalogGeaendert++;

    const dPfad = path.join(RICHTLINIEN_DIR, `${e.id}.json`);
    if (!fs.existsSync(dPfad)) {
      ohneDossier.push(e.id);
      continue;
    }
    const dossier = JSON.parse(fs.readFileSync(dPfad, "utf-8"));
    for (const { name } of FELDER) {
      const wert = (e as Record<string, unknown>)[name];
      if (wert !== undefined) dossier[name] = wert;
    }
    if (!dryRun) fs.writeFileSync(dPfad, JSON.stringify(dossier, null, 2) + "\n", "utf-8");
    dossierGeaendert.push(e.id);
  }

  if (!dryRun) {
    fs.writeFileSync(KATALOG_PFAD, JSON.stringify(katalog, null, 2) + "\n", "utf-8");
  }

  const praefix = dryRun ? "[DRY-RUN] " : "";
  console.log(`\n${praefix}Katalog: ${katalogGeaendert} Programm(e) aktualisiert.`);
  console.log(`${praefix}Dossiers: ${dossierGeaendert.length} aktualisiert.`);
  if (ohneDossier.length) {
    console.log(`${praefix}Ohne Dossier (nur Katalog): ${ohneDossier.join(", ")}`);
  }
}

main();
