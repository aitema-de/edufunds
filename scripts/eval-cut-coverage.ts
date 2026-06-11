/**
 * Cut-Coverage-Eval fuer den Programm-Matcher (lib/wizard/matcher.ts).
 *
 * MISST REIN DETERMINISTISCH — KEIN LLM, KEIN RAUSCHEN — ob das fachlich passende
 * Programm ueberhaupt in den 40er-Kandidaten-Cut (`selectCutCandidates`) kommt,
 * also in die Menge, die der Matcher dem LLM zum Ranken vorlegt. Wenn ein
 * erwartetes Programm hier fehlt, KANN der LLM-Ranking-Schritt es gar nicht mehr
 * treffen — der Fehler liegt dann nachweisbar in der Kandidaten-Auswahl
 * (Status-Prefilter C1 / Bundesland / Theme-Boost C3 / Queue-Score), nicht im LLM.
 *
 * Genau das fehlte bisher: das LLM-Output-Recall-Aggregat (`eval-matcher.ts`) ist
 * lauf-zu-lauf rausch-dominiert (Within-Condition-Varianz ≫ Before/After-Delta),
 * also untauglich fuer mechanische Matcher-Gewinne. Diese Metrik ist 100 %
 * reproduzierbar und isoliert die Stufe, an der C1/C3/C5/Queue tatsaechlich wirken.
 *
 * Pro erwartetem Programm (expected_top3) wird der Status klassifiziert:
 *   in_cut          — im Cut (mit Rang + sortScore), erreicht den LLM ✓
 *   below_cut       — prefilter ueberlebt, aber sortScore zu niedrig fuer Top-CUT_SIZE
 *                      → Theme-Boost/Queue-Luecke (C3-Hebel) — wie weit am Cut vorbei?
 *   prefiltered_out — vom prefilter entfernt (Status archiviert/review_needed ODER
 *                      Bundesland-Mismatch) → Daten-/C1-Thema; mit Grund
 *   not_in_catalog  — ID existiert nicht (mehr) im Katalog → Korpus-Daten-Drift
 *
 * Run:  npx tsx scripts/eval-cut-coverage.ts [--md <pfad>] [--json <pfad>] [--verbose]
 *       (KEIN --env-file noetig — keine LLM-/DB-Calls.)
 *
 * Exit-Codes: 0 = gelaufen; 2 = Korpus-/CLI-Fehler.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { MatchInput } from "../lib/wizard/matcher";
import { selectCutCandidates, CUT_SIZE } from "../lib/wizard/matcher";

const REPO = resolve(__dirname, "..");
const KORPUS_PATH = resolve(REPO, "data/eval/matcher-korpus.json");
const PROGRAMME_PATH = resolve(REPO, "data/foerderprogramme.json");
const LOG = "[eval-cut-coverage]";

type Category = "kurz" | "ausfuehrlich" | "vag";

interface KorpusEntry {
  id: string;
  category: Category;
  anliegen: string;
  schulname?: string;
  schultyp?: string;
  bundesland?: string;
  geschaetztesBudgetEur?: number;
  expected_top3: string[];
  expected_off_target: string[];
  expected_clarification?: boolean;
  previousAnliegen?: string;
  forceRanking?: boolean;
  notes?: string;
}

type CoverageStatus = "in_cut" | "below_cut" | "prefiltered_out" | "not_in_catalog";

interface ExpectedResult {
  programmId: string;
  status: CoverageStatus;
  /** 1-basierter Rang in der prefilter-ueberlebenden Liste (in_cut/below_cut). */
  rank?: number;
  sortScore?: number;
  queueScore?: number;
  themeBoost?: number;
  /** prefiltered_out: warum (status / bundesland). */
  reason?: string;
}

interface EntryReport {
  id: string;
  category: Category;
  anliegen: string;
  expectedTotal: number;
  inCatalog: number;
  covered: number;
  /** sortScore an der Cut-Grenze (Rang CUT_SIZE) — Bezug fuer below_cut. */
  cutBoundaryScore: number | null;
  survivors: number;
  expected: ExpectedResult[];
  offTargetsInCut: string[];
}

function parseArgs(argv: string[]) {
  const out: { md?: string; json?: string; verbose: boolean } = { verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--md") out.md = argv[++i];
    else if (a === "--json") out.json = argv[++i];
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: npx tsx scripts/eval-cut-coverage.ts [--md <pfad>] [--json <pfad>] [--verbose]");
      process.exit(0);
    } else {
      console.error(`${LOG} Unbekanntes Argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

/** Diagnose, warum prefilter ein Programm entfernt hat (Status vs. Bundesland). */
function prefilterReason(p: Foerderprogramm | undefined, entry: KorpusEntry): string {
  if (!p) return "unbekannt";
  const status = (p as { status?: string }).status;
  if (status === "archiviert" || status === "review_needed") return `status=${status}`;
  const bls = (p as { bundeslaender?: string[] }).bundeslaender;
  if (entry.bundesland && Array.isArray(bls) && bls.length > 0) {
    const lower = bls.map((x) => x.toLowerCase());
    if (!lower.includes("alle")) return `bundesland (Programm: ${bls.join(",")} ≠ ${entry.bundesland})`;
  }
  return "unbekannt";
}

function evaluateEntry(entry: KorpusEntry, catalogIds: Set<string>, catalogById: Map<string, Foerderprogramm>): EntryReport {
  const input: MatchInput = {
    anliegen: entry.anliegen,
    schulname: entry.schulname,
    schultyp: entry.schultyp,
    bundesland: entry.bundesland,
    geschaetztesBudgetEur: entry.geschaetztesBudgetEur,
    previousAnliegen: entry.previousAnliegen,
    forceRanking: entry.forceRanking,
  };
  const sel = selectCutCandidates(input);

  // Rang-Lookup ueber die prefilter-ueberlebende, sortierte Liste.
  const rankById = new Map<string, number>();
  sel.ranked.forEach((c, idx) => rankById.set(c.programm.id, idx)); // 0-basiert
  const cardById = new Map(sel.ranked.map((c) => [c.programm.id, c]));
  const cutIds = new Set(sel.cut.map((p) => p.id));
  const cutBoundaryScore = sel.ranked.length >= CUT_SIZE ? sel.ranked[CUT_SIZE - 1].sortScore : null;

  const expected: ExpectedResult[] = entry.expected_top3.map((programmId) => {
    if (!catalogIds.has(programmId)) {
      return { programmId, status: "not_in_catalog" as const };
    }
    const idx = rankById.get(programmId);
    if (idx === undefined) {
      // prefilter ueberlebt nicht
      return {
        programmId,
        status: "prefiltered_out" as const,
        reason: prefilterReason(catalogById.get(programmId), entry),
      };
    }
    const card = cardById.get(programmId)!;
    const inCut = cutIds.has(programmId);
    return {
      programmId,
      status: (inCut ? "in_cut" : "below_cut") as CoverageStatus,
      rank: idx + 1,
      sortScore: card.sortScore,
      queueScore: card.queueScore,
      themeBoost: card.themeBoost,
    };
  });

  const inCatalog = expected.filter((e) => e.status !== "not_in_catalog").length;
  const covered = expected.filter((e) => e.status === "in_cut").length;
  const offTargetsInCut = entry.expected_off_target.filter((id) => cutIds.has(id));

  return {
    id: entry.id,
    category: entry.category,
    anliegen: entry.anliegen,
    expectedTotal: entry.expected_top3.length,
    inCatalog,
    covered,
    cutBoundaryScore,
    survivors: sel.ranked.length,
    expected,
    offTargetsInCut,
  };
}

const STATUS_ICON: Record<CoverageStatus, string> = {
  in_cut: "✓",
  below_cut: "↓",
  prefiltered_out: "✗",
  not_in_catalog: "∅",
};

function summarize(reports: EntryReport[]) {
  // Nur Eintraege mit Erwartung zaehlen fuer Coverage (vage Faelle ohne expected_top3 raus).
  const scored = reports.filter((r) => r.expectedTotal > 0);
  let expIn = 0, exp = 0, cov = 0;
  const byCat: Record<string, { exp: number; cov: number }> = {};
  const counts: Record<CoverageStatus, number> = { in_cut: 0, below_cut: 0, prefiltered_out: 0, not_in_catalog: 0 };
  for (const r of scored) {
    exp += r.expectedTotal;
    expIn += r.inCatalog;
    cov += r.covered;
    byCat[r.category] ??= { exp: 0, cov: 0 };
    byCat[r.category].exp += r.inCatalog;
    byCat[r.category].cov += r.covered;
    for (const e of r.expected) counts[e.status]++;
  }
  const offTargetInCut = reports.reduce((n, r) => n + r.offTargetsInCut.length, 0);
  return { scoredEntries: scored.length, exp, expIn, cov, byCat, counts, offTargetInCut };
}

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`;
}

/** Float-Rauschen aus Score-Subtraktionen wegrunden (1 Nachkommastelle, ganzzahlig ohne ,0). */
function num(n: number | null | undefined): string {
  if (n == null) return "-";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function renderConsole(reports: EntryReport[], s: ReturnType<typeof summarize>, verbose: boolean) {
  console.log(`\n${LOG} Cut-Coverage @ ${CUT_SIZE} Kandidaten — rein deterministisch (kein LLM)\n`);
  console.log(`Coverage (in_cut / im Katalog erwartet): ${s.cov}/${s.expIn} = ${pct(s.cov, s.expIn)}`);
  console.log(`  davon nach Kategorie:`);
  for (const [cat, v] of Object.entries(s.byCat)) {
    console.log(`    ${cat.padEnd(12)} ${v.cov}/${v.exp} = ${pct(v.cov, v.exp)}`);
  }
  console.log(`\nStatus-Verteilung aller erwarteten Programme:`);
  console.log(`  ✓ in_cut          ${s.counts.in_cut}`);
  console.log(`  ↓ below_cut       ${s.counts.below_cut}   (prefilter ok, sortScore zu niedrig → C3/Queue)`);
  console.log(`  ✗ prefiltered_out ${s.counts.prefiltered_out}   (Status/Bundesland → Daten/C1)`);
  console.log(`  ∅ not_in_catalog  ${s.counts.not_in_catalog}   (Korpus-Drift)`);
  console.log(`  Off-Targets, die trotzdem im Cut landen: ${s.offTargetInCut}\n`);

  // Alle Misses auflisten — das ist der handlungsleitende Teil.
  const misses = reports.flatMap((r) =>
    r.expected
      .filter((e) => e.status !== "in_cut")
      .map((e) => ({ entry: r, e }))
  );
  if (misses.length > 0) {
    console.log(`Verfehlte erwartete Programme (${misses.length}):`);
    for (const { entry, e } of misses) {
      let detail = "";
      if (e.status === "below_cut") {
        const gap = entry.cutBoundaryScore != null ? entry.cutBoundaryScore - (e.sortScore ?? 0) : null;
        detail = `Rang ${e.rank}/${entry.survivors}, sortScore ${num(e.sortScore)} (Queue ${num(e.queueScore)}+Theme ${num(e.themeBoost)})` +
          (gap != null ? `, Cut-Grenze ${num(entry.cutBoundaryScore)} → fehlt ${num(gap)}` : "");
      } else if (e.status === "prefiltered_out") {
        detail = e.reason ?? "";
      }
      console.log(`  ${STATUS_ICON[e.status]} ${entry.id.padEnd(8)} ${e.programmId.padEnd(48)} ${e.status.padEnd(16)} ${detail}`);
    }
    console.log("");
  }

  if (verbose) {
    console.log(`Pro Eintrag:`);
    for (const r of reports) {
      const tag = r.expectedTotal === 0 ? "(vage/keine Erwartung)" : `${r.covered}/${r.inCatalog}`;
      console.log(`  ${r.id.padEnd(8)} ${r.category.padEnd(12)} ${tag.padEnd(22)} survivors=${r.survivors} cutGrenze=${r.cutBoundaryScore ?? "-"}`);
    }
    console.log("");
  }
}

function renderMarkdown(reports: EntryReport[], s: ReturnType<typeof summarize>, generatedAt: string): string {
  const lines: string[] = [];
  lines.push(`# Matcher Cut-Coverage @ ${CUT_SIZE}`);
  lines.push("");
  lines.push(`> Deterministisch, kein LLM. Misst, ob das erwartete Programm in den ${CUT_SIZE}er-Kandidaten-Cut kommt (= die Menge, die der Matcher dem LLM zum Ranken vorlegt). Fehlt es hier, kann kein Ranking-Schritt es mehr treffen — Fehler liegt in der Kandidaten-Auswahl, nicht im LLM.`);
  lines.push("");
  lines.push(`Generiert: ${generatedAt} · Korpus: \`data/eval/matcher-korpus.json\` (${s.scoredEntries} bewertbare Eintraege)`);
  lines.push("");
  lines.push(`## Aggregat`);
  lines.push("");
  lines.push(`**Cut-Coverage: ${s.cov}/${s.expIn} = ${pct(s.cov, s.expIn)}** (erwartete Programme, die im Katalog existieren und in den Cut kommen)`);
  lines.push("");
  lines.push(`| Kategorie | Coverage |`);
  lines.push(`|---|---|`);
  for (const [cat, v] of Object.entries(s.byCat)) {
    lines.push(`| ${cat} | ${v.cov}/${v.exp} = ${pct(v.cov, v.exp)} |`);
  }
  lines.push("");
  lines.push(`| Status | Anzahl | Bedeutung |`);
  lines.push(`|---|---|---|`);
  lines.push(`| ✓ in_cut | ${s.counts.in_cut} | erreicht den LLM |`);
  lines.push(`| ↓ below_cut | ${s.counts.below_cut} | prefilter ok, sortScore zu niedrig (C3/Queue-Hebel) |`);
  lines.push(`| ✗ prefiltered_out | ${s.counts.prefiltered_out} | Status/Bundesland entfernt (Daten/C1) |`);
  lines.push(`| ∅ not_in_catalog | ${s.counts.not_in_catalog} | Korpus-Daten-Drift |`);
  lines.push(`| Off-Targets im Cut | ${s.offTargetInCut} | breiter Cut, finaler Filter ist der LLM (informativ) |`);
  lines.push("");

  const misses = reports.flatMap((r) =>
    r.expected.filter((e) => e.status !== "in_cut").map((e) => ({ entry: r, e }))
  );
  lines.push(`## Verfehlte erwartete Programme (${misses.length})`);
  lines.push("");
  if (misses.length === 0) {
    lines.push(`_Keine — alle im Katalog vorhandenen erwarteten Programme erreichen den Cut._`);
  } else {
    lines.push(`| Eintrag | Programm | Status | Detail |`);
    lines.push(`|---|---|---|---|`);
    for (const { entry, e } of misses) {
      let detail = "";
      if (e.status === "below_cut") {
        const gap = entry.cutBoundaryScore != null ? entry.cutBoundaryScore - (e.sortScore ?? 0) : null;
        detail = `Rang ${e.rank}/${entry.survivors}, sortScore ${num(e.sortScore)} (Queue ${num(e.queueScore)}+Theme ${num(e.themeBoost)})` +
          (gap != null ? `, Cut-Grenze ${num(entry.cutBoundaryScore)}, fehlt ${num(gap)}` : "");
      } else if (e.status === "prefiltered_out") {
        detail = e.reason ?? "";
      }
      lines.push(`| ${entry.id} | \`${e.programmId}\` | ${STATUS_ICON[e.status]} ${e.status} | ${detail} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let korpus: KorpusEntry[];
  let programme: Foerderprogramm[];
  try {
    korpus = JSON.parse(await readFile(KORPUS_PATH, "utf8"));
    programme = JSON.parse(await readFile(PROGRAMME_PATH, "utf8"));
  } catch (err) {
    console.error(`${LOG} Konnte Korpus/Katalog nicht laden:`, err);
    process.exit(2);
  }
  if (!Array.isArray(korpus) || korpus.length === 0) {
    console.error(`${LOG} Korpus leer oder kein Array.`);
    process.exit(2);
  }

  const catalogIds = new Set(programme.map((p) => p.id));
  const catalogById = new Map(programme.map((p) => [p.id, p]));

  const reports = korpus.map((entry) => evaluateEntry(entry, catalogIds, catalogById));
  const s = summarize(reports);

  renderConsole(reports, s, args.verbose);

  const generatedAt = new Date().toISOString();
  if (args.md) {
    const md = renderMarkdown(reports, s, generatedAt);
    await mkdir(dirname(args.md), { recursive: true });
    await writeFile(args.md, md, "utf8");
    console.log(`${LOG} Markdown-Bericht: ${args.md}`);
  }
  if (args.json) {
    await mkdir(dirname(args.json), { recursive: true });
    await writeFile(args.json, JSON.stringify({ generatedAt, cutSize: CUT_SIZE, summary: s, reports }, null, 2), "utf8");
    console.log(`${LOG} JSON-Bericht: ${args.json}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`${LOG} Unerwarteter Fehler:`, err);
  process.exit(2);
});
