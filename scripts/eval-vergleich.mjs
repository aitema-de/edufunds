/**
 * Gepaarter Vergleich zweier Gutachter-Berichte auf derselben Besetzung.
 *
 *   node scripts/eval-vergleich.mjs <alt.json> <neu.json>
 *
 * Entstanden am 17.08.2026, weil die Einzelzahlen der Berichte nicht sagen,
 * ob eine Aenderung Wirkung oder Rauschen ist. Zwei Dinge macht das Skript
 * deshalb ueber den Bericht hinaus:
 *
 *  1. GEPAART — es vergleicht jeden Korpus-Eintrag mit sich selbst und weist die
 *     Streuung der DIFFERENZEN aus (nicht die der Noten). Nur daraus laesst sich
 *     ein SE bilden.
 *  2. ALLE Kriterien, auch die von der Aenderung unberuehrten. Ein unberuehrtes
 *     Kriterium ist das Kontroll-Kriterium: bewegt es sich genauso stark wie das
 *     Zielkriterium, war das Ergebnis Rauschen. Am 17.08. bewegte sich
 *     `nachhaltigkeit` (nicht angefasst) um -0,26, das Zielkriterium `finanzen`
 *     nur um -0,20 — ohne diese Spalte haette man daraus Schaden gelesen.
 *
 * Zusaetzlich gezaehlt: Rubrik-Anker-Sprache und Rechen-/Widerspruchs-Ruegen in
 * den Mangel-Texten zu `finanzen` — Mechanismus-Nachweis unabhaengig von der Note.
 */
import { readFileSync } from "node:fs";

const [altPfad, neuPfad] = process.argv.slice(2);
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const alt = load(altPfad);
const neu = load(neuPfad);

const mittel = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sigma = (xs) => {
  if (xs.length < 2) return NaN;
  const m = mittel(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "—");

function sammle(rep) {
  const proEintrag = new Map();
  const kriterien = new Map();
  const proJudge = new Map();
  const kategorien = new Map();
  let todo = 0, annahme = 0, n = 0;
  for (const e of rep.ergebnisse) {
    const ki = e.bewertungen.filter((b) => b.arm === "ki");
    if (!ki.length) continue;
    n++;
    todo += e.markerZahl?.todo ?? 0;
    annahme += e.markerZahl?.annahme ?? 0;
    proEintrag.set(e.korpusId, mittel(ki.map((b) => b.gewichtet)));
    if (!kategorien.has(e.kategorie)) kategorien.set(e.kategorie, []);
    kategorien.get(e.kategorie).push(mittel(ki.map((b) => b.gewichtet)));
    for (const b of ki) {
      if (!proJudge.has(b.judge)) proJudge.set(b.judge, []);
      proJudge.get(b.judge).push(b.gewichtet);
      for (const k of b.rohwerte?.kriterien ?? []) {
        if (k.nicht_bewertbar || typeof k.score !== "number") continue;
        if (!kriterien.has(k.id)) kriterien.set(k.id, []);
        kriterien.get(k.id).push(k.score);
      }
    }
  }
  return { proEintrag, kriterien, proJudge, kategorien, todo, annahme, n };
}

const A = sammle(alt), B = sammle(neu);
const wA = [...A.proEintrag.values()], wB = [...B.proEintrag.values()];

console.log(`ALT: ${alt.iso}  (${A.n} Eintraege)`);
console.log(`NEU: ${neu.iso}  (${B.n} Eintraege)\n`);
console.log(`Gesamturteil   ALT ${f2(mittel(wA))} (σ ${f2(sigma(wA))})   NEU ${f2(mittel(wB))} (σ ${f2(sigma(wB))})   Δ ${f2(mittel(wB) - mittel(wA))}`);

// gepaart: nur Eintraege, die in beiden Berichten vorkommen
const gemeinsam = [...B.proEintrag.keys()].filter((id) => A.proEintrag.has(id));
const paare = gemeinsam.map((id) => B.proEintrag.get(id) - A.proEintrag.get(id));
console.log(`gepaart (n=${gemeinsam.length})   Ø Differenz ${f2(mittel(paare))}   σ der Differenzen ${f2(sigma(paare))}`);
const besser = paare.filter((d) => d > 0.05).length, schlechter = paare.filter((d) => d < -0.05).length;
console.log(`               besser ${besser} · schlechter ${schlechter} · unveraendert ${paare.length - besser - schlechter}\n`);

console.log("Kriterium        ALT    NEU      Δ");
const ids = new Set([...A.kriterien.keys(), ...B.kriterien.keys()]);
for (const id of ids) {
  const a = mittel(A.kriterien.get(id) ?? []), b = mittel(B.kriterien.get(id) ?? []);
  const marke = id === "finanzen" ? "  <<< Zielkriterium" : "";
  console.log(`${id.padEnd(16)} ${f2(a).padStart(4)}  ${f2(b).padStart(4)}  ${f2(b - a).padStart(6)}${marke}`);
}

console.log("\nJudge            ALT    NEU      Δ");
for (const j of new Set([...A.proJudge.keys(), ...B.proJudge.keys()])) {
  const a = mittel(A.proJudge.get(j) ?? []), b = mittel(B.proJudge.get(j) ?? []);
  console.log(`${j.padEnd(16)} ${f2(a).padStart(4)}  ${f2(b).padStart(4)}  ${f2(b - a).padStart(6)}`);
}

console.log("\nKategorie        ALT    NEU      Δ    n");
for (const k of new Set([...A.kategorien.keys(), ...B.kategorien.keys()])) {
  const a = mittel(A.kategorien.get(k) ?? []), b = mittel(B.kategorien.get(k) ?? []);
  console.log(`${String(k).padEnd(16)} ${f2(a).padStart(4)}  ${f2(b).padStart(4)}  ${f2(b - a).padStart(6)}  ${(B.kategorien.get(k) ?? []).length}`);
}

console.log(`\nMarker (Summe)   TODO  ALT ${A.todo} → NEU ${B.todo}    [Annahme:]  ALT ${A.annahme} → NEU ${B.annahme}`);

// Rubrik-Sprache im finanzen-Mangel: "nicht aus dem Vorhaben abgeleitet"
const ANKER = /nicht aus dem vorhaben|ohne ableitung|nicht abgeleitet|nicht nachvollziehbar hergeleitet|keine herleitung|nicht hergeleitet/i;
const RECHNUNG = /rechnung|kalkulation geht nicht auf|summe stimmt nicht|widerspr/i;
function zaehleMaengel(rep, re, kriterium) {
  let n = 0, beispiele = [];
  for (const e of rep.ergebnisse)
    for (const b of e.bewertungen.filter((x) => x.arm === "ki"))
      for (const k of b.rohwerte?.kriterien ?? [])
        if ((!kriterium || k.id === kriterium) && re.test(k.maengel ?? "")) {
          n++;
          if (beispiele.length < 3) beispiele.push(`${e.korpusId}/${b.judge}: ${(k.maengel ?? "").slice(0, 150)}`);
        }
  return { n, beispiele };
}
for (const [label, re] of [["Anker-Sprache 'nicht aus dem Vorhaben abgeleitet'", ANKER], ["Rechen-/Widerspruchs-Ruegen", RECHNUNG]]) {
  const a = zaehleMaengel(alt, re, "finanzen"), b = zaehleMaengel(neu, re, "finanzen");
  console.log(`\n${label} im Kriterium finanzen:  ALT ${a.n} → NEU ${b.n}`);
  for (const x of b.beispiele) console.log("   NEU  " + x);
}

console.log("\nGate NEU:", JSON.stringify(neu.gate?.pruefungen ?? [], null, 1));
