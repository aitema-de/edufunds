/**
 * Pre-Flight-Survey: Dossier-Coverage-Analyse fuer Phase 5 Wave 0.
 *
 * Liest alle 11 Dossiers aus data/richtlinien/, zaehlt pro Dossier
 * die Phase-3-Felder (pflicht-Abschnitte, maxZeichen-gesetzt,
 * vorbildFormulierungen, bestPractices, rejectGruende) und schreibt
 * einen Markdown-Report nach data/eval/dossier-coverage-baseline.md.
 *
 * Zweck: RESEARCH §Daten-Vorbedingungen-Befund (A5) — vor dem Eval-Skript-Bau
 * dokumentieren, welche Phase-3-Felder pro Dossier befuellt sind.
 * Befund beeinflusst WIZ-01 (maxZeichen-Check) und Hebel 3
 * (vorbildFormulierungen-Injection wirkt nur fuer Dossiers mit Eintraegen).
 *
 * Run: npx tsx scripts/check-dossier-coverage.ts
 *
 * Output: data/eval/dossier-coverage-baseline.md (wird ueberschrieben)
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, basename } from "node:path";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";

const REPO = resolve(__dirname, "..");
const RICHTLINIEN_DIR = resolve(REPO, "data/richtlinien");
const OUTPUT_PATH = resolve(REPO, "data/eval/dossier-coverage-baseline.md");
const LOG_PREFIX = "[check-dossier-coverage]";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

interface DossierStats {
  id: string;
  pflicht: number;
  maxZeichen: number;
  vorbildFormulierungen: number;
  bestPractices: number;
  rejectGruende: number;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function countStats(id: string, r: Richtlinie): DossierStats {
  const abschnitte = r.antragsstruktur?.abschnitte ?? [];

  const pflicht = abschnitte.filter(
    (a) => a.pflicht !== false
  ).length;

  const maxZeichen = abschnitte.filter(
    (a) => typeof a.maxZeichen === "number" && a.maxZeichen > 0
  ).length;

  const vorbildFormulierungen = (r.vorbildFormulierungen ?? []).length;
  const bestPractices = (r.bestPractices ?? []).length;
  const rejectGruende = (r.rejectGruende ?? []).length;

  return { id, pflicht, maxZeichen, vorbildFormulierungen, bestPractices, rejectGruende };
}

function buildMarkdown(stats: DossierStats[], generatedAt: string): string {
  const maxZeichenTotal = stats.filter((s) => s.maxZeichen > 0).length;
  const vorbildTotal = stats.filter((s) => s.vorbildFormulierungen > 0).length;

  const header = [
    "# Dossier-Coverage Baseline (Phase 5 Pre-Flight)",
    "",
    `**Generated:** ${generatedAt}`,
    "**Source:** scripts/check-dossier-coverage.ts",
    "**Purpose:** RESEARCH §Daten-Vorbedingungen-Befund (A5) — vor Eval-Skript-Bau dokumentieren welche Phase-3-Felder pro Dossier befuellt sind.",
    "",
  ].join("\n");

  const tableHead = [
    "| Dossier | Pflicht-Abschnitte | maxZeichen-set | vorbildFormul. | bestPractices | rejectGruende |",
    "|---------|-------------------|----------------|----------------|---------------|---------------|",
  ].join("\n");

  const tableRows = stats
    .map(
      (s) =>
        `| ${s.id} | ${s.pflicht} | ${s.maxZeichen} | ${s.vorbildFormulierungen} | ${s.bestPractices} | ${s.rejectGruende} |`
    )
    .join("\n");

  const implications = [
    "",
    "## Implikationen fuer Phase 5",
    "",
    `- **WIZ-01 maxZeichen-Check:** ${maxZeichenTotal}/11 Dossiers haben maxZeichen gesetzt — Eval-Methodik dokumentiert Pflichtabschnitt-Coverage als Primary, maxZeichen optional (D-19, RESEARCH Pitfall 7)`,
    `- **Hebel 3 (vorbildFormulierungen-Injection) wirkt nur fuer ${vorbildTotal}/11 Dossiers** — Wave 3 Plan 05-06 misst Delta nur fuer Dossiers mit \`vorbildFormulierungen.length > 0\``,
    "",
  ].join("\n");

  return header + tableHead + "\n" + tableRows + implications;
}

// ---------------------------------------------------------------------------
// Haupt-Funktion
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LOG_PREFIX} Lese Dossiers aus ${RICHTLINIEN_DIR}`);

  const files = await readdir(RICHTLINIEN_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  console.log(`${LOG_PREFIX} Gefunden: ${jsonFiles.length} Dossier-Dateien`);

  const allStats: DossierStats[] = [];

  for (const file of jsonFiles) {
    const filePath = resolve(RICHTLINIEN_DIR, file);
    const id = basename(file, ".json");

    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (err) {
      console.error(`${LOG_PREFIX} FEHLER beim Lesen von ${file}:`, err);
      throw err;
    }

    let richtlinie: Richtlinie;
    try {
      richtlinie = JSON.parse(raw) as Richtlinie;
    } catch (err) {
      console.error(`${LOG_PREFIX} FEHLER beim JSON-Parsen von ${file}:`, err);
      throw err;
    }

    const stats = countStats(id, richtlinie);
    allStats.push(stats);

    console.log(
      `${LOG_PREFIX}   ${id}: pflicht=${stats.pflicht}, maxZeichen=${stats.maxZeichen}, vorbild=${stats.vorbildFormulierungen}, best=${stats.bestPractices}, reject=${stats.rejectGruende}`
    );
  }

  const generatedAt = new Date().toISOString().split("T")[0];
  const markdown = buildMarkdown(allStats, generatedAt);

  // Sicherstellen dass data/eval/ existiert
  await mkdir(resolve(REPO, "data/eval"), { recursive: true });

  await writeFile(OUTPUT_PATH, markdown, "utf-8");
  console.log(`${LOG_PREFIX} Report geschrieben: ${OUTPUT_PATH}`);
  console.log(`${LOG_PREFIX} Dossiers verarbeitet: ${allStats.length}`);

  // Zusammenfassung
  const maxZeichenCount = allStats.filter((s) => s.maxZeichen > 0).length;
  const vorbildCount = allStats.filter((s) => s.vorbildFormulierungen > 0).length;
  console.log(`${LOG_PREFIX} Befund: maxZeichen-set = ${maxZeichenCount}/11, vorbildFormulierungen > 0 = ${vorbildCount}/11`);
}

main().catch((e) => {
  console.error(`${LOG_PREFIX} Crash:`, e);
  process.exit(1);
});
