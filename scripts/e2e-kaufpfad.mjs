#!/usr/bin/env node
/**
 * E2E über den KAUFPFAD — der Weg, der Geld bewegt und bis heute in keinem Test lief.
 *
 * Die vier vorhandenen Playwright-Specs decken statische Seiten und ein Legacy-Formular
 * ab. Kein Test klickte je durch Paywall, Freischaltung oder Rechnungskauf.
 *
 * ── Was dieser Lauf NICHT tut ────────────────────────────────────────────────
 * Er fährt NICHT das KI-Interview. Das würde bei jedem Lauf echte LLM-Calls machen
 * (Kosten, Laufzeit, keine Determiniertheit) — und die Generierungsqualität ist
 * bereits durch die Pipeline-Evals abgedeckt. Stattdessen wird eine Session mit
 * FERTIGEM Antrag geseedet und ab der Paywall gefahren. Genau dort ist die Lücke.
 *
 * ── Selbstgenügsam ───────────────────────────────────────────────────────────
 * Eigenes PostgreSQL (embedded-postgres, kein Docker), eigenes Schema, eigener
 * Next-Server auf einem freien Port. Kein SSH-Tunnel, keine Berührung mit der
 * echten Dev-DB. Aufräumen passiert auch bei Abbruch.
 *
 * Nutzung:  npm run test:e2e:kaufpfad
 */
import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");
const TEST_DB = "edufunds_e2e";
const PROGRAMM_ID = "niedersachsen-sport";
const PROGRAMM_NAME = "Sportförderung Niedersachsen (Sport Vernetzt)";

function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

function schemaFiles() {
  const migrations = readdirSync(join(ROOT, "db", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(ROOT, "db", "migrations", f));
  return [join(ROOT, "scripts", "init-db.sql"), ...migrations];
}

/** Ein fertig generierter Antrag — das, was der Kunde vor der Paywall sieht. */
function fertigerAntrag() {
  const finalText = [
    "## Projektbeschreibung",
    "",
    "Die Musterschule beantragt Mittel für ein Bewegungsprojekt im Ganztag.",
    "",
    "## Zielgruppe",
    "",
    "120 Schülerinnen und Schüler der Jahrgänge 5 bis 7.",
    "",
    "## Finanzierung",
    "",
    "Die Gesamtkosten belaufen sich auf 4.800 EUR.",
  ].join("\n");

  return {
    phase: "complete",
    messages: [],
    facts: { traeger: "Musterschule" },
    interviewer: { totalQuestions: 3, maxQuestions: 12 },
    generation: {
      finalText,
      sections: [
        { name: "Projektbeschreibung", text: "Die Musterschule beantragt Mittel …" },
        { name: "Zielgruppe", text: "120 Schülerinnen und Schüler …" },
      ],
    },
  };
}

async function seed(client) {
  const tokens = {};
  // Mehrere unabhängige Sessions: die Tests laufen parallel und dürfen sich nicht
  // gegenseitig den Zustand wegziehen (eine Freischaltung ist unumkehrbar).
  for (const name of ["karte", "rechnung", "bremse1", "bremse2", "bremse3", "gate"]) {
    const token = randomUUID();
    await client.query(
      `INSERT INTO ki_antraege
         (foerderprogramm_id, foerderprogramm_name, antrag_data, status, session_token)
       VALUES ($1, $2, $3::jsonb, 'complete', $4)`,
      [PROGRAMM_ID, PROGRAMM_NAME, JSON.stringify(fertigerAntrag()), token]
    );
    tokens[name] = token;
  }
  return tokens;
}

function warteAufServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    const tick = async () => {
      try {
        const r = await fetch(url);
        if (r.ok || r.status === 404) return res();
      } catch {
        /* noch nicht da */
      }
      if (Date.now() - start > timeoutMs) return rej(new Error(`Server kam nicht hoch: ${url}`));
      setTimeout(tick, 500);
    };
    tick();
  });
}

let pg, next, dataDir;
let aufgeraeumt = false;

/**
 * Aufraeumen. Wichtig: `next dev` startet einen EIGENEN next-server-Kindprozess.
 * Ein SIGTERM nur an den Wrapper laesst den next-server verwaist zurueck — der haelt
 * dann .next/dev/lock, und der NAECHSTE Lauf scheitert mit "Unable to acquire lock".
 * Deshalb wird die ganze Prozessgruppe getoetet (spawn mit detached:true).
 */
async function cleanup(code) {
  if (aufgeraeumt) return;
  aufgeraeumt = true;
  if (next?.pid) {
    try {
      process.kill(-next.pid, "SIGTERM");
    } catch {
      /* schon weg */
    }
  }
  if (pg) await pg.stop().catch(() => {});
  // persistent:false loescht das Datenverzeichnis beim stop() — aber nur, wenn stop()
  // ueberhaupt erreicht wurde. Bei einem harten Abbruch bliebe es liegen.
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  process.exit(code);
}
process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));
process.on("uncaughtException", async (e) => {
  console.error("[e2e] Abbruch:", e.message);
  await cleanup(1);
});

const pgPort = await freePort();
const appPort = await freePort();
dataDir = mkdtempSync(join(tmpdir(), "edufunds-e2e-pg-"));

console.log(`[e2e] PostgreSQL auf :${pgPort} …`);
pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: pgPort,
  persistent: false,
});
await pg.initialise();
await pg.start();
await pg.createDatabase(TEST_DB);

const client = pg.getPgClient(TEST_DB);
await client.connect();
for (const f of schemaFiles()) await client.query(readFileSync(f, "utf8"));
const tokens = await seed(client);
await client.end();
console.log(`[e2e] Schema + ${Object.keys(tokens).length} fertige Antraege geseedet.`);

const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${pgPort}/${TEST_DB}`;
const baseURL = `http://127.0.0.1:${appPort}`;

// `next dev` haelt .next/dev/lock — ein parallel laufender Dev-Server (z. B. der
// eigene auf :3101) blockiert diesen Lauf. Frueh und verstaendlich abbrechen,
// statt 2 Minuten in einen Timeout zu laufen.
if (existsSync(join(ROOT, ".next", "dev", "lock"))) {
  console.error(
    "[e2e] ABBRUCH: .next/dev/lock existiert — es laeuft bereits ein `next dev` " +
      "(z. B. dein Dev-Server auf :3101). Bitte beenden und erneut starten."
  );
  await cleanup(1);
}

console.log(`[e2e] Next-Dev-Server auf :${appPort} …`);
next = spawn("npx", ["next", "dev", "-p", String(appPort)], {
  cwd: ROOT,
  // Eigene Prozessgruppe, damit cleanup() den next-server mitnimmt (s. o.).
  detached: true,
  env: {
    ...process.env,
    DATABASE_URL,
    // Freischaltung ohne echte Stripe-Zahlung — genau dafuer ist der Dev-Mock da.
    NEXT_PUBLIC_PAYWALL_DEV_MOCK: "1",
    NEXT_PUBLIC_APP_URL: baseURL,
    NODE_ENV: "development",
    // Kein LLM-Call in diesem Lauf; der Key darf leer sein.
    LLM_PROVIDER: "mistral",
    // Zum IP-Rate-Limit ('invoice', 3/24h): Es greift hier nicht, weil
    // lib/rate-limit.ts fuer NODE_ENV=development + Localhost-IP einen Bypass hat
    // (dort dokumentiert). Damit misst der Test die FACHLICHE Grenze
    // (MAX_OPEN_INVOICE_ORDERS -> 409) und nicht das IP-Limit.
  },
  stdio: ["ignore", "pipe", "pipe"],
});
next.stdout.on("data", (d) => process.env.E2E_VERBOSE && process.stdout.write(`  [next] ${d}`));
next.stderr.on("data", (d) => process.stderr.write(`  [next] ${d}`));

await warteAufServer(`${baseURL}/api/health`);
console.log("[e2e] Server ist da. Playwright startet.\n");

const pw = spawn(
  "npx",
  ["playwright", "test", "--config", "playwright.kaufpfad.config.ts", ...process.argv.slice(2)],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      E2E_BASE_URL: baseURL,
      E2E_TOKENS: JSON.stringify(tokens),
      E2E_PROGRAMM_ID: PROGRAMM_ID,
      DATABASE_URL,
    },
    stdio: "inherit",
  }
);
pw.on("exit", (code) => cleanup(code ?? 1));
