/**
 * UAT-Pre-Session-Check: Automatisierter Checklist-Runner für die Vor-Session-
 * Checkliste aus UAT-PLAN-TEMPLATE.md (D-12).
 *
 * Prüft in 5 nummerierten Schritten, ob die UAT-Umgebung bereit ist.
 * Exit(1) wenn mindestens ein Pflicht-Check (Schritte 1, 2, 3) fehlschlägt.
 * Exit(0) wenn alle Pflicht-Checks bestanden.
 *
 * Run: `npx tsx --env-file=.env.local scripts/uat-pre-session-check.ts`
 *
 * Sicherheitshinweis (T-06-01-01): PAYWALL_DEV_MOCK-Wert wird als 1/0 geloggt,
 * der DATABASE_URL-Connection-String wird NIEMALS geloggt.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const REPO = resolve(__dirname, "..");
const DEV_SERVER_PORT = 3101;

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
  pflicht: boolean;
}

async function main() {
  console.log("=== UAT Pre-Session-Check (D-12) ===");
  console.log("");

  const results: CheckResult[] = [];

  // ---- Schritt 1: DB-Verbindung prüfen ----
  console.log("[1/5] DB-Verbindung prüfen …");
  let dbOk = false;
  let dbDetail = "";
  try {
    const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
    const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
    if (!url) {
      dbDetail = "DATABASE_URL fehlt in .env.local";
    } else {
      const client = new pg.Client(url);
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      dbOk = true;
      dbDetail = "PostgreSQL erreichbar und antwortet auf SELECT 1";
    }
  } catch (e) {
    dbDetail = `Verbindungsfehler: ${e instanceof Error ? e.message : String(e)}`;
  }
  console.log(`  -> ${dbOk ? "OK" : "FAIL"}: ${dbDetail}`);
  results.push({ label: "DB-Verbindung (SELECT 1)", ok: dbOk, detail: dbDetail, pflicht: true });
  console.log("");

  // ---- Schritt 2: Dev-Server auf Port 3101 erreichbar ----
  console.log(`[2/5] Dev-Server (http://localhost:${DEV_SERVER_PORT}) erreichbar …`);
  let serverOk = false;
  let serverDetail = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://localhost:${DEV_SERVER_PORT}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    serverOk = resp.ok || resp.status < 500;
    serverDetail = `HTTP ${resp.status} — ${serverOk ? "erreichbar" : "Fehlerantwort"}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("Abort")) {
      serverDetail = `Timeout nach 3s — Dev-Server läuft nicht. Bitte 'npm run dev' starten (Port ${DEV_SERVER_PORT}).`;
    } else {
      serverDetail = `Nicht erreichbar: ${msg}. Bitte 'npm run dev' starten (Port ${DEV_SERVER_PORT}).`;
    }
  }
  console.log(`  -> ${serverOk ? "OK" : "FAIL"}: ${serverDetail}`);
  results.push({ label: `Dev-Server Port ${DEV_SERVER_PORT}`, ok: serverOk, detail: serverDetail, pflicht: true });
  console.log("");

  // ---- Schritt 3: NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 in .env.local ----
  console.log("[3/5] NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 in .env.local prüfen …");
  let mockOk = false;
  let mockDetail = "";
  try {
    const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
    const match = env.match(/NEXT_PUBLIC_PAYWALL_DEV_MOCK\s*=\s*(\S+)/);
    if (!match) {
      mockDetail = "NEXT_PUBLIC_PAYWALL_DEV_MOCK fehlt in .env.local — Paywall-Mock inaktiv.";
    } else if (match[1] === "1") {
      mockOk = true;
      mockDetail = "NEXT_PUBLIC_PAYWALL_DEV_MOCK=1 gesetzt — Paywall-Mock aktiv.";
    } else {
      mockDetail = `NEXT_PUBLIC_PAYWALL_DEV_MOCK=${match[1]} (erwartet: 1) — Paywall-Mock inaktiv!`;
    }
  } catch (e) {
    mockDetail = `.env.local nicht lesbar: ${e instanceof Error ? e.message : String(e)}`;
  }
  console.log(`  -> ${mockOk ? "OK" : "FAIL"}: ${mockDetail}`);
  results.push({ label: "NEXT_PUBLIC_PAYWALL_DEV_MOCK=1", ok: mockOk, detail: mockDetail, pflicht: true });
  console.log("");

  // ---- Schritt 4: Letzter DB-Row-Zeitstempel notieren ----
  console.log("[4/5] Letzten DB-Row-Zeitstempel notieren (für --since nach der Session) …");
  let tsDetail = "";
  try {
    const env = await readFile(resolve(REPO, ".env.local"), "utf-8");
    const url = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1];
    if (!url || !dbOk) {
      tsDetail = "Übersprungen — keine DB-Verbindung (Schritt 1 fehlgeschlagen).";
    } else {
      const client = new pg.Client(url);
      await client.connect();
      const res = await client.query("SELECT MAX(updated_at) AS last FROM ki_antraege");
      await client.end();
      const last = res.rows[0]?.last;
      if (last) {
        const iso = last instanceof Date ? last.toISOString() : String(last);
        tsDetail = `Letzte DB-Aktivität: ${iso}`;
        tsDetail += `\n     -> Diesen Wert als --since nach der Session übergeben:`;
        tsDetail += `\n        npx tsx --env-file=.env.local scripts/uat-db-snapshot.ts --since "${iso}"`;
      } else {
        tsDetail = "ki_antraege ist leer — keine vorherige Aktivität.";
      }
    }
  } catch (e) {
    tsDetail = `Fehler beim Timestamp-Abruf: ${e instanceof Error ? e.message : String(e)}`;
  }
  console.log(`  -> INFO: ${tsDetail}`);
  results.push({ label: "DB-Timestamp (informativ)", ok: true, detail: tsDetail, pflicht: false });
  console.log("");

  // ---- Schritt 5: Summary ----
  console.log("[5/5] Checkliste-Summary …");
  const pflichtChecks = results.filter((r) => r.pflicht);
  const failedPflicht = pflichtChecks.filter((r) => !r.ok);
  const okCount = results.filter((r) => r.ok).length;
  const total = results.length;

  console.log(`  OK: ${okCount}/${total} Checks bestanden.`);
  if (failedPflicht.length > 0) {
    console.log(`  FAIL: ${failedPflicht.length} Pflicht-Check(s) fehlgeschlagen:`);
    for (const f of failedPflicht) {
      console.log(`    - ${f.label}: ${f.detail}`);
    }
    console.log("");
    console.log("ERGEBNIS: Session-Setup NICHT bereit. Bitte Pflicht-Checks beheben.");
    process.exit(1);
  } else {
    console.log("");
    console.log("ERGEBNIS: Session-Setup bereit. Alle Pflicht-Checks OK.");
    console.log("Nächste Schritte:");
    console.log("  1. Browser öffnen: http://localhost:3101/antrag/start");
    console.log("  2. UAT-PLAN-TEMPLATE.md Begrüßungs-Skript vorlesen");
    console.log("  3. Screen-Sharing starten");
  }
}

main().catch((e) => {
  console.error("PRE-SESSION-CHECK FAIL:", e);
  process.exit(1);
});
