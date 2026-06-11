/**
 * wizard-e2e-probe.mjs — Autonomer End-zu-Ende-Qualitaetstest des Antragswizards.
 *
 * Zweck: Pruefen, wie gut ein Antrag wird, wenn der Antragsteller nur SEHR
 * spaerliche, vage Infos liefert. Pro fiktiver Schule + knapper Idee laeuft der
 * KOMPLETTE Prozess: Matching -> Wizard-Start -> adaptives Interview (beantwortet
 * von einer "ueberlastete Lehrkraft"-LLM-Persona, die knapp/unpraezise antwortet)
 * -> Antragsgenerierung inkl. Finanzplan. Alle Zwischenschritte werden erfasst.
 *
 * Laeuft gegen den isolierten Dev-Server auf :3190 (DB = edufunds_test).
 * Persona-Antworten via DeepSeek direkt (Key aus .env.local).
 *
 * Output: .planning/wizard-probe/run-NN-<programmId>.json (volles Dossier je Lauf)
 *         + .planning/wizard-probe/_index.json (Uebersicht)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "/home/kolja/edufunds-app";
const BASE = process.env.PROBE_BASE || "http://localhost:3190";
const OUT = join(REPO, ".planning", "wizard-probe");
const CONCURRENCY = Number(process.env.PROBE_CONCURRENCY || 3);

// --- DeepSeek-Key aus .env.local lesen ---
function readEnvLocal() {
  const txt = readFileSync(join(REPO, ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const ENV = readEnvLocal();
const DEEPSEEK_KEY = ENV.DEEPSEEK_API_KEY;
if (!DEEPSEEK_KEY) {
  console.error("FEHLER: DEEPSEEK_API_KEY nicht in .env.local gefunden");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Die 10 fiktiven Schulen + bewusst KNAPP/VAGE formulierte Ideen ---
const CASES = [
  { nr: 1, schule: { name: "Grundschule am Lindenpark", typ: "Grundschule", bundesland: "DE-BE" }, idee: "Wir wollen was mit Tablets machen." },
  { nr: 2, schule: { name: "Astrid-Lindgren-Grundschule", typ: "Grundschule", bundesland: "DE-NI" }, idee: "Den Schulhof schoener machen." },
  { nr: 3, schule: { name: "Grundschule Sonnenblume", typ: "Grundschule", bundesland: "DE-BY" }, idee: "Mehr Bewegung fuer die Kinder." },
  { nr: 4, schule: { name: "Grundschule Buchenweg", typ: "Grundschule", bundesland: "DE-NW" }, idee: "Lesen foerdern, viele koennen schlecht lesen." },
  { nr: 5, schule: { name: "Grundschule Am Muehlbach", typ: "Grundschule", bundesland: "DE-BW" }, idee: "Irgendwas gegen Mobbing." },
  { nr: 6, schule: { name: "Pestalozzi-Grundschule", typ: "Grundschule", bundesland: "DE-SN" }, idee: "Wir braeuchten neue Musikinstrumente." },
  { nr: 7, schule: { name: "Grundschule Regenbogen", typ: "Grundschule", bundesland: "DE-HE" }, idee: "Einen Garten anlegen mit den Kindern." },
  { nr: 8, schule: { name: "Grundschule Kleeblatt", typ: "Grundschule", bundesland: "DE-SH" }, idee: "Kinder sollen programmieren lernen oder so." },
  { nr: 9, schule: { name: "Grundschule Am Wald", typ: "Grundschule", bundesland: "DE-BB" }, idee: "Viele Kinder sprechen kaum Deutsch, da muessen wir was tun." },
  { nr: 10, schule: { name: "Janusz-Korczak-Grundschule", typ: "Grundschule", bundesland: "DE-TH" }, idee: "Gesundes Essen zum Thema machen." },
];

// --- HTTP-Helfer gegen den Wizard-Server ---
async function api(path, body, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, {
      method: body === undefined ? "GET" : "POST",
      // x-forwarded-for=127.0.0.1 triggert den Dev-Bypass des Rate-Limiters
      // (lib/rate-limit.ts: NODE_ENV=development + 127.0.0.1 -> nicht limitiert).
      // Unter WSL kommt localhost sonst als ::ffff:127.0.0.1 an und wird limitiert.
      headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

// --- Persona: ueberlastete Lehrkraft, antwortet knapp & vage ---
async function personaAnswer({ idee, schule, frage, gestellteFragen, istKlaerung }) {
  const klaerungsRegel = istKlaerung
    ? `\n\nDIES IST EINE SCHWERPUNKT-/KLAERUNGSFRAGE VOR DEM EIGENTLICHEN INTERVIEW. Entscheide dich hier KNAPP fuer GENAU DAS Themenfeld, das deinem Anliegen am naechsten liegt (z. B. bei "Mehr Bewegung" → "Sport/Bewegung"; bei "gesundes Essen" → "Ernaehrung/gesunde Schulverpflegung"). Erfinde KEIN neues Thema, waehle das naechstliegende. 1 kurzer Satz.`
    : "";
  const sys = `Du bist die gestresste Schulleitung einer kleinen Grundschule und hast kaum Zeit. Eine Foerdermittel-Plattform stellt dir Interview-Fragen zu einem Projekt.
Dein urspruengliches Anliegen, knapp formuliert: "${idee}".
Schule: ${schule.name} (${schule.typ}).

Antworte auf JEDE Frage bewusst KNAPP und UNPRAEZISE, so wie eine ueberlastete Lehrkraft, die sich noch keine Gedanken gemacht hat:
- Maximal 1 kurzer Satz (oft nur ein Halbsatz).
- KAUM konkrete Zahlen. Wenn nach Betraegen/Mengen/Terminen gefragt wird, weiche aus ("weiss ich nicht genau", "muessten wir noch ueberlegen", "so ungefaehr halt").
- ERFINDE KEINE Details, Partner, Studien oder Zahlen. Lieber vage bleiben als ausschmuecken.
- Bleib beim urspruenglichen Anliegen, schweife nicht in fremde Themen ab.
- Keine Hoeflichkeitsfloskeln, keine Rueckfragen. Nur die knappe Antwort.${klaerungsRegel}`;
  const usr = `Frage der Plattform: "${frage}"

Bisher schon gefragt: ${gestellteFragen.length ? gestellteFragen.map((q) => `"${q}"`).join("; ") : "(noch nichts)"}

Deine knappe, vage Antwort:`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          temperature: 0.6,
          max_tokens: 80,
        }),
      });
      const j = await res.json();
      let a = j?.choices?.[0]?.message?.content?.trim();
      if (a) {
        a = a.replace(/^["'\s]+|["'\s]+$/g, "");
        if (a.length > 0) return a;
      }
    } catch (e) {
      // retry
    }
    await sleep(1500);
  }
  // Fallback, damit der Wizard nicht mit leerer Antwort blockiert
  return "Weiss ich noch nicht genau, muessten wir ueberlegen.";
}

// --- Ein kompletter Antragsdurchlauf ---
async function runCase(c) {
  const log = (m) => console.log(`[Fall ${String(c.nr).padStart(2, "0")}] ${m}`);
  const dossier = {
    nr: c.nr,
    schule: c.schule,
    idee: c.idee,
    startedAt: new Date().toISOString(),
    match: null,
    matchClarification: null,
    gewaehltesProgramm: null,
    sessionToken: null,
    transcript: [], // [{ runde, frage, rationale, antwort, factsNach }]
    finalState: null,
    finishedAt: null,
    error: null,
  };

  try {
    // 1) MATCHING (knappe Idee rein). Klaerungsfragen des Matchers werden
    // beantwortet (statt mit forceRanking ueberfahren) — so wirkt die
    // Klaerungs-Staerke des Matchers bei vagem Input. forceRanking erst als
    // letzte Instanz nach 2 Klaerungsrunden.
    log(`Matching: "${c.idee}"`);
    let anliegen = c.idee;
    let match = await api("/api/match", {
      anliegen,
      schulname: c.schule.name,
      schultyp: c.schule.typ,
      bundesland: c.schule.bundesland,
    }, 90000);

    const klaerungen = [];
    for (let kr = 0; kr < 2 && match.json?.kind === "clarification"; kr++) {
      klaerungen.push(match.json.question);
      const klarAntwort = await personaAnswer({
        idee: c.idee, schule: c.schule, frage: match.json.question, gestellteFragen: [], istKlaerung: true,
      });
      log(`Match-Klaerung beantwortet: "${klarAntwort}"`);
      anliegen = `${anliegen} — ${klarAntwort}`;
      // forceRanking IMMER beim Re-Match: die beantwortete Klaerung schaerft das
      // Anliegen, aber der Matcher MUSS jetzt ranken (sonst kann er eine leere
      // Liste zurueckgeben -> Fall faellt ganz aus). forceRanking unterdrueckt
      // zudem eine erneute CLARIFY, sodass die Schleife nach 1 Runde endet.
      match = await api("/api/match", {
        anliegen,
        schulname: c.schule.name, schultyp: c.schule.typ, bundesland: c.schule.bundesland,
        previousAnliegen: c.idee, forceRanking: true,
      }, 90000);
    }
    if (klaerungen.length) dossier.matchClarification = klaerungen.length === 1 ? klaerungen[0] : klaerungen;
    dossier.match = match.json;
    const top = match.json?.matches?.[0];
    if (!top) throw new Error(`Kein Match (status ${match.status}): ${JSON.stringify(match.json).slice(0, 200)}`);
    dossier.gewaehltesProgramm = { id: top.id, name: top.programm?.name, score: top.score, passt_weil: top.passt_weil };
    log(`Top-Treffer: ${top.programm?.name} (Score ${top.score})`);

    // 2) WIZARD-START
    const start = await api("/api/wizard/start", {
      programmId: top.id,
      seedFacts: { schule: { name: c.schule.name, typ: c.schule.typ, bundesland: c.schule.bundesland } },
    }, 90000);
    if (start.status !== 200 || !start.json?.sessionToken) {
      throw new Error(`Start fehlgeschlagen (status ${start.status}): ${JSON.stringify(start.json).slice(0, 200)}`);
    }
    const token = start.json.sessionToken;
    dossier.sessionToken = token;
    let phase = start.json.phase;
    let frage = start.json.question?.content || null;
    let rationale = start.json.question?.rationale || null;
    const gestellteFragen = [];
    log(`Interview gestartet (Programm-Richtlinie: ${start.json.richtlinieStatus?.available ? "vorhanden" : "fehlt"})`);

    // 3) INTERVIEW-SCHLEIFE
    let runde = 0;
    const MAX_TURNS = 20;
    while (phase === "interviewing" && frage && runde < MAX_TURNS) {
      runde++;
      gestellteFragen.push(frage);
      const antwort = await personaAnswer({ idee: c.idee, schule: c.schule, frage, gestellteFragen });
      log(`F${runde}: ${frage.slice(0, 60)}...  -> A: ${antwort.slice(0, 50)}`);

      // Antwort senden, 503=retrybar
      let ans;
      for (let retry = 0; retry < 3; retry++) {
        ans = await api("/api/wizard/answer", { sessionToken: token, answer: antwort }, 90000);
        if (ans.status === 503 && ans.json?.retryable) { await sleep(2000); continue; }
        break;
      }
      if (ans.status !== 200) throw new Error(`answer fehlgeschlagen (status ${ans.status}): ${JSON.stringify(ans.json).slice(0, 200)}`);

      dossier.transcript.push({ runde, frage, rationale, antwort, factsNach: ans.json.facts });
      phase = ans.json.phase;
      frage = ans.json.question?.content || null;
      rationale = ans.json.question?.rationale || null;
    }
    log(`Interview fertig nach ${runde} Fragen, Phase=${phase}`);

    // 4) GENERIERUNG (synchron, bis 5 Min)
    log("Generiere Antrag (Pipeline laeuft, bis ~2-3 Min)...");
    const gen = await api("/api/wizard/generate", { sessionToken: token }, 300000);
    if (gen.status !== 200) {
      // evtl. lief sie schon -> pollen
      log(`generate status ${gen.status}: ${JSON.stringify(gen.json).slice(0, 150)} — polle State`);
    }

    // 5) KANONISCHER VOLLSTATE
    const state = await api(`/api/wizard/${token}`, undefined, 60000);
    dossier.finalState = state.json;
    const g = state.json?.generation;
    log(`FERTIG. Abschnitte: ${g?.sections?.length ?? 0}, Finanzplan-Posten: ${g?.finanzplan?.posten?.length ?? 0}, finalText: ${g?.finalText ? g.finalText.length + " Zeichen" : "FEHLT"}, Tokens: ${state.json?.costs?.usedTokens ?? "?"}`);
  } catch (e) {
    dossier.error = String(e?.message || e);
    console.error(`[Fall ${c.nr}] FEHLER: ${dossier.error}`);
  }

  dossier.finishedAt = new Date().toISOString();
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const fname = `run-${String(c.nr).padStart(2, "0")}-${dossier.gewaehltesProgramm?.id || "nomatch"}.json`;
  writeFileSync(join(OUT, fname), JSON.stringify(dossier, null, 2), "utf8");
  return { nr: c.nr, file: fname, programm: dossier.gewaehltesProgramm?.name || null, fragen: dossier.transcript.length, error: dossier.error, finalTextLen: dossier.finalState?.generation?.finalText?.length || 0 };
}

// --- Pool-Runner mit begrenzter Parallelitaet ---
async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const only = (process.env.PROBE_ONLY || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const cases = only.length ? CASES.filter((c) => only.includes(c.nr)) : CASES;
  console.log(`Starte ${cases.length} E2E-Laeufe gegen ${BASE} (Parallelitaet ${CONCURRENCY})${only.length ? " [nur " + only.join(",") + "]" : ""}`);
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < cases.length) {
      const c = cases[idx++];
      const r = await runCase(c);
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, worker));
  results.sort((a, b) => a.nr - b.nr);
  writeFileSync(join(OUT, "_index.json"), JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, results }, null, 2), "utf8");
  console.log("\n=== ZUSAMMENFASSUNG ===");
  for (const r of results) {
    console.log(`Fall ${String(r.nr).padStart(2, "0")}: ${r.error ? "FEHLER " + r.error : `${r.programm} · ${r.fragen} Fragen · Antrag ${r.finalTextLen} Zeichen`}`);
  }
  console.log(`\nDossiers in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
