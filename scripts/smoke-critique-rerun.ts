/**
 * A/B-Re-Test der geschaerften Critique-Stage.
 *
 * Laedt die UAT-Session 37571430-... aus der Dev-DB (28.04.-Lauf), rekonstruiert
 * den Draft aus den gespeicherten Outline+Sections und ruft die geschaerfte
 * Critique-Stage mit den User-Antworten + Facts als zusaetzlichem Input auf.
 *
 * Vergleicht die neue Findings-Liste gegen die im DB-State gespeicherte alte
 * Findings-Liste (aus dem ungeschaerften Critique-Lauf).
 *
 * Run: `npx tsx --env-file=.env.local scripts/smoke-critique-rerun.ts`
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { CritiqueFinding, GenerationArtefacts, WizardFacts, WizardMessage } from "../lib/wizard/types";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";
import { CRITIQUE_SYSTEM, buildCritiquePrompt } from "../lib/wizard/prompts";
import { MODEL_PRO, generateJson } from "../lib/wizard/llm";

const REPO = resolve(__dirname, "..");
const SESSION_TOKEN = "37571430-e26c-448f-aef1-59e902097d1c";
const PROGRAMM_ID = "bmbf-digitalpakt-2";

interface DbAntragData {
  facts: WizardFacts;
  messages: WizardMessage[];
  generation: GenerationArtefacts;
}

function renderDraft(outline: GenerationArtefacts["outline"], sections: GenerationArtefacts["sections"]): string {
  if (!outline || !sections) return "";
  const parts: string[] = [outline.titel, ""];
  for (const s of sections) {
    parts.push(s.name);
    parts.push("");
    parts.push(s.text);
    parts.push("");
  }
  return parts.join("\n");
}

async function loadProgramm(): Promise<Foerderprogramm> {
  const raw = await readFile(resolve(REPO, "data/foerderprogramme.json"), "utf-8");
  const list = JSON.parse(raw) as Foerderprogramm[];
  const p = list.find((x) => x.id === PROGRAMM_ID);
  if (!p) throw new Error(`Programm ${PROGRAMM_ID} nicht gefunden`);
  return p;
}

async function loadRichtlinie(): Promise<Richtlinie | null> {
  try {
    const raw = await readFile(resolve(REPO, `data/richtlinien/${PROGRAMM_ID}.json`), "utf-8");
    return JSON.parse(raw) as Richtlinie;
  } catch {
    return null;
  }
}

async function loadSession(): Promise<DbAntragData> {
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt in .env.local");
  const client = new pg.Client(url);
  await client.connect();
  const res = await client.query("SELECT antrag_data FROM ki_antraege WHERE session_token = $1", [SESSION_TOKEN]);
  await client.end();
  if (!res.rows[0]) throw new Error(`Session ${SESSION_TOKEN} nicht gefunden`);
  return res.rows[0].antrag_data as DbAntragData;
}

interface Critique {
  zusammenfassung?: string;
  findings: CritiqueFinding[];
}

function summarize(findings: CritiqueFinding[], label: string) {
  console.log(`\n=== ${label} (n=${findings.length}) ===`);
  const bySchwere = { hoch: 0, mittel: 0, niedrig: 0 };
  const byKategorie: Record<string, number> = {};
  for (const f of findings) {
    bySchwere[f.schwere]++;
    byKategorie[f.kategorie] = (byKategorie[f.kategorie] ?? 0) + 1;
  }
  console.log(`Schwere: hoch=${bySchwere.hoch} · mittel=${bySchwere.mittel} · niedrig=${bySchwere.niedrig}`);
  console.log(`Kategorie: ${Object.entries(byKategorie).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  console.log("---");
  findings.forEach((f, i) => {
    console.log(`${i + 1}. [${f.schwere.toUpperCase()} · ${f.kategorie} · ${f.abschnitt}]`);
    console.log(`   "${f.zitat}"`);
    console.log(`   → ${f.vorschlag.slice(0, 150)}${f.vorschlag.length > 150 ? "..." : ""}`);
  });
}

async function main() {
  console.log("=".repeat(80));
  console.log("Critique A/B-Re-Test");
  console.log(`Session: ${SESSION_TOKEN}`);
  console.log(`Programm: ${PROGRAMM_ID}`);
  console.log("=".repeat(80));

  const [programm, richtlinie, session] = await Promise.all([loadProgramm(), loadRichtlinie(), loadSession()]);

  const draft = renderDraft(session.generation.outline, session.generation.sections);
  if (!draft) throw new Error("Draft konnte nicht rekonstruiert werden — outline/sections fehlen");
  const userAnswers = session.messages
    .filter((m) => m.role === "user" && m.kind === "answer")
    .map((m) => m.content);

  console.log(`\nDraft-Laenge: ${draft.length} Zeichen`);
  console.log(`User-Antworten: ${userAnswers.length}`);
  console.log(`Facts-Schluessel: ${Object.keys(session.facts).join(", ")}`);

  // VORHER (aus DB, ungeschaerfter Critique-Lauf vom 28.04.):
  const oldFindings = (session.generation.critiqueFindings ?? []) as CritiqueFinding[];
  summarize(oldFindings, "VORHER (UAT 28.04., alter CRITIQUE_SYSTEM)");

  // NACHHER (jetzt, mit geschaerftem Critique + User-Antworten + Facts als Input):
  console.log("\n>>> Rufe NEUEN Critique auf (mit User-Antworten + Facts) ...");
  const t0 = Date.now();
  const prompt = buildCritiquePrompt(programm, draft, richtlinie, userAnswers, session.facts);
  console.log(`Prompt-Laenge: ${prompt.length} Zeichen, ~${Math.round(prompt.length / 4)} Tokens`);
  const res = await generateJson<Critique>(MODEL_PRO, CRITIQUE_SYSTEM, prompt, { maxTokens: 8000 });
  console.log(`Latenz: ${((Date.now() - t0) / 1000).toFixed(1)}s, Tokens prompt=${res.usage.promptTokens} compl=${res.usage.candidatesTokens}`);

  const newFindings = (res.value.findings ?? []) as CritiqueFinding[];
  summarize(newFindings, "NACHHER (geschaerfter CRITIQUE_SYSTEM + User-Input)");

  console.log("\n=== DELTA ===");
  console.log(`Findings: ${oldFindings.length} → ${newFindings.length} (Delta ${newFindings.length - oldFindings.length})`);
  const oldHoch = oldFindings.filter((f) => f.schwere === "hoch").length;
  const newHoch = newFindings.filter((f) => f.schwere === "hoch").length;
  console.log(`Schwere "hoch": ${oldHoch} → ${newHoch}`);
  const oldBeleg = oldFindings.filter((f) => f.kategorie === "belegluecke").length;
  const newBeleg = newFindings.filter((f) => f.kategorie === "belegluecke").length;
  console.log(`Kategorie "belegluecke": ${oldBeleg} → ${newBeleg}`);

  // Halluzinations-Marker-Suche im neuen Output:
  const halluMarker = ["123/2026", "Berlin-Mitte", "380", "Willkommensklass", "12.12.2025", "15.03.2026", "TV-L", "1234/56789"];
  console.log(`\nHalluzinations-Marker (Erwartung: erkannt im neuen Critique):`);
  for (const m of halluMarker) {
    const found = newFindings.some((f) => f.zitat.includes(m) || f.vorschlag.includes(m));
    console.log(`  ${found ? "✓" : "✗"} "${m}" ${found ? "erkannt" : "NICHT erkannt"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
