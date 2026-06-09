/**
 * End-to-End-Re-Run der Pipeline mit dem UAT-Korpus vom 28.04. UND der neuen
 * dedizierten Facts-Extractor-Stage (Bug #5-Fix).
 *
 * Unterschied zu smoke-pipeline-rerun.ts: dort werden die in der DB gespeicherten
 * UAT-Facts (mit den meisten Slots null) an runPipeline gegeben — hier wird
 * extractFacts zuerst auf den Verlauf angewendet, sodass die Pipeline mit einem
 * reichhaltigen Facts-Stand startet. Hypothese: Bug-#2-Restbestaende (KMK-Termini,
 * erfundene Tarif-Berechnungen) sinken weiter, weil weniger Slot-Luecken.
 *
 * Run: `npx tsx --env-file=.env.local scripts/smoke-pipeline-with-extractor.ts`
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { Foerderprogramm } from "../lib/foerderSchema";
import type { GenerationArtefacts, WizardFacts, WizardMessage } from "../lib/wizard/types";
import type { Richtlinie } from "../lib/wizard/richtlinien-schema";
import { runPipeline } from "../lib/wizard/pipeline";
import { extractFacts } from "../lib/wizard/facts-extractor";

const REPO = resolve(__dirname, "..");
const SESSION_TOKEN = "37571430-e26c-448f-aef1-59e902097d1c";
const PROGRAMM_ID = "bmbf-digitalpakt-2";

interface DbAntragData {
  facts: WizardFacts;
  messages: WizardMessage[];
  generation: GenerationArtefacts;
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
  if (!url) throw new Error("DATABASE_URL fehlt");
  const client = new pg.Client(url);
  await client.connect();
  const res = await client.query("SELECT antrag_data FROM ki_antraege WHERE session_token = $1", [SESSION_TOKEN]);
  await client.end();
  if (!res.rows[0]) throw new Error(`Session ${SESSION_TOKEN} nicht gefunden`);
  return res.rows[0].antrag_data as DbAntragData;
}

interface MarkerCheck {
  marker: string;
  beschreibung: string;
  vorherImAntrag: boolean;
  nachherImAntrag: boolean;
  vorherImFinanzplan: boolean;
  nachherImFinanzplan: boolean;
}

const HALLU_MARKER: Array<{ marker: string; beschreibung: string }> = [
  { marker: "123/2026", beschreibung: "Erfundenes Aktenzeichen Schultraeger-Schreiben" },
  { marker: "Berlin-Mitte", beschreibung: "Falscher Bezirk (Borsigwalde liegt in Reinickendorf)" },
  { marker: "380", beschreibung: "Erfundene Gesamt-Schuelerzahl (User: keine genannt)" },
  { marker: "Willkommensklass", beschreibung: "Erfundene Schul-Einrichtung (User hat nie erwaehnt)" },
  { marker: "12.12.2025", beschreibung: "Erfundenes Schulkonferenz-Beschluss-Datum" },
  { marker: "15.03.2026", beschreibung: "Erfundenes Schultraeger-Schreiben-Datum" },
  { marker: "TV-L", beschreibung: "Erfundene Tarif-Stufe fuer IT-Support" },
  { marker: "1234/56789", beschreibung: "Erfundene Haushaltsstelle" },
];

function checkMarker(text: string, finanzplanText: string, oldText: string, oldFinanzplanText: string): MarkerCheck[] {
  return HALLU_MARKER.map((m) => ({
    marker: m.marker,
    beschreibung: m.beschreibung,
    vorherImAntrag: oldText.includes(m.marker),
    nachherImAntrag: text.includes(m.marker),
    vorherImFinanzplan: oldFinanzplanText.includes(m.marker),
    nachherImFinanzplan: finanzplanText.includes(m.marker),
  }));
}

function renderFinanzplan(plan: GenerationArtefacts["finanzplan"]): string {
  if (!plan) return "";
  return JSON.stringify(plan, null, 2);
}

function reconstructOldDraft(gen: GenerationArtefacts): string {
  const parts: string[] = [];
  if (gen.outline?.titel) {
    parts.push(`# ${gen.outline.titel}`, "");
  }
  for (const s of gen.sections ?? []) {
    parts.push(`## ${s.name}`, "", s.text, "");
  }
  return parts.join("\n");
}

async function main() {
  console.log("=".repeat(80));
  console.log("Pipeline End-to-End Re-Run mit geschaerftem Critique");
  console.log("=".repeat(80));

  const [programm, richtlinie, session] = await Promise.all([loadProgramm(), loadRichtlinie(), loadSession()]);
  console.log(`Programm: ${programm.name}`);
  console.log(`User-Antworten: ${session.messages.filter((m) => m.role === "user" && m.kind === "answer").length}`);

  // Vorher-Texte aus dem UAT-State (in DB unter generation):
  const oldText = (session.generation.finalText ?? "") + "\n" + reconstructOldDraft(session.generation);
  const oldFinanzplanText = renderFinanzplan(session.generation.finanzplan);
  console.log(`Vorher: finalText ${session.generation.finalText?.length ?? 0} Zeichen, finanzplan ${oldFinanzplanText.length} Zeichen`);

  // STAGE 1: dedizierter Facts-Extractor auf leeren Stand — wir wollen sehen,
  // wie reichhaltig der Verlauf wirklich ist, statt die UAT-Facts (mit den
  // ganzen null-Slots) durchzuschleifen.
  console.log("\n>>> Facts-Extractor startet (auf LEEREN Stand) ...");
  const t0Ext = Date.now();
  const extracted = await extractFacts(session.messages, {});
  const extDt = ((Date.now() - t0Ext) / 1000).toFixed(1);
  console.log(`Extractor fertig in ${extDt}s, Slots:`);
  console.log(JSON.stringify(extracted.facts, null, 2).split("\n").map((l) => "    " + l).join("\n"));

  const richFacts = extracted.facts;

  // STAGE 2: Pipeline mit reichen Facts:
  console.log("\n>>> Pipeline-Lauf startet ...");
  const t0 = Date.now();
  const events: string[] = [];
  const result = await runPipeline(
    programm,
    richFacts,
    richtlinie,
    (e) => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      events.push(`[${elapsed}s] ${e.stage}: ${e.message}`);
      console.log(`  [${elapsed}s] ${e.stage}: ${e.message}`);
    },
    session.messages
  );
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nPipeline fertig in ${totalSec}s`);

  // Token-Verbrauch:
  let totalTokens = 0;
  for (const u of result.usages) totalTokens += u.usage.promptTokens + u.usage.candidatesTokens;
  console.log(`Calls: ${result.usages.length}, Tokens gesamt: ${totalTokens}`);

  // Critique-Findings-Stats:
  const findings = result.artefacts.critiqueFindings ?? [];
  const hoch = findings.filter((f) => f.schwere === "hoch").length;
  const beleg = findings.filter((f) => f.kategorie === "belegluecke").length;
  console.log(`Critique-Findings: ${findings.length} (hoch=${hoch}, belegluecke=${beleg})`);

  // Recheck-Resolutions:
  const resolutions = result.artefacts.critiqueResolutions ?? [];
  const geschlossen = resolutions.filter((r) => r.status === "geschlossen").length;
  const teilweise = resolutions.filter((r) => r.status === "teilweise").length;
  const offen = resolutions.filter((r) => r.status === "offen").length;
  console.log(`Recheck-Resolutions: ${resolutions.length} (geschlossen=${geschlossen}, teilweise=${teilweise}, offen=${offen})`);

  // Halluzinations-Marker im finalen Output:
  const newFinanzplanText = renderFinanzplan(result.artefacts.finanzplan);
  const checks = checkMarker(result.artefacts.finalText ?? "", newFinanzplanText, oldText, oldFinanzplanText);

  console.log("\n=== HALLUZINATIONS-MARKER im finalen Antrag ===");
  console.log("(Vorher = im UAT-Output 28.04. drinnen, Nachher = im neuen Re-Run)");
  console.log("");
  let regressionen = 0;
  let erfolge = 0;
  let neuauftritt = 0;
  for (const c of checks) {
    const vorherFlag = c.vorherImAntrag || c.vorherImFinanzplan;
    const nachherFlag = c.nachherImAntrag || c.nachherImFinanzplan;
    let icon = "  "; // unverändert
    if (vorherFlag && !nachherFlag) {
      icon = "✓"; // erfolgreich entfernt
      erfolge++;
    } else if (!vorherFlag && nachherFlag) {
      icon = "✗"; // neu aufgetaucht
      neuauftritt++;
    } else if (vorherFlag && nachherFlag) {
      icon = "—"; // weiterhin drin
      regressionen++;
    }
    const where = nachherFlag ? `[noch in: ${c.nachherImAntrag ? "Antrag" : ""}${c.nachherImAntrag && c.nachherImFinanzplan ? "+" : ""}${c.nachherImFinanzplan ? "Finanzplan" : ""}]` : "";
    console.log(`  ${icon} "${c.marker}"  ${c.beschreibung}  ${where}`);
  }
  console.log(`\nZusammenfassung: ${erfolge} entfernt, ${regressionen} weiterhin drin, ${neuauftritt} neu aufgetaucht`);

  // Finalen Text speichern fuer manuelle Inspektion:
  const outDir = resolve(REPO, "tmp");
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "pipeline-extractor-finaltext.md"), result.artefacts.finalText ?? "");
  await writeFile(resolve(outDir, "pipeline-extractor-finanzplan.json"), newFinanzplanText);
  await writeFile(
    resolve(outDir, "pipeline-extractor-critique.json"),
    JSON.stringify({ findings, resolutions }, null, 2)
  );
  await writeFile(
    resolve(outDir, "pipeline-extractor-facts.json"),
    JSON.stringify(richFacts, null, 2)
  );
  console.log(`\nOutputs in ${outDir}/pipeline-extractor-*.{md,json}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
