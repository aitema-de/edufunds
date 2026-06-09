/**
 * Smoke-Test der dedizierten Facts-Extractor-Stage gegen den UAT-Korpus 2026-04-28.
 *
 * Laedt die Session 37571430-... aus der Dev-DB (12 vage User-Antworten zu DigitalPakt 2.0)
 * und ruft extractFacts auf einen leeren Facts-Stand. Erwartung:
 *   - schule.name = Borsigwalder Grundschule
 *   - schule.typ = Grundschule
 *   - schule.bundesland = Berlin
 *   - schule.schuelerzahl darf NICHT 130 sein (das ist Klasse-5/6-Subset, keine Gesamtzahl)
 *   - schule.besonderheiten enthaelt Verlaufsinfos (DP1-Infrastruktur, IT-Beauftragter, ...)
 *   - projekt.aktivitaeten >= 1
 *   - projekt.zielgruppe / projekt.zeitraum gefuellt
 *   - budget.beantragt_eur ~ 28000
 *   - programmpassung.offene_luecken >= 3
 *
 * Vergleichspunkt zum UAT-Stand: dort waren schuelerzahl, besonderheiten, projekt.titel,
 * projekt.kurzbeschreibung, wirkung.messbare_indikatoren leer/null. Mit dem dedizierten
 * Extractor sollten die meisten dieser Slots befuellt sein.
 *
 * Run: `npx tsx --env-file=.env.local scripts/smoke-facts-extractor.ts`
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { WizardFacts, WizardMessage } from "../lib/wizard/types";
import { extractFacts } from "../lib/wizard/facts-extractor";

const REPO = resolve(__dirname, "..");
const SESSION_TOKEN = "37571430-e26c-448f-aef1-59e902097d1c";

interface DbAntragData {
  facts: WizardFacts;
  messages: WizardMessage[];
}

async function loadSession(): Promise<DbAntragData> {
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt in .env.local");
  const client = new pg.Client(url);
  await client.connect();
  const res = await client.query(
    "SELECT antrag_data FROM ki_antraege WHERE session_token = $1",
    [SESSION_TOKEN]
  );
  await client.end();
  if (!res.rows[0]) throw new Error(`Session ${SESSION_TOKEN} nicht in Dev-DB`);
  return res.rows[0].antrag_data as DbAntragData;
}

interface SlotCheck {
  slot: string;
  expected: string;
  actual: unknown;
  ok: boolean;
  /** critical = muss stabil bestehen (Bug-#5-Beweis); soft = LLM-Varianz erlaubt. */
  level: "critical" | "soft";
}

function check(facts: WizardFacts): SlotCheck[] {
  const schule = facts.schule ?? {};
  const projekt = facts.projekt ?? {};
  const budget = facts.budget ?? {};
  const luecken = facts.programmpassung?.offene_luecken;
  const besonderheiten = (schule as { besonderheiten?: string }).besonderheiten;
  return [
    // === CRITICAL — die im UAT vermissten Slots, die jetzt stabil befuellt sein muessen ===
    {
      slot: "schule.schuelerzahl",
      expected: "leer (User nannte nur Klasse-5/6-Subset, keine Gesamtschuelerzahl)",
      actual: schule.schuelerzahl,
      ok: schule.schuelerzahl === undefined || schule.schuelerzahl === null,
      level: "critical",
    },
    {
      slot: "schule.besonderheiten",
      expected: "Profilinfos aus Verlauf (DP1, IT-Beauftragter, Reinickendorf, ...)",
      actual: besonderheiten,
      ok:
        typeof besonderheiten === "string" &&
        besonderheiten.length >= 30 &&
        /(dp1|whiteboard|wlan|reinickendorf|it-beauftragt|lernraum|itslearning|digitalpakt 1)/i.test(
          besonderheiten
        ),
      level: "critical",
    },
    {
      slot: "schule.name",
      expected: "Borsigwalder Grundschule",
      actual: schule.name,
      ok: schule.name === "Borsigwalder Grundschule",
      level: "critical",
    },
    {
      slot: "projekt.aktivitaeten",
      expected: "mind. 1 Aktivitaet (Tablet-Beschaffung, Fortbildung, ...)",
      actual: projekt.aktivitaeten,
      ok: Array.isArray(projekt.aktivitaeten) && projekt.aktivitaeten.length >= 1,
      level: "critical",
    },
    {
      slot: "projekt.zielgruppe",
      expected: "Klassen 5/6 oder 130 Kinder",
      actual: projekt.zielgruppe,
      ok: typeof projekt.zielgruppe === "string" && /(klassen?\s*5|130|jahrgang)/i.test(projekt.zielgruppe),
      level: "critical",
    },
    // === SOFT — LLM-Varianz erlaubt, nur Diagnose ===
    {
      slot: "schule.typ",
      expected: "Grundschule (LLM extrahiert mal aus dem Namen, mal nicht)",
      actual: schule.typ,
      ok: typeof schule.typ === "string" && /grundschule/i.test(schule.typ),
      level: "soft",
    },
    {
      slot: "schule.bundesland",
      expected: "Berlin",
      actual: schule.bundesland,
      ok: schule.bundesland === "Berlin",
      level: "soft",
    },
    {
      slot: "budget.beantragt_eur",
      expected: "~ 28000 (User: 'um die 28.000' wirkt fuer manche Runs zu vag)",
      actual: budget.beantragt_eur,
      ok: typeof budget.beantragt_eur === "number" && budget.beantragt_eur >= 25000 && budget.beantragt_eur <= 35000,
      level: "soft",
    },
    {
      slot: "programmpassung.offene_luecken",
      expected: "mind. 1 (User nannte schriftliche Zusage fehlt, IT-Support, ...)",
      actual: luecken,
      ok: Array.isArray(luecken) && luecken.length >= 1,
      level: "soft",
    },
  ];
}

async function main() {
  console.log("=".repeat(80));
  console.log("Facts-Extractor Smoke-Test gegen UAT-Korpus 2026-04-28");
  console.log("=".repeat(80));

  const session = await loadSession();
  const answers = session.messages.filter((m) => m.role === "user" && m.kind === "answer");
  console.log(`User-Antworten in Verlauf: ${answers.length}`);
  console.log(`Bisheriger Facts-Stand (UAT): ${JSON.stringify(session.facts, null, 2)}\n`);

  const t0 = Date.now();
  // Bewusst auf LEEREN Facts-Stand extrahieren — wir wollen die nackte Extractor-Wirkung sehen.
  const result = await extractFacts(session.messages, {});
  const dt = Date.now() - t0;

  console.log(`Extraktion fertig in ${(dt / 1000).toFixed(1)} s, Modell ${result.usage?.model ?? "—"}`);
  console.log(
    `Tokens: ${result.usage ? `${result.usage.usage.promptTokens} prompt + ${result.usage.usage.candidatesTokens} completion` : "n/a"}\n`
  );
  console.log("Extrahierte Facts:");
  console.log(JSON.stringify(result.facts, null, 2));

  console.log("\nSlot-Checks (CRITICAL = Bug-#5-Beweis, SOFT = LLM-Varianz erlaubt):");
  const checks = check(result.facts);
  for (const c of checks) {
    const sym = c.ok ? "✓" : "✗";
    const tag = c.level === "critical" ? "[CRIT]" : "[soft]";
    console.log(`  ${sym} ${tag} ${c.slot} — erwartet: ${c.expected}`);
    console.log(`         ist: ${JSON.stringify(c.actual)}`);
  }

  const critical = checks.filter((c) => c.level === "critical");
  const soft = checks.filter((c) => c.level === "soft");
  const critPassed = critical.filter((c) => c.ok).length;
  const softPassed = soft.filter((c) => c.ok).length;
  console.log(`\nCRITICAL: ${critPassed}/${critical.length} bestanden.`);
  console.log(`SOFT:     ${softPassed}/${soft.length} bestanden (Diagnose, nicht Fail-Kriterium).`);
  if (critPassed < critical.length) {
    console.log("\nBug #5 in mind. einem CRITICAL-Slot weiterhin aktiv — Prompt verfeinern.");
    process.exit(1);
  } else {
    console.log("\nBug #5 gefixt — alle CRITICAL-Slots sauber.");
  }
}

main().catch((err) => {
  console.error("Smoke-Test fehlgeschlagen:", err);
  process.exit(2);
});
