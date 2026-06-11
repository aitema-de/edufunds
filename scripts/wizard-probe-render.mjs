/**
 * wizard-probe-render.mjs — Erzeugt aus den E2E-Roh-Dossiers (run-NN-*.json) +
 * den Reviewer-Gutachten (_review.json) lesbare Markdown-Dokumente:
 *   - dossier-NN.md  (volle Nachvollziehbarkeit: Idee -> Match -> Interview ->
 *                     Facts -> Finanzplan -> Selbstkritik -> fertiger Antrag -> Gutachten)
 *   - REVIEW.md      (Gesamt-Review ueber alle 10: Gesamtbild, Score-Tabelle,
 *                     Muster, Staerken, Empfehlungen, Kurzfazit je Fall)
 *
 * _review.json (optional) = { verdicts: [...], synthese: {...} }, geschrieben aus
 * dem Workflow-Ergebnis. Fehlt es, werden nur die Provenance-Dossiers erzeugt.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "/home/kolja/edufunds-app/.planning/wizard-probe";
const index = JSON.parse(readFileSync(join(DIR, "_index.json"), "utf8"));
const review = existsSync(join(DIR, "_review.json"))
  ? JSON.parse(readFileSync(join(DIR, "_review.json"), "utf8"))
  : { verdicts: [], synthese: null };
const verdictByNr = new Map((review.verdicts || []).map((v) => [v.nr, v]));

const eur = (cents) => (typeof cents === "number" ? (cents).toLocaleString("de-DE") + " €" : "—");
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();

function factsToBullets(obj, indent = 0) {
  if (obj == null) return "";
  const pad = "  ".repeat(indent);
  let out = "";
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === "object") out += factsToBullets(item, indent);
      else out += `${pad}- ${item}\n`;
    }
  } else if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || (Array.isArray(v) && v.length === 0)) continue;
      if (v && typeof v === "object") {
        out += `${pad}- **${k}:**\n` + factsToBullets(v, indent + 1);
      } else {
        out += `${pad}- **${k}:** ${v}\n`;
      }
    }
  }
  return out;
}

function renderDossier(run, v) {
  const g = run.finalState?.generation || {};
  const score100 = run.gewaehltesProgramm?.score;
  const L = [];
  L.push(`# Dossier Fall ${String(run.nr).padStart(2, "0")} — ${run.schule.name}`);
  L.push("");
  L.push(`> E2E-Testlauf des Antragswizards mit **absichtlich spaerlichem Input**. Dieses Dossier zeigt alle Informationen, die in jedem Schritt zur Verfuegung standen.`);
  L.push("");
  // 1
  L.push(`## 1. Ausgangslage (Nutzer-Eingabe)`);
  L.push(`- **Knappe Idee (woertlich):** „${run.idee}"`);
  L.push(`- **Schulprofil:** ${run.schule.name} · ${run.schule.typ} · ${run.schule.bundesland}`);
  if (run.matchClarification) L.push(`- **Rueckfrage des Matchers:** „${run.matchClarification}"`);
  L.push("");
  // 2
  L.push(`## 2. Matching`);
  const matches = run.match?.matches || [];
  if (matches.length) {
    L.push(`**Top-Treffer:** ${matches[0].programm?.name} — Score ${matches[0].score}/100`);
    L.push(`- *passt weil:* ${matches[0].passt_weil || "—"}`);
    L.push(`- *Achtung bei:* ${matches[0].achtung_bei || "—"}`);
    if (matches.length > 1) {
      L.push(`- *Weitere Treffer:* ` + matches.slice(1).map((m) => `${m.programm?.name} (${m.score})`).join(", "));
    }
  } else {
    L.push("_Kein Treffer._");
  }
  L.push("");
  // 3
  L.push(`## 3. Interview — vollstaendiges Frage/Antwort-Protokoll`);
  L.push(`_Die Antworten gab eine Persona „ueberlastete Lehrkraft", die bewusst knapp/vage geantwortet hat._`);
  L.push("");
  L.push(`| # | Frage des Wizards | Antwort (bewusst vage) |`);
  L.push(`|---|---|---|`);
  for (const t of run.transcript || []) {
    L.push(`| ${t.runde} | ${esc(t.frage)} | ${esc(t.antwort)} |`);
  }
  L.push("");
  // 4
  L.push(`## 4. Vom System extrahierte Facts (Stand am Ende)`);
  const facts = run.finalState?.facts || {};
  L.push(factsToBullets(facts).trimEnd() || "_keine_");
  L.push("");
  // 5
  L.push(`## 5. Generierter Finanzplan`);
  const fp = g.finanzplan;
  if (fp?.posten?.length) {
    L.push(`| Posten | Betrag | Vorschlag? | Begruendung | Eigenanteil |`);
    L.push(`|---|---:|:--:|---|:--:|`);
    let sum = 0;
    let vorCount = 0;
    for (const p of fp.posten) {
      sum += p.betragEur || 0;
      if (p.istVorschlag) vorCount++;
      L.push(`| ${esc(p.bezeichnung)} | ${eur(p.betragEur)} | ${p.istVorschlag ? "⟨Vorschlag⟩" : "belegt"} | ${esc(p.begruendung)} | ${p.eigenanteil ? "ja" : "—"} |`);
    }
    L.push(`| **Summe** | **${eur(sum)}** | ${vorCount}/${fp.posten.length} Vorschlag | | |`);
    if (fp.hinweise?.length) { L.push(""); L.push(`*Hinweise:* ` + fp.hinweise.map(esc).join(" · ")); }
  } else {
    L.push("_kein Finanzplan erzeugt_");
  }
  L.push("");
  // 6
  L.push(`## 6. Selbstkritik der KI (critiqueFindings)`);
  const cf = g.critiqueFindings || [];
  if (cf.length) {
    for (const f of cf) {
      L.push(`- **[${f.schwere || "?"} · ${f.kategorie || "?"}]** ${f.abschnitt ? "_" + f.abschnitt + ":_ " : ""}${f.vorschlag || f.zitat || ""}`);
    }
  } else L.push("_keine_");
  L.push("");
  // 7
  L.push(`## 7. Fertiger Antrag (Volltext, wie generiert)`);
  L.push("");
  L.push(g.finalText ? g.finalText.trim() : "_kein finalText_");
  L.push("");
  // 8
  L.push(`## 8. Gutachten (Reviewer-Agent)`);
  if (v) {
    L.push(`| Dimension | Score (1–5) |`);
    L.push(`|---|:--:|`);
    L.push(`| Match-Angemessenheit | ${v.matchScore} |`);
    L.push(`| Keine Halluzination | ${v.halluzinationScore} |`);
    L.push(`| Ehrlicher Umgang mit Luecken | ${v.lueckenScore} |`);
    L.push(`| Finanzplan-Plausibilitaet | ${v.finanzplanScore} |`);
    L.push(`| Struktur/Foerderlogik | ${v.strukturScore} |`);
    L.push(`| Konkret statt Floskeln | ${v.floskelnScore} |`);
    L.push(`| **Einreichbarkeit (gesamt)** | **${v.einreichbarkeitScore}** |`);
    L.push("");
    L.push(`**Match:** ${v.matchKommentar}`);
    L.push("");
    L.push(`**Umgang mit Wissensluecken:** ${v.lueckenKommentar}`);
    L.push("");
    L.push(`**Finanzplan:** ${v.finanzplanErfundeneBetraege ? "⚠️ erfundene Betraege — " : ""}${v.finanzplanKommentar}`);
    L.push("");
    if (v.halluzinationFunde?.length) {
      L.push(`**Erfundene/halluzinierte Angaben (${v.halluzinationFunde.length}):**`);
      for (const h of v.halluzinationFunde) L.push(`- „${esc(h.zitat)}" — ${h.warum}`);
      L.push("");
    } else {
      L.push(`**Erfundene/halluzinierte Angaben:** keine gefunden.`);
      L.push("");
    }
    if (v.staerken?.length) { L.push(`**Staerken:** ` + v.staerken.join("; ")); L.push(""); }
    if (v.schwaechen?.length) { L.push(`**Schwaechen:** ` + v.schwaechen.join("; ")); L.push(""); }
    L.push(`**Fazit:** ${v.fazit}`);
  } else {
    L.push("_Gutachten noch nicht verfuegbar._");
  }
  L.push("");
  return L.join("\n");
}

// --- Per-Fall-Dossiers ---
for (const r of index.results) {
  const run = JSON.parse(readFileSync(join(DIR, r.file), "utf8"));
  const v = verdictByNr.get(run.nr);
  writeFileSync(join(DIR, `dossier-${String(run.nr).padStart(2, "0")}.md`), renderDossier(run, v), "utf8");
}

// --- Gesamt-REVIEW.md ---
function renderReview() {
  const s = review.synthese;
  const L = [];
  L.push(`# Qualitaets-Review: Antragswizard bei spaerlichem Input`);
  L.push("");
  L.push(`**Test:** 10 fiktive Grundschulen mit bewusst **knappen, vagen Ideen** durchlaufen den kompletten Prozess (Matching → Interview → fertiger Antrag). Die Interview-Antworten lieferte eine „ueberlastete Lehrkraft"-Persona, die auf fast jede Frage ausweichend antwortet. Frage: **Was macht der Wizard aus so duennem Input?**`);
  L.push("");
  L.push(`**Umgebung:** isolierte Test-DB \`edufunds_test\`, lokaler Server, LLM = DeepSeek. Gesamtkosten der 10 Laeufe: ~0,19 €.`);
  L.push("");
  // Score-Tabelle
  L.push(`## Score-Uebersicht (1–5)`);
  L.push("");
  L.push(`| Fall | Schule | Programm (Match) | Match | k.Halluz. | Luecken | Finanzpl. | Struktur | konkret | **Einreichbar** |`);
  L.push(`|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|`);
  for (const r of index.results) {
    const run = JSON.parse(readFileSync(join(DIR, r.file), "utf8"));
    const v = verdictByNr.get(r.nr);
    const prog = (run.gewaehltesProgramm?.name || "—").slice(0, 32);
    if (v) {
      L.push(`| ${r.nr} | ${run.schule.name} | ${prog} | ${v.matchScore} | ${v.halluzinationScore} | ${v.lueckenScore} | ${v.finanzplanScore} | ${v.strukturScore} | ${v.floskelnScore} | **${v.einreichbarkeitScore}** |`);
    } else {
      L.push(`| ${r.nr} | ${run.schule.name} | ${prog} | – | – | – | – | – | – | – |`);
    }
  }
  L.push("");
  // Durchschnitt
  if (review.verdicts?.length) {
    const avg = (k) => (review.verdicts.reduce((a, v) => a + (v[k] || 0), 0) / review.verdicts.length).toFixed(1);
    L.push(`**Durchschnitt:** Match ${avg("matchScore")} · k.Halluz. ${avg("halluzinationScore")} · Luecken ${avg("lueckenScore")} · Finanzplan ${avg("finanzplanScore")} · Struktur ${avg("strukturScore")} · konkret ${avg("floskelnScore")} · **Einreichbarkeit ${avg("einreichbarkeitScore")}**`);
    L.push("");
  }
  if (s) {
    L.push(`## Gesamtbild`);
    L.push(s.gesamtbild);
    L.push("");
    L.push(`## Wiederkehrende Muster / Schwachstellen`);
    for (const m of s.hauptmuster || []) {
      L.push(`### ${m.titel}`);
      L.push(m.beschreibung);
      if (m.faelle?.length) L.push(`\n*Betroffene Faelle:* ${m.faelle.join(", ")}`);
      L.push("");
    }
    L.push(`## Was der Wizard gut macht`);
    for (const x of s.staerken || []) L.push(`- ${x}`);
    L.push("");
    L.push(`## Empfehlungen (priorisiert)`);
    for (const e of (s.empfehlungen || []).sort((a, b) => ({ hoch: 0, mittel: 1, niedrig: 2 }[a.prioritaet] - { hoch: 0, mittel: 1, niedrig: 2 }[b.prioritaet]))) {
      L.push(`- **[${e.prioritaet}]** ${e.text}`);
    }
    L.push("");
    L.push(`## Kurzfazit je Fall`);
    for (const f of s.fazitProFall || []) {
      L.push(`- **Fall ${f.nr}** ([Dossier](dossier-${String(f.nr).padStart(2, "0")}.md)): ${f.satz}`);
    }
    L.push("");
  }
  L.push(`---`);
  L.push(`*Volle Nachvollziehbarkeit je Fall in \`dossier-01.md\` … \`dossier-10.md\` (Idee → Match → komplettes Interview → Facts → Finanzplan → Selbstkritik → fertiger Antrag → Gutachten).*`);
  return L.join("\n");
}
writeFileSync(join(DIR, "REVIEW.md"), renderReview(), "utf8");
console.log(`Render fertig: ${index.results.length} Dossiers + REVIEW.md in ${DIR}`);
