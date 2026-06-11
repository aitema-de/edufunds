#!/usr/bin/env node
/**
 * build-showcase-html.mjs — Erzeugt eine self-contained Showcase-HTML, die für
 * drei Beispielfälle den Prozess Eingabe → Ergebnis → Score zeigt. Ziel: sichtbar
 * machen, was der Wizard aus einer sehr spärlichen/schlechten Eingabe generiert.
 *
 * Daten aus den echten Probe-Dossiers (.planning/wizard-probe/run-NN-*.json)
 * + Richter-Verdicts (_review.json). Ausgabe: .planning/wizard-probe/showcase.html
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "/home/kolja/edufunds-app/.planning/wizard-probe";
const review = JSON.parse(readFileSync(join(DIR, "_review.json"), "utf8"));
const verdictByNr = new Map((review.verdicts || []).map((v) => [v.nr, v]));

// Ausgewählte Fälle + saubere deutsche Anzeige-Idee (Roh-Daten nutzen ASCII oe/ae)
const SELECTION = [
  { nr: 1, tab: "Tablets", ideeDe: "Wir wollen was mit Tablets machen." },
  { nr: 2, tab: "Schulhof", ideeDe: "Den Schulhof schöner machen." },
  { nr: 5, tab: "Mobbing", ideeDe: "Irgendwas gegen Mobbing." },
];

function loadRun(nr) {
  const pad = String(nr).padStart(2, "0");
  const f = readdirSync(DIR).filter((x) => new RegExp("^run-" + pad + "-").test(x)).sort().pop();
  return JSON.parse(readFileSync(join(DIR, f), "utf8"));
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inlineMd = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");

/** Minimaler Markdown→HTML-Konverter für den Antrags-Volltext. */
function mdToHtml(md) {
  const lines = String(md || "").split("\n");
  const out = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) { out.push(`<p>${para.map(inlineMd).join(" ")}</p>`); para = []; }
  };
  const flushList = () => {
    if (list.length) { out.push(`<ul>${list.map((li) => `<li>${inlineMd(li)}</li>`).join("")}</ul>`); list = []; }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (/^#\s+/.test(line)) { flushPara(); flushList(); out.push(`<h3 class="a-titel">${inlineMd(line.replace(/^#\s+/, ""))}</h3>`); continue; }
    if (/^##\s+/.test(line)) { flushPara(); flushList(); out.push(`<h4>${inlineMd(line.replace(/^##\s+/, ""))}</h4>`); continue; }
    if (/^###\s+/.test(line)) { flushPara(); flushList(); out.push(`<h5>${inlineMd(line.replace(/^###\s+/, ""))}</h5>`); continue; }
    if (/^[-*]\s+/.test(line)) { flushPara(); list.push(line.replace(/^[-*]\s+/, "")); continue; }
    if (line.trim() === "") { flushPara(); flushList(); continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join("\n");
}

const eur = (n) => (typeof n === "number" ? n.toLocaleString("de-DE") + " €" : "—");

const KAT = {
  personal: "Personalkosten", sachkosten: "Sachkosten", investitionen: "Investitionen",
  honorare: "Honorare", reisekosten: "Reisekosten", overhead: "Overhead", sonstiges: "Sonstiges",
};

const DIMS = [
  ["matchScore", "Programm-Match"],
  ["halluzinationScore", "Keine Halluzination"],
  ["lueckenScore", "Ehrliche Lücken"],
  ["finanzplanScore", "Finanzplan"],
  ["strukturScore", "Struktur"],
  ["floskelnScore", "Konkret statt Floskel"],
];

const scoreColor = (n) =>
  n >= 5 ? "#15803d" : n >= 4 ? "#65a30d" : n >= 3 ? "#c9a227" : n >= 2 ? "#ea580c" : "#dc2626";

function scoreDots(n) {
  let d = "";
  for (let i = 1; i <= 5; i++) {
    d += `<span class="dot" style="background:${i <= n ? scoreColor(n) : "#e2e0db"}"></span>`;
  }
  return d;
}

function caseSection(sel, run, idx) {
  const g = run.finalState?.generation || {};
  const v = verdictByNr.get(sel.nr) || {};
  const top = run.match?.matches?.[0];
  const fp = g.finanzplan || {};
  const posten = fp.posten || [];
  const vorCount = posten.filter((p) => p.istVorschlag).length;
  const sum = posten.reduce((s, p) => s + (p.betragEur || 0), 0);

  // Interview-Auszug (erste 3 Q/A) — zeigt, wie vage geantwortet wurde
  const snippets = (run.transcript || []).slice(0, 3).map((t) => `
    <div class="qa">
      <div class="q">F: ${esc(t.frage)}</div>
      <div class="a">A: „${esc(t.antwort)}"</div>
    </div>`).join("");

  const finanzRows = posten.map((p) => `
    <tr>
      <td>${esc(p.bezeichnung)}${p.istVorschlag ? ' <span class="badge">Vorschlag</span>' : ""}</td>
      <td class="kat">${KAT[p.kategorie] || p.kategorie}</td>
      <td class="num">${eur(p.betragEur)}</td>
    </tr>`).join("");

  const hinweise = (fp.hinweise || []).slice(0, 4).map((h) => `<li>${esc(h)}</li>`).join("");

  const scoreRows = DIMS.map(([k, label]) => `
    <div class="srow">
      <span class="slabel">${label}</span>
      <span class="sdots">${scoreDots(v[k] || 0)}</span>
      <span class="sval" style="color:${scoreColor(v[k] || 0)}">${v[k] ?? "–"}</span>
    </div>`).join("");

  const einreich = v.einreichbarkeitScore || 0;

  return `
  <section class="case" data-case="${idx}" ${idx === 0 ? "" : 'hidden'}>
    <div class="grid">
      <!-- EINGABE -->
      <div class="col input">
        <div class="kicker">① Das kam rein</div>
        <div class="idea">„${esc(sel.ideeDe)}"</div>
        <div class="meta">${esc(run.schule.name)} · Grundschule · ${esc(run.schule.bundesland.replace("DE-", ""))}</div>
        <p class="hint">Mehr Vorwissen gab es nicht. Im adaptiven Interview wurde fast jede Rückfrage ausweichend beantwortet:</p>
        ${snippets}
        <div class="more">…${(run.transcript || []).length} Fragen gesamt, fast durchgehend „weiß ich nicht genau".</div>
      </div>

      <!-- SCORE -->
      <div class="col score">
        <div class="kicker">③ Die Bewertung <span class="rubrik">(KI-Gutachter, 1–5)</span></div>
        ${scoreRows}
        <div class="einreich">
          <span>Einreichbarkeit (gesamt)</span>
          <span class="ebadge" style="background:${scoreColor(einreich)}">${einreich}/5</span>
        </div>
        <p class="fazit">${esc(v.fazit || "")}</p>
      </div>
    </div>

    <!-- ERGEBNIS -->
    <div class="result">
      <div class="kicker">② Das kam raus — generierter Antrag</div>
      <div class="match">Gematchtes Programm: <strong>${esc(top?.programm?.name || run.gewaehltesProgramm?.name || "—")}</strong> <span class="mscore">Match-Score ${top?.score ?? run.gewaehltesProgramm?.score ?? "–"}/100</span></div>
      <div class="antrag">${mdToHtml(g.finalText)}</div>

      <h4 class="fp-titel">Finanzplan <span class="fp-note">${vorCount}/${posten.length} Beträge sind markierte Vorschläge des Assistenten</span></h4>
      <table class="fp">
        <thead><tr><th>Posten</th><th>Kategorie</th><th class="num">Betrag</th></tr></thead>
        <tbody>${finanzRows}
          <tr class="sum"><td><strong>Gesamtvolumen</strong></td><td></td><td class="num"><strong>${eur(sum)}</strong></td></tr>
        </tbody>
      </table>
      ${hinweise ? `<div class="fp-hinweise"><strong>Hinweise des Assistenten:</strong><ul>${hinweise}</ul></div>` : ""}
      <div class="legend"><span class="badge">Vorschlag</span> = vom Assistenten geschätzter Betrag — vor Einreichung zu bestätigen oder anzupassen.</div>
    </div>
  </section>`;
}

const cases = SELECTION.map((sel, idx) => caseSection(sel, loadRun(sel.nr), idx));

const tabs = SELECTION.map((sel, idx) =>
  `<button class="tab${idx === 0 ? " active" : ""}" data-tab="${idx}">
     <span class="tnum">Fall ${sel.nr}</span>
     <span class="tidea">„${esc(sel.ideeDe)}"</span>
   </button>`).join("");

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EduFunds Wizard — Aus magerer Eingabe wird ein Antrag</title>
<style>
  :root{ --dark:#0a1628; --gold:#c9a227; --blue:#1e3a61; --bg:#f8f5f0; --line:rgba(10,22,40,.12); }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--blue); background:var(--bg); line-height:1.55; }
  .wrap{ max-width:1180px; margin:0 auto; padding:0 20px 80px; }
  header.hero{ background:var(--dark); color:#fff; padding:48px 20px 40px; }
  header.hero .inner{ max-width:1180px; margin:0 auto; }
  .eyebrow{ color:var(--gold); font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:13px; }
  h1{ font-size:34px; line-height:1.15; margin:10px 0 12px; color:#fff; }
  h1 .hl{ color:var(--gold); }
  header.hero p{ color:#cbd5e1; max-width:760px; margin:0; font-size:16px; }
  .principle{ display:flex; gap:14px; flex-wrap:wrap; margin-top:22px; }
  .principle .p{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:12px 14px; font-size:13px; color:#e2e8f0; max-width:360px; }
  .principle .p b{ color:#fff; }
  .tabs{ display:flex; gap:10px; flex-wrap:wrap; margin:26px 0 24px; }
  .tab{ flex:1 1 260px; text-align:left; background:#fff; border:1px solid var(--line); border-radius:12px; padding:12px 16px; cursor:pointer; transition:.15s; }
  .tab:hover{ border-color:var(--gold); }
  .tab.active{ border-color:var(--gold); box-shadow:0 0 0 2px rgba(201,162,39,.25); }
  .tab .tnum{ display:block; font-weight:700; color:var(--dark); font-size:13px; }
  .tab .tidea{ display:block; color:var(--blue); font-size:14px; opacity:.8; }
  .kicker{ font-weight:700; color:var(--dark); font-size:13px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
  .kicker .rubrik{ font-weight:500; text-transform:none; letter-spacing:0; color:#64748b; }
  .grid{ display:grid; grid-template-columns:1.1fr .9fr; gap:20px; margin-bottom:20px; }
  .col{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:20px; }
  .col.input .idea{ font-size:24px; font-weight:700; color:var(--dark); background:#fffdf5; border-left:4px solid var(--gold); padding:14px 16px; border-radius:6px; }
  .col.input .meta{ color:#64748b; font-size:13px; margin:10px 0 14px; }
  .col.input .hint{ font-size:13.5px; color:var(--blue); margin:0 0 12px; }
  .qa{ border-top:1px dashed var(--line); padding:9px 0; }
  .qa .q{ font-size:12.5px; color:#64748b; }
  .qa .a{ font-size:13.5px; color:var(--dark); font-weight:600; margin-top:2px; }
  .col.input .more{ margin-top:10px; font-size:12.5px; color:#94a3b8; font-style:italic; }
  .srow{ display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid var(--line); }
  .slabel{ flex:1; font-size:14px; color:var(--blue); }
  .sdots{ display:flex; gap:3px; }
  .dot{ width:11px; height:11px; border-radius:50%; }
  .sval{ width:18px; text-align:right; font-weight:700; font-size:14px; }
  .einreich{ display:flex; align-items:center; justify-content:space-between; margin-top:14px; padding-top:6px; font-weight:700; color:var(--dark); }
  .ebadge{ color:#fff; padding:4px 12px; border-radius:999px; font-size:15px; }
  .fazit{ font-size:12.5px; color:#475569; margin:12px 0 0; line-height:1.5; }
  .result{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:24px 28px; }
  .match{ background:#f1f5f9; border-radius:8px; padding:10px 14px; font-size:14px; margin-bottom:18px; }
  .match .mscore{ color:#64748b; font-size:12.5px; margin-left:6px; }
  .antrag{ font-size:14.5px; color:#1f2a44; }
  .antrag .a-titel{ font-size:20px; color:var(--dark); margin:0 0 14px; }
  .antrag h4{ color:var(--gold); font-size:16px; margin:22px 0 8px; }
  .antrag h5{ color:var(--dark); font-size:14.5px; margin:16px 0 6px; }
  .antrag p{ margin:0 0 12px; }
  .antrag ul{ margin:0 0 12px; padding-left:20px; }
  .antrag li{ margin:3px 0; }
  .fp-titel{ color:var(--dark)!important; font-size:17px; margin:28px 0 10px; border-top:1px solid var(--line); padding-top:20px; }
  .fp-note{ font-weight:500; font-size:12.5px; color:#64748b; }
  table.fp{ width:100%; border-collapse:collapse; font-size:13.5px; }
  table.fp th{ text-align:left; background:#f8fafc; border-bottom:2px solid var(--line); padding:8px 10px; color:var(--dark); }
  table.fp td{ border-bottom:1px solid var(--line); padding:8px 10px; vertical-align:top; }
  table.fp td.kat{ color:#64748b; }
  table.fp .num{ text-align:right; white-space:nowrap; }
  table.fp tr.sum td{ border-top:2px solid var(--line); }
  .badge{ display:inline-block; background:rgba(201,162,39,.15); color:#8a6d12; border:1px solid rgba(201,162,39,.4); border-radius:999px; padding:1px 8px; font-size:11px; font-weight:700; vertical-align:middle; }
  .fp-hinweise{ margin-top:14px; background:#fffdf5; border:1px solid rgba(201,162,39,.3); border-radius:8px; padding:12px 16px; font-size:12.5px; color:#475569; }
  .fp-hinweise ul{ margin:6px 0 0; padding-left:18px; }
  .legend{ margin-top:12px; font-size:12px; color:#64748b; }
  footer{ text-align:center; color:#94a3b8; font-size:12.5px; margin-top:40px; }
  @media (max-width:820px){ .grid{ grid-template-columns:1fr; } h1{ font-size:27px; } }
</style>
</head>
<body>
<header class="hero">
  <div class="inner">
    <div class="eyebrow">EduFunds · KI-Antragsassistent</div>
    <h1>Aus einem <span class="hl">vagen Halbsatz</span> wird ein strukturierter Förderantrag.</h1>
    <p>Drei echte Testläufe. Die Schulen gaben bewusst <strong>minimale, unpräzise</strong> Eingaben und beantworteten im Interview fast jede Rückfrage ausweichend. Das Beispiel zeigt ungeschönt, was der Wizard daraus generiert — und wie ehrlich er mit dem markiert, was er selbst ergänzt hat.</p>
    <div class="principle">
      <div class="p"><b>Ehrlichkeit durch Markieren:</b> Beträge und Formulierungen, die der Assistent ergänzt, bleiben erhalten — aber sichtbar als bestätigbarer <span class="badge">Vorschlag</span> gekennzeichnet, nicht als Tatsache ausgegeben.</div>
      <div class="p"><b>Unabhängig bewertet:</b> Jeden Antrag hat anschließend ein KI-Gutachter auf einer 1–5-Skala beurteilt (Match, Halluzination, Lücken-Ehrlichkeit, Finanzplan, Struktur, Konkretheit, Einreichbarkeit).</div>
    </div>
  </div>
</header>

<div class="wrap">
  <div class="tabs">${tabs}</div>
  ${cases.join("\n")}
  <footer>
    EduFunds Wizard — interne Qualitätsprobe (10 fiktive Grundschulen, spärlicher Input). Daten aus realen Generierungsläufen; Bewertung durch unabhängiges KI-Gutachter-Panel.
  </footer>
</div>

<script>
  const tabs = document.querySelectorAll('.tab');
  const cases = document.querySelectorAll('.case');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const i = t.dataset.tab;
    cases.forEach(c => c.hidden = (c.dataset.case !== i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
</script>
</body>
</html>`;

const outPath = join(DIR, "showcase.html");
writeFileSync(outPath, html, "utf8");
console.log("✓ Showcase geschrieben:", outPath, "(" + (html.length / 1024).toFixed(0) + " KB)");
