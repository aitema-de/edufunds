/**
 * Deterministische QA-04/QA-05-Analyse auf gespeicherten Pipeline-Outputs.
 * Verwendet dieselbe Shingle/Jaccard/Marker-Logik wie scripts/measure-quality.ts,
 * angewandt auf .planning/test-fix/wizard-outputs/run*.json (Original-Tester-Laeufe).
 *
 * Lauf: node scripts/analyze-saved-runs.mjs [globPath]
 * Kein LLM, keine DB.
 */
import { readFileSync, readdirSync } from "fs";

const HEDGE = /gesch[aä]tzt|\bca\.|pauschal|angenommen|auf basis|[uü]blich|orientiert sich|annahme|kalkuliert mit/i;
const MARKERS = [/TV-?L\s?E?\d/i, /TV[oö]D/i, /Az\.?\s*\d/i, /\bKMK\b/, /Gesundheitsamt/i, /Willkommensklasse/i, /\bMDM\b/, /\bQ[1-4]\/20\d\d/];

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2);
}
function shingles(s, n = 5) {
  const w = norm(s);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const dir = ".planning/test-fix/wizard-outputs";
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

for (const f of files) {
  const d = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const g = d.generation || {};
  const secs = (g.sections ?? []).map((x) => ({ name: x.name, text: x.text || "" }));
  // QA-04: alle Abschnittspaare, max + welches Paar
  let maxOverlap = 0, maxPair = "";
  const shs = secs.map((s) => shingles(s.text));
  for (let i = 0; i < secs.length; i++)
    for (let j = i + 1; j < secs.length; j++) {
      const ov = jaccard(shs[i], shs[j]);
      if (ov > maxOverlap) { maxOverlap = ov; maxPair = `${secs[i].name} ↔ ${secs[j].name}`; }
    }
  // QA-05: Marker im finalText
  const text = g.finalText ?? "";
  const hits = MARKERS.map((r) => (text.match(r) || [])[0]).filter(Boolean);
  // QA-02 + Konsistenz fuer Kontext
  const posten = g.finanzplan?.posten ?? [];
  const hedge = posten.filter((p) => p.begruendung && HEDGE.test(p.begruendung)).length;
  const cons = g.consistencyIssues?.length ?? 0;

  console.log(`\n=== ${f} ===`);
  console.log(`  Abschnitte: ${secs.length} | finalText: ${text.length} Zeichen`);
  console.log(`  QA04_maxOverlap = ${maxOverlap.toFixed(3)}  ${maxPair ? "(" + maxPair + ")" : ""}`);
  console.log(`  QA05_textMarker = ${hits.length}  ${hits.length ? "→ " + hits.join(", ") : ""}`);
  console.log(`  QA02_hedgePosten = ${hedge}/${posten.length} | consistencyIssues = ${cons}`);
}
