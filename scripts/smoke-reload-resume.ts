/**
 * Smoke-Test fuer WIZ-04 Reload-Resume (Plan 02.1-06).
 * Nutzung: `npx tsx --env-file=.env.local scripts/smoke-reload-resume.ts`
 * Voraussetzung: Dev-Server + Dev-DB-Tunnel aktiv (./scripts/dev-db-tunnel.sh --bg)
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const REPO = resolve(__dirname, "..");
const BASE_URL = process.env.RELOAD_RESUME_BASE_URL ?? "http://localhost:3101";

/** Schwellenwert in Sekunden: stalenessWarning wenn stageAt aelter als dieser Wert */
const STALE_THRESHOLD_SECONDS = 60;

interface SessionRow {
  session_token: string;
  phase: string;
}

interface WizardApiResponse {
  phase?: string;
  generation?: {
    stage?: string;
    stageAt?: string;
    finalText?: string;
  };
  error?: string;
}

async function loadDatabaseUrl(): Promise<string> {
  const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
  const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
  if (!url) throw new Error("DATABASE_URL fehlt in .env.local");
  return url;
}

async function main(): Promise<void> {
  // [1/4] Lookup einer Test-Session aus DB mit phase=generating
  console.log("[1/4] Suche Session mit phase=generating in Dev-DB ...");
  const dbUrl = await loadDatabaseUrl();
  const client = new pg.Client(dbUrl);
  await client.connect();

  let testSession: SessionRow | null = null;
  try {
    const res = await client.query<SessionRow>(
      `SELECT session_token,
              antrag_data->>'phase' AS phase
       FROM ki_antraege
       WHERE antrag_data->>'phase' = 'generating'
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    if (res.rows[0]) {
      testSession = res.rows[0];
      console.log(`  -> Gefunden: token=${testSession.session_token}, phase=${testSession.phase}`);
    } else {
      console.log("  -> Keine generating-Session gefunden. Skip (kein Fehler — Dev-DB leer oder alle Sessions abgeschlossen).");
      console.log("\nSMOKE SKIP — Kein Testzustand vorhanden. Starte einen Antrag und lass ihn im generating-State haengen.");
      return;
    }
  } finally {
    await client.end();
  }

  // [2/4] GET /api/wizard/{sessionToken} und logge Phase + Stage-Info
  console.log(`[2/4] GET /api/wizard/${testSession.session_token} ...`);
  const apiRes = await fetch(`${BASE_URL}/api/wizard/${testSession.session_token}`);
  const apiBody = await apiRes.json().catch(() => ({})) as WizardApiResponse;
  const phase = apiBody.phase;
  const stage = apiBody.generation?.stage;
  const stageAt = apiBody.generation?.stageAt;
  console.log(`  -> phase=${phase ?? "(undefined)"}, stage=${stage ?? "(undefined)"}, stageAt=${stageAt ?? "(undefined)"}`);

  if (!apiRes.ok) {
    console.error(`  -> FAIL: API gab ${apiRes.status} zurueck: ${JSON.stringify(apiBody)}`);
    process.exit(1);
  }

  // [3/4] Phasenpruefung + Staleness-Warnung
  console.log("[3/4] Phasen-Check ...");
  const validPhases = ["generating", "complete", "failed"];
  if (!phase || !validPhases.includes(phase)) {
    console.error(`  -> FAIL: Unerwartete Phase '${phase}'. Erwartet: ${validPhases.join(" | ")}`);
    process.exit(1);
  }
  console.log(`  -> OK: phase=${phase}`);

  if (phase === "generating" && stageAt) {
    const stageDate = new Date(stageAt);
    const ageSeconds = (Date.now() - stageDate.getTime()) / 1000;
    if (ageSeconds > STALE_THRESHOLD_SECONDS) {
      console.warn(
        `  -> WARN: Session ist seit ${Math.round(ageSeconds)}s im generating-State (Schwellenwert: ${STALE_THRESHOLD_SECONDS}s). ` +
        "Moeglicherweise haengt der Pipeline-Job."
      );
    } else {
      console.log(`  -> OK: Stage-Alter ${Math.round(ageSeconds)}s < ${STALE_THRESHOLD_SECONDS}s`);
    }
  }

  // [4/4] Bei complete: finalText pruefen
  console.log("[4/4] Abschluss-Check ...");
  if (phase === "complete") {
    const finalText = apiBody.generation?.finalText;
    if (!finalText || finalText.trim().length === 0) {
      console.error("  -> FAIL: phase=complete aber generation.finalText ist leer.");
      process.exit(1);
    }
    console.log(`  -> OK: finalText vorhanden (${finalText.length} Zeichen)`);
  } else {
    console.log(`  -> Uebersprungen (phase=${phase}, nicht 'complete')`);
  }

  console.log("\nSMOKE OK — Reload-Resume-Pfad liefert erwartete Daten.");
}

main().catch((err) => {
  console.error("SMOKE FAIL:", err);
  process.exit(1);
});
