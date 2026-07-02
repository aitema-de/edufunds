/**
 * CLI-Qualitäts-Audit fuer alle Dossiers in data/richtlinien/*.json (P3-D).
 *
 * Waehrend scripts/validate-richtlinien.ts die strukturelle GUELTIGKEIT prueft,
 * misst dieses Skript die inhaltliche VOLLSTAENDIGKEIT/QUALITAET — die Felder,
 * aus denen die Generierung ihre programmspezifische Kriterien-Ausrichtung zieht
 * (Leitfragen, Best Practices, Reject-Gruende, Vorbild-Formulierungen, …).
 *
 * Modi:
 *   npx tsx scripts/audit-richtlinien.ts            -> lesbarer Report
 *   npx tsx scripts/audit-richtlinien.ts --json     -> JSON (Automatisierung)
 *   npx tsx scripts/audit-richtlinien.ts --gate     -> Exit 1, wenn ein
 *       KI-geeignetes Programm ein KRITISCHES Dossier hat (0 Abschnitte /
 *       0 Leitfragen → generische Struktur). Fuer CI/Pflege-Gate.
 */

import * as fs from "fs";
import * as path from "path";
import { auditDossier, MAX_SCORE, type DossierAudit } from "../lib/richtlinien-audit";

const DIR = path.join(process.cwd(), "data", "richtlinien");
const KATALOG = path.join(process.cwd(), "data", "foerderprogramme.json");

interface Row extends DossierAudit {
  id: string;
  kiGeeignet: boolean;
}

function loadKiGeeignet(): Set<string> {
  try {
    const raw = JSON.parse(fs.readFileSync(KATALOG, "utf8"));
    const arr = Array.isArray(raw) ? raw : (Object.values(raw)[0] as any[]);
    return new Set(arr.filter((p) => p?.kiAntragGeeignet).map((p) => p.id));
  } catch {
    return new Set();
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const gate = args.includes("--gate");

  if (!fs.existsSync(DIR)) {
    console.error(`Verzeichnis fehlt: ${DIR}`);
    process.exit(2);
  }
  const kiGeeignet = loadKiGeeignet();
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();

  const rows: Row[] = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
    } catch (err) {
      console.error(`${id}\tJSON-Parse-Fehler: ${(err as Error).message}`);
      process.exit(2);
    }
    rows.push({ id, kiGeeignet: kiGeeignet.has(id), ...auditDossier(parsed as any) });
  }

  const N = rows.length;
  const critical = rows.filter((r) => r.critical);
  const criticalKi = critical.filter((r) => r.kiGeeignet);

  if (asJson) {
    console.log(JSON.stringify({ total: N, maxScore: MAX_SCORE, rows }, null, 2));
    process.exit(gate && criticalKi.length > 0 ? 1 : 0);
  }

  const pct = (n: number) => `${n}/${N} (${Math.round((n / N) * 100)}%)`;
  const cnt = (pred: (r: Row) => boolean) => rows.filter(pred).length;

  console.log(`### DOSSIER-QUALITAETS-AUDIT — ${N} Dossiers\n`);
  console.log("Abdeckung der Kriterien-Felder (Basis der programmspezifischen Ausrichtung):");
  console.log("  Leitfragen (alle Abschnitte):  " + pct(cnt((r) => r.signals.abschnitte > 0 && r.signals.mitLeitfragen === r.signals.abschnitte)));
  console.log("  Best Practices:                " + pct(cnt((r) => r.signals.bestPractices > 0)));
  console.log("  Reject-Gruende:                " + pct(cnt((r) => r.signals.rejectGruende > 0)));
  console.log("  Vorbild-Formulierungen:        " + pct(cnt((r) => r.signals.vorbildFormulierungen > 0)));
  console.log("  strukturierte Foerderhoehe:    " + pct(cnt((r) => r.signals.foerderhoeheStrukturiert)));
  console.log("  Kostenpos. m. Bedingungen:     " + pct(cnt((r) => r.signals.kostenMitDetails > 0)));

  console.log("\nScore-Verteilung (0=leer … " + MAX_SCORE + "=voll):");
  const dist: Record<number, number> = {};
  for (const r of rows) dist[r.score] = (dist[r.score] ?? 0) + 1;
  Object.keys(dist).map(Number).sort((a, b) => a - b).forEach((k) => console.log(`  Score ${k}: ${dist[k]}`));

  console.log(`\nKRITISCHE Dossiers (generische Struktur / keine Kriterien): ${critical.length}` + (criticalKi.length ? ` — davon KI-geeignet: ${criticalKi.length}` : ""));
  for (const r of critical) {
    console.log(`  ${r.kiGeeignet ? "★" : " "} ${r.id}: ${r.criticalReasons.join("; ")}`);
  }

  const weak = rows.filter((r) => !r.critical && r.score < MAX_SCORE).sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  console.log(`\nVerbesserbare Dossiers (Score < ${MAX_SCORE}): ${weak.length}`);
  for (const r of weak.slice(0, 40)) {
    console.log(`  [${r.score}/${MAX_SCORE}] ${r.kiGeeignet ? "★" : " "} ${r.id}: fehlt ${r.missing.join(", ")}`);
  }
  if (weak.length > 40) console.log(`  … und ${weak.length - 40} weitere`);

  console.log("\n=== AUDIT ERGEBNIS ===");
  console.log(`Voll (Score ${MAX_SCORE}): ${cnt((r) => r.score === MAX_SCORE)} · Kritisch: ${critical.length} · KI-geeignet kritisch: ${criticalKi.length}`);

  if (gate && criticalKi.length > 0) {
    console.log(`\nGATE FAILED: ${criticalKi.length} KI-geeignete Programme mit kritischem Dossier.`);
    process.exit(1);
  }
  process.exit(0);
}

main();
